#!/usr/bin/env bash
#
# DSTAC EDR — Instalador de agente Wazuh para macOS
# ───────────────────────────────────────────────────
# Descarga el paquete oficial de Wazuh, lo enrola contra el Manager de DSTAC
# y arranca el agente (launchd). Incluye descubrimiento pasivo de red (ARP).
#
# Uso:
#   sudo WAZUH_ENROLL_PASSWORD="<clave>" ./install-agent-macos.sh -n "NOMBRE" -c "slug-empresa"
#   curl -sSL https://raw.githubusercontent.com/chasconn/DSTAC-Platform/main/deploy/wazuh/install-agent-macos.sh \
#     -o /tmp/dstac-edr.sh && sudo WAZUH_ENROLL_PASSWORD="<clave>" bash /tmp/dstac-edr.sh -n "NOMBRE"
#
set -euo pipefail

WAZUH_MANAGER_IP="2.25.183.242"
WAZUH_ENROLL_PASSWORD="${WAZUH_ENROLL_PASSWORD:-__REEMPLAZAR_POR_CLAVE_DE_ENROLAMIENTO__}"
PKG_URL="https://packages.wazuh.com/4.x/macos/wazuh-agent-4.14.5-1.intel64.pkg"
OSSEC_DIR="/Library/Ossec"

AGENT_NAME=""
AGENT_GROUP=""
AGENT_COMPANY=""

c_ok()  { printf "\033[0;32m%s\033[0m\n" "$1"; }
c_err() { printf "\033[0;31m%s\033[0m\n" "$1"; }
c_inf() { printf "\033[0;36m%s\033[0m\n" "$1"; }

usage() {
  echo "Uso: sudo $0 [-n NOMBRE_AGENTE] [-c SLUG_EMPRESA] [-g GRUPO_WAZUH]"
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

if [ "$(id -u)" -ne 0 ]; then
  c_err "Este instalador debe ejecutarse como root (usa: sudo $0)"
  exit 1
fi
if [ "$WAZUH_ENROLL_PASSWORD" = "__REEMPLAZAR_POR_CLAVE_DE_ENROLAMIENTO__" ] || [ -z "$WAZUH_ENROLL_PASSWORD" ]; then
  c_err "Falta la clave de enrolamiento."
  c_err "Ejecuta:  sudo WAZUH_ENROLL_PASSWORD=\"<clave>\" $0 -n \"NOMBRE\" -c \"slug-empresa\""
  exit 1
fi

[ -z "$AGENT_NAME" ] && AGENT_NAME="$(scutil --get ComputerName 2>/dev/null || hostname)"
AGENT_NAME="$(echo "$AGENT_NAME" | tr ' ' '_' | tr -cd 'A-Za-z0-9_.-')"
[ -z "$AGENT_NAME" ] && AGENT_NAME="$(hostname)"

echo
c_inf "════════════════════════════════════════════"
c_inf "   DSTAC EDR · Instalador de agente (macOS)"
c_inf "════════════════════════════════════════════"
c_inf "Agente:  $AGENT_NAME"
c_inf "Manager: $WAZUH_MANAGER_IP"
[ -n "$AGENT_COMPANY" ] && c_inf "Empresa: $AGENT_COMPANY (auto-asignación)"
echo

check_port() {
  if nc -z -w4 "$WAZUH_MANAGER_IP" "$1" 2>/dev/null; then
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

if [ -d "$OSSEC_DIR" ] && [ -x "$OSSEC_DIR/bin/wazuh-control" ]; then
  c_inf "wazuh-agent ya está instalado → reconfigurando…"
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

c_inf "Descargando el agente…"
PKG="/tmp/wazuh-agent-dstac.pkg"
curl -sSL "$PKG_URL" -o "$PKG"
installer -pkg "$PKG" -target / >/dev/null

GROUP_ARG=""; [ -n "$AGENT_GROUP" ] && GROUP_ARG="-G $AGENT_GROUP"
# shellcheck disable=SC2086
"$OSSEC_DIR/bin/agent-auth" -m "$WAZUH_MANAGER_IP" -P "$WAZUH_ENROLL_PASSWORD" -A "$AGENT_NAME" $GROUP_ARG

set_company_label
set_network_scan

/bin/launchctl load "$OSSEC_DIR/bin/com.wazuh.agent.plist" 2>/dev/null || true
"$OSSEC_DIR/bin/wazuh-control" start

sleep 2
if "$OSSEC_DIR/bin/wazuh-control" status 2>/dev/null | grep -q "is running"; then
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
