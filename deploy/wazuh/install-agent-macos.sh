#!/usr/bin/env bash
#
# DSTAC EDR — Instalador de agente Wazuh para macOS
# ───────────────────────────────────────────────────
# Descarga el paquete oficial de Wazuh, lo enrola contra el Manager de DSTAC
# y arranca el agente (launchd). Incluye descubrimiento pasivo de red (ARP).
#
# Modo asistido (recomendado para uso manual):
#   curl -sSL https://portal.dstac.cl/installers/install-agent-macos.sh \
#     -o /tmp/dstac-edr.sh && sudo bash /tmp/dstac-edr.sh
#   → Pedirá interactivamente lo que falte (clave, nombre, empresa, grupo)
#     y mostrará un resumen de confirmación antes de instalar.
#
# Modo automatizado (despliegues masivos, sin preguntas):
#   sudo WAZUH_ENROLL_PASSWORD="<clave>" ./install-agent-macos.sh -n "NOMBRE" -c "slug-empresa"
#
set -euo pipefail

WAZUH_MANAGER_IP="2.25.183.242"
WAZUH_ENROLL_PASSWORD="${WAZUH_ENROLL_PASSWORD:-}"
OSSEC_DIR="/Library/Ossec"

# Detecta arquitectura del Mac — los MacBook con Apple Silicon (M1/M2/M3/M4)
# necesitan el paquete arm64, no el intel64 (instalar el equivocado falla o
# corre con compatibilidad Rosetta de forma inestable).
case "$(uname -m)" in
  arm64)  PKG_ARCH="arm64" ;;
  *)      PKG_ARCH="intel64" ;;
esac
PKG_URL="https://packages.wazuh.com/4.x/macos/wazuh-agent-4.14.5-1.${PKG_ARCH}.pkg"

AGENT_NAME=""
AGENT_GROUP=""
AGENT_COMPANY=""
NAME_FROM_CLI=0
GROUP_FROM_CLI=0
COMPANY_FROM_CLI=0
PASSWORD_FROM_ENV=0
[ -n "$WAZUH_ENROLL_PASSWORD" ] && PASSWORD_FROM_ENV=1

# ── Colores y helpers de salida ──────────────────────────────────────────────
c_ok()    { printf "\033[0;32m%s\033[0m\n" "$1"; }
c_err()   { printf "\033[0;31m%s\033[0m\n" "$1"; }
c_inf()   { printf "\033[0;36m%s\033[0m\n" "$1"; }
c_warn()  { printf "\033[0;33m%s\033[0m\n" "$1"; }
c_title() { printf "\033[1;35m%s\033[0m\n" "$1"; }
c_step()  { printf "\033[1;36m%s\033[0m\n" "$1"; }

COL_INF=$'\033[0;36m'
COL_WARN=$'\033[0;33m'
COL_BOLD=$'\033[1m'
COL_RESET=$'\033[0m'

TOTAL_STEPS=6
STEP=0
next_step() {
  STEP=$((STEP + 1))
  echo
  c_step "▸ [$STEP/$TOTAL_STEPS] $1"
}

print_banner() {
  echo
  c_title "════════════════════════════════════════════"
  c_title "   DSTAC EDR · Instalador de agente (macOS)"
  c_title "════════════════════════════════════════════"
  c_inf   "Manager:      $WAZUH_MANAGER_IP"
  c_inf   "Arquitectura: $(uname -m) → paquete $PKG_ARCH"
  echo
}

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

sanitize_name() {
  printf '%s' "$1" | tr ' ' '_' | tr -cd 'A-Za-z0-9_.-'
}

ask_yes_default() {
  # $1 = pregunta. Devuelve 0 (sí) si el usuario responde vacío, "s" o "si".
  local ans
  read -r -p "${COL_INF}$1 [S/n]: ${COL_RESET}" ans
  ans="$(printf '%s' "$ans" | tr '[:upper:]' '[:lower:]')"
  [ -z "$ans" ] || [ "$ans" = "s" ] || [ "$ans" = "si" ]
}

