const {
  buildHeader, buildFooter, buildBar, buildAreaCard,
  buildMetricCard, buildScoreCard, colorFor, wrapDocument,
} = require('./template')

// ── Data collection ───────────────────────────────────────────────────────────
async function getData(tenantDB, centralDB, companyId, company) {
  const [
    [planRows],
    [activosRows],
    [identidadesRows],
    [accesosRows],
    [personalRows],
    [incidentesRows],
    [nistRows],
    [isoEvalRows],
    [isoDomainRows],
    [activosCriticosRows],
    [identidadesRiesgoRows],
    [incidentesCriticosRows],
  ] = await Promise.all([
    centralDB.execute(
      `SELECT pl.name AS plan, pl.display_name FROM companies c
       JOIN plans pl ON pl.id = c.plan_id WHERE c.id = ?`,
      [companyId]
    ),
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(criticidad='critica') AS criticos,
        SUM(criticidad='alta') AS alta,
        SUM(criticidad='media') AS media,
        SUM(criticidad='baja') AS baja,
        SUM(estado='operativo') AS operativos,
        SUM(estado='degradado') AS degradados,
        SUM(estado='fuera_de_servicio') AS fuera_servicio
      FROM activos
    `),
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(estado='activa') AS activas,
        SUM(estado='expirada') AS expiradas,
        SUM(estado='comprometida') AS comprometidas
      FROM identidades
    `),
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(estado='activo') AS activos,
        SUM(estado='suspendido') AS suspendidos,
        SUM(estado='expirado') AS expirados,
        SUM(criticidad='critica') AS criticos
      FROM accesos
    `),
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(estado='activo') AS activos,
        SUM(estado='inactivo') AS inactivos,
        SUM(nivel_responsabilidad='alto') AS criticos
      FROM personal
    `),
    tenantDB.execute(`
      SELECT COUNT(*) AS total,
        SUM(estado='abierto') AS abiertos,
        SUM(estado='en_investigacion') AS en_investigacion,
        SUM(estado='cerrado') AS cerrados,
        SUM(severidad='critica') AS criticos_sev
      FROM incidentes
    `),
    centralDB.execute(`
      SELECT LOWER(f.name) AS funcion, f.name AS nombre,
             AVG(CASE WHEN nca.status != 'no_aplica' THEN nca.progress END) AS porcentaje
      FROM nist_functions f
      LEFT JOIN nist_categories ncat ON ncat.function_id = f.id
      LEFT JOIN nist_controls nc ON nc.category_id = ncat.id
      LEFT JOIN nist_control_assessments nca
             ON nca.control_id = nc.id AND nca.evaluation_id = (
               SELECT id FROM nist_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1
             )
      GROUP BY f.id ORDER BY f.order_num
    `, [companyId]),
    centralDB.execute(
      `SELECT score_total, gap_total, evaluated_at FROM iso_evaluations
       WHERE company_id = ? AND status = 'activa' LIMIT 1`,
      [companyId]
    ),
    centralDB.execute(`
      SELECT d.id, d.name, d.color,
        ROUND(AVG(CASE WHEN ica.applies = 1 AND ica.status != 'no_aplica' THEN ica.progress END), 1) AS score
      FROM iso_domains d
      LEFT JOIN iso_controls ic ON ic.domain_id = d.id
      LEFT JOIN iso_control_assessments ica
             ON ica.control_id = ic.id AND ica.evaluation_id = (
               SELECT id FROM iso_evaluations WHERE company_id = ? AND status = 'activa' LIMIT 1
             )
      GROUP BY d.id ORDER BY d.order_num
    `, [companyId]),
    tenantDB.execute(`SELECT COUNT(*) AS n FROM activos WHERE criticidad = 'critica' AND estado != 'operativo'`),
    tenantDB.execute(`SELECT COUNT(*) AS n FROM identidades WHERE estado IN ('comprometida','expirada')`),
    tenantDB.execute(`SELECT COUNT(*) AS n FROM incidentes WHERE estado = 'abierto' AND severidad = 'critica'`),
  ])

  // Security Score
  const penalidad =
    (Number(activosCriticosRows[0].n)     * 5) +
    (Number(identidadesRiesgoRows[0].n)   * 3) +
    (Number(incidentesCriticosRows[0].n)  * 2)
  const scoreValor = Math.max(0, 100 - penalidad)
  const nivelScore = scoreValor >= 70 ? 'Alto' : scoreValor >= 40 ? 'Medio' : 'Bajo'

  // NIST
  const FUNCIONES = ['identificar', 'proteger', 'detectar', 'responder', 'recuperar']
  const FUNCION_LABELS = {
    identificar: 'Identificar', proteger: 'Proteger',
    detectar: 'Detectar', responder: 'Responder', recuperar: 'Recuperar',
  }
  const nistMap = Object.fromEntries(nistRows.map(r => [r.funcion, Math.round(Number(r.porcentaje) || 0)]))
  let nistSuma = 0, nistCont = 0
  FUNCIONES.forEach(f => {
    const p = nistMap[f] ?? null
    if (p !== null) { nistSuma += p; nistCont++ }
  })
  const nistPromedio = nistCont > 0 ? Math.round(nistSuma / nistCont) : null
  const nistFunciones = FUNCIONES.map(f => ({ key: f, label: FUNCION_LABELS[f], pct: nistMap[f] ?? 0 }))

  return {
    company:        { name: company.name ?? 'N/A', slug: company.slug },
    plan:           planRows[0]?.display_name ?? 'Plan PYME',
    fecha:          new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    security_score: { valor: scoreValor, nivel: nivelScore },
    activos:        activosRows[0],
    identidades:    identidadesRows[0],
    accesos:        accesosRows[0],
    personal:       personalRows[0],
    incidentes:     incidentesRows[0],
    nist:           { promedio: nistPromedio, funciones: nistFunciones, tiene_eval: nistCont > 0 },
    iso:            isoEvalRows.length ? {
      score_total: Math.round(Number(isoEvalRows[0].score_total) || 0),
      gap_total:   Math.round(Number(isoEvalRows[0].gap_total)   || 0),
      evaluated_at: isoEvalRows[0].evaluated_at,
      domains: isoDomainRows.map(d => ({ ...d, score: Math.round(Number(d.score) || 0) })),
    } : null,
  }
}

// ── Hallazgos dinámicos ───────────────────────────────────────────────────────
function buildHallazgos(data) {
  const items = []
  const { activos, identidades, incidentes, accesos, nist, iso, security_score } = data

  if (Number(identidades.comprometidas) > 0)
    items.push({ tipo: 'critical', texto: `${identidades.comprometidas} identidad(es) comprometida(s) detectada(s) — requieren acción inmediata` })
  if (Number(incidentes.abiertos) > 0)
    items.push({ tipo: 'critical', texto: `${incidentes.abiertos} incidente(s) de seguridad abiertos sin resolver` })
  if (Number(activos.degradados) > 0 || Number(activos.fuera_servicio) > 0)
    items.push({ tipo: 'warning', texto: `${Number(activos.degradados) + Number(activos.fuera_servicio)} activo(s) en estado degradado o fuera de servicio` })
  if (Number(identidades.expiradas) > 0)
    items.push({ tipo: 'warning', texto: `${identidades.expiradas} identidad(es) con acceso expirado actualmente activas` })
  if (nist.promedio !== null && nist.promedio < 50) {
    const minFn = nist.funciones.reduce((a, b) => a.pct < b.pct ? a : b)
    items.push({ tipo: 'warning', texto: `Madurez NIST bajo 50% — área más débil: ${minFn.label} (${minFn.pct}%)` })
  }
  if (iso && iso.gap_total > 50)
    items.push({ tipo: 'warning', texto: `Gap de alineamiento ISO 27001 de ${iso.gap_total}% — requiere plan de acción estructurado` })
  if (security_score.valor < 40)
    items.push({ tipo: 'critical', texto: `Security Score crítico (${security_score.valor}/100) — exposición alta al riesgo` })
  if (items.length === 0)
    items.push({ tipo: 'ok', texto: 'No se detectaron hallazgos críticos en la evaluación actual' })

  return items
}

