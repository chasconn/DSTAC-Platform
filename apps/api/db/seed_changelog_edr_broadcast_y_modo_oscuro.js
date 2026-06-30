// Registra en el changelog interno (dstac_changelog) las dos correcciones del
// PR "Filtrar broadcast/multicast en EDR + fix modo oscuro en Cotizaciones".
// Script de datos (no de esquema) — seguro de re-correr, no duplica si el
// título ya existe.
const centralDB = require('./central')

const ENTRADAS = [
  {
    fecha: '2026-06-30',
    titulo: 'El panel "Equipos en la red" del EDR mostraba equipos falsos con fabricante desconocido',
    categoria: 'correccion',
    resumen_simple:
      'En el módulo EDR, dentro del panel "Equipos en la red", aparecían entradas que no correspondían a ningún equipo real de la empresa — se mostraban con fabricante desconocido y direcciones IP/MAC raras (terminadas en .255 o que empezaban con ciertos patrones). Esto pasaba porque el agente que escanea la red, al revisar la lista de dispositivos detectados, incluía direcciones especiales que la red usa para enviar mensajes a "todos los equipos a la vez" (broadcast) o a "un grupo de equipos" (multicast) — esas direcciones no son equipos físicos, son mecanismos internos de la red, pero el escaneo las reportaba igual que si fueran una máquina más. Se corrigió agregando un filtro que descarta esas direcciones antes de guardarlas, y se limpiaron las que ya habían quedado guardadas de antes del fix.',
    detalle_tecnico:
`El agente Wazuh en cada equipo cliente ejecuta un script de descubrimiento de red (dstac-network-scan) que lee la tabla ARP del sistema operativo y reporta cada IP/MAC encontrada como un "equipo en la red" al backend, vía apps/api/routes/admin/edr.js → tabla edr_network_devices.

La tabla ARP de cualquier sistema incluye, además de equipos reales, entradas especiales:
- Broadcast: IPs terminadas en .255 dentro de una subred /24 (ej. 192.168.1.255) y la MAC FF:FF:FF:FF:FF:FF.
- Multicast: rango de IP 224.0.0.0–239.255.255.255, y MACs que empiezan con 01:00:5E:* (multicast IPv4) o 33:33:* (multicast IPv6).

El script no filtraba nada de esto, así que cada una de esas entradas terminaba como un "equipo" en el panel, con fabricante "Desconocido" porque esas MACs no pertenecen a ningún fabricante de hardware real.

Se agregó una función de filtrado — es_broadcast_o_multicast() en los scripts shell (Linux/macOS) y Es-BroadcastOMulticast en el script PowerShell (Windows) — que descarta cualquier fila de la tabla ARP cuya IP o MAC coincida con los patrones de broadcast/multicast antes de enviarla al backend. Se replicó en las 11 copias existentes del script de descubrimiento: las 4 variantes (Linux/macOS/Windows/Windows Server) en deploy/wazuh/, su espejo en apps/web/public/installers/ (de donde se descargan los instaladores), y los string literals embebidos en el código fuente de los instaladores compilados (.exe) installer-src/Program.cs e installer-server-src/Program.cs.

Como las filas basura ya estaban guardadas en edr_network_devices antes de este fix (el filtro solo evita que se sigan agregando filas nuevas), se agregó apps/api/db/cleanup_edr_broadcast_rows.js: un script de un solo uso, seguro de re-correr, que borra de la tabla las filas existentes que coincidan con los mismos patrones de broadcast/multicast.`,
    archivos: [
      'deploy/wazuh/network-scan.sh',
      'deploy/wazuh/install-agent.sh',
      'deploy/wazuh/install-agent-macos.sh',
      'deploy/wazuh/install-agent-windows.ps1',
      'deploy/wazuh/install-agent-windows-server.ps1',
      'deploy/wazuh/installer-src/Program.cs',
      'deploy/wazuh/installer-server-src/Program.cs',
      'apps/web/public/installers/install-agent.sh',
      'apps/web/public/installers/install-agent-macos.sh',
      'apps/web/public/installers/install-agent-windows.ps1',
      'apps/web/public/installers/install-agent-windows-server.ps1',
      'apps/api/db/cleanup_edr_broadcast_rows.js',
    ],
    comandos: [
      'node apps/api/db/cleanup_edr_broadcast_rows.js',
      'git commit -m "Filtrar direcciones multicast/broadcast en el descubrimiento de red EDR"',
      'git commit -m "Agregar script de limpieza única para filas broadcast/multicast en edr_network_devices"',
      'git push origin claude/analysis-parsing-issue-hhh04r',
    ],
  },
  {
    fecha: '2026-06-30',
    titulo: 'En Cotizaciones, el panel de detalle y los modales se veían en blanco con el modo oscuro activado',
    categoria: 'correccion',
    resumen_simple:
      'Al activar el "Modo oscuro" en el panel de DSTAC y entrar a Cotizaciones, el resto de la pantalla se veía oscuro correctamente, pero el panel que se abre al hacer clic en una cotización (y los formularios de "Nueva cotización" y "Catálogo de servicios") seguían apareciendo en blanco, como si el modo oscuro no estuviera activado para ellos. Esto pasaba por un detalle técnico de cómo el navegador trata esos paneles flotantes en combinación con el truco usado para pintar todo el panel de oscuro. Se corrigió haciendo que esos paneles "salgan" del área que se oscurece e indicándoles directamente que se oscurezcan ellos mismos.',
    detalle_tecnico:
`El modo oscuro de la plataforma no recolorea cada componente uno por uno: aplica un filtro CSS filter: invert(0.92) hue-rotate(180deg) sobre el contenedor .admin-shell-main completo (definido en apps/web/app/globals.css), que invierte claro↔oscuro y corrige el tono para que los colores de marca se mantengan reconocibles. Es un truco visual barato de aplicar a toda la plataforma sin re-escribir estilos en cada archivo.

CotizacionDetalle.js (panel de detalle), CotizacionModal.js ("Nueva cotización") y CatalogoModal.js ("Catálogo de servicios") son overlays con position: fixed, ya envueltos en el componente FixedPortal (apps/web/components/admin/FixedPortal.js) por un problema previo no relacionado (el zoom del panel rompía position:fixed). En navegadores Chromium recientes, un elemento con filter establece un "containing block" para sus descendientes con position:fixed — es decir, aunque el contenido se renderice fuera del árbol visual mediante un portal de React, el navegador seguía tratando esos overlays como si estuvieran "dentro" del contenedor con el filtro de inversión para efectos de posicionamiento, pero sin que el filtro visual los alcanzara realmente — quedaban confinados y sin el filtro aplicado, mostrándose en su blanco original.

Se agregó la clase CSS cot-fixed-overlay a los tres overlays con position:fixed dentro de esos componentes, y una regla en globals.css que aplica el mismo filter: invert(0.92) hue-rotate(180deg) directamente sobre esa clase cuando [data-theme="dark"] está activo en <html> — una sola aplicación del filtro, sin depender de que el filtro del ancestro los alcance. Se agregó también la regla complementaria que reinvierte imágenes/videos dentro de esos overlays (mismo patrón ya usado para el resto del panel), para que no salgan con los colores invertidos.`,
    archivos: [
      'apps/web/app/(admin)/admin/cotizaciones/components/CotizacionDetalle.js',
      'apps/web/app/(admin)/admin/cotizaciones/components/CotizacionModal.js',
      'apps/web/app/(admin)/admin/cotizaciones/components/CatalogoModal.js',
      'apps/web/app/globals.css',
    ],
    comandos: [
      'git commit -m "fix: modo oscuro en overlays de Cotizaciones mediante React portals"',
      'git push origin claude/analysis-parsing-issue-hhh04r',
    ],
  },
]

async function main() {
  for (const e of ENTRADAS) {
    const [[ya]] = await centralDB.query('SELECT id FROM dstac_changelog WHERE titulo = ?', [e.titulo])
    if (ya) { console.log(`- ya existe: ${e.titulo}`); continue }
    await centralDB.execute(
      `INSERT INTO dstac_changelog (fecha, titulo, categoria, resumen_simple, detalle_tecnico, archivos, comandos)
       VALUES (?,?,?,?,?,?,?)`,
      [e.fecha, e.titulo, e.categoria, e.resumen_simple, e.detalle_tecnico, JSON.stringify(e.archivos), JSON.stringify(e.comandos)]
    )
    console.log(`✓ creado: ${e.titulo}`)
  }
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