usage() {
  echo "Uso: sudo $0 [-n NOMBRE_AGENTE] [-c SLUG_EMPRESA] [-g GRUPO_WAZUH]"
  echo "Sin parámetros, el instalador pregunta interactivamente lo que falte."
  exit 1
}
while getopts ":n:g:c:h" opt; do
  case "$opt" in
    n) AGENT_NAME="$OPTARG";    NAME_FROM_CLI=1 ;;
    g) AGENT_GROUP="$OPTARG";   GROUP_FROM_CLI=1 ;;
    c) AGENT_COMPANY="$OPTARG"; COMPANY_FROM_CLI=1 ;;
    h) usage ;;
    *) usage ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  c_err "Este instalador debe ejecutarse como root (usa: sudo $0)"
  exit 1
fi

# Modo totalmente automatizado: clave por entorno + nombre por -n → cero preguntas.
FULLY_AUTOMATED=0
[ "$PASSWORD_FROM_ENV" -eq 1 ] && [ "$NAME_FROM_CLI" -eq 1 ] && FULLY_AUTOMATED=1

# Si falta algo obligatorio (clave o nombre) y no hay terminal interactiva
# (p.ej. corriendo desde una automatización sin tty), fallar con un mensaje
# claro en vez de quedar colgado esperando input que nunca llegará.
if [ "$FULLY_AUTOMATED" -eq 0 ] && [ ! -t 0 ]; then
  c_err "Faltan parámetros obligatorios y no hay terminal interactiva para solicitarlos."
  c_err "Para uso no interactivo: sudo WAZUH_ENROLL_PASSWORD=\"<clave>\" $0 -n \"NOMBRE\" [-c slug] [-g grupo]"
  exit 1
fi

print_banner

if [ "$FULLY_AUTOMATED" -eq 0 ]; then
  c_inf "Modo asistido — completemos juntos los datos que falten. Presiona Enter para aceptar el valor por defecto."
fi

# ── 1. Clave de enrolamiento ──────────────────────────────────────────────────
if [ -z "$WAZUH_ENROLL_PASSWORD" ]; then
  echo
  c_step "Clave de enrolamiento"
  while true; do
    read -r -s -p "${COL_INF}Ingresa la clave de enrolamiento Wazuh (no se mostrará en pantalla): ${COL_RESET}" WAZUH_ENROLL_PASSWORD
    echo
    if [ -z "$WAZUH_ENROLL_PASSWORD" ]; then
      c_err "La clave no puede quedar vacía."
      continue
    fi
    if [ "${#WAZUH_ENROLL_PASSWORD}" -lt 8 ]; then
      c_err "La clave debe tener al menos 8 caracteres."
      continue
    fi
    break
  done
fi

# ── 2. Nombre del agente ──────────────────────────────────────────────────────
if [ "$NAME_FROM_CLI" -eq 0 ]; then
  DETECTED_NAME="$(sanitize_name "$(scutil --get ComputerName 2>/dev/null || hostname)")"
  echo
  c_step "Nombre del equipo"
  c_inf "Nombre detectado automáticamente: ${DETECTED_NAME}"
  if ask_yes_default "¿Usar este nombre?"; then
    AGENT_NAME="$DETECTED_NAME"
  else
    while true; do
      read -r -p "${COL_INF}Ingresa el nombre del agente: ${COL_RESET}" CUSTOM_NAME
      CUSTOM_NAME="$(trim "$CUSTOM_NAME")"
      if [ -z "$CUSTOM_NAME" ]; then
        c_err "El nombre no puede quedar vacío."
        continue
      fi
      AGENT_NAME="$(sanitize_name "$CUSTOM_NAME")"
      if [ -z "$AGENT_NAME" ]; then
        c_err "Nombre inválido (sin caracteres válidos tras sanitizar). Intenta de nuevo."
        continue
      fi
      break
    done
  fi
