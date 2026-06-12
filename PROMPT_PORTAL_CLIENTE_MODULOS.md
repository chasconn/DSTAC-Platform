# PROMPT — Módulos de solo lectura del Portal Cliente
# Lee CLAUDE.md antes de empezar.
# El portal cliente ya existe con su dashboard funcionando.
# Este prompt agrega 3 módulos de visualización: Activos, Identidades y Accesos.
# El cliente SOLO puede ver y filtrar. Sin crear, editar ni eliminar.

---

## REGLA GENERAL DE SEGURIDAD

Todos los endpoints de este prompt usan:
- `requireAuth` + `requireClientRole`
- El `company_id` y `company_slug` SIEMPRE vienen del JWT, nunca del request
- Middleware `resolveTenant` usando el slug del JWT
- Nunca exponer datos de otras empresas

---

## ARCHIVOS A CREAR

```
apps/
├── web/
│   └── app/
│       └── (client)/
│           ├── activos/
│           │   ├── page.js
│           │   └── components/
│           │       ├── ClienteActivosTabla.js
│           │       └── ClienteActivoDetalle.js
│           ├── identidades/
│           │   ├── page.js
│           │   └── components/
│           │       ├── ClienteIdentidadesTabla.js
│           │       └── ClienteIdentidadDetalle.js
│           └── accesos/
│               ├── page.js
│               └── components/
│                   ├── ClienteAccesosTabla.js
│                   └── ClienteAccesoDetalle.js
└── api/
    └── routes/
        └── client/
            ├── activos.js
            ├── identidades.js
            └── accesos.js
```

---

## BACKEND — Rutas cliente (solo GET)

### apps/api/routes/client/activos.js

```javascript
// GET /api/client/activos
// Query params: search, tipo, criticidad, estado, ambiente, page, limit
// SIEMPRE usa req.user.company_slug — nunca parámetros del request

async function listarActivos(req, res) {
  const { search, tipo, criticidad, estado, ambiente, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []

  if (search)     { where += ' AND (nombre LIKE ? OR proveedor LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  if (tipo)       { where += ' AND tipo = ?';        params.push(tipo) }
  if (criticidad) { where += ' AND criticidad = ?';  params.push(criticidad) }
  if (estado)     { where += ' AND estado = ?';      params.push(estado) }
  if (ambiente)   { where += ' AND ambiente = ?';    params.push(ambiente) }

  const sql = `
    SELECT
      a.id, a.tipo, a.nombre, a.proveedor, a.estado, a.criticidad,
      a.ambiente, a.proyecto, a.documentacion, a.metadata,
      a.created_at, a.updated_at,
      p.nombre AS responsable_nombre
    FROM activos a
    LEFT JOIN personal p ON a.responsable_id = p.id
    ${where}
    ORDER BY
      FIELD(a.criticidad,'critica','alta','media','baja'),
      a.nombre ASC
    LIMIT ? OFFSET ?
  `
  params.push(Number(limit), Number(offset))

  const [rows] = await req.tenantDB.execute(sql, params)

  const activos = rows.map(row => ({
    ...row,
    ip:                row.metadata?.ip ?? null,
    sistema_operativo: row.metadata?.sistema_operativo ?? null,
    version:           row.metadata?.version ?? null,
  }))

  const [countRows] = await req.tenantDB.execute(
    `SELECT COUNT(*) AS total FROM activos ${where}`,
    params.slice(0, -2)
  )

  res.json({ activos, total: countRows[0].total, page: Number(page), limit: Number(limit) })
}

// GET /api/client/activos/stats
async function statsActivos(req, res) {
  const [rows] = await req.tenantDB.execute(`
    SELECT
      COUNT(*) AS total,
      SUM(criticidad = 'critica') AS criticos,
      SUM(estado = 'degradado') AS degradados,
      SUM(estado = 'operativo') AS operativos
    FROM activos
  `)
  res.json(rows[0])
}

// GET /api/client/activos/:id
async function detalleActivo(req, res) {
  const [rows] = await req.tenantDB.execute(`
    SELECT a.*, p.nombre AS responsable_nombre
    FROM activos a
    LEFT JOIN personal p ON a.responsable_id = p.id
    WHERE a.id = ?
  `, [req.params.id])

  if (!rows.length) return res.status(404).json({ error: 'No encontrado' })
  const activo = rows[0]
  activo.ip                = activo.metadata?.ip ?? null
  activo.sistema_operativo = activo.metadata?.sistema_operativo ?? null
  activo.version           = activo.metadata?.version ?? null
  res.json(activo)
}
```

### apps/api/routes/client/identidades.js

