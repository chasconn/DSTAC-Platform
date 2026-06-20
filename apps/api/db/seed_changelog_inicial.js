// Carga inicial del registro de cambios con las correcciones de móvil/responsive
// hechas en jun-2026. Script de datos (no de esquema) — seguro de re-correr,
// no duplica si el título ya existe.
const centralDB = require('./central')

const ENTRADAS = [
  {
    fecha: '2026-06-20',
    titulo: 'La app no se podía rotar a horizontal en tablet/celular',
    categoria: 'correccion',
    resumen_simple:
      'Cuando se instalaba la app DSTAC en el celular o tablet (como una app normal del teléfono), la pantalla quedaba pegada en modo vertical y no dejaba girarla a horizontal, aunque el dispositivo no tuviera bloqueada la rotación. Esto pasaba porque, al configurar la "instalación" de la web como app, se le había indicado al sistema que solo podía mostrarse en vertical. Se corrigió quitando esa restricción.',
    detalle_tecnico:
`El archivo apps/web/app/manifest.js genera el manifest.webmanifest que los navegadores usan para "instalar" la web como app (PWA). Tenía la propiedad orientation: 'portrait'.

Esa propiedad le indica al sistema operativo que bloquee la orientación de pantalla cuando la app corre en modo standalone (instalada), sin importar el ajuste de rotación físico del dispositivo — es una restricción a nivel de la app, no del teléfono.

Se eliminó esa línea por completo del manifest, dejando la orientación libre (comportamiento por defecto "any"), que respeta el ajuste de rotación real del dispositivo.`,
    archivos: ['apps/web/app/manifest.js'],
    comandos: [
      'git add apps/web/app/manifest.js',
      'git commit -m "Permite rotar la pantalla en la app instalada (tablet/celular)"',
      'git push origin main',
    ],
  },
  {
    fecha: '2026-06-20',
    titulo: 'El celular seguía sin poder rotar después del primer arreglo',
    categoria: 'correccion',
    resumen_simple:
      'Después de corregir el problema anterior, en otro dispositivo seguía sin poder rotarse. La causa: el navegador había guardado en una "caché" (una copia local para que la app cargue más rápido y funcione sin internet) la versión vieja y dañada de esa configuración. Como el archivo que controla esa caché no había cambiado, el navegador nunca se dio cuenta de que había una versión nueva disponible. Se corrigió haciendo que esa configuración nunca se guarde en caché, y forzando que el navegador reconozca la actualización.',
    detalle_tecnico:
`El service worker (apps/web/public/sw.js) tenía /manifest.webmanifest dentro de la lista SHELL_ASSETS, que se guarda en caché durante el evento "install", y el manejador de "fetch" servía cualquier solicitud con estrategia cache-first (si existe en caché, nunca vuelve a pedirlo al servidor).

Como el contenido del archivo sw.js no cambió entre el primer y el segundo intento de arreglo, el navegador nunca reinstaló el service worker — la detección de actualización de un service worker funciona comparando los bytes del archivo, no su efecto. Por lo tanto seguía sirviendo el manifest viejo desde la caché 'dstac-shell-v1', con la orientación bloqueada.

Se quitó /manifest.webmanifest de SHELL_ASSETS, se excluyó explícitamente del manejador de fetch (siempre va a la red, nunca a caché), y se subió el nombre de la caché a 'dstac-shell-v2' para forzar que el navegador detecte el archivo sw.js como modificado y reinstale el service worker completo.`,
    archivos: ['apps/web/public/sw.js'],
    comandos: [
      'git add apps/web/public/sw.js',
      'git commit -m "Corrige manifest atascado en caché del service worker"',
      'git push origin main',
    ],
  },
  {
    fecha: '2026-06-20',
    titulo: 'El certificado de cumplimiento mostraba "undefined" en vez del nombre de la empresa',
    categoria: 'correccion',
    resumen_simple:
      'Al generar la vista previa del certificado de cumplimiento (Ley 21.663), donde debía aparecer el nombre de la empresa salía literalmente la palabra "undefined" (que en programación significa "no tiene ningún valor cargado"). Pasaba porque, en ese paso específico del proceso, el sistema no estaba consultando el nombre real de la empresa en la base de datos — sí lo hacía en otras pantallas del sistema, pero se había omitido en el certificado. Se corrigió agregando esa consulta que faltaba.',
    detalle_tecnico:
`El módulo apps/api/services/reports/certificado.js recibía el objeto "company" desde el middleware resolveTenant (apps/api/middleware/tenant.js), el cual solo selecciona las columnas id, slug, plan_id, status de la tabla companies — nunca incluye name ni rut, por diseño (esos datos no son necesarios para resolver el tenant).

El resto de los módulos de reportes (ej. el endpoint /documento de apps/api/routes/admin/ley21663.js) ya sabían esto y hacían una consulta aparte (SELECT name FROM companies WHERE id = ?) antes de usar el nombre de la empresa. El módulo del certificado no hacía esa consulta adicional y usaba directamente company.name, que llegaba como undefined.

Se agregó la consulta SELECT name, rut FROM companies WHERE id = ? dentro de getData(), y se fusionó el resultado con el objeto company antes de pasarlo a buildHTML().`,
    archivos: ['apps/api/services/reports/certificado.js'],
    comandos: [
      'git add apps/api/services/reports/certificado.js apps/web/components/admin/BotonInforme.js',
      'git commit -m "Corrige nombre de empresa \\"undefined\\" y recorte del certificado en móvil"',
      'git push origin main',
    ],
  },
  {
    fecha: '2026-06-20',
    titulo: 'La vista previa de documentos horizontales se veía cortada en celular',
    categoria: 'correccion',
    resumen_simple:
      'Al abrir la vista previa de un documento que se imprime en formato horizontal (como el certificado de cumplimiento) desde un celular con pantalla angosta, el documento se mostraba cortado por los costados, sin forma de verlo completo sin rotar el teléfono. El visor tenía un límite interno: nunca se achicaba más del 50%, pero en una pantalla angosta un documento horizontal a veces necesita achicarse más que eso para entrar completo en la pantalla. Se corrigió bajando ese límite mínimo.',
    detalle_tecnico:
`El componente apps/web/components/admin/BotonInforme.js calcula automáticamente el zoom necesario para que el documento (cargado dentro de un iframe) entre en el contenedor visible, con la función:
fit() = Math.max(0.5, Math.min(2, anchoContenedor / anchoDocumento))

El Math.max(0.5, ...) fuerza un piso de 50% sin importar el resultado real del cálculo: si el ancho ideal necesario era, por ejemplo, 32%, igual se aplicaba 50%, y el documento quedaba más grande que el contenedor visible — se recortaba en los bordes sin ningún aviso al usuario.

Se bajó el piso mínimo de la función fit() y de la función de zoom manual (los botones "−" / "+") setZ(), de 0.5/0.4 a 0.15. Esto permite que el visor se achique lo necesario para mostrar documentos horizontales completos en pantallas angostas de celular.`,
    archivos: ['apps/web/components/admin/BotonInforme.js'],
    comandos: [
      'git add apps/api/services/reports/certificado.js apps/web/components/admin/BotonInforme.js',
      'git commit -m "Corrige nombre de empresa \\"undefined\\" y recorte del certificado en móvil"',
      'git push origin main',
    ],
  },
  {
    fecha: '2026-06-20',
    titulo: 'Auditoría y corrección de diseño responsive en toda la plataforma',
    categoria: 'correccion',
    resumen_simple:
      'Se revisó toda la plataforma (panel de DSTAC y portal de clientes) buscando partes que no se veían bien o no funcionaban correctamente en pantallas angostas (celulares y tablets). Se encontraron y corrigieron 4 tipos de problema:\n\n' +
      '1) Paneles de detalle que aparecían al lado de una lista (por ejemplo, al hacer clic en un activo o un acceso): en pantallas angostas, ese panel de ancho fijo aplastaba la lista hasta casi desaparecer. Ahora ese panel se abre ocupando toda la pantalla en celular, igual que una ventana nueva, en vez de convivir apretado al lado de la lista.\n\n' +
      '2) Tablas anchas con muchas columnas (Clientes, Accesos, Activos, Identidades, Personal, Usuarios): se veían amontonadas o cortadas en celular. Ahora se puede deslizar el dedo hacia los lados para ver todas las columnas, en vez de que se corten sin aviso.\n\n' +
      '3) Ventanas/paneles flotantes de ancho fijo (por ejemplo, en el módulo NIST) que eran más anchos que la pantalla de un celular y quedaban cortados. Ahora se ajustan automáticamente al ancho disponible de la pantalla.\n\n' +
      '4) El menú lateral del portal de clientes no tenía el botón de "menú hamburguesa" que sí tenía el panel de DSTAC — en celular ocupaba espacio fijo todo el tiempo, robándole pantalla al contenido. Ahora tiene el mismo botón de menú plegable que ya tenía el panel de DSTAC.',
    detalle_tecnico:
`Se hizo una auditoría completa del código (estilos en línea de React, sin Tailwind ni CSS modules) y se corrigieron 4 categorías de problemas en 30 archivos:

1. PANELES DE DETALLE FIJOS (13 archivos) — Eran elementos hijos de un contenedor "flex" junto a una tabla (lista + panel lado a lado), con un ancho fijo en píxeles (280-300px) y sin ningún comportamiento especial para pantallas angostas. En un celular de ~375px de ancho, ese panel fijo dejaba casi sin espacio a la tabla.
   Solución: se les agregó la clase CSS "detail-side-panel" y se creó una regla en apps/web/app/globals.css dentro de un @media (max-width: 820px) que los convierte en position:fixed con inset:0 (pantalla completa) cuando la pantalla es angosta — exactamente el mismo breakpoint de 820px que ya usaba el Sidebar admin para su propio modo móvil.
   Archivos: ActivoDetalle.js, AccesoDetalle.js, IdentidadDetalle.js, PersonalDetalle.js, UsuarioDetalle.js, IncidenteDetalle.js, ClienteDetailPanel.js (admin) + ClienteActivoDetalle.js, ClienteAccesoDetalle.js, ClienteIdentidadDetalle.js, ClientePersonalDetalle.js, ClienteIncidenteDetalle.js, ClienteRiesgoDetalle.js (portal cliente).

2. PANELES/MODALES FLOTANTES DE ANCHO FIJO (4 archivos) — Usaban position:fixed con un width en píxeles fijo (420-480px) sin ningún tope relativo al ancho de pantalla.
   Solución: se cambió width: 480 (o 420) por width: 'min(480px, 94vw)' (o 420px) — usa el menor entre el ancho fijo deseado y el 94% del ancho real de la pantalla (vw = viewport width).
   Archivos: ControlPanel.js, HistorialPanel.js, EvidenciaPanel.js (paneles del módulo NIST) y el modal de edición de tareas en PlanAccionTab.js.

3. TABLAS CON GRID DE COLUMNAS FIJAS (7 archivos) — Usaban CSS Grid (display:'grid') con gridTemplateColumns definido en valores fijos (ej. '2fr 1fr 1fr 70px 70px 1fr 96px'), sin ninguna regla de colapso para pantallas angostas. El navegador comprimía las columnas hasta hacerlas ilegibles.
   Solución: se agregó minWidth a las filas (header y datos) igual a la suma aproximada de las columnas, y se cambió el contenedor de overflow:'hidden' a overflowX:'auto' — esto permite que la tabla mantenga su ancho real y el usuario la deslice horizontalmente con el dedo, en vez de comprimirla hasta romperla.
   Archivos: ClientesTabla.js, AccesosTabla.js, ActivosTabla.js, IdentidadesTabla.js, PersonalTabla.js, UsuariosTabla.js, PlanAccionTab.js (NIST). Nota: RiesgosTabla.js ya tenía una vista de tarjetas dedicada para celular (prop isMobile) — no necesitaba corrección, era un falso positivo de la auditoría inicial.

4. TABLAS HTML SIN SCROLL HORIZONTAL (4 archivos) — Tablas HTML normales (<table>) sin ningún contenedor que permitiera deslizarlas en pantallas angostas.
   Solución: se envolvió cada <table> en un <div style={{overflowX:'auto'}}> con un minWidth en la tabla misma, igual que el punto 3.
   Archivos: gastos/page.js, diagnostico/page.js, ley21663/page.js, ley21719/page.js.

5. SIDEBAR DEL PORTAL CLIENTE SIN MODO MÓVIL — apps/web/components/admin/Sidebar.js (panel DSTAC) ya tenía lógica de detección de pantalla angosta (window.matchMedia('(max-width: 820px)')) que convertía el menú lateral en un "drawer" (panel que se abre/cierra con un botón flotante tipo hamburguesa) en celular. apps/web/components/client/ClientSidebar.js (portal del cliente) no tenía nada de esto — siempre ocupaba 200px fijos de ancho.
   Solución: se replicó exactamente el mismo patrón en ClientSidebar.js — estados isMobile/mobileOpen con matchMedia, botón hamburguesa flotante (position:fixed) que aparece solo en celular, fondo oscuro semitransparente al abrir el menú, y el sidebar pasando a position:fixed con transform:translateX(-100%/0) para deslizarse desde la izquierda. También se le agregó la clase "client-shell-main" al <main> de ClientShell.js, con padding-top reservado para el botón hamburguesa (mismo patrón que "admin-shell-main" ya tenía).

Validación: dado que node --check falla en archivos JSX con "return <JSX>" en una sola línea (limitación conocida del parser de Node, no relacionada a los cambios), se verificó cada archivo modificado revisando el diff completo (git diff) línea por línea antes de subir, ya que un build local de Next.js no era viable sin una instalación completa de node_modules en el entorno de trabajo.`,
    archivos: [
      'apps/web/app/globals.css',
      'apps/web/components/client/ClientSidebar.js',
      'apps/web/components/client/ClientShell.js',
      'apps/web/app/(admin)/admin/nist/components/panels/ControlPanel.js',
      'apps/web/app/(admin)/admin/nist/components/panels/HistorialPanel.js',
      'apps/web/app/(admin)/admin/nist/components/panels/EvidenciaPanel.js',
      'apps/web/app/(admin)/admin/nist/components/tabs/PlanAccionTab.js',
      'apps/web/app/(admin)/admin/clientes/components/ClientesTabla.js',
      'apps/web/app/(admin)/admin/clientes/components/ClienteDetailPanel.js',
      'apps/web/app/(admin)/admin/accesos/components/AccesosTabla.js',
      'apps/web/app/(admin)/admin/accesos/components/AccesoDetalle.js',
      'apps/web/app/(admin)/admin/activos/components/ActivosTabla.js',
      'apps/web/app/(admin)/admin/activos/components/ActivoDetalle.js',
      'apps/web/app/(admin)/admin/identidades/components/IdentidadesTabla.js',
      'apps/web/app/(admin)/admin/identidades/components/IdentidadDetalle.js',
      'apps/web/app/(admin)/admin/personal/components/PersonalTabla.js',
      'apps/web/app/(admin)/admin/personal/components/PersonalDetalle.js',
      'apps/web/app/(admin)/admin/usuarios/components/UsuariosTabla.js',
      'apps/web/app/(admin)/admin/usuarios/components/UsuarioDetalle.js',
      'apps/web/app/(admin)/admin/incidentes/components/IncidenteDetalle.js',
      'apps/web/app/(admin)/admin/gastos/page.js',
      'apps/web/app/(admin)/admin/diagnostico/page.js',
      'apps/web/app/(admin)/admin/ley21663/page.js',
      'apps/web/app/(admin)/admin/ley21719/page.js',
      'apps/web/app/(client)/client/accesos/components/ClienteAccesoDetalle.js',
      'apps/web/app/(client)/client/activos/components/ClienteActivoDetalle.js',
      'apps/web/app/(client)/client/identidades/components/ClienteIdentidadDetalle.js',
      'apps/web/app/(client)/client/personal/components/ClientePersonalDetalle.js',
      'apps/web/app/(client)/client/incidentes/components/ClienteIncidenteDetalle.js',
      'apps/web/app/(client)/client/riesgos/components/ClienteRiesgoDetalle.js',
    ],
    comandos: [
      'git add -A -- apps/web',
      'git commit -m "Corrige problemas de responsive en módulos admin y cliente"',
      'git push origin main',
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