else
  AGENT_NAME="$(sanitize_name "$(trim "$AGENT_NAME")")"
fi
[ -z "$AGENT_NAME" ] && AGENT_NAME="$(sanitize_name "$(hostname)")"

# ── 3. Empresa (slug, opcional) ───────────────────────────────────────────────
if [ "$COMPANY_FROM_CLI" -eq 0 ] && [ "$FULLY_AUTOMATED" -eq 0 ]; then
  echo
  c_step "Empresa (opcional)"
  read -r -p "${COL_INF}Slug de la empresa para auto-asignación (déjalo vacío para omitir): ${COL_RESET}" AGENT_COMPANY
  AGENT_COMPANY="$(trim "$AGENT_COMPANY")"
fi
if [ -z "$AGENT_COMPANY" ]; then
  c_warn "Sin empresa asignada — deberás asignar el agente manualmente en el portal → EDR."
fi

# ── 4. Grupo Wazuh (opcional) ─────────────────────────────────────────────────
if [ "$GROUP_FROM_CLI" -eq 0 ] && [ "$FULLY_AUTOMATED" -eq 0 ]; then
  echo
  c_step "Grupo Wazuh (opcional)"
  read -r -p "${COL_INF}Grupo de Wazuh (déjalo vacío para continuar sin grupo): ${COL_RESET}" AGENT_GROUP
  AGENT_GROUP="$(trim "$AGENT_GROUP")"
fi

# ── 5. Resumen y confirmación final ───────────────────────────────────────────
if [ "$FULLY_AUTOMATED" -eq 0 ]; then
  echo
  c_title "── Resumen de instalación ──────────────────────"
  printf "  %-14s %s\n" "Agente:"       "$AGENT_NAME"
  printf "  %-14s %s\n" "Empresa:"      "${AGENT_COMPANY:-(sin asignar)}"
  printf "  %-14s %s\n" "Grupo:"        "${AGENT_GROUP:-(sin grupo)}"
  printf "  %-14s %s\n" "Manager:"      "$WAZUH_MANAGER_IP"
  printf "  %-14s %s\n" "Arquitectura:" "$(uname -m) → paquete $PKG_ARCH"
  c_title "─────────────────────────────────────────────────"
  echo
  if ! ask_yes_default "¿Confirmas que deseas continuar con la instalación?"; then
    c_warn "Instalación cancelada por el usuario."
    exit 0
  fi
else
  c_inf "Agente:  $AGENT_NAME"
  [ -n "$AGENT_COMPANY" ] && c_inf "Empresa: $AGENT_COMPANY (auto-asignación)"
fi

check_port() {
  if nc -z -w4 "$WAZUH_MANAGER_IP" "$1" 2>/dev/null; then
    c_ok "   ✓ puerto $1 alcanzable"
  else
    c_err "   ✗ no se alcanza ${WAZUH_MANAGER_IP}:$1 — revisa el firewall de salida"
    exit 1
  fi
}

set_company_label() {
  [ -z "$AGENT_COMPANY" ] && return 0
  local conf="$OSSEC_DIR/etc/ossec.conf"
  [ -f "$conf" ] || return 0
  if grep -q "dstac_company" "$conf"; then
    sed -i '' "s|<label key=\"dstac_company\">[^<]*</label>|<label key=\"dstac_company\">${AGENT_COMPANY}</label>|" "$conf"
  else
    sed -i '' "s|</ossec_config>|  <labels>\n    <label key=\"dstac_company\">${AGENT_COMPANY}</label>\n  </labels>\n</ossec_config>|" "$conf"
  fi
  c_inf "   etiqueta de empresa: dstac_company=${AGENT_COMPANY}"
}