```javascript
// GET /api/client/identidades
// Query params: search, tipo_identidad, estado, page, limit

const sql = `
  SELECT
    i.id, i.nombre, i.identidad, i.tipo_identidad, i.origen,
    i.estado, i.fecha_expiracion, i.created_at,
    p.nombre AS propietario_nombre,
    p.rol_empresarial AS propietario_rol
  FROM identidades i
  LEFT JOIN personal p ON i.propietario_id = p.id
  ${where}
  ORDER BY
    FIELD(i.estado,'comprometida','expirada','pendiente','activa','inactiva'),
    i.nombre ASC
  LIMIT ? OFFSET ?
`

// GET /api/client/identidades/stats
// { total, activas, comprometidas, expiradas, por_vencer }

// GET /api/client/identidades/:id
// Devuelve detalle completo incluyendo propietario
// IMPORTANTE: NO exponer el valor completo de api_keys en producción
// Mostrar solo los últimos 4 caracteres: "****" + valor.slice(-4)
```

### apps/api/routes/client/accesos.js

```javascript
// Al cargar: auto-expirar accesos vencidos igual que en el panel DSTAC
// GET /api/client/accesos
// Query params: search, nivel_acceso, estado, criticidad, page, limit

const sql = `
  SELECT
    ac.id, ac.nivel_acceso, ac.entorno, ac.estado, ac.criticidad,
    ac.fecha_otorgamiento, ac.fecha_expiracion,
    i.nombre    AS identidad_nombre,
    i.identidad AS identidad_valor,
    i.tipo_identidad,
    p.nombre    AS propietario_nombre,
    a.nombre    AS activo_nombre,
    a.tipo      AS activo_tipo
  FROM accesos ac
  JOIN identidades i ON ac.identidad_id = i.id
  JOIN activos     a ON ac.activo_id    = a.id
  LEFT JOIN personal p ON i.propietario_id = p.id
  ${where}
  ORDER BY
    FIELD(ac.criticidad,'critica','alta','media','baja'),
    FIELD(ac.estado,'expirado','pendiente_revision','activo','suspendido','inactivo')
  LIMIT ? OFFSET ?
`

// GET /api/client/accesos/stats
// { total, activos, expirados, criticos, por_vencer }
```

---

## FRONTEND — Diseño visual

### Colores del portal cliente (fondo oscuro ya definido)

```css
/* Los módulos del portal cliente usan el mismo fondo oscuro del dashboard */
/* Widgets/tablas: rgba(255,255,255,0.06) con border rgba(83,74,183,0.3) */
/* Textos: #CECBF6 primario | #AFA9EC secundario | #7F77DD hints */
```

### Sidebar del portal cliente — agregar items

```jsx
// Agregar al sidebar del portal cliente los 3 módulos:
{ path: '/client/activos',      icon: 'ti-server',        label: 'Activos' },
{ path: '/client/identidades',  icon: 'ti-id-badge',      label: 'Identidades' },
{ path: '/client/accesos',      icon: 'ti-key',           label: 'Accesos' },
```

---

## MÓDULO ACTIVOS — Portal Cliente

### page.js

```jsx
// Igual que el panel DSTAC pero:
// - Sin botón "Nuevo activo"
// - Sin botón "Exportar" (por ahora)
// - Sin acciones en las filas (sin editar, sin eliminar)
// - Título: "Activos" + subtítulo "Inventario de activos de {empresa}"

// Stats: 4 cards (total, críticos, degradados, operativos)
// Filtros: Tipo | Criticidad | Estado | Ambiente | buscador
// Tabla con panel de detalle lateral al hacer clic en una fila
```

### ClienteActivosTabla.js

```jsx
// Columnas: Nombre/Tipo | Criticidad | Estado | Ambiente | Proveedor | Responsable
// Grid: 2fr 1fr 1fr 1fr 1fr 1fr
// SIN columna de Acciones
// Fila clickeable → abre panel de detalle
// Mismos badges de color que el panel DSTAC
// Filas con hover sutil

// Fila vacía si no hay datos:
// "Tu empresa aún no tiene activos registrados.
//  Contacta a tu analista DSTAC para cargar el inventario."
```

### ClienteActivoDetalle.js

```jsx
// Panel lateral 280px — igual que en panel DSTAC PERO:
// SIN botón "Editar activo"
// SIN botón "Eliminar activo"
// SIN botón "Ver identidades relacionadas" (por ahora)
// Solo información de lectura

// Secciones:
// 1. Badges criticidad + estado + ambiente
// 2. Información general: tipo, proveedor, ambiente, responsable, proyecto
// 3. Campos técnicos (solo si tienen valor): IP, SO, versión
// 4. Documentación (si tiene)
// 5. Auditoría: created_at, updated_at

// Footer: solo botón "Cerrar" para cerrar el panel
```

