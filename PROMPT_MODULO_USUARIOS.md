# PROMPT — Módulo de Usuarios (Panel Interno DSTAC)
# Lee CLAUDE.md antes de empezar.
# Este módulo gestiona TODOS los usuarios: clientes y equipo DSTAC.
# Incluye flujo completo: crear usuario → contraseña temporal → primer login → cambio obligatorio.

---

## CONTEXTO

Los usuarios viven en la tabla `users` de `db_dstac_core`.
Los usuarios cliente tienen `company_id` → pertenecen a una empresa.
Los usuarios DSTAC tienen `company_id = NULL`.
Al crear un usuario, el sistema genera contraseña temporal, la envía por correo
y marca al usuario para que cambie la contraseña en el primer login.

---

## CAMBIOS EN LA TABLA users

```sql
-- Ejecutar en db_dstac_core
ALTER TABLE users
  ADD COLUMN must_change_password TINYINT(1) DEFAULT 0 AFTER password_hash,
  ADD COLUMN temp_password_expires_at TIMESTAMP NULL AFTER must_change_password,
  ADD COLUMN status ENUM('active','inactive','suspended') DEFAULT 'active' AFTER temp_password_expires_at,
  ADD COLUMN first_name VARCHAR(100) AFTER status,
  ADD COLUMN last_name  VARCHAR(100) AFTER first_name;
```

---

## ARCHIVOS A CREAR

```
apps/
├── web/
│   └── app/
│       └── (admin)/
│           └── usuarios/
│               ├── page.js
│               └── components/
│                   ├── UsuariosTabla.js
│                   ├── UsuarioDetalle.js
│                   ├── UsuarioModal.js       ← crear y editar
│                   └── UsuarioDeleteModal.js
└── api/
    └── routes/
        └── admin/
            └── usuarios.js
```

---

## POLÍTICA DE CONTRASEÑA

### Contraseña temporal (generada por el sistema)
```javascript
const crypto = require('crypto')

function generarPasswordTemporal() {
  const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'  // sin I y O (confunden)
  const minusculas = 'abcdefghjkmnpqrstuvwxyz'    // sin i, l, o
  const numeros    = '23456789'                    // sin 0 y 1
  const simbolos   = '!@#$%&*'

  const todos = mayusculas + minusculas + numeros + simbolos

  // Garantizar al menos uno de cada tipo
  let password = [
    mayusculas[crypto.randomInt(mayusculas.length)],
    minusculas[crypto.randomInt(minusculas.length)],
    numeros[crypto.randomInt(numeros.length)],
    simbolos[crypto.randomInt(simbolos.length)],
  ]

  // Rellenar hasta 12 caracteres
  for (let i = 4; i < 12; i++) {
    password.push(todos[crypto.randomInt(todos.length)])
  }

  // Mezclar aleatoriamente
  return password.sort(() => crypto.randomInt(3) - 1).join('')
}
// Ejemplo resultado: "Kx7#mP2$nQ4!"
```

### Validación de contraseña nueva (primer login y cambios futuros)
```javascript
function validarPassword(password, email, companyName) {
  const errores = []

  if (password.length < 8)
    errores.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(password))
    errores.push('Al menos una mayúscula')
  if (!/[0-9]/.test(password))
    errores.push('Al menos un número')
  if (!/[!@#$%^&*]/.test(password))
    errores.push('Al menos un símbolo (!@#$%^&*)')
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase()))
    errores.push('No puede contener tu nombre de usuario')
  if (companyName && password.toLowerCase().includes(companyName.toLowerCase().slice(0, 4)))
    errores.push('No puede contener el nombre de la empresa')

  return errores
}
```

---

## BACKEND — apps/api/routes/admin/usuarios.js

Rutas requieren: `requireAuth` + `requireDstacRole`

