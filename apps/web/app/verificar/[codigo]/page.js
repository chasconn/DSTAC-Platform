import { api } from '../../../lib/api'

export const metadata = { title: 'Verificar certificado · DSTAC' }
export const dynamic = 'force-dynamic'

const NIVEL_COLOR = { Alto: '#1F8A47', Medio: '#B98900', Bajo: '#C0392B' }

export default async function VerificarPage({ params }) {
  let data = null
  try { data = await api.get(`/api/public/verificar/${params.codigo}`) } catch { data = { valido: false } }

  let contrato = null
  if (!data?.valido) {
    try { contrato = await api.get(`/api/public/verificar-contrato/${params.codigo}`) } catch { contrato = null }
  }

  if (contrato?.valido) return <VerificarContrato data={contrato} />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 440, width: '100%', padding: '40px 36px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 12px 40px rgba(40,30,80,0.08)', textAlign: 'center' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#1c1c22' }}>DSTAC <span style={{ color: '#534AB7' }}>SECURITY</span></span>
        </div>

        {data?.valido ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF7EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26 }}>
              ✓
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c22', margin: '0 0 6px' }}>Certificado válido</h1>
            <p style={{ fontSize: 13, color: '#8b8997', margin: '0 0 24px' }}>{data.ley}</p>

            <div style={{ textAlign: 'left', background: '#faf9f6', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row label="Empresa" value={data.empresa} />
              <Row label="Nivel de cumplimiento" value={data.nivel} color={NIVEL_COLOR[data.nivel]} />
              <Row label="Puntaje" value={`${data.score} / 100`} />
              <Row label="Emitido el" value={new Date(data.emitido_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })} />
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26, color: '#C0392B' }}>
              ✕
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c22', margin: '0 0 6px' }}>Código no encontrado</h1>
            <p style={{ fontSize: 13, color: '#8b8997', margin: 0 }}>Este código de verificación no corresponde a ningún certificado emitido por DSTAC Security.</p>
          </>
        )}
      </div>
    </div>
  )
}

const ESTADO_CONTRATO_LABEL = {
  enviado: 'Enviado a firma', firmado_cliente: 'Firmado por el cliente',
  completado: 'Firmado por ambas partes', rechazado: 'Rechazado',
}

function VerificarContrato({ data }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 440, width: '100%', padding: '40px 36px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 12px 40px rgba(40,30,80,0.08)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#1c1c22' }}>DSTAC <span style={{ color: '#534AB7' }}>SECURITY</span></span>
        </div>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF7EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26 }}>✓</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c22', margin: '0 0 6px' }}>Contrato auténtico</h1>
        <p style={{ fontSize: 13, color: '#8b8997', margin: '0 0 24px' }}>{data.numero}</p>
        <div style={{ textAlign: 'left', background: '#faf9f6', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row label="Empresa" value={data.empresa} />
          <Row label="Estado" value={ESTADO_CONTRATO_LABEL[data.estado] || data.estado} />
          <Row label="Firmado por DSTAC" value={data.firmado_por_dstac ? `Sí · ${new Date(data.firmado_dstac_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}` : 'Aún no'} />
          <Row label="Firmado por el cliente" value={data.firmado_por_cliente ? `Sí · ${new Date(data.firmado_cliente_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}` : 'Aún no'} />
          {data.hash && <Row label="Hash del documento" value={data.hash} />}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#8b8997' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || '#1c1c22' }}>{value}</span>
    </div>
  )
}
