# DSTAC Platform — Documento maestro para Claude Code

## Instrucciones para Claude Code

Lee este documento completo antes de escribir cualquier línea de código.
Este es el sistema operativo interno de una empresa de ciberseguridad chilena llamada DSTAC.
Cuando te pida construir algo, usa siempre este documento como referencia.

---

## 1. Descripción del proyecto

Plataforma SaaS multi-tenant de ciberseguridad con dos caras:
- **Panel interno DSTAC**: donde el equipo de DSTAC gestiona toda la operación
- **Portal cliente**: donde los clientes visualizan su postura de seguridad

Mercado: Chile. Idioma: español. MVP en menos de 6 meses.
Hosting actual: Planet Hosting (MySQL, Node.js, SMTP propio).

---

## 2. Stack tecnológico

```
Frontend:   Next.js 14 (App Router) — JavaScript puro, SIN TypeScript
Backend:    Node.js + Express.js — JavaScript puro, SIN TypeScript
Base datos: MySQL (Planet Hosting — máx 10 BDs)
Auth:       JWT + bcrypt + MFA por correo (código 6 dígitos)
Reportes:   puppeteer (PDF) + exceljs (Excel)
Email:      nodemailer + SMTP de Planet Hosting
Estilos:    Tailwind CSS
```

**IMPORTANTE sobre Planet Hosting:**
- No usar TypeScript, da problemas en el deploy
- Node.js disponible como proceso persistente
- Máximo 10 bases de datos MySQL simultáneas
- SMTP disponible en el mismo servidor

---

## 3. Estructura de carpetas

```
dstac-platform/
├── apps/
│   ├── web/                          ← Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   │       └── page.js
│   │   │   ├── (admin)/              ← Panel interno DSTAC
│   │   │   │   ├── layout.js
│   │   │   │   ├── dashboard/
│   │   │   │   ├── clientes/
│   │   │   │   ├── incidentes/
│   │   │   │   ├── pendientes/
│   │   │   │   ├── nist/
│   │   │   │   └── ...
│   │   │   └── (client)/             ← Portal cliente
│   │   │       ├── layout.js
│   │   │       ├── dashboard/
│   │   │       ├── activos/
│   │   │       ├── identidades/
│   │   │       ├── accesos/
│   │   │       └── ...
│   │   ├── components/
│   │   │   ├── admin/                ← Componentes del panel DSTAC
│   │   │   ├── client/               ← Componentes del portal cliente
│   │   │   └── shared/               ← Componentes compartidos
│   │   └── lib/
│   │       ├── api.js                ← Cliente HTTP hacia el backend
│   │       └── auth.js               ← Helpers de sesión frontend
│   │
│   └── api/                          ← Express.js backend
│       ├── index.js                  ← Entry point
│       ├── routes/
│       │   ├── auth.js
│       │   ├── companies.js
│       │   ├── users.js
│       │   ├── assets.js
│       │   ├── identities.js
│       │   ├── accesses.js
│       │   ├── incidents.js
│       │   ├── risks.js
│       │   ├── recovery.js
│       │   ├── pending.js
│       │   └── reports.js
│       ├── middleware/
│       │   ├── auth.js               ← Verificar JWT
│       │   ├── tenant.js             ← Resolver BD del cliente
│       │   ├── permissions.js        ← Verificar roles
│       │   └── rateLimit.js
│       ├── services/
│       │   ├── emailService.js       ← nodemailer
│       │   ├── reportService.js      ← PDF y Excel
│       │   └── scoreService.js       ← Calcular Security Score
│       └── db/
│           ├── central.js            ← Conexión BD central
│           └── tenant.js             ← Conexión dinámica por cliente
│
└── shared/
    ├── plans.js                      ← Módulos por plan
    └── roles.js                      ← Definición de roles
```

---

## 4. Arquitectura multi-tenant (MUY IMPORTANTE)

### Separación de bases de datos

```
BD Central (db_dstac_core):
  - companies      ← todas las empresas clientes
  - users          ← todos los usuarios (DSTAC + clientes)
  - plans          ← planes disponibles
  - sessions       ← sesiones activas
  - mfa_codes      ← códigos MFA temporales
  - pending_tasks  ← tareas pendientes por empresa

BD Operacional por cliente (db_dstac_op_{slug}):
  - personal
  - activos
  - identidades
  - accesos
  - incidentes      ← solo planes superiores
  - riesgos         ← solo planes superiores
  - recuperacion    ← solo planes superiores
  - nist_scores     ← puntajes por función NIST
```

