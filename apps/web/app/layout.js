import './globals.css'

export const metadata = {
  title: 'DSTAC Platform',
  description: 'Plataforma de ciberseguridad DSTAC'
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
        {/* Aplica el tema guardado ANTES del primer paint para evitar parpadeo claro→oscuro */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('dstac_theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');var z=localStorage.getItem('dstac_ui_zoom');if(z)document.documentElement.style.setProperty('--ui-zoom',z);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
