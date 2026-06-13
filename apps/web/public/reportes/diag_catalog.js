// Catálogo del autodiagnóstico (bloques + niveles) — usado por diag_gen.buildDiagData
(function(g){
  g.DIAG_BLOCKS = [
    { id:'acceso', title:'Identidad y Acceso', questions:[
      {id:1,goodAnswer:'si',strength:'Cada usuario opera con identidad propia, lo que permite trazabilidad y responsabilidad individual.',risk:'El uso de cuentas compartidas impide saber quién hizo qué. Ante un incidente, no hay forma de rastrear el origen.'},
      {id:2,goodAnswer:'si',strength:'Existe rotación de credenciales, reduciendo la ventana de exposición ante filtraciones.',risk:'Las contraseñas estáticas que nunca cambian son una de las puertas de entrada más explotadas hoy.'},
      {id:3,goodAnswer:'si',strength:'Hay una segunda capa de protección sobre la información crítica.',risk:'Una sola contraseña separa a un atacante de tu información más valiosa. Si esa clave cae, todo queda expuesto.'},
    ]},
    { id:'equipos', title:'Equipos y Continuidad', questions:[
      {id:4,goodAnswer:'si',strength:'Tienes visibilidad sobre tus activos, base indispensable para protegerlos.',risk:'No se puede proteger lo que no se conoce. Equipos no inventariados son puntos ciegos de riesgo.'},
      {id:5,goodAnswer:'si',strength:'Tus equipos cuentan con protección activa frente a amenazas conocidas.',risk:'Equipos sin protección verificada pueden estar comprometidos ahora mismo sin que nadie lo note.'},
      {id:6,goodAnswer:'si',strength:'Cuentas con respaldos que permiten recuperar la operación ante una falla o ataque.',risk:'Sin respaldos confiables, un solo incidente puede significar la pérdida permanente de información clave del negocio.'},
      {id:7,goodAnswer:'si',strength:'Tus sistemas reciben actualizaciones, cerrando vulnerabilidades conocidas.',risk:'El software desactualizado concentra las vulnerabilidades más explotadas por atacantes.'},
    ]},
    { id:'red', title:'Red y Conectividad', questions:[
      {id:8,goodAnswer:'si',strength:'Tu red de trabajo está separada de accesos externos no controlados.',risk:'Una red compartida con terceros expone tus sistemas internos a dispositivos que no controlas.'},
      {id:9,goodAnswer:'si',strength:'Tienes visibilidad de quién accede a tu red.',risk:'No saber quién está conectado significa que un intruso podría operar dentro de tu red sin ser detectado.'},
      {id:10,goodAnswer:'si',strength:'Existe control sobre el tráfico de salida, reduciendo exposición a sitios maliciosos.',risk:'Sin control de navegación, un solo clic en un sitio malicioso puede comprometer toda la red.'},
    ]},
    { id:'correo', title:'Correo y Comunicaciones', questions:[
      {id:11,goodAnswer:'si',strength:'El correo corporativo proyecta profesionalismo y permite control centralizado.',risk:'Usar correos personales para el trabajo dispersa información crítica fuera de tu control y facilita la suplantación de identidad.'},
      {id:12,goodAnswer:'no',strength:'No se han detectado intentos de engaño por correo, aunque la vigilancia debe mantenerse.',risk:'Tu empresa ya ha sido objetivo de intentos de engaño. El phishing es la causa N°1 de brechas hoy.'},
      {id:13,goodAnswer:'si',strength:'Tu equipo cuenta con lineamientos para reaccionar ante contenido sospechoso.',risk:'Sin instrucciones claras, cada colaborador decide solo qué abrir. Un error basta para abrir la puerta a un ataque.'},
    ]},
    { id:'personas', title:'Gestión de Personas y Accesos', questions:[
      {id:14,goodAnswer:'si',strength:'Los accesos se revocan al desvincular personas, cerrando una vía común de fuga.',risk:'Accesos activos de exempleados son una puerta abierta a información de la empresa, incluso meses después de su salida.'},
      {id:15,goodAnswer:'si',strength:'Aplicas el principio de mínimo privilegio: cada quien ve solo lo necesario.',risk:'Si todos acceden a todo, una sola cuenta comprometida expone la totalidad de la información de la empresa.'},
      {id:16,goodAnswer:'si',strength:'Existe claridad sobre la responsabilidad tecnológica.',risk:'Sin responsables definidos, las decisiones de seguridad quedan en tierra de nadie y los problemas se postergan hasta que es tarde.'},
    ]},
    { id:'madurez', title:'Preparación y Madurez', questions:[
      {id:17,goodAnswer:'si',strength:'Existe una noción de cómo reaccionar ante una interrupción mayor.',risk:'Sin un plan de reacción, las primeras horas de un incidente —las más críticas— se pierden en improvisación.'},
      {id:18,goodAnswer:'no',strength:'No se reportan incidentes previos, aunque la ausencia de eventos no equivale a estar protegido.',risk:'Tu empresa ya vivió un incidente. La evidencia muestra que quien fue atacado una vez tiene alta probabilidad de volver a serlo.'},
      {id:19,goodAnswer:'si',strength:'Has sometido tu seguridad a revisión externa recientemente.',risk:'Sin evaluaciones periódicas, operas a ciegas. Las brechas se descubren cuando ya fueron explotadas.'},
      {id:20,goodAnswer:'si',strength:'Hay una figura responsable de la seguridad digital.',risk:'Sin un responsable, la seguridad depende de que nada falle por suerte. No es una estrategia sostenible.'},
    ]},
  ];
  g.DIAG_RISK_LEVELS = [
    {min:0,max:5,label:'CRÍTICO'},{min:6,max:10,label:'ALTO'},{min:11,max:15,label:'MEDIO'},{min:16,max:20,label:'BAJO'}
  ];
})(typeof window!=='undefined'?window:globalThis);
