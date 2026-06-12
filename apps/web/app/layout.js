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
      </head>
      <body>{children}</body>
    </html>
  )
}
