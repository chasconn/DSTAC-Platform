// services/contratos/template.js — texto del Contrato de Prestación de
// Servicios de Ciberseguridad y Autorización de Intervención. Revisado para
// ajustarse a: Ley N° 19.799 (firma electrónica), Ley N° 21.459 (delitos
// informáticos, exige autorización expresa del titular del sistema para
// intervenir sus redes — art. 16), Ley N° 21.719 (protección de datos
// personales) y al Código Civil (no se puede eximir el dolo ni la culpa
// grave, art. 1465 CC, por eso la cláusula de responsabilidad excluye daños
// indirectos en vez de intentar eximir negligencia grave).
//
// El HTML devuelto por renderContrato() es exactamente el que se guarda en
// `contratos.contenido_html` y sobre el que se calcula el hash al firmar —
// no debe cambiar entre la vista previa y la firma real.

const FCLP = (n) => '$' + (Number(n) || 0).toLocaleString('es-CL')

function fila(label, value) {
  const v = value && String(value).trim() ? value : '<span style="color:#B23B3B;font-weight:700;">[COMPLETAR]</span>'
  return `<div style="margin-bottom:3px;"><b>${label}:</b> ${v}</div>`
}

function parteComparece(nombre, rol, p) {
  return `
  <div style="margin-bottom:10px;">
    <div style="font-weight:700;margin-bottom:4px;">${nombre}</div>
    ${fila('RUT', p.rut)}
    ${fila('Domicilio', p.domicilio)}
    ${fila('Representante legal', p.representante_legal)}
    ${fila('RUT representante', p.representante_legal_rut)}
    ${fila('Cargo / personería', p.representante_legal_cargo)}
    <div style="margin-top:4px;color:#6A675E;">en adelante, "${rol}"</div>
  </div>`
}

function filaAlcance(a) {
  return `<tr>
    <td style="padding:6px 8px;border:1px solid #ddd;font-size:11.5px;">${a.activo || ''}</td>
    <td style="padding:6px 8px;border:1px solid #ddd;font-size:11.5px;">${a.tipo_prueba || ''}</td>
    <td style="padding:6px 8px;border:1px solid #ddd;font-size:11.5px;">${a.periodo || ''}</td>
    <td style="padding:6px 8px;border:1px solid #ddd;font-size:11.5px;">${a.horario || ''}</td>
  </tr>`
}

function bloqueFirma(rol, firma) {
  if (!firma) {
    return `<div style="margin-top:34px;">
      <div style="border-top:1px solid #2C2C2A;width:240px;margin-bottom:6px;"></div>
      <div style="font-size:11.5px;color:#888780;">Por ${rol} — pendiente de firma</div>
    </div>`
  }
  const fecha = firma.fecha ? new Date(firma.fecha).toLocaleString('es-CL') : ''
  return `<div style="margin-top:18px;background:#EAF3DE;border:1px solid #C0DD97;border-radius:8px;padding:12px 14px;">
    <div style="font-weight:700;color:#27500A;margin-bottom:4px;">✓ Firmado electrónicamente — ${rol}</div>
    <div style="font-size:11.5px;color:#27500A;">
      ${firma.nombre || ''} · RUT ${firma.rut || ''} ${firma.cargo ? `· ${firma.cargo}` : ''}<br/>
      ${fecha} · IP ${firma.ip || '—'}<br/>
      Hash del documento firmado: <code style="word-break:break-all;">${firma.hash || '—'}</code>
    </div>
  </div>`
}

