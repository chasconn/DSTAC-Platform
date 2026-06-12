'use client'

const NIVELES     = ['lectura', 'escritura', 'administrador', 'root', 'otro']
const ESTADOS     = ['activo', 'inactivo', 'suspendido', 'expirado', 'pendiente_revision']
const CRITICIDADES = ['critica', 'alta', 'media', 'baja']
const ENTORNOS    = ['produccion', 'desarrollo', 'testing', 'staging', 'otro']

const NIVEL_LABEL  = { lectura: 'Lectura', escritura: 'Escritura', administrador: 'Administrador', root: 'Root', otro: 'Otro' }
const ESTADO_LABEL = { activo: 'Activo', inactivo: 'Inactivo', suspendido: 'Suspendido', expirado: 'Expirado', pendiente_revision: 'Pendiente revisión' }
const CRIT_LABEL   = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }
const ENTORNO_LABEL = { produccion: 'Producción', desarrollo: 'Desarrollo', testing: 'Testing', staging: 'Staging', otro: 'Otro' }

export default function AccesosToolbar({ filtros, onFiltroChange, total, empresaSlug, onNuevo }) {
  function set(key, value) { onFiltroChange(prev => ({ ...prev, [key]: value })) }

  async function handleExportar() {
    if (!empresaSlug) return
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
      )
      const res = await fetch(
        `/api/admin/accesos/export?${params}`,
        { credentials: 'include', headers: { 'X-Company-Slug': empresaSlug } }
      )
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `accesos_${empresaSlug}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* exportación se implementa en paso posterior */ }
  }

  const hayFiltros = Object.values(filtros).some(v => v)

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e0d8', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#B4B2A9', fontSize: 15, pointerEvents: 'none' }}>
          <i className="ti ti-search" />
        </span>
        <input
          type="text"
          placeholder="Buscar por identidad, activo o propietario…"
          value={filtros.search}
          onChange={e => set('search', e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 13, color: '#2C2C2A', outline: 'none', background: '#fafaf8', boxSizing: 'border-box' }}
        />
      </div>

      <select value={filtros.nivel_acceso} onChange={e => set('nivel_acceso', e.target.value)} style={sel(!!filtros.nivel_acceso)}>
        <option value="">Nivel</option>
        {NIVELES.map(n => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
      </select>

      <select value={filtros.estado} onChange={e => set('estado', e.target.value)} style={sel(!!filtros.estado)}>
        <option value="">Estado</option>
        {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
      </select>

      <select value={filtros.criticidad} onChange={e => set('criticidad', e.target.value)} style={sel(!!filtros.criticidad)}>
        <option value="">Criticidad</option>
        {CRITICIDADES.map(c => <option key={c} value={c}>{CRIT_LABEL[c]}</option>)}
      </select>

      <select value={filtros.entorno} onChange={e => set('entorno', e.target.value)} style={sel(!!filtros.entorno)}>
        <option value="">Entorno</option>
        {ENTORNOS.map(e => <option key={e} value={e}>{ENTORNO_LABEL[e]}</option>)}
      </select>

      {hayFiltros && (
        <button onClick={() => onFiltroChange({ search: '', nivel_acceso: '', estado: '', criticidad: '', entorno: '' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888780', padding: '4px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>
          Limpiar
        </button>
      )}

      <span style={{ fontSize: 12, color: '#888780', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
        {total} acceso{total !== 1 ? 's' : ''}
      </span>

      <button onClick={handleExportar} style={btnSec}>
        <i className="ti ti-download" style={{ fontSize: 14 }} /> Exportar
      </button>
      <button onClick={onNuevo} style={btnPri}>
        <i className="ti ti-plus" style={{ fontSize: 14 }} /> Nuevo acceso
      </button>
    </div>
  )
}

const sel = (activo) => ({ padding: '7px 10px', border: `1px solid ${activo ? '#534AB7' : '#e2e0d8'}`, borderRadius: 7, fontSize: 13, color: activo ? '#3C3489' : '#2C2C2A', background: activo ? '#EEEDFE' : '#fafaf8', outline: 'none', cursor: 'pointer', fontWeight: activo ? 600 : 400 })
const btnPri = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3C3489', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
const btnSec = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#fff', color: '#2C2C2A', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }
