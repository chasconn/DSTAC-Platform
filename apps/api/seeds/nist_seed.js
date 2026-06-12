/**
 * NIST CSF 2.0 Seed — carga funciones, categorías y controles reales en db_dstac_core.
 * Idempotente: usa INSERT IGNORE, puede re-ejecutarse sin duplicar datos.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

// ─── FUNCIONES (5 funciones del framework) ────────────────────────────────────

const FUNCTIONS = [
  {
    id: 'ID', code: 'IDENTIFICAR', name: 'Identificar',
    description: 'Desarrollar el entendimiento organizacional para gestionar el riesgo de ciberseguridad en sistemas, personas, activos, datos y capacidades.',
    color: '#E24B4A', order_num: 1,
  },
  {
    id: 'PR', code: 'PROTEGER', name: 'Proteger',
    description: 'Desarrollar e implementar las salvaguardas adecuadas para garantizar la prestación de servicios críticos.',
    color: '#1D9E75', order_num: 2,
  },
  {
    id: 'DE', code: 'DETECTAR', name: 'Detectar',
    description: 'Desarrollar e implementar actividades apropiadas para identificar la ocurrencia de un evento de ciberseguridad.',
    color: '#E24B4A', order_num: 3,
  },
  {
    id: 'RS', code: 'RESPONDER', name: 'Responder',
    description: 'Desarrollar e implementar actividades apropiadas para tomar acciones ante un incidente de ciberseguridad detectado.',
    color: '#EF9F27', order_num: 4,
  },
  {
    id: 'RC', code: 'RECUPERAR', name: 'Recuperar',
    description: 'Desarrollar e implementar actividades apropiadas para mantener planes de resiliencia y restaurar capacidades o servicios afectados.',
    color: '#EF9F27', order_num: 5,
  },
]

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  // ── IDENTIFICAR ──
  { id: 'ID.AM', function_id: 'ID', name: 'Gestión de Activos',       description: 'Los datos, personal, dispositivos, sistemas y servicios son identificados y gestionados de manera consistente con su importancia para los objetivos del negocio.' },
  { id: 'ID.BE', function_id: 'ID', name: 'Entorno Empresarial',      description: 'La misión, objetivos, partes interesadas y actividades de la organización son comprendidos y priorizados.' },
  { id: 'ID.GV', function_id: 'ID', name: 'Gobernanza',               description: 'Las políticas, procedimientos y procesos para gestionar y monitorear los requisitos regulatorios, legales, de riesgo, ambientales y operativos son comprendidos.' },
  { id: 'ID.RA', function_id: 'ID', name: 'Evaluación de Riesgos',    description: 'La organización comprende el riesgo de ciberseguridad para las operaciones, activos e individuos de la organización.' },
  { id: 'ID.IM', function_id: 'ID', name: 'Mejora',                   description: 'Las mejoras a las capacidades de ciberseguridad de la organización son identificadas e implementadas basadas en lecciones aprendidas.' },
  // ── PROTEGER ──
  { id: 'PR.AA', function_id: 'PR', name: 'Gestión de Identidades y Accesos', description: 'El acceso a activos físicos y lógicos y a las instalaciones relacionadas se limita a usuarios, procesos y dispositivos autorizados.' },
  { id: 'PR.AT', function_id: 'PR', name: 'Concienciación y Formación',       description: 'El personal de la organización y los socios reciben educación en ciberseguridad y están adecuadamente capacitados para realizar sus deberes.' },
  { id: 'PR.DS', function_id: 'PR', name: 'Seguridad de Datos',               description: 'La información y los registros son gestionados de acuerdo a la estrategia de riesgo de la organización para proteger la confidencialidad, integridad y disponibilidad de la información.' },
  { id: 'PR.PS', function_id: 'PR', name: 'Seguridad de Plataformas',         description: 'Los sistemas de información y los activos tecnológicos son gestionados de manera segura para reducir la exposición a las amenazas de ciberseguridad.' },
  { id: 'PR.IR', function_id: 'PR', name: 'Resiliencia de Infraestructura',   description: 'Planes de seguridad y resiliencia son desarrollados e implementados, incluyendo respuestas a desastres y planificación de continuidad.' },
  // ── DETECTAR ──
  { id: 'DE.AE', function_id: 'DE', name: 'Análisis de Eventos Adversos', description: 'Los eventos anómalos son detectados y el impacto potencial de los eventos es comprendido.' },
  { id: 'DE.CM', function_id: 'DE', name: 'Monitoreo Continuo',            description: 'Los sistemas de información y los activos son monitoreados para identificar eventos de ciberseguridad y verificar la efectividad de las medidas de protección.' },
  // ── RESPONDER ──
  { id: 'RS.MA', function_id: 'RS', name: 'Gestión de Incidentes',          description: 'Las actividades de respuesta a incidentes son coordinadas con las partes internas y externas relevantes.' },
  { id: 'RS.AN', function_id: 'RS', name: 'Análisis de Incidentes',         description: 'El análisis es realizado para asegurar la respuesta efectiva y apoyar las actividades de recuperación.' },
  { id: 'RS.CO', function_id: 'RS', name: 'Comunicación de Incidentes',     description: 'Las actividades de respuesta son coordinadas con las partes interesadas internas y externas.' },
  { id: 'RS.MI', function_id: 'RS', name: 'Mitigación de Incidentes',       description: 'Las actividades se realizan para prevenir la expansión del evento, mitigar sus efectos y erradicar el incidente.' },
  // ── RECUPERAR ──
  { id: 'RC.RP', function_id: 'RC', name: 'Ejecución del Plan de Recuperación', description: 'Los planes de recuperación y procesos son ejecutados y mantenidos para asegurar una recuperación oportuna de los sistemas y activos afectados.' },
  { id: 'RC.CO', function_id: 'RC', name: 'Comunicación de Recuperación',       description: 'Las actividades de restauración son coordinadas con partes internas y externas, como centros de coordinación, proveedores de Internet, dueños de sistemas atacantes, víctimas, otros CSIRTs y vendedores.' },
]

// ─── CONTROLES (todos los controles reales del NIST CSF 2.0) ─────────────────

const CONTROLS = [

  // ════════════════════════════════════════════════════════
  // IDENTIFICAR — ID.AM  Gestión de Activos
  // ════════════════════════════════════════════════════════
  {
    id: 'ID.AM-01', category_id: 'ID.AM', order_num: 1,
    name: 'Inventarios de activos físicos mantenidos',
    description: 'Los inventarios de activos físicos de hardware (sistemas de TI, equipos operativos, dispositivos IoT, sistemas de control industrial) son mantenidos, actualizados y revisados de forma regular.',
    data_source: 'activos',
    checklist: [
      'Inventario de hardware existe y está documentado formalmente',
      'Responsable de activos asignado por categoría',
      'Activos críticos identificados y marcados',
      'Inventario actualizado al menos trimestralmente',
      'Ciclo de vida de activos (alta, cambio, baja) definido y seguido',
    ],
  },
  {
    id: 'ID.AM-02', category_id: 'ID.AM', order_num: 2,
    name: 'Inventarios de software y licencias mantenidos',
    description: 'Los inventarios de plataformas de software, entornos de software y otras licencias son mantenidos, incluyendo versiones, configuraciones y estado de soporte del fabricante.',
    data_source: 'activos',
    checklist: [
      'Inventario de software instalado documentado',
      'Versiones y estado de parches registrados',
      'Licencias activas y fechas de vencimiento controladas',
      'Software no autorizado identificado y gestionado',
      'EOL (End-of-Life) de software monitoreado',
    ],
  },
  {
    id: 'ID.AM-03', category_id: 'ID.AM', order_num: 3,
    name: 'Representaciones de redes y flujos de datos mantenidas',
    description: 'Representaciones de las redes de comunicación de la organización y sus flujos de datos internos y externos son mantenidas, actualizadas y reflejan el estado actual de la arquitectura.',
    data_source: 'activos',
    checklist: [
      'Diagrama de red documentado y actualizado',
      'Flujos de datos críticos identificados',
      'Conexiones externas (proveedores, internet) documentadas',
      'Segmentación de red documentada',
      'Diagrama revisado ante cambios de infraestructura',
    ],
  },
  {
    id: 'ID.AM-04', category_id: 'ID.AM', order_num: 4,
    name: 'Inventarios de servicios externos mantenidos',
    description: 'Los inventarios de servicios brindados por proveedores externos son mantenidos, incluyendo servicios en la nube, SaaS, infraestructura administrada y proveedores críticos.',
    data_source: 'activos',
    checklist: [
      'Lista de proveedores de servicios externos documentada',
      'Criticidad de cada servicio externo evaluada',
      'Contratos y SLAs revisados y vigentes',
      'Accesos de proveedores controlados y auditados',
      'Plan de contingencia ante falla de proveedor crítico',
    ],
  },
  {
    id: 'ID.AM-05', category_id: 'ID.AM', order_num: 5,
    name: 'Activos priorizados según criticidad',
    description: 'Los activos son priorizados según su criticidad para las funciones del negocio, la sensibilidad de los datos que procesan y los requisitos regulatorios aplicables.',
    data_source: 'activos',
    checklist: [
      'Criterios de criticidad definidos formalmente',
      'Clasificación de activos (crítico/alto/medio/bajo) aplicada',
      'Activos críticos con controles adicionales implementados',
      'Revisión de criticidad anual realizada',
      'Clasificación alineada con análisis de impacto al negocio',
    ],
  },
  {
    id: 'ID.AM-07', category_id: 'ID.AM', order_num: 6,
    name: 'Inventarios de datos mantenidos',
    description: 'Los inventarios de datos son mantenidos con información sobre su sensibilidad, clasificación, dónde residen, ciclo de vida y los controles aplicados para su protección.',
    data_source: 'activos',
    checklist: [
      'Inventario de datos y bases de datos documentado',
      'Clasificación de datos (confidencial/interno/público) aplicada',
      'Datos personales y sensibles identificados',
      'Responsables de datos definidos',
      'Ciclo de vida de datos (retención/eliminación) establecido',
    ],
  },
  {
    id: 'ID.AM-08', category_id: 'ID.AM', order_num: 7,
    name: 'Sistemas gestionados a lo largo de su ciclo de vida',
    description: 'Los sistemas, hardware, software, servicios y datos son administrados a lo largo de sus ciclos de vida de manera coherente con el apetito de riesgo de la organización.',
    data_source: 'activos',
    checklist: [
      'Proceso de gestión del ciclo de vida documentado',
      'Fechas de EOL/EOS de sistemas monitoreadas',
      'Proceso de aprobación para nuevos activos definido',
      'Proceso de retiro seguro de activos implementado',
      'Registro de cambios de infraestructura mantenido',
    ],
  },

  // ════════════════════════════════════════════════════════
  // IDENTIFICAR — ID.BE  Entorno Empresarial
  // ════════════════════════════════════════════════════════
  {
    id: 'ID.BE-01', category_id: 'ID.BE', order_num: 1,
    name: 'Rol en la cadena de suministro documentado',
    description: 'El rol de la organización en la cadena de suministro es identificado y comunicado internamente, incluyendo las dependencias de proveedores y el impacto de la organización en sus clientes.',
    data_source: 'documentos',
    checklist: [
      'Rol en la cadena de suministro definido y documentado',
      'Dependencias críticas de proveedores identificadas',
      'Impacto de la organización en sus clientes evaluado',
      'Mapa de cadena de suministro actualizado',
      'Riesgos de la cadena de suministro evaluados',
    ],
  },
  {
    id: 'ID.BE-02', category_id: 'ID.BE', order_num: 2,
    name: 'Lugar en infraestructura crítica documentado',
    description: 'El lugar de la organización en la infraestructura crítica y su sector industrial es identificado y comunicado, incluyendo interdependencias con otros sectores.',
    data_source: 'documentos',
    checklist: [
      'Sector de infraestructura crítica identificado',
      'Interdependencias con otros sectores documentadas',
      'Impacto de incidentes en el sector evaluado',
      'Contactos del sector de ciberseguridad establecidos',
    ],
  },
  {
    id: 'ID.BE-03', category_id: 'ID.BE', order_num: 3,
    name: 'Prioridades de misión y objetivos establecidas',
    description: 'Las prioridades para la misión, objetivos y actividades de la organización son establecidas y comunicadas, permitiendo tomar decisiones de gestión de riesgos consistentes.',
    data_source: 'documentos',
    checklist: [
      'Misión y objetivos de negocio documentados',
      'Funciones críticas del negocio identificadas',
      'Priorización de servicios críticos documentada',
      'Tolerancia al riesgo organizacional definida',
      'Objetivos de nivel de servicio (RTO/RPO) establecidos',
    ],
  },
  {
    id: 'ID.BE-04', category_id: 'ID.BE', order_num: 4,
    name: 'Dependencias y funciones críticas establecidas',
    description: 'Las dependencias y funciones críticas para la prestación de servicios son identificadas, incluyendo sistemas de TI, proveedores, personal clave y procesos de negocio.',
    data_source: 'documentos',
    checklist: [
      'Análisis de dependencias críticas realizado',
      'Puntos únicos de falla identificados',
      'Personal clave y sus responsabilidades documentados',
      'Proveedores críticos identificados con alternativas',
      'Análisis de impacto al negocio (BIA) documentado',
    ],
  },
  {
    id: 'ID.BE-05', category_id: 'ID.BE', order_num: 5,
    name: 'Requisitos de resiliencia para servicios críticos establecidos',
    description: 'Los requisitos de resiliencia para soportar la prestación de servicios críticos son establecidos para todos los estados operativos: normal, operaciones degradadas, y recuperación.',
    data_source: 'documentos',
    checklist: [
      'RTO y RPO definidos para servicios críticos',
      'Arquitectura de alta disponibilidad implementada',
      'Plan de continuidad de negocio documentado',
      'Pruebas de resiliencia realizadas periódicamente',
      'Requisitos de resiliencia incluidos en contratos con proveedores',
    ],
  },

  // ════════════════════════════════════════════════════════
  // IDENTIFICAR — ID.GV  Gobernanza
  // ════════════════════════════════════════════════════════
  {
    id: 'ID.GV-01', category_id: 'ID.GV', order_num: 1,
    name: 'Política de ciberseguridad organizacional establecida',
    description: 'La política de ciberseguridad de la organización es establecida, comunicada y aplicada, reflejando las tolerancias al riesgo, el marco regulatorio aplicable y los requisitos de las partes interesadas.',
    data_source: 'documentos',
    checklist: [
      'Política de ciberseguridad formalmente aprobada por la dirección',
      'Política comunicada a todo el personal',
      'Política revisada y actualizada anualmente',
      'Cumplimiento de política verificado y auditado',
      'Sanciones por incumplimiento definidas y comunicadas',
    ],
  },
  {
    id: 'ID.GV-02', category_id: 'ID.GV', order_num: 2,
    name: 'Roles y responsabilidades de ciberseguridad establecidos',
    description: 'Los roles, responsabilidades y autoridades de ciberseguridad son coordinados y alineados con los roles internos y los socios externos, asegurando la rendición de cuentas.',
    data_source: 'personal',
    checklist: [
      'Responsable de ciberseguridad designado formalmente',
      'Roles y responsabilidades documentados en descripción de cargos',
      'Matriz RACI de ciberseguridad definida',
      'Responsabilidades comunicadas y comprendidas',
      'Revisión anual de roles y responsabilidades realizada',
    ],
  },
  {
    id: 'ID.GV-03', category_id: 'ID.GV', order_num: 3,
    name: 'Requisitos legales y regulatorios comprendidos',
    description: 'Los requisitos legales, reglamentarios y contractuales de ciberseguridad son comprendidos, gestionados y comunicados a las partes relevantes de la organización.',
    data_source: 'documentos',
    checklist: [
      'Marco regulatorio aplicable identificado (Ley de Datos, GDPR, etc.)',
      'Obligaciones de reporte de incidentes conocidas',
      'Contratos con clientes y proveedores con requisitos de seguridad revisados',
      'Cumplimiento legal evaluado periódicamente',
      'Asesor legal/compliance designado para ciberseguridad',
    ],
  },
  {
    id: 'ID.GV-04', category_id: 'ID.GV', order_num: 4,
    name: 'Estrategia de gobernanza de riesgos establecida',
    description: 'La estrategia de gobernanza de riesgos organizacional es establecida e informa las decisiones de ciberseguridad, incluyendo el apetito de riesgo, la tolerancia y las metodologías de evaluación.',
    data_source: 'documentos',
    checklist: [
      'Apetito de riesgo organizacional definido y aprobado',
      'Metodología de gestión de riesgos documentada',
      'Comité de riesgos o función equivalente establecida',
      'Riesgos de ciberseguridad integrados al registro de riesgos corporativo',
      'Revisión periódica de la estrategia de riesgos realizada',
    ],
  },
  {
    id: 'ID.GV-05', category_id: 'ID.GV', order_num: 5,
    name: 'Resultados de evaluación de riesgos informan gobernanza',
    description: 'Los resultados de las evaluaciones de riesgo de ciberseguridad son utilizados para informar y ajustar las decisiones de gobernanza, presupuesto e inversiones en ciberseguridad.',
    data_source: 'documentos',
    checklist: [
      'Evaluaciones de riesgo realizadas al menos anualmente',
      'Resultados de evaluaciones presentados a la dirección',
      'Decisiones de inversión en ciberseguridad basadas en riesgo',
      'Plan de tratamiento de riesgos aprobado y en seguimiento',
    ],
  },
  {
    id: 'ID.GV-06', category_id: 'ID.GV', order_num: 6,
    name: 'Política de ciberseguridad revisada y actualizada',
    description: 'La política de ciberseguridad organizacional es revisada y actualizada para reflejar cambios en los requisitos, amenazas, tecnología y misión organizacional.',
    data_source: 'documentos',
    checklist: [
      'Ciclo de revisión de políticas definido (mínimo anual)',
      'Disparadores de revisión extraordinaria identificados',
      'Control de versiones de políticas implementado',
      'Historial de cambios y aprobaciones documentado',
      'Distribución de versión actualizada confirmada',
    ],
  },

  // ════════════════════════════════════════════════════════
  // IDENTIFICAR — ID.RA  Evaluación de Riesgos
  // ════════════════════════════════════════════════════════
  {
    id: 'ID.RA-01', category_id: 'ID.RA', order_num: 1,
    name: 'Vulnerabilidades en activos identificadas',
    description: 'Las vulnerabilidades en activos de la organización son identificadas, validadas y registradas de forma sistemática mediante análisis de vulnerabilidades, gestión de parches y otras técnicas.',
    data_source: 'activos',
    checklist: [
      'Proceso de gestión de vulnerabilidades implementado',
      'Escaneos de vulnerabilidades realizados periódicamente',
      'Registro de vulnerabilidades mantenido y actualizado',
      'Priorización de vulnerabilidades por criticidad implementada',
      'Tiempo de remediación según criticidad definido y monitoreado',
    ],
  },
  {
    id: 'ID.RA-02', category_id: 'ID.RA', order_num: 2,
    name: 'Inteligencia de amenazas cibernéticas recibida',
    description: 'La inteligencia sobre amenazas cibernéticas es recibida de foros de intercambio de información, medios especializados y fuentes sectoriales, y es utilizada para informar la gestión de riesgos.',
    data_source: 'incidentes',
    checklist: [
      'Fuentes de inteligencia de amenazas suscritas (CISA, CERT, etc.)',
      'Alertas de amenazas recibidas y procesadas',
      'Proceso para actuar sobre alertas de amenazas definido',
      'Participación en comunidades de intercambio de información',
    ],
  },
  {
    id: 'ID.RA-03', category_id: 'ID.RA', order_num: 3,
    name: 'Amenazas internas y externas identificadas',
    description: 'Las amenazas internas y externas para la organización son identificadas, documentadas y actualizadas periódicamente para reflejar el panorama de amenazas actual.',
    data_source: 'incidentes',
    checklist: [
      'Catálogo de amenazas documentado y actualizado',
      'Amenazas internas (empleados, contratistas) consideradas',
      'Amenazas externas (cibercrimen, competencia) evaluadas',
      'Revisión de amenazas al menos semestral realizada',
    ],
  },
  {
    id: 'ID.RA-04', category_id: 'ID.RA', order_num: 4,
    name: 'Impactos y probabilidades de amenazas evaluados',
    description: 'Los impactos potenciales y las probabilidades de amenazas que explotan vulnerabilidades son evaluados y utilizados para determinar el nivel de riesgo residual.',
    data_source: 'incidentes',
    checklist: [
      'Metodología de evaluación de riesgo documentada',
      'Matrices de probabilidad e impacto definidas',
      'Riesgos evaluados y puntuados formalmente',
      'Riesgos residuales calculados y documentados',
      'Revisión periódica de evaluaciones de riesgo implementada',
    ],
  },
  {
    id: 'ID.RA-05', category_id: 'ID.RA', order_num: 5,
    name: 'Amenazas, vulnerabilidades e impactos priorizados',
    description: 'Las amenazas, vulnerabilidades, probabilidades e impactos son priorizados y utilizados para identificar y enfocar los recursos de ciberseguridad en los riesgos más significativos.',
    data_source: 'incidentes',
    checklist: [
      'Criterios de priorización de riesgos definidos',
      'Top de riesgos críticos identificados y en seguimiento',
      'Recursos asignados según prioridad de riesgo',
      'Revisión de prioridades realizada ante cambios significativos',
    ],
  },
  {
    id: 'ID.RA-06', category_id: 'ID.RA', order_num: 6,
    name: 'Respuestas a riesgos seleccionadas e implementadas',
    description: 'Las respuestas a riesgos (aceptar, evitar, mitigar, transferir) son seleccionadas, priorizadas, planificadas, implementadas y monitoreadas de acuerdo con la estrategia de gestión de riesgos.',
    data_source: 'incidentes',
    checklist: [
      'Opciones de tratamiento de riesgo evaluadas (mitigar/aceptar/transferir/evitar)',
      'Planes de tratamiento de riesgo documentados y aprobados',
      'Seguimiento de implementación de controles de riesgo',
      'Riesgos aceptados documentados con justificación y aprobación',
      'Riesgos transferidos (seguros, terceros) documentados',
    ],
  },
  {
    id: 'ID.RA-07', category_id: 'ID.RA', order_num: 7,
    name: 'Cambios y excepciones de riesgos documentados',
    description: 'Los cambios en los riesgos de ciberseguridad y la gestión de excepciones a la política son documentados, aprobados por la autoridad competente y comunicados a las partes relevantes.',
    data_source: 'documentos',
    checklist: [
      'Proceso de gestión de excepciones a políticas definido',
      'Registro de excepciones y cambios de riesgo mantenido',
      'Excepciones aprobadas por autoridad competente',
      'Periodo de vigencia de excepciones controlado',
      'Revisión periódica de excepciones activas realizada',
    ],
  },
  {
    id: 'ID.RA-08', category_id: 'ID.RA', order_num: 8,
    name: 'Proceso para reportar problemas de ciberseguridad establecido',
    description: 'Los procesos para recibir, analizar y responder a vulnerabilidades divulgadas antes o después de su explotación son establecidos, incluyendo canales para divulgación responsable.',
    data_source: 'incidentes',
    checklist: [
      'Canal de reporte de vulnerabilidades establecido',
      'Proceso de divulgación responsable documentado',
      'Tiempo de respuesta a reportes de vulnerabilidades definido',
      'Coordinación con CERT/CSIRT nacional establecida',
    ],
  },
  {
    id: 'ID.RA-09', category_id: 'ID.RA', order_num: 9,
    name: 'Autenticidad e integridad de hardware y software verificados',
    description: 'La autenticidad e integridad del hardware y software adquirido son verificadas antes de su instalación y puesta en producción para prevenir la introducción de componentes comprometidos.',
    data_source: 'activos',
    checklist: [
      'Proceso de verificación de integridad de software implementado',
      'Proveedores de hardware y software veteados',
      'Firmas digitales y hashes verificados en descargas',
      'Inventario de software firmado y aprobado mantenido',
    ],
  },
  {
    id: 'ID.RA-10', category_id: 'ID.RA', order_num: 10,
    name: 'Proveedores críticos evaluados',
    description: 'Los proveedores críticos son evaluados regularmente para asegurar que sus prácticas de ciberseguridad son adecuadas y consistentes con los requisitos de la organización.',
    data_source: 'documentos',
    checklist: [
      'Lista de proveedores críticos definida y actualizada',
      'Criterios de evaluación de proveedores documentados',
      'Evaluaciones de seguridad de proveedores realizadas periódicamente',
      'Contratos con requisitos de ciberseguridad incluidos',
      'Plan de acción ante proveedor que no cumple requisitos',
    ],
  },

  // ════════════════════════════════════════════════════════
  // IDENTIFICAR — ID.IM  Mejora
  // ════════════════════════════════════════════════════════
  {
    id: 'ID.IM-01', category_id: 'ID.IM', order_num: 1,
    name: 'Mejoras identificadas de evaluaciones de ciberseguridad',
    description: 'Las mejoras a las capacidades de ciberseguridad son identificadas e implementadas basándose en los hallazgos de evaluaciones, auditorías y revisiones periódicas del programa de ciberseguridad.',
    data_source: 'documentos',
    checklist: [
      'Evaluaciones periódicas del programa de ciberseguridad realizadas',
      'Hallazgos documentados con planes de mejora',
      'Seguimiento de mejoras con fechas comprometidas',
      'Métricas de mejora continua definidas y monitoreadas',
    ],
  },
  {
    id: 'ID.IM-02', category_id: 'ID.IM', order_num: 2,
    name: 'Mejoras identificadas de ejercicios de ciberseguridad',
    description: 'Las mejoras a las capacidades de ciberseguridad son identificadas e implementadas basándose en ejercicios, simulacros y pruebas de los planes de respuesta y continuidad.',
    data_source: 'documentos',
    checklist: [
      'Ejercicios de ciberseguridad realizados al menos anualmente',
      'Resultados de ejercicios documentados con lecciones aprendidas',
      'Plan de mejora post-ejercicio elaborado y ejecutado',
      'Diferentes tipos de ejercicios realizados (tabletop, simulación, etc.)',
    ],
  },
  {
    id: 'ID.IM-03', category_id: 'ID.IM', order_num: 3,
    name: 'Mejoras identificadas de incidentes de ciberseguridad',
    description: 'Las mejoras a las capacidades de ciberseguridad son identificadas e implementadas basándose en las lecciones aprendidas de los incidentes de ciberseguridad ocurridos.',
    data_source: 'incidentes',
    checklist: [
      'Revisiones post-incidente (post-mortem) realizadas',
      'Lecciones aprendidas documentadas y compartidas',
      'Acciones correctivas identificadas y asignadas',
      'Efectividad de mejoras implementadas evaluada',
    ],
  },
  {
    id: 'ID.IM-04', category_id: 'ID.IM', order_num: 4,
    name: 'Plan de comunicación con proveedores establecido',
    description: 'Un plan de comunicación con proveedores y socios de la cadena de suministro para gestionar riesgos de ciberseguridad es establecido e implementado.',
    data_source: 'documentos',
    checklist: [
      'Canales de comunicación con proveedores clave definidos',
      'Procedimientos de notificación de incidentes a proveedores documentados',
      'Requisitos de ciberseguridad incluidos en acuerdos con socios',
      'Revisiones periódicas de seguridad con proveedores críticos realizadas',
    ],
  },

  // ════════════════════════════════════════════════════════
  // PROTEGER — PR.AA  Gestión de Identidades y Accesos
  // ════════════════════════════════════════════════════════
  {
    id: 'PR.AA-01', category_id: 'PR.AA', order_num: 1,
    name: 'Identidades y credenciales gestionadas',
    description: 'Las identidades y credenciales de usuarios autorizados, servicios y hardware son gestionadas a lo largo de su ciclo de vida, incluyendo provisión, revisión y revocación.',
    data_source: 'identidades,accesos',
    checklist: [
      'Gestión de identidades (IAM) implementada',
      'Política de contraseñas definida y aplicada',
      'MFA habilitado para cuentas privilegiadas y críticas',
      'Cuentas inactivas desactivadas en plazo definido',
      'Proceso de offboarding para revocar accesos implementado',
    ],
  },
  {
    id: 'PR.AA-02', category_id: 'PR.AA', order_num: 2,
    name: 'Identidades verificadas antes de acceso',
    description: 'Las identidades de usuarios, servicios y hardware son verificadas antes de otorgar acceso a los activos organizacionales, siguiendo procesos de autenticación robustos.',
    data_source: 'identidades,accesos',
    checklist: [
      'Proceso formal de verificación de identidad implementado',
      'Autenticación requerida para todos los accesos a sistemas',
      'Acceso basado en identidad verificada (no solo IP/red)',
      'Accesos de terceros con identidad verificada separada',
    ],
  },
  {
    id: 'PR.AA-03', category_id: 'PR.AA', order_num: 3,
    name: 'Usuarios y sistemas autenticados',
    description: 'Los usuarios, servicios y hardware son autenticados mediante mecanismos apropiados al nivel de riesgo, incluyendo MFA para accesos a sistemas y datos sensibles.',
    data_source: 'identidades,accesos',
    checklist: [
      'Autenticación multifactor (MFA) implementada',
      'MFA aplicado a accesos remotos y cuentas privilegiadas',
      'Mecanismos de autenticación apropiados por nivel de riesgo',
      'Autenticación de máquina a máquina con certificados/tokens',
      'Accesos VPN con MFA habilitado',
    ],
  },
  {
    id: 'PR.AA-04', category_id: 'PR.AA', order_num: 4,
    name: 'Declaraciones de identidad protegidas',
    description: 'Las declaraciones de identidad (tokens, certificados, aserciones) son generadas, protegidas, distribuidas y verificadas de forma segura para prevenir su falsificación o reutilización.',
    data_source: 'identidades,accesos',
    checklist: [
      'Tokens de sesión protegidos y con tiempo de expiración',
      'Certificados digitales gestionados con PKI apropiada',
      'Tokens y sesiones invalidados al cierre de sesión',
      'Protección contra ataques de reutilización de tokens',
    ],
  },
  {
    id: 'PR.AA-05', category_id: 'PR.AA', order_num: 5,
    name: 'Acceso gestionado por mínimo privilegio',
    description: 'El acceso a activos es gestionado incorporando los principios de mínimo privilegio y separación de deberes, asegurando que los usuarios solo tienen el acceso necesario para sus funciones.',
    data_source: 'identidades,accesos',
    checklist: [
      'Principio de mínimo privilegio aplicado formalmente',
      'Revisiones periódicas de accesos (access reviews) realizadas',
      'Separación de deberes implementada en funciones críticas',
      'Accesos privilegiados (admin) monitoreados y justificados',
      'Accesos temporales con fecha de expiración controlados',
    ],
  },
  {
    id: 'PR.AA-06', category_id: 'PR.AA', order_num: 6,
    name: 'Acceso físico a activos gestionado',
    description: 'El acceso físico a activos de la organización es gestionado y protegido mediante controles físicos como tarjetas de acceso, CCTV, registros de visitantes y control de perímetro.',
    data_source: 'activos',
    checklist: [
      'Control de acceso físico a centros de datos y áreas sensibles',
      'Registro de visitantes mantenido',
      'Acceso físico revisado periódicamente',
      'CCTV o vigilancia en áreas críticas implementada',
      'Proceso de gestión de llaves y tarjetas de acceso definido',
    ],
  },

  // ════════════════════════════════════════════════════════
  // PROTEGER — PR.AT  Concienciación y Formación
  // ════════════════════════════════════════════════════════
  {
    id: 'PR.AT-01', category_id: 'PR.AT', order_num: 1,
    name: 'Personal capacitado en ciberseguridad',
    description: 'El personal de la organización y los socios son informados y capacitados para realizar sus responsabilidades de ciberseguridad, incluyendo reconocimiento de phishing, manejo de datos y reporte de incidentes.',
    data_source: 'personal',
    checklist: [
      'Programa de concienciación en ciberseguridad implementado',
      'Capacitación anual en ciberseguridad completada por todo el personal',
      'Simulaciones de phishing realizadas periódicamente',
      'Material de capacitación actualizado con nuevas amenazas',
      'Registro de completitud de capacitaciones mantenido',
    ],
  },
  {
    id: 'PR.AT-02', category_id: 'PR.AT', order_num: 2,
    name: 'Personal privilegiado con capacitación especializada',
    description: 'El personal con funciones de ciberseguridad o con accesos privilegiados tiene el conocimiento y las habilidades para realizar sus responsabilidades a través de capacitación especializada y certificaciones.',
    data_source: 'personal',
    checklist: [
      'Capacitación especializada para administradores de sistemas',
      'Capacitación en respuesta a incidentes para equipo de seguridad',
      'Plan de desarrollo de competencias de ciberseguridad definido',
      'Certificaciones de seguridad para roles críticos fomentadas',
      'Capacitaciones técnicas avanzadas realizadas anualmente',
    ],
  },

  // ════════════════════════════════════════════════════════
  // PROTEGER — PR.DS  Seguridad de Datos
  // ════════════════════════════════════════════════════════
  {
    id: 'PR.DS-01', category_id: 'PR.DS', order_num: 1,
    name: 'Datos en reposo protegidos',
    description: 'El estado de integridad y confidencialidad de los datos en reposo es protegido mediante controles apropiados como cifrado, controles de acceso y medidas de integridad.',
    data_source: 'activos',
    checklist: [
      'Cifrado de datos sensibles en reposo implementado',
      'Cifrado de discos en laptops y endpoints habilitado',
      'Bases de datos con datos sensibles cifradas',
      'Control de acceso a datos sensibles restringido',
      'Proceso de eliminación segura de datos implementado',
    ],
  },
  {
    id: 'PR.DS-02', category_id: 'PR.DS', order_num: 2,
    name: 'Datos en tránsito protegidos',
    description: 'El estado de integridad y confidencialidad de los datos en tránsito es protegido mediante cifrado de comunicaciones, certificados TLS válidos y protocolos seguros.',
    data_source: 'activos',
    checklist: [
      'TLS/HTTPS habilitado en todas las comunicaciones web',
      'Certificados digitales válidos y actualizados',
      'VPN para accesos remotos implementada',
      'Protocolos inseguros (FTP, Telnet, HTTP) prohibidos',
      'Cifrado de emails con datos sensibles implementado',
    ],
  },
  {
    id: 'PR.DS-10', category_id: 'PR.DS', order_num: 3,
    name: 'Datos en uso protegidos',
    description: 'Los datos en uso son protegidos mediante controles que previenen el acceso no autorizado durante el procesamiento, incluyendo protección de memoria y controles de ejecución segura.',
    data_source: 'activos',
    checklist: [
      'Controles de acceso a datos en procesamiento implementados',
      'Protección contra exfiltración de datos en uso (DLP)',
      'Ambientes de procesamiento de datos sensibles aislados',
      'Logs de acceso y uso de datos sensibles habilitados',
    ],
  },
  {
    id: 'PR.DS-11', category_id: 'PR.DS', order_num: 4,
    name: 'Copias de seguridad mantenidas y probadas',
    description: 'Las copias de seguridad de datos críticos son creadas, protegidas, mantenidas y probadas periódicamente para asegurar la capacidad de recuperación ante pérdida o corrupción.',
    data_source: 'activos',
    checklist: [
      'Política de backup definida (qué, cuándo, retención)',
      'Backups automáticos implementados y monitoreados',
      'Copias offsite o en nube mantenidas',
      'Pruebas de restauración realizadas periódicamente',
      'Backups cifrados y protegidos contra acceso no autorizado',
    ],
  },

  // ════════════════════════════════════════════════════════
  // PROTEGER — PR.PS  Seguridad de Plataformas
  // ════════════════════════════════════════════════════════
  {
    id: 'PR.PS-01', category_id: 'PR.PS', order_num: 1,
    name: 'Configuraciones de TI/OT establecidas y mantenidas',
    description: 'Las configuraciones de seguridad para sistemas de TI y OT son establecidas, documentadas, implementadas y mantenidas, siguiendo estándares como CIS Benchmarks o DISA STIGs.',
    data_source: 'activos',
    checklist: [
      'Línea base de configuración segura definida y documentada',
      'Hardening aplicado a servidores y sistemas operativos',
      'Gestión de configuración implementada (CMDB o similar)',
      'Desviaciones de configuración base detectadas y remediadas',
      'Revisión periódica de configuraciones seguras realizada',
    ],
  },
  {
    id: 'PR.PS-02', category_id: 'PR.PS', order_num: 2,
    name: 'Software mantenido para reducir vulnerabilidades',
    description: 'El software en los activos es mantenido actualizado para reducir su superficie de explotación, incluyendo aplicación oportuna de parches de seguridad y actualizaciones del sistema operativo.',
    data_source: 'activos',
    checklist: [
      'Proceso de gestión de parches documentado e implementado',
      'Parches críticos aplicados en plazo definido',
      'Inventario de versiones de software actualizado',
      'Software sin soporte (EOL) identificado y planificada su sustitución',
      'Parches de seguridad priorizados sobre funcionalidad',
    ],
  },
  {
    id: 'PR.PS-03', category_id: 'PR.PS', order_num: 3,
    name: 'Hardware mantenido para reducir vulnerabilidades',
    description: 'El hardware en los activos es gestionado y mantenido para reducir su superficie de explotación, incluyendo firmware actualizado, configuración del BIOS/UEFI y controles de puertos físicos.',
    data_source: 'activos',
    checklist: [
      'Actualizaciones de firmware aplicadas periódicamente',
      'Puertos USB y externos deshabilitados donde no son necesarios',
      'BIOS/UEFI con contraseña protegido',
      'Hardware obsoleto identificado y planificada su sustitución',
      'Controles de acceso físico a hardware crítico implementados',
    ],
  },
  {
    id: 'PR.PS-04', category_id: 'PR.PS', order_num: 4,
    name: 'Registros de auditoría generados y disponibles',
    description: 'Los registros de auditoría y logs de seguridad adecuados son generados, protegidos y disponibles para su análisis durante investigaciones de incidentes y auditorías de cumplimiento.',
    data_source: 'activos',
    checklist: [
      'Logging habilitado en sistemas y aplicaciones críticas',
      'Logs centralizados en sistema SIEM o similar',
      'Retención de logs según requisitos legales y operacionales',
      'Logs protegidos contra modificación no autorizada',
      'Alertas configuradas para eventos de seguridad críticos',
    ],
  },
  {
    id: 'PR.PS-05', category_id: 'PR.PS', order_num: 5,
    name: 'Software no autorizado prevenido',
    description: 'La instalación y ejecución de software no autorizado es prevenida mediante listas blancas de aplicaciones, controles de integridad y políticas de uso aceptable.',
    data_source: 'activos',
    checklist: [
      'Política de software autorizado definida y comunicada',
      'Lista blanca de aplicaciones o control equivalente implementado',
      'Controles técnicos para prevenir instalación no autorizada',
      'Proceso de aprobación para nuevo software definido',
      'Software no autorizado detectado y removido periódicamente',
    ],
  },
  {
    id: 'PR.PS-06', category_id: 'PR.PS', order_num: 6,
    name: 'Prácticas de desarrollo seguro empleadas',
    description: 'Las prácticas de desarrollo de software seguras son empleadas en el ciclo de vida del desarrollo de software, incluyendo revisión de código, pruebas de seguridad y gestión de dependencias.',
    data_source: 'documentos',
    checklist: [
      'Política de desarrollo seguro (SDLC) definida',
      'Revisiones de seguridad en el código implementadas',
      'Análisis estático de código (SAST) utilizado',
      'Dependencias de software con vulnerabilidades conocidas controladas',
      'Pruebas de penetración de aplicaciones realizadas',
    ],
  },

  // ════════════════════════════════════════════════════════
  // PROTEGER — PR.IR  Resiliencia de Infraestructura
  // ════════════════════════════════════════════════════════
  {
    id: 'PR.IR-01', category_id: 'PR.IR', order_num: 1,
    name: 'Redes protegidas de acceso no autorizado',
    description: 'Las redes y entornos son protegidos de acceso no autorizado y otras actividades potencialmente dañinas mediante segmentación, firewalls, controles de acceso a red y monitoreo.',
    data_source: 'activos',
    checklist: [
      'Firewalls implementados y reglas revisadas periódicamente',
      'Segmentación de red entre sistemas críticos y usuarios',
      'Acceso remoto controlado y seguro (VPN con MFA)',
      'Red de invitados separada de red corporativa',
      'Detección de intrusiones (IDS/IPS) implementada',
    ],
  },
  {
    id: 'PR.IR-02', category_id: 'PR.IR', order_num: 2,
    name: 'Entornos informáticos protegidos',
    description: 'Los entornos informáticos de la organización son protegidos de actividades no autorizadas de ciberseguridad, incluyendo protección de endpoints, antimalware y controles de ejecución.',
    data_source: 'activos',
    checklist: [
      'Antivirus/EDR instalado y actualizado en todos los endpoints',
      'Protección de endpoints gestionada centralmente',
      'Análisis de malware en archivos y correos implementado',
      'Controles de ejecución (application whitelisting) implementados',
      'Acceso a internet filtrado y controlado',
    ],
  },
  {
    id: 'PR.IR-03', category_id: 'PR.IR', order_num: 3,
    name: 'Mecanismos de contención implementados',
    description: 'Los mecanismos para lograr los requisitos de resiliencia en situaciones normales y adversas son implementados, incluyendo capacidad de aislar sistemas comprometidos.',
    data_source: 'activos',
    checklist: [
      'Capacidad de aislar sistemas comprometidos documentada',
      'Procedimientos de contención de incidentes definidos',
      'Arquitectura de red que permite segmentación dinámica',
      'Pruebas de contención realizadas periódicamente',
    ],
  },
  {
    id: 'PR.IR-04', category_id: 'PR.IR', order_num: 4,
    name: 'Recursos adecuados para resiliencia disponibles',
    description: 'Los recursos adecuados (humanos, tecnológicos, financieros) están disponibles para asegurar la resiliencia de la ciberseguridad y la continuidad de los servicios críticos.',
    data_source: 'documentos',
    checklist: [
      'Presupuesto de ciberseguridad asignado y suficiente',
      'Personal capacitado para respuesta a incidentes disponible',
      'Recursos de TI redundantes para servicios críticos implementados',
      'Acuerdos de soporte con proveedores críticos vigentes',
    ],
  },

  // ════════════════════════════════════════════════════════
  // DETECTAR — DE.AE  Análisis de Eventos Adversos
  // ════════════════════════════════════════════════════════
  {
    id: 'DE.AE-02', category_id: 'DE.AE', order_num: 1,
    name: 'Eventos anómalos analizados para caracterizar amenazas',
    description: 'Las actividades potencialmente adversas son analizadas para caracterizar mejor las amenazas, identificar indicadores de compromiso (IoC) y determinar el alcance e impacto.',
    data_source: 'incidentes',
    checklist: [
      'Proceso de análisis de eventos anómalos definido',
      'Herramientas de análisis de eventos implementadas',
      'IoC (Indicadores de Compromiso) identificados y actualizados',
      'Correlación de eventos entre sistemas implementada',
      'Análisis de causa raíz realizado para eventos significativos',
    ],
  },
  {
    id: 'DE.AE-03', category_id: 'DE.AE', order_num: 2,
    name: 'Información de eventos correlacionada de múltiples fuentes',
    description: 'La información sobre eventos de ciberseguridad es correlacionada desde múltiples fuentes y sensores para obtener una visión integral del estado de seguridad y detectar amenazas complejas.',
    data_source: 'incidentes',
    checklist: [
      'Correlación de logs de múltiples fuentes implementada',
      'SIEM u herramienta de correlación configurada',
      'Reglas de correlación para ataques conocidos implementadas',
      'Alertas de correlación revisadas y ajustadas periódicamente',
    ],
  },
  {
    id: 'DE.AE-04', category_id: 'DE.AE', order_num: 3,
    name: 'Impacto de eventos adversos estimado',
    description: 'El impacto potencial de los eventos adversos es estimado para priorizar la respuesta, determinar el nivel de escalamiento y evaluar si se deben declarar como incidentes.',
    data_source: 'incidentes',
    checklist: [
      'Criterios para estimar impacto de eventos definidos',
      'Clasificación de severidad de eventos documentada',
      'Proceso de escalamiento basado en impacto estimado definido',
      'Evaluación de impacto al negocio incluida en análisis de eventos',
    ],
  },
  {
    id: 'DE.AE-06', category_id: 'DE.AE', order_num: 4,
    name: 'Información sobre eventos compartida con partes autorizadas',
    description: 'La información sobre eventos de ciberseguridad es proporcionada a las partes internas y externas autorizadas de manera oportuna y apropiada.',
    data_source: 'incidentes',
    checklist: [
      'Lista de partes autorizadas para recibir información de eventos definida',
      'Procedimientos de notificación de eventos documentados',
      'Canales de comunicación seguros para compartir información establecidos',
      'Confidencialidad de información de eventos protegida',
    ],
  },
  {
    id: 'DE.AE-07', category_id: 'DE.AE', order_num: 5,
    name: 'Inteligencia de amenazas recibida y utilizada',
    description: 'La inteligencia sobre amenazas cibernéticas y el conocimiento situacional contextual son recibidos de fuentes confiables y utilizados para mejorar la capacidad de detección.',
    data_source: 'incidentes',
    checklist: [
      'Fuentes de inteligencia de amenazas (threat feeds) configuradas',
      'IoC de threat intelligence integrados en herramientas de detección',
      'Proceso de procesamiento de inteligencia de amenazas definido',
      'Alertas basadas en amenazas actuales configuradas',
    ],
  },
  {
    id: 'DE.AE-08', category_id: 'DE.AE', order_num: 6,
    name: 'Incidentes declarados según criterios predefinidos',
    description: 'Los incidentes de ciberseguridad son declarados cuando se cumplen los criterios predefinidos, asegurando una respuesta oportuna y consistente.',
    data_source: 'incidentes',
    checklist: [
      'Criterios para declaración de incidentes documentados',
      'Umbrales de escalamiento a incidente definidos',
      'Proceso de triage de eventos a incidentes implementado',
      'Registro de incidentes declarados mantenido',
    ],
  },

  // ════════════════════════════════════════════════════════
  // DETECTAR — DE.CM  Monitoreo Continuo
  // ════════════════════════════════════════════════════════
  {
    id: 'DE.CM-01', category_id: 'DE.CM', order_num: 1,
    name: 'Redes y actividades de red monitoreadas',
    description: 'Las redes y las actividades de red son monitoreadas para detectar actividades adversas potenciales, incluyendo intrusiones, exfiltración de datos y comunicaciones maliciosas.',
    data_source: 'incidentes',
    checklist: [
      'Monitoreo de red (NDR/IDS) implementado',
      'Tráfico de red hacia internet monitoreado',
      'Anomalías de red alertadas y revisadas',
      'Monitoreo de DNS para detectar actividad maliciosa',
      'Alertas de red revisadas dentro de SLA definido',
    ],
  },
  {
    id: 'DE.CM-02', category_id: 'DE.CM', order_num: 2,
    name: 'Entorno físico monitoreado',
    description: 'El entorno físico de la organización es monitoreado para detectar eventos adversos potenciales, incluyendo accesos físicos no autorizados y condiciones ambientales.',
    data_source: 'activos',
    checklist: [
      'CCTV en áreas sensibles implementado y monitoreado',
      'Sensores de temperatura y humedad en centro de datos',
      'Alarmas de acceso físico no autorizado configuradas',
      'Registros de acceso físico revisados periódicamente',
    ],
  },
  {
    id: 'DE.CM-03', category_id: 'DE.CM', order_num: 3,
    name: 'Actividad del personal monitoreada',
    description: 'La actividad de los usuarios y del personal es monitoreada para detectar comportamientos anómalos o actividades adversas potenciales, respetando las políticas de privacidad aplicables.',
    data_source: 'incidentes',
    checklist: [
      'Monitoreo de actividad de usuarios privilegiados implementado',
      'Alertas por comportamiento anómalo de usuarios configuradas',
      'Política de monitoreo de usuarios comunicada al personal',
      'Logs de actividad de usuarios críticos mantenidos',
    ],
  },
  {
    id: 'DE.CM-06', category_id: 'DE.CM', order_num: 4,
    name: 'Actividad de proveedores externos monitoreada',
    description: 'La actividad de proveedores y socios externos con acceso a sistemas de la organización es monitoreada para detectar actividades adversas y violaciones a los acuerdos.',
    data_source: 'incidentes',
    checklist: [
      'Accesos de terceros monitoreados y registrados',
      'Sesiones de mantenimiento remoto de proveedores auditadas',
      'Alertas por acceso fuera de horario o patrón de proveedores',
      'Revisión periódica de actividad de proveedores externos',
    ],
  },
  {
    id: 'DE.CM-09', category_id: 'DE.CM', order_num: 5,
    name: 'Capacidades de computación monitoreadas',
    description: 'Las capacidades computacionales son monitoreadas para detectar actividades adversas potenciales, como uso anormal de CPU, memoria o almacenamiento que pueda indicar un compromiso.',
    data_source: 'activos',
    checklist: [
      'Monitoreo de rendimiento de sistemas implementado',
      'Alertas por uso anormal de recursos configuradas',
      'Dashboard de estado de sistemas críticos disponible',
      'Tendencias de uso analizadas para detectar anomalías',
    ],
  },

  // ════════════════════════════════════════════════════════
  // RESPONDER — RS.MA  Gestión de Incidentes
  // ════════════════════════════════════════════════════════
  {
    id: 'RS.MA-01', category_id: 'RS.MA', order_num: 1,
    name: 'Plan de respuesta a incidentes ejecutado',
    description: 'El plan de respuesta a incidentes es ejecutado en coordinación con las partes relevantes internas y externas cuando se detecta un incidente de ciberseguridad.',
    data_source: 'incidentes',
    checklist: [
      'Plan de respuesta a incidentes documentado y aprobado',
      'Equipo de respuesta a incidentes (CSIRT) definido',
      'Roles y responsabilidades en el plan documentados',
      'Plan probado mediante ejercicios de simulación',
      'Plan actualizado tras cada incidente o ejercicio',
    ],
  },
  {
    id: 'RS.MA-02', category_id: 'RS.MA', order_num: 2,
    name: 'Informes de incidentes analizados',
    description: 'Los informes de incidentes son analizados para determinar la idoneidad de la respuesta, incluyendo la adecuación de las acciones tomadas y la efectividad de los controles.',
    data_source: 'incidentes',
    checklist: [
      'Proceso de triage de incidentes definido',
      'Criterios de clasificación de incidentes documentados',
      'Análisis inicial de incidentes realizado en SLA definido',
      'Asignación de incidentes a responsable documentada',
    ],
  },
  {
    id: 'RS.MA-03', category_id: 'RS.MA', order_num: 3,
    name: 'Incidentes categorizados y priorizados',
    description: 'Los incidentes son categorizados según su tipo y priorizados según su severidad, impacto al negocio y urgencia para asegurar una respuesta apropiada.',
    data_source: 'incidentes',
    checklist: [
      'Taxonomía de tipos de incidentes definida',
      'Criterios de priorización (crítico/alto/medio/bajo) documentados',
      'Tiempos de respuesta por prioridad definidos y monitoreados',
      'Sistema de tickets de incidentes con categorías implementado',
    ],
  },
  {
    id: 'RS.MA-04', category_id: 'RS.MA', order_num: 4,
    name: 'Incidentes escalados cuando es necesario',
    description: 'Los incidentes son escalados o elevados a las personas, grupos o entidades apropiadas cuando la respuesta inicial es insuficiente o cuando el alcance requiere autoridad superior.',
    data_source: 'incidentes',
    checklist: [
      'Criterios de escalamiento documentados',
      'Cadena de escalamiento definida con contactos',
      'Escalamiento a dirección para incidentes críticos definido',
      'Proceso de notificación a reguladores/autoridades definido',
      'Escalamiento a proveedores/CERT externo definido',
    ],
  },
  {
    id: 'RS.MA-05', category_id: 'RS.MA', order_num: 5,
    name: 'Criterios para iniciar recuperación definidos',
    description: 'Los criterios para iniciar las actividades de recuperación de incidentes están definidos, asegurando que la transición de respuesta a recuperación se realice en el momento apropiado.',
    data_source: 'incidentes',
    checklist: [
      'Criterios de contención verificados antes de recuperación',
      'Criterios de inicio de recuperación documentados',
      'Autorización requerida para inicio de recuperación definida',
      'Proceso de comunicación al inicio de recuperación documentado',
    ],
  },

  // ════════════════════════════════════════════════════════
  // RESPONDER — RS.AN  Análisis de Incidentes
  // ════════════════════════════════════════════════════════
  {
    id: 'RS.AN-03', category_id: 'RS.AN', order_num: 1,
    name: 'Análisis para establecer qué ocurrió durante el incidente',
    description: 'Los análisis son realizados para establecer con precisión qué ha ocurrido durante un incidente, incluyendo el vector de ataque, el alcance del compromiso y los activos afectados.',
    data_source: 'incidentes',
    checklist: [
      'Metodología de análisis forense documentada',
      'Herramientas de análisis forense disponibles',
      'Evidencia digital recolectada y preservada correctamente',
      'Análisis de logs y artefactos realizado sistemáticamente',
      'Informe de análisis del incidente elaborado',
    ],
  },
  {
    id: 'RS.AN-06', category_id: 'RS.AN', order_num: 2,
    name: 'Acciones durante investigación documentadas',
    description: 'Las acciones realizadas durante una investigación de incidente son registradas y preservadas con integridad y procedencia para su uso en análisis posterior y posibles acciones legales.',
    data_source: 'incidentes',
    checklist: [
      'Registro detallado de acciones durante respuesta mantenido',
      'Timestamps y responsables de cada acción registrados',
      'Evidencia preservada con cadena de custodia',
      'Documentación de investigación almacenada de forma segura',
    ],
  },
  {
    id: 'RS.AN-07', category_id: 'RS.AN', order_num: 3,
    name: 'Causa raíz del incidente establecida',
    description: 'La causa raíz del incidente es establecida mediante análisis sistemático para identificar las vulnerabilidades explotadas, los fallos de control y las oportunidades de mejora.',
    data_source: 'incidentes',
    checklist: [
      'Análisis de causa raíz (RCA) realizado para incidentes significativos',
      'Metodología de RCA documentada (5 porqués, espina de pescado, etc.)',
      'Factores contribuyentes identificados',
      'Recomendaciones para evitar recurrencia documentadas',
    ],
  },
  {
    id: 'RS.AN-08', category_id: 'RS.AN', order_num: 4,
    name: 'Estimaciones del efecto del incidente establecidas',
    description: 'Las estimaciones del efecto del incidente son establecidas, incluyendo el impacto económico, reputacional, legal y operativo, para apoyar las decisiones de respuesta y recuperación.',
    data_source: 'incidentes',
    checklist: [
      'Impacto operacional del incidente cuantificado',
      'Impacto económico estimado y documentado',
      'Impacto reputacional evaluado',
      'Obligaciones legales de notificación evaluadas',
    ],
  },

  // ════════════════════════════════════════════════════════
  // RESPONDER — RS.CO  Comunicación de Incidentes
  // ════════════════════════════════════════════════════════
  {
    id: 'RS.CO-02', category_id: 'RS.CO', order_num: 1,
    name: 'Personal informado para reportar eventos observados',
    description: 'El personal de la organización es informado y tiene los mecanismos necesarios para reportar eventos de ciberseguridad observados de manera oportuna a los responsables apropiados.',
    data_source: 'personal',
    checklist: [
      'Canal de reporte de incidentes para empleados disponible',
      'Personal capacitado sobre qué y cómo reportar',
      'Proceso de reporte anónimo disponible si aplicable',
      'Tiempo de respuesta a reportes de empleados definido',
    ],
  },
  {
    id: 'RS.CO-03', category_id: 'RS.CO', order_num: 2,
    name: 'Información compartida con partes autorizadas',
    description: 'La información relevante sobre incidentes es compartida de manera oportuna con las partes internas y externas autorizadas, usando canales de comunicación seguros.',
    data_source: 'incidentes',
    checklist: [
      'Partes a notificar ante incidentes identificadas',
      'Plantillas de notificación de incidentes preparadas',
      'Proceso de notificación a autoridades regulatorias definido',
      'Coordinación con CERT nacional establecida',
    ],
  },
  {
    id: 'RS.CO-04', category_id: 'RS.CO', order_num: 3,
    name: 'Coordinación con partes interesadas realizada',
    description: 'La coordinación con las partes interesadas internas y externas es realizada de acuerdo con los planes de respuesta a incidentes, asegurando comunicación efectiva durante la crisis.',
    data_source: 'incidentes',
    checklist: [
      'Plan de comunicación de crisis documentado',
      'Vocero de ciberseguridad designado',
      'Comunicación con clientes afectados planificada',
      'Coordinación con medios de comunicación planificada si aplica',
    ],
  },
  {
    id: 'RS.CO-05', category_id: 'RS.CO', order_num: 4,
    name: 'Divulgación voluntaria de información considerada',
    description: 'La divulgación voluntaria de información de ciberseguridad a partes externas como CERT, autoridades, sector y pares es considerada como mecanismo de mejora del ecosistema de seguridad.',
    data_source: 'documentos',
    checklist: [
      'Política de divulgación de información de seguridad definida',
      'Participación en foros de intercambio de información evaluada',
      'Proceso de revisión legal antes de divulgación externa',
    ],
  },

  // ════════════════════════════════════════════════════════
  // RESPONDER — RS.MI  Mitigación de Incidentes
  // ════════════════════════════════════════════════════════
  {
    id: 'RS.MI-01', category_id: 'RS.MI', order_num: 1,
    name: 'Incidentes contenidos',
    description: 'Los incidentes de ciberseguridad son contenidos oportunamente para prevenir su expansión a otros sistemas, limitar el daño y preservar la evidencia para el análisis forense.',
    data_source: 'incidentes',
    checklist: [
      'Procedimientos de contención por tipo de incidente documentados',
      'Capacidad técnica de aislamiento de sistemas disponible',
      'Decisiones de contención documentadas con justificación',
      'Tiempo de contención monitoreado contra SLA',
    ],
  },
  {
    id: 'RS.MI-02', category_id: 'RS.MI', order_num: 2,
    name: 'Incidentes erradicados',
    description: 'Los incidentes de ciberseguridad son erradicados completamente mediante la eliminación del malware, cierre de vulnerabilidades explotadas y restauración de sistemas comprometidos.',
    data_source: 'incidentes',
    checklist: [
      'Procedimientos de erradicación documentados',
      'Verificación de erradicación completa antes de recuperación',
      'Sistemas comprometidos reimplementados limpiamente',
      'Vulnerabilidades explotadas remediadas',
      'Indicadores de compromiso eliminados y verificados',
    ],
  },

  // ════════════════════════════════════════════════════════
  // RECUPERAR — RC.RP  Ejecución del Plan de Recuperación
  // ════════════════════════════════════════════════════════
  {
    id: 'RC.RP-01', category_id: 'RC.RP', order_num: 1,
    name: 'Plan de recuperación ejecutado',
    description: 'El plan de recuperación de incidentes es ejecutado una vez iniciada la recuperación, restaurando los sistemas y datos afectados de manera sistemática y documentada.',
    data_source: 'documentos',
    checklist: [
      'Plan de recuperación de incidentes documentado y probado',
      'Procedimientos de recuperación por tipo de incidente definidos',
      'Secuencia de restauración de sistemas críticos definida',
      'Responsables de recuperación identificados',
      'RTO y RPO definidos y probados para sistemas críticos',
    ],
  },
  {
    id: 'RC.RP-02', category_id: 'RC.RP', order_num: 2,
    name: 'Plan de recuperación actualizado con lecciones aprendidas',
    description: 'Las actividades de recuperación son seleccionadas y el plan es actualizado para reflejar las lecciones aprendidas de incidentes anteriores y mejorar la eficacia de la recuperación futura.',
    data_source: 'documentos',
    checklist: [
      'Revisión post-incidente del plan de recuperación realizada',
      'Lecciones aprendidas incorporadas al plan',
      'Plan actualizado y redistribuido al equipo',
      'Mejoras probadas en siguiente ejercicio',
    ],
  },
  {
    id: 'RC.RP-03', category_id: 'RC.RP', order_num: 3,
    name: 'Integridad de backups y activos restaurados verificada',
    description: 'La integridad de las copias de seguridad y los activos restaurados es verificada antes de su uso en producción para asegurar que están limpios y funcionales.',
    data_source: 'activos',
    checklist: [
      'Proceso de verificación de integridad de backups definido',
      'Pruebas de restauración realizadas antes de producción',
      'Escaneo de malware en sistemas restaurados',
      'Verificación de configuración de seguridad post-restauración',
    ],
  },
  {
    id: 'RC.RP-04', category_id: 'RC.RP', order_num: 4,
    name: 'Capacidades y servicios críticos restablecidos',
    description: 'Las capacidades y los servicios críticos son restablecidos exitosamente dentro de los tiempos de recuperación objetivos (RTO) definidos para cada sistema.',
    data_source: 'activos',
    checklist: [
      'RTO definido para cada servicio crítico',
      'Procedimiento de failover documentado y probado',
      'Pruebas de recuperación realizadas anualmente',
      'Tiempo de recuperación real vs RTO monitoreado',
    ],
  },
  {
    id: 'RC.RP-05', category_id: 'RC.RP', order_num: 5,
    name: 'Fin de recuperación declarado',
    description: 'El fin de la recuperación del incidente es declarado en base a los criterios predefinidos, asegurando que todos los sistemas y servicios han vuelto a operación normal.',
    data_source: 'incidentes',
    checklist: [
      'Criterios de cierre de recuperación documentados',
      'Verificación de restauración completa antes de cierre',
      'Declaración formal de fin de incidente con aprobación',
      'Comunicación de restauración a partes afectadas',
    ],
  },
  {
    id: 'RC.RP-06', category_id: 'RC.RP', order_num: 6,
    name: 'Criterios para reanudar operaciones normales establecidos',
    description: 'Los criterios para reanudar las operaciones de nivel normal son establecidos y verificados, asegurando que las condiciones que llevaron al incidente han sido resueltas.',
    data_source: 'documentos',
    checklist: [
      'Criterios de reanudación de operaciones normales documentados',
      'Lista de verificación pre-reanudación definida',
      'Monitoreo reforzado durante período post-recuperación definido',
      'Revisión post-incidente programada tras reanudación',
    ],
  },

  // ════════════════════════════════════════════════════════
  // RECUPERAR — RC.CO  Comunicación de Recuperación
  // ════════════════════════════════════════════════════════
  {
    id: 'RC.CO-03', category_id: 'RC.CO', order_num: 1,
    name: 'Actividades de recuperación comunicadas internamente',
    description: 'Las actividades de recuperación y el progreso son comunicados a las partes interesadas internas de manera oportuna para mantener conciencia situacional y coordinar esfuerzos.',
    data_source: 'documentos',
    checklist: [
      'Proceso de comunicación interna durante recuperación definido',
      'Actualizaciones periódicas de estado a dirección durante recuperación',
      'Canal de comunicación interna durante crisis establecido',
      'Registro de comunicaciones durante recuperación mantenido',
    ],
  },
  {
    id: 'RC.CO-04', category_id: 'RC.CO', order_num: 2,
    name: 'Actualizaciones de recuperación comunicadas externamente',
    description: 'Las actualizaciones sobre el estado de la recuperación son comunicadas a las partes interesadas externas (clientes, reguladores, socios) de manera apropiada y oportuna.',
    data_source: 'documentos',
    checklist: [
      'Partes externas a notificar sobre recuperación identificadas',
      'Plantillas de comunicación externa de recuperación preparadas',
      'Proceso de aprobación de comunicaciones externas definido',
      'Seguimiento de obligaciones de notificación regulatoria',
    ],
  },
]

// ─── FUNCIÓN PRINCIPAL DE SEED ────────────────────────────────────────────────

async function seedNist() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_dstac_core',
  })

  console.log('Iniciando seed NIST CSF 2.0...\n')

  // ── Funciones ─────────────────────────────────────────────────────────────
  console.log('Cargando funciones NIST...')
  for (const fn of FUNCTIONS) {
    await conn.execute(
      'INSERT IGNORE INTO nist_functions (id, code, name, description, color, order_num) VALUES (?, ?, ?, ?, ?, ?)',
      [fn.id, fn.code, fn.name, fn.description, fn.color, fn.order_num]
    )
  }
  console.log(`  ✓ ${FUNCTIONS.length} funciones cargadas`)

  // ── Categorías ────────────────────────────────────────────────────────────
  console.log('Cargando categorías NIST...')
  for (const cat of CATEGORIES) {
    await conn.execute(
      'INSERT IGNORE INTO nist_categories (id, function_id, name, description) VALUES (?, ?, ?, ?)',
      [cat.id, cat.function_id, cat.name, cat.description]
    )
  }
  console.log(`  ✓ ${CATEGORIES.length} categorías cargadas`)

  // ── Controles ─────────────────────────────────────────────────────────────
  console.log('Cargando controles NIST CSF 2.0...')
  let count = 0
  for (const ctrl of CONTROLS) {
    await conn.execute(
      'INSERT IGNORE INTO nist_controls (id, category_id, name, description, data_source, checklist, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        ctrl.id,
        ctrl.category_id,
        ctrl.name,
        ctrl.description,
        ctrl.data_source ?? null,
        JSON.stringify(ctrl.checklist ?? []),
        ctrl.order_num,
      ]
    )
    count++
  }
  console.log(`  ✓ ${count} controles cargados`)

  // ── Verificación ──────────────────────────────────────────────────────────
  console.log('\nVerificando datos cargados:')
  const [[{ total_fn }]]  = await conn.execute('SELECT COUNT(*) AS total_fn FROM nist_functions')
  const [[{ total_cat }]] = await conn.execute('SELECT COUNT(*) AS total_cat FROM nist_categories')
  const [[{ total_ctrl }]]= await conn.execute('SELECT COUNT(*) AS total_ctrl FROM nist_controls')

  console.log(`  nist_functions:   ${total_fn}`)
  console.log(`  nist_categories:  ${total_cat}`)
  console.log(`  nist_controls:    ${total_ctrl}`)

  // Breakdown por función
  console.log('\nControles por función:')
  const [breakdown] = await conn.execute(`
    SELECT f.code, COUNT(ctrl.id) AS controles
    FROM nist_functions f
    JOIN nist_categories cat ON cat.function_id = f.id
    JOIN nist_controls ctrl ON ctrl.category_id = cat.id
    GROUP BY f.id, f.code
    ORDER BY f.order_num
  `)
  for (const row of breakdown) {
    console.log(`  ${row.code.padEnd(12)}: ${row.controles} controles`)
  }

  console.log('\nSeed NIST CSF 2.0 completado.')
  await conn.end()
}

seedNist().catch(err => {
  console.error('Error en seed NIST:', err.message)
  process.exit(1)
})