```javascript
GET    /api/admin/usuarios          → listar todos los usuarios
GET    /api/admin/usuarios/stats    → stats del módulo
GET    /api/admin/usuarios/:id      → detalle
POST   /api/admin/usuarios          → crear usuario + enviar email
PUT    /api/admin/usuarios/:id      → editar (nombre, rol, estado)
DELETE /api/admin/usuarios/:id      → eliminar
POST   /api/admin/usuarios/:id/reset-password → regenerar contraseña temporal
```

### GET /api/admin/usuarios — con filtros

```javascript
// Query params: search, role, company_id, status
// search busca en email, first_name, last_name

const sql = `
  SELECT
    u.id, u.email, u.username, u.role, u.status,
    u.first_name, u.last_name,
    u.must_change_password,
    u.temp_password_expires_at,
    u.created_at, u.updated_at,
    c.name AS company_name,
    c.slug AS company_slug
  FROM users u
  LEFT JOIN companies c ON u.company_id = c.id
  WHERE 1=1
  ${search     ? 'AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)' : ''}
  ${role       ? 'AND u.role = ?' : ''}
  ${company_id ? 'AND u.company_id = ?' : ''}
  ${status     ? 'AND u.status = ?' : ''}
  ORDER BY
    FIELD(u.role,'super_admin','admin_dstac','analista_dstac','consultor_dstac',
                 'cliente_admin','cliente_lectura'),
    c.name ASC, u.first_name ASC
  LIMIT ? OFFSET ?
`
```

### GET /api/admin/usuarios/stats

```javascript
{
  total:          N,
  clientes:       N,  // role IN ('cliente_admin','cliente_lectura')
  equipo_dstac:   N,  // company_id IS NULL
  pendientes:     N,  // must_change_password = 1
  suspendidos:    N,  // status = 'suspended'
}
```

### POST /api/admin/usuarios — crear usuario

```javascript
async function crearUsuario(req, res) {
  const {
    email, first_name, last_name,
    role, company_id,   // company_id = null si es usuario DSTAC
    username            // opcional
  } = req.body

  // Validar campos requeridos
  if (!email || !first_name || !role) {
    return res.status(400).json({ error: 'Email, nombre y rol son requeridos' })
  }

  // Verificar que el email no existe
  const [existe] = await centralDB.execute(
    'SELECT id FROM users WHERE email = ?', [email]
  )
  if (existe.length) {
    return res.status(409).json({ error: 'El email ya está registrado' })
  }

  // Si es usuario cliente, verificar que la empresa existe
  if (company_id) {
    const [empresa] = await centralDB.execute(
      'SELECT id, name FROM companies WHERE id = ? AND status = "active"', [company_id]
    )
    if (!empresa.length) {
      return res.status(404).json({ error: 'Empresa no encontrada o inactiva' })
    }
  }

  // Generar contraseña temporal
  const tempPassword = generarPasswordTemporal()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  // La contraseña temporal expira en 48 horas
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  // Insertar usuario
  const [result] = await centralDB.execute(`
    INSERT INTO users
    (company_id, email, username, password_hash, role,
     first_name, last_name, status,
     must_change_password, temp_password_expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1, ?)
  `, [
    company_id ?? null,
    email,
    username ?? null,
    passwordHash,
    role,
    first_name,
    last_name ?? null,
    expiresAt
  ])

  // Enviar email con credenciales
  await enviarEmailBienvenida({
    to:            email,
    first_name,
    tempPassword,
    role,
    loginUrl:      process.env.APP_URL + '/login',
    expiresHoras:  48
  })

  res.status(201).json({
    id:      result.insertId,
    message: 'Usuario creado. Credenciales enviadas por correo.'
  })
}
```

### POST /api/admin/usuarios/:id/reset-password

```javascript
// Regenera una nueva contraseña temporal y la envía por correo
// Útil cuando el cliente dice que no le llegó el correo o la contraseña expiró

async function resetPassword(req, res) {
  const tempPassword = generarPasswordTemporal()
  const passwordHash = await bcrypt.hash(tempPassword, 12)
  const expiresAt    = new Date(Date.now() + 48 * 60 * 60 * 1000)

  await centralDB.execute(`
    UPDATE users
    SET password_hash = ?,
        must_change_password = 1,
        temp_password_expires_at = ?
    WHERE id = ?
  `, [passwordHash, expiresAt, req.params.id])

  // Re-enviar email
  const [user] = await centralDB.execute(
    'SELECT email, first_name FROM users WHERE id = ?', [req.params.id]
  )
  await enviarEmailBienvenida({
    to: user[0].email, first_name: user[0].first_name,
    tempPassword, loginUrl: process.env.APP_URL + '/login', expiresHoras: 48
  })

  res.json({ message: 'Nueva contraseña enviada por correo.' })
}
```

### Función enviarEmailBienvenida

```javascript
// apps/api/utils/email.js
const nodemailer = require('nodemailer')

async function enviarEmailBienvenida({ to, first_name, tempPassword, loginUrl, expiresHoras }) {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  await transporter.sendMail({
    from:    `"DSTAC Platform" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Bienvenido a DSTAC Platform — Tus credenciales de acceso',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#26215C">Bienvenido a DSTAC Platform</h2>
        <p>Hola ${first_name},</p>
        <p>Tu cuenta ha sido creada. Estas son tus credenciales de acceso:</p>
        <div style="background:#f8f7f4;border-radius:8px;padding:16px;margin:16px 0">
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Contraseña temporal:</strong>
            <code style="background:#EEEDFE;padding:4px 8px;border-radius:4px;
                         font-size:16px;color:#26215C">${tempPassword}</code>
          </p>
        </div>
        <p style="color:#E24B4A">
          ⚠️ Esta contraseña expira en ${expiresHoras} horas.
          Al ingresar por primera vez, deberás crear una nueva contraseña.
        </p>
        <a href="${loginUrl}"
           style="display:inline-block;background:#534AB7;color:#fff;
                  padding:10px 24px;border-radius:8px;text-decoration:none;
                  font-weight:500;margin-top:8px">
          Ingresar a la plataforma →
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888780">
          Si no esperabas este correo, ignóralo.
          DSTAC nunca te pedirá tu contraseña por email.
        </p>
      </div>
    `
  })
}
```

---

## FLUJO DE PRIMER LOGIN — Cambio obligatorio de contraseña

### En el login existente (apps/api/routes/auth.js)

```javascript
// En POST /api/auth/verify-mfa, después de validar el MFA:
// Si must_change_password = 1, NO generar el JWT final todavía
// En cambio, generar un token especial de "cambio de contraseña"

if (user.must_change_password) {
  // Verificar que la contraseña temporal no haya expirado
  if (user.temp_password_expires_at < new Date()) {
    return res.status(401).json({
      error: 'contrasena_expirada',
      message: 'Tu contraseña temporal ha expirado. Contacta a tu administrador.'
    })
  }

  // Token temporal solo para cambiar contraseña (expira en 15 minutos)
  const changeToken = jwt.sign(
    { user_id: user.id, action: 'change_password' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )

  return res.json({
    requires_password_change: true,
    change_token: changeToken
  })
}
// Si no requiere cambio → flujo normal, generar JWT completo
```

### Nuevo endpoint: POST /api/auth/change-password

