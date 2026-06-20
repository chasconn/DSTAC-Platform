import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verificarJWT } from '../../lib/authServer'
import ClientShell from '../../components/client/ClientShell'

const CLIENT_ROLES = ['cliente_admin', 'cliente_lectura']
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function ClientLayout({ children }) {
  const token = cookies().get('dstac_token')?.value
  if (!token) redirect('/login')

  const user = await verificarJWT(token)
  if (!user || !CLIENT_ROLES.includes(user.role)) redirect('/login?error=sin_permisos')

  // Obtener tema de la empresa (server-side para evitar flash sin estilo)
  let theme = { theme_color: '#3C3489', theme_light: '#EEEDFE', theme_mid: '#534AB7' }
  try {
    const r = await fetch(`${API_URL}/api/client/dashboard/theme`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (r.ok) theme = await r.json()
  } catch {}

  return (
    <ClientShell
      user={{ email: user.email, role: user.role, first_name: user.first_name || null }}
      theme={theme}
      suplantando={!!user.impersonado_por}
      empresaSlug={user.company_slug || null}
    >
      {children}
    </ClientShell>
  )
}
