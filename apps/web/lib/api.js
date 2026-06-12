// Browser: relative paths go through Next.js rewrites → cookie set for same origin
// Server:  absolute URL needed for direct Node-to-Node calls
const BASE_URL = typeof window === 'undefined'
  ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
  : ''

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include', // envía la cookie HttpOnly dstac_token automáticamente
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  let data
  try {
    data = await res.json()
  } catch {
    throw { status: res.status || 0, message: 'No se pudo conectar con el servidor' }
  }

  if (!res.ok) {
    // Propagar todos los campos del body para que los modales puedan leer error, count, etc.
    throw { status: res.status, message: data.error || 'Error desconocido', ...data }
  }

  return data
}

export const api = {
  get:    (path, headers = {})       => apiFetch(path, { method: 'GET', headers }),
  post:   (path, body, headers = {}) => apiFetch(path, { method: 'POST',  body: JSON.stringify(body), headers }),
  put:    (path, body, headers = {}) => apiFetch(path, { method: 'PUT',   body: JSON.stringify(body), headers }),
  patch:  (path, body, headers = {}) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body), headers }),
  delete: (path, headers = {})       => apiFetch(path, { method: 'DELETE', headers })
}
