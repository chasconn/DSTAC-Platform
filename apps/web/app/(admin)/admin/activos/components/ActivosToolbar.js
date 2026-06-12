'use client'

import { api } from '../../../../../lib/api'

const TIPOS       = ['Servidor', 'Base de datos', 'Red', 'Aplicación', 'Nube', 'Endpoint', 'Otro']
const CRITICIDADES = ['critica', 'alta', 'media', 'baja']
const ESTADOS     = ['operativo', 'degradado', 'fuera_de_servicio', 'en_mantencion']
const AMBIENTES   = ['produccion', 'desarrollo', 'testing', 'staging']

const CRITICIDAD_LABELS = {
  critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja'
}
const ESTADO_LABELS = {
  operativo: 'Operativo', degradado: 'Degradado',
  fuera_de_servicio: 'Fuera de servicio', en_mantencion: 'En mantención'
}
const AMBIENTE_LABELS = {
  produccion: 'Producción', desarrollo: 'Desarrollo',
  testing: 'Testing', staging: 'Staging'
}

export default function ActivosToolbar({
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
        `/api/admin/activos/export?${params}`,
        { credentials: 'include', headers: { 'X-Company-Slug': empresaSlug } }
      )
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `activos_${empresaSlug}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silencioso — el endpoint de exportación se construye en un paso posterior
    }
  }

  const hayFiltros = Object.values(filtros).some(v => v)

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e0d8',
      borderRadius: 10,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }}>

      {/* Buscador */}
      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: '#B4B2A9', fontSize: 15, pointerEvents: 'none',
        }}>
          <i className="ti ti-search" />
        </span>
        <input
          type="text"
          placeholder="Buscar por nombre o proveedor…"
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

      {/* Filtro: Tipo */}
      <select
        value={filtros.tipo}
        onChange={e => set('tipo', e.target.value)}
        style={selectStyle(!!filtros.tipo)}
      >
        <option value="">Tipo</option>
        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Filtro: Criticidad */}
      <select
        value={filtros.criticidad}
        onChange={e => set('criticidad', e.target.value)}
        style={selectStyle(!!filtros.criticidad)}
      >
        <option value="">Criticidad</option>
        {CRITICIDADES.map(c => (
          <option key={c} value={c}>{CRITICIDAD_LABELS[c]}</option>
        ))}
      </select>

      {/* Filtro: Estado */}
      <select
        value={filtros.estado}
        onChange={e => set('estado', e.target.value)}
        style={selectStyle(!!filtros.estado)}
      >
        <option value="">Estado</option>
        {ESTADOS.map(e => (
          <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
        ))}
      </select>

      {/* Filtro: Ambiente */}
      <select
        value={filtros.ambiente}
        onChange={e => set('ambiente', e.target.value)}
        style={selectStyle(!!filtros.ambiente)}
      >
        <option value="">Ambiente</option>
        {AMBIENTES.map(a => (
          <option key={a} value={a}>{AMBIENTE_LABELS[a]}</option>
        ))}
      </select>

      {/* Limpiar filtros — visible solo si hay alguno activo */}
      {hayFiltros && (
        <button
          onClick={() => onFiltroChange({ search: '', tipo: '', criticidad: '', estado: '', ambiente: '' })}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: '#888780', padding: '4px 6px',
            borderRadius: 6, whiteSpace: 'nowrap',
          }}
        >
          Limpiar
        </button>
      )}

      {/* Contador */}
      <span style={{
        fontSize: 12, color: '#888780', whiteSpace: 'nowrap', marginLeft: 'auto',
      }}>
        {total} activo{total !== 1 ? 's' : ''}
      </span>

      {/* Exportar */}
      <button onClick={handleExportar} style={btnSecundario}>
        <i className="ti ti-download" style={{ fontSize: 14 }} />
        Exportar
      </button>

      <button onClick={onImportar} style={btnSecundario}>
        <i className="ti ti-file-upload" style={{ fontSize: 14 }} />
        Importar Excel
      </button>

      {/* Nuevo activo */}
      <button onClick={onNuevo} style={btnPrimario}>
        <i className="ti ti-plus" style={{ fontSize: 14 }} />
        Nuevo activo
      </button>
    </div>
  )
}

function selectStyle(activo) {
  return {
    padding: '7px 10px',
    border: `1px solid ${activo ? '#534AB7' : '#e2e0d8'}`,
    borderRadius: 7,
    fontSize: 13,
    color: activo ? '#3C3489' : '#2C2C2A',
    background: activo ? '#EEEDFE' : '#fafaf8',
    outline: 'none',
    cursor: 'pointer',
    fontWeight: activo ? 600 : 400,
  }
}

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 7, border: 'none',
  background: '#3C3489', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const btnSecundario = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 7,
  border: '1px solid #e2e0d8', background: '#fff',
  color: '#2C2C2A', fontSize: 13, cursor: 'pointer',
  whiteSpace: 'nowrap',
}
