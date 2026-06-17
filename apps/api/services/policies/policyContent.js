// Contenido PROFUNDO de las políticas ISO 27001:2022 que requieren documento.
// Cada entrada: { titulo, objetivo, definiciones[[t,d]], directrices[], registros[] }.
// directrices acepta strings (viñeta) o [subtítulo, [viñetas]] (subsección).
// Las secciones boilerplate las arma buildEspecifica con tokens {{EMPRESA}}.
module.exports = {
  // A.5.1 lo genera la MAESTRA (plantilla del cliente); se deja como respaldo.
  'A.5.1': {
    titulo: 'Política de Seguridad de la Información',
    objetivo: 'Establecer el marco corporativo de {{EMPRESA}} para proteger la confidencialidad, integridad y disponibilidad de la información, como documento rector del SGSI.',
    directrices: ['La dirección aprueba, respalda y comunica esta política.', 'La información se protege según su clasificación y los requisitos legales y contractuales.', 'Los riesgos se gestionan de forma sistemática y documentada.', 'El incumplimiento se gestiona mediante el proceso disciplinario.'],
  },

  // ───────────────────────── A.5 Organizacional ─────────────────────────
  'A.5.10': {
    titulo: 'Política de Uso Aceptable de la Información y los Activos',
    objetivo: 'Definir las reglas para el uso correcto, ético y seguro de la información y de los activos asociados de {{EMPRESA}}, previniendo su uso indebido, daño o pérdida.',
    definiciones: [
      ['Activo de información', 'Todo dato, sistema, equipo, cuenta o herramienta con valor para {{EMPRESA}} o sus clientes.'],
      ['Uso aceptable', 'Uso de los activos conforme a los fines autorizados, la ley y las políticas de la organización.'],
    ],
    directrices: [
      ['Uso de los activos', [
        'Los activos se utilizan únicamente para fines autorizados relacionados con las funciones del usuario.',
        'Cada usuario es responsable de los activos y la información asignados a su cargo y de su resguardo.',
        'Se prohíbe ceder, prestar o compartir cuentas, credenciales o dispositivos corporativos.',
      ]],
      ['Software e instalaciones', [
        'Solo se instala software autorizado y con licencia; se prohíbe eludir o desactivar controles de seguridad.',
        'Se prohíbe la instalación o uso de software no autorizado, pirata o de origen no confiable.',
      ]],
      ['Correo, internet y mensajería', [
        'El correo e internet corporativos se usan de forma responsable y profesional.',
        'Se prohíbe usar los recursos para actividades ilegales, ofensivas o ajenas al trabajo.',
        'No se transmite información confidencial por canales no autorizados.',
      ]],
      ['Información y dispositivos', [
        'La información se maneja según su clasificación; los medios extraíbles se controlan y cifran.',
        'Los dispositivos se bloquean al ausentarse y se protegen contra robo o acceso no autorizado.',
      ]],
    ],
    registros: ['Acuse de aceptación de la política por cada usuario.', 'Inventario de activos asignados.', 'Registro de software autorizado.', 'Registros de incidentes por uso indebido.'],
  },
  'A.5.12': {
    titulo: 'Política de Clasificación de la Información',
    objetivo: 'Establecer un esquema de clasificación que permita aplicar a la información de {{EMPRESA}} el nivel de protección adecuado según su sensibilidad, valor y requisitos legales.',
    definiciones: [
      ['Propietario de la información', 'Persona responsable de clasificar la información y autorizar su acceso.'],
      ['Clasificación', 'Asignación de un nivel de sensibilidad a la información para determinar su tratamiento.'],
    ],
    directrices: [
      ['Niveles de clasificación', [
        'La información se clasifica en: Público, Interno y Confidencial (y Restringido cuando aplique).',
        'Toda información de clientes se clasifica como mínimo Confidencial, salvo acuerdo más restrictivo.',
        'El propietario de la información determina y revisa su clasificación.',
      ]],
      ['Tratamiento por nivel', [
        'Cada nivel define reglas de acceso, almacenamiento, transmisión, impresión y eliminación.',
        'La información Confidencial se cifra en reposo y en tránsito y su acceso es bajo necesidad de conocer.',
        'La clasificación se hereda a copias, extractos y respaldos de la información.',
      ]],
      'La clasificación se revisa cuando cambia el valor, la sensibilidad o los requisitos legales de la información.',
    ],
    registros: ['Esquema de clasificación aprobado.', 'Inventario de información con su clasificación y propietario.', 'Evidencia de información etiquetada conforme al nivel.'],
  },
  'A.5.14': {
    titulo: 'Política de Transferencia de Información',
    objetivo: 'Proteger la información de {{EMPRESA}} durante su transferencia interna y externa, por cualquier medio, frente a interceptación, copia, modificación o pérdida.',
    definiciones: [
      ['Transferencia', 'Envío o intercambio de información entre personas, áreas u organizaciones por medios físicos o electrónicos.'],
    ],
    directrices: [
      ['Reglas generales', [
        'La información se transfiere solo por medios y canales autorizados, acordes a su clasificación.',
        'La información Confidencial se transfiere cifrada; se verifican los destinatarios antes del envío.',
        'Se prohíbe usar servicios personales o no autorizados para transferir información corporativa.',
      ]],
      ['Transferencias con terceros', [
        'Las transferencias a terceros se rigen por acuerdos formales con cláusulas de seguridad y confidencialidad.',
        'Se definen responsabilidades, niveles de servicio y mecanismos de protección con cada parte.',
      ]],
      ['Medios físicos y mensajería', [
        'Los medios físicos se transportan de forma segura, con embalaje adecuado y trazabilidad.',
        'Se aplican controles ante mensajería electrónica (correo, chat) acordes a la sensibilidad.',
      ]],
    ],
    registros: ['Acuerdos de transferencia/confidencialidad con terceros.', 'Registro de transferencias de información sensible.', 'Configuración de cifrado de los canales.'],
  },
  'A.5.15': {
    titulo: 'Política de Control de Acceso',
    objetivo: 'Regular el acceso lógico y físico a la información y los sistemas de {{EMPRESA}} con base en las necesidades del negocio, el menor privilegio y la necesidad de conocer.',
    definiciones: [
      ['Mínimo privilegio', 'Otorgar únicamente los accesos necesarios para cumplir una función específica.'],
      ['Necesidad de conocer', 'Acceso a información autorizado solo cuando existe una necesidad operativa justificada.'],
      ['Acceso privilegiado', 'Acceso con permisos elevados de administración sobre sistemas o datos.'],
    ],
    directrices: [
      ['Principios', [
        'El acceso se otorga según los principios de necesidad de conocer y mínimo privilegio.',
        'Cada usuario tiene una identidad única e intransferible; se prohíbe compartir cuentas.',
        'No pertenecer a la organización no otorga derecho automático de acceso.',
      ]],
      ['Ciclo de vida del acceso', [
        'Toda solicitud de acceso es aprobada por el propietario de la información o responsable correspondiente.',
        'Los accesos se otorgan, modifican y revocan mediante un procedimiento formal y registrado.',
        'Los accesos se revocan de inmediato ante el cese o cambio de funciones del usuario.',
        'Los accesos se revisan periódicamente (al menos semestralmente) y se corrigen las desviaciones.',
      ]],
      ['Accesos privilegiados', [
        'Los accesos privilegiados se restringen, se asignan de forma nominativa y se registran.',
        'Las cuentas privilegiadas exigen autenticación multifactor y se revisan con mayor frecuencia.',
      ]],
    ],
    registros: ['Matriz de accesos por rol/sistema.', 'Solicitudes y aprobaciones de acceso.', 'Registros de revisión periódica de accesos.', 'Inventario de cuentas privilegiadas.'],
  },
  'A.5.17': {
    titulo: 'Política de Información de Autenticación',
    objetivo: 'Gestionar de forma segura la asignación, el uso y la protección de la información de autenticación (contraseñas, factores y secretos) en {{EMPRESA}}.',
    definiciones: [
      ['Información de autenticación', 'Contraseñas, PIN, tokens, claves o factores usados para verificar la identidad.'],
      ['MFA', 'Autenticación multifactor: dos o más factores independientes de verificación.'],
    ],
    directrices: [
      ['Gestión de credenciales', [
        'Las credenciales se asignan de forma individual y por canales seguros.',
        'Las contraseñas cumplen requisitos mínimos de longitud y complejidad y se cambian ante sospecha de compromiso.',
        'Se prohíbe compartir, reutilizar entre servicios o anotar credenciales en lugares visibles.',
      ]],
      ['Almacenamiento y protección', [
        'Las credenciales se almacenan y transmiten cifradas; nunca en texto plano.',
        'Se utiliza un gestor de contraseñas autorizado para credenciales corporativas.',
        'Las credenciales por defecto se cambian antes de poner un sistema en producción.',
      ]],
      ['Factores adicionales', [
        'Se exige MFA en accesos remotos, privilegiados y a servicios críticos.',
        'Los factores y secretos (llaves API, certificados) se rotan y revocan según su ciclo de vida.',
      ]],
    ],
    registros: ['Estándar de contraseñas y MFA.', 'Evidencia de MFA habilitado en cuentas críticas.', 'Registro de rotación/revocación de secretos.'],
  },
  'A.5.19': {
    titulo: 'Política de Seguridad en Relaciones con Proveedores',
    objetivo: 'Gestionar los riesgos de seguridad de la información derivados del acceso de proveedores y terceros a la información, los sistemas y los activos de {{EMPRESA}}.',
    definiciones: [
      ['Proveedor', 'Tercero que presta servicios o suministra productos que pueden afectar la seguridad de la información.'],
    ],
    directrices: [
      ['Evaluación y selección', [
        'Se evalúa el riesgo de seguridad de los proveedores antes de contratarlos, proporcional a su acceso.',
        'Se identifica qué información, sistemas o activos podrá acceder o gestionar el proveedor.',
      ]],
      ['Acuerdos', [
        'Los acuerdos incluyen requisitos de seguridad, confidencialidad, niveles de servicio y derecho a auditar.',
        'Se definen responsabilidades ante incidentes y obligaciones de notificación.',
        'Se exige a los proveedores aplicar controles equivalentes sobre su propia cadena de suministro cuando corresponda.',
      ]],
      ['Seguimiento y término', [
        'Se monitorea el cumplimiento de seguridad del proveedor durante la relación.',
        'Al término, se revocan accesos y se asegura la devolución o eliminación de la información.',
      ]],
    ],
    registros: ['Evaluaciones de riesgo de proveedores.', 'Contratos/acuerdos con cláusulas de seguridad.', 'Registros de seguimiento y de revocación de accesos al término.'],
  },
  'A.5.29': {
    titulo: 'Política de Seguridad de la Información durante la Disrupción',
    objetivo: 'Asegurar que {{EMPRESA}} mantenga un nivel adecuado de seguridad de la información durante incidentes graves, contingencias o interrupciones de la operación.',
    definiciones: [
      ['Disrupción', 'Evento que interrumpe la operación normal de la organización.'],
      ['RTO / RPO', 'Tiempo objetivo de recuperación / punto objetivo de recuperación de la información.'],
    ],
    directrices: [
      ['Preparación', [
        'Se identifican los procesos, servicios y activos críticos y sus dependencias.',
        'Se definen los controles de seguridad que deben mantenerse durante una disrupción.',
        'Se establecen roles, responsabilidades y contactos para la respuesta y recuperación.',
      ]],
      ['Continuidad y recuperación', [
        'Se definen estrategias de continuidad con objetivos de recuperación (RTO/RPO).',
        'La seguridad de la información no se degrada por debajo del nivel aceptable durante la recuperación.',
        'Los planes se prueban periódicamente y se actualizan según los resultados.',
      ]],
    ],
    registros: ['Análisis de impacto al negocio (BIA).', 'Plan de continuidad de la SI.', 'Resultados de pruebas de continuidad.'],
  },
  'A.5.31': {
    titulo: 'Política de Cumplimiento de Requisitos Legales y Contractuales',
    objetivo: 'Asegurar que {{EMPRESA}} identifique y cumpla los requisitos legales, regulatorios y contractuales aplicables en materia de seguridad de la información.',
    definiciones: [
      ['Requisito legal', 'Obligación derivada de leyes, reglamentos o normas aplicables a la organización.'],
    ],
    directrices: [
      ['Identificación', [
        'Se mantiene un registro actualizado de requisitos legales, regulatorios y contractuales aplicables.',
        'Se asigna un responsable por cada requisito y se documenta cómo se cumple.',
      ]],
      ['Cumplimiento específico', [
        'Se protegen los datos personales conforme a la Ley 21.719 (y 19.628 mientras aplique).',
        'Se cumple la Ley 21.663 de Ciberseguridad según el rol de la organización.',
        'Se respetan los derechos de propiedad intelectual y las licencias de software.',
      ]],
      'Se verifica periódicamente el cumplimiento y se gestionan las desviaciones detectadas.',
    ],
    registros: ['Registro de obligaciones legales y contractuales.', 'Evidencia de cumplimiento por requisito.', 'Inventario de licencias de software.'],
  },
  'A.5.33': {
    titulo: 'Política de Protección de Registros',
    objetivo: 'Proteger los registros de {{EMPRESA}} contra pérdida, destrucción, falsificación, acceso no autorizado y divulgación indebida, conforme a los requisitos legales y de negocio.',
    definiciones: [
      ['Registro', 'Información que evidencia hechos o actividades y debe conservarse por un período determinado.'],
    ],
    directrices: [
      ['Identificación y retención', [
        'Se identifican los tipos de registros y sus períodos de retención legales y contractuales.',
        'Se define un calendario de retención y disposición de los registros.',
      ]],
      ['Protección', [
        'Los registros se protegen según su clasificación y se controla su acceso.',
        'Se preserva la integridad y autenticidad de los registros durante su retención.',
        'Los registros críticos se respaldan y, cuando aplica, se almacenan de forma inalterable.',
      ]],
      'La eliminación de registros se realiza de forma segura una vez cumplido su período de retención.',
    ],
    registros: ['Calendario de retención de registros.', 'Controles de acceso a los registros.', 'Evidencia de eliminación segura.'],
  },
  'A.5.34': {
    titulo: 'Política de Privacidad y Protección de Datos Personales',
    objetivo: 'Proteger los datos personales tratados por {{EMPRESA}} y garantizar el cumplimiento de la normativa de privacidad aplicable y los derechos de los titulares.',
    definiciones: [
      ['Dato personal', 'Información de cualquier tipo referida a una persona natural identificada o identificable.'],
      ['Titular', 'Persona natural a la que se refieren los datos personales.'],
      ['Tratamiento', 'Cualquier operación sobre datos personales: recolección, uso, almacenamiento, transferencia, eliminación.'],
    ],
    directrices: [
      ['Principios de tratamiento', [
        'El tratamiento se realiza con base legal, para fines legítimos, explícitos y limitados.',
        'Se aplica minimización: solo se tratan los datos necesarios para el fin declarado.',
        'Se mantiene un registro de las actividades de tratamiento.',
      ]],
      ['Derechos y seguridad', [
        'Se respetan los derechos de los titulares (acceso, rectificación, cancelación, oposición y portabilidad).',
        'Se aplican medidas de seguridad proporcionales al riesgo de los datos personales.',
        'Las transferencias a terceros se rigen por acuerdos que garantizan la protección de los datos.',
      ]],
      ['Brechas', [
        'Las brechas de datos personales se gestionan como incidentes y se notifican según corresponda legalmente.',
      ]],
    ],
    registros: ['Registro de actividades de tratamiento.', 'Bases de legitimación / consentimientos.', 'Procedimiento y registros de atención de derechos.', 'Registros de brechas y notificaciones.'],
  },

  // ───────────────────────── A.6 Personas ─────────────────────────
  'A.6.2': {
    titulo: 'Política de Términos y Condiciones de Empleo (Seguridad)',
    objetivo: 'Definir las responsabilidades de seguridad de la información que asume el personal de {{EMPRESA}} como parte de su relación laboral o contractual.',
    definiciones: [['Términos de empleo', 'Condiciones contractuales que rigen la relación laboral, incluidas las de seguridad.']],
    directrices: [
      'Los contratos incluyen cláusulas de seguridad de la información y de confidencialidad.',
      'El personal acepta y se compromete a cumplir las políticas de seguridad antes de acceder a la información.',
      'Se informan las responsabilidades de seguridad propias del rol y las consecuencias de su incumplimiento.',
      'Las responsabilidades de seguridad relevantes (confidencialidad) perduran tras el término del empleo.',
      'Los contratos con terceros incluyen obligaciones de seguridad equivalentes.',
    ],
    registros: ['Contratos con cláusulas de seguridad firmados.', 'Acuses de aceptación de políticas.', 'Acuerdos de confidencialidad.'],
  },
  'A.6.3': {
    titulo: 'Política de Concienciación, Educación y Formación en Seguridad',
    objetivo: 'Asegurar que el personal de {{EMPRESA}} adquiera y mantenga la conciencia, el conocimiento y las competencias en seguridad de la información acordes a su rol.',
    definiciones: [['Concienciación', 'Actividades para que el personal comprenda y aplique sus responsabilidades de seguridad.']],
    directrices: [
      ['Programa', [
        'Todo el personal recibe inducción de seguridad al incorporarse.',
        'Se ejecuta un programa de concienciación periódico (al menos anual) y obligatorio.',
        'La formación se adapta a los roles, especialmente para perfiles técnicos y de mayor riesgo.',
      ]],
      ['Contenidos y evaluación', [
        'Se cubren amenazas vigentes: phishing, ingeniería social, contraseñas, manejo de datos y reporte de incidentes.',
        'Se evalúa la efectividad (cuestionarios, simulaciones de phishing) y se refuerzan las brechas.',
        'Se mantiene registro de asistencia y de resultados.',
      ]],
    ],
    registros: ['Plan anual de concienciación.', 'Registros de asistencia y evaluación.', 'Resultados de simulaciones de phishing.'],
  },
  'A.6.6': {
    titulo: 'Política de Acuerdos de Confidencialidad',
    objetivo: 'Proteger la información confidencial de {{EMPRESA}} y de sus clientes mediante acuerdos de confidencialidad con el personal y los terceros.',
    definiciones: [['NDA', 'Acuerdo de confidencialidad o no divulgación.']],
    directrices: [
      'El personal y los terceros con acceso a información confidencial firman un acuerdo de confidencialidad (NDA) antes de acceder.',
      'El acuerdo define el alcance de la información protegida, las obligaciones y su duración.',
      'La obligación de confidencialidad se mantiene tras el término de la relación, por el plazo definido.',
      'Los acuerdos se revisan periódicamente y ante cambios en los requisitos.',
      'El incumplimiento puede derivar en acciones disciplinarias y legales.',
    ],
    registros: ['NDA firmados (personal y terceros).', 'Registro de acuerdos vigentes y sus plazos.'],
  },
  'A.6.7': {
    titulo: 'Política de Trabajo Remoto y Acceso Remoto',
    objetivo: 'Proteger la información de {{EMPRESA}} cuando el personal accede o la procesa desde ubicaciones fuera de las instalaciones de la organización.',
    definiciones: [['Trabajo remoto', 'Realización de funciones laborales fuera de las instalaciones de la organización.']],
    directrices: [
      ['Acceso seguro', [
        'El acceso remoto se realiza mediante canales cifrados (VPN) y autenticación multifactor.',
        'Se prohíbe el uso de redes públicas no seguras sin protección adicional.',
      ]],
      ['Dispositivos y entorno', [
        'Los equipos de trabajo remoto cuentan con cifrado de disco, antimalware/EDR y actualizaciones al día.',
        'La información confidencial no se almacena en dispositivos personales no autorizados.',
        'Se aplican medidas de escritorio y pantalla despejada también fuera de la oficina.',
      ]],
      'Se reportan de inmediato la pérdida o robo de dispositivos o credenciales usados en trabajo remoto.',
    ],
    registros: ['Política/autorizaciones de trabajo remoto.', 'Configuración de VPN y MFA.', 'Inventario de dispositivos habilitados para acceso remoto.'],
  },

  // ───────────────────────── A.7 Físico ─────────────────────────
  'A.7.7': {
    titulo: 'Política de Escritorio Despejado y Pantalla Despejada',
    objetivo: 'Reducir el riesgo de acceso no autorizado, pérdida o daño de la información en los puestos de trabajo de {{EMPRESA}}, tanto físicos como digitales.',
    definiciones: [['Escritorio despejado', 'Práctica de no dejar información sensible visible o desatendida en el puesto de trabajo.']],
    directrices: [
      'La información sensible no se deja visible ni desatendida en escritorios, impresoras o salas.',
      'Las sesiones se bloquean al ausentarse del puesto y se cierran al finalizar la jornada.',
      'Los documentos confidenciales se guardan bajo llave fuera del horario laboral.',
      'Los medios extraíbles y dispositivos se resguardan cuando no están en uso.',
      'La impresión de información confidencial se retira de inmediato y se usa impresión segura cuando esté disponible.',
      'Las pizarras y notas se borran tras reuniones que traten información sensible.',
    ],
    registros: ['Política comunicada y aceptada.', 'Registros de verificaciones/observaciones de cumplimiento.'],
  },
  'A.7.10': {
    titulo: 'Política de Gestión de Medios de Almacenamiento',
    objetivo: 'Proteger la información de {{EMPRESA}} almacenada en medios físicos y extraíbles durante todo su ciclo de vida, desde su uso hasta su eliminación.',
    definiciones: [['Medio de almacenamiento', 'Soporte físico que contiene información (discos, USB, cintas, papel).']],
    directrices: [
      ['Uso y custodia', [
        'El uso de medios extraíbles se autoriza y la información sensible en ellos se cifra.',
        'Se controla el acceso físico a los medios y se registran sus movimientos relevantes.',
      ]],
      ['Transporte', [
        'Los medios se transportan de forma segura, con embalaje y trazabilidad adecuados.',
      ]],
      ['Eliminación', [
        'Los medios se eliminan de forma segura al final de su vida útil (borrado seguro o destrucción física).',
        'Se obtiene evidencia (certificado o acta) de la destrucción de medios con información sensible.',
      ]],
    ],
    registros: ['Inventario y registro de movimientos de medios.', 'Autorizaciones de uso de medios extraíbles.', 'Actas/certificados de destrucción.'],
  },

  // ───────────────────────── A.8 Tecnológico ─────────────────────────
  'A.8.5': {
    titulo: 'Política de Autenticación Segura',
    objetivo: 'Definir los mecanismos y tecnologías de autenticación que protegen el acceso a los sistemas e información de {{EMPRESA}}.',
    definiciones: [['MFA', 'Autenticación multifactor: dos o más factores independientes de verificación.']],
    directrices: [
      'El acceso a los sistemas requiere identificación única y autenticación previa.',
      'Se exige autenticación multifactor en accesos remotos, privilegiados y a servicios críticos.',
      'Las contraseñas cumplen requisitos de longitud y complejidad y no se reutilizan entre servicios.',
      'Las sesiones se bloquean tras inactividad y se cierran al finalizar.',
      'Se limita el número de intentos fallidos y se registran los eventos de autenticación.',
      'Las credenciales se transmiten y almacenan cifradas; se evita mostrar contraseñas en pantalla.',
    ],
    registros: ['Estándar de autenticación.', 'Evidencia de MFA y políticas de sesión configuradas.', 'Registros (logs) de autenticación.'],
  },
  'A.8.7': {
    titulo: 'Política de Protección contra Malware',
    objetivo: 'Proteger los sistemas y la información de {{EMPRESA}} frente a software malicioso mediante controles de prevención, detección y respuesta.',
    definiciones: [['Malware', 'Software malicioso diseñado para dañar, alterar o acceder sin autorización a sistemas o datos.']],
    directrices: [
      ['Prevención', [
        'Todos los equipos cuentan con protección antimalware/EDR activa y actualizada.',
        'Se restringe la instalación de software no autorizado y la ejecución desde medios no confiables.',
        'Se aplican filtros de correo y web para bloquear contenido malicioso.',
      ]],
      ['Detección y respuesta', [
        'Se analizan archivos y medios externos antes de su uso.',
        'Se prohíbe deshabilitar las protecciones de seguridad de los equipos.',
        'Los eventos de malware se reportan y gestionan como incidentes de seguridad.',
      ]],
    ],
    registros: ['Consola antimalware/EDR con cobertura y estado.', 'Registros de detecciones y respuesta.', 'Configuración de filtros de correo/web.'],
  },
  'A.8.9': {
    titulo: 'Política de Gestión de la Configuración',
    objetivo: 'Asegurar que los sistemas, equipos y servicios de {{EMPRESA}} se configuren, documenten y mantengan de forma segura (hardening) a lo largo de su ciclo de vida.',
    definiciones: [['Línea base de configuración', 'Conjunto estándar y aprobado de parámetros de configuración segura para un tipo de sistema.']],
    directrices: [
      ['Líneas base', [
        'Se definen y aprueban líneas base de configuración segura por tipo de sistema (servidores, estaciones, red, cloud).',
        'Se eliminan servicios, cuentas, software y puertos innecesarios.',
        'Se cambian las credenciales y parámetros por defecto antes de producción.',
      ]],
      ['Control de cambios y verificación', [
        'Las desviaciones respecto a la línea base se documentan y aprueban formalmente.',
        'Se revisan periódicamente las configuraciones para detectar cambios no autorizados.',
        'Los cambios de configuración siguen el procedimiento de gestión de cambios.',
      ]],
    ],
    registros: ['Líneas base de configuración aprobadas.', 'Registros de revisión de configuraciones.', 'Excepciones y cambios aprobados.'],
  },
  'A.8.13': {
    titulo: 'Política de Copia de Seguridad de la Información',
    objetivo: 'Garantizar la disponibilidad y la capacidad de recuperación de la información y los sistemas de {{EMPRESA}} ante pérdida, error, incidente o desastre.',
    definiciones: [
      ['Respaldo (backup)', 'Copia de información que permite su restauración ante pérdida o daño.'],
      ['RPO / RTO', 'Punto objetivo de recuperación / tiempo objetivo de recuperación.'],
    ],
    directrices: [
      ['Ejecución', [
        'Se realizan copias de seguridad periódicas de la información y los sistemas críticos.',
        'Se define el alcance, la frecuencia y el período de retención conforme a los objetivos RPO/RTO.',
      ]],
      ['Protección y recuperación', [
        'Las copias se almacenan de forma segura, cifradas e idealmente en ubicación separada (regla 3-2-1).',
        'Se controla el acceso a los respaldos y se protege su integridad frente a ransomware.',
        'Se prueban periódicamente las restauraciones para validar su efectividad y se documentan los resultados.',
      ]],
    ],
    registros: ['Política/calendario de respaldos.', 'Registros de ejecución de copias.', 'Resultados de pruebas de restauración.'],
  },
  'A.8.20': {
    titulo: 'Política de Seguridad en Redes',
    objetivo: 'Proteger las redes, los dispositivos de red y la información en tránsito de {{EMPRESA}} frente a accesos no autorizados y amenazas.',
    definiciones: [['Segmentación', 'División de la red en zonas con distintos niveles de confianza y controles entre ellas.']],
    directrices: [
      ['Arquitectura', [
        'Las redes se segmentan según su criticidad y se controlan los flujos entre segmentos.',
        'Se utilizan firewalls y controles perimetrales con reglas mínimas necesarias (deny by default).',
        'Las redes inalámbricas se protegen con cifrado fuerte y autenticación.',
      ]],
      ['Acceso y monitoreo', [
        'Los accesos remotos a la red se realizan mediante canales cifrados y MFA.',
        'Se monitorea el tráfico para detectar actividad anómala y se registran los eventos relevantes.',
        'Los dispositivos de red se configuran de forma segura y se mantienen actualizados.',
      ]],
    ],
    registros: ['Diagrama de red y de segmentación.', 'Reglas de firewall y su revisión.', 'Registros de monitoreo de red.'],
  },
  'A.8.24': {
    titulo: 'Política de Uso de Criptografía',
    objetivo: 'Asegurar el uso correcto, efectivo y consistente de la criptografía para proteger la confidencialidad, integridad y autenticidad de la información de {{EMPRESA}}.',
    definiciones: [
      ['Cifrado', 'Transformación de la información para hacerla ilegible sin la clave correspondiente.'],
      ['Gestión de llaves', 'Procesos de generación, distribución, almacenamiento, rotación y revocación de claves.'],
    ],
    directrices: [
      ['Uso de la criptografía', [
        'La información confidencial se cifra en reposo y en tránsito.',
        'Se utilizan algoritmos y longitudes de clave reconocidos y vigentes; se prohíben los obsoletos.',
        'Las comunicaciones con clientes y servicios usan protocolos seguros (TLS vigente).',
      ]],
      ['Gestión de llaves', [
        'Las claves se generan, almacenan, rotan y revocan de forma segura durante todo su ciclo de vida.',
        'El acceso a las claves se restringe bajo mínimo privilegio y se registra.',
        'Se definen procedimientos de respaldo y recuperación de claves para evitar pérdida de información.',
      ]],
    ],
    registros: ['Política/estándar criptográfico.', 'Inventario de certificados y claves con sus vencimientos.', 'Evidencia de cifrado aplicado.'],
  },
}
