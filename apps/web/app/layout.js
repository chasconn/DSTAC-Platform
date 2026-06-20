import './globals.css'
import SwRegister from './sw-register'

export const metadata = {
  title: 'DSTAC Platform',
  description: 'Plataforma de ciberseguridad DSTAC',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DSTAC',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport = {
  themeColor: '#534AB7',
  width: 'device-width',
  initialScale: 1,
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
      <body>
        <SwRegister />
        {children}
      </body>
    </html>
  )
}
