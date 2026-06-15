#!/usr/bin/env python3
# Integracion Wazuh -> webhook DSTAC EDR.
# Wazuh invoca: custom-dstac <alert_file> <api_key> <hook_url>
# Lee la alerta JSON y la reenvia por POST con el header x-edr-key.
import sys
import os
import json
import ssl

try:
    import urllib.request as urlreq
except ImportError:
    sys.exit(1)


def build_ssl_context():
    # El python embebido de Wazuh no trae CA bundle propio; usamos el del sistema
    # (Ubuntu) para poder verificar el certificado del portal.
    for ca in ('/etc/ssl/certs/ca-certificates.crt', '/etc/pki/tls/certs/ca-bundle.crt'):
        if os.path.exists(ca):
            try:
                return ssl.create_default_context(cafile=ca)
            except Exception:
                pass
    return ssl.create_default_context()


def main(argv):
    if len(argv) < 2:
        sys.exit(1)

    alert_file = argv[1]
    api_key = argv[2] if len(argv) > 2 else ''
    hook_url = argv[3] if len(argv) > 3 else ''

    # Robustez: si el 2do arg ya es la URL (algunas versiones), reordenar.
    if not hook_url and api_key.startswith('http'):
        hook_url, api_key = api_key, ''

    if not hook_url:
        sys.exit(0)

    try:
        with open(alert_file, 'r') as f:
            alert = json.load(f)
    except Exception as e:
        sys.stderr.write('custom-dstac: no se pudo leer la alerta: %s\n' % str(e))
        sys.exit(0)

    data = json.dumps(alert).encode('utf-8')
    req = urlreq.Request(hook_url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    if api_key:
        req.add_header('x-edr-key', api_key)

    ctx = build_ssl_context()
    try:
        urlreq.urlopen(req, timeout=10, context=ctx)
    except Exception as e:
        # No interrumpir el integrator de Wazuh por un fallo de red.
        sys.stderr.write('custom-dstac: error enviando alerta: %s\n' % str(e))
        sys.exit(0)


if __name__ == '__main__':
    main(sys.argv)
