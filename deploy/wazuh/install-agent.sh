#!/usr/bin/env bash
#
# DSTAC EDR — Instalador de agente Wazuh para Linux
# ─────────────────────────────────────────────────
# Hace TODO en un solo paso: detecta la distro, agrega el repo, instala el
# wazuh-agent, lo enrola contra el Manager de DSTAC y arranca el servicio.
# Pregunta el NOMBRE del agente (o se pasa con -n).
#
# Uso:
#   sudo ./install-agent.sh                 # modo interactivo (pregunta el nombre)
#   sudo ./install-agent.sh -n "CLIENTE-PC01"
#   sudo ./install-agent.sh -n "WEB-01" -g "acme"     # -g = grupo (opcional)
#   curl -sSL https://.../install-agent.sh | sudo bash -s -- -n "CLIENTE-PC01"
#
set -euo pipefail

# ╔══════════════════════════════════════════════════════════════════╗
# ║  CONFIGURACIÓN DSTAC — editar antes de distribuir a clientes      ║
# ╚══════════════════════════════════════════════════════════════════╝
WAZUH_MANAGER_IP="2.25.183.242"
# Reemplazar por la clave real de enrolamiento (/var/ossec/etc/authd.pass del Manager)
# antes de distribuir. También se puede inyectar por entorno:
#   sudo WAZUH_ENROLL_PASSWORD="clave" ./install-agent.sh -n "NOMBRE"
WAZUH_ENROLL_PASSWORD="${WAZUH_ENROLL_PASSWORD:-__REEMPLAZAR_POR_CLAVE_DE_ENROLAMIENTO__}"
WAZUH_REPO="4.x"   # canal estable
# ────────────────────────────────────────────────────────────────────

AGENT_NAME=""
AGENT_GROUP=""
AGENT_COMPANY=""

c_ok()  { printf "\033[0;32m%s\033[0m\n" "$1"; }
c_err() { printf "\033[0;31m%s\033[0m\n" "$1"; }
c_inf() { printf "\033[0;36m%s\033[0m\n" "$1"; }

usage() {
  echo "Uso: sudo $0 [-n NOMBRE_AGENTE] [-c SLUG_EMPRESA] [-g GRUPO_WAZUH]"
  echo "  -c SLUG  asigna el agente a esa empresa del portal automáticamente"
  echo "           (escribe la label dstac_company=SLUG; sin esto queda 'sin asignar')."
  exit 1
}

while getopts ":n:g:c:h" opt; do
  case "$opt" in
    n) AGENT_NAME="$OPTARG" ;;
    g) AGENT_GROUP="$OPTARG" ;;
    c) AGENT_COMPANY="$OPTARG" ;;
    h) usage ;;
    *) usage ;;
  esac
done

# ── Requiere root ─────────────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  c_err "Este instalador debe ejecutarse como root (usa: sudo $0)"
  exit 1
fi

# Guardia: sin clave de enrolamiento, authd rechaza al agente ("Invalid password").
if [ "$WAZUH_ENROLL_PASSWORD" = "__REEMPLAZAR_POR_CLAVE_DE_ENROLAMIENTO__" ] || [ -z "$WAZUH_ENROLL_PASSWORD" ]; then
  c_err "Falta la clave de enrolamiento."
  c_err "Ejecuta:  sudo WAZUH_ENROLL_PASSWORD=\"<clave>\" $0 -n \"NOMBRE\" -c \"slug-empresa\""
  exit 1
fi

echo
c_inf "════════════════════════════════════════════"
c_inf "   DSTAC EDR · Instalador de agente Wazuh"
c_inf "════════════════════════════════════════════"

# ── Diálogo amigable para nombrar el equipo ───────────────────────────
# Prioridad: zenity (ventana gráfica) → whiptail (caja en terminal) → texto.
GUI_DISPLAY=""
detectar_display() {
  GUI_DISPLAY="${DISPLAY:-}"
  if [ -z "$GUI_DISPLAY" ] && [ -n "${SUDO_USER:-}" ]; then
    GUI_DISPLAY=$(who 2>/dev/null | awk -v u="$SUDO_USER" '$1==u && $0 ~ /\(:[0-9]/ {n=$NF; gsub(/[()]/,"",n); print n; exit}')
    [ -z "$GUI_DISPLAY" ] && GUI_DISPLAY=":0"
  fi
}
zenity_user() {
  # zenity corre como el usuario de escritorio (root no accede a su sesión X)
  if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
    sudo -u "$SUDO_USER" DISPLAY="$GUI_DISPLAY" XAUTHORITY="/home/$SUDO_USER/.Xauthority" zenity "$@" 2>/dev/null
  else
    DISPLAY="$GUI_DISPLAY" zenity "$@" 2>/dev/null
  fi
}
pedir_nombre() {
  local def n=""
  def="$(hostname)"
  detectar_display
  if command -v zenity >/dev/null 2>&1 && [ -n "$GUI_DISPLAY" ]; then
    n=$(zenity_user --entry --width=440 --title="DSTAC EDR · Protección de endpoint" \
        --text="Escribe un nombre para identificar este equipo:" --entry-text="$def" || true)
    echo "${n:-$def}"; return
  fi
  if command -v whiptail >/dev/null 2>&1; then
    n=$(whiptail --title "DSTAC EDR · Proteccion de endpoint" \
        --inputbox "\nEscribe un nombre para identificar este equipo:" 11 64 "$def" 3>&1 1>&2 2>&3 || true)
    echo "${n:-$def}"; return
  fi
  read -rp "Nombre para este equipo [$def]: " n </dev/tty || true
  echo "${n:-$def}"
}

