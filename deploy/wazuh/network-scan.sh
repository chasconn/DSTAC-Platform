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

# Descarta broadcast (x.x.x.255) y multicast (224.0.0.0-239.255.255.255, MAC
# 01:00:5E:*/33:33:*) — son entradas de protocolo de la tabla ARP/vecinos, no
# equipos reales, y antes se reportaban como "dispositivos" con fabricante
# desconocido.
es_broadcast_o_multicast() {
  case "$1" in *.255) return 0 ;; esac
  case "$1" in 22[4-9].*|23[0-9].*) return 0 ;; esac
  case "$2" in [Oo]1:00:5[Ee]:*|33:33:*|[Ff][Ff]:[Ff][Ff]:[Ff][Ff]:[Ff][Ff]:[Ff][Ff]:[Ff][Ff]) return 0 ;; esac
  return 1
}

OUT=$( (ip neighbor show 2>/dev/null || arp -an 2>/dev/null) | while read -r line; do
  ip=$(echo "$line" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
  mac=$(echo "$line" | grep -oE '([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}')
  if [ -n "$ip" ] && [ -n "$mac" ] && ! es_broadcast_o_multicast "$ip" "$mac"; then
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
