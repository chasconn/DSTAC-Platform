// Este archivo es SOLO para server components y route handlers de Next.js.
// No importar en componentes cliente — usa Buffer (Node.js only).

export async function verificarJWT(token) {
  try {
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode base64url payload (Node.js Buffer disponible en server components)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    )

    // Token expirado
    if (payload.exp && payload.exp * 1000 < Date.now()) return null

    // Rechazar temp_tokens del flujo MFA (no son tokens de sesión)
    if (payload.type === 'mfa_temp') return null

    return payload
  } catch {
    return null
  }
}