### Lógica de conexión tenant

```javascript
// apps/api/db/tenant.js
const mysql = require('mysql2/promise')

// Cache de conexiones activas para no reconectar en cada request
const tenantPools = {}

async function getTenantDB(companySlug) {
  // Reutilizar conexión existente
  if (tenantPools[companySlug]) {
    return tenantPools[companySlug]
  }

  // Nombre de BD según convención: db_dstac_op_{slug}
  const dbName = `db_dstac_op_${companySlug}`

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 5,   // Bajo porque Planet Hosting tiene límites
    queueLimit: 0
  })

  tenantPools[companySlug] = pool
  return pool
}

module.exports = { getTenantDB }
```

### BD Central

```javascript
// apps/api/db/central.js
const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'db_dstac_core',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

module.exports = pool
```

---

## 5. Modelo de datos completo

### BD Central — db_dstac_core

```sql
-- Planes disponibles
CREATE TABLE plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,           -- 'pyme', 'profesional', 'enterprise'
  display_name VARCHAR(100) NOT NULL,
  modules JSON NOT NULL,               -- array de módulos habilitados
  max_users INT DEFAULT 5,
  price_monthly INT DEFAULT 0,         -- en pesos CLP
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Empresas clientes
CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,   -- usado para nombre de BD: db_dstac_op_{slug}
  plan_id INT NOT NULL,
  db_name VARCHAR(100) NOT NULL,       -- nombre real de la BD operacional
  status ENUM('active','suspended','setup','cancelled') DEFAULT 'setup',
  theme_color VARCHAR(7) DEFAULT '#3C3489',   -- color primario del portal cliente
  theme_light VARCHAR(7) DEFAULT '#EEEDFE',   -- color claro para badges
  theme_mid VARCHAR(7) DEFAULT '#534AB7',     -- color medio para acentos
  billing_email VARCHAR(200),
  max_users INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Usuarios (DSTAC + clientes)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT,                      -- NULL si es usuario DSTAC
  email VARCHAR(200) NOT NULL UNIQUE,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM(
    'super_admin',
    'admin_dstac',
    'analista_dstac',
    'consultor_dstac',
    'cliente_admin',
    'cliente_lectura'
  ) NOT NULL,
  status ENUM('active','inactive','blocked') DEFAULT 'active',
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  mfa_enabled BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Códigos MFA temporales
CREATE TABLE mfa_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,       -- 5 minutos desde creación
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sesiones activas
CREATE TABLE sessions (
  id VARCHAR(128) PRIMARY KEY,         -- token JWT id (jti)
  user_id INT NOT NULL,
  company_id INT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tareas pendientes (cross-tenant, gestionadas por DSTAC)
CREATE TABLE pending_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  priority ENUM('critical','high','medium','low') NOT NULL,
  status ENUM('pending','in_progress','done','cancelled') DEFAULT 'pending',
  due_date DATE,
  assigned_to INT,                     -- user_id del analista DSTAC
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### BD Operacional — db_dstac_op_{slug}

```sql
-- Personal de la empresa
CREATE TABLE personal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  rol_empresarial VARCHAR(200),
  nivel_responsabilidad ENUM('alto','medio','bajo'),
  estado ENUM('activo','inactivo','vacaciones','desvinculado') DEFAULT 'activo',
  fecha_ingreso DATE,
  correo VARCHAR(200),
  telefono VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Activos de la empresa
CREATE TABLE activos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,          -- servidor, laptop, switch, aplicación, etc.
  nombre VARCHAR(200) NOT NULL,
  proveedor VARCHAR(200),
  estado ENUM('operativo','degradado','fuera_de_servicio','en_mantencion') DEFAULT 'operativo',
  criticidad ENUM('critica','alta','media','baja') NOT NULL,
  ambiente ENUM('produccion','desarrollo','testing','staging'),
  responsable_id INT,                  -- FK a personal
  proyecto VARCHAR(200),
  documentacion TEXT,
  metadata JSON,                       -- campos adicionales flexibles
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsable_id) REFERENCES personal(id)
);

-- Identidades digitales
CREATE TABLE identidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  identidad VARCHAR(200) NOT NULL,     -- nombre de usuario, email, etc.
  tipo_identidad ENUM('usuario','cuenta_servicio','api_key','certificado','otro'),
  origen VARCHAR(100),                 -- AD, Google, local, etc.
  estado ENUM('activa','inactiva','comprometida','expirada') DEFAULT 'activa',
  propietario_id INT,                  -- FK a personal
  fecha_creacion DATE,
  fecha_revision DATE,
  fecha_expiracion DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (propietario_id) REFERENCES personal(id)
);

-- Accesos
CREATE TABLE accesos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identidad_id INT NOT NULL,
  activo_id INT NOT NULL,
  entorno ENUM('produccion','desarrollo','testing','staging'),
  nivel_acceso ENUM('lectura','escritura','administrador','root'),
  estado ENUM('activo','inactivo','suspendido','expirado') DEFAULT 'activo',
  criticidad ENUM('critica','alta','media','baja'),
  fecha_otorgamiento DATE,
  fecha_expiracion DATE,
  quien_autorizo VARCHAR(200),
  justificacion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (identidad_id) REFERENCES identidades(id),
  FOREIGN KEY (activo_id) REFERENCES activos(id)
);

-- Incidentes de seguridad (solo planes superiores a PYME)
CREATE TABLE incidentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,
  categoria VARCHAR(100),
  estado ENUM('abierto','en_investigacion','en_respuesta','cerrado','falso_positivo') DEFAULT 'abierto',
  severidad ENUM('critica','alta','media','baja') NOT NULL,
  impacto ENUM('critico','alto','medio','bajo'),
  proyecto VARCHAR(200),
  activo_id INT,
  descripcion TEXT,
  causa_raiz TEXT,
  vulnerabilidades TEXT,
  cvss DECIMAL(3,1),
  fecha_deteccion DATETIME,
  fecha_respuesta DATETIME,
  tiempo_resolucion INT,               -- en minutos
  requiere_notificacion_legal BOOLEAN DEFAULT FALSE,
  responsable VARCHAR(200),
  archivo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (activo_id) REFERENCES activos(id)
);

-- Gestión de riesgos (solo planes superiores)
CREATE TABLE riesgos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,
  categoria VARCHAR(100),
  descripcion TEXT NOT NULL,
  activo_id INT,
  probabilidad ENUM('alta','media','baja') NOT NULL,
  impacto ENUM('critico','alto','medio','bajo') NOT NULL,
  nivel_riesgo ENUM('critico','alto','medio','bajo','aceptable'),
  clasificacion_controles TEXT,
  controles_tratamientos TEXT,
  responsable VARCHAR(200),
  fecha_identificacion DATE,
  fecha_revision DATE,
  fecha_termino DATE,
  probabilidad_residual ENUM('alta','media','baja'),
  impacto_residual ENUM('critico','alto','medio','bajo'),
  nivel_residual ENUM('critico','alto','medio','bajo','aceptable'),
  clasificacion_residual TEXT,
  estado ENUM('abierto','en_tratamiento','aceptado','cerrado') DEFAULT 'abierto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (activo_id) REFERENCES activos(id)
);

-- Recuperación ante incidentes (solo planes superiores)
CREATE TABLE recuperacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activo_id INT,
  nombre_tecnico VARCHAR(200),
  estado_operativo ENUM('operativo','degradado','fuera_de_servicio'),
  nivel_impacto ENUM('critico','alto','medio','bajo'),
  backup_disponible BOOLEAN DEFAULT FALSE,
  inicio_incidente DATETIME,
  fecha_recuperacion DATETIME,
  fecha_indisponibilidad DATETIME,
  responsable_respuesta VARCHAR(200),
  documento_plan_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (activo_id) REFERENCES activos(id)
);

-- Puntajes NIST CSF por función
CREATE TABLE nist_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  funcion ENUM('identificar','proteger','detectar','responder','recuperar') NOT NULL,
  porcentaje INT NOT NULL DEFAULT 0,   -- 0 a 100
  notas TEXT,
  fecha_evaluacion DATE NOT NULL,
  evaluado_por VARCHAR(200),           -- analista DSTAC que lo evaluó
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Roles y permisos

