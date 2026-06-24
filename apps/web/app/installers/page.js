export const metadata = { title: 'Instaladores de agente EDR · DSTAC' }

const ARCHIVOS = [
  { nombre: 'install-agent.sh', label: 'Linux', detalle: 'Debian/Ubuntu, RHEL/CentOS, openSUSE — detecta la distro automáticamente.' },
  { nombre: 'install-agent-macos.sh', label: 'macOS', detalle: 'Apple Silicon (M1 en adelante) e Intel — detecta la arquitectura automáticamente.' },
  { nombre: 'install-agent-windows.ps1', label: 'Windows', detalle: 'Equipos de escritorio Windows 10/11.' },
  { nombre: 'install-agent-windows-server.ps1', label: 'Windows Server', detalle: 'Sin sesión gráfica — funciona en Server Core.' },
]

export default function InstallersPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', padding: '48px 24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#1c1c22' }}>DSTAC <span style={{ color: '#534AB7' }}>SECURITY</span></span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1c1c22', margin: '0 0 6px' }}>Instaladores de agente EDR</h1>
        <p style={{ fontSize: 13.5, color: '#8b8997', margin: '0 0 32px', lineHeight: 1.6 }}>
          Descarga el instalador correspondiente al sistema operativo del equipo. Necesitas la clave de
          enrolamiento que te entrega tu contacto en DSTAC — el comando completo para cada plataforma
          está disponible en el portal, módulo EDR.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ARCHIVOS.map(a => (
            <div key={a.nombre} style={{ background: '#fff', borderRadius: 12, border: '1px solid #ECEAE3', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c22' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: '#8b8997', marginTop: 2 }}>{a.detalle}</div>
                <div style={{ fontSize: 11.5, color: '#a8a6b0', marginTop: 4, fontFamily: 'monospace' }}>{a.nombre}</div>
              </div>
              <a href={`/installers/${a.nombre}`} download
                style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: '#534AB7', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                ↓ Descargar
              </a>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: '#a8a6b0', marginTop: 28, textAlign: 'center' }}>
          ¿Eres cliente de DSTAC? Pide a tu contacto el comando completo con tu clave de enrolamiento.
        </p>
      </div>
    </div>
  )
}