function buildRecomendaciones(data) {
  const recs = []
  const { identidades, incidentes, nist, iso, security_score, accesos } = data

  if (Number(identidades.comprometidas) > 0)
    recs.push('Revocar de inmediato las identidades comprometidas y forzar cambio de credenciales en todos los sistemas afectados')
  if (Number(incidentes.abiertos) > 0)
    recs.push('Escalar los incidentes abiertos al equipo de respuesta y establecer SLA de cierre en las próximas 48 horas')
  if (Number(identidades.expiradas) > 0)
    recs.push('Revisar, renovar o deshabilitar las identidades con acceso expirado para reducir la superficie de ataque')
  if (nist.promedio !== null && nist.promedio < 70)
    recs.push('Programar sesión con DSTAC para definir plan de mejora NIST CSF y priorizar controles de mayor impacto')
  if (iso && iso.gap_total > 30)
    recs.push('Implementar plan de acción ISO 27001 comenzando por los dominios con menor alineamiento')
  recs.push('Revisar la matriz de accesos aplicando el principio de mínimo privilegio en activos de criticidad alta')
  recs.push('Establecer revisión periódica (trimestral) de identidades y accesos con el equipo DSTAC')
  if (security_score.valor < 70)
    recs.push('Priorizar el cierre de vulnerabilidades en activos críticos para mejorar el Security Score')

  return recs.slice(0, 6)
}

// ── HTML builders por página ──────────────────────────────────────────────────

function pageCover(data, pageNum, total) {
  const { company, plan, fecha, security_score } = data
  const scoreColor = colorFor(security_score.valor)

  return `
<div class="page">
  ${buildHeader('Reporte Ejecutivo de Seguridad')}
  <div class="page-body">
    <div style="margin-bottom:6px;margin-top:4px;">
      <div class="title">Reporte Ejecutivo de Seguridad</div>
      <div class="subtitle">Informe de Postura de Seguridad</div>
    </div>

    <!-- Company info card -->
    <div class="card" style="margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:11px;color:#888780;margin-bottom:6px;">Empresa:
          <strong style="color:#2C2C2A;margin-left:6px;">${esc(company.name)}</strong>
        </div>
        <div style="font-size:11px;color:#888780;">Plan:
          <strong style="color:#534AB7;margin-left:6px;">${esc(plan)}</strong>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#888780;">Fecha de emisión</div>
        <div style="font-size:13px;font-weight:600;color:#2C2C2A;margin-top:3px;">${fecha}</div>
        <div style="font-size:11px;color:#888780;margin-top:3px;">Generado por DSTAC Security</div>
      </div>
    </div>

    <!-- Score card -->
    ${buildScoreCard(security_score.valor)}

    <!-- Mini KPI row -->
    <div class="grid-3" style="margin-top:0;">
      ${buildMetricCard(Number(data.activos.total), 'Activos', `${data.activos.criticos || 0} críticos`, '#D97706')}
      ${buildMetricCard(Number(data.identidades.total), 'Identidades', `${data.identidades.comprometidas || 0} comprometidas`, '#DC2626')}
      ${buildMetricCard(Number(data.personal.total), 'Personal', `${data.personal.activos || 0} activos`, '#534AB7')}
    </div>
  </div>
  ${buildFooter(pageNum, total)}
</div>`
}

function pageModulos(data, pageNum, total) {
  const act  = data.activos
  const ident = data.identidades
  const acc  = data.accesos
  const pers = data.personal
  const inc  = data.incidentes

  const actPct  = Number(act.total)   ? Math.round((Number(act.operativos) / Number(act.total)) * 100)   : 0
  const identPct= Number(ident.total) ? Math.round((Number(ident.activas)  / Number(ident.total)) * 100) : 0
  const accPct  = Number(acc.total)   ? Math.round((Number(acc.activos)    / Number(acc.total)) * 100)   : 0
  const persPct = Number(pers.total)  ? Math.round((Number(pers.activos)   / Number(pers.total)) * 100)  : 0

  return `
<div class="page">
  ${buildHeader('Resumen de Módulos')}
  <div class="page-body">
    <div class="title">Resumen de Módulos</div>
    <div class="subtitle">Estado actual del sistema</div>

    <div class="sec-label">Personal</div>
    <div class="grid-2" style="margin-bottom:24px;">
      ${buildMetricCard(Number(pers.total), 'Total personal', `${pers.activos || 0} activos · ${pers.inactivos || 0} inactivos`, '#534AB7')}
      ${buildMetricCard(Number(pers.criticos), 'Personal crítico', 'Nivel de responsabilidad alto', '#D97706')}
    </div>

    <div class="sec-label">Activos</div>
    <div class="grid-2" style="margin-bottom:4px;">
      ${buildMetricCard(Number(act.total), 'Total activos', `${act.criticos || 0} críticos · ${act.alta || 0} alta criticidad`, '#D97706')}
      ${buildMetricCard(Number(act.operativos), 'Operativos', `${act.degradados || 0} degradados · ${act.fuera_servicio || 0} fuera de servicio`, '#1D9E75')}
    </div>
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;color:#888780;">Tasa de operatividad</span>
        <span style="font-size:13px;font-weight:700;color:${colorFor(actPct)};">${actPct}%</span>
      </div>
      ${buildBar(actPct, colorFor(actPct))}
    </div>

    <div class="sec-label">Identidades</div>
    <div class="grid-2" style="margin-bottom:4px;">
      ${buildMetricCard(Number(ident.total), 'Total identidades', `${ident.activas || 0} activas`, '#534AB7')}
      ${buildMetricCard(Number(ident.comprometidas) + Number(ident.expiradas), 'Requieren atención', `${ident.comprometidas || 0} comprometidas · ${ident.expiradas || 0} expiradas`, '#DC2626')}
    </div>
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;color:#888780;">Tasa de identidades saludables</span>
        <span style="font-size:13px;font-weight:700;color:${colorFor(identPct)};">${identPct}%</span>
      </div>
      ${buildBar(identPct, colorFor(identPct))}
    </div>

    <div class="sec-label">Accesos</div>
    <div class="grid-2">
      ${buildMetricCard(Number(acc.total), 'Total accesos', `${acc.activos || 0} activos`, '#534AB7')}
      ${buildMetricCard(Number(acc.criticos), 'Accesos críticos', `${acc.suspendidos || 0} suspendidos`, '#D97706')}
    </div>
  </div>
  ${buildFooter(pageNum, total)}
</div>`
}

