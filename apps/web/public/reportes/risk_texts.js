// ============================================================
// DSTAC · Textos de RIESGO condicionales por estado detectado
// Fuente única usada por el PDF del scanner público (app.js) y
// por el informe completo (report_gen.js). NO duplicar textos.
// dstacRisk(key, status, value) -> string (vacío si SECURE)
// ============================================================
(function(global){
  function norm(v){ return String(v==null?'':v).toLowerCase(); }
  function isMissing(v){
    v = norm(v);
    return v==='' || v==='—' || /faltante|no configurad|no detectad|^sin |sin registros|ausen/.test(v);
  }
  function dstacRisk(key, status, value){
    if (status === 'SECURE') return '';
    var v = norm(value);
    var miss = isMissing(v);
    switch (key) {
      case 'hsts':
        return 'Sin HSTS, la conexión puede degradarse a HTTP no cifrado, exponiendo credenciales y cookies de sesión a interceptación en redes no confiables.';
      case 'csp':
        return 'Sin una Política de Seguridad de Contenido se pierde control sobre los recursos que ejecuta el navegador, incrementando el riesgo de scripts no autorizados (XSS) y fuga de información.';
      case 'xframe': case 'xfo':
        return 'Sin X-Frame-Options el sitio puede incrustarse en dominios de terceros, habilitando la suplantación de la interfaz (clickjacking).';
      case 'xcontent': case 'xcto':
        return 'Sin X-Content-Type-Options el navegador puede interpretar archivos con un tipo distinto al declarado, permitiendo la ejecución de contenido malicioso (MIME sniffing).';
      case 'referrer': case 'refpol':
        return 'Sin Referrer-Policy pueden divulgarse direcciones internas e identificadores de sesión hacia destinos externos.';
      case 'permissions': case 'permpol':
        return 'Sin Permissions-Policy, componentes de terceros pueden acceder a dispositivos sensibles (cámara, micrófono, ubicación) del usuario.';
      case 'coop':
        return 'Sin COOP, otras ventanas mantienen referencias al contexto de navegación, debilitando el aislamiento entre orígenes.';
      case 'corp':
        return 'Sin CORP, los recursos del dominio pueden ser solicitados desde orígenes externos no autorizados.';
      case 'cookies':
        return miss
          ? 'Sin atributos de seguridad en las cookies, las sesiones pueden robarse o enviarse en contextos cruzados.'
          : 'Faltan atributos de seguridad en las cookies, lo que facilita el robo de sesión o su envío en sitios cruzados.';
      case 'disclosure':
        return 'La exposición de versiones de servidor y lenguaje facilita al atacante identificar y buscar exploits conocidos para esas versiones.';
      case 'eol':
        return 'El software detectado está fuera de soporte y no recibe parches de seguridad: las vulnerabilidades descubiertas no se corrigen y quedan disponibles para ataque.';
      case 'spf':
        if (miss) return 'Sin registro SPF, cualquier servidor puede enviar correo en nombre del dominio, facilitando campañas de phishing hacia clientes y socios.';
        if (/~all/.test(v)) return 'El SPF usa «~all» (softfail): el correo no autorizado se marca pero no se rechaza, dejando margen para la suplantación del dominio.';
        return 'El SPF no cierra la política con «-all»: no protege de forma estricta contra el envío de correo suplantando el dominio.';
      case 'dmarc':
        if (miss) return 'Sin política DMARC, los correos que suplantan el dominio no pueden rechazarse, exponiendo a la organización a fraude por suplantación y deterioro de su reputación.';
        if (/p=none/.test(v)) return 'DMARC en «p=none» solo monitorea: detecta el abuso pero no bloquea los correos que suplantan el dominio.';
        return 'La política DMARC aún no aplica rechazo total: existe margen para que correos suplantados lleguen al destinatario.';
      case 'dkim':
        return miss
          ? 'No se detectó DKIM en selectores comunes; si no está configurado, los correos enviados no pueden firmarse ni verificarse, facilitando su alteración o suplantación.'
          : 'La configuración DKIM es parcial: conviene verificar que la firma esté activa para todos los emisores legítimos.';
      case 'mx':
        return 'Sin registros MX el dominio no recibe correo; si tampoco lo envía, conviene una política SPF/DMARC de rechazo total para impedir su uso en suplantación.';
      default:
        return '';
    }
  }
  global.dstacRisk = dstacRisk;
})(typeof window!=='undefined' ? window : global);
