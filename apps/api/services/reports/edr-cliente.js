// Informe EDR para enviar al cliente — explica en lenguaje simple (sin
// jerga técnica) qué tipo de cosas detecta su protección y qué se hizo por
// ellos en el último mes. Mismo estilo visual que el informe ejecutivo /
// el escaneo web gratuito (template.js: card-dark, finding-item, cta-box).
//
// v2: en vez de mostrar siempre el mismo texto educativo genérico en la
// página 2, cada categoría ahora lleva el número real del cliente debajo
// (ej. "detectamos 14 intentos, bloqueamos 9 solos") y se agrega un
// veredicto general arriba y una lista de equipos que necesitan atención
// (score CIS bajo), para que el informe se sienta hecho para ellos.
const {
  buildHeader, buildFooter, buildMetricCard, colorFor, wrapDocument,
} = require('./template')

function esc(s) {
  if (s == null) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Traducción de tácticas MITRE ATT&CK a una frase plana, sin la sigla técnica.
const MITRE_PLAIN = {
  'Initial Access':        'intentos de entrar por una puerta no autorizada',
  'Execution':              'programas tratando de ejecutarse sin permiso',
  'Persistence':            'intentos de quedarse instalado de forma permanente',
  'Privilege Escalation':   'intentos de obtener más permisos de los que corresponde',
  'Defense Evasion':        'intentos de pasar desapercibido ante la protección',
  'Credential Access':      'intentos de robar contraseñas o credenciales',
  'Discovery':              'actividad de "reconocimiento" del equipo o la red',
  'Lateral Movement':       'intentos de saltar de un equipo a otro',
  'Collection':             'recolección de información del equipo',
  'Command and Control':    'comunicación sospechosa hacia afuera',
  'Exfiltration':           'intentos de sacar información del equipo',
  'Impact':                 'actividad que podría afectar la operación del equipo',
  'Reconnaissance':         'actividad de reconocimiento previo a un posible ataque',
  'Resource Development':   'preparación de herramientas para un posible ataque',
}
function mitrePlain(label) {
  return MITRE_PLAIN[label] || 'actividad fuera del patrón normal del equipo'
}

function veredicto(d) {
  if (d.criticas30 > 0) {
    return { texto: 'Hubo actividad crítica este mes — revisa el detalle más abajo', color: '#DC2626', bg: '#FCEBEB', icon: '!' }
  }
  if (d.equiposAtencion.length > 0) {
    return { texto: `${d.equiposAtencion.length} equipo${d.equiposAtencion.length > 1 ? 's' : ''} necesita${d.equiposAtencion.length > 1 ? 'n' : ''} reforzar su configuración`, color: '#D97706', bg: '#FFFBF0', icon: '◐' }
  }
  if (d.altas30 > 5) {
    return { texto: 'Actividad por sobre lo normal este mes, pero bajo control', color: '#D97706', bg: '#FFFBF0', icon: '◐' }
  }
  return { texto: 'Todo en orden — sin alertas críticas este mes', color: '#1D9E75', bg: '#EAF3DE', icon: '✓' }
}

async function getData(tenantDB, centralDB, companyId, company) {
  const [[ag]] = await centralDB.query(
    `SELECT COUNT(*) total, SUM(status='active') activos FROM edr_agents WHERE company_id = ?`, [companyId])

  const [[resumen30]] = await centralDB.query(`
    SELECT
      SUM(count) AS revisadas,
      SUM(CASE WHEN rule_id = 100120 THEN count ELSE 0 END) AS intentos_acceso,
      SUM(CASE WHEN rule_id IN (100110, 100130) THEN count ELSE 0 END) AS archivos_criticos,
      SUM(rule_level >= 12) AS criticas,
      SUM(rule_level BETWEEN 7 AND 11) AS altas
    FROM edr_alerts WHERE company_id = ? AND event_time >= (NOW() - INTERVAL 30 DAY)
  `, [companyId])

  const [[revisadasAnt]] = await centralDB.query(`
    SELECT SUM(count) AS revisadas FROM edr_alerts
    WHERE company_id = ? AND event_time >= (NOW() - INTERVAL 60 DAY) AND event_time < (NOW() - INTERVAL 30 DAY)
  `, [companyId])

  const [[resp30]] = await centralDB.query(`
    SELECT COUNT(*) total, SUM(action='bloqueo_auto') automaticas
    FROM edr_responses WHERE company_id = ? AND created_at >= (NOW() - INTERVAL 30 DAY)
  `, [companyId])

  // CIS/SCA por equipo (última lectura de cada agente) — para listar cuáles
  // necesitan reforzar su configuración, no solo el promedio general.
  const [scaRows] = await centralDB.execute(`
    SELECT a.agent_name,
           JSON_UNQUOTE(JSON_EXTRACT(a.raw,'$.data.sca.score')) + 0 AS score
    FROM edr_alerts a JOIN (
      SELECT wazuh_id, MAX(id) mid FROM edr_alerts
      WHERE rule_id=19004 AND company_id=? GROUP BY wazuh_id) l ON l.mid=a.id
  `, [companyId])
  const equipos = scaRows
    .map(r => ({ nombre: r.agent_name, score: Number(r.score) || 0 }))
    .filter(e => e.nombre)
  const cisPromedio = equipos.length
    ? Math.round(equipos.reduce((s, e) => s + e.score, 0) / equipos.length)
    : null
  const equiposAtencion = equipos.filter(e => e.score < 70).sort((a, b) => a.score - b.score).slice(0, 5)

  // Tácticas MITRE más frecuentes del mes, en lenguaje plano (sin nombrar la sigla técnica al cliente).
  const [mitreRows] = await centralDB.execute(`
    SELECT mitre_tactics FROM edr_alerts
    WHERE company_id = ? AND event_time >= (NOW() - INTERVAL 30 DAY) AND mitre_tactics IS NOT NULL
  `, [companyId])
  const tacticCount = {}
  mitreRows.forEach(r => {
    let arr = r.mitre_tactics
    if (typeof arr === 'string') { try { arr = JSON.parse(arr) } catch { arr = [] } }
    if (Array.isArray(arr)) arr.forEach(t => { tacticCount[t] = (tacticCount[t] || 0) + 1 })
  })
  const tacticaTop = Object.entries(tacticCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const [[red]] = await centralDB.query(`
    SELECT COUNT(*) total, SUM(ultima_vez >= (NOW()-INTERVAL 3 MINUTE)) conectados
    FROM edr_network_devices WHERE company_id = ?`, [companyId])

  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    ag: ag || {},
    revisadas: Number(resumen30?.revisadas) || 0,
    revisadasAnterior: Number(revisadasAnt?.revisadas) || 0,
    intentosAcceso: Number(resumen30?.intentos_acceso) || 0,
    archivosCriticos: Number(resumen30?.archivos_criticos) || 0,
    criticas30: Number(resumen30?.criticas) || 0,
    altas30: Number(resumen30?.altas) || 0,
    correccionesAuto: Number(resp30?.automaticas) || 0,
    correccionesTotal: Number(resp30?.total) || 0,
    cisPromedio,
    equipos,
    equiposAtencion,
    tacticaTop,
    red: red || {},
  }
}

// Datos ilustrativos para usar como muestra comercial (ej. adjunta a una
// cotización de un prospecto que aún no tiene el EDR instalado) — números de
// ejemplo, nunca se presentan como reales (ver bandera esMuestra en buildHTML).
function getDemoData() {
  return {
    company: { name: 'Tu empresa' },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    ag: { activos: 8, total: 8 },
    revisadas: 1284,
    revisadasAnterior: 1190,
    intentosAcceso: 14,
    archivosCriticos: 2,
    criticas30: 0,
    altas30: 3,
    correccionesAuto: 6,
    correccionesTotal: 9,
    cisPromedio: 82,
    equipos: [
      { nombre: 'RECEPCION-PC', score: 88 },
      { nombre: 'CONTABILIDAD-01', score: 91 },
      { nombre: 'NOTEBOOK-GERENCIA', score: 58 },
    ],
    equiposAtencion: [{ nombre: 'NOTEBOOK-GERENCIA', score: 58 }],
    tacticaTop: 'Discovery',
    red: { total: 11, conectados: 9 },
    esMuestra: true,
  }
}

function buildHTML(data) {
  const { company, fecha, ag } = data
  const cisColor = data.cisPromedio != null ? colorFor(data.cisPromedio) : '#B4B2A9'
  const v = veredicto(data)

  const trendRevisadas = data.revisadasAnterior > 0
    ? Math.round(((data.revisadas - data.revisadasAnterior) / data.revisadasAnterior) * 100)
    : null

  const categorias = [
    {
      titulo: 'Alguien tratando de entrar sin permiso',
      color: '#DC2626',
      texto: 'Si alguien intenta adivinar la contraseña de un computador muchas veces seguidas, lo detectamos al instante. En los casos más claros, el sistema bloquea esa conexión solo, sin esperar a que una persona reaccione.',
      dato: data.intentosAcceso > 0
        ? `Este mes: ${data.intentosAcceso} intento${data.intentosAcceso !== 1 ? 's' : ''} detectado${data.intentosAcceso !== 1 ? 's' : ''}${data.correccionesAuto > 0 ? `, ${data.correccionesAuto} bloqueado${data.correccionesAuto !== 1 ? 's' : ''} automáticamente` : ''}.`
        : 'Este mes: sin intentos detectados.',
    },
    {
      titulo: 'Cambios en archivos importantes del sistema',
      color: '#D97706',
      texto: 'Vigilamos los archivos más sensibles de cada computador (los que controlan quién puede entrar y qué permisos tiene). Si alguien los modifica sin autorización, te avisamos de inmediato — puede ser señal de que alguien está intentando tomar control del equipo.',
      dato: data.archivosCriticos > 0
        ? `Este mes: ${data.archivosCriticos} cambio${data.archivosCriticos !== 1 ? 's' : ''} detectado${data.archivosCriticos !== 1 ? 's' : ''} y revisado${data.archivosCriticos !== 1 ? 's' : ''} por el equipo de DSTAC.`
        : 'Este mes: sin cambios sospechosos detectados.',
    },
    {
      titulo: 'Actividad rara o fuera de lo normal',
      color: '#534AB7',
      texto: 'Cada computador tiene un comportamiento "normal". Si algo se sale de ese patrón — un programa raro, un proceso que no debería estar ahí — se genera una alerta para que el equipo de DSTAC la revise.',
      dato: data.tacticaTop
        ? `Lo más frecuente este mes: ${mitrePlain(data.tacticaTop)}.`
        : 'Este mes: sin actividad fuera de lo normal.',
    },
    {
      titulo: 'Qué tan bien configurado está cada equipo',
      color: '#0F6E56',
      texto: 'Revisamos automáticamente la configuración de seguridad de cada computador contra un estándar internacional (CIS), y te mostramos un puntaje simple de qué tan protegido está cada uno — como una "nota" de salud del equipo.',
      dato: data.cisPromedio != null
        ? `Promedio de tus equipos: ${data.cisPromedio}%${data.equiposAtencion.length > 0 ? ` — ${data.equiposAtencion.length} necesita${data.equiposAtencion.length > 1 ? 'n' : ''} revisión (detalle abajo)` : ', todos en buen nivel'}.`
        : 'Aún no hay suficientes datos de configuración.',
    },
    {
      titulo: 'Qué otros equipos están en tu red',
      color: '#185FA5',
      texto: 'Detectamos qué otros dispositivos están conectados a la misma red — router, impresoras, celulares — sin necesidad de instalarles nada. Así puedes notar fácilmente si aparece algo que no reconoces.',
      dato: `${Number(data.red.total) || 0} dispositivos detectados, ${Number(data.red.conectados) || 0} conectados ahora.`,
    },
    {
      titulo: 'Reacción automática ante lo más grave',
      color: '#1D9E75',
      texto: 'Cuando detectamos algo realmente serio, el sistema puede actuar solo (por ejemplo, bloqueando la conexión de un atacante) en segundos — mucho antes de que una persona pueda revisarlo a mano.',
      dato: data.correccionesTotal > 0
        ? `Este mes: ${data.correccionesTotal} acción${data.correccionesTotal !== 1 ? 'es' : ''} tomada${data.correccionesTotal !== 1 ? 's' : ''}, ${data.correccionesAuto} de forma automática.`
        : 'Este mes: no fue necesario actuar.',
    },
  ]

  const catRows = categorias.map(c => `
    <div class="finding-item" style="border-left:3px solid ${c.color};flex-direction:column;align-items:stretch;gap:4px;">
      <div style="font-size:13px;font-weight:700;color:#2C2C2A;">${c.titulo}</div>
      <div style="font-size:12px;color:#444441;line-height:1.55;">${c.texto}</div>
      <div style="font-size:11.5px;color:${c.color};font-weight:700;margin-top:4px;">${esc(c.dato)}</div>
    </div>`).join('')

  const equiposAtencionHTML = data.equiposAtencion.length > 0 ? `
    <div class="card" style="margin-top:14px;border-left:3px solid #D97706;">
      <div style="font-size:12.5px;font-weight:700;color:#854F0B;margin-bottom:8px;">Equipos que conviene revisar</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${data.equiposAtencion.map(e => `
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#444441;">
            <span>${esc(e.nombre)}</span>
            <span style="font-weight:700;color:${colorFor(e.score)};">${e.score}%</span>
          </div>`).join('')}
      </div>
      <div style="font-size:11px;color:#888780;margin-top:8px;line-height:1.5;">
        Tienen una configuración de seguridad más débil que el resto — no significa que estén comprometidos,
        pero conviene reforzarlos. El equipo de DSTAC puede hacerlo por ti.
      </div>
    </div>` : ''

  const page1 = `
<div class="page">
  ${buildHeader('Protección EDR · Resumen')}
  <div class="page-body">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div class="title">¿Qué hace tu protección EDR?</div>
        <div class="subtitle">Resumen simple para ${esc(company.name)}</div>
      </div>
      ${data.esMuestra ? `<span style="background:#FAEEDA;color:#854F0B;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:5px 12px;border-radius:20px;white-space:nowrap;margin-top:4px;">Muestra ilustrativa</span>` : ''}
    </div>

    <div style="background:${v.bg};border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;margin-bottom:18px;">
      <span style="width:28px;height:28px;border-radius:50%;background:${v.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;">${v.icon}</span>
      <span style="font-size:13px;font-weight:700;color:${v.color};">${esc(v.texto)}</span>
    </div>

    <div class="card" style="margin-bottom:22px;">
      <div style="font-size:12.5px;color:#444441;line-height:1.6;">
        Tu protección <b>EDR</b> es un programa instalado en tus computadores que los vigila las 24 horas del día,
        los 7 días de la semana. No espera a que pase algo malo para reaccionar — está siempre mirando, y cuando
        detecta algo extraño, avisa al equipo de DSTAC (y en los casos más graves, actúa solo).
      </div>
    </div>

    <div class="card-dark">
      <div><span style="font-size:60px;font-weight:900;color:#7C4FDA;line-height:1;">${data.revisadas}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">eventos revisados en los últimos 30 días</div>
        ${trendRevisadas != null ? `<div style="font-size:10.5px;color:rgba(255,255,255,0.35);margin-top:3px;">${trendRevisadas >= 0 ? '+' : ''}${trendRevisadas}% vs. el mes anterior</div>` : ''}
      </div>
      <div style="text-align:right;"><div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px;">Bloqueos automáticos</div>
        <div style="background:#0F6E56;color:white;padding:10px 22px;border-radius:40px;font-size:16px;font-weight:700;">${data.correccionesAuto}</div></div>
    </div>

    <div class="sec-label">En números</div>
    <div class="grid-3" style="margin-bottom:6px;">
      ${buildMetricCard(`${Number(ag.activos) || 0}/${Number(ag.total) || 0}`, 'Equipos protegidos', 'conectados ahora', '#1D9E75')}
      ${buildMetricCard(data.intentosAcceso, 'Intentos de acceso', 'detectados (30 días)', '#DC2626')}
      ${buildMetricCard(Number(data.red.total) || 0, 'Equipos en tu red', `${Number(data.red.conectados) || 0} conectados ahora`, '#185FA5')}
    </div>
    ${data.cisPromedio != null ? `
    <div class="card" style="margin-top:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12.5px;color:#444441;">Salud promedio de la configuración de tus equipos (CIS)</span>
        <span style="font-size:18px;font-weight:800;color:${cisColor};">${data.cisPromedio}%</span>
      </div>
    </div>` : ''}
    ${equiposAtencionHTML}
  </div>
  ${buildFooter(1, 2)}
</div>`

  const page2 = `
<div class="page">
  ${buildHeader('Protección EDR · Qué detectamos')}
  <div class="page-body">
    <div class="title">¿Qué tipo de cosas detectamos?</div>
    <div class="subtitle">Explicado sin tecnicismos, con tus números de este mes</div>

    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">
      ${catRows}
    </div>

    <div class="cta-box">
      <div style="font-size:16px;font-weight:700;margin-bottom:10px;line-height:1.3;">
        Tú no tienes que estar mirando esto todos los días.
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);line-height:1.6;margin-bottom:14px;">
        El equipo de DSTAC revisa estas alertas por ti y te avisa solo cuando algo realmente requiere tu atención.
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.55);letter-spacing:0.8px;text-transform:uppercase;">
        Cualquier duda, escríbenos · contacto@dstac.cl
      </div>
    </div>

    <div style="margin-top:16px;font-size:10px;color:#B4B2A9;line-height:1.5;">
      ${data.esMuestra
        ? 'Esta es una muestra ilustrativa del informe que recibirías — los números son de ejemplo, no corresponden a datos reales de ningún cliente. El informe real se genera con los datos de tu propia protección EDR (Wazuh), administrada por DSTAC Ciberseguridad.'
        : `Informe generado automáticamente el ${fecha} con los datos actuales de tu protección EDR (Wazuh), administrada por DSTAC Ciberseguridad.`}
    </div>
  </div>
  ${buildFooter(2, 2)}
</div>`

  return wrapDocument(page1 + page2)
}

module.exports = { getData, getDemoData, buildHTML }
