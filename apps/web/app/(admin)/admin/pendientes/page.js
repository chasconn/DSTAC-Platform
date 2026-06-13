import { redirect } from 'next/navigation'

// /admin/pendientes redirige a la primera subvista (Mis tareas).
// El contenido original del módulo vive ahora en ./mis-tareas/page.js.
export default function PendientesIndex() {
  redirect('/admin/pendientes/mis-tareas')
}
