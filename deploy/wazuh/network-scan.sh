#!/bin/sh
# DSTAC EDR — descubrimiento pasivo de dispositivos de red (tabla ARP).
# Corre cada minuto vía el wodle "command" del agente Wazuh. NO genera
# tráfico de descubrimiento activo (no hace ping ni escaneo de puertos): solo
# lee el cache ARP que el sistema operativo ya mantiene, y resuelve el nombre
# por DNS inverso (muchos routers le dan nombre a sus clientes DHCP).
# Salida: una línea "DSTAC_NETSCAN {json}" que el manager reenvía al portal.

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