```javascript
// Recibe: { change_token, new_password }
// Valida el change_token
// Valida la nueva contraseña con validarPassword()
// Si es válida: hashear, guardar, marcar must_change_password = 0
// Generar JWT final y setear cookie
// Redirigir al dashboard correspondiente según el rol

async function changePassword(req, res) {
  const { change_token, new_password } = req.body

  // Verificar token
  const decoded = jwt.verify(change_token, process.env.JWT_SECRET)
  if (decoded.action !== 'change_password') {
    return res.status(400).json({ error: 'Token inválido' })
  }

  // Obtener usuario
  const [users] = await centralDB.execute(
    'SELECT * FROM users WHERE id = ?', [decoded.user_id]
  )
  const user = users[0]

  // Validar nueva contraseña
  const [company] = user.company_id
    ? await centralDB.execute('SELECT name FROM companies WHERE id = ?', [user.company_id])
    : [[{ name: 'DSTAC' }]]

  const errores = validarPassword(new_password, user.email, company[0]?.name)
  if (errores.length) {
    return res.status(400).json({ error: 'contrasena_invalida', errores })
  }

  // Verificar que no sea igual a la temporal
  const esTemporal = await bcrypt.compare(new_password, user.password_hash)
  if (esTemporal) {
    return res.status(400).json({
      error: 'contrasena_invalida',
      errores: ['La nueva contraseña no puede ser igual a la temporal']
    })
  }

  // Guardar nueva contraseña
  const newHash = await bcrypt.hash(new_password, 12)
  await centralDB.execute(`
    UPDATE users
    SET password_hash = ?,
        must_change_password = 0,
        temp_password_expires_at = NULL
    WHERE id = ?
  `, [newHash, user.id])

  // Generar JWT final y setear cookie (igual que en verify-mfa)
  // ... misma lógica del login normal ...

  res.json({ success: true, message: 'Contraseña actualizada. Bienvenido.' })
}
```

---

## FRONTEND — Pantalla de cambio de contraseña

### apps/web/app/(auth)/change-password/page.js

```jsx
// Se muestra automáticamente si el login devuelve requires_password_change: true
// Diseño igual al login: panel izquierdo morado + panel derecho blanco

// Formulario:
// Nueva contraseña (input password con ojo para mostrar/ocultar)
// Confirmar contraseña
// Indicador visual de fortaleza en tiempo real:
//   ✓ Mínimo 8 caracteres
//   ✓ Al menos una mayúscula
//   ✓ Al menos un número
//   ✓ Al menos un símbolo

// Si las contraseñas no coinciden → error inline
// Botón "Establecer contraseña" → llama a POST /api/auth/change-password
// Al éxito → redirige al dashboard según el rol
```

---

## FRONTEND — Módulo de Usuarios (panel DSTAC)

### page.js

```jsx
// Título: "Usuarios" + subtítulo "Gestión de accesos a la plataforma"
// Sin chip de empresa — este módulo ve TODOS los usuarios de TODAS las empresas

// Filtros: Buscar | Rol | Empresa | Estado
// Tabla + panel de detalle lateral
// Botón "Nuevo usuario" abre UsuarioModal
```

### UsuariosStats.js — 5 cards

```jsx
const STATS_CONFIG = [
  { key: 'total',        label: 'Total usuarios',   borderColor: '#534AB7' },
  { key: 'clientes',     label: 'Usuarios cliente', borderColor: '#1D9E75' },
  { key: 'equipo_dstac', label: 'Equipo DSTAC',     borderColor: '#3C3489' },
  { key: 'pendientes',   label: 'Pendientes acceso',borderColor: '#EF9F27' },
  { key: 'suspendidos',  label: 'Suspendidos',      borderColor: '#E24B4A' },
]
```

### UsuariosTabla.js

```jsx
// Columnas: Usuario | Empresa | Rol | Estado | Pendiente | Creado | Acciones
// Grid: 2fr 1.5fr 1fr 1fr 1fr 1fr 80px

// Badges de rol:
// super_admin:      bg #FCEBEB  color #791F1F
// admin_dstac:      bg #FAEEDA  color #633806
// analista_dstac:   bg #EEEDFE  color #3C3489
// consultor_dstac:  bg #F1EFE8  color #444441
// cliente_admin:    bg #EAF3DE  color #27500A
// cliente_lectura:  bg #E6F1FB  color #0C447C

// Columna "Pendiente":
// Si must_change_password = 1: badge naranja "Debe cambiar contraseña"
// Si temp_password_expires_at < NOW(): badge rojo "Contraseña expirada"
// Si normal: vacío

// Acciones: Ver | Editar | Reset contraseña | Eliminar
```

