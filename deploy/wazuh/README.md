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

## Instalador de agente (clientes Linux) — `install-agent.sh`

Instalador autónomo para enrolar un endpoint Linux en un solo paso: detecta la
distro (Debian/Ubuntu/Parrot/Kali o RHEL/CentOS/Rocky/Alma/Fedora), agrega el
repo, instala el `wazuh-agent`, lo enrola contra el Manager y arranca el servicio.
**Pregunta el nombre del agente** (o se pasa con `-n`).

Antes de distribuir, reemplazar `__REEMPLAZAR_POR_CLAVE_DE_ENROLAMIENTO__` por la
clave real (`/var/ossec/etc/authd.pass` del Manager), **o** inyectarla por entorno:

```sh
# Interactivo (pregunta el nombre):
sudo WAZUH_ENROLL_PASSWORD="<clave>" ./install-agent.sh

# Con nombre y grupo explícitos:
sudo WAZUH_ENROLL_PASSWORD="<clave>" ./install-agent.sh -n "CLIENTE-PC01" -g "acme"

# One-liner remoto (si se hospeda el script con la clave ya embebida):
curl -sSL https://<host>/install-agent.sh | sudo bash -s -- -n "CLIENTE-PC01"
```

Tras instalar, el agente aparece en el portal → **EDR** como *sin asignar*; un
admin DSTAC lo vincula a la empresa del cliente. Es idempotente: si ya está
instalado, sólo lo re-enrola con el nombre indicado y reinicia.

> ⚠️ La clave de enrolamiento sólo permite **registrar** un agente; la telemetría
> de un agente no asignado queda en "sin asignar" (no la ve ningún cliente). Aun
> así, no publicar el script con la clave embebida en un repo/URL público.

## Reglas propias DSTAC — `local_rules.xml`

Reglas de detección a medida (IDs 100100+). Se copian a
`/var/ossec/etc/rules/local_rules.xml` del Manager y se cargan al reiniciar.
**Validar siempre antes de reiniciar** para no romper el ruleset:

```sh
cp local_rules.xml /var/ossec/etc/rules/local_rules.xml
chown root:wazuh /var/ossec/etc/rules/local_rules.xml && chmod 660 /var/ossec/etc/rules/local_rules.xml
/var/ossec/bin/wazuh-analysisd -t && echo OK || echo "ruleset INVALIDO, revertir"
systemctl restart wazuh-manager
```

Reglas incluidas: `100100` marcador de prueba (`logger "DSTAC_EDR_TEST ..."`),
`100110` cambio en archivo crítico (FIM), `100120` fuerza bruta SSH,
`100130` manipulación de la config del agente. Las de nivel ≥12 abren incidente
automáticamente en el portal.

## Notas

- El python embebido de Wazuh no trae CA bundle propio; `custom-dstac.py` usa el
  almacén del sistema (`/etc/ssl/certs/ca-certificates.crt`) para verificar el
  certificado TLS del portal. Sin eso falla con `CERTIFICATE_VERIFY_FAILED`.
- El Manager se automonitorea como agente `000`. No se puede instalar `wazuh-agent`
  en el mismo host que el manager (ambos usan `/var/ossec`). Para agentes reales,
  enrolar otras máquinas Linux contra el `1514/1515` del manager con la clave de
  `authd` (use_password).
- `level=3` limita el reenvío a alertas de nivel ≥ 3 para reducir ruido.
