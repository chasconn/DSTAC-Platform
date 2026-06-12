'use client'

const ESTADOS = ['activo', 'inactivo', 'vacaciones', 'desvinculado']
const NIVELES = ['alto', 'medio', 'bajo']

const ESTADO_LABELS = {
  activo: 'Activo', inactivo: 'Inactivo',
  vacaciones: 'Vacaciones', desvinculado: 'Desvinculado',
}
const NIVEL_LABELS = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }

export default function PersonalToolbar({
  filtros, onFiltroChange, total, empresaSlug, onNuevo, onImportar,
}) {
  function set(key, value) {
    onFiltroChange(prev => ({ ...prev, [key]: value }))
  }

  async function handleExportar() {
    if (!empresaSlug) return
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
      )
      params.set('format', 'excel')
      const res = await fetch(
        `/api/admin/personal/export?${params}`,
        { credentials: 'include', headers: { 'X-Company-Slug': empresaSlug } }
      )
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `personal_${empresaSlug}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silencioso — exportación se implementa en paso posterior
    }
  }

  const hayFiltros = Object.values(filtros).some(v => v)

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e0d8', borderRadius: 10,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>

      {/* Buscador */}
      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#B4B2A9', fontSize: 15, pointerEvents: 'none' }}>
          <i className="ti ti-search" />
        </span>
        <input
          type="text"
          placeholder="Buscar por nombre, correo o rol…"
          value={filtros.search}
          onChange={e => set('search', e.target.value)}
          style={{
            width: '100%', padding: '7px 10px 7px 32px',
            border: '1px solid #e2e0d8', borderRadius: 7,
            fontSize: 13, color: '#2C2C2A', outline: 'none',
            background: '#fafaf8', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filtro: Estado */}
      <select value={filtros.estado} onChange={e => set('estado', e.target.value)} style={selectStyle(!!filtros.estado)}>
        <option value="">Estado</option>
        {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
      </select>

      {/* Filtro: Nivel */}
      <select value={filtros.nivel_responsabilidad} onChange={e => set('nivel_responsabilidad', e.target.value)} style={selectStyle(!!filtros.nivel_responsabilidad)}>
        <option value="">Nivel</option>
        {NIVELES.map(n => <option key={n} value={n}>{NIVEL_LABELS[n]}</option>)}
      </select>

      {hayFiltros && (
        <button
          onClick={() => onFiltroChange({ search: '', estado: '', nivel_responsabilidad: '' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888780', padding: '4px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}
        >
          Limpiar
        </button>
      )}

      <span style={{ fontSize: 12, color: '#888780', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
        {total} persona{total !== 1 ? 's' : ''}
      </span>

      <button onClick={handleExportar} style={btnSecundario}>
        <i className="ti ti-download" style={{ fontSize: 14 }} />
        Exportar
      </button>

      <button onClick={onImportar} style={btnSecundario}>
        <i className="ti ti-file-upload" style={{ fontSize: 14 }} />
        Importar Excel
      </button>

      <button onClick={onNuevo} style={btnPrimario}>
        <i className="ti ti-plus" style={{ fontSize: 14 }} />
        Nueva persona
      </button>
    </div>
  )
}

function selectStyle(activo) {
  return {
    padding: '7px 10px', border: `1px solid ${activo ? '#534AB7' : '#e2e0d8'}`,
    borderRadius: 7, fontSize: 13, color: activo ? '#3C3489' : '#2C2C2A',
    background: activo ? '#EEEDFE' : '#fafaf8', outline: 'none',
    cursor: 'pointer', fontWeight: activo ? 600 : 400,
  }
}

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 7, border: 'none',
  background: '#3C3489', color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
}
const btnSecundario = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 7, border: '1px solid #e2e0d8',
  background: '#fff', color: '#2C2C2A', fontSize: 13,
  cursor: 'pointer', whiteSpace: 'nowrap',
}
