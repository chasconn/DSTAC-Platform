# Microservicio DTE (LibreDTE autohospedado)

Este servicio es el puente entre el módulo **Facturación** de DSTAC Platform
y el SII. Es un esqueleto: define el contrato HTTP que ya consume
`apps/api/services/facturacion/dteClient.js`, pero la lógica real de
timbrado (firma XML, CAF, envío SOAP al SII) está marcada con `TODO` en
`src/DteService.php` porque depende de la versión exacta de
`libredte/libredte-lib-core` y de tus credenciales — no se puede dejar
"lista" sin tu certificado y tus CAF reales.

## Antes de usarlo en producción

1. **Certificación ante el SII es obligatoria.** Para emitir DTE por ti
   mismo (sin pasar por un proveedor ya certificado) debes pasar el
   ["Set de Pruebas"](https://www.sii.cl/factura_electronica/) del SII con
   tu propio software, en el ambiente de certificación (maullin). Esto no es
   opcional ni algo que se pueda automatizar desde aquí — es un trámite que
   haces tú con tu RUT y tu certificado.
2. **Licencia AGPL-3.0.** `libredte-lib-core` es AGPL. Si este microservicio
   corre como servicio de red (que es justo lo que hace), la AGPL exige
   ofrecer el código fuente (con tus modificaciones) a quienes lo usan en
   red. Revisa con tu equipo legal si esto es aceptable para DSTAC antes de
   ir a producción; si no lo es, la alternativa es un proveedor de pago
   (OpenFactura, SimpleAPI) en vez de autohospedar.
3. **Nunca subas el certificado ni los CAF a git.** Van en
   `storage/cert/` y `storage/caf/` directamente en el VPS — ambas carpetas
   están en `.gitignore`.

## Configuración (variables de entorno)

| Variable | Descripción |
|---|---|
| `SII_AMBIENTE` | `certificacion` (pruebas, maullin) o `produccion` (palena) |
| `SII_RUT_EMISOR` | RUT de DSTAC con inicio de actividades |
| `SII_RAZON_SOCIAL` | Razón social del emisor |
| `SII_CERT_PATH` | Ruta al certificado `.pfx` dentro del contenedor (ej. `/app/storage/cert/certificado.pfx`) |
| `SII_CERT_PASS` | Contraseña del certificado |
| `SII_CAF_DIR` | Carpeta con los CAF (`.xml`) descargados desde sii.cl, uno por tipo de documento |
| `DTE_SERVICE_TOKEN` | Token compartido para autenticar las llamadas desde el API de DSTAC (opcional pero recomendado) |

## Pasos para dejarlo funcional

1. `composer require libredte/libredte-lib-core` dentro de `apps/dte/` y
   revisa la [documentación oficial](https://www.libredte.cl/docs) para la
   versión que te instale — la API de la librería cambia entre versiones
   mayores.
2. Implementa `DteService::emitir()` siguiendo esa documentación: cargar
   CAF → armar el DTE con los datos recibidos → firmar con el certificado →
   timbrar → enviar al SII → devolver `folio`, `track_id`, `estado_sii`,
   `pdf_url`.
3. Sube tu `certificado.pfx` y los `.xml` de CAF al VPS, en
   `storage/cert/` y `storage/caf/` (o configura rutas externas con las
   variables de entorno).
4. Primero prueba TODO en `SII_AMBIENTE=certificacion` hasta que el SII
   apruebe tu Set de Pruebas. Solo después cambia a `produccion`.
5. En el servicio API de DSTAC, configura `DTE_SERVICE_URL` (y
   `DTE_SERVICE_TOKEN` si lo usas) apuntando a este microservicio.

## Contrato HTTP

- `GET /salud` → `{ ok: true, ambiente }`
- `POST /emitir` con body:
  ```json
  {
    "tipo_dte": "33",
    "receptor": { "razon_social": "...", "rut": "...", "giro": "..." },
    "items": [{ "descripcion": "...", "cantidad": 1, "precio_unitario": 100000 }],
    "glosa": "...",
    "fecha_emision": "2026-06-22"
  }
  ```
  → `{ "folio": 123, "track_id": "...", "estado_sii": "...", "pdf_url": "...", "xml_url": "..." }`
- `GET /estado/{trackId}` → estado actual del envío en el SII.

## Despliegue (EasyPanel / Docker)

Build con `Dockerfile.dte` (contexto = raíz del repo), puerto interno
`8080`, **sin dominio público** (igual que el API: solo Nginx/Traefik
expone tráfico). Monta `storage/cert` y `storage/caf` como volúmenes
persistentes para no perder el certificado y los folios entre despliegues.