function renderContrato(data) {
  const { numero, fecha, dstac, cliente, cotizacion, alcance = [], codigoVerificacion, firmaDstac, firmaCliente } = data
  const alcanceFilas = alcance.length
    ? alcance.map(filaAlcance).join('')
    : `<tr><td colspan="4" style="padding:8px;border:1px solid #ddd;font-size:11.5px;color:#B23B3B;font-weight:700;">[COMPLETAR — describir IPs/dominios/VLANs específicos autorizados, no usar términos genéricos]</td></tr>`

  return `
<div style="font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;line-height:1.55;font-size:12.5px;max-width:760px;margin:0 auto;padding:40px 10px;">

  <div style="text-align:center;margin-bottom:26px;">
    <div style="font-size:16px;font-weight:700;letter-spacing:0.3px;">CONTRATO DE PRESTACIÓN DE SERVICIOS DE CIBERSEGURIDAD</div>
    <div style="font-size:16px;font-weight:700;letter-spacing:0.3px;">Y AUTORIZACIÓN DE INTERVENCIÓN DE SISTEMAS</div>
    <div style="font-size:11px;color:#6A675E;margin-top:8px;">N° ${numero || '—'} · Antofagasta, Chile, ${fecha || '[FECHA DE FIRMA]'}</div>
  </div>

  <p>En Antofagasta, Chile, a ${fecha || '[FECHA DE FIRMA]'}, entre:</p>

  ${parteComparece('(a) ' + (dstac.razon_social || 'DSTAC CIBERSEGURIDAD'), 'el Prestador', dstac)}
  ${parteComparece('(b) ' + (cliente.razon_social || '—'), 'el Cliente', cliente)}

  <p>se ha convenido el siguiente contrato de prestación de servicios de ciberseguridad, que se regirá por las cláusulas siguientes:</p>

  <p><b>PRIMERO: ANTECEDENTES Y OBJETO DEL CONTRATO.</b> El Prestador es una empresa especializada en
  servicios de ciberseguridad, que cuenta con los medios técnicos y profesionales para prestar al Cliente
  los servicios descritos en el Anexo A del presente contrato (en adelante, los "Servicios"), los cuales
  podrán incluir, según se especifique en dicho Anexo: diagnóstico de madurez, gestión de vulnerabilidades,
  monitoreo y respuesta a incidentes (EDR/XDR), pruebas de penetración (pentest), auditorías técnicas,
  hardening de infraestructura, capacitación y/o asesoría en cumplimiento normativo (Ley N° 21.663 y
  Ley N° 21.719).${cotizacion ? ` El detalle y valor de los Servicios constan en la Cotización N° ${cotizacion.numero}, la cual forma parte integrante del presente contrato.` : ''}</p>

  <p><b>SEGUNDO: ALCANCE DEL SERVICIO Y AUTORIZACIÓN EXPRESA DE INTERVENCIÓN.</b> El Cliente autoriza de
  forma expresa, voluntaria e inequívoca al Prestador y a su personal debidamente acreditado para acceder,
  intervenir, escanear, monitorear, explotar vulnerabilidades y/o ejecutar las pruebas de seguridad que se
  detallan en el Anexo A ("Alcance Autorizado"), sobre los sistemas, redes, equipos, aplicaciones y demás
  activos digitales de titularidad del Cliente o bajo su administración, dentro de los plazos, horarios y
  condiciones ahí especificados.</p>

  <p>Esta autorización constituye la autorización del titular del sistema a que se refiere el artículo 16
  y siguientes de la Ley N° 21.459, que establece normas sobre delitos informáticos, y exime al Prestador
  y a su personal de toda responsabilidad penal o civil derivada del acceso a los sistemas, redes y datos
  descritos en el Anexo A, en la medida que dicho acceso se realice dentro del Alcance Autorizado y conforme
  a los términos del presente contrato.</p>

  <p>El Cliente declara conocer y aceptar expresamente que la ejecución de actividades de ciberseguridad, en
  especial las pruebas de penetración (pentest) y explotación de vulnerabilidades, conllevan un riesgo
  intrínseco de inestabilidad, degradación de rendimiento o interrupción temporal de los sistemas
  intervenidos. En consecuencia, el Cliente asume dicho riesgo técnico y exime al Prestador de toda
  responsabilidad por interrupciones de servicio, pérdida de datos o indisponibilidad que ocurran dentro
  del Alcance Autorizado, siendo obligación del Cliente mantener respaldos (backups) actualizados y
  operativos antes del inicio de los Servicios.</p>

  <p>Toda actividad, sistema, red, equipo o activo digital que no esté incluido expresamente en el Anexo A
  se entiende fuera del Alcance Autorizado, y el Prestador se obliga a no acceder a ellos sin contar con
  autorización adicional y específica del Cliente, otorgada por escrito.</p>

  <p><b>TERCERO: CONFIDENCIALIDAD.</b> El Prestador se obliga a mantener estricta confidencialidad respecto
  de toda la información, hallazgos, vulnerabilidades y datos a los que acceda con ocasión de la prestación
  de los Servicios, y a no divulgarlos a terceros sin autorización previa y escrita del Cliente, salvo
  requerimiento de autoridad competente. Esta obligación se mantendrá vigente por 3 años desde el término
  del presente contrato.</p>

  <p><b>CUARTO: TRATAMIENTO DE DATOS PERSONALES.</b> En caso de que la prestación de los Servicios implique
  el tratamiento de datos personales de titulares del Cliente, el Prestador actuará en calidad de encargado
  de tratamiento bajo la Ley N° 21.719 sobre Protección de Datos Personales. En tal condición, el Prestador
  se obliga a: (a) tratar dichos datos única y exclusivamente conforme a las instrucciones escritas del
  Cliente y para los fines del presente contrato; (b) implementar las medidas de seguridad técnicas y
  organizativas adecuadas para protegerlos; y (c) notificar al Cliente, a la brevedad posible y a más tardar
  dentro de las 24 horas siguientes a su detección, cualquier violación de seguridad de los datos de la cual
  tome conocimiento, cooperando activamente en su mitigación.</p>

  <p><b>QUINTO: PRECIO Y FORMA DE PAGO.</b> ${cotizacion
    ? `El precio de los Servicios es de ${FCLP(cotizacion.total)} (neto ${FCLP(cotizacion.neto)} + IVA ${FCLP(cotizacion.iva)}), conforme a la Cotización N° ${cotizacion.numero}. Forma de pago: ${cotizacion.forma_pago || '[COMPLETAR EN LA COTIZACIÓN]'}.`
    : '[COMPLETAR — vincular este contrato a una cotización aceptada antes de enviarlo a firma]'}</p>

  <p><b>SEXTO: PLAZO Y VIGENCIA.</b> El presente contrato entrará en vigencia en la fecha de su suscripción
  y se mantendrá vigente por ${cotizacion?.plazo_ejecucion || '[COMPLETAR EN LA COTIZACIÓN]'}, pudiendo
  renovarse por acuerdo expreso y escrito de las partes.</p>

  <p><b>SÉPTIMO: LIMITACIÓN DE RESPONSABILIDAD.</b> Las partes acuerdan que el Prestador empleará la
  diligencia y los estándares profesionales de la industria en la ejecución de los Servicios. En ningún
  caso el Prestador será responsable ante el Cliente o terceros por daños indirectos, incidentales,
  especiales, punitivos, lucro cesante, pérdida de ingresos, de datos o de oportunidades de negocio,
  contractual o extracontractual. La responsabilidad total y agregada del Prestador por cualquier daño
  directo derivado de culpa leve en la prestación de los Servicios estará estrictamente limitada y no podrá
  exceder, bajo ninguna circunstancia, la suma total efectivamente pagada por el Cliente al Prestador bajo
  este contrato durante los 12 meses anteriores al hecho generador del daño.</p>

  <p><b>OCTAVO: PROPIEDAD DE LOS INFORMES.</b> Los informes, hallazgos y demás entregables generados por el
  Prestador en el marco de este contrato son de propiedad del Cliente para su uso interno, sin perjuicio de
  que el Prestador conserve el derecho a utilizar la metodología, herramientas y know-how empleados, de
  forma que no identifique al Cliente.</p>

  <p><b>NOVENO: TÉRMINO ANTICIPADO.</b> Cualquiera de las partes podrá terminar anticipadamente el presente
  contrato mediante aviso escrito con 15 días de anticipación, sin perjuicio del pago de los Servicios
  efectivamente prestados hasta esa fecha.</p>

  <p><b>DÉCIMO: DOMICILIO Y LEY APLICABLE.</b> Para todos los efectos legales derivados del presente
  contrato, las partes fijan domicilio en la ciudad de Antofagasta, Chile, y se someten a la jurisdicción de
  sus tribunales ordinarios de justicia.</p>

  <p><b>UNDÉCIMO: FIRMA ELECTRÓNICA.</b> Las partes declaran expresamente que el presente contrato podrá
  suscribirse mediante firma electrónica simple, en los términos del artículo 3° de la Ley N° 19.799 sobre
  Documentos Electrónicos, Firma Electrónica y Servicios de Certificación de dicha Firma, reconociendo que
  dicha firma producirá los mismos efectos que la firma manuscrita. El presente instrumento se entenderá
  válidamente suscrito desde el momento en que ambas partes lo hayan firmado electrónicamente a través de la
  plataforma del Prestador (portal.dstac.cl), previa autenticación de su cuenta de usuario, quedando
  registrados como evidencia de la manifestación de voluntad: el hash del documento firmado, la identidad
  del firmante (usuario autenticado), la fecha y hora, y la dirección IP desde la cual se efectuó la
  suscripción.</p>

  <p>Código de verificación pública de este contrato: <b>${codigoVerificacion || '—'}</b>
  (verificable en portal.dstac.cl/verificar — ingresa este código en el buscador de esa página).</p>

  <div style="display:flex;gap:40px;margin-top:30px;">
    <div style="flex:1;">${bloqueFirma('el Prestador', firmaDstac)}</div>
    <div style="flex:1;">${bloqueFirma('el Cliente', firmaCliente)}</div>
  </div>

  <div style="margin-top:40px;border-top:1px solid #2C2C2A;padding-top:14px;">
    <div style="font-weight:700;margin-bottom:8px;">ANEXO A — ALCANCE DEL SERVICIO Y AUTORIZACIÓN DE INTERVENCIÓN</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f1efe8;">
          <th style="padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:left;">Sistema/Red/Activo autorizado</th>
          <th style="padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:left;">Actividad autorizada</th>
          <th style="padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:left;">Período</th>
          <th style="padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:left;">Horario permitido</th>
        </tr>
      </thead>
      <tbody>${alcanceFilas}</tbody>
    </table>
    <div style="font-size:11px;color:#6A675E;margin-top:8px;">
      Importante: indicar IPs públicas, dominios/subdominios, segmentos de red (VLAN) o equipos específicos —
      nunca términos genéricos como "redes corporativas". Cualquier sistema no listado aquí queda fuera del
      Alcance Autorizado.
    </div>
  </div>

</div>`
}

module.exports = { renderContrato }
