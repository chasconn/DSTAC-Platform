// Registra en el changelog interno (dstac_changelog) la nueva funcionalidad
// del botón "🌐 Origen" en el módulo EDR. Script de datos (no de esquema) —
// seguro de re-correr, no duplica si el título ya existe.
const centralDB = require('./central')

const ENTRADA = {
  fecha: '2026-06-27',
  titulo: 'Nuevo botón "🌐 Origen" en alertas EDR para ver de dónde vino un ataque',
  categoria: 'feature',
  resumen_simple:
    'Antes, si llegaba una alerta de bloqueo automático (por ejemplo, un intento de fuerza bruta SSH), había que copiar la IP del atacante y buscarla manualmente en una página externa para saber desde qué país o ciudad venía. Ahora, en la tabla de alertas del módulo EDR, cada IP de origen tiene un botón "🌐 Origen" que muestra de inmediato la ciudad, país y proveedor de internet (ISP) de esa IP, y abre su ubicación en Google Maps — todo sin salir del panel ni copiar nada a mano.',
  detalle_tecnico:
`Se agregó el endpoint GET /api/admin/edr/alerts/origen?ip=<ip> en apps/api/routes/admin/edr.js, justo después de la ruta existente /agents/:wazuhId/ubicacion, reutilizando las mismas funciones ya existentes ipPrivada(ip) y geoip(ip) (que llaman a la API gratuita ip-api.com) en vez de duplicar lógica.

El endpoint queda protegido por el mismo middleware que el resto del router (router.use(requireAuth, requireDstacRole, resolveTenant)): exige sesión válida y rol de staff DSTAC (super_admin, admin_dstac, analista_dstac o consultor_dstac), nunca accesible para roles de cliente ni de forma anónima. Si la IP es de rango privado, devuelve un mensaje indicando que no es geolocalizable públicamente, sin llamar a la API externa.

En el frontend (apps/web/app/(admin)/admin/edr/page.js) se agregó la función buscarOrigen(ip), que llama a ese endpoint y muestra el resultado (ciudad, región, país, ISP) en un toast, además de abrir automáticamente la ubicación en Google Maps en una pestaña nueva. Se agregó el botón "🌐 Origen" en la celda de IP de origen de la tabla de alertas, visible solo cuando la alerta tiene src_ip.

Se revisó el endpoint desde una perspectiva de seguridad antes de mergear a main: no introduce SSRF (el host de la llamada saliente está hardcodeado a ip-api.com, la IP del usuario solo se interpola en el path), no introduce XSS (el resultado se renderiza como texto plano en React, que escapa automáticamente cualquier carácter especial), no hay conflicto de rutas con otros endpoints de /alerts, y el acceso requiere autenticación + rol de staff DSTAC igual que el resto del panel admin.`,
  archivos: [
    'apps/api/routes/admin/edr.js',
    'apps/web/app/(admin)/admin/edr/page.js',
  ],
  comandos: [
    'git add apps/api/routes/admin/edr.js apps/web/app/(admin)/admin/edr/page.js',
    'git commit -m "Agrega botón de origen de IP en alertas EDR"',
    'git push origin claude/edr-alert-investigation-cb8a6d:main',
  ],
}

async function main() {
  const [[ya]] = await centralDB.query('SELECT id FROM dstac_changelog WHERE titulo = ?', [ENTRADA.titulo])
  if (ya) { console.log(`- ya existe: ${ENTRADA.titulo}`); return }
  await centralDB.execute(
    `INSERT INTO dstac_changelog (fecha, titulo, categoria, resumen_simple, detalle_tecnico, archivos, comandos)
     VALUES (?,?,?,?,?,?,?)`,
    [ENTRADA.fecha, ENTRADA.titulo, ENTRADA.categoria, ENTRADA.resumen_simple, ENTRADA.detalle_tecnico,
     JSON.stringify(ENTRADA.archivos), JSON.stringify(ENTRADA.comandos)]
  )
  console.log(`✓ creado: ${ENTRADA.titulo}`)
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
