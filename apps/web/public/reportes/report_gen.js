// ============ GENERADOR DE BODY DEL INFORME (mismas clases del template) ============
(function(global){
  // Textos de RIESGO: fuente única en risk_texts.js -> dstacRisk(key, status, value)
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function short(s,n){ s=String(s==null?'':s); return s.length>n ? s.slice(0,n-1)+'…' : s; }
  function meta(st){
    if(st==='SECURE') return {c:'ok',b:'b-ok',p:'p-ok',l:'CONFORME'};
    if(st==='WARNING')return {c:'warn',b:'b-warn',p:'p-warn',l:'OBSERVACIÓN'};
    return {c:'crit',b:'b-crit',p:'p-crit',l:'NO CONFORME'};
  }
  function scoreColor(sc){ return sc>=80?'#1F8A5B':(sc>=55?'#C77514':'#D7263D'); }
  function catFor(key){
    key=(key||'').toLowerCase();
    if(/cookie/.test(key)) return 'COOKIES';
    if(/eol/.test(key)) return 'SOFTWARE';
    if(/server|powered|version|banner|disclosure/.test(key)) return 'DIVULGACIÓN';
    return 'CABECERAS';
  }
  function fixer(isEmail){ return isEmail ? 'acceso al panel DNS del dominio' : 'equipo técnico con acceso al servidor'; }
  function codeBlock(rec, compact){
    if(!rec) return '';
    var lines=[];
    if(rec.nginx) lines.push('<span class="k">Nginx </span> '+esc(rec.nginx));
    if(!compact){
      if(rec.apache) lines.push('<span class="k">Apache</span> '+esc(rec.apache));
      if(rec.node)   lines.push('<span class="k">Node  </span> '+esc(rec.node));
    }
    return lines.length ? '<div class="code">'+lines.join('\n')+'</div>' : '';
  }
  function emailList(S){
    var em=S.email||{}; var order=['mx','spf','dmarc','dkim']; var out=[];
    order.forEach(function(k){ if(em[k]) out.push({key:k, label:em[k].label||k.toUpperCase(), status:em[k].status||'DANGER', value:em[k].value||'', fix:em[k].fix||'', isEmail:true}); });
    Object.keys(em).forEach(function(k){ if(order.indexOf(k)<0 && em[k]) out.push({key:k,label:em[k].label||k,status:em[k].status||'DANGER',value:em[k].value||'',fix:em[k].fix||'',isEmail:true}); });
    return out;
  }

  global.buildReportBody = function(S, logo, opts){
    var RISK = (typeof dstacRisk==='function') ? dstacRisk : function(){ return ''; };
    var locked = !!(opts && opts.locked);
    function lockNote(){ return '<div class="code" style="text-align:center;color:#8953F6;border:1px dashed var(--violet-dim);background:var(--surface)">🔒 Corrección técnica (Nginx · Apache · Node) disponible en el Informe Completo de DSTAC</div>'; }
    var ssl = S.ssl||{};
    var checks = (S.checks||[]).map(function(c){ return {key:c.key,name:c.name||c.key,status:c.status||'DANGER',value:c.value||'',fix:c.fix,rec:c.recommendations||null,isEmail:false}; });
    var emails = emailList(S);
    var all = checks.concat(emails);
    var nc=0,nw=0,no=0;
    function tally(st){ if(st==='SECURE')no++; else if(st==='WARNING')nw++; else nc++; }
    if(ssl.version) tally(ssl.status||'SECURE');
    all.forEach(function(x){ tally(x.status); });
    var sc = scoreColor(S.score);
    var dash = (S.score*3.1416).toFixed(2);
    var logoTag = logo ? '<img src="'+logo+'" alt="DSTAC">' : '';
    var risk = String(S.risk||'').toUpperCase();

    var rows='';
    if(ssl.version){
      var m0=meta(ssl.status||'SECURE');
      rows+='<tr><td class="cat">TRANSPORTE</td><td class="ctl">Certificado SSL / TLS</td><td class="det">'+esc(short(((ssl.version||'')+' · '+(ssl.issuer||'')+' · vence '+(ssl.expiry||'')),48))+'</td><td class="st"><span class="badge '+m0.b+'">'+m0.l+'</span></td></tr>';
    }
    checks.forEach(function(c){ var m=meta(c.status);
      rows+='<tr><td class="cat">'+catFor(c.key)+'</td><td class="ctl">'+esc(c.name)+'</td><td class="det">'+esc(short(c.value||'faltante',40))+'</td><td class="st"><span class="badge '+m.b+'">'+m.l+'</span></td></tr>';
    });
    emails.forEach(function(e){ var m=meta(e.status);
      rows+='<tr><td class="cat">CORREO / DNS</td><td class="ctl">'+esc(e.label)+'</td><td class="det">'+esc(short(e.value||'no configurado',40))+'</td><td class="st"><span class="badge '+m.b+'">'+m.l+'</span></td></tr>';
    });

    var summary = S.caption || 'El sitio fue evaluado en transporte (TLS), cabeceras de seguridad HTTP y configuración de correo/DNS. A continuación se detallan los hallazgos por nivel de severidad.';

    function critCard(x){
      var code = x.isEmail ? (x.value?('<div class="code"><span class="k">Detectado</span> '+esc(short(x.value,110))+'</div>'):'') : (locked ? lockNote() : codeBlock(x.rec,false));
      var action = x.fix ? esc(x.fix) : ('Configurar correctamente '+esc(x.name||x.label)+'.');
      var rk = RISK(x.key, x.status, x.value);
      return '<div class="card crit">'
        +'<div class="card-h"><h3>'+esc(x.name||x.label)+'</h3><span class="det">Detectado: '+esc(short(x.value||'faltante',28))+'</span><span class="pill p-crit">NO CONFORME</span></div>'
        +'<div class="card-b">'
        +'<div class="action"><b>Acción:</b> '+action+'</div>'
        +code
        +(rk?'<div class="risk"><span class="tag">RIESGO</span><span>'+esc(rk)+'</span></div>':'')
        +'<div class="fixer">QUIÉN CORRIGE · <b>'+fixer(x.isEmail)+'</b></div>'
        +'</div></div>';
    }
    var crits = all.filter(function(x){return x.status!=='SECURE'&&x.status!=='WARNING';});
    var critHtml = crits.length ? crits.map(critCard).join('') : '<div class="ok-mini"><div class="ic">✓</div><div class="t"><b>Sin hallazgos críticos</b><span>no se detectaron no conformidades de severidad alta</span></div></div>';

    function warnCard(x){
      var rk=RISK(x.key, x.status, x.value);
      var code = x.isEmail ? (x.value?('<div class="code"><span class="k">Detectado</span> '+esc(short(x.value,90))+'</div>'):'') : (locked ? lockNote() : codeBlock(x.rec,true));
      var action = x.fix ? esc(x.fix) : ('Revisar la configuración de '+esc(x.name||x.label)+'.');
      return '<div class="card warn compact">'
        +'<div class="card-h"><h3>'+esc(x.name||x.label)+'</h3><span class="pill p-warn">OBSERVACIÓN</span></div>'
        +'<div class="card-b">'
        +'<div class="action">'+action+'</div>'
        +code
        +(rk?'<div class="risk"><span class="tag">RIESGO</span><span>'+esc(rk)+'</span></div>':'')
        +'</div></div>';
    }
    var warnsHeaders = checks.filter(function(x){return x.status==='WARNING';});
    var warnHtml = warnsHeaders.length ? '<div class="two-col">'+warnsHeaders.map(warnCard).join('')+'</div>'
      : '<div class="ok-mini"><div class="ic">✓</div><div class="t"><b>Sin observaciones de endurecimiento</b><span>las cabeceras evaluadas están correctamente configuradas</span></div></div>';

    var okMails = emails.filter(function(e){return e.status==='SECURE';});
    var warnMails = emails.filter(function(e){return e.status==='WARNING';});
    var okRow = okMails.length ? '<div class="ok-row">'+okMails.map(function(e){
      return '<div class="ok-mini"><div class="ic">✓</div><div class="t"><b>'+esc(e.label)+'</b><span>'+esc(short(e.value||'configurado',38))+'</span></div></div>';
    }).join('')+'</div>' : '';
    var warnMailHtml = warnMails.map(function(e){
      var rk=RISK(e.key, e.status, e.value);
      return '<div class="card warn">'
        +'<div class="card-h"><h3>'+esc(e.label)+'</h3><span class="pill p-warn">OBSERVACIÓN</span></div>'
        +'<div class="card-b">'
        +'<div class="action"><b>Acción:</b> '+(e.fix?esc(e.fix):('Revisar el registro '+esc(e.label)+'.'))+'</div>'
        +(e.value?('<div class="code"><span class="k">Detectado</span> '+esc(short(e.value,110))+'</div>'):'')
        +(rk?'<div class="risk"><span class="tag">RIESGO</span><span>'+esc(rk)+'</span></div>':'')
        +'<div class="fixer">QUIÉN CORRIGE · <b>acceso al panel DNS del dominio</b></div>'
        +'</div></div>';
    }).join('');

    var hrMeta = esc(S.domain)+' · '+esc(S.fecha);

    return ''
    +'<div class="page cover"><div class="grid-bg"></div><div class="glow"></div><div class="cover-inner">'
    +'<div class="cover-top">'+logoTag+'<div class="doc-tag"><b>INFORME DE SEGURIDAD WEB</b>REPORTE COMPLETO · CONFIDENCIAL</div></div>'
    +'<div class="cover-title"><div class="eyebrow">DIAGNÓSTICO PERIMETRAL</div>'
    +'<h1>Evaluación de seguridad<br>del sitio <span>'+esc(S.domain)+'</span></h1>'
    +'<div class="cover-meta">FECHA DE ANÁLISIS · '+esc(S.fecha)+'</div></div>'
    +'<div class="scorerow"><div class="gauge"><svg viewBox="0 0 120 120">'
    +'<circle cx="60" cy="60" r="50" fill="none" stroke="rgba(137,83,246,.18)" stroke-width="9"/>'
    +'<circle cx="60" cy="60" r="50" fill="none" stroke="'+sc+'" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+dash+' 314.16" transform="rotate(-90 60 60)"/>'
    +'</svg><div class="center"><div class="num">'+esc(S.score)+'<small>/100</small></div><div class="lbl">PUNTAJE GLOBAL</div></div></div>'
    +'<div class="score-side"><div class="grade-line"><div class="grade" style="color:'+sc+'">'+esc(S.grade)+'</div>'
    +'<div class="risk-pill" style="background:'+sc+'">RIESGO '+risk+'</div></div>'
    +'<p>'+esc(summary)+'</p>'
    +'<div class="counts"><div class="count crit"><div class="n">'+nc+'</div><div class="t">NO CONFORME</div></div>'
    +'<div class="count warn"><div class="n">'+nw+'</div><div class="t">OBSERVACIONES</div></div>'
    +'<div class="count ok"><div class="n">'+no+'</div><div class="t">CONFORME</div></div></div></div></div>'
    +'<div class="matrix"><h2>MATRIZ DE HALLAZGOS</h2><table class="mx-table">'+rows+'</table></div>'
    +'<div style="margin-top:2.5mm;font-family:\'JetBrains Mono\';font-size:5.6pt;letter-spacing:.04em;color:#6E6884;line-height:1.45">METODOLOGÍA · Puntaje ponderado: Cabeceras HTTP ~50% · TLS/Certificado ~22% · Correo/DNS (SPF·DKIM·DMARC) ~22% · atributos de cookies. Los controles críticos faltantes (HSTS, CSP, DMARC) y el software fuera de soporte penalizan más.</div>'
    +'<div class="cover-foot"><span><b>DSTAC CIBERSEGURIDAD</b> · TACTICAL SECURITY</span><span>contacto@dstac.cl · www.dstac.cl</span></div>'
    +'</div></div>'
    +'<div class="page"><div class="head">'+logoTag+'<div class="hr"><b>INFORME DE SEGURIDAD WEB</b>'+hrMeta+'</div></div><div class="headbar"></div>'
    +'<div class="content"><div class="section-h"><span class="idx">01</span><h2>Transporte y hallazgos críticos</h2><span class="sub">PRIORIDAD INMEDIATA</span></div>'
    +(ssl.version?('<div class="ssl-strip"><div class="ok-ic">✓</div><div class="t">Certificado SSL / TLS — '+esc(ssl.statusText||'activo y válido')+'</div>'
      +'<div class="ssl-kv"><div>PROTOCOLO<b>'+esc(ssl.version||'-')+'</b></div><div>EMISOR<b>'+esc(ssl.issuer||'-')+'</b></div><div>LLAVE<b>'+esc(ssl.key||'-')+'</b></div><div>VENCE<b>'+esc(ssl.expiry||'-')+'</b></div></div></div>'):'')
    +critHtml
    +'</div><div class="foot"><span>DSTAC CIBERSEGURIDAD · contacto@dstac.cl · www.dstac.cl</span><span>CONFIDENCIAL · <span class="pg">PÁG. 2 / 4</span></span></div></div>'
    +'<div class="page"><div class="head">'+logoTag+'<div class="hr"><b>INFORME DE SEGURIDAD WEB</b>'+hrMeta+'</div></div><div class="headbar"></div>'
    +'<div class="content"><div class="section-h"><span class="idx">02</span><h2>Cabeceras de endurecimiento</h2><span class="sub">OBSERVACIONES · CORTO PLAZO</span></div>'
    +warnHtml
    +'</div><div class="foot"><span>DSTAC CIBERSEGURIDAD · contacto@dstac.cl · www.dstac.cl</span><span>CONFIDENCIAL · <span class="pg">PÁG. 3 / 4</span></span></div></div>'
    +'<div class="page"><div class="head">'+logoTag+'<div class="hr"><b>INFORME DE SEGURIDAD WEB</b>'+hrMeta+'</div></div><div class="headbar"></div>'
    +'<div class="content"><div class="section-h"><span class="idx">03</span><h2>Correo y DNS</h2><span class="sub">SPF · DKIM · DMARC · MX</span></div>'
    +okRow+warnMailHtml
    +'<div class="cta"><div class="glow2"></div><h2>Próximos pasos</h2>'
    +'<div class="lead">Las correcciones requieren acceso al servidor web o al panel DNS del dominio y deben ser implementadas por el equipo técnico responsable de la infraestructura.</div>'
    +'<div class="options"><div class="opt"><div class="ol"><b>OPCIÓN A</b></div><p>Entregar este informe al equipo técnico para su implementación interna, siguiendo las instrucciones de cada hallazgo.</p></div>'
    +'<div class="opt rec"><div class="ol"><b>OPCIÓN B</b><span class="rec-badge">RECOMENDADO</span></div><p>DSTAC lo implementa por usted: aplicación de cabeceras, registros DNS y verificación posterior. Presupuesto aparte según alcance.</p></div></div>'
    +'<div class="cta-contact"><span class="lab">Solicitar cotización</span><span class="val">contacto@dstac.cl</span><span class="val">www.dstac.cl</span></div>'
    +'<div class="cta-services">IMPLEMENTACIÓN DE CABECERAS · AUDITORÍA WEB · SEGURIDAD GESTIONADA</div></div>'
    +'</div><div class="foot"><span>DSTAC CIBERSEGURIDAD · contacto@dstac.cl · www.dstac.cl</span><span>CONFIDENCIAL · <span class="pg">PÁG. 4 / 4</span></span></div></div>';
  };
})(typeof window!=='undefined'?window:global);
