// ============================================================
// DSTAC · Generador del informe de AUTODIAGNÓSTICO (cuestionario)
// Reusa el lenguaje visual de informe_template.html (head/CSS/fuentes/logo).
//   buildDiagData(answers, clientData, BLOCKS, RISK_LEVELS, scan) -> D
//   buildDiagBody(D, logo) -> string (body de 3 paginas)
// ============================================================
(function(global){
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function riskColor(label){
    return label==='BAJO' ? '#1F8A5B' : label==='MEDIO' ? '#C77514' : label==='ALTO' ? '#E0651A' : '#D7263D';
  }
  function pctColor(p){ return p>=75 ? '#1F8A5B' : p>=40 ? '#C77514' : '#D7263D'; }

  // ---- Cómputo (puro) a partir de respuestas + catálogo (BLOCKS, RISK_LEVELS) ----
  global.buildDiagData = function(answers, clientData, BLOCKS, RISK_LEVELS, scan){
    answers = answers || {}; clientData = clientData || {};
    var all = []; BLOCKS.forEach(function(b){ b.questions.forEach(function(q){ all.push({b:b.id, q:q}); }); });
    var isGood = function(q){ return answers[q.id] === q.goodAnswer; };
    var score = all.filter(function(x){ return isGood(x.q); }).length;
    var risk = RISK_LEVELS.find(function(r){ return score >= r.min && score <= r.max; }) || {label:'—', color:'#6A3ECE'};
    var areas = BLOCKS.map(function(b){
      var tot = b.questions.length, good = b.questions.filter(isGood).length;
      return { title:b.title, pct: Math.round(good/tot*100) };
    });
    var best = areas.reduce(function(a,b){ return b.pct>a.pct?b:a; });
    var worst = areas.reduce(function(a,b){ return b.pct<a.pct?b:a; });
    var strengths = all.filter(function(x){ return isGood(x.q); }).map(function(x){ return x.q.strength; });
    var risks = all.filter(function(x){ return !isGood(x.q); }).map(function(x){ return x.q.risk; });
    var INTERP = {
      'CRÍTICO':'Tu organización presenta brechas en controles esenciales de seguridad. El riesgo de un incidente con impacto operacional o económico es elevado. Es prioritario definir una hoja de ruta y cerrar las exposiciones críticas en el corto plazo.',
      'ALTO':'Existen controles básicos, pero quedan exposiciones importantes sin cubrir que un atacante podría aprovechar. Conviene priorizar las áreas más débiles en las próximas semanas para reducir el riesgo.',
      'MEDIO':'Tu organización tiene una base de seguridad razonable, con espacio claro de mejora. Cerrar las exposiciones detectadas elevará de forma notable tu nivel de protección y resiliencia.',
      'BAJO':'Tu organización demuestra una postura de seguridad sólida. El foco ahora es mantener, monitorear y mejorar de forma continua para sostener este nivel frente a amenazas en evolución.'
    };
    return {
      empresa: clientData.nombre_empresa || '—',
      responsable: clientData.nombre_responsable || '—',
      fecha: (new Date()).toLocaleDateString('es-CL'),
      score: score, max: all.length || 20,
      risk: { label: risk.label, color: riskColor(risk.label) },
      interp: INTERP[risk.label] || 'Resultado del autodiagnóstico de seguridad de tu organización.',
      areas: areas, best: best, worst: worst,
      strengths: strengths, risks: risks,
      scan: scan || null
    };
  };

  var EXTRA_CSS = '<style>'
    + '.area-row{display:flex;align-items:center;gap:4mm;padding:2mm 0;border-bottom:1px solid var(--line)}'
    + '.area-row .nm{font-family:\'Space Grotesk\';font-weight:600;font-size:8.5pt;color:var(--ink);width:64mm;flex:none}'
    + '.area-row .track{flex:1;height:2.4mm;background:#ECE9F4;border-radius:2mm;overflow:hidden}'
    + '.area-row .track{display:block}'
    + '.area-row .fill{display:block;height:100%;border-radius:2mm}'
    + '.area-row .pc{font-family:\'JetBrains Mono\';font-weight:700;font-size:8pt;width:11mm;text-align:right;flex:none}'
    + '.cover .area-row{border-bottom:1px solid rgba(137,83,246,.18)}'
    + '.cover .area-row .nm{color:#EDEAF6}'
    + '.cover .area-row .track{background:rgba(137,83,246,.18)}'
    + '.kpis{display:flex;gap:4.5mm;margin-top:5mm}'
    + '.kpi{flex:1;border:1px solid var(--line);border-radius:2mm;padding:3.4mm 4mm}'
    + '.kpi .t{font-family:\'JetBrains Mono\';font-size:6pt;letter-spacing:.12em;color:var(--muted)}'
    + '.kpi .v{font-family:\'Space Grotesk\';font-weight:700;font-size:11pt;margin-top:1.4mm;color:var(--ink)}'
    + '.kpi .pc{font-family:\'JetBrains Mono\';font-weight:700;font-size:9pt;float:right}'
    + '.kpi.best{background:var(--green-bg);border-color:var(--green-line)} .kpi.best .pc{color:var(--green)}'
    + '.kpi.worst{background:var(--red-bg);border-color:var(--red-line)} .kpi.worst .pc{color:var(--red)}'
    + '.interp{border-left:3px solid var(--violet);background:var(--surface);padding:3.2mm 4.5mm;border-radius:1.5mm;font-size:9pt;line-height:1.6;color:var(--body)}'
    + '.cmp{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:1mm}'
    + '.cmp .col{border:1px solid var(--line);border-radius:2.2mm;overflow:hidden;align-self:start}'
    + '.cmp .ch{font-family:\'JetBrains Mono\';font-weight:600;font-size:7.5pt;letter-spacing:.08em;color:#fff;padding:2.6mm 4mm}'
    + '.cmp .ch.s{background:var(--green)} .cmp .ch.r{background:var(--red)}'
    + '.cmp .it{display:flex;gap:2.5mm;padding:2.4mm 4mm;font-size:7.8pt;line-height:1.45;border-top:1px solid var(--line);color:var(--body)}'
    + '.cmp .it .ic{flex:none;font-weight:800}'
    + '.cmp .col.s .it .ic{color:var(--green)} .cmp .col.r .it .ic{color:var(--red)}'
    + '.disc{font-family:\'JetBrains Mono\';font-size:6.4pt;line-height:1.5;color:var(--muted);margin-top:5mm}'
    + '</style>';
  global.DIAG_EXTRA_CSS = EXTRA_CSS;

  global.buildDiagBody = function(D, logo){
    var col = D.risk.color;
    var dash = (D.score / (D.max||20) * 314.16).toFixed(2);
    var logoTag = logo ? '<img src="'+logo+'" alt="DSTAC">' : '';
    var hrMeta = esc(D.empresa) + ' · ' + esc(D.fecha);

    var areaRows = D.areas.map(function(a){
      var c = pctColor(a.pct);
      return '<div class="area-row"><span class="nm">'+esc(a.title)+'</span>'
        + '<span class="track"><span class="fill" style="width:'+a.pct+'%;background:'+c+'"></span></span>'
        + '<span class="pc" style="color:'+c+'">'+a.pct+'%</span></div>';
    }).join('');

    var strItems = D.strengths.length
      ? D.strengths.map(function(s){ return '<div class="it"><span class="ic">+</span><span>'+esc(s)+'</span></div>'; }).join('')
      : '<div class="it"><span>Sin fortalezas registradas en este diagnóstico.</span></div>';
    var riskItems = D.risks.length
      ? D.risks.map(function(s){ return '<div class="it"><span class="ic">!</span><span>'+esc(s)+'</span></div>'; }).join('')
      : '<div class="it"><span>No se detectaron exposiciones. Excelente postura.</span></div>';

    // Página opcional: resumen del escaneo web
    var scanPage = '';
    if (D.scan && D.scan.ok !== false && D.scan.domain) {
      var SC = D.scan;
      var gc = SC.risk==='BAJO'?'#1F8A5B':SC.risk==='MEDIO'?'#C77514':SC.risk==='ALTO'?'#E0651A':'#D7263D';
      var hrows = '';
      var hk = SC.headers || {};
      Object.keys(hk).forEach(function(k){
        var hh = hk[k]; var ok = hh.status==='SECURE';
        hrows += '<div class="area-row"><span class="nm" style="width:auto;flex:1">'+esc(hh.name)+'</span>'
          + '<span class="badge '+(ok?'b-ok':(hh.status==='WARNING'?'b-warn':'b-crit'))+'">'+(ok?'PRESENTE':(hh.status==='WARNING'?'REVISAR':'FALTANTE'))+'</span></div>';
      });
      scanPage = '<div class="page"><div class="head">'+logoTag+'<div class="hr"><b>DIAGNÓSTICO DE SEGURIDAD</b>'+hrMeta+'</div></div><div class="headbar"></div>'
        + '<div class="content"><div class="section-h"><span class="idx">04</span><h2>Seguridad del sitio web</h2><span class="sub">'+esc(SC.domain)+'</span></div>'
        + '<div class="ssl-strip" style="border-color:var(--line);background:var(--surface)"><div class="ok-ic" style="background:'+gc+'">'+esc(SC.grade)+'</div>'
        + '<div class="t">Calificación global · '+esc(SC.score)+'/100</div>'
        + '<div class="ssl-kv"><div>RIESGO<b>'+esc(SC.risk)+'</b></div><div>PROTOCOLO<b>'+esc((SC.ssl||{}).version||'-')+'</b></div><div>VENCE<b>'+esc((SC.ssl||{}).expiry||'-')+'</b></div></div></div>'
        + '<div class="matrix" style="margin-top:2mm"><h2>CABECERAS DE SEGURIDAD ('+esc(SC.headersPresent)+'/'+esc(SC.headersTotal)+')</h2>'+hrows+'</div>'
        + '<div class="disc">Escaneo externo de seguridad web realizado por DSTAC CyberScanner. Refleja la configuración pública del dominio al momento del análisis.</div>'
        + '</div><div class="foot"><span>DSTAC CIBERSEGURIDAD · contacto@dstac.cl · www.dstac.cl</span><span>CONFIDENCIAL</span></div></div>';
    }

    return EXTRA_CSS
    // ===== PÁGINA 1 · PORTADA =====
    + '<div class="page cover"><div class="grid-bg"></div><div class="glow"></div><div class="cover-inner">'
    + '<div class="cover-top">'+logoTag+'<div class="doc-tag"><b>DIAGNÓSTICO DE SEGURIDAD</b>AUTODIAGNÓSTICO · CONFIDENCIAL</div></div>'
    + '<div class="cover-title"><div class="eyebrow">INFORME PRELIMINAR</div>'
    + '<h1>Diagnóstico de seguridad<br>de <span>'+esc(D.empresa)+'</span></h1>'
    + '<div class="cover-meta">RESPONSABLE · '+esc(D.responsable)+'   ·   '+esc(D.fecha)+'</div></div>'
    + '<div class="scorerow"><div class="gauge"><svg viewBox="0 0 120 120">'
    + '<circle cx="60" cy="60" r="50" fill="none" stroke="rgba(137,83,246,.18)" stroke-width="9"/>'
    + '<circle cx="60" cy="60" r="50" fill="none" stroke="'+col+'" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+dash+' 314.16" transform="rotate(-90 60 60)"/>'
    + '</svg><div class="center"><div class="num">'+esc(D.score)+'<small>/'+esc(D.max)+'</small></div><div class="lbl">CONTROLES ACTIVOS</div></div></div>'
    + '<div class="score-side"><div class="grade-line"><div class="grade" style="color:'+col+';font-size:23pt">'+esc(D.risk.label)+'</div>'
    + '<div class="risk-pill" style="background:'+col+'">NIVEL DE RIESGO</div></div>'
    + '<p>Tu organización tiene activos <b>'+D.score+' de '+D.max+'</b> controles de seguridad evaluados. A continuación, el detalle por área y los puntos que requieren atención.</p>'
    + '<div class="counts"><div class="count ok"><div class="n">'+D.strengths.length+'</div><div class="t">FORTALEZAS</div></div>'
    + '<div class="count crit"><div class="n">'+D.risks.length+'</div><div class="t">EXPOSICIONES</div></div></div></div></div>'
    + '<div class="matrix"><h2>DIAGNÓSTICO POR ÁREA</h2>'+areaRows+'</div>'
    + '<div class="kpis"><div class="kpi best"><span class="pc">'+D.best.pct+'%</span><div class="t">ÁREA MÁS FUERTE</div><div class="v">'+esc(D.best.title)+'</div></div>'
    + '<div class="kpi worst"><span class="pc">'+D.worst.pct+'%</span><div class="t">ÁREA PRIORITARIA</div><div class="v">'+esc(D.worst.title)+'</div></div></div>'
    + '<div class="cover-foot"><span><b>DSTAC CIBERSEGURIDAD</b> · TACTICAL SECURITY</span><span>contacto@dstac.cl · www.dstac.cl</span></div>'
    + '</div></div>'
    // ===== PÁGINA 2 · LECTURA + COMPARATIVA =====
    + '<div class="page"><div class="head">'+logoTag+'<div class="hr"><b>DIAGNÓSTICO DE SEGURIDAD</b>'+hrMeta+'</div></div><div class="headbar"></div>'
    + '<div class="content"><div class="section-h"><span class="idx">01</span><h2>Lectura del resultado</h2><span class="sub">NIVEL '+esc(D.risk.label)+'</span></div>'
    + '<div class="interp">'+esc(D.interp)+'</div>'
    + '<div class="section-h" style="margin-top:7mm"><span class="idx">02</span><h2>Fortalezas y puntos de exposición</h2><span class="sub">'+D.strengths.length+' / '+D.risks.length+'</span></div>'
    + '<div class="cmp"><div class="col s"><div class="ch s">FORTALEZAS ('+D.strengths.length+')</div>'+strItems+'</div>'
    + '<div class="col r"><div class="ch r">PUNTOS DE EXPOSICIÓN ('+D.risks.length+')</div>'+riskItems+'</div></div>'
    + '</div><div class="foot"><span>DSTAC CIBERSEGURIDAD · contacto@dstac.cl · www.dstac.cl</span><span>CONFIDENCIAL · <span class="pg">PÁG. 2</span></span></div></div>'
    // ===== PÁGINA 3 · PRÓXIMOS PASOS =====
    + '<div class="page"><div class="head">'+logoTag+'<div class="hr"><b>DIAGNÓSTICO DE SEGURIDAD</b>'+hrMeta+'</div></div><div class="headbar"></div>'
    + '<div class="content"><div class="section-h"><span class="idx">03</span><h2>Próximos pasos</h2><span class="sub">EVALUACIÓN PROFESIONAL</span></div>'
    + '<div class="cta"><div class="glow2"></div><h2>Este diagnóstico identifica el qué. Nosotros resolvemos el cómo.</h2>'
    + '<div class="lead">Detectamos <b>'+D.risks.length+' puntos de exposición</b> que requieren atención. Una evaluación profesional define el plan exacto para cerrarlos según tu operación.</div>'
    + '<div class="options"><div class="opt"><div class="ol"><b>OPCIÓN A</b></div><p>Usar este informe como guía interna para priorizar y cerrar las exposiciones detectadas con tu equipo.</p></div>'
    + '<div class="opt rec"><div class="ol"><b>OPCIÓN B</b><span class="rec-badge">RECOMENDADO</span></div><p>Evaluación profesional DSTAC: verificación en terreno, plan de remediación priorizado y acompañamiento. Primera reunión sin costo.</p></div></div>'
    + '<div class="cta-contact"><span class="lab">Agenda tu reunión</span><span class="val">contacto@dstac.cl</span><span class="val">www.dstac.cl</span></div>'
    + '<div class="cta-services">PRIMERA REUNIÓN SIN COSTO · SIN COMPROMISO · RESPUESTA EN 24 HORAS</div></div>'
    + '<div class="disc">Este informe preliminar se basa exclusivamente en las respuestas del autodiagnóstico y no constituye una evaluación técnica de la infraestructura. Una evaluación profesional verifica en terreno el estado real de los sistemas.</div>'
    + '</div><div class="foot"><span>DSTAC CIBERSEGURIDAD · contacto@dstac.cl · www.dstac.cl</span><span>CONFIDENCIAL · <span class="pg">PÁG. 3</span></span></div></div>'
    + scanPage;
  };
})(typeof window!=='undefined' ? window : global);
