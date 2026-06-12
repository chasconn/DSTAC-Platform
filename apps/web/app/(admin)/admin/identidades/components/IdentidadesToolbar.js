'use client'

const TIPOS   = ['usuario', 'cuenta_servicio', 'api_key', 'certificado', 'grupo', 'otro']
const ESTADOS = ['activa', 'inactiva', 'comprometida', 'expirada', 'pendiente']

const TIPO_LABEL = {
  usuario: 'Usuario', cuenta_servicio: 'Cuenta de servicio',
  api_key: 'API Key', certificado: 'Certificado',
  grupo: 'Grupo', otro: 'Otro',
}
const ESTADO_LABEL = {
  activa: 'Activa', inactiva: 'Inactiva', comprometida: 'Comprometida',
  expirada: 'Expirada', pendiente: 'Pendiente',
}

export default function IdentidadesToolbar({
  filtros, onFiltroChange, total, empresaSlug, onNuevo, onImportar,
}) {
  function set(key, value) {
    onFiltroChange(prev => ({ ...prev, [key]: value }))
  }

  function toggleProblemas() {
    // "Solo con problemas" alterna entre filtrar comprometidas/expiradas y limpiar
    if (filtros._problemas) {
      onFiltroChange(prev => ({ ...prev, estado: '', _problemas: false }))
    } else {
      // El backend acepta un solo estado; usamos 'comprometida' como primer filtro
      // y la page.js hace dos requests si hace falta; por ahora filtramos comprometidas
      onFiltroChange(prev => ({ ...prev, estado: 'comprometida', _problemas: true }))
    }
  }

  async function handleExportar() {
    if (!empresaSlug) return
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([k, v]) => v && k !== '_problemas'))
      )
      params.set('format', 'excel')
      const res = await fetch(
        `/api/admin/identidades/export?${params}`,
        { credentials: 'include', headers: { 'X-Company-Slug': empresaSlug } }
      )
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `identidades_${empresaSlug}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* exportación se implementa en paso posterior */ }
  }

  const hayFiltros = Object.entries(filtros).some(([k, v]) => v && k !== '_problemas')

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
          placeholder="Buscar por nombre, valor u origen…"
          value={filtros.search}
          onChange={e => set('search', e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #e2e0d8', borderRadius: 7, fontSize: 13, color: '#2C2C2A', outline: 'none', background: '#fafaf8', boxSizing: 'border-box' }}
        />
      </div>

      <select value={filtros.tipo_identidad} onChange={e => set('tipo_identidad', e.target.value)} style={selectStyle(!!filtros.tipo_identidad)}>
        <option value="">Tipo</option>
        {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
      </select>

      <select value={filtros.estado} onChange={e => set('estado', e.target.value)} style={selectStyle(!!filtros.estado)}>
        <option value="">Estado</option>
        {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
      </select>

      {/* Filtro rápido: solo con problemas */}
      <button
        onClick={toggleProblemas}
        style={{
          padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
          border: `1px solid ${filtros._problemas ? '#E24B4A' : '#e2e0d8'}`,
          background: filtros._problemas ? '#FCEBEB' : '#fff',
          color: filtros._problemas ? '#791F1F' : '#888780',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        ⚠ Solo problemas
      </button>

      {hayFiltros && (
        <button
          onClick={() => onFiltroChange({ search: '', tipo_identidad: '', estado: '', _problemas: false })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888780', padding: '4px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}
        >
          Limpiar
        </button>
      )}

      <span style={{ fontSize: 12, color: '#888780', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
        {total} identidad{total !== 1 ? 'es' : ''}
      </span>

      <button onClick={handleExportar} style={btnSecundario}>
        <i className="ti ti-download" style={{ fontSize: 14 }} /> Exportar
      </button>

      <button onClick={onImportar} style={btnSecundario}>
        <i className="ti ti-file-upload" style={{ fontSize: 14 }} /> Importar Excel
      </button>

      <button onClick={onNuevo} style={btnPrimario}>
        <i className="ti ti-plus" style={{ fontSize: 14 }} /> Nueva identidad
      </button>
    </div>
  )
}

function selectStyle(activo) {
  return { padding: '7px 10px', border: `1px solid ${activo ? '#534AB7' : '#e2e0d8'}`, borderRadius: 7, fontSize: 13, color: activo ? '#3C3489' : '#2C2C2A', background: activo ? '#EEEDFE' : '#fafaf8', outline: 'none', cursor: 'pointer', fontWeight: activo ? 600 : 400 }
}
const btnPrimario   = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3C3489', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
const btnSecundario = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, border: '1px solid #e2e0d8', background: '#fff', color: '#2C2C2A', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }
