# MDM Android — Puesta en marcha (Android Management API)

El módulo MDM gestiona teléfonos **Android** desde `portal.dstac.cl`. El portal
**nunca habla directamente con el teléfono**: habla con **Google** (Android
Management API), y Google empuja las políticas/comandos al dispositivo vía FCM.

> El teléfono se conecta a Google (FCM). Tú lo gestionas a través de la API de
> Google usando una *service account*. La inscripción se hace por **QR**.

## Costo

- **Android Management API + FCM + app agente (Android Device Policy):** gratis,
  Google no cobra por dispositivo ni por mensaje.
- Solo pagas tu VPS (ya lo tienes) y horas de desarrollo.
- iOS es una fase futura aparte (requiere cuenta Apple Developer ~US$99/año).

---

## Pasos (una sola vez)

Estos pasos los hace una persona, no se pueden automatizar desde el código:

1. **Proyecto en Google Cloud**
   - Entra a <https://console.cloud.google.com> → crea un proyecto (ej. `dstac-mdm`).

2. **Habilitar la API**
   - APIs y servicios → Biblioteca → busca **"Android Management API"** → *Habilitar*.

3. **Service account + clave JSON**
   - IAM y administración → Cuentas de servicio → *Crear cuenta de servicio*
     (ej. `mdm-portal`).
   - En la cuenta creada → *Claves* → *Agregar clave* → *JSON* → descarga el archivo.

4. **Crear la Enterprise de DSTAC**
   - La Enterprise (la "empresa Android" de DSTAC) se crea una vez. La forma más
     simple es con el script de ayuda incluido (usa la misma service account):

     ```bash
     # dentro del contenedor api, con MDM_SA_JSON ya seteada:
     node apps/api/db/mdm_signup.js      # imprime una URL de registro
     ```
     Abre la URL, completa el alta de *Managed Google Play* (gratis, no requiere
     Google Workspace) y el script te devuelve el identificador
     `enterprises/LC0xxxxxxxx`.

   > Si prefieres, este alta también se puede hacer desde la
   > [guía oficial](https://developers.google.com/android/management/quickstart).

5. **Variables de entorno del servicio `api`** (EasyPanel → api → Entorno)

   ```
   MDM_ENTERPRISE = enterprises/LC0xxxxxxxx
   MDM_SA_JSON    = {"type":"service_account", ... }   # el JSON del paso 3, en una línea
   ```

   *(Alternativa a `MDM_SA_JSON`: montar el archivo y usar
   `GOOGLE_APPLICATION_CREDENTIALS=/ruta/al.json`.)*

6. **Migrar la base de datos** (crea las tablas del módulo)

   ```bash
   node apps/api/db/migrate_mdm.js
   ```

7. **Redeploy** de `api` y `web` en EasyPanel.

---

## Uso en el portal

1. Menú lateral → **MDM Móviles** (con una empresa seleccionada).
2. **+ Inscribir dispositivo** → genera un **QR**.
3. En un teléfono **restaurado de fábrica**: toca 6 veces la pantalla de
   bienvenida → escanea el QR → queda gestionado por DSTAC.
4. **↻ Sincronizar** trae los dispositivos desde Google.
5. Por dispositivo: **Bloquear**, **resetear PIN**, **Reiniciar**, **Borrar**
   (restaura de fábrica). Todo se ejecuta vía Google → FCM → teléfono.

## Multi-empresa

El QR lleva incrustado el identificador de la empresa (`additionalData`). Cuando
un teléfono se inscribe, ese dato viaja con él, y el portal lo asigna
automáticamente a la empresa correcta. Cada empresa solo ve sus dispositivos.

## Límites del MVP

- Solo Android (iOS = fase futura con certificado Apple/APNs).
- Política base única (`baseline`: exige PIN + reporte de estado). Las políticas
  por empresa/avanzadas (apps permitidas, geocerca, modo kiosko) son un siguiente
  paso.
- Sin "ubicación en tiempo real" todavía (requiere modo perdido / lost mode).
