// Informe EDR para enviar al cliente — explica en lenguaje simple (sin
// jerga técnica) qué tipo de cosas detecta su protección y qué se hizo por
// ellos en el último mes. Mismo estilo visual que el informe ejecutivo /
// el escaneo web gratuito (template.js: card-dark, finding-item, cta-box).
const {
  buildHeader, buildFooter, buildMetricCard, colorFor, wrapDocument,
} = require('./template')

function esc(s) {
  if (s == null) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function getData(tenantDB, centralDB, companyId, company) {
  const [[ag]] = await centralDB.query(
    `SELECT COUNT(*) total, SUM(status='active') activos FROM edr_agents WHERE company_id = ?`, [companyId])

  const [[resumen30]] = await centralDB.query(`
    SELECT
      SUM(count) AS revisadas,
      SUM(CASE WHEN rule_id = 100120 THEN count ELSE 0 END) AS intentos_acceso,
      SUM(CASE WHEN rule_id IN (100110, 100130) THEN count ELSE 0 END) AS archivos_criticos
    FROM edr_alerts WHERE company_id = ? AND event_time >= (NOW() - INTERVAL 30 DAY)
  `, [companyId])

  const [[resp30]] = await centralDB.query(`
    SELECT COUNT(*) total, SUM(action='bloqueo_auto') automaticas
    FROM edr_responses WHERE company_id = ? AND created_at >= (NOW() - INTERVAL 30 DAY)
  `, [companyId])

  const [[cis]] = await centralDB.execute(`
    SELECT AVG(JSON_UNQUOTE(JSON_EXTRACT(a.raw,'$.data.sca.score')) + 0) promedio
    FROM edr_alerts a JOIN (
      SELECT wazuh_id, JSON_UNQUOTE(JSON_EXTRACT(raw,'$.data.sca.policy_id')) pid, MAX(id) mid
      FROM edr_alerts WHERE rule_id=19004 AND company_id=? GROUP BY wazuh_id, pid) l ON l.mid=a.id
  `, [companyId])

  const [[red]] = await centralDB.query(`
    SELECT COUNT(*) total, SUM(ultima_vez >= (NOW()-INTERVAL 3 MINUTE)) conectados
    FROM edr_network_devices WHERE company_id = ?`, [companyId])

  return {
    company: { name: company.name },
    fecha: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    ag: ag || {},
    revisadas: Number(resumen30?.revisadas) || 0,
    intentosAcceso: Number(resumen30?.intentos_acceso) || 0,
    archivosCriticos: Number(resumen30?.archivos_criticos) || 0,
    correccionesAuto: Number(resp30?.automaticas) || 0,
    correccionesTotal: Number(resp30?.total) || 0,
    cisPromedio: cis?.promedio != null ? Math.round(Number(cis.promedio)) : null,
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
    intentosAcceso: 14,
    archivosCriticos: 2,
    correccionesAuto: 6,
    correccionesTotal: 9,
    cisPromedio: 82,
    red: { total: 11, conectados: 9 },
    esMuestra: true,
  }
}

function buildHTML(data) {
  const { company, fecha, ag } = data
  const cisColor = data.cisPromedio != null ? colorFor(data.cisPromedio) : '#B4B2A9'

  const categorias = [
    {
      titulo: 'Alguien tratando de entrar sin permiso',
      color: '#DC2626',
      texto: 'Si alguien intenta adivinar la contraseña de un computador muchas veces seguidas, lo detectamos al instante. En los casos más claros, el sistema bloquea esa conexión solo, sin esperar a que una persona reaccione.',
    },
    {
      titulo: 'Cambios en archivos importantes del sistema',
      color: '#D97706',
      texto: 'Vigilamos los archivos más sensibles de cada computador (los que controlan quién puede entrar y qué permisos tiene). Si alguien los modifica sin autorización, te avisamos de inmediato — puede ser señal de que alguien está intentando tomar control del equipo.',
    },
    {
      titulo: 'Actividad rara o fuera de lo normal',
      color: '#534AB7',
      texto: 'Cada computador tiene un comportamiento "normal". Si algo se sale de ese patrón — un programa raro, un proceso que no debería estar ahí — se genera una alerta para que el equipo de DSTAC la revise.',
    },
    {
      titulo: 'Qué tan bien configurado está cada equipo',
      color: '#0F6E56',
      texto: 'Revisamos automáticamente la configuración de seguridad de cada computador contra un estándar internacional (CIS), y te mostramos un puntaje simple de qué tan protegido está cada uno — como una "nota" de salud del equipo.',
    },
    {
      titulo: 'Qué otros equipos están en tu red',
      color: '#185FA5',
      texto: 'Detectamos qué otros dispositivos están conectados a la misma red — router, impresoras, celulares — sin necesidad de instalarles nada. Así puedes notar fácilmente si aparece algo que no reconoces.',
    },
    {
      titulo: 'Reacción automática ante lo más grave',
      color: '#1D9E75',
      texto: 'Cuando detectamos algo realmente serio, el sistema puede actuar solo (por ejemplo, bloqueando la conexión de un atacante) en segundos — mucho antes de que una persona pueda revisarlo a mano.',
    },
  ]

  const catRows = categorias.map(c => `
    <div class="finding-item" style="border-left:3px solid ${c.color};">
      <div>
        <div style="font-size:13px;font-weight:700;color:#2C2C2A;margin-bottom:3px;">${c.titulo}</div>
        <div style="font-size:12px;color:#444441;line-height:1.55;">${c.texto}</div>
      </div>
    </div>`).join('')

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

    <div class="card" style="margin-bottom:22px;">
      <div style="font-size:12.5px;color:#444441;line-height:1.6;">
        Tu protección <b>EDR</b> es un programa instalado en tus computadores que los vigila las 24 horas del día,
        los 7 días de la semana. No espera a que pase algo malo para reaccionar — está siempre mirando, y cuando
        detecta algo extraño, avisa al equipo de DSTAC (y en los casos más graves, actúa solo).
      </div>
    </div>

    <div class="card-dark">
      <div><span style="font-size:60px;font-weight:900;color:#7C4FDA;line-height:1;">${data.revisadas}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">eventos revisados en los últimos 30 días</div></div>
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
  </div>
  ${buildFooter(1, 2)}
</div>`

  const page2 = `
<div class="page">
  ${buildHeader('Protección EDR · Qué detectamos')}
  <div class="page-body">
    <div class="title">¿Qué tipo de cosas detectamos?</div>
    <div class="subtitle">Explicado sin tecnicismos</div>

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
