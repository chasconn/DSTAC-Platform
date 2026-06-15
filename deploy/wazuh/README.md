# Integración Wazuh → Portal DSTAC (EDR)

Reenvía las alertas del Wazuh Manager al webhook del portal
(`POST /api/edr/alerts`) mediante el daemon `integrator`.

## Instalación en el Manager (host con wazuh-manager)

```sh
# 1) Scripts de integración
cp custom-dstac custom-dstac.py /var/ossec/integrations/
chmod 750 /var/ossec/integrations/custom-dstac /var/ossec/integrations/custom-dstac.py
chown root:wazuh /var/ossec/integrations/custom-dstac /var/ossec/integrations/custom-dstac.py

# 2) Agregar el bloque de integration-block.xml dentro de <ossec_config>
#    en /var/ossec/etc/ossec.conf (reemplazar __EDR_WEBHOOK_SECRET__ por el valor real).

# 3) Reiniciar
systemctl restart wazuh-manager
/var/ossec/bin/wazuh-control status | grep integrator   # debe decir "is running"
```

El valor de `<api_key>` debe coincidir con la env `EDR_WEBHOOK_SECRET` del servicio API.

## Notas

- El python embebido de Wazuh no trae CA bundle propio; `custom-dstac.py` usa el
  almacén del sistema (`/etc/ssl/certs/ca-certificates.crt`) para verificar el
  certificado TLS del portal. Sin eso falla con `CERTIFICATE_VERIFY_FAILED`.
- El Manager se automonitorea como agente `000`. No se puede instalar `wazuh-agent`
  en el mismo host que el manager (ambos usan `/var/ossec`). Para agentes reales,
  enrolar otras máquinas Linux contra el `1514/1515` del manager con la clave de
  `authd` (use_password).
- `level=3` limita el reenvío a alertas de nivel ≥ 3 para reducir ruido.