function pageNist(data, pageNum, total) {
  const { nist } = data
  const promedioColor = nist.promedio !== null ? colorFor(nist.promedio) : '#B4B2A9'

  return `
<div class="page">
  ${buildHeader('NIST Cybersecurity Framework')}
  <div class="page-body">
    <div class="title">NIST Cybersecurity Framework 2.0</div>
    <div class="subtitle">Evaluación por función</div>

    ${nist.promedio !== null ? `
    <!-- Score card NIST -->
    <div style="background:#1a1740;border-radius:14px;padding:22px 32px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div>
        <span style="font-size:52px;font-weight:900;color:${promedioColor};line-height:1;">${nist.promedio}</span>
        <span style="font-size:20px;color:rgba(255,255,255,0.35);"> /100</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;">Promedio NIST CSF — ${nist.funciones.length} funciones evaluadas</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:6px;">Nivel de madurez</div>
        <div style="background:${promedioColor};color:white;padding:8px 20px;border-radius:30px;font-size:12px;font-weight:700;text-transform:uppercase;display:inline-block;">
          ${nist.promedio >= 70 ? 'Gestionado' : nist.promedio >= 40 ? 'Parcial' : 'Inicial'}
        </div>
      </div>
    </div>` : ''}

    <div class="sec-label">Diagnóstico por función</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;">
      ${nist.funciones.map(fn => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:600;color:#2C2C2A;">${fn.label}</span>
          <span style="font-size:14px;font-weight:700;color:${colorFor(fn.pct)};">${fn.pct}%</span>
        </div>
        ${buildBar(fn.pct, colorFor(fn.pct))}
      </div>`).join('')}
    </div>

    ${nist.promedio !== null && nist.promedio < 50 ? `
    <div class="quote-block">
      La madurez NIST promedio se encuentra en nivel inicial. Se recomienda priorizar las funciones con menor puntuación
      para reducir la exposición a amenazas. El equipo DSTAC puede definir un plan de mejora adaptado a tu operación.
    </div>` : nist.promedio !== null && nist.promedio >= 70 ? `
    <div class="quote-block" style="border-color:#1D9E75;background:#EAF3DE;">
      <span style="color:#27500A;">La organización ha alcanzado un nivel de madurez NIST gestionado. Se recomienda mantener las prácticas actuales
      y avanzar hacia la optimización de los controles existentes.</span>
    </div>` : ''}
  </div>
  ${buildFooter(pageNum, total)}
</div>`
}

function pageIso(data, pageNum, total) {
  const { iso } = data
  if (!iso) return ''
  const scoreColor = colorFor(iso.score_total)

  return `
