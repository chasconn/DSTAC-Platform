import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verificarJWT } from '../../lib/authServer'
import Sidebar from '../../components/admin/Sidebar'

const DSTAC_ROLES = ['super_admin', 'admin_dstac', 'analista_dstac', 'consultor_dstac']

export default async function AdminLayout({ children }) {
  const cookieStore = cookies()
  const token = cookieStore.get('dstac_token')?.value

  if (!token) redirect('/login')

  const user = await verificarJWT(token)

  if (!user || !DSTAC_ROLES.includes(user.role)) {
    redirect('/login?error=sin_permisos')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', background: '#f8f7f4' }}>
        {children}
      </main>
    </div>
  )
}