### UsuarioModal.js — Crear y editar

```jsx
// CAMPOS:
// Nombre *          | Apellido
// Email *           | Username (opcional)
// Rol *             | Empresa (solo si es cliente)
//   select: todos los roles disponibles
//   Si rol es cliente_admin o cliente_lectura → mostrar select de empresa
//   Si rol es DSTAC → ocultar select de empresa

// Nota al fondo:
// "Se generará una contraseña temporal y se enviará al correo del usuario.
//  El usuario deberá cambiarla en su primer ingreso. Expira en 48 horas."
```

### UsuarioDetalle.js — Panel lateral 280px

```jsx
// Secciones:
// 1. Avatar iniciales + nombre + badge rol
// 2. "Acceso":
//    email, username (si tiene)
//    Estado: active/inactive/suspended
//    Empresa: nombre (si es cliente)
// 3. "Estado de contraseña":
//    Si must_change_password = 1: "Pendiente de cambio desde creación"
//    Si temp expirada: "⚠ Contraseña temporal expirada"
//    Si normal: "✓ Contraseña establecida"
// 4. "Auditoría": created_at, updated_at

// Footer:
// "Editar usuario" (primario)
// "Reenviar credenciales" (ghost) → reset-password
// "Suspender" o "Activar" según estado actual
// "Eliminar" (rojo)
```

---

## AGREGAR AL SIDEBAR del panel DSTAC

```jsx
// En la sección "Panel DSTAC":
{ path: '/admin/usuarios', icon: 'ti-user-cog', label: 'Usuarios' }
```

---

## VARIABLES DE ENTORNO REQUERIDAS

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=no-reply@dstac.cl
SMTP_PASS=tu_app_password
APP_URL=https://app.dstac.cl
```

---

## ORDEN DE CONSTRUCCIÓN

```
1. Ejecutar ALTER TABLE users en db_dstac_core
2. Crear apps/api/utils/email.js con enviarEmailBienvenida
3. Backend: POST /api/admin/usuarios (crear + enviar email)
4. Backend: GET /api/admin/usuarios (con filtros y JOINs)
5. Backend: GET /api/admin/usuarios/stats
6. Backend: PUT /api/admin/usuarios/:id
7. Backend: POST /api/admin/usuarios/:id/reset-password
8. Backend: DELETE /api/admin/usuarios/:id
9. Actualizar POST /api/auth/verify-mfa para detectar must_change_password
10. Nuevo endpoint POST /api/auth/change-password
11. Frontend: change-password/page.js con indicador de fortaleza
12. Frontend: usuarios/page.js + UsuariosStats + UsuariosTabla
13. Frontend: UsuarioModal (con lógica rol → empresa)
14. Frontend: UsuarioDetalle con botón reenviar credenciales
15. Agregar Usuarios al sidebar
16. Probar flujo completo:
    → Crear usuario cliente desde DSTAC
    → Correo llega con contraseña temporal
    → Cliente entra al login → MFA → pantalla cambio contraseña
    → Establece nueva contraseña → llega al dashboard
```

---

## NOTAS CRÍTICAS

1. Sin TypeScript — JavaScript puro
2. Instalar nodemailer: `npm install nodemailer`
3. La contraseña temporal NUNCA se guarda en texto plano — solo el hash
4. El change_token expira en 15 minutos — si expira, volver al login
5. Si el SMTP falla al crear usuario → rollback: eliminar el usuario creado
6. El select de empresa en el modal solo muestra empresas activas (is_internal = 0)
7. super_admin no se puede crear desde este módulo — solo existe uno
8. No se puede eliminar el propio usuario con el que estás logueado
9. Comentar el código — especialmente el flujo de contraseña temporal

