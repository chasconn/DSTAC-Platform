// Next.js genera /manifest.webmanifest a partir de este archivo y agrega
// automáticamente el <link rel="manifest"> en el <head>.
export default function manifest() {
  return {
    name: 'DSTAC Platform',
    short_name: 'DSTAC',
    description: 'Plataforma de ciberseguridad DSTAC',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8f7f4',
    theme_color: '#534AB7',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
