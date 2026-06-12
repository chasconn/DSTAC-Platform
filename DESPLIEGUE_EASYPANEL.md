# DSTAC Platform — Despliegue en EasyPanel (portal.dstac.cl)

> Adaptado al VPS real: Docker + **EasyPanel + Traefik** (NO el PM2/Nginx de DEPLOYMENT.md).
> Modelo de ruteo: el navegador llama a `portal.dstac.cl/api/*` → **Next.js lo reenvía** (rewrite)
> al API interno. Solo el **frontend** tiene dominio público; API y MySQL quedan internos.

## 0. Prerrequisitos (los provees tú)
1. **DNS:** registro **A** `portal.dstac.cl` → `2.25.183.242` (en tu proveedor DNS).
2. **GitHub:** repo (privado) con este proyecto, para que EasyPanel lo despliegue.
3. **SMTP:** credenciales del correo emisor (MFA + notificaciones). Ej. `noreply@dstac.cl` (M365: usuario + app password).

## 1. Proyecto en EasyPanel
Crear proyecto **`dstac-portal`**.

## 2. Servicio MySQL (dedicado)
- Añadir servicio **MySQL 8** desde EasyPanel.
- Anota: host interno, usuario, password, puerto (3306).
- ⚠️ La plataforma es **multi-tenant**: crea **una BD por cliente** en runtime. El usuario MySQL
  necesita privilegio **CREATE DATABASE**. Si el user de EasyPanel está limitado a una sola BD,
  usar el user admin de ese MySQL para la app, o conceder: `GRANT ALL PRIVILEGES ON *.* TO 'dstac'@'%';`
- Crear la BD central: `CREATE DATABASE db_dstac_core;`

## 3. Servicio API (interno, sin dominio)
- App desde **GitHub** → build **Dockerfile** = `Dockerfile.api`, **contexto = raíz** del repo.
- Puerto del contenedor: **3001** (sin dominio público).
- Variables de entorno:
  ```
  NODE_ENV=production
  API_PORT=3001
  DB_HOST=<host interno mysql>
  DB_USER=<user>
  DB_PASSWORD=<pass>
  DB_CENTRAL=db_dstac_core
  JWT_SECRET=<64+ chars aleatorios>
  JWT_EXPIRES_IN=8h
  FRONTEND_URL=https://portal.dstac.cl
  SMTP_HOST=...   SMTP_PORT=465   SMTP_SECURE=true
  SMTP_USER=noreply@dstac.cl   SMTP_PASS=...
  BCRYPT_ROUNDS=12   MFA_EXPIRES_MINUTES=5
  ```
  Generar JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

## 4. Servicio Web (público)
- App desde **GitHub** → build **Dockerfile** = `Dockerfile.web`, **contexto = raíz**.
- **Build arg:** `NEXT_PUBLIC_API_URL=/api`
- Variables: `NODE_ENV=production`, `INTERNAL_API_URL=http://<nombre-servicio-api>:3001`, `FRONTEND_URL=https://portal.dstac.cl`
- Puerto contenedor: **3000**.
- **Dominio:** `portal.dstac.cl` → EasyPanel/Traefik emite **SSL (Let's Encrypt)** automático.

## 5. Inicializar la base de datos
En la **consola del servicio API** (EasyPanel → API → Console):
```
node apps/api/db/setup.js          # crea BD central + tablas + empresa interna DSTAC
# (opcional, datos de prueba)
node apps/api/db/setup.js --demo
```
Luego crear/confirmar el **usuario admin DSTAC** (ver `apps/api/db/seed.js`).

## 6. Verificación
- `https://portal.dstac.cl` carga el login (SSL válido).
- Login admin → panel interno. Crear una empresa cliente → se genera su tenant (BD).
- Probar un reporte PDF (valida que Puppeteer/Chromium funciona en el contenedor).

## 7. Integración con el sitio actual
Añadir en `dstac.cl` un botón **"Portal cliente / Acceso"** → `https://portal.dstac.cl`.

## Rollback
Cada servicio en EasyPanel permite volver al deploy anterior. La BD: respaldar antes con
`mysqldump` (o snapshot del volumen MySQL).
