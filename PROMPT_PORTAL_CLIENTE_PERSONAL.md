# PROMPT — Módulo Personal (solo lectura) Portal Cliente
# Lee CLAUDE.md antes de empezar.
# Misma arquitectura que Activos, Identidades y Accesos del portal cliente.
# El cliente solo puede ver y filtrar. Sin crear, editar ni eliminar.

---

## ARCHIVOS A CREAR

```
apps/
├── web/
│   └── app/
│       └── (client)/
│           └── personal/
│               ├── page.js
│               └── components/
│                   ├── ClientePersonalTabla.js
│                   └── ClientePersonalDetalle.js
└── api/
    └── routes/
        └── client/
            └── personal.js
```

---

## BACKEND — apps/api/routes/client/personal.js

```javascript
// GET /api/client/personal
// Query params: search, estado, nivel_responsabilidad, page, limit
// SIEMPRE usa req.user.company_slug del JWT

async function listarPersonal(req, res) {
  const { search, estado, nivel_responsabilidad, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []

  if (search) {
    where += ' AND (nombre LIKE ? OR correo LIKE ? OR rol_empresarial LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (estado)               { where += ' AND estado = ?';               params.push(estado) }
  if (nivel_responsabilidad){ where += ' AND nivel_responsabilidad = ?'; params.push(nivel_responsabilidad) }

  const sql = `
    SELECT
      id, nombre, rol_empresarial, nivel_responsabilidad,
      estado, fecha_ingreso, correo, telefono,
      created_at, updated_at
    FROM personal
    ${where}
    ORDER BY
      FIELD(estado,'activo','vacaciones','inactivo','desvinculado'),
      nombre ASC
    LIMIT ? OFFSET ?
  `
  params.push(Number(limit), Number(offset))

  const [rows] = await req.tenantDB.execute(sql, params)

  const [countRows] = await req.tenantDB.execute(
    `SELECT COUNT(*) AS total FROM personal ${where}`,
    params.slice(0, -2)
  )

  res.json({
    personal: rows,
    total: countRows[0].total,
    page: Number(page),
    limit: Number(limit)
  })
}

// GET /api/client/personal/stats
async function statsPersonal(req, res) {
  const [rows] = await req.tenantDB.execute(`
    SELECT
      COUNT(*) AS total,
      SUM(estado = 'activo') AS activos,
      SUM(estado = 'desvinculado') AS desvinculados,
      SUM(estado = 'vacaciones') AS en_vacaciones
    FROM personal
  `)
  res.json(rows[0])
}

// GET /api/client/personal/:id
async function detallePersonal(req, res) {
  const [rows] = await req.tenantDB.execute(
    'SELECT * FROM personal WHERE id = ?', [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' })
  res.json(rows[0])
}
```

---

## FRONTEND — page.js

```jsx
'use client'
import { useState, useEffect } from 'react'
import ClientePersonalStats  from './components/ClientePersonalStats'
import ClientePersonalTabla  from './components/ClientePersonalTabla'
import ClientePersonalDetalle from './components/ClientePersonalDetalle'

export default function ClientePersonalPage() {
  const [personal, setPersonal] = useState([])
  const [stats, setStats]       = useState(null)
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [filtros, setFiltros]   = useState({
    search: '', estado: '', nivel_responsabilidad: ''
  })

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      try {
        const params = new URLSearchParams(
          Object.fromEntries(Object.entries(filtros).filter(([,v]) => v))
        )
        const [resPersonal, resStats] = await Promise.all([
          fetch(`/api/client/personal?${params}`, { credentials: 'include' }),
          fetch('/api/client/personal/stats',      { credentials: 'include' })
        ])
        const dataPersonal = await resPersonal.json()
        const dataStats    = await resStats.json()
        setPersonal(dataPersonal.personal ?? [])
        setTotal(dataPersonal.total ?? 0)
        setStats(dataStats)
      } catch (err) {
        console.error('Error cargando personal:', err)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [filtros])

  return (
    <div className="client-module">
      {/* Stats */}
      <ClientePersonalStats stats={stats} />

      {/* Toolbar — sin botones de acción */}
      <div className="module-toolbar">
        <div className="search-wrap">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o rol..."
            value={filtros.search}
            onChange={e => setFiltros(f => ({...f, search: e.target.value}))}
          />
        </div>
        <select
          value={filtros.estado}
          onChange={e => setFiltros(f => ({...f, estado: e.target.value}))}>
          <option value="">Estado</option>
          <option value="activo">Activo</option>
          <option value="vacaciones">Vacaciones</option>
          <option value="inactivo">Inactivo</option>
          <option value="desvinculado">Desvinculado</option>
        </select>
        <select
          value={filtros.nivel_responsabilidad}
          onChange={e => setFiltros(f => ({...f, nivel_responsabilidad: e.target.value}))}>
          <option value="">Nivel</option>
          <option value="alto">Alto</option>
          <option value="medio">Medio</option>
          <option value="bajo">Bajo</option>
        </select>
        <span className="module-count">{total} personas</span>
      </div>

      {/* Tabla + detalle */}
      <div className="module-layout">
        <ClientePersonalTabla
          personal={personal}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
        />
        {selected && (
          <ClientePersonalDetalle
            persona={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}
```

