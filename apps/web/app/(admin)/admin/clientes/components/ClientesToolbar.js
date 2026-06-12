'use client'

// Barra de herramientas: búsqueda + filtros + toggle vista + botón crear
export default function ClientesToolbar({ search, onSearch, planFilter, onPlanFilter, statusFilter, onStatusFilter, view, onViewChange, onNueva, total, filtered }) {

  const PLANES   = ['pyme', 'profesional', 'enterprise']
  const ESTADOS  = ['active', 'setup', 'suspended']
  const LABEL_PLAN   = { pyme: 'PYME', profesional: 'Profesional', enterprise: 'Enterprise' }
  const LABEL_STATUS = { active: 'Activo', setup: 'Setup', suspended: 'Suspendido' }

  return (
    <div>
      {/* Fila principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

        {/* Buscador */}
        <div style={{ position: 'relative', flex: '1', maxWidth: 260 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            style={{
              width: '100%', height: 34, paddingLeft: 30, paddingRight: 10,
              border: '1px solid #e2e0d8', borderRadius: 8,
              fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filtro Plan */}
        <FilterPill
          label="Plan"
          value={planFilter}
          options={PLANES}
          labels={LABEL_PLAN}
          onChange={onPlanFilter}
        />

        {/* Filtro Estado */}
        <FilterPill
          label="Estado"
          value={statusFilter}
          options={ESTADOS}
          labels={LABEL_STATUS}
          onChange={onStatusFilter}
        />

        {/* Toggle vista */}
        <div style={{ display: 'flex', border: '1px solid #e2e0d8', borderRadius: 8, overflow: 'hidden', marginLeft: 'auto' }}>
          <button
            onClick={() => onViewChange('list')}
            style={{ padding: '6px 9px', background: view === 'list' ? '#EEEDFE' : '#fff', border: 'none', cursor: 'pointer', borderRight: '1px solid #e2e0d8' }}
            title="Vista lista"
          >
            <IconList color={view === 'list' ? '#3C3489' : '#888780'} />
          </button>
          <button
            onClick={() => onViewChange('cards')}
            style={{ padding: '6px 9px', background: view === 'cards' ? '#EEEDFE' : '#fff', border: 'none', cursor: 'pointer' }}
            title="Vista tarjetas"
          >
            <IconGrid color={view === 'cards' ? '#3C3489' : '#888780'} />
          </button>
        </div>

        {/* Botón nueva empresa */}
        <button
          onClick={onNueva}
          style={{
            height: 34, padding: '0 14px', background: '#534AB7', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Nueva empresa
        </button>
      </div>

      {/* Contador */}
      <div style={{ marginTop: 8, fontSize: 12, color: '#888780' }}>
        {filtered} de {total} empresa{total !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// Pill de filtro con dropdown
function FilterPill({ label, value, options, labels, onChange }) {
  const active = !!value
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
        style={{
          height: 34, padding: '0 28px 0 10px',
          border: `1px solid ${active ? '#534AB7' : '#e2e0d8'}`,
          borderRadius: 8, fontSize: 13, cursor: 'pointer', outline: 'none',
          background: active ? '#EEEDFE' : '#fff',
          color: active ? '#3C3489' : '#2C2C2A',
          appearance: 'none', WebkitAppearance: 'none',
        }}
      >
        <option value="">{label}</option>
        {options.map(o => (
          <option key={o} value={o}>{labels[o]}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <IconChevron color={active ? '#534AB7' : '#888780'} />
      </span>
    </div>
  )
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IconList({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}
function IconGrid({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
}
function IconChevron({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