<div class="page">
  ${buildHeader('ISO/IEC 27001:2022')}
  <div class="page-body">
    <div class="title">ISO/IEC 27001:2022 — Annex A</div>
    <div class="subtitle">Alineamiento por dominio</div>

    <!-- Score ISO -->
    <div style="background:#0F6E56;border-radius:14px;padding:22px 32px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div>
        <span style="font-size:52px;font-weight:900;color:${scoreColor};line-height:1;">${iso.score_total}</span>
        <span style="font-size:20px;color:rgba(255,255,255,0.35);"> /100</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;">Alineamiento global ISO 27001 — 93 controles evaluados</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:6px;">Gap a cerrar</div>
        <div style="background:rgba(255,255,255,0.15);color:white;padding:8px 20px;border-radius:30px;font-size:14px;font-weight:700;display:inline-block;">
          ${iso.gap_total}%
        </div>
      </div>
    </div>

    <div class="sec-label">Alineamiento por dominio</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
      ${iso.domains.map(d => `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:11px;font-weight:700;color:${d.color || colorFor(d.score)};background:${d.color || colorFor(d.score)}18;padding:2px 8px;border-radius:5px;">${d.id}</span>
            <span style="font-size:12px;font-weight:600;color:#2C2C2A;">${esc(d.name)}</span>
          </div>
          <span style="font-size:14px;font-weight:700;color:${colorFor(d.score)};">${d.score}%</span>
        </div>
        ${buildBar(d.score, colorFor(d.score))}
      </div>`).join('')}
    </div>

    <div class="quote-block">
      La evaluación ISO 27001:2022 cubre los 93 controles del Annex A agrupados en 4 dominios (A5–A8).
      Los resultados son calculados por el equipo DSTAC y representan el estado de alineamiento de los controles implementados.
      ${iso.evaluated_at ? `Última evaluación: ${new Date(iso.evaluated_at).toLocaleDateString('es-CL')}.` : ''}
    </div>
  </div>
  ${buildFooter(pageNum, total)}
</div>`
}

function pageHallazgos(data, pageNum, total) {
  const hallazgos = buildHallazgos(data)
  const recs      = buildRecomendaciones(data)

  const dotClass = { critical: 'finding-dot-critical', warning: 'finding-dot-warning', ok: 'finding-dot-ok' }

  return `
<div class="page">
  ${buildHeader('Hallazgos y Recomendaciones')}
  <div class="page-body">
    <div class="title">Hallazgos y Recomendaciones</div>
    <div class="subtitle">Análisis de la evaluación actual</div>

    <div class="sec-label">Hallazgos principales</div>
    <div style="margin-bottom:24px;">
      ${hallazgos.map(h => `
      <div class="finding-item">
        <div class="${dotClass[h.tipo]}"></div>
        <span style="font-size:12px;color:#2C2C2A;line-height:1.5;">${h.texto}</span>
      </div>`).join('')}
    </div>

    <div class="sec-label">Recomendaciones</div>
    <div style="margin-bottom:24px;">
      ${recs.map((r, i) => `
      <div class="rec-item">
        <span style="font-size:11px;font-weight:700;color:#534AB7;min-width:20px;">${i + 1}.</span>
        <span>${r}</span>
      </div>`).join('')}
    </div>

    <!-- Conclusión -->
    <div class="cta-box">
      <div style="font-size:16px;font-weight:700;margin-bottom:10px;line-height:1.3;">
        Este reporte identifica el qué. Nosotros resolvemos el cómo.
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);line-height:1.6;margin-bottom:14px;">
        El equipo DSTAC está disponible para definir el plan exacto de cierre de brechas
        según la operación y prioridades de tu empresa.
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.55);letter-spacing:0.8px;text-transform:uppercase;">
        Primera reunión sin costo · Sin compromiso · Respuesta en 24 horas
      </div>
    </div>

    <div style="margin-top:16px;font-size:10px;color:#B4B2A9;line-height:1.5;">
      Este informe ha sido generado automáticamente con los datos actuales del sistema. Los resultados reflejan el estado
      de la plataforma al momento de la emisión y no constituyen una auditoría de seguridad formal.
    </div>
  </div>
  ${buildFooter(pageNum, total)}
</div>`
}

// ── Función principal ─────────────────────────────────────────────────────────
function buildHTML(data) {
  const pages = []

  let p = 1
  const hasNist = data.nist.tiene_eval
  const hasIso  = data.iso !== null
  const total   = 3 + (hasNist ? 1 : 0) + (hasIso ? 1 : 0)

  pages.push(pageCover(data, p++, total))
  pages.push(pageModulos(data, p++, total))
  if (hasNist) pages.push(pageNist(data, p++, total))
  if (hasIso)  pages.push(pageIso(data, p++, total))
  pages.push(pageHallazgos(data, p, total))

  return wrapDocument(pages.join(''))
}

function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

module.exports = { getData, buildHTML }
