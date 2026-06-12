# DSTAC Platform — Guía de Despliegue en Producción

> Plataforma SaaS multi-tenant de ciberseguridad. Stack: Next.js 14 + Express.js + MySQL 8.4  
> Idioma del sistema: Español | Mercado: Chile

---

## Índice

1. [Requisitos del VPS](#1-requisitos-del-vps)
2. [Preparación del sistema](#2-preparación-del-sistema)
3. [Instalación de dependencias](#3-instalación-de-dependencias)
4. [Subir el proyecto al servidor](#4-subir-el-proyecto-al-servidor)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Inicialización de la base de datos](#6-inicialización-de-la-base-de-datos)
7. [Build del frontend](#7-build-del-frontend)
8. [Configuración de PM2](#8-configuración-de-pm2)
9. [Configuración de Nginx](#9-configuración-de-nginx)
10. [SSL con Certbot (HTTPS)](#10-ssl-con-certbot-https)
11. [Lista de verificación post-despliegue](#11-lista-de-verificación-post-despliegue)
12. [Plan de rollback](#12-plan-de-rollback)
13. [Errores comunes y soluciones](#13-errores-comunes-y-soluciones)

---

## 1. Requisitos del VPS

### Especificaciones mínimas recomendadas

| Recurso | Mínimo MVP | Recomendado (producción) |
|---------|-----------|--------------------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Almacenamiento | 40 GB SSD | 80 GB SSD |
| Ancho de banda | 1 TB/mes | Sin límite |
| SO | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Puertos que deben estar abiertos

| Puerto | Protocolo | Uso |
|--------|-----------|-----|
| 22 | TCP | SSH (cambiar a puerto no estándar en producción) |
| 80 | TCP | HTTP (Nginx, para redirección a HTTPS) |
| 443 | TCP | HTTPS (Nginx, tráfico de la app) |
| 3306 | TCP | MySQL (solo escucha en localhost, NO exponer a Internet) |
| 3001 | TCP | API Express (solo escucha en localhost, Nginx hace proxy) |
| 3000 | TCP | Next.js (solo escucha en localhost, Nginx hace proxy) |

> **Importante:** Los puertos 3001, 3000 y 3306 NUNCA deben ser accesibles desde Internet. Solo Nginx en 80/443 es público.

### Dominio requerido

Antes de desplegar necesitas:
- Un dominio apuntando a la IP del VPS (registro A en tu DNS)
- Tiempo de propagación DNS: hasta 24 horas (normalmente menos de 1 hora)

---

## 2. Preparación del sistema

Conéctate al servidor via SSH y ejecuta lo siguiente como root o con `sudo`.

### Actualizar el sistema

```bash
apt update && apt upgrade -y
apt install -y curl wget git unzip nano ufw fail2ban
```

### Configurar el firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

### Crear usuario no-root para la aplicación

```bash
adduser dstac
usermod -aG sudo dstac

# Copiar llaves SSH al nuevo usuario (si usas autenticación por llave)
mkdir -p /home/dstac/.ssh
cp /root/.ssh/authorized_keys /home/dstac/.ssh/
chown -R dstac:dstac /home/dstac/.ssh
chmod 700 /home/dstac/.ssh
chmod 600 /home/dstac/.ssh/authorized_keys
```

A partir de aquí trabajar siempre como el usuario `dstac`:

```bash
su - dstac
```

---

## 3. Instalación de dependencias

### Node.js 20 LTS (via NVM — recomendado)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recargar el shell
source ~/.bashrc

# Instalar Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verificar instalación
node --version   # debe mostrar v20.x.x
npm --version    # debe mostrar 10.x.x
```

### PM2 (gestor de procesos)

```bash
npm install -g pm2
pm2 --version
```

### MySQL 8.4

```bash
# Descargar el repositorio oficial de MySQL
sudo wget https://dev.mysql.com/get/mysql-apt-config_0.8.30-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.30-1_all.deb
# En el menú interactivo seleccionar: MySQL 8.4 LTS -> OK

sudo apt update
sudo apt install -y mysql-server

# Verificar que está corriendo
sudo systemctl status mysql

# Asegurar la instalación
sudo mysql_secure_installation
# Responder: Y, Y, [contraseña fuerte], Y, Y, Y, Y
```

### Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Certbot (para SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 4. Subir el proyecto al servidor

### Opción A: clonar desde Git (recomendado)

```bash
cd /home/dstac
git clone https://tu-repositorio/dstac-platform.git
cd dstac-platform
```

### Opción B: subir los archivos via SCP desde tu máquina local

Desde tu máquina Windows (PowerShell o Git Bash):

```bash
scp -r C:\Users\eliab\OneDrive\Escritorio\DSTAC\dstac-platform dstac@IP_DEL_VPS:/home/dstac/
```

### Instalar dependencias del proyecto

```bash
cd /home/dstac/dstac-platform

# Backend (API)
cd apps/api
npm install --production
cd ../..

# Frontend (Next.js)
cd apps/web
npm install
cd ../..
```

> **Nota:** `npm install --production` en el API omite devDependencies como `nodemon`, que no se necesita en producción.

---

## 5. Variables de entorno

### Backend (apps/api/.env)

Crea el archivo en el servidor:

```bash
nano /home/dstac/dstac-platform/apps/api/.env
```

Contenido completo del archivo `.env` para producción:

```env
# ── Base de datos ──────────────────────────────────────────────
DB_HOST=127.0.0.1
DB_USER=dstac_user
DB_PASSWORD=CONTRASEÑA_MUY_SEGURA_AQUI
DB_CENTRAL=db_dstac_core

# ── JWT ────────────────────────────────────────────────────────
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=CADENA_ALEATORIA_DE_64_CARACTERES_MINIMO_AQUI
JWT_EXPIRES_IN=8h

# ── Email (SMTP) ───────────────────────────────────────────────
SMTP_HOST=mail.tudominio.cl
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@tudominio.cl
SMTP_PASS=PASSWORD_DEL_CORREO_AQUI

# ── App ────────────────────────────────────────────────────────
NODE_ENV=production
API_PORT=3001
NEXT_PUBLIC_API_URL=https://tudominio.cl/api
INTERNAL_API_URL=http://localhost:3001
FRONTEND_URL=https://tudominio.cl

# ── Seguridad ──────────────────────────────────────────────────
BCRYPT_ROUNDS=12
MFA_EXPIRES_MINUTES=5
```

**Generar JWT_SECRET seguro:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copiar el resultado y pegarlo en `JWT_SECRET`.

### Frontend (apps/web/.env.local)

```bash
nano /home/dstac/dstac-platform/apps/web/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://tudominio.cl/api
INTERNAL_API_URL=http://localhost:3001
```

### Permisos del archivo .env

```bash
chmod 600 /home/dstac/dstac-platform/apps/api/.env
chmod 600 /home/dstac/dstac-platform/apps/web/.env.local
```

---

## 6. Inicialización de la base de datos

### Crear el usuario MySQL para la aplicación

```bash
sudo mysql -u root -p
```

Dentro de MySQL:

```sql
-- Crear usuario con todos los privilegios necesarios
CREATE USER 'dstac_user'@'127.0.0.1' IDENTIFIED BY 'CONTRASEÑA_MUY_SEGURA_AQUI';

-- Conceder privilegios (necesita CREATE DATABASE para crear BDs de tenants)
GRANT ALL PRIVILEGES ON `db_dstac_core`.* TO 'dstac_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON `db_dstac_op_%`.* TO 'dstac_user'@'127.0.0.1';
GRANT CREATE ON *.* TO 'dstac_user'@'127.0.0.1';

FLUSH PRIVILEGES;
EXIT;
```

> **Por qué `GRANT CREATE ON *.*`:** El sistema crea automáticamente una nueva base de datos `db_dstac_op_{slug}` por cada empresa cliente. El usuario MySQL necesita permiso para crear bases de datos.

### Ejecutar el setup maestro

```bash
cd /home/dstac/dstac-platform/apps/api

# Crea la BD central, todas las tablas, la empresa DSTAC interna y el super_admin
node db/setup.js
```

El script `setup.js` ejecuta en orden:
1. `migrate.js` — tablas centrales (companies, users, plans, sessions, mfa_codes, pending_tasks, dashboard_layouts)
2. `migrate_nist.js` — tablas NIST CSF 2.0 en la BD central
3. `migrate_iso.js` — tablas ISO 27001:2022 en la BD central
4. `alter.js` — columnas adicionales en tablas centrales
5. `addInternalCompany.js` — crea la empresa interna DSTAC y su BD operacional
6. `addClientTables.js` — agrega tablas de scores y layouts en tenants existentes
7. `seed.js` — crea el usuario `super_admin` (admin@dstac.cl)

### Poblar los marcos de referencia (OBLIGATORIO)

Sin este paso, los módulos NIST e ISO no funcionarán:

```bash
cd /home/dstac/dstac-platform/apps/api

# Poblar NIST CSF 2.0 (6 funciones, categorías, 121+ controles)
node db/seed_nist.js

# Poblar ISO 27001:2022 (4 dominios, 93 controles)
node db/seed_iso.js
```

Verificar que se insertaron correctamente:

```bash
mysql -u dstac_user -p -h 127.0.0.1 db_dstac_core -e "
  SELECT 'nist_functions' as tabla, COUNT(*) as registros FROM nist_functions
  UNION ALL
  SELECT 'nist_controls', COUNT(*) FROM nist_controls
  UNION ALL
  SELECT 'iso_domains', COUNT(*) FROM iso_domains
  UNION ALL
  SELECT 'iso_controls', COUNT(*) FROM iso_controls;
"
```

Resultado esperado:
```
+----------------+------------+
| tabla          | registros  |
+----------------+------------+
| nist_functions |          6 |
| nist_controls  |        121 |
| iso_domains    |          4 |
| iso_controls   |         93 |
+----------------+------------+
```

### Credenciales del super_admin por defecto

```
Email:      admin@dstac.cl
Contraseña: Admin1234!
```

> **IMPORTANTE:** Cambiar estas credenciales inmediatamente después del primer login en producción.

---

## 7. Build del frontend

```bash
cd /home/dstac/dstac-platform/apps/web

# Construir la app de producción
npm run build
```

El build puede tardar 2-5 minutos. Al finalizar verás algo como:
```
Route (app)                              Size     First Load JS
┌ ○ /                                   xxx kB   xxx kB
...
✓ Compiled successfully
```

Si el build falla revisar que:
- El archivo `apps/web/.env.local` existe y tiene `NEXT_PUBLIC_API_URL` correcto
- No hay errores de sintaxis en el código fuente
- Node.js 20 está activo: `node --version`

---

## 8. Configuración de PM2

### Crear el archivo de configuración del ecosistema

```bash
nano /home/dstac/dstac-platform/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'dstac-api',
      script: 'apps/api/index.js',
      cwd: '/home/dstac/dstac-platform',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        API_PORT: 3001
      },
      error_file: '/home/dstac/logs/api-error.log',
      out_file: '/home/dstac/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false
    },
    {
      name: 'dstac-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/dstac/dstac-platform/apps/web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/dstac/logs/web-error.log',
      out_file: '/home/dstac/logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false
    }
  ]
}
```

### Crear el directorio de logs

```bash
mkdir -p /home/dstac/logs
```

### Iniciar los procesos

```bash
cd /home/dstac/dstac-platform

pm2 start ecosystem.config.js

# Verificar que están corriendo
pm2 status
pm2 logs --lines 30
```

### Hacer que PM2 arranque automáticamente al reiniciar el VPS

```bash
pm2 save
pm2 startup systemd -u dstac --hp /home/dstac
# Ejecutar el comando que PM2 muestra en pantalla (empieza con sudo env PATH=...)
```

### Comandos PM2 útiles

```bash
pm2 status                  # ver estado de todos los procesos
pm2 logs dstac-api          # logs en tiempo real del backend
pm2 logs dstac-web          # logs en tiempo real del frontend
pm2 restart dstac-api       # reiniciar el backend
pm2 restart dstac-web       # reiniciar el frontend
pm2 restart all             # reiniciar todo
pm2 stop all                # detener todo
pm2 reload dstac-api        # recarga sin downtime (zero-downtime)
pm2 monit                   # monitor interactivo en tiempo real
```

---

## 9. Configuración de Nginx

### Crear el archivo de configuración del sitio

```bash
sudo nano /etc/nginx/sites-available/dstac-platform
```

```nginx
# Redirección HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tudominio.cl www.tudominio.cl;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Servidor HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tudominio.cl www.tudominio.cl;

    # SSL — Certbot los configura automáticamente (sección 10)
    ssl_certificate     /etc/letsencrypt/live/tudominio.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.cl/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/dstac_access.log;
    error_log  /var/log/nginx/dstac_error.log;

    # Límite de tamaño de archivos (para importación de Excel y PDF)
    client_max_body_size 50M;

    # ── Proxy al API (Express.js en puerto 3001) ──────────────
    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
    }

    # ── Proxy al Frontend (Next.js en puerto 3000) ────────────
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # ── Archivos estáticos de Next.js (cache agresivo) ────────
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000/_next/static/;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### Activar el sitio y verificar la configuración

```bash
# Activar el site
sudo ln -s /etc/nginx/sites-available/dstac-platform /etc/nginx/sites-enabled/

# Eliminar el sitio por defecto si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar que la configuración no tiene errores
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

## 10. SSL con Certbot (HTTPS)

> El certificado SSL es gratuito via Let's Encrypt. Se renueva automáticamente cada 90 días.

### Obtener el certificado

```bash
sudo certbot --nginx -d tudominio.cl -d www.tudominio.cl
```

Certbot te pedirá:
1. Tu correo electrónico (para avisos de renovación)
2. Aceptar los términos de servicio (A)
3. Si quieres compartir tu email con EFF (N o Y, según prefieras)

Certbot modifica automáticamente el archivo de Nginx para agregar las rutas SSL.

### Verificar la renovación automática

```bash
sudo certbot renew --dry-run
```

Si el comando no da error, la renovación automática está funcionando. Certbot instala un timer systemd o cron que renueva antes del vencimiento.

---

## 11. Lista de verificación post-despliegue

Ejecutar estas verificaciones después de cada despliegue en producción.

### Infraestructura

- [ ] MySQL corriendo: `sudo systemctl status mysql`
- [ ] Nginx corriendo: `sudo systemctl status nginx`
- [ ] PM2 corriendo ambos procesos: `pm2 status` (ambos en `online`)
- [ ] Certificado SSL válido: abrir `https://tudominio.cl` en el navegador y verificar el candado

### Base de datos

```bash
# Verificar tablas centrales
mysql -u dstac_user -p -h 127.0.0.1 db_dstac_core -e "SHOW TABLES;"

# Verificar que hay al menos un super_admin
mysql -u dstac_user -p -h 127.0.0.1 db_dstac_core -e "SELECT email, role, status FROM users;"

# Verificar que los frameworks están sembrados
mysql -u dstac_user -p -h 127.0.0.1 db_dstac_core -e "
  SELECT COUNT(*) as nist_controles FROM nist_controls;
  SELECT COUNT(*) as iso_controles FROM iso_controls;
"
```

### API

```bash
# Health check del API
curl https://tudominio.cl/api/health

# Respuesta esperada:
# {"status":"ok","env":"production"}
```

### Funcionalidades clave

- [ ] Login funciona con `admin@dstac.cl` y contraseña configurada
- [ ] El código MFA llega por correo
- [ ] El panel `/admin/dashboard` carga correctamente
- [ ] Se puede crear una empresa cliente nueva
- [ ] El módulo NIST muestra las funciones al seleccionar empresa
- [ ] El módulo ISO muestra los dominios al seleccionar empresa
- [ ] Los reportes PDF/Excel se generan sin error

### Seguridad

- [ ] El puerto 3001 NO es accesible desde Internet: `curl http://IP_DEL_VPS:3001` debe dar timeout
- [ ] El puerto 3000 NO es accesible desde Internet: `curl http://IP_DEL_VPS:3000` debe dar timeout
- [ ] El puerto 3306 NO es accesible desde Internet: no debe responder a conexiones externas
- [ ] HTTPS redirige correctamente: `curl -I http://tudominio.cl` debe devolver `301 Moved Permanently`
- [ ] La contraseña del super_admin fue cambiada (no usar `Admin1234!` en producción)

---

## 12. Plan de rollback

### Rollback de código (si el despliegue rompe algo)

```bash
# Opción A: si usas Git, volver al commit anterior
cd /home/dstac/dstac-platform
git log --oneline -10          # ver los últimos commits
git checkout <commit-anterior>  # volver a ese commit
cd apps/web && npm run build   # rebuild el frontend
pm2 restart all                # reiniciar procesos

# Opción B: si subiste archivos via SCP, restaurar desde backup
# (ver sección de backup abajo)
```

### Backup antes de cada despliegue

Antes de tocar producción, siempre hacer backup:

```bash
# Backup de la BD central
mysqldump -u dstac_user -p -h 127.0.0.1 db_dstac_core \
  > /home/dstac/backups/db_core_$(date +%Y%m%d_%H%M%S).sql

# Backup de todas las BDs de tenants (una a una)
mysql -u dstac_user -p -h 127.0.0.1 -e "SHOW DATABASES LIKE 'db_dstac_op_%';" \
  | grep db_dstac_op_ | while read db; do
    mysqldump -u dstac_user -p -h 127.0.0.1 "$db" \
      > /home/dstac/backups/${db}_$(date +%Y%m%d_%H%M%S).sql
  done

# Backup del directorio de la app (excluyendo node_modules y .next)
tar -czf /home/dstac/backups/app_$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude='*/node_modules' \
  --exclude='*/.next' \
  /home/dstac/dstac-platform/
```

### Restaurar una base de datos desde backup

```bash
# Restaurar la BD central
mysql -u dstac_user -p -h 127.0.0.1 db_dstac_core \
  < /home/dstac/backups/db_core_FECHA.sql

# Restaurar una BD de tenant
mysql -u dstac_user -p -h 127.0.0.1 db_dstac_op_empresa \
  < /home/dstac/backups/db_dstac_op_empresa_FECHA.sql
```

### Backup automatizado con cron

```bash
crontab -e
```

Agregar al final del archivo:

```cron
# Backup diario a las 3:00 AM
0 3 * * * mysqldump -u dstac_user -pCONTRASEÑA -h 127.0.0.1 db_dstac_core > /home/dstac/backups/db_core_$(date +\%Y\%m\%d).sql 2>/dev/null

# Limpiar backups de más de 30 días
0 4 * * * find /home/dstac/backups/ -name "*.sql" -mtime +30 -delete
```

---

## 13. Errores comunes y soluciones

### Error: `ECONNREFUSED 127.0.0.1:3306`

**Causa:** MySQL no está corriendo.

```bash
sudo systemctl start mysql
sudo systemctl status mysql

# Si falla al iniciar, revisar los logs
sudo journalctl -xeu mysql.service | tail -30
```

### Error: `ER_PARSE_ERROR` al ejecutar migrations

**Causa:** Sintaxis incompatible con MySQL 8 (por ejemplo, `ADD COLUMN IF NOT EXISTS` es sintaxis MariaDB).

**Solución:** El código ya fue corregido para usar comprobaciones via `INFORMATION_SCHEMA`. Si reaparece este error en una migración nueva, asegúrate de usar el patrón:

```javascript
const [cols] = await conn.query(`
  SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tabla' AND COLUMN_NAME = 'columna'
`)
if (cols.length === 0) {
  await conn.query(`ALTER TABLE tabla ADD COLUMN columna TIPO`)
}
```

### Error: `ER_WRONG_ARGUMENTS: Incorrect arguments to mysqld_stmt_execute`

**Causa:** MySQL 8 rechaza LIMIT/OFFSET en prepared statements cuando el valor no es entero nativo.

**Solución:** Usar interpolación directa en lugar de parámetros:

```javascript
// MAL (mysql2 con execute() — MySQL 8 lo rechaza)
await db.execute(`SELECT * FROM tabla LIMIT ? OFFSET ?`, [limit, offset])

// BIEN — interpolación con conversión explícita a número
await db.execute(`SELECT * FROM tabla LIMIT ${Number(limit)} OFFSET ${Number(offset)}`, otrosParams)
```

### Error: `EADDRINUSE :3001` o `EADDRINUSE :3000`

**Causa:** Un proceso anterior de Node.js sigue corriendo en ese puerto.

```bash
# Ver qué proceso usa el puerto
sudo lsof -i :3001
sudo lsof -i :3000

# Matar el proceso por PID
kill -9 <PID>

# O usando PM2 (la forma correcta en producción)
pm2 restart all
```

### Error: `Cannot find module 'xlsx'` u otro módulo faltante

**Causa:** El `npm install` no se ejecutó o se ejecutó en el directorio incorrecto.

```bash
cd /home/dstac/dstac-platform/apps/api
npm install

cd /home/dstac/dstac-platform/apps/web
npm install
```

### Error: `NetworkError when attempting to fetch resource`

**Causa:** El frontend no puede alcanzar el API. Puede ser CORS, URL incorrecta, o el API no está corriendo.

Verificar en orden:
1. `pm2 status` — el proceso `dstac-api` debe estar `online`
2. `curl http://127.0.0.1:3001/api/health` — debe responder desde el servidor
3. Revisar que `NEXT_PUBLIC_API_URL` en `apps/web/.env.local` apunta al dominio correcto con HTTPS
4. Revisar que `FRONTEND_URL` en `apps/api/.env` coincide con el dominio del frontend (necesario para CORS)

### El módulo NIST o ISO "se inicializa pero no muestra datos"

**Causa:** Las tablas de los marcos de referencia están vacías. Ocurre cuando se hace la migración pero no el seeding de los frameworks.

```bash
cd /home/dstac/dstac-platform/apps/api
node db/seed_nist.js
node db/seed_iso.js
```

Verificar con:
```bash
mysql -u dstac_user -p -h 127.0.0.1 db_dstac_core \
  -e "SELECT COUNT(*) FROM nist_controls; SELECT COUNT(*) FROM iso_controls;"
```

### El correo MFA no llega

Verificar la configuración SMTP:

```bash
cd /home/dstac/dstac-platform/apps/api
node -e "
  const nodemailer = require('nodemailer')
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
  require('dotenv').config()
  t.verify((err, ok) => console.log(err || 'SMTP OK'))
"
```

Si el error es de certificado SSL del SMTP, agregar al `.env`:
```env
SMTP_TLS_REJECT_UNAUTHORIZED=false
```

### Nginx devuelve 502 Bad Gateway

**Causa:** Nginx está arriba pero Node.js no está escuchando en el puerto esperado.

```bash
# Ver si los procesos están corriendo
pm2 status

# Ver logs de errores
pm2 logs dstac-api --lines 20
pm2 logs dstac-web --lines 20

# Ver el log de Nginx
sudo tail -30 /var/log/nginx/dstac_error.log
```

### El build de Next.js falla con error de memoria

**Causa:** El VPS tiene poca RAM disponible.

```bash
# Aumentar la memoria disponible para Node durante el build
cd /home/dstac/dstac-platform/apps/web
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

---

## Proceso completo de actualización (deploy de nuevas versiones)

```bash
cd /home/dstac/dstac-platform

# 1. Backup preventivo
mysqldump -u dstac_user -p -h 127.0.0.1 db_dstac_core \
  > /home/dstac/backups/db_core_pre_deploy_$(date +%Y%m%d_%H%M%S).sql

# 2. Obtener los últimos cambios
git pull origin main

# 3. Instalar nuevas dependencias (si las hay)
cd apps/api && npm install --production && cd ../..
cd apps/web && npm install && cd ../..

# 4. Ejecutar migraciones (idempotentes, seguro de re-ejecutar)
node apps/api/db/setup.js

# 5. Rebuild del frontend
cd apps/web && npm run build && cd ../..

# 6. Reiniciar procesos sin downtime
pm2 reload all

# 7. Verificar
pm2 status
curl https://tudominio.cl/api/health
```

---

*Guía generada para DSTAC Platform — Versión MVP. Actualizar este documento ante cualquier cambio de infraestructura o arquitectura.*
