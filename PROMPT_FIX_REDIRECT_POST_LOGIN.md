# PROMPT FIX — Redirección correcta después del cambio de contraseña
# El usuario cambia la contraseña pero vuelve al login en vez de ir al dashboard.
# El problema está en POST /api/auth/change-password.

---

## PROBLEMA EXACTO

El flujo actual:
1. Usuario entra con credenciales → MFA → detecta must_change_password = 1
2. Redirige a /change-password → usuario crea nueva contraseña ✅
3. POST /api/auth/change-password guarda la nueva contraseña ✅
4. ❌ NO genera el JWT final ni setea la cookie de sesión
5. Frontend no tiene sesión → Next.js layout.js detecta que no hay cookie → redirige a /login

---

## CORRECCIÓN — En POST /api/auth/change-password

Después de guardar la nueva contraseña, generar el JWT completo
y setear la cookie HttpOnly, igual que hace verify-mfa:

```javascript
// apps/api/routes/auth.js — función changePassword

async function changePassword(req, res) {
  const { change_token, new_password } = req.body

  // 1. Verificar change_token
  let decoded
  try {
    decoded = jwt.verify(change_token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(401).json({ error: 'Token expirado o inválido. Vuelve a iniciar sesión.' })
  }

  if (decoded.action !== 'change_password') {
    return res.status(400).json({ error: 'Token inválido' })
  }

  // 2. Obtener usuario completo
  const [users] = await centralDB.execute(`
    SELECT u.*, c.slug AS company_slug, c.name AS company_name,
           p.name AS plan_name
    FROM users u
    LEFT JOIN companies c ON u.company_id = c.id
    LEFT JOIN plans p ON c.plan_id = p.id
    WHERE u.id = ?
  `, [decoded.user_id])

  if (!users.length) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }
  const user = users[0]

  // 3. Validar nueva contraseña
  const errores = validarPassword(new_password, user.email, user.company_name)
  if (errores.length) {
    return res.status(400).json({ error: 'contrasena_invalida', errores })
  }

  // 4. Verificar que no sea igual a la temporal
  const esTemporal = await bcrypt.compare(new_password, user.password_hash)
  if (esTemporal) {
    return res.status(400).json({
      error: 'contrasena_invalida',
      errores: ['La nueva contraseña no puede ser igual a la temporal']
    })
  }

  // 5. Guardar nueva contraseña y limpiar flags
  const newHash = await bcrypt.hash(new_password, 12)
  await centralDB.execute(`
    UPDATE users
    SET password_hash = ?,
        must_change_password = 0,
        temp_password_expires_at = NULL,
        updated_at = NOW()
    WHERE id = ?
  `, [newHash, user.id])

  // 6. Crear sesión en tabla sessions
  const sessionId = require('crypto').randomUUID()
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 horas

  await centralDB.execute(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, NOW())
  `, [sessionId, user.id, expiresAt])

  // 7. Generar JWT final completo — IGUAL que en verify-mfa
  const token = jwt.sign(
    {
      jti:          sessionId,
      user_id:      user.id,
      email:        user.email,
      role:         user.role,
      company_id:   user.company_id ?? null,
      company_slug: user.company_slug ?? null,
      plan:         user.plan_name ?? null,
      first_name:   user.first_name
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )

  // 8. Setear cookie HttpOnly — IGUAL que en verify-mfa
  res.cookie('dstac_token', token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === 'production',
    sameSite:  'strict',
    maxAge:    8 * 60 * 60 * 1000 // 8 horas
  })

  // 9. Responder con el rol para que el frontend redirija correctamente
  res.json({
    success:    true,
    role:       user.role,
    first_name: user.first_name
  })
}
```

---

## CORRECCIÓN — En el frontend change-password/page.js

Después de recibir la respuesta exitosa, redirigir según el rol:

```javascript
// En el handler del formulario de cambio de contraseña:

async function handleSubmit(e) {
  e.preventDefault()
  setLoading(true)
  setErrores([])

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // ← IMPORTANTE para recibir la cookie
      body: JSON.stringify({
        change_token: changeToken, // guardado en estado desde el login
        new_password: password
      })
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.errores) setErrores(data.errores)
      else setErrores([data.error ?? 'Error al cambiar contraseña'])
      return
    }

    // Redirigir según el rol — igual que en el login normal
    const DSTAC_ROLES = ['super_admin','admin_dstac','analista_dstac','consultor_dstac']

    if (DSTAC_ROLES.includes(data.role)) {
      window.location.href = '/admin/dashboard'
    } else {
      window.location.href = '/client/dashboard'
    }

  } catch (err) {
    setErrores(['Error de conexión. Intenta nuevamente.'])
  } finally {
    setLoading(false)
  }
}
```

---

## VERIFICAR EL FLUJO COMPLETO

```
1. DSTAC crea empresa nueva → BD operacional se crea sola
2. DSTAC crea usuario cliente ligado a esa empresa
3. Usuario recibe correo con contraseña temporal
4. Usuario entra al login → ingresa credenciales → MFA
5. Sistema detecta must_change_password = 1 → redirige a /change-password
6. Usuario crea nueva contraseña → clic "Establecer contraseña"
7. ✅ Sistema genera JWT + setea cookie + redirige a /client/dashboard
8. Cliente ve su dashboard con sus datos (si los hay)
9. Cerrar sesión → volver a entrar con nueva contraseña → va directo al dashboard
```

---

## ARCHIVOS A TOCAR

1. `apps/api/routes/auth.js` — función changePassword (agregar pasos 6-9)
2. `apps/web/app/(auth)/change-password/page.js` — redirigir según rol

Solo esos dos. Nada más.

