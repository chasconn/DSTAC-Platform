#!/bin/sh
# DSTAC EDR — descubrimiento pasivo de dispositivos de red (tabla ARP).
# Corre cada minuto vía el wodle "command" del agente Wazuh. NO genera
# tráfico de red (no hace ping ni escaneo activo): solo lee el cache ARP
# que el sistema operativo ya mantiene por su propio tráfico normal.
# Salida: una línea "DSTAC_NETSCAN {json}" que el manager reenvía al portal.

OUT=$( (ip neighbor show 2>/dev/null || arp -an 2>/dev/null) | while read -r line; do
  ip=$(echo "$line" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
  mac=$(echo "$line" | grep -oE '([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}')
  if [ -n "$ip" ] && [ -n "$mac" ]; then
    printf '{"ip":"%s","mac":"%s"},' "$ip" "$mac"
  fi
done)
OUT=$(echo "$OUT" | sed 's/,$//')
echo "DSTAC_NETSCAN {\"items\":[$OUT]}"