# Descubrimiento pasivo de red (tabla ARP, sin generar tráfico) — misma lógica
# que en Linux; el arp -an de macOS (BSD) usa el mismo formato compatible.
set_network_scan() {
  mkdir -p "$OSSEC_DIR/active-response/bin"
  cat > "$OSSEC_DIR/active-response/bin/dstac-network-scan.sh" <<'NETSCAN'
#!/bin/sh
resolver_nombre() {
  ip="$1"
  name=""
  if command -v dscacheutil >/dev/null 2>&1; then
    name=$(dscacheutil -q host -a ip_address "$ip" 2>/dev/null | awk '/^name:/{print $2; exit}')
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
  chmod 750 "$OSSEC_DIR/active-response/bin/dstac-network-scan.sh"

  local conf="$OSSEC_DIR/etc/ossec.conf"
  [ -f "$conf" ] || return 0
  grep -q "dstac_netscan" "$conf" && return 0
  cat > /tmp/dstac-netscan.xml <<WODLE
  <wodle name="command">
    <disabled>no</disabled>
    <tag>dstac_netscan</tag>
    <command>$OSSEC_DIR/active-response/bin/dstac-network-scan.sh</command>
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

next_step "Verificando conectividad con el Manager…"
check_port 1514
check_port 1515

if [ -d "$OSSEC_DIR" ] && [ -x "$OSSEC_DIR/bin/wazuh-control" ]; then
  next_step "El agente ya está instalado → reconfigurando…"
  "$OSSEC_DIR/bin/wazuh-control" stop >/dev/null 2>&1 || true
  GROUP_ARG=""; [ -n "$AGENT_GROUP" ] && GROUP_ARG="-G $AGENT_GROUP"
  # shellcheck disable=SC2086
  "$OSSEC_DIR/bin/agent-auth" -m "$WAZUH_MANAGER_IP" -P "$WAZUH_ENROLL_PASSWORD" -A "$AGENT_NAME" $GROUP_ARG
  set_company_label
  set_network_scan
  "$OSSEC_DIR/bin/wazuh-control" start >/dev/null 2>&1 || true
  c_ok "✓ Reconfigurado como '$AGENT_NAME' y reiniciado."
  exit 0
fi

next_step "Descargando el agente ($PKG_ARCH)…"
PKG="/tmp/wazuh-agent-dstac.pkg"
curl -sSL "$PKG_URL" -o "$PKG"
installer -pkg "$PKG" -target / >/dev/null
c_ok "   ✓ paquete instalado"

next_step "Enrolando el agente contra el Manager…"
GROUP_ARG=""; [ -n "$AGENT_GROUP" ] && GROUP_ARG="-G $AGENT_GROUP"
# shellcheck disable=SC2086
"$OSSEC_DIR/bin/agent-auth" -m "$WAZUH_MANAGER_IP" -P "$WAZUH_ENROLL_PASSWORD" -A "$AGENT_NAME" $GROUP_ARG
c_ok "   ✓ agente enrolado como '$AGENT_NAME'"

next_step "Aplicando configuración (empresa y descubrimiento de red)…"
set_company_label
set_network_scan

next_step "Iniciando el servicio…"
/bin/launchctl load "$OSSEC_DIR/bin/com.wazuh.agent.plist" 2>/dev/null || true
"$OSSEC_DIR/bin/wazuh-control" start

sleep 2
if "$OSSEC_DIR/bin/wazuh-control" status 2>/dev/null | grep -q "is running"; then
  echo
  c_ok "════════════════════════════════════════════"
  c_ok "  ✓ Agente '$AGENT_NAME' instalado y activo"
  c_ok "════════════════════════════════════════════"
  if [ -n "$AGENT_COMPANY" ]; then
    echo "Se auto-asignará a la empresa '$AGENT_COMPANY' en el portal."
  else
    echo "Asígnalo a una empresa en el portal → EDR."
  fi
else
  c_err "El servicio no quedó activo. Revisa: $OSSEC_DIR/bin/wazuh-control status"
  exit 1
fi