```javascript
// shared/roles.js

const ROLES = {
  SUPER_ADMIN:      'super_admin',      // DSTAC — acceso total
  ADMIN_DSTAC:      'admin_dstac',      // DSTAC — gestión de clientes asignados
  ANALISTA_DSTAC:   'analista_dstac',   // DSTAC — operacional
  CONSULTOR_DSTAC:  'consultor_dstac',  // DSTAC — solo proyectos asignados
  CLIENTE_ADMIN:    'cliente_admin',    // Cliente — gestiona usuarios de su empresa
  CLIENTE_LECTURA:  'cliente_lectura'   // Cliente — solo visualiza
}

// Roles que entran al panel interno DSTAC
const DSTAC_ROLES = [
  'super_admin',
  'admin_dstac',
  'analista_dstac',
  'consultor_dstac'
]

// Roles que entran al portal cliente
const CLIENT_ROLES = [
  'cliente_admin',
  'cliente_lectura'
]

// Permisos especiales
const PERMISSIONS = {
  // Solo estos roles pueden cambiar el tema del portal de un cliente
  CHANGE_THEME: ['super_admin', 'admin_dstac', 'cliente_admin'],

  // Solo estos pueden crear/editar empresas
  MANAGE_COMPANIES: ['super_admin', 'admin_dstac'],

  // Solo estos pueden crear usuarios
  MANAGE_USERS: ['super_admin', 'admin_dstac', 'cliente_admin'],

  // Solo DSTAC edita datos operacionales (por ahora)
  EDIT_OPERATIONAL: ['super_admin', 'admin_dstac', 'analista_dstac'],

  // Todos los autenticados pueden ver reportes de su scope
  VIEW_REPORTS: ['super_admin', 'admin_dstac', 'analista_dstac', 'consultor_dstac', 'cliente_admin', 'cliente_lectura']
}

module.exports = { ROLES, DSTAC_ROLES, CLIENT_ROLES, PERMISSIONS }
```

---

## 7. Planes y módulos

```javascript
// shared/plans.js

const PLAN_MODULES = {
  pyme: [
    'personal',
    'activos',
    'identidades',
    'accesos',
    'nist',
    'reportes',
    'capacitaciones',
    'campanas'
  ],
  profesional: [
    'personal',
    'activos',
    'identidades',
    'accesos',
    'incidentes',
    'riesgos',
    'recuperacion',
    'nist',
    'reportes',
    'capacitaciones',
    'campanas',
    'documentos'
  ],
  enterprise: [
    'personal',
    'activos',
    'identidades',
    'accesos',
    'incidentes',
    'riesgos',
    'recuperacion',
    'nist',
    'cumplimiento',
    'gobernanza',
    'reportes',
    'capacitaciones',
    'campanas',
    'documentos'
  ]
}

// Verifica si un plan tiene acceso a un módulo
function hasModule(planName, moduleName) {
  return PLAN_MODULES[planName]?.includes(moduleName) ?? false
}

module.exports = { PLAN_MODULES, hasModule }
```

---

## 8. Flujo de autenticación (CRÍTICO — leer con atención)

El MFA se envía SOLO después de validar todo. Nunca antes.

```
1. Usuario ingresa email/username + contraseña
2. Backend: ¿existe el usuario? → NO → error genérico (no revelar si existe)
3. Backend: ¿contraseña correcta? (bcrypt.compare) → NO → error genérico
4. Backend: ¿empresa activa? (status = 'active') → NO → "acceso denegado"
5. Backend: ¿usuario tiene permisos? (status = 'active') → NO → "acceso denegado"
6. Solo aquí: generar código 6 dígitos, guardar en mfa_codes con expiración 5 min, enviar email
7. Usuario ingresa código → validar → generar JWT → redirigir según rol
```

### Redirección post-login según rol:
- DSTAC_ROLES → `/admin/dashboard`
- CLIENT_ROLES → `/client/dashboard`

---

## 9. Variables de entorno (.env)

```env
# Base de datos
DB_HOST=localhost
DB_USER=dstac_user
DB_PASSWORD=tu_password_seguro
DB_CENTRAL=db_dstac_core

# JWT
JWT_SECRET=secreto_muy_largo_y_aleatorio_minimo_64_chars
JWT_EXPIRES_IN=8h

# Email (Planet Hosting SMTP)
SMTP_HOST=mail.tudominio.cl
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@tudominio.cl
SMTP_PASS=password_del_correo

# App
NODE_ENV=production
API_PORT=3001
NEXT_PUBLIC_API_URL=https://tudominio.cl/api
FRONTEND_URL=https://tudominio.cl

# Seguridad
BCRYPT_ROUNDS=12
MFA_EXPIRES_MINUTES=5
```

---

## 10. Middleware de autenticación

```javascript
// apps/api/middleware/auth.js
const jwt = require('jsonwebtoken')
const centralDB = require('../db/central')

async function requireAuth(req, res, next) {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' })
    }

    const token = authHeader.split(' ')[1]

    // Verificar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verificar que la sesión sigue activa en BD
    const [sessions] = await centralDB.execute(
      'SELECT id FROM sessions WHERE id = ? AND expires_at > NOW()',
      [decoded.jti]
    )

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Sesión expirada' })
    }

    // Adjuntar usuario al request
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// Verificar rol específico
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' })
    }
    next()
  }
}

module.exports = { requireAuth, requireRole }
```

---

## 11. Middleware de tenant

```javascript
// apps/api/middleware/tenant.js
const { getTenantDB } = require('../db/tenant')
const centralDB = require('../db/central')

// Resuelve la BD del cliente según el usuario autenticado
async function resolveTenant(req, res, next) {
  try {
    // Usuarios DSTAC pueden operar en nombre de un cliente
    // usando el header X-Company-Slug o el parámetro de ruta
    const companySlug = req.headers['x-company-slug'] || req.params.companySlug

    if (!companySlug) {
      return res.status(400).json({ error: 'Empresa no especificada' })
    }

    // Verificar que la empresa existe y está activa
    const [companies] = await centralDB.execute(
      'SELECT id, slug, plan_id, status FROM companies WHERE slug = ?',
      [companySlug]
    )

    if (companies.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' })
    }

    const company = companies[0]

    if (company.status !== 'active') {
      return res.status(403).json({ error: 'Empresa suspendida o inactiva' })
    }

    // Si es usuario cliente, verificar que pertenece a esa empresa
    if (['cliente_admin', 'cliente_lectura'].includes(req.user.role)) {
      if (req.user.company_id !== company.id) {
        return res.status(403).json({ error: 'Sin acceso a esta empresa' })
      }
    }

    // Obtener conexión a la BD de este tenant
    req.tenantDB = await getTenantDB(companySlug)
    req.company = company
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = { resolveTenant }
```

---

## 12. Temas por cliente

```javascript
// Al crear empresa — DSTAC elige el tema inicial
// Solo cliente_admin o DSTAC puede cambiarlo después

// Paletas disponibles (definidas por DSTAC, el cliente elige entre estas)
const THEMES = [
  { id: 'purple',  name: 'DSTAC Morado',      color: '#3C3489', light: '#EEEDFE', mid: '#534AB7' },
  { id: 'blue',    name: 'Azul corporativo',   color: '#185FA5', light: '#E6F1FB', mid: '#378ADD' },
  { id: 'green',   name: 'Verde esmeralda',    color: '#0F6E56', light: '#E1F5EE', mid: '#1D9E75' },
  { id: 'amber',   name: 'Ámbar oscuro',       color: '#854F0B', light: '#FAEEDA', mid: '#BA7517' },
  { id: 'pink',    name: 'Rosa ejecutivo',     color: '#993556', light: '#FBEAF0', mid: '#D4537E' },
]

// El portal cliente carga el tema en el layout:
// 1. GET /api/client/theme → devuelve { color, light, mid }
// 2. Next.js layout.js aplica como CSS variables en :root
// 3. Todos los componentes del portal usan var(--brand-color) etc.
```

---

## 13. Tokens de diseño (CSS)