# Nombre del agente: por -n, o si no, se pregunta con la ventana.
[ -z "$AGENT_NAME" ] && AGENT_NAME="$(pedir_nombre)"
# Sanitizar: Wazuh no admite espacios; dejar solo [A-Za-z0-9_.-]
AGENT_NAME="$(echo "$AGENT_NAME" | tr ' ' '_' | tr -cd 'A-Za-z0-9_.-')"
[ -z "$AGENT_NAME" ] && AGENT_NAME="$(hostname)"

echo
c_inf "Agente:  $AGENT_NAME"
c_inf "Manager: $WAZUH_MANAGER_IP"
[ -n "$AGENT_COMPANY" ] && c_inf "Empresa: $AGENT_COMPANY (auto-asignación)"
[ -n "$AGENT_GROUP" ]   && c_inf "Grupo:   $AGENT_GROUP"
echo

# ── Verificar conectividad a los puertos del Manager ──────────────────
check_port() {
  if timeout 4 bash -c "cat < /dev/null > /dev/tcp/${WAZUH_MANAGER_IP}/$1" 2>/dev/null; then
    c_ok "   ✓ puerto $1 alcanzable"
  else
    c_err "   ✗ no se alcanza ${WAZUH_MANAGER_IP}:$1 — revisa el firewall de salida"
    exit 1
  fi
}
echo "Verificando conectividad con el Manager…"
check_port 1514
check_port 1515
echo

# ── Etiqueta de empresa (auto-asignación en el portal) ────────────────
# Escribe la label dstac_company=<slug> en el ossec.conf del agente. El webhook
# del portal la lee en cada alerta y asigna el agente a esa empresa. Idempotente.
set_company_label() {
  [ -z "$AGENT_COMPANY" ] && return 0
  local conf=/var/ossec/etc/ossec.conf
  [ -f "$conf" ] || return 0
  if grep -q "dstac_company" "$conf"; then
    sed -i "s|<label key=\"dstac_company\">[^<]*</label>|<label key=\"dstac_company\">${AGENT_COMPANY}</label>|" "$conf"
  else
    sed -i "s|</ossec_config>|  <labels>\n    <label key=\"dstac_company\">${AGENT_COMPANY}</label>\n  </labels>\n</ossec_config>|" "$conf"
  fi
  c_inf "   etiqueta de empresa: dstac_company=${AGENT_COMPANY}"
}

# Habilita en la ossec.conf LOCAL del agente las definiciones de comando +
# active-response, necesarias para que la API de Wazuh pueda dispararlas
# (respuesta manual desde el portal). El agent.conf compartido NO basta:
# la API valida el comando contra la config local del agente. Idempotente.
set_response_config() {
  local conf=/var/ossec/etc/ossec.conf
  [ -f "$conf" ] || return 0
  grep -q "DSTAC-EDR-AR" "$conf" && return 0
  cat > /tmp/dstac-ar.xml <<'ARBLOCK'
  <!-- DSTAC-EDR-AR: respuestas activas para disparo manual desde el portal -->
  <command>
    <name>firewall-drop</name>
    <executable>firewall-drop</executable>
    <timeout_allowed>yes</timeout_allowed>
  </command>
  <command>
    <name>disable-account</name>
    <executable>disable-account</executable>
    <timeout_allowed>yes</timeout_allowed>
  </command>
  <command>
    <name>restart-wazuh</name>
    <executable>restart-wazuh</executable>
  </command>
  <active-response>
    <disabled>no</disabled>
    <command>firewall-drop</command>
    <location>local</location>
  </active-response>
  <active-response>
    <disabled>no</disabled>
    <command>disable-account</command>
    <location>local</location>
  </active-response>
  <active-response>
    <disabled>no</disabled>
    <command>restart-wazuh</command>
    <location>local</location>
  </active-response>
ARBLOCK
  awk '/<\/ossec_config>/ && !d {while((getline line < "/tmp/dstac-ar.xml")>0) print line; d=1} {print}' "$conf" > "${conf}.dstac" && mv "${conf}.dstac" "$conf"
  rm -f /tmp/dstac-ar.xml
  c_inf "   respuestas activas habilitadas en el agente"
}

