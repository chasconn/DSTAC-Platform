/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
  // Los instaladores de agente EDR deben descargarse, no mostrarse como
  // texto plano en el navegador al hacer clic en el link.
  async headers() {
    return [
      {
        source: '/installers/:file',
        headers: [
          { key: 'Content-Disposition', value: 'attachment' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
