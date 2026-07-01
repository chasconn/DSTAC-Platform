'use client'

import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

const NAVY = '#1a1740', PURPLE = '#534AB7'

const ESTADO = {
  pendiente:  { label: 'Pendiente',  bg: '#F1EFE8', color: '#444441' },
  enviada:    { label: 'Enviada',    bg: '#EEF2FF', color: '#3C3489' },
  aceptada:   { label: 'Aceptada',  bg: '#EAF3DE', color: '#1D6A35' },
  rechazada:  { label: 'Rechazada', bg: '#FCEBEB', color: '#A32D2D' },
  pagada:     { label: 'Pagada',    bg: '#E1F5EE', color: '#0F6E56' },
}

const FMT = (n) => '$' + (Number(n) || 0).toLocaleString('es-CL')

function fmtFecha(str) {
  if (!str) return '—'
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ClientCotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [abierta, setAbierta] = useState(null)

  useEffect(() => {
    api.get('/api/client/cotizaciones')
      .then(d => setCotizaciones(d.cotizaciones || []))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c22', margin: '0 0 4px' }}>Cotizaciones</h1>
      <p style={{ fontSize: 14, color: '#888780', margin: '0 0 28px' }}>
        Historial de propuestas comerciales de DSTAC Security para tu empresa.
      </p>

      {cargando ? (
        <p style={{ color: '#888780', fontSize: 14 }}>Cargando…</p>
      ) : cotizaciones.length === 0 ? (
        <div style={{ background: '#F8F7F4', border: '1px solid #ECEAE3', borderRadius: 10, padding: '32px 24px', textAlign: 'center', color: '#888780', fontSize: 14 }}>
          Aún no hay cotizaciones registradas para tu empresa.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cotizaciones.map(c => {
            const e = ESTADO[c.estado] || ESTADO.pendiente
            const open = abierta === c.id
            return (
              <div key={c.id} style={{ border: '1px solid #ECEAE3', borderRadius: 12, overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '12px 16px', cursor: c.estado === 'aceptada' ? 'pointer' : 'default', background: open ? '#FAFAF8' : '#fff' }}
                  onClick={() => c.estado === 'aceptada' && setAbierta(open ? null : c.id)}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1c1c22' }}>{c.numero}</span>
                    <span style={{ fontSize: 12, color: '#888780', marginLeft: 10 }}>{fmtFecha(c.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1c1c22' }}>{FMT(c.total)}</span>
                    <span style={{ background: e.bg, color: e.color, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>{e.label}</span>
                    {c.estado === 'aceptada' && (
                      <span style={{ fontSize: 12, color: PURPLE }}>
                        {open ? '▲ Ocultar pago' : '▼ Ver instrucciones de pago'}
                      </span>
                    )}
                  </div>
                </div>

                {open && c.estado === 'aceptada' && (
                  <div style={{ borderTop: '1px solid #ECEAE3', padding: '20px 16px' }}>
                    <p style={{ fontSize: 13, color: '#444441', margin: '0 0 16px', fontWeight: 500 }}>
                      Tu cotización fue aceptada. Para activar el servicio, realiza la transferencia con los siguientes datos:
                    </p>

                    <DatosBancarios total={c.total} numero={c.numero} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DatosBancarios({ total, numero }) {
  const rows = [
    { label: 'Banco',        value: 'Mercado Pago' },
    { label: 'RUT titular',  value: '18.501.573-4' },
    { label: 'Nombre',       value: 'Diego Andrés Chacón Barrionuevo' },
    { label: 'Tipo cuenta',  value: 'Cuenta Vista' },
    { label: 'N° de cuenta', value: '1046799925', mono: true },
    { label: 'Monto',        value: '$' + (Number(total) || 0).toLocaleString('es-CL') + ' (neto + IVA)', bold: true },
    { label: 'Glosa / referencia', value: numero, bold: true },
  ]
  return (
    <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, overflow: 'hidden', maxWidth: 480 }}>
      <div style={{ background: NAVY, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>DSTAC <span style={{ color: '#a98bff' }}>SECURITY</span></span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#a98bff', background: 'rgba(83,74,183,.35)', border: '1px solid #534AB7', borderRadius: 999, padding: '2px 9px' }}>Datos de pago</span>
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Transferencia electrónica</div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < rows.length - 1 ? '1px solid #F1EFE8' : 'none' }}>
            <span style={{ fontSize: 13, color: '#888780' }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: r.bold ? 700 : 500, color: r.bold ? PURPLE : '#1c1c22', fontFamily: r.mono ? 'monospace' : undefined, textAlign: 'right', maxWidth: '60%' }}>{r.value}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #ECEAE3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888780' }}>Enviar comprobante a</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: PURPLE }}>dchacon@dstac.cl</span>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: '#888780', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
          El servicio se activa una vez confirmada la transferencia.
        </p>
      </div>
    </div>
  )
}
