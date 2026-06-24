export const metadata = {
  title: 'Instaladores de agente EDR · DSTAC',
  robots: { index: false, follow: false },
}

const ARCHIVOS = [
  {
    nombre: 'install-agent.sh',
    label: 'Linux',
    detalle: 'Debian/Ubuntu, RHEL/CentOS, openSUSE — detecta la distro automáticamente.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" />
        <path d="M8 13c-1.5 1-2.5 3-2.5 5.5C5.5 21 8 22 12 22s6.5-1 6.5-3.5c0-2.5-1-4.5-2.5-5.5" />
        <circle cx="10" cy="7" r=".6" fill="currentColor" />
        <circle cx="14" cy="7" r=".6" fill="currentColor" />
      </svg>
    ),
  },
  {
    nombre: 'install-agent-macos.sh',
    label: 'macOS',
    detalle: 'Apple Silicon (M1 en adelante) e Intel — detecta la arquitectura automáticamente.',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M16.7 12.4c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.3-.1-2.5.7-3.1.7-.6 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.7 2.3 1.1 0 1.4-.7 2.7-.7 1.3 0 1.5.7 2.7.7s2-.1 2.7-1.2c.6-.9 1-1.8 1.2-2.4-2-.8-2.5-2.6-2.5-4.1ZM14.4 5.9c.5-.6.9-1.5.8-2.4-.8 0-1.7.5-2.3 1.1-.5.6-.9 1.5-.8 2.3.9.1 1.8-.4 2.3-1Z" />
      </svg>
    ),
  },
  {
    nombre: 'install-agent-windows.ps1',
    label: 'Windows',
    detalle: 'Equipos de escritorio Windows 10/11.',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M3 5.5 10.5 4.4V11H3V5.5Zm0 13L10.5 19.6V12.7H3V18.5ZM11.4 4.3 21 3v8H11.4V4.3Zm0 8.4H21v8L11.4 19.7v-7Z" />
      </svg>
    ),
  },
  {
    nombre: 'install-agent-windows-server.ps1',
    label: 'Windows Server',
    detalle: 'Sin sesión gráfica — funciona en Server Core.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="6" rx="1.4" />
        <rect x="3" y="14" width="18" height="6" rx="1.4" />
        <circle cx="6.5" cy="7" r=".6" fill="currentColor" />
        <circle cx="6.5" cy="17" r=".6" fill="currentColor" />
      </svg>
    ),
  },
]

export default function InstallersPage() {
  return (
    <div className="ins-page">
      <style>{`
        .ins-page{
          min-height:100vh;
          background:
            radial-gradient(circle at 12% 8%, rgba(123,77,255,.16), transparent 42%),
            radial-gradient(circle at 88% 92%, rgba(123,77,255,.10), transparent 45%),
            #050508;
          padding:56px 24px 72px;
          font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;
          color:#fff;
        }
        .ins-wrap{ max-width:680px; margin:0 auto; }
        .ins-logo{ height:34px; width:auto; object-fit:contain; margin-bottom:36px; display:block; }
        .ins-eyebrow{
          display:inline-block; font-size:.72rem; letter-spacing:.18em; font-weight:700;
          color:#a98bff; background:#7b4dff1a; border:1px solid #7b4dff40;
          padding:.32rem .75rem; border-radius:999px; text-transform:uppercase; margin-bottom:14px;
        }
        .ins-h1{ font-size:1.7rem; font-weight:800; margin:0 0 10px; letter-spacing:-.01em; }
        .ins-sub{ font-size:.95rem; color:#9aa0ab; line-height:1.65; margin:0 0 36px; max-width:560px; }
        .ins-grid{ display:flex; flex-direction:column; gap:14px; }
        .ins-card{
          background:#0c0c16; border:1px solid #1f1f2a; border-radius:14px;
          padding:18px 20px; display:flex; align-items:center; gap:16px;
          transition:border-color .18s, transform .18s, box-shadow .18s;
        }
        .ins-card:hover{ border-color:#7b4dff66; transform:translateY(-2px); box-shadow:0 14px 36px -18px rgba(123,77,255,.5); }
        .ins-icon{
          flex-shrink:0; width:44px; height:44px; border-radius:11px;
          background:#7b4dff1a; border:1px solid #7b4dff33; color:#a98bff;
          display:flex; align-items:center; justify-content:center;
        }
        .ins-icon svg{ width:22px; height:22px; }
        .ins-body{ flex:1; min-width:0; }
        .ins-label{ font-size:.98rem; font-weight:700; color:#fff; margin:0; }
        .ins-detalle{ font-size:.82rem; color:#9aa0ab; margin:3px 0 0; line-height:1.45; }
        .ins-filename{ font-size:.74rem; color:#6e7280; margin-top:6px; font-family:'JetBrains Mono',monospace; }
        .ins-btn{
          flex-shrink:0; display:inline-flex; align-items:center; gap:6px;
          padding:.6rem 1.1rem; border-radius:999px; background:#7b4dff; color:#fff;
          font-size:.85rem; font-weight:700; text-decoration:none; white-space:nowrap;
          box-shadow:0 0 22px -8px rgba(123,77,255,.8); transition:background .18s, transform .18s;
        }
        .ins-btn:hover{ background:#8f62ff; transform:translateY(-1px); }
        .ins-foot{
          font-size:.8rem; color:#6e7280; text-align:center; margin-top:40px;
          border-top:1px solid #1f1f2a; padding-top:24px;
        }

        @media (max-width:600px){
          .ins-page{ padding:36px 16px 56px; }
          .ins-h1{ font-size:1.4rem; }
          .ins-sub{ font-size:.88rem; }
          .ins-card{ flex-wrap:wrap; padding:16px; }
          .ins-btn{ width:100%; justify-content:center; }
        }
        @media (min-width:601px) and (max-width:900px){
          .ins-wrap{ max-width:560px; }
        }
      `}</style>

      <div className="ins-wrap">
        <img src="/logo-dstac.png" alt="DSTAC" className="ins-logo" />

        <span className="ins-eyebrow">EDR · Wazuh</span>
        <h1 className="ins-h1">Instaladores de agente</h1>
        <p className="ins-sub">
          Descarga el instalador correspondiente al sistema operativo del equipo. Necesitas la clave de
          enrolamiento que te entrega tu contacto en DSTAC — el comando completo para cada plataforma
          está disponible en el portal, módulo EDR.
        </p>

        <div className="ins-grid">
          {ARCHIVOS.map(a => (
            <div key={a.nombre} className="ins-card">
              <div className="ins-icon">{a.icon}</div>
              <div className="ins-body">
                <p className="ins-label">{a.label}</p>
                <p className="ins-detalle">{a.detalle}</p>
                <div className="ins-filename">{a.nombre}</div>
              </div>
              <a href={`/installers/${a.nombre}`} download className="ins-btn">
                ↓ Descargar
              </a>
            </div>
          ))}
        </div>

        <p className="ins-foot">¿Eres cliente de DSTAC? Pide a tu contacto el comando completo con tu clave de enrolamiento.</p>
      </div>
    </div>
  )
}
