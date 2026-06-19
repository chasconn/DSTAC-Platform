'use client'

// Panel lateral de detalle de una cotización (solo lectura + acciones).
import { clp, ESTADO, TIPO_LINEA, totales } from './format'
import { previewCotizacion } from './quotePreview'

const fmt = (d) => { try { return new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d } }

export default function CotizacionDetalle({ cot, onClose, onEditar, onEliminar, onCambiarEstado }) {
  const items = cot.items || []
  const t = totales(items, { tipo: cot.descuento_tipo, valor: cot.descuento_valor })
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,20,.35)', zIndex: 80 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 96vw)', background: '#fff', zIndex: 81, boxShadow: '-8px 0 30px rgba(0,0,0,.18)', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#2C2C2A' }}>{cot.numero}</h2>
            <div style={{ fontSize: 13, color: '#888780', marginTop: 2 }}>{fmt(cot.fecha)} · validez {cot.validez_dias} días</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#888780', lineHeight: 1 }}>×</button>
        </div>

        {/* Estado */}
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#888780' }}>ESTADO</label>
          <select value={cot.estado} onChange={e => onCambiarEstado(cot.id, e.target.value)}
            style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 14, color: ESTADO[cot.estado]?.text }}>
            {Object.entries(ESTADO).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>

        {/* Cliente */}
        <div style={{ marginTop: 16, background: '#FAFAF8', border: '1px solid #f1efe8', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Cliente</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>{cot.cliente_empresa || cot.company_name || '—'}</div>
          {cot.cliente_rut && <div style={{ fontSize: 12.5, color: '#888780' }}>RUT: {cot.cliente_rut}</div>}
          {cot.cliente_contacto && <div style={{ fontSize: 12.5, color: '#888780' }}>{cot.cliente_contacto}</div>}
          {cot.cliente_email && <div style={{ fontSize: 12.5, color: '#888780' }}>{cot.cliente_email}</div>}
          {cot.cliente_telefono && <div style={{ fontSize: 12.5, color: '#888780' }}>{cot.cliente_telefono}</div>}
        </div>

        {/* Líneas */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Servicios</div>
          {items.map(it => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1efe8' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A' }}>{it.servicio} <span style={{ fontSize: 10.5, color: '#888780', fontWeight: 500 }}>· {TIPO_LINEA[it.tipo]}</span></div>
                {it.detalle && <div style={{ fontSize: 11.5, color: '#888780', marginTop: 1 }}>{it.detalle}</div>}
                <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 1 }}>{it.cantidad} × {clp(it.precio_unitario)}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', whiteSpace: 'nowrap' }}>{clp((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0))}</div>
            </div>
          ))}
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 'auto', width: 240 }}>
            {t.netoUnico > 0 && (
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 2 }}>Pago único</div>
                {t.descUnico > 0 && <Row l="Neto bruto" v={clp(t.netoUnicoBruto)} />}
                {t.descUnico > 0 && <Row l="Descuento" v={`− ${clp(t.descUnico)}`} />}
                <Row l="Neto" v={clp(t.netoUnico)} />
                <Row l="IVA (19%)" v={clp(t.ivaUnico)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #3C3489', marginTop: 4, paddingTop: 6, fontSize: 15, fontWeight: 700, color: '#3C3489' }}><span>Total</span><span>{clp(t.totalUnico)}</span></div>
              </div>
            )}
            {t.netoMensual > 0 && (
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#3C3489', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 2 }}>Mensual recurrente</div>
                {t.descMensual > 0 && <Row l="Neto bruto" v={clp(t.netoMensualBruto)} />}
                {t.descMensual > 0 && <Row l="Descuento" v={`− ${clp(t.descMensual)}`} />}
                <Row l="Neto" v={clp(t.netoMensual)} />
                <Row l="IVA (19%)" v={clp(t.ivaMensual)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #3C3489', marginTop: 4, paddingTop: 6, fontSize: 15, fontWeight: 700, color: '#3C3489' }}><span>Total / mes</span><span>{clp(t.totalMensual)}</span></div>
              </div>
            )}
          </div>
        </div>

        {(cot.forma_pago || cot.plazo_ejecucion || cot.notas) && (
          <div style={{ marginTop: 16, fontSize: 12.5, color: '#444441', lineHeight: 1.6 }}>
            {cot.forma_pago && <div><b style={{ color: '#888780' }}>Pago:</b> {cot.forma_pago}</div>}
            {cot.plazo_ejecucion && <div><b style={{ color: '#888780' }}>Plazo:</b> {cot.plazo_ejecucion}</div>}
            {cot.notas && <div><b style={{ color: '#888780' }}>Notas:</b> {cot.notas}</div>}
            {cot.descuento_motivo && <div><b style={{ color: '#888780' }}>Motivo del descuento:</b> {cot.descuento_motivo}</div>}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 22, paddingTop: 16, borderTop: '1px solid #f1efe8' }}>
          <button onClick={() => previewCotizacion(cot)} style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>📄 Ver / Guardar PDF</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onEditar(cot)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#3C3489', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>Editar</button>
            <button onClick={() => onEliminar(cot)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E8A6A6', background: '#fff', color: '#C0392B', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>Eliminar</button>
          </div>
        </div>
      </div>
    </>
  )
}
function Row({ l, v }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#444441' }}><span>{l}</span><span>{v}</span></div>
}