---

## MÓDULO IDENTIDADES — Portal Cliente

### ClienteIdentidadesTabla.js

```jsx
// Columnas: Nombre/Identidad | Tipo | Origen | Estado | Propietario | Expira
// Grid: 2fr 1fr 1fr 1fr 1.5fr 1fr
// SIN columna Acciones

// IMPORTANTE — Enmascarar valores sensibles:
// api_key:      mostrar "••••••••" + últimos 4 chars
// certificado:  mostrar valor completo (no es secreto)
// usuario:      mostrar valor completo
// cuenta_servicio: mostrar valor completo

// Banner de alertas si hay comprometidas o expiradas:
// (igual que panel DSTAC pero sin botón de acción, solo informativo)
// "X identidad(es) comprometida(s) — Contacta a tu analista DSTAC"

// Fila vacía:
// "Tu empresa aún no tiene identidades registradas."
```

### ClienteIdentidadDetalle.js

```jsx
// Panel 300px — igual que panel DSTAC PERO:
// SIN botones de editar/eliminar
// SIN botón copiar para api_keys (seguridad)
// El valor de la identidad se muestra enmascarado si es api_key

// Footer: solo "Cerrar"
```

---

## MÓDULO ACCESOS — Portal Cliente

### ClienteAccesosTabla.js

```jsx
// Auto-expiración al cargar (mismo que panel DSTAC)

// Columnas: Identidad/Propietario | Activo | Nivel | Criticidad | Estado | Expira
// Grid: 2.5fr 1.5fr 1fr 1fr 1fr 1fr
// SIN columna Acciones

// Banner si hay expirados:
// "X acceso(s) expirado(s) — Contacta a tu analista DSTAC para renovarlos"

// Filas root activos con fondo naranja suave (igual que panel DSTAC)

// Fila vacía:
// "Tu empresa aún no tiene accesos registrados."
```

### ClienteAccesoDetalle.js

```jsx
// Panel 300px — igual que panel DSTAC PERO:
// SIN botones de editar/eliminar/suspender

// Secciones:
// 1. Badges nivel + criticidad + estado
//    Banner rojo si expirado
//    Banner naranja si root activo
// 2. Identidad: nombre + valor enmascarado si api_key + tipo
// 3. Propietario: nombre + rol (si existe)
// 4. Activo: nombre + tipo
// 5. Condiciones: entorno, nivel, quien autorizó, justificación
// 6. Fechas: otorgamiento + expiración

// Footer: solo "Cerrar"
```

---

## MENSAJES DE ESTADO VACÍO

Cuando el cliente no tiene datos aún, mostrar mensajes útiles:

```jsx
// Activos vacíos:
<div className="empty-state">
  <i className="ti ti-server" />
  <div className="empty-title">Sin activos registrados</div>
  <div className="empty-desc">
    Tu analista DSTAC cargará el inventario de activos de tu empresa.
    Si tienes dudas, contáctanos.
  </div>
</div>

// Identidades vacías:
// "Tu analista DSTAC registrará las identidades digitales de tu empresa."

// Accesos vacíos:
// "Los accesos se registran una vez que el inventario de activos
//  e identidades esté completo."
```

---

## ORDEN DE CONSTRUCCIÓN

```
1. Backend: GET /api/client/activos/stats + /api/client/activos
2. Backend: GET /api/client/activos/:id
3. Frontend: página activos con tabla + panel detalle
4. Backend: GET /api/client/identidades/stats + /api/client/identidades
5. Backend: GET /api/client/identidades/:id
6. Frontend: página identidades con tabla + panel detalle
7. Backend: POST /api/client/accesos/expirar + GET /api/client/accesos/stats
8. Backend: GET /api/client/accesos + /api/client/accesos/:id
9. Frontend: página accesos con tabla + panel detalle
10. Agregar los 3 items al sidebar del portal cliente
11. Probar: login como cliente → navegar a cada módulo → ver datos → abrir detalle
```

---

## NOTAS CRÍTICAS

1. Sin TypeScript — JavaScript puro
2. credentials: 'include' en todos los fetch (cookie HttpOnly)
3. El slug de la empresa SIEMPRE del JWT — nunca del request
4. Las api_keys se enmascaran: "••••" + últimos 4 chars
5. Los mensajes de estado vacío mencionan "contacta a tu analista DSTAC"
6. Sin botones de acción en ningún módulo del portal cliente
7. El cliente puede filtrar y buscar pero no modificar nada
8. Auto-expiración de accesos al cargar la página de accesos
9. Los banners de alerta son informativos, sin botones de acción
10. Comentar el código — especialmente el enmascaramiento de api_keys

