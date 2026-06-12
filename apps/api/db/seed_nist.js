// Seed NIST CSF 2.0 — funciones, categorías y subcategorías/controles
// Seguro correr más de una vez (INSERT IGNORE)
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function seedNist() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: 'db_dstac_core'
  })

  console.log('Seeding NIST CSF 2.0...')

  // ── FUNCIONES ──────────────────────────────────────────────────────────────
  const functions = [
    ['GV', 'GOVERN',   'Gobernar',   '#6B46C1', 1, 'Establece y supervisa la estrategia, expectativas y política de ciberseguridad de la organización.'],
    ['ID', 'IDENTIFY', 'Identificar','#D97706', 2, 'Comprensión del contexto organizacional, activos y riesgos de ciberseguridad.'],
    ['PR', 'PROTECT',  'Proteger',   '#2563EB', 3, 'Salvaguardas para garantizar la entrega de servicios críticos.'],
    ['DE', 'DETECT',   'Detectar',   '#DC2626', 4, 'Identificación oportuna de eventos de ciberseguridad.'],
    ['RS', 'RESPOND',  'Responder',  '#059669', 5, 'Acciones respecto a incidentes de ciberseguridad detectados.'],
    ['RC', 'RECOVER',  'Recuperar',  '#7C3AED', 6, 'Restauración de capacidades y servicios afectados por un incidente.'],
  ]
  for (const [id, code, name, color, order_num, description] of functions) {
    await conn.execute(
      `INSERT IGNORE INTO nist_functions (id, code, name, description, color, order_num) VALUES (?,?,?,?,?,?)`,
      [id, code, name, description, color, order_num]
    )
  }
  console.log('  ✓ nist_functions (6)')

  // ── CATEGORÍAS ──────────────────────────────────────────────────────────────
  const categories = [
    // GV
    ['GV.OC', 'GV', 'Contexto Organizacional',                     'Circunstancias que influyen en ciberseguridad son comprendidas.'],
    ['GV.RM', 'GV', 'Estrategia de Gestión de Riesgos',            'Prioridades, restricciones, tolerancias y suposiciones de riesgo.'],
    ['GV.RR', 'GV', 'Roles, Responsabilidades y Autoridades',      'Roles y responsabilidades de ciberseguridad están establecidos.'],
    ['GV.PO', 'GV', 'Políticas',                                    'Políticas organizacionales de ciberseguridad establecidas.'],
    ['GV.OV', 'GV', 'Supervisión',                                  'Resultados de la gestión del riesgo son supervisados.'],
    ['GV.SC', 'GV', 'Gestión de Riesgo en Cadena de Suministro',   'Riesgos de la cadena de suministro son identificados y gestionados.'],
    // ID
    ['ID.AM', 'ID', 'Gestión de Activos',                          'Activos de datos, hardware, software y servicios inventariados.'],
    ['ID.RA', 'ID', 'Evaluación de Riesgos',                       'Amenazas, vulnerabilidades y riesgos identificados y documentados.'],
    ['ID.IM', 'ID', 'Mejora Continua',                             'Mejoras en ciberseguridad identificadas a través de evaluaciones.'],
    // PR
    ['PR.AA', 'PR', 'Identidades y Control de Acceso',             'Acceso a activos gestionado coherente con riesgo aceptado.'],
    ['PR.AT', 'PR', 'Concientización y Entrenamiento',             'Personal con conciencia y capacidades de ciberseguridad.'],
    ['PR.DS', 'PR', 'Seguridad de Datos',                          'Datos gestionados conforme a la estrategia de riesgos.'],
    ['PR.PS', 'PR', 'Seguridad de Plataformas',                    'Hardware y software gestionados conforme a la estrategia de riesgos.'],
    ['PR.IR', 'PR', 'Resiliencia de Infraestructura',              'Arquitecturas de seguridad gestionadas con la estrategia de riesgos.'],
    // DE
    ['DE.CM', 'DE', 'Monitoreo Continuo',                          'Activos e infraestructura monitoreados para detectar anomalías.'],
    ['DE.AE', 'DE', 'Análisis de Eventos Adversos',                'Anomalías analizadas para caracterizar eventos de ciberseguridad.'],
    // RS
    ['RS.MA', 'RS', 'Gestión de Incidentes',                       'Respuestas a incidentes contenidas y mitigadas.'],
    ['RS.AN', 'RS', 'Análisis de Incidentes',                      'Investigaciones para entender el impacto y origen del incidente.'],
    ['RS.CO', 'RS', 'Comunicación de Incidentes',                  'Actividades de respuesta coordinadas con partes internas y externas.'],
    ['RS.MI', 'RS', 'Mitigación de Incidentes',                    'Actividades para prevenir expansión del incidente.'],
    ['RS.IM', 'RS', 'Mejoras en Respuesta',                        'Mejoras en respuesta identificadas a partir de lecciones aprendidas.'],
    // RC
    ['RC.RP', 'RC', 'Ejecución del Plan de Recuperación',          'Planes de recuperación ejecutados y mantenidos.'],
    ['RC.CO', 'RC', 'Comunicación de Recuperación',                'Actividades de recuperación coordinadas con partes internas y externas.'],
  ]
  for (const [id, fid, name, description] of categories) {
    await conn.execute(
      `INSERT IGNORE INTO nist_categories (id, function_id, name, description) VALUES (?,?,?,?)`,
      [id, fid, name, description]
    )
  }
  console.log(`  ✓ nist_categories (${categories.length})`)

  // ── CONTROLES / SUBCATEGORÍAS ───────────────────────────────────────────────
  const controls = [
    // GV.OC
    ['GV.OC-01','GV.OC',1,'Misión organizacional','La misión de la organización es comprendida e informa la priorización de riesgos de ciberseguridad.'],
    ['GV.OC-02','GV.OC',2,'Partes interesadas internas y externas','Las partes interesadas internas y externas son comprendidas y su necesidades informan la estrategia de ciberseguridad.'],
    ['GV.OC-03','GV.OC',3,'Requisitos legales y regulatorios','Los requisitos legales, regulatorios y contractuales de ciberseguridad son comprendidos e informan la gestión de riesgos.'],
    ['GV.OC-04','GV.OC',4,'Dependencias críticas','Las dependencias críticas y los resultados requeridos son comprendidos e informan los controles de ciberseguridad.'],
    ['GV.OC-05','GV.OC',5,'Resultado de la cadena de valor','Los resultados de la organización son comprendidos e informan la definición del alcance de la ciberseguridad.'],
    // GV.RM
    ['GV.RM-01','GV.RM',1,'Estrategia de riesgos documentada','La estrategia de gestión de riesgos de ciberseguridad es establecida, comunicada y monitoreada.'],
    ['GV.RM-02','GV.RM',2,'Tolerancia al riesgo','El apetito y la tolerancia al riesgo de ciberseguridad son establecidos, comunicados y mantenidos.'],
    ['GV.RM-03','GV.RM',3,'Gestión de riesgos integrada','Los procesos de gestión de riesgos organizacionales incluyen riesgos de ciberseguridad.'],
    ['GV.RM-04','GV.RM',4,'Criterios de riesgo','Los criterios estratégicos de riesgo de ciberseguridad son establecidos y revisados.'],
    ['GV.RM-05','GV.RM',5,'Recursos de gestión de riesgos','Se establece y asigna un recurso independiente para la gestión de riesgos de ciberseguridad.'],
    ['GV.RM-06','GV.RM',6,'Impacto de riesgos externos','El impacto de los riesgos de ciberseguridad sobre la misión es entendido por el liderazgo.'],
    ['GV.RM-07','GV.RM',7,'Comunicación de riesgos','Los riesgos de ciberseguridad son comunicados de forma eficaz a la alta dirección.'],
    // GV.RR
    ['GV.RR-01','GV.RR',1,'Responsabilidades definidas','Las responsabilidades de ciberseguridad están asignadas y las autoridades son delegadas.'],
    ['GV.RR-02','GV.RR',2,'Personas adecuadas en roles clave','Las personas con roles de ciberseguridad tienen la experiencia y habilidades necesarias.'],
    ['GV.RR-03','GV.RR',3,'Revisión de responsabilidades','Las responsabilidades de ciberseguridad son revisadas periódicamente y actualizadas.'],
    ['GV.RR-04','GV.RR',4,'Recursos asignados','Los recursos adecuados (personas, presupuesto, tecnología) son asignados a ciberseguridad.'],
    // GV.PO
    ['GV.PO-01','GV.PO',1,'Política de ciberseguridad','Existe una política de ciberseguridad que establece los requisitos del programa.'],
    ['GV.PO-02','GV.PO',2,'Revisión de políticas','La política de ciberseguridad es revisada y actualizada periódicamente.'],
    // GV.OV
    ['GV.OV-01','GV.OV',1,'Revisión de gestión de riesgos','Los resultados de la gestión del riesgo de ciberseguridad son revisados por la alta dirección.'],
    ['GV.OV-02','GV.OV',2,'Revisión del desempeño','El desempeño del programa de ciberseguridad es revisado periódicamente.'],
    ['GV.OV-03','GV.OV',3,'Ajustes organizacionales','Los ajustes a la estrategia de ciberseguridad son realizados basándose en revisiones.'],
    // GV.SC
    ['GV.SC-01','GV.SC',1,'Programa de cadena de suministro','Se establecen y mantienen prácticas de gestión del riesgo de la cadena de suministro.'],
    ['GV.SC-02','GV.SC',2,'Identificación de proveedores','Los proveedores de ciberseguridad son identificados, priorizados y evaluados.'],
    ['GV.SC-03','GV.SC',3,'Contratos con proveedores','Los contratos con proveedores incluyen requisitos de ciberseguridad.'],
    ['GV.SC-04','GV.SC',4,'Propiedad de la cadena de suministro','Los intereses de ciberseguridad de la cadena de suministro son gestionados de forma independiente.'],
    ['GV.SC-05','GV.SC',5,'Evaluación de proveedores','Los proveedores son evaluados periódicamente mediante auditorías, resultados de pruebas u otros medios.'],
    ['GV.SC-06','GV.SC',6,'Planificación de cadena de suministro','Los planes de respuesta y recuperación incluyen a los proveedores.'],
    ['GV.SC-07','GV.SC',7,'Impacto de riesgos de proveedores','Los riesgos derivados de proveedores son incluidos en la gestión de riesgos organizacional.'],
    ['GV.SC-08','GV.SC',8,'Selección de proveedores','La selección de proveedores considera los riesgos de ciberseguridad.'],
    ['GV.SC-09','GV.SC',9,'Integridad de componentes','Los mecanismos para verificar la integridad de los componentes son implementados.'],
    ['GV.SC-10','GV.SC',10,'Protección de datos en cadena','Los datos compartidos con proveedores son protegidos con controles apropiados.'],
    // ID.AM
    ['ID.AM-01','ID.AM',1,'Inventario de hardware','Los dispositivos de hardware de la organización son inventariados.'],
    ['ID.AM-02','ID.AM',2,'Inventario de software','El software de la organización es inventariado.'],
    ['ID.AM-03','ID.AM',3,'Flujos de datos','Los flujos de datos de la organización son documentados.'],
    ['ID.AM-04','ID.AM',4,'Inventario de servicios','Los servicios externos de la organización son inventariados.'],
    ['ID.AM-05','ID.AM',5,'Inventario de datos','Los activos de datos de la organización son inventariados.'],
    ['ID.AM-06','ID.AM',6,'Inventario de sistemas','Los sistemas de la organización son inventariados con sus propietarios.'],
    ['ID.AM-07','ID.AM',7,'Inventario de redes','Las redes e instalaciones de comunicación son inventariadas.'],
    ['ID.AM-08','ID.AM',8,'Ciclo de vida de activos','El ciclo de vida de activos es gestionado desde adquisición hasta disposición.'],
    // ID.RA
    ['ID.RA-01','ID.RA',1,'Identificación de vulnerabilidades','Las vulnerabilidades en activos son identificadas, validadas y registradas.'],
    ['ID.RA-02','ID.RA',2,'Inteligencia de amenazas','La inteligencia de amenazas es recibida de foros y fuentes externas.'],
    ['ID.RA-03','ID.RA',3,'Identificación de amenazas','Las amenazas internas y externas son identificadas y documentadas.'],
    ['ID.RA-04','ID.RA',4,'Impacto potencial','Los impactos potenciales de negocio son identificados y documentados.'],
    ['ID.RA-05','ID.RA',5,'Análisis de amenazas y vulnerabilidades','Las amenazas, vulnerabilidades, probabilidades e impactos son evaluados.'],
    ['ID.RA-06','ID.RA',6,'Respuesta a riesgos','Las respuestas a riesgos son identificadas y priorizadas.'],
    ['ID.RA-07','ID.RA',7,'Evaluación periódica de riesgos','Los riesgos de ciberseguridad son evaluados periódicamente.'],
    ['ID.RA-08','ID.RA',8,'Divulgación de vulnerabilidades','Los procesos para recibir y actuar sobre divulgaciones de vulnerabilidades existen.'],
    ['ID.RA-09','ID.RA',9,'Autenticidad de componentes','La autenticidad e integridad de los componentes de hardware y software es evaluada.'],
    ['ID.RA-10','ID.RA',10,'Evaluaciones con proveedores','Las evaluaciones de riesgo de proveedores son realizadas antes del inicio de la relación.'],
    // ID.IM
    ['ID.IM-01','ID.IM',1,'Mejoras del plan de ciberseguridad','Las mejoras identificadas se incorporan al plan de ciberseguridad.'],
    ['ID.IM-02','ID.IM',2,'Revisión de planes','Los planes de ciberseguridad son revisados y actualizados periódicamente.'],
    ['ID.IM-03','ID.IM',3,'Mejoras de procesos de respuesta','Las mejoras identificadas en simulacros y ejercicios son incorporadas.'],
    ['ID.IM-04','ID.IM',4,'Evaluaciones de ciberseguridad','Las evaluaciones de ciberseguridad son realizadas de forma periódica.'],
    // PR.AA
    ['PR.AA-01','PR.AA',1,'Gestión de identidades','Las identidades y credenciales de usuarios y dispositivos son gestionadas.'],
    ['PR.AA-02','PR.AA',2,'Control de acceso','Los accesos de usuarios remotos son gestionados.'],
    ['PR.AA-03','PR.AA',3,'Autenticación de usuarios','Los usuarios son autenticados de manera proporcional al riesgo de la transacción.'],
    ['PR.AA-04','PR.AA',4,'Autenticación de servicios','Las identidades de hardware y software son autenticadas.'],
    ['PR.AA-05','PR.AA',5,'Control de acceso a activos','El acceso a activos físicos y lógicos es gestionado y restringido.'],
    ['PR.AA-06','PR.AA',6,'Autenticación fuerte','Las cuentas privilegiadas usan autenticación resistente al phishing.'],
    // PR.AT
    ['PR.AT-01','PR.AT',1,'Concientización del personal','El personal está informado y tiene formación para reducir el riesgo de ciberseguridad.'],
    ['PR.AT-02','PR.AT',2,'Formación especializada','Los individuos con roles de ciberseguridad tienen formación específica.'],
    // PR.DS
    ['PR.DS-01','PR.DS',1,'Protección de datos en reposo','Los datos en reposo están protegidos.'],
    ['PR.DS-02','PR.DS',2,'Protección de datos en tránsito','Los datos en tránsito están protegidos.'],
    ['PR.DS-03','PR.DS',3,'Gestión del ciclo de vida de datos','Los activos son gestionados formalmente durante su ciclo de vida.'],
    ['PR.DS-04','PR.DS',4,'Capacidad adecuada','Los recursos son disponibles para dar soporte a los objetivos de disponibilidad.'],
    ['PR.DS-05','PR.DS',5,'Protección frente a fuga de datos','Las protecciones contra fuga de datos son implementadas.'],
    ['PR.DS-06','PR.DS',6,'Verificación de integridad','Los mecanismos de comprobación de integridad son usados para verificar software.'],
    ['PR.DS-07','PR.DS',7,'Protección de entornos de desarrollo','Los entornos de desarrollo y prueba están separados del entorno productivo.'],
    ['PR.DS-08','PR.DS',8,'Integridad del hardware','Los mecanismos de comprobación de integridad son usados para verificar hardware.'],
    ['PR.DS-09','PR.DS',9,'Inventario de datos sensibles','Los datos sensibles son identificados y etiquetados de acuerdo a su clasificación.'],
    ['PR.DS-10','PR.DS',10,'Datos de producción en entornos no-prod','Los datos de producción no son replicados en entornos de desarrollo sin controles.'],
    // PR.PS
    ['PR.PS-01','PR.PS',1,'Configuración segura','Las configuraciones de TI/OT son establecidas, documentadas y aplicadas.'],
    ['PR.PS-02','PR.PS',2,'Gestión de software no autorizado','El software no autorizado es identificado y eliminado o aislado.'],
    ['PR.PS-03','PR.PS',3,'Gestión del ciclo de vida de hardware','El hardware es mantenido para reducir el riesgo de fallas y vulnerabilidades.'],
    ['PR.PS-04','PR.PS',4,'Generación de logs','Los sistemas de información generan logs de auditoría.'],
    ['PR.PS-05','PR.PS',5,'Gestión de vulnerabilidades técnicas','Las vulnerabilidades en sistemas son identificadas, evaluadas y remediadas.'],
    ['PR.PS-06','PR.PS',6,'Prácticas de código seguro','Se adoptan prácticas de codificación segura en el ciclo de desarrollo de software.'],
    // PR.IR
    ['PR.IR-01','PR.IR',1,'Redundancia de red y entornos','Las redes y entornos son protegidos mediante redundancia.'],
    ['PR.IR-02','PR.IR',2,'Capacidad de recuperación de sistemas','Los sistemas son diseñados con capacidad de recuperación.'],
    ['PR.IR-03','PR.IR',3,'Copias de seguridad','Las copias de seguridad son creadas, protegidas, mantenidas y probadas.'],
    ['PR.IR-04','PR.IR',4,'Capacidad de recuperación adecuada','La capacidad de los sistemas es gestionada para soportar la continuidad operacional.'],
    // DE.CM
    ['DE.CM-01','DE.CM',1,'Monitoreo de redes','Las redes son monitoreadas para detectar eventos potenciales de ciberseguridad.'],
    ['DE.CM-02','DE.CM',2,'Monitoreo del entorno físico','El entorno físico es monitoreado para detectar eventos potenciales.'],
    ['DE.CM-03','DE.CM',3,'Monitoreo de la actividad de usuarios','La actividad del personal es monitoreada para detectar eventos potenciales.'],
    ['DE.CM-04','DE.CM',4,'Detección de código malicioso','El código malicioso es detectado.'],
    ['DE.CM-05','DE.CM',5,'Código móvil no autorizado','El código móvil no autorizado es detectado.'],
    ['DE.CM-06','DE.CM',6,'Actividad de proveedores externos','La actividad del personal de proveedores externos es monitoreada.'],
    ['DE.CM-07','DE.CM',7,'Monitoreo de aplicaciones y herramientas','Las aplicaciones, dispositivos y herramientas son monitoreados.'],
    ['DE.CM-08','DE.CM',8,'Análisis de vulnerabilidades','Se realizan escaneos de vulnerabilidades de forma periódica.'],
    ['DE.CM-09','DE.CM',9,'Monitoreo de la cadena de suministro','El hardware y software de la cadena de suministro son monitoreados.'],
    // DE.AE
    ['DE.AE-01','DE.AE',1,'Definición de actividad esperada','Se define la actividad de red y de gestión de datos esperada.'],
    ['DE.AE-02','DE.AE',2,'Análisis de eventos detectados','Los eventos detectados son analizados para comprender los objetivos del ataque.'],
    ['DE.AE-03','DE.AE',3,'Correlación de eventos','Los datos de eventos son correlacionados desde múltiples fuentes.'],
    ['DE.AE-04','DE.AE',4,'Estimación del impacto','El impacto de eventos es determinado.'],
    ['DE.AE-05','DE.AE',5,'Criterios de alerta','Se establecen criterios de alerta de incidentes.'],
    ['DE.AE-06','DE.AE',6,'Notificación de eventos adversos','Los eventos adversos son notificados al personal y herramientas apropiadas.'],
    ['DE.AE-07','DE.AE',7,'Inteligencia de amenazas activa','La inteligencia de amenazas es utilizada para mejorar la detección.'],
    ['DE.AE-08','DE.AE',8,'Declaración de incidentes','Los incidentes son declarados al cumplirse los criterios de alerta.'],
    // RS.MA
    ['RS.MA-01','RS.MA',1,'Plan de respuesta a incidentes','El plan de respuesta a incidentes está en vigor y es comunicado.'],
    ['RS.MA-02','RS.MA',2,'Categorización de incidentes','Los incidentes son clasificados y priorizados.'],
    ['RS.MA-03','RS.MA',3,'Escalamiento de incidentes','Los incidentes son escalados de acuerdo con el plan de respuesta.'],
    ['RS.MA-04','RS.MA',4,'Gestión de respuesta','Las actividades de respuesta a incidentes son coordinadas entre grupos.'],
    // RS.AN
    ['RS.AN-01','RS.AN',1,'Investigación de notificaciones','Las notificaciones de sistemas de detección son investigadas.'],
    ['RS.AN-02','RS.AN',2,'Comprensión del impacto','El impacto del incidente es comprendido.'],
    ['RS.AN-03','RS.AN',3,'Realización de análisis forense','El análisis forense es realizado.'],
    ['RS.AN-04','RS.AN',4,'Categorización del incidente','Los incidentes son categorizados de acuerdo con los planes de respuesta.'],
    ['RS.AN-05','RS.AN',5,'Procesos de escalamiento','Los procesos de escalamiento son establecidos.'],
    // RS.CO
    ['RS.CO-01','RS.CO',1,'Comunicación interna','El personal conoce sus roles y funciones de respuesta.'],
    ['RS.CO-02','RS.CO',2,'Coordinación interna','Los incidentes son reportados de acuerdo a criterios establecidos.'],
    ['RS.CO-03','RS.CO',3,'Comunicación con partes externas','La información compartida de forma externa es realizada de acuerdo a políticas.'],
    // RS.MI
    ['RS.MI-01','RS.MI',1,'Contención del incidente','Los incidentes son contenidos.'],
    ['RS.MI-02','RS.MI',2,'Erradicación','Los incidentes son erradicados.'],
    // RS.IM
    ['RS.IM-01','RS.IM',1,'Planes de respuesta actualizados','Los planes de respuesta incorporan lecciones aprendidas.'],
    ['RS.IM-02','RS.IM',2,'Estrategias de respuesta actualizadas','Las estrategias de respuesta son actualizadas.'],
    // RC.RP
    ['RC.RP-01','RC.RP',1,'Plan de recuperación ejecutado','El plan de recuperación es ejecutado durante o después de un incidente.'],
    ['RC.RP-02','RC.RP',2,'Selección de estrategia de recuperación','Las estrategias de recuperación son seleccionadas en función del análisis de riesgo.'],
    ['RC.RP-03','RC.RP',3,'Restauración de servicios','Los sistemas y activos son restaurados de acuerdo al plan de recuperación.'],
    ['RC.RP-04','RC.RP',4,'Restauración de integridad','Los sistemas restaurados son verificados de acuerdo a la política de seguridad.'],
    // RC.CO
    ['RC.CO-01','RC.CO',1,'Gestión de relaciones públicas','Las relaciones públicas son gestionadas tras el incidente.'],
    ['RC.CO-02','RC.CO',2,'Reputación restaurada','La reputación es restaurada tras el incidente.'],
    ['RC.CO-03','RC.CO',3,'Comunicación de recuperación','Las actividades de recuperación son comunicadas a partes interesadas.'],
  ]
  for (const [id, cat, order_num, name, description] of controls) {
    await conn.execute(
      `INSERT IGNORE INTO nist_controls (id, category_id, name, description, order_num) VALUES (?,?,?,?,?)`,
      [id, cat, name, description, order_num]
    )
  }
  console.log(`  ✓ nist_controls (${controls.length})`)

  await conn.end()
  console.log('\nSeed NIST CSF 2.0 completado.')
}

seedNist().catch(err => { console.error('Error:', err.message); process.exit(1) })