```css
/* globals.css — variables del sistema de diseño */

/* Panel DSTAC — sidebar oscuro */
--dstac-900: #26215C;
--dstac-800: #3C3489;
--dstac-600: #534AB7;
--dstac-400: #7F77DD;
--dstac-200: #AFA9EC;
--dstac-100: #CECBF6;
--dstac-50:  #EEEDFE;

/* Portal cliente — el tema se inyecta dinámicamente */
--brand-color: /* viene de la BD */;
--brand-light: /* viene de la BD */;
--brand-mid:   /* viene de la BD */;

/* Superficies */
--bg-page:    #f8f7f4;
--bg-card:    #ffffff;
--border:     #e2e0d8;
--border-sub: #f1efe8;

/* Texto */
--text-primary:   #2C2C2A;
--text-secondary: #888780;
--text-hint:      #B4B2A9;

/* Semántica */
--color-critical: #E24B4A;
--color-high:     #EF9F27;
--color-medium:   #639922;
--color-low:      #B4B2A9;
--color-ok:       #1D9E75;
```

---

## 14. Diseño visual estandarizado

### Login
- Panel izquierdo: fondo `#26215C`, logo DSTAC, tagline, features
- Panel derecho: fondo blanco, formulario limpio
- Flujo en 3 pasos con indicador de progreso
- MFA: 6 inputs de un dígito, auto-avance entre cajas

### Panel interno DSTAC
- Sidebar: fondo `#26215C`, colapsable a 52px
- Dashboard modular: widgets arrastrables (drag & drop)
- Widgets clave: clientes activos, incidentes, pendientes (pequeño y grande), score promedio, NIST cartera, actividad reciente
- Pendientes: apartado propio en sidebar, widget adaptable según tamaño

### Portal cliente
- Sidebar: fondo `#3C3489` (o color del tema del cliente), colapsable a 52px
- Logo del cliente arriba del sidebar
- Footer del sidebar: "Powered by DSTAC"
- Dashboard modular: mismos comportamientos de drag & drop
- Widgets: Security Score con anillo, vulnerabilidades, incidentes, NIST CSF, capacitaciones

---

## 15. Roadmap MVP (6 meses)

### Mes 1-2: Fundación
- [ ] Setup proyecto (Next.js + Express en Planet Hosting)
- [ ] BD central: tablas companies, users, plans
- [ ] Auth completo con MFA inteligente
- [ ] Sistema de roles y redirección
- [ ] Creación dinámica de BD por cliente

### Mes 3-4: Módulos operacionales
- [ ] Panel DSTAC: CRUD de personal, activos, identidades, accesos
- [ ] Portal cliente: dashboard con widgets
- [ ] Security Score calculado automáticamente
- [ ] Exportación PDF/Excel básica
- [ ] Módulo NIST (edición DSTAC, visualización cliente)

### Mes 5-6: Completar y lanzar
- [ ] Pendientes por empresa con prioridades
- [ ] Sistema de temas por cliente
- [ ] Gestión de usuarios (DSTAC y cliente_admin)
- [ ] Migración de datos desde Notion
- [ ] Pruebas con clientes reales

### Post-MVP
- [ ] Módulos: incidentes, riesgos, recuperación
- [ ] Integraciones externas (SIEMs, APIs)
- [ ] IA para análisis de riesgo
- [ ] Migración a cloud (AWS/Azure)

---

## 16. Reglas de negocio importantes

1. **El cliente NO edita datos operacionales** — solo DSTAC carga y actualiza información
2. **MFA siempre después de validar todo** — nunca enviar código si algo falla antes
3. **Error genérico en login** — no revelar si el usuario existe o no
4. **Tema del portal** — solo `cliente_admin`, `admin_dstac` y `super_admin` pueden cambiarlo
5. **Módulos por plan** — verificar siempre antes de mostrar cualquier sección
6. **Un cliente = una BD** — nunca mezclar datos entre tenants
7. **Pendientes** — creados solo por DSTAC, visibles en panel interno
8. **Reportes PDF/Excel** — el cliente puede generarlos desde su portal
9. **NIST** — DSTAC evalúa y carga los puntajes, el cliente los visualiza
10. **Drag & drop del dashboard** — el orden se persiste en BD por usuario

---

## 17. Comandos para arrancar

```bash
# Instalar dependencias
cd apps/api && npm install
cd apps/web && npm install

# Variables de entorno
cp .env.example .env
# Editar .env con credenciales de Planet Hosting

# Crear BD central y tablas
node apps/api/db/migrate.js

# Desarrollo
cd apps/api && node index.js          # Puerto 3001
cd apps/web && npm run dev            # Puerto 3000

# Producción en Planet Hosting
cd apps/api && node index.js &        # Proceso en background
cd apps/web && npm run build && npm start
```