---

## ClientePersonalTabla.js

```jsx
// Columnas: Nombre | Rol | Nivel | Estado | Correo | Teléfono
// Grid: 2fr 1.5fr 1fr 1fr 1.5fr 1fr
// SIN columna Acciones

// Avatar con iniciales (misma lógica que panel DSTAC):
function getInitials(nombre) {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// Color avatar según estado:
// activo:       bg #EAF3DE  color #27500A
// vacaciones:   bg #FAEEDA  color #633806
// inactivo:     bg #F1EFE8  color #444441
// desvinculado: bg #FCEBEB  color #791F1F

// Badges de estado (mismos colores que arriba)
// Badges de nivel:
// alto:  bg #EEEDFE  color #3C3489
// medio: bg #E6F1FB  color #0C447C
// bajo:  bg #F1EFE8  color #444441

// Fila clickeable → abre panel de detalle
// Fila seleccionada: background #EEEDFE

// Estado vacío:
// "Tu empresa aún no tiene personal registrado.
//  Contacta a tu analista DSTAC para cargar el directorio."
```

---

## ClientePersonalDetalle.js

```jsx
// Panel lateral 280px — solo lectura

// Secciones:
// 1. Avatar grande (iniciales 32px) + nombre + badges estado y nivel
// 2. "Información de contacto":
//    correo (con mailto: link si existe), teléfono
// 3. "Información laboral":
//    rol empresarial, nivel de responsabilidad, fecha de ingreso
// 4. "Auditoría": created_at, updated_at

// Footer: solo botón "Cerrar"
// SIN botones de editar, eliminar ni ver identidades
```

---

## ClientePersonalStats.js — 4 cards

```jsx
const STATS_CONFIG = [
  { key: 'total',         label: 'Total personal',  borderColor: '#534AB7', valueColor: null },
  { key: 'activos',       label: 'Activos',         borderColor: '#1D9E75', valueColor: '#27500A' },
  { key: 'en_vacaciones', label: 'En vacaciones',   borderColor: '#EF9F27', valueColor: '#854F0B' },
  { key: 'desvinculados', label: 'Desvinculados',   borderColor: '#E24B4A', valueColor: '#A32D2D' },
]
```

---

## AGREGAR AL SIDEBAR DEL PORTAL CLIENTE

```jsx
// En el sidebar del portal cliente, agregar Personal:
{ path: '/client/personal', icon: 'ti-id-badge-2', label: 'Personal' }

// Posición recomendada: después de Dashboard, antes de Activos
// Quedando así:
// Dashboard
// Personal      ← nuevo
// Activos
// Identidades
// Accesos
```

---

## ORDEN DE CONSTRUCCIÓN

```
1. Backend: GET /api/client/personal/stats
2. Backend: GET /api/client/personal (con filtros)
3. Backend: GET /api/client/personal/:id
4. Frontend: page.js con estructura base
5. Frontend: ClientePersonalStats.js
6. Frontend: ClientePersonalTabla.js con avatares
7. Frontend: ClientePersonalDetalle.js
8. Agregar Personal al sidebar del portal cliente
9. Probar: login como cliente → Personal → ver lista → clic en fila → ver detalle
10. Verificar que los datos del panel DSTAC aparecen en tiempo real
```

---

## NOTAS CRÍTICAS

1. Sin TypeScript — JavaScript puro
2. credentials: 'include' en todos los fetch
3. El slug de la empresa SIEMPRE del JWT — nunca del request
4. Sin botones de acción en ninguna parte
5. El correo en el detalle puede ser un mailto: link
6. Comentar el código

