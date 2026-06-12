# PROMPT FIX — Módulo Usuarios: conectar empresas y filtro por empresa
# Lee CLAUDE.md antes de empezar.
# El módulo de usuarios ya existe. Solo agregar estas dos cosas.

---

## CAMBIO 1 — Select de empresa en el modal carga clientes reales

En UsuarioModal.js, cuando el rol seleccionado es `cliente_admin`
o `cliente_lectura`, el select de empresa debe cargar las empresas
reales desde el backend.

### Endpoint que ya existe: GET /api/admin/empresas/selector
Este endpoint ya devuelve `{ internas, clientes }`.
Para el modal de usuarios usar solo `clientes` (is_internal = 0).

```jsx
// En UsuarioModal.js:
const [empresas, setEmpresas] = useState([])
const [loadingEmpresas, setLoadingEmpresas] = useState(false)

const CLIENT_ROLES = ['cliente_admin', 'cliente_lectura']

// Cargar empresas cuando el rol cambia a cliente
useEffect(() => {
  if (!CLIENT_ROLES.includes(formData.role)) {
    setEmpresas([])
    return
  }
  async function cargarEmpresas() {
    setLoadingEmpresas(true)
    try {
      const res = await fetch('/api/admin/empresas/selector', {
        credentials: 'include'
      })
      const data = await res.json()
      // Solo mostrar clientes, no DSTAC interno
      setEmpresas(data.clientes ?? [])
    } catch (err) {
      console.error('Error cargando empresas:', err)
    } finally {
      setLoadingEmpresas(false)
    }
  }
  cargarEmpresas()
}, [formData.role])

// En el JSX, el select de empresa:
{CLIENT_ROLES.includes(formData.role) && (
  <div className="form-group">
    <label>Empresa *</label>
    <select
      value={formData.company_id}
      onChange={e => setFormData(f => ({...f, company_id: e.target.value}))}
      required
      disabled={loadingEmpresas}
    >
      <option value="">
        {loadingEmpresas ? 'Cargando empresas...' : 'Seleccionar empresa'}
      </option>
      {empresas.map(empresa => (
        <option key={empresa.id} value={empresa.id}>
          {empresa.name} — Plan {empresa.plan_name}
        </option>
      ))}
    </select>
    {empresas.length === 0 && !loadingEmpresas && (
      <div className="form-hint">
        No hay empresas activas. Crea una empresa primero.
      </div>
    )}
  </div>
)}

// Si el rol NO es cliente → limpiar company_id
useEffect(() => {
  if (!CLIENT_ROLES.includes(formData.role)) {
    setFormData(f => ({...f, company_id: ''}))
  }
}, [formData.role])
```

---

## CAMBIO 2 — Filtro por empresa en la toolbar de usuarios

En UsuariosToolbar.js (o en page.js si el filtro está ahí),
agregar un select de empresa que filtre la tabla.

```jsx
// Cargar empresas al montar la toolbar
const [empresas, setEmpresas] = useState([])

useEffect(() => {
  async function cargar() {
    try {
      const res = await fetch('/api/admin/empresas/selector', {
        credentials: 'include'
      })
      const data = await res.json()
      // Incluir DSTAC interno + todos los clientes para el filtro
      setEmpresas([
        ...(data.internas ?? []),
        ...(data.clientes ?? [])
      ])
    } catch (err) {
      console.error('Error cargando empresas para filtro:', err)
    }
  }
  cargar()
}, [])

// En el JSX de la toolbar, agregar el select de empresa
// junto a los filtros existentes de Rol y Estado:
<select
  value={filtros.company_id}
  onChange={e => onFiltroChange({...filtros, company_id: e.target.value})}
>
  <option value="">Todas las empresas</option>
  <option value="dstac">Equipo DSTAC</option>  {/* company_id IS NULL */}
  {empresas
    .filter(e => !e.is_internal)  // separar clientes
    .map(empresa => (
      <option key={empresa.id} value={empresa.id}>
        {empresa.name}
      </option>
    ))
  }
</select>
```

### Actualizar el endpoint GET /api/admin/usuarios para el filtro "Equipo DSTAC"

```javascript
// En apps/api/routes/admin/usuarios.js
// El filtro company_id puede recibir el valor especial "dstac"
// que significa "usuarios sin empresa" (equipo DSTAC)

let companyFilter = ''
if (company_id === 'dstac') {
  companyFilter = 'AND u.company_id IS NULL'
} else if (company_id) {
  companyFilter = 'AND u.company_id = ?'
  params.push(company_id)
}
```

---

## VERIFICAR QUE FUNCIONA

1. Abrir modal "Nuevo usuario"
2. Seleccionar rol "cliente_admin" → aparece select de empresa con lista real
3. Seleccionar rol "analista_dstac" → el select de empresa desaparece
4. Volver a "cliente_admin" → el select vuelve a aparecer con las empresas
5. En la tabla de usuarios, usar el filtro "Empresa" → filtra correctamente
6. Seleccionar "Equipo DSTAC" en el filtro → muestra solo usuarios DSTAC

---

## ARCHIVOS A TOCAR

- UsuarioModal.js (agregar carga de empresas)
- UsuariosToolbar.js o page.js (agregar filtro por empresa)
- apps/api/routes/admin/usuarios.js (manejar filtro "dstac")

Solo esos tres. Nada más.