# Descubrimiento pasivo de red: instala el script que lee la tabla ARP local
# (sin generar tráfico) y el wodle que lo corre cada minuto. Así el panel EDR
# muestra TODOS los dispositivos de la red (router, impresoras, celulares…),
# no solo los que tienen agente Wazuh instalado. Idempotente.
set_network_scan() {
  mkdir -p /var/ossec/active-response/bin
  cat > /var/ossec/active-response/bin/dstac-network-scan.sh <<'NETSCAN'
#!/bin/sh
resolver_nombre() {
  ip="$1"
  name=""
  if command -v getent >/dev/null 2>&1; then
    name=$(getent hosts "$ip" 2>/dev/null | awk '{print $2}' | head -1)
  fi
  if [ -z "$name" ] && command -v nslookup >/dev/null 2>&1; then
    name=$(nslookup "$ip" 2>/dev/null | awk -F'= ' '/name =/{print $2}' | sed 's/\.$//' | head -1)
  fi
  echo "$name"
}
OUT=$( (ip neighbor show 2>/dev/null || arp -an 2>/dev/null) | while read -r line; do
  ip=$(echo "$line" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
  mac=$(echo "$line" | grep -oE '([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}')
  if [ -n "$ip" ] && [ -n "$mac" ]; then
    host=$(resolver_nombre "$ip")
    if [ -n "$host" ]; then
      printf '{"ip":"%s","mac":"%s","hostname":"%s"},' "$ip" "$mac" "$host"
    else
      printf '{"ip":"%s","mac":"%s"},' "$ip" "$mac"
    fi
  fi
done)
OUT=$(echo "$OUT" | sed 's/,$//')
echo "DSTAC_NETSCAN {\"items\":[$OUT]}"
NETSCAN
  chmod 750 /var/ossec/active-response/bin/dstac-network-scan.sh
  chown root:wazuh /var/ossec/active-response/bin/dstac-network-scan.sh

  local conf=/var/ossec/etc/ossec.conf
  [ -f "$conf" ] || return 0
  grep -q "dstac_netscan" "$conf" && return 0
  cat > /tmp/dstac-netscan.xml <<'WODLE'
  <!-- DSTAC-EDR: descubrimiento pasivo de red (tabla ARP) cada minuto -->
  <wodle name="command">
    <disabled>no</disabled>
    <tag>dstac_netscan</tag>
    <command>/var/ossec/active-response/bin/dstac-network-scan.sh</command>
    <interval>1m</interval>
    <ignore_output>no</ignore_output>
    <run_on_start>yes</run_on_start>
    <timeout>45</timeout>
  </wodle>
WODLE
  awk '/<\/ossec_config>/ && !d {while((getline line < "/tmp/dstac-netscan.xml")>0) print line; d=1} {print}' "$conf" > "${conf}.dstac" && mv "${conf}.dstac" "$conf"
  rm -f /tmp/dstac-netscan.xml
  c_inf "   descubrimiento de red (ARP) habilitado, cada 1 minuto"
}

# ── ¿Ya está instalado? → solo (re)enrolar y reiniciar ────────────────
if [ -d /var/ossec ] && command -v /var/ossec/bin/wazuh-control >/dev/null 2>&1; then
  c_inf "wazuh-agent ya está instalado → reconfigurando…"
  # Fijar la dirección del manager en ossec.conf
  if grep -q "<address>" /var/ossec/etc/ossec.conf; then
    sed -i "s|<address>.*</address>|<address>${WAZUH_MANAGER_IP}</address>|" /var/ossec/etc/ossec.conf
  fi
  /var/ossec/bin/wazuh-control stop >/dev/null 2>&1 || true
  GROUP_ARG=""; [ -n "$AGENT_GROUP" ] && GROUP_ARG="-G $AGENT_GROUP"
  # shellcheck disable=SC2086
  /var/ossec/bin/agent-auth -m "$WAZUH_MANAGER_IP" -P "$WAZUH_ENROLL_PASSWORD" -A "$AGENT_NAME" $GROUP_ARG
  set_company_label
  set_response_config
  set_network_scan
  /var/ossec/bin/wazuh-control start >/dev/null 2>&1 || true
  systemctl restart wazuh-agent >/dev/null 2>&1 || true
  c_ok "✓ Reconfigurado como '$AGENT_NAME' y reiniciado."
  exit 0
fi

# ── Instalación fresca ────────────────────────────────────────────────
install_debian() {
  export DEBIAN_FRONTEND=noninteractive
  # Esperar a que se libere el lock de apt (p.ej. el actualizador de Parrot)
  for _ in $(seq 1 40); do
    if fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then
      echo "   esperando a que apt termine (otro proceso lo está usando)…"; sleep 3
    else break; fi
  done
  apt-get install -y curl gnupg apt-transport-https >/dev/null 2>&1 || true
  curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH \
    | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import >/dev/null 2>&1
  chmod 644 /usr/share/keyrings/wazuh.gpg
  echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/${WAZUH_REPO}/apt/ stable main" \
    > /etc/apt/sources.list.d/wazuh.list
  apt-get update >/dev/null 2>&1
  WAZUH_MANAGER="$WAZUH_MANAGER_IP" \
  WAZUH_REGISTRATION_PASSWORD="$WAZUH_ENROLL_PASSWORD" \
  WAZUH_AGENT_NAME="$AGENT_NAME" \
  ${AGENT_GROUP:+WAZUH_AGENT_GROUP="$AGENT_GROUP"} \
    apt-get install -y wazuh-agent
}

install_rhel() {
  rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH 2>/dev/null || true
  cat > /etc/yum.repos.d/wazuh.repo <<EOF
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=Wazuh repository
baseurl=https://packages.wazuh.com/${WAZUH_REPO}/yum/
protect=1
EOF
  PKG=yum; command -v dnf >/dev/null 2>&1 && PKG=dnf
  WAZUH_MANAGER="$WAZUH_MANAGER_IP" \
  WAZUH_REGISTRATION_PASSWORD="$WAZUH_ENROLL_PASSWORD" \
  WAZUH_AGENT_NAME="$AGENT_NAME" \
  ${AGENT_GROUP:+WAZUH_AGENT_GROUP="$AGENT_GROUP"} \
    $PKG install -y wazuh-agent
}

install_suse() {
  rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH 2>/dev/null || true
  cat > /etc/zypp/repos.d/wazuh.repo <<EOF
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=Wazuh repository
baseurl=https://packages.wazuh.com/${WAZUH_REPO}/yum/
EOF
  WAZUH_MANAGER="$WAZUH_MANAGER_IP" \
  WAZUH_REGISTRATION_PASSWORD="$WAZUH_ENROLL_PASSWORD" \
  WAZUH_AGENT_NAME="$AGENT_NAME" \
  ${AGENT_GROUP:+WAZUH_AGENT_GROUP="$AGENT_GROUP"} \
    zypper -n install wazuh-agent
}

if command -v apt-get >/dev/null 2>&1; then
  c_inf "Distro tipo Debian/Ubuntu/Parrot/Kali/Mint → instalando…"
  install_debian
elif command -v zypper >/dev/null 2>&1; then
  c_inf "Distro tipo SUSE/openSUSE → instalando…"
  install_suse
elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
  c_inf "Distro tipo RHEL/CentOS/Rocky/Alma/Fedora → instalando…"
  install_rhel
else
  c_err "Gestor de paquetes no soportado (apt, dnf/yum o zypper)."
  exit 1
fi

# ── Etiqueta de empresa + respuestas activas antes de arrancar ────────
set_company_label
set_response_config
set_network_scan

# ── Arrancar y verificar ──────────────────────────────────────────────
systemctl daemon-reload >/dev/null 2>&1 || true
systemctl enable --now wazuh-agent >/dev/null 2>&1 || /var/ossec/bin/wazuh-control start

sleep 3
echo
if systemctl is-active --quiet wazuh-agent 2>/dev/null || /var/ossec/bin/wazuh-control status 2>/dev/null | grep -q "is running"; then
  c_ok "════════════════════════════════════════════"
  c_ok "  ✓ Agente '$AGENT_NAME' instalado y activo"
  c_ok "════════════════════════════════════════════"
  echo
  if [ -n "$AGENT_COMPANY" ]; then
    echo "El agente se auto-asignará a la empresa '$AGENT_COMPANY' en el portal"
    echo "en cuanto envíe su primera alerta (label dstac_company)."
  else
    echo "Siguiente paso (DSTAC): en el portal → EDR, asigna el agente"
    echo "\"$AGENT_NAME\" a la empresa del cliente. (Tip: usa -c SLUG para que"
    echo "se asigne solo)."
  fi
else
  c_err "El servicio no quedó activo. Revisa: systemctl status wazuh-agent"
  exit 1
fi
