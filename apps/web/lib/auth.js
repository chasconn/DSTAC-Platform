import { DSTAC_ROLES, CLIENT_ROLES } from './roles'

const DISPLAY_KEY = 'dstac_user'
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Guarda datos mínimos de display después del login (NO el token — ese va en cookie HttpOnly)
export function saveUserDisplay({ email, role, first_name }) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISPLAY_KEY, JSON.stringify({ email, role, first_name }))
}

// Lee los datos de display para la UI (email, rol en sidebar, etc.)
export function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DISPLAY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Cierra sesión: invalida la cookie HttpOnly en el servidor y limpia localStorage
export async function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DISPLAY_KEY)
  }
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include' // envía la cookie HttpOnly al backend
    })
  } catch {
    // Si el servidor no responde, la cookie expirará sola
  }
}

export function isDSTACUser(user) {
  return user && DSTAC_ROLES.includes(user.role)
}

export function isClientUser(user) {
  return user && CLIENT_ROLES.includes(user.role)
}

export function getRedirectPath(role) {
  if (DSTAC_ROLES.includes(role)) return '/admin/dashboard'
  if (CLIENT_ROLES.includes(role)) return '/client/dashboard'
  return '/login'
}
