/**
 * ISO 27001:2022 Seed — carga los 4 dominios y 93 controles reales del Anexo A
 * en db_dstac_core. Idempotente: usa INSERT IGNORE, puede re-ejecutarse.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

// ─── DOMINIOS (4 dominios del Anexo A ISO 27001:2022) ─────────────────────────

const DOMAINS = [
  {
    id: 'A5', name: 'Controles Organizacionales', color: '#534AB7',
    description: 'Controles relacionados con políticas, roles, responsabilidades, gestión organizacional, proveedores, incidentes y cumplimiento.',
    order_num: 1, total_controls: 37
  },
  {
    id: 'A6', name: 'Controles de Personas', color: '#1D9E75',
    description: 'Controles relacionados con el personal durante la contratación, empleo y desvinculación.',
    order_num: 2, total_controls: 8
  },
  {
    id: 'A7', name: 'Controles Físicos', color: '#EF9F27',
    description: 'Controles relacionados con seguridad física, entorno y equipamiento.',
    order_num: 3, total_controls: 14
  },
  {
    id: 'A8', name: 'Controles Tecnológicos', color: '#E24B4A',
    description: 'Controles relacionados con tecnología de la información, sistemas, redes, desarrollo y operaciones.',
    order_num: 4, total_controls: 34
  },
]

// ─── A.5 — CONTROLES ORGANIZACIONALES (37 controles) ─────────────────────────

const A5_CONTROLS = [
  {
    id: 'A.5.1', domain_id: 'A5', order_num: 1,
    name: 'Políticas de seguridad de la información',
    description: 'La política de seguridad de la información y las políticas específicas de tema deben ser definidas, aprobadas por la dirección, publicadas, comunicadas y reconocidas por el personal relevante y las partes interesadas, y revisadas a intervalos planificados o cuando ocurran cambios significativos.',
    purpose: 'Garantizar la dirección y el apoyo de la gestión para la seguridad de la información de acuerdo con los requisitos del negocio y las leyes y regulaciones relevantes.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Política de seguridad de la información documentada y aprobada por la dirección',
      'Política comunicada formalmente a todo el personal y partes relevantes',
      'Política revisada al menos una vez al año o tras cambios significativos',
      'Políticas específicas por tema (acceso, criptografía, BYOD, etc.) definidas',
      'Versión vigente accesible para todos los empleados',
      'Registro de acuse de recibo del personal'
    ]),
    policy_template: `POLÍTICA DE SEGURIDAD DE LA INFORMACIÓN

Versión: 1.0 | Fecha: [FECHA] | Aprobado por: [CARGO DIRECCIÓN]

1. PROPÓSITO
[EMPRESA] se compromete a proteger la confidencialidad, integridad y disponibilidad de su información y la de sus clientes, en cumplimiento con ISO 27001:2022 y la legislación chilena aplicable.

2. ALCANCE
Esta política aplica a todos los empleados, contratistas y terceros que acceden a los sistemas e información de [EMPRESA].

3. PRINCIPIOS
- La información es un activo crítico que debe protegerse.
- El acceso se otorga según el principio de mínimo privilegio.
- Todo incidente debe ser reportado de inmediato.
- El cumplimiento de esta política es obligatorio.

4. RESPONSABILIDADES
La Gerencia General es responsable de aprobar y respaldar esta política.
El área de TI/Seguridad es responsable de implementarla y mantenerla.
Todo el personal es responsable de cumplirla.

5. REVISIÓN
Esta política se revisará anualmente o cuando ocurran cambios organizacionales o tecnológicos significativos.`
  },
  {
    id: 'A.5.2', domain_id: 'A5', order_num: 2,
    name: 'Roles y responsabilidades de seguridad de la información',
    description: 'Los roles y responsabilidades de seguridad de la información deben ser definidos y asignados de acuerdo con las necesidades de la organización.',
    purpose: 'Establecer responsabilidades claras para la protección de la información y asegurar que las tareas de seguridad sean ejecutadas por personas con las competencias adecuadas.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Roles de seguridad definidos y documentados en organigrama o política',
      'Responsable de seguridad de la información (CISO o equivalente) designado formalmente',
      'Responsabilidades de seguridad incluidas en descripciones de cargo',
      'Segregación de funciones implementada en procesos críticos',
      'Contacto de seguridad conocido por todo el personal'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.3', domain_id: 'A5', order_num: 3,
    name: 'Segregación de funciones',
    description: 'Las funciones en conflicto y las áreas de responsabilidad conflictivas deben ser segregadas para reducir las oportunidades de modificación no autorizada o no intencional o mal uso de los activos de la organización.',
    purpose: 'Reducir el riesgo de fraude, errores y elusión de controles de seguridad mediante la separación de responsabilidades incompatibles.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Identificadas las funciones que presentan conflicto de interés',
      'Separación de roles en procesos financieros críticos',
      'Separación entre quien solicita acceso y quien lo aprueba',
      'Separación entre quien desarrolla y quien despliega a producción',
      'Controles compensatorios documentados donde la segregación no es posible'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.4', domain_id: 'A5', order_num: 4,
    name: 'Responsabilidades de la dirección',
    description: 'La dirección debe exigir a todo el personal que aplique la seguridad de la información de acuerdo con la política de seguridad de la información establecida, las políticas y procedimientos de la organización.',
    purpose: 'Garantizar que la dirección apoye activamente la seguridad de la información y que el personal conozca y cumpla sus obligaciones.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'La dirección aprueba y comunica activamente las políticas de seguridad',
      'Compromisos de seguridad incluidos en contratos de trabajo',
      'Programa de concienciación en seguridad respaldado por la dirección',
      'Consecuencias del incumplimiento definidas y comunicadas',
      'La dirección participa en revisiones de seguridad'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.5', domain_id: 'A5', order_num: 5,
    name: 'Contacto con autoridades',
    description: 'La organización debe establecer y mantener contacto con las autoridades relevantes, incluyendo reguladores, organismos encargados de hacer cumplir la ley y equipos de respuesta a incidentes.',
    purpose: 'Asegurar el flujo adecuado de información sobre seguridad entre la organización y las autoridades competentes cuando sea necesario.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Listado de autoridades relevantes identificado (CSIRT, PDI, reguladores sectoriales)',
      'Procedimiento documentado para contactar autoridades ante incidentes graves',
      'Contactos actualizados y verificados anualmente',
      'Personal designado como punto de contacto con autoridades',
      'Obligaciones legales de notificación identificadas (Ley 21.459, sectorial)'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.6', domain_id: 'A5', order_num: 6,
    name: 'Contacto con grupos de interés especial',
    description: 'La organización debe establecer y mantener contacto con grupos de interés especial u otros foros y asociaciones profesionales especializadas en seguridad de la información.',
    purpose: 'Mejorar el conocimiento en seguridad de la información y mantener actualización sobre amenazas y mejores prácticas del sector.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Participación en al menos un foro o comunidad de ciberseguridad (CSIRT Chile, etc.)',
      'Suscripción a fuentes de inteligencia de amenazas (boletines, feeds)',
      'Personal designado para monitorear novedades del sector',
      'Contactos con pares del sector para intercambio de información'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.7', domain_id: 'A5', order_num: 7,
    name: 'Inteligencia de amenazas',
    description: 'La información relativa a las amenazas de seguridad de la información debe ser recopilada y analizada para producir inteligencia de amenazas.',
    purpose: 'Mantener conciencia situacional sobre amenazas relevantes para la organización y tomar acciones proactivas de protección.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Fuentes de inteligencia de amenazas identificadas y suscritas',
      'Proceso definido para recopilar, analizar y distribuir inteligencia interna',
      'Responsable de inteligencia de amenazas designado',
      'Alertas de amenazas revisadas con frecuencia definida',
      'Acciones tomadas en base a inteligencia recibida documentadas'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.8', domain_id: 'A5', order_num: 8,
    name: 'Seguridad de la información en la gestión de proyectos',
    description: 'La seguridad de la información debe integrarse en la gestión de proyectos, ya sea de TI u otro tipo de proyecto de la organización.',
    purpose: 'Asegurar que los riesgos de seguridad de la información sean considerados y tratados durante todo el ciclo de vida de los proyectos.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Evaluación de seguridad incluida en la metodología de gestión de proyectos',
      'Requisitos de seguridad identificados en la fase de inicio de proyectos',
      'Revisión de seguridad realizada antes del cierre y puesta en producción',
      'Responsable de seguridad participando en proyectos críticos',
      'Riesgos de seguridad incluidos en el registro de riesgos del proyecto'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.9', domain_id: 'A5', order_num: 9,
    name: 'Inventario de activos de información y otros activos asociados',
    description: 'Se debe desarrollar y mantener un inventario de los activos de información y otros activos asociados, incluyendo propietarios.',
    purpose: 'Identificar los activos de información de la organización y definir las responsabilidades de protección adecuadas.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Inventario de activos de información documentado y actualizado',
      'Propietario asignado a cada activo de información',
      'Activos de información clasificados según su criticidad',
      'Inventario revisado al menos anualmente o tras cambios significativos',
      'Proceso definido para agregar o remover activos del inventario'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.10', domain_id: 'A5', order_num: 10,
    name: 'Uso aceptable de activos de información y otros activos asociados',
    description: 'Las reglas para el uso aceptable y procedimientos para el manejo de la información y otros activos asociados deben ser identificadas, documentadas e implementadas.',
    purpose: 'Asegurar que la información y los activos sean usados apropiadamente y protegidos contra uso indebido.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Política de uso aceptable documentada y comunicada al personal',
      'Reglas claras sobre uso de dispositivos personales (BYOD)',
      'Política de uso de internet y correo electrónico definida',
      'Acuse de recibo firmado por cada empleado',
      'Consecuencias del uso inaceptable definidas'
    ]),
    policy_template: `POLÍTICA DE USO ACEPTABLE DE ACTIVOS

[EMPRESA] establece las siguientes reglas para el uso de sus activos de información:

1. Los sistemas informáticos son para uso laboral. El uso personal ocasional y no disruptivo es tolerado.
2. Está prohibido acceder a contenido ilegal, pornográfico o que infrinja derechos de autor.
3. Las credenciales de acceso son personales e intransferibles.
4. Está prohibido instalar software no autorizado en equipos corporativos.
5. La información confidencial no debe compartirse con terceros no autorizados.
6. Los incidentes de seguridad deben reportarse inmediatamente al área de TI.

El incumplimiento puede resultar en medidas disciplinarias.`
  },
  {
    id: 'A.5.11', domain_id: 'A5', order_num: 11,
    name: 'Devolución de activos',
    description: 'El personal y otras partes interesadas deben devolver todos los activos de la organización en su posesión al momento de cambiar o finalizar su empleo, contrato o acuerdo.',
    purpose: 'Asegurar que los activos de la organización sean recuperados y que el acceso a la información sea revocado cuando termina una relación laboral o contractual.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Proceso de offboarding documentado con checklist de devolución de activos',
      'Lista de activos asignados por empleado mantenida y actualizada',
      'Revocación de accesos coordinada con devolución de activos',
      'Acuse de recibo de devolución firmado por el empleado saliente',
      'Plazo máximo para devolución de activos definido'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.12', domain_id: 'A5', order_num: 12,
    name: 'Clasificación de la información',
    description: 'La información debe ser clasificada de acuerdo con las necesidades de seguridad de la información de la organización basándose en la confidencialidad, integridad, disponibilidad y los requisitos relevantes de las partes interesadas.',
    purpose: 'Asegurar que la información recibe un nivel adecuado de protección de acuerdo con su importancia para la organización.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Esquema de clasificación de información definido (ej: público, interno, confidencial, secreto)',
      'Criterios de clasificación documentados y comunicados',
      'Responsables de clasificar la información identificados (propietarios de activos)',
      'Proceso de reclasificación cuando cambia el contexto definido',
      'Al menos un ejemplo de clasificación aplicado en documentos críticos'
    ]),
    policy_template: `POLÍTICA DE CLASIFICACIÓN DE INFORMACIÓN

[EMPRESA] clasifica su información en los siguientes niveles:

PÚBLICO: Información que puede ser divulgada libremente. No requiere protección especial.

INTERNO: Información de uso exclusivo del personal de [EMPRESA]. No debe compartirse externamente sin autorización.

CONFIDENCIAL: Información sensible cuya divulgación no autorizada podría causar daño al negocio o a terceros. Requiere cifrado en tránsito y en reposo.

SECRETO: Información de máxima sensibilidad (datos personales, secretos comerciales, datos de clientes críticos). Acceso restringido a personal específicamente autorizado.

Cada propietario de activo es responsable de clasificar correctamente la información bajo su custodia.`
  },
  {
    id: 'A.5.13', domain_id: 'A5', order_num: 13,
    name: 'Etiquetado de la información',
    description: 'Se debe desarrollar e implementar un conjunto apropiado de procedimientos para el etiquetado de la información de acuerdo con el esquema de clasificación de información adoptado por la organización.',
    purpose: 'Facilitar la identificación del nivel de protección requerido para la información y apoyar la automatización del manejo de información.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Procedimiento de etiquetado definido para documentos físicos y digitales',
      'Etiquetas aplicadas en documentos según su nivel de clasificación',
      'Etiquetado aplicado en correos electrónicos con información clasificada',
      'Personal capacitado sobre cómo etiquetar la información correctamente',
      'Herramientas de etiquetado disponibles o procedimiento manual definido'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.14', domain_id: 'A5', order_num: 14,
    name: 'Transferencia de información',
    description: 'Deben estar en vigor reglas, procedimientos o acuerdos de transferencia de información para todos los tipos de instalaciones de comunicación dentro de la organización y entre la organización y otras partes.',
    purpose: 'Mantener la seguridad de la información cuando es transferida dentro y fuera de la organización.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Política de transferencia de información documentada',
      'Acuerdos de no divulgación (NDA) con terceros que reciben información confidencial',
      'Canales seguros de transferencia definidos (correo cifrado, SFTP, etc.)',
      'Prohibición de transferir información clasificada por canales no seguros',
      'Procedimiento para transferencia física de medios de almacenamiento'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.15', domain_id: 'A5', order_num: 15,
    name: 'Control de acceso',
    description: 'Las reglas para controlar el acceso físico y lógico a la información y otros activos asociados deben ser establecidas e implementadas basándose en los requisitos de negocio y de seguridad de la información.',
    purpose: 'Asegurar el acceso autorizado y prevenir el acceso no autorizado a la información y a otros activos asociados.',
    data_source: 'accesos',
    checklist: JSON.stringify([
      'Política de control de acceso documentada basada en necesidad de conocer',
      'Acceso otorgado siguiendo principio de mínimo privilegio',
      'Proceso formal de solicitud y aprobación de accesos',
      'Revisión periódica de derechos de acceso (al menos semestral)',
      'Accesos revocados inmediatamente al cambio o término de roles'
    ]),
    policy_template: `POLÍTICA DE CONTROL DE ACCESO

1. PRINCIPIOS
- Mínimo privilegio: el acceso se otorga solo al necesario para realizar las funciones del cargo.
- Necesidad de conocer: la información se comparte solo con quienes la necesitan.
- Separación de funciones: roles incompatibles no son asignados a la misma persona.

2. GESTIÓN DE ACCESOS
- Todo acceso debe ser solicitado formalmente y aprobado por el responsable del área.
- Los accesos se revisan semestralmente por los propietarios de los sistemas.
- Los accesos se revocan dentro de las 24 horas de la desvinculación.

3. CONTRASEÑAS
- Mínimo 12 caracteres, combinando mayúsculas, minúsculas, números y símbolos.
- Cambio obligatorio cada 90 días para cuentas privilegiadas.
- Prohibido compartir contraseñas entre usuarios.`
  },
  {
    id: 'A.5.16', domain_id: 'A5', order_num: 16,
    name: 'Gestión de identidades',
    description: 'El ciclo de vida completo de las identidades debe ser gestionado, incluyendo la creación, mantenimiento y eliminación de identidades cuando ya no se requieran.',
    purpose: 'Asegurar que las identidades digitales sean gestionadas correctamente durante todo su ciclo de vida para mantener la seguridad y la rendición de cuentas.',
    data_source: 'identidades',
    checklist: JSON.stringify([
      'Proceso formal de creación de identidades digitales documentado',
      'Identidades únicas por persona (prohibición de cuentas compartidas)',
      'Proceso de revisión periódica de identidades activas',
      'Proceso de desactivación de identidades al término del empleo',
      'Registro de todas las identidades en inventario centralizado'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.17', domain_id: 'A5', order_num: 17,
    name: 'Información de autenticación',
    description: 'La asignación y gestión de la información de autenticación debe ser controlada por un proceso de gestión, incluyendo asesoramiento al personal sobre el manejo apropiado de la información de autenticación.',
    purpose: 'Asegurar la autenticidad de los usuarios y proteger los mecanismos de autenticación contra compromisos.',
    data_source: 'identidades',
    checklist: JSON.stringify([
      'Política de contraseñas seguras definida y aplicada técnicamente',
      'Autenticación multifactor (MFA) implementada para accesos críticos y remotos',
      'Procedimiento de restablecimiento seguro de contraseñas definido',
      'Personal capacitado sobre gestión segura de credenciales',
      'Contraseñas nunca almacenadas en texto plano (hashing con bcrypt o similar)',
      'Proceso para gestionar contraseñas de cuentas de servicio'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.18', domain_id: 'A5', order_num: 18,
    name: 'Derechos de acceso',
    description: 'Los derechos de acceso a la información y otros activos asociados deben ser provisionados, revisados, modificados y removidos de acuerdo con la política de control de acceso de la organización.',
    purpose: 'Asegurar que solo se otorguen y mantengan derechos de acceso autorizados a recursos de información.',
    data_source: 'accesos',
    checklist: JSON.stringify([
      'Proceso de provisión de accesos documentado y seguido',
      'Revisión de derechos de acceso realizada al menos semestralmente',
      'Accesos modificados oportunamente al cambiar de rol',
      'Accesos revocados completamente al término de la relación laboral',
      'Registro de derechos de acceso otorgados, modificados y revocados mantenido'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.19', domain_id: 'A5', order_num: 19,
    name: 'Seguridad de la información en relaciones con proveedores',
    description: 'Los procesos y procedimientos deben ser definidos e implementados para gestionar los riesgos de seguridad de la información asociados con el uso de productos y servicios del proveedor.',
    purpose: 'Mantener el nivel acordado de seguridad de la información en el intercambio de activos con proveedores.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Política de seguridad con proveedores documentada',
      'Evaluación de riesgos de seguridad realizada antes de contratar proveedores críticos',
      'Inventario de proveedores con acceso a información o sistemas de la organización',
      'Requisitos mínimos de seguridad definidos para proveedores',
      'Proceso de revisión periódica del cumplimiento de seguridad de proveedores'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.20', domain_id: 'A5', order_num: 20,
    name: 'Abordar la seguridad de la información en acuerdos con proveedores',
    description: 'Los requisitos de seguridad de la información relevantes deben ser establecidos y acordados con cada proveedor basándose en el tipo de relación con el proveedor.',
    purpose: 'Establecer compromisos contractuales claros sobre seguridad de la información con los proveedores para proteger los activos de la organización.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Cláusulas de seguridad de la información incluidas en contratos con proveedores',
      'NDA firmado con proveedores que acceden a información confidencial',
      'Obligaciones de reporte de incidentes de seguridad incluidas en contratos',
      'Derecho a auditoría de seguridad incluido en contratos críticos',
      'Requisitos de seguridad en la cadena de suministro especificados'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.21', domain_id: 'A5', order_num: 21,
    name: 'Gestión de la seguridad de la información en la cadena de suministro de TIC',
    description: 'Los procesos y procedimientos deben ser definidos e implementados para gestionar los riesgos de seguridad de la información asociados con la cadena de suministro de productos y servicios de TIC.',
    purpose: 'Asegurar que los componentes adquiridos a lo largo de la cadena de suministro de TIC mantengan el nivel de seguridad apropiado.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Proveedores críticos de TIC identificados y mapeados en la cadena de suministro',
      'Riesgos de la cadena de suministro de TIC evaluados',
      'Requisitos de seguridad comunicados a proveedores de TIC',
      'Proceso para verificar la integridad de productos y componentes adquiridos',
      'Plan de contingencia ante falla de proveedor crítico de TIC'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.22', domain_id: 'A5', order_num: 22,
    name: 'Seguimiento, revisión y gestión de cambios de servicios de proveedores',
    description: 'La organización debe monitorear, revisar, evaluar y gestionar regularmente los cambios en las prácticas de seguridad de la información de los proveedores.',
    purpose: 'Mantener un nivel acordado de seguridad de la información y de prestación del servicio en línea con los acuerdos con proveedores.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Revisiones periódicas de desempeño de proveedores críticos realizadas',
      'Proceso para notificación de cambios por parte de proveedores establecido',
      'Evaluación de impacto en seguridad ante cambios de proveedores',
      'Registro de incidentes de seguridad relacionados con proveedores',
      'Plan de salida definido para servicios críticos de proveedores'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.23', domain_id: 'A5', order_num: 23,
    name: 'Seguridad de la información para uso de servicios en la nube',
    description: 'Los procesos para adquisición, uso, gestión y salida de servicios en la nube deben ser establecidos de acuerdo con los requisitos de seguridad de la información de la organización.',
    purpose: 'Especificar y gestionar la seguridad de la información para el uso de servicios en la nube.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Inventario de servicios en la nube utilizados mantenido',
      'Evaluación de seguridad realizada antes de adoptar nuevos servicios cloud',
      'Requisitos de seguridad y cumplimiento (residencia de datos, cifrado) verificados con el proveedor cloud',
      'Políticas de uso de cloud documentadas y comunicadas al personal',
      'Plan de salida y portabilidad de datos definido para servicios cloud críticos',
      'Responsabilidades compartidas de seguridad (modelo de responsabilidad compartida) comprendidas'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.24', domain_id: 'A5', order_num: 24,
    name: 'Planificación y preparación de la gestión de incidentes de seguridad',
    description: 'La organización debe planificar y prepararse para gestionar los incidentes de seguridad de la información definiendo, estableciendo y comunicando los procesos, roles y responsabilidades de gestión de incidentes.',
    purpose: 'Asegurar una respuesta coherente y efectiva a los incidentes de seguridad de la información.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Plan de respuesta a incidentes de seguridad documentado',
      'Roles y responsabilidades en gestión de incidentes definidos',
      'Procedimientos de escalación y comunicación documentados',
      'Plan probado mediante ejercicios o simulacros al menos anualmente',
      'Contactos de emergencia (internos y externos) disponibles y actualizados'
    ]),
    policy_template: `PLAN DE RESPUESTA A INCIDENTES DE SEGURIDAD

1. DEFINICIÓN DE INCIDENTE
Un incidente de seguridad es cualquier evento que comprometa o pueda comprometer la confidencialidad, integridad o disponibilidad de los activos de información de [EMPRESA].

2. CLASIFICACIÓN DE INCIDENTES
CRÍTICO: Brecha de datos confirmada, ransomware activo, sistema crítico fuera de servicio.
ALTO: Acceso no autorizado detectado, malware identificado, pérdida de dispositivos con datos sensibles.
MEDIO: Intento de phishing, anomalías en logs, vulnerabilidades críticas sin explotar.
BAJO: Incidentes menores sin impacto confirmado.

3. PROCESO DE RESPUESTA
Fase 1 - Detección y reporte: Cualquier empleado que detecte un incidente debe reportarlo al área de TI/Seguridad de inmediato.
Fase 2 - Triaje: Evaluación inicial de severidad y alcance (máximo 1 hora).
Fase 3 - Contención: Acciones inmediatas para limitar el daño.
Fase 4 - Erradicación: Eliminación de la causa raíz.
Fase 5 - Recuperación: Restauración de servicios.
Fase 6 - Lecciones aprendidas: Documentación y mejora del proceso.`
  },
  {
    id: 'A.5.25', domain_id: 'A5', order_num: 25,
    name: 'Evaluación y decisión sobre eventos de seguridad de la información',
    description: 'La organización debe evaluar los eventos de seguridad de la información y decidir si deben ser clasificados como incidentes de seguridad de la información.',
    purpose: 'Asegurar que los eventos de seguridad se clasifiquen y prioricen correctamente para una respuesta eficiente.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Criterios de clasificación de eventos vs incidentes documentados',
      'Equipo o persona responsable de evaluar y clasificar eventos designado',
      'Proceso de escalación para eventos ambiguos definido',
      'Registro de todos los eventos evaluados mantenido',
      'Tiempo máximo de evaluación inicial definido'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.26', domain_id: 'A5', order_num: 26,
    name: 'Respuesta a incidentes de seguridad de la información',
    description: 'Los incidentes de seguridad de la información deben ser respondidos de acuerdo con los procedimientos documentados.',
    purpose: 'Asegurar que los incidentes de seguridad se gestionen de manera efectiva y eficiente para minimizar el impacto.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Procedimientos de respuesta documentados para los tipos de incidente más comunes',
      'Equipo de respuesta a incidentes (IRT) identificado y entrenado',
      'Herramientas y recursos para respuesta a incidentes disponibles',
      'Comunicación de incidentes a partes afectadas definida',
      'Notificación a autoridades regulatorias cuando corresponde'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.27', domain_id: 'A5', order_num: 27,
    name: 'Aprendizaje de los incidentes de seguridad de la información',
    description: 'El conocimiento obtenido de los incidentes de seguridad de la información debe ser utilizado para fortalecer y mejorar los controles de seguridad de la información.',
    purpose: 'Reducir la probabilidad o impacto de incidentes futuros mediante la aplicación de lecciones aprendidas.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Proceso de revisión post-incidente (post-mortem) documentado',
      'Lecciones aprendidas documentadas y compartidas con el equipo',
      'Mejoras de controles implementadas tras incidentes significativos',
      'Registro histórico de incidentes y sus resoluciones mantenido',
      'Métricas de incidentes revisadas periódicamente por la dirección'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.28', domain_id: 'A5', order_num: 28,
    name: 'Recolección de evidencias',
    description: 'La organización debe establecer e implementar procedimientos para la identificación, recolección, adquisición y preservación de evidencias relacionadas con eventos de seguridad de la información.',
    purpose: 'Asegurar que las evidencias de incidentes de seguridad sean recopiladas, preservadas y mantenidas de manera que sean admisibles en investigaciones o procedimientos legales.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Procedimientos de recolección forense de evidencias documentados',
      'Personal capacitado en manejo de evidencias digitales',
      'Cadena de custodia para evidencias digitales definida',
      'Herramientas forenses básicas disponibles',
      'Coordinación con asesoría legal para evidencias destinadas a procesos judiciales'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.29', domain_id: 'A5', order_num: 29,
    name: 'Seguridad de la información durante perturbaciones',
    description: 'La organización debe planificar cómo mantener la seguridad de la información a un nivel apropiado durante las perturbaciones.',
    purpose: 'Proteger la información durante eventos disruptivos como desastres, crisis o incidentes graves.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Requisitos de seguridad de la información incluidos en el plan de continuidad del negocio',
      'Controles de seguridad aplicables durante perturbaciones identificados',
      'Procedimientos de seguridad para operación en modo degradado documentados',
      'Plan de continuidad probado con componente de seguridad',
      'Accesos de emergencia definidos con controles compensatorios'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.30', domain_id: 'A5', order_num: 30,
    name: 'Preparación de las TIC para la continuidad del negocio',
    description: 'La preparación de las TIC debe ser planificada, implementada, mantenida y probada basándose en los objetivos de continuidad del negocio y los requisitos de continuidad de las TIC.',
    purpose: 'Asegurar la disponibilidad de la información y otros activos de TIC durante perturbaciones.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Análisis de impacto en el negocio (BIA) realizado para sistemas de TIC críticos',
      'RTO y RPO definidos para sistemas críticos',
      'Plan de recuperación de TIC documentado',
      'Backups y redundancias implementadas según RTO/RPO definidos',
      'Plan de recuperación de TIC probado al menos anualmente'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.31', domain_id: 'A5', order_num: 31,
    name: 'Requisitos legales, estatutarios, reglamentarios y contractuales',
    description: 'Los requisitos legales, estatutarios, reglamentarios y contractuales relevantes para la seguridad de la información y el enfoque de la organización para cumplir con estos requisitos deben ser identificados, documentados y mantenidos actualizados.',
    purpose: 'Evitar el incumplimiento de obligaciones legales, estatutarias, reglamentarias o contractuales relacionadas con la seguridad de la información.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Marco legal aplicable identificado (Ley 19.628, Ley 21.459, reguladores sectoriales)',
      'Registro de requisitos legales y contractuales mantenido y actualizado',
      'Responsable de seguimiento del cumplimiento legal designado',
      'Proceso de monitoreo de cambios normativos establecido',
      'Controles implementados para cumplir requisitos legales identificados'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.32', domain_id: 'A5', order_num: 32,
    name: 'Derechos de propiedad intelectual',
    description: 'La organización debe implementar procedimientos apropiados para proteger los derechos de propiedad intelectual.',
    purpose: 'Asegurar el cumplimiento de los requisitos legales, reglamentarios y contractuales relacionados con los derechos de propiedad intelectual.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Política de uso de software licenciado documentada',
      'Inventario de licencias de software mantenido y actualizado',
      'Proceso para adquisición de software que verifica licencias',
      'Prohibición de uso de software no licenciado comunicada al personal',
      'Protección de propiedad intelectual propia (código, documentación) contemplada'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.33', domain_id: 'A5', order_num: 33,
    name: 'Protección de registros',
    description: 'Los registros deben ser protegidos contra pérdida, destrucción, falsificación, acceso no autorizado y divulgación no autorizada.',
    purpose: 'Asegurar que los registros importantes sean protegidos de acuerdo con los requisitos legales, reglamentarios, contractuales y de negocio.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Registro de tipos de registros críticos y sus períodos de retención definidos',
      'Controles de integridad aplicados a registros críticos',
      'Registros protegidos contra modificación o eliminación no autorizada',
      'Proceso de eliminación segura de registros al vencimiento de retención',
      'Copias de seguridad de registros críticos realizadas y verificadas'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.34', domain_id: 'A5', order_num: 34,
    name: 'Privacidad y protección de información de identificación personal (PII)',
    description: 'La organización debe identificar y cumplir con los requisitos relativos a la preservación de la privacidad y la protección de la PII según las leyes y regulaciones aplicables cuando sea relevante.',
    purpose: 'Asegurar la protección de la privacidad y de los datos personales de acuerdo con la legislación aplicable.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Inventario de datos personales (PII) tratados por la organización mantenido',
      'Base legal para el tratamiento de cada categoría de datos personales identificada',
      'Medidas de seguridad aplicadas a datos personales documentadas',
      'Política de privacidad publicada y comunicada a los titulares de datos',
      'Proceso de respuesta a derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) definido',
      'Contratos de tratamiento de datos con terceros firmados cuando aplica'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.35', domain_id: 'A5', order_num: 35,
    name: 'Revisión independiente de la seguridad de la información',
    description: 'El enfoque de la organización para gestionar la seguridad de la información y su implementación, incluyendo personas, procesos y tecnologías, debe ser revisado independientemente a intervalos planificados o cuando ocurran cambios significativos.',
    purpose: 'Asegurar la idoneidad, adecuación y efectividad continuadas del enfoque de la organización para gestionar la seguridad de la información.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Auditorías internas de seguridad de la información realizadas al menos anualmente',
      'Auditoría externa o revisión independiente planificada',
      'Alcance y criterios de auditoría definidos',
      'Hallazgos de auditoría documentados y plan de remediación establecido',
      'Seguimiento a los hallazgos de auditorías anteriores realizado'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.36', domain_id: 'A5', order_num: 36,
    name: 'Cumplimiento de políticas, normas y estándares de seguridad de la información',
    description: 'El cumplimiento de la política de seguridad de la información, las políticas específicas de tema, las normas y los estándares de la organización debe ser revisado regularmente.',
    purpose: 'Asegurar que la seguridad de la información sea implementada y operada de acuerdo con la política y los procedimientos de la organización.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Revisiones de cumplimiento realizadas periódicamente por los responsables de área',
      'Proceso de reporte de incumplimientos establecido',
      'Acciones correctivas implementadas ante desviaciones detectadas',
      'Métricas de cumplimiento reportadas a la dirección',
      'Excepciones a políticas documentadas y aprobadas formalmente'
    ]),
    policy_template: null
  },
  {
    id: 'A.5.37', domain_id: 'A5', order_num: 37,
    name: 'Procedimientos de operación documentados',
    description: 'Los procedimientos de operación para las instalaciones de procesamiento de información deben ser documentados y estar disponibles para quienes los necesiten.',
    purpose: 'Asegurar la operación correcta y segura de las instalaciones de procesamiento de información.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Procedimientos operativos críticos de TI documentados',
      'Procedimientos accesibles para el personal que los necesita',
      'Procedimientos revisados y actualizados ante cambios en los sistemas',
      'Procedimientos de inicio, monitoreo y cierre de sistemas documentados',
      'Procedimientos de manejo de errores y excepciones documentados'
    ]),
    policy_template: null
  },
]

// ─── A.6 — CONTROLES DE PERSONAS (8 controles) ───────────────────────────────

const A6_CONTROLS = [
  {
    id: 'A.6.1', domain_id: 'A6', order_num: 1,
    name: 'Selección de personal',
    description: 'Las verificaciones de antecedentes de todos los candidatos a empleo deben ser llevadas a cabo antes de unirse a la organización y de manera continua, teniendo en cuenta las leyes, regulaciones y ética aplicables, y ser proporcionales a los requisitos del negocio, la clasificación de la información a la que se accederá y los riesgos percibidos.',
    purpose: 'Asegurar que los empleados son adecuados para los roles para los que son considerados y permanecen aptos durante su empleo.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Proceso de verificación de antecedentes definido para nuevas contrataciones',
      'Verificación de identidad, títulos y referencias realizada antes de contratar',
      'Nivel de verificación proporcional a la sensibilidad del rol',
      'Verificaciones realizadas de acuerdo con la legislación laboral chilena',
      'Verificaciones periódicas para roles de alto riesgo o acceso privilegiado'
    ]),
    policy_template: null
  },
  {
    id: 'A.6.2', domain_id: 'A6', order_num: 2,
    name: 'Términos y condiciones de empleo',
    description: 'Los acuerdos contractuales con los empleados y contratistas deben establecer sus responsabilidades y las de la organización respecto a la seguridad de la información.',
    purpose: 'Asegurar que los empleados y contratistas comprendan sus responsabilidades de seguridad de la información y acepten cumplirlas.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Responsabilidades de seguridad incluidas en contratos de trabajo',
      'Acuerdo de confidencialidad (NDA) firmado por todos los empleados',
      'Consecuencias del incumplimiento de seguridad incluidas en el contrato',
      'Política de uso aceptable firmada al inicio del empleo',
      'Responsabilidades de seguridad vigentes tras el término del empleo incluidas'
    ]),
    policy_template: null
  },
  {
    id: 'A.6.3', domain_id: 'A6', order_num: 3,
    name: 'Concienciación, educación y formación en seguridad de la información',
    description: 'El personal de la organización y, cuando sea relevante, los contratistas deben recibir concienciación, educación y formación apropiadas sobre seguridad de la información y actualizaciones regulares de la política y los procedimientos de la organización.',
    purpose: 'Asegurar que el personal esté al tanto de las amenazas de seguridad de la información y sus responsabilidades, y sea capaz de apoyar la política de seguridad de la información.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Programa de concienciación en seguridad de la información documentado',
      'Formación inicial en seguridad para todos los empleados nuevos',
      'Formaciones periódicas de actualización realizadas al menos anualmente',
      'Simulacros de phishing realizados y resultados analizados',
      'Métricas del programa de formación (asistencia, evaluaciones) registradas',
      'Formación específica para roles con responsabilidades de seguridad elevadas'
    ]),
    policy_template: null
  },
  {
    id: 'A.6.4', domain_id: 'A6', order_num: 4,
    name: 'Proceso disciplinario',
    description: 'Se debe contar con un proceso disciplinario formal y comunicado para tomar acciones contra el personal que haya cometido una infracción de la política de seguridad de la información.',
    purpose: 'Asegurar que el personal que infrinja la política de seguridad de la información sea debidamente gestionado para desalentar futuras infracciones.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Proceso disciplinario por infracciones de seguridad documentado',
      'Escala de sanciones proporcional a la gravedad de la infracción definida',
      'Proceso disciplinario comunicado a todo el personal',
      'Proceso alineado con el Código del Trabajo y la legislación laboral chilena',
      'Registro de infracciones y acciones disciplinarias mantenido de forma confidencial'
    ]),
    policy_template: null
  },
  {
    id: 'A.6.5', domain_id: 'A6', order_num: 5,
    name: 'Responsabilidades tras la finalización o cambio de empleo',
    description: 'Las responsabilidades y obligaciones de seguridad de la información que permanecen válidas después del cambio o la terminación del empleo deben ser definidas, comunicadas al empleado o contratista y aplicadas.',
    purpose: 'Proteger los intereses de la organización como parte del proceso de cambio o terminación del empleo.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Proceso de offboarding de seguridad documentado',
      'Revocación de todos los accesos dentro de las 24 horas de la desvinculación',
      'Devolución de todos los activos (equipos, credenciales, documentos) verificada',
      'Obligaciones de confidencialidad post-empleo comunicadas y firmadas',
      'Transferencia de conocimiento y credenciales de servicio realizada antes de la salida'
    ]),
    policy_template: null
  },
  {
    id: 'A.6.6', domain_id: 'A6', order_num: 6,
    name: 'Acuerdos de confidencialidad o no divulgación',
    description: 'Los acuerdos de confidencialidad o de no divulgación que reflejen las necesidades de la organización para la protección de la información deben ser identificados, documentados, revisados regularmente y firmados por el personal y otras partes interesadas relevantes.',
    purpose: 'Mantener la confidencialidad de la información a la que acceden empleados, contratistas y terceros.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Acuerdos de confidencialidad (NDA) estandarizados disponibles',
      'NDA firmado por todos los empleados, contratistas y terceros con acceso a información sensible',
      'NDAs revisados al menos cada dos años para asegurar vigencia',
      'Registro de NDAs firmados mantenido',
      'Consecuencias legales del incumplimiento del NDA claramente expresadas'
    ]),
    policy_template: null
  },
  {
    id: 'A.6.7', domain_id: 'A6', order_num: 7,
    name: 'Trabajo remoto',
    description: 'Se deben implementar medidas de seguridad cuando el personal trabaja de forma remota para proteger la información a la que se accede, procesa o almacena fuera de las instalaciones de la organización.',
    purpose: 'Asegurar la seguridad de la información cuando el personal trabaja remotamente.',
    data_source: 'accesos',
    checklist: JSON.stringify([
      'Política de trabajo remoto con requisitos de seguridad documentada',
      'VPN o acceso remoto seguro implementado para conexiones a sistemas corporativos',
      'Requisitos de seguridad del entorno doméstico comunicados al personal',
      'Dispositivos utilizados para trabajo remoto cumplen estándares mínimos de seguridad',
      'Pantalla bloqueada automáticamente y cifrado de disco en dispositivos remotos'
    ]),
    policy_template: null
  },
  {
    id: 'A.6.8', domain_id: 'A6', order_num: 8,
    name: 'Reporte de eventos de seguridad de la información',
    description: 'La organización debe proporcionar un mecanismo para que el personal reporte los eventos de seguridad de la información observados o sospechosos a través de los canales apropiados de manera oportuna.',
    purpose: 'Apoyar la detección y respuesta oportuna a los incidentes de seguridad de la información.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Canal de reporte de incidentes de seguridad conocido por todo el personal',
      'Proceso de reporte simple y accesible (correo, ticket, teléfono)',
      'Cultura de reporte fomentada activamente por la dirección',
      'Personal capacitado para identificar y reportar eventos de seguridad',
      'Tiempo máximo de respuesta al reporte definido y comunicado',
      'Retroalimentación al reportante sobre el estado de su reporte'
    ]),
    policy_template: null
  },
]

// ─── A.7 — CONTROLES FÍSICOS (14 controles) ──────────────────────────────────

const A7_CONTROLS = [
  {
    id: 'A.7.1', domain_id: 'A7', order_num: 1,
    name: 'Perímetros de seguridad física',
    description: 'Los perímetros de seguridad deben ser definidos y usados para proteger las áreas que contienen información y otros activos asociados.',
    purpose: 'Prevenir el acceso físico no autorizado, daño e interferencia a la información de la organización y otras instalaciones de procesamiento de información.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Perímetros físicos de seguridad definidos y documentados (oficinas, data center)',
      'Control de acceso físico implementado (llave, tarjeta, PIN)',
      'Áreas seguras diferenciadas por nivel de sensibilidad',
      'Puertas y ventanas de áreas seguras reforzadas adecuadamente',
      'Registro de acceso físico a áreas sensibles mantenido'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.2', domain_id: 'A7', order_num: 2,
    name: 'Entrada física',
    description: 'Las áreas seguras deben ser protegidas por controles de entrada apropiados y puntos de acceso para garantizar que solo se permita el acceso de personal autorizado.',
    purpose: 'Asegurar que solo el personal autorizado tenga acceso a las áreas seguras.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Control de acceso en puntos de entrada a áreas seguras implementado',
      'Visitantes identificados, registrados y acompañados en áreas seguras',
      'Credenciales de acceso físico (tarjetas, llaves) gestionadas formalmente',
      'Credenciales revocadas inmediatamente al término del empleo',
      'Revisión periódica de derechos de acceso físico realizada'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.3', domain_id: 'A7', order_num: 3,
    name: 'Seguridad de oficinas, salas e instalaciones',
    description: 'La seguridad física para oficinas, salas e instalaciones debe ser diseñada e implementada.',
    purpose: 'Prevenir el acceso físico no autorizado a instalaciones donde se procesa información sensible.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Salas de servidores o equipos críticos con acceso restringido',
      'Equipo sensible no visible desde áreas públicas',
      'Directorios internos y ubicaciones de activos no visibles desde el exterior',
      'Áreas de recepción con control antes de acceder a zonas internas',
      'Procedimientos de seguridad para trabajo fuera de horario documentados'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.4', domain_id: 'A7', order_num: 4,
    name: 'Monitoreo de seguridad física',
    description: 'Las instalaciones deben ser monitoreadas continuamente para detectar acceso físico no autorizado.',
    purpose: 'Detectar y disuadir intentos de acceso físico no autorizado a instalaciones críticas.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Sistema de CCTV o equivalente en áreas críticas instalado y operativo',
      'Grabaciones de CCTV almacenadas por al menos 30 días',
      'Alarmas anti-intrusión en instalaciones críticas instaladas',
      'Sistema de monitoreo revisado periódicamente para verificar funcionamiento',
      'Proceso de respuesta ante alertas del sistema de monitoreo físico definido'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.5', domain_id: 'A7', order_num: 5,
    name: 'Protección contra amenazas físicas y ambientales',
    description: 'La protección contra amenazas físicas y ambientales, como desastres naturales, explosiones, incendios, inundaciones y otros eventos de emergencia, debe ser diseñada e implementada.',
    purpose: 'Prevenir o reducir las consecuencias de eventos causados por amenazas físicas y ambientales.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Evaluación de amenazas ambientales para las instalaciones realizada',
      'Protección contra incendios implementada (extintores, detectores, rociadores)',
      'Protección contra inundaciones evaluada y mitigada donde aplica',
      'Sistemas de respaldo de energía (UPS) para equipos críticos instalados',
      'Planes de evacuación y emergencia documentados y practicados'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.6', domain_id: 'A7', order_num: 6,
    name: 'Trabajo en áreas seguras',
    description: 'Se deben diseñar e implementar medidas de seguridad para el trabajo en áreas seguras.',
    purpose: 'Proteger la información procesada en áreas seguras contra exposición no autorizada o interferencia.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Instrucciones de seguridad para trabajo en áreas seguras documentadas',
      'Personal no autorizado sin acceso a áreas seguras sin supervisión',
      'Trabajo desatendido en áreas seguras minimizado o controlado',
      'Dispositivos de grabación (cámaras, micrófonos) restringidos en áreas seguras',
      'Reuniones con externos realizadas fuera de áreas seguras'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.7', domain_id: 'A7', order_num: 7,
    name: 'Escritorio y pantalla limpios',
    description: 'Se deben definir e implementar reglas de escritorio limpio para papeles y medios de almacenamiento removibles y reglas de pantalla limpia para las instalaciones de procesamiento de información.',
    purpose: 'Reducir el riesgo de acceso no autorizado, pérdida y daño a la información durante y fuera del horario normal de trabajo.',
    data_source: 'personal',
    checklist: JSON.stringify([
      'Política de escritorio limpio documentada y comunicada',
      'Documentos sensibles guardados bajo llave al abandonar el puesto de trabajo',
      'Pantallas bloqueadas automáticamente tras período de inactividad (máximo 5 minutos)',
      'Bloqueo de pantalla manual usado al alejarse del puesto de trabajo',
      'Impresoras y fotocopiadoras en áreas accesibles monitoreadas o vaciadas regularmente'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.8', domain_id: 'A7', order_num: 8,
    name: 'Ubicación y protección de equipos',
    description: 'Los equipos deben estar ubicados de forma segura para reducir los riesgos de las amenazas físicas y ambientales y las oportunidades de acceso no autorizado.',
    purpose: 'Reducir los riesgos de las amenazas físicas y ambientales y las oportunidades de acceso no autorizado a equipos críticos.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Equipos críticos ubicados en áreas con acceso controlado',
      'Equipos protegidos contra variaciones de temperatura y humedad',
      'Racks de servidores asegurados físicamente contra acceso no autorizado',
      'Cables de seguridad en laptops en áreas de acceso común',
      'Equipos críticos protegidos contra amenazas de robo'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.9', domain_id: 'A7', order_num: 9,
    name: 'Seguridad de activos fuera de las instalaciones',
    description: 'Los activos fuera de las instalaciones deben ser protegidos, teniendo en cuenta los diferentes riesgos de trabajar fuera de las instalaciones de la organización.',
    purpose: 'Prevenir la pérdida, daño, robo o compromiso de activos fuera del sitio y la interrupción de las operaciones de la organización.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Política de uso de activos fuera de instalaciones documentada',
      'Equipos con datos sensibles cifrados cuando se llevan fuera de la oficina',
      'Procedimiento de reporte de pérdida o robo de equipos definido y conocido',
      'Inventario de equipos fuera de instalaciones mantenido',
      'Acuerdo de responsabilidad firmado para equipos llevados fuera de la oficina'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.10', domain_id: 'A7', order_num: 10,
    name: 'Medios de almacenamiento',
    description: 'Los medios de almacenamiento deben ser gestionados durante su ciclo de vida de adquisición, uso, transporte y eliminación de acuerdo con el esquema de clasificación e información de la organización.',
    purpose: 'Asegurar que la información en medios de almacenamiento sea protegida contra divulgación, modificación, eliminación o destrucción no autorizadas.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Inventario de medios de almacenamiento removibles (USB, discos externos) mantenido',
      'Política de uso de medios removibles documentada',
      'Datos en medios removibles cifrados cuando contienen información clasificada',
      'Proceso de borrado seguro antes de reutilizar o desechar medios de almacenamiento',
      'Medios con información altamente clasificada destruidos físicamente al fin de su vida útil'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.11', domain_id: 'A7', order_num: 11,
    name: 'Servicios de suministro',
    description: 'Las instalaciones de procesamiento de información deben estar protegidas contra cortes de energía y otras interrupciones causadas por fallos en los servicios de suministro.',
    purpose: 'Prevenir interrupciones en el procesamiento de información causadas por fallos en los servicios de suministro.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'UPS (alimentación ininterrumpida) instalada para sistemas críticos',
      'Generador de emergencia disponible para instalaciones críticas si aplica',
      'Pruebas periódicas de los sistemas de respaldo de energía realizadas',
      'Protección contra sobretensiones implementada',
      'Múltiples proveedores de telecomunicaciones para redundancia donde aplica'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.12', domain_id: 'A7', order_num: 12,
    name: 'Seguridad del cableado',
    description: 'Los cables que transportan energía o transmiten datos o apoyan los servicios de información deben estar protegidos contra interceptación, interferencia o daño.',
    purpose: 'Prevenir la interceptación no autorizada de datos transmitidos por cable o daño a la infraestructura de cableado.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Infraestructura de cableado de red mapeada y documentada',
      'Cableado protegido en conductos o espacios cerrados donde es posible',
      'Puntos de acceso a cabling solo en áreas controladas',
      'Cableado de energía separado del cableado de datos para reducir interferencias',
      'Inspección periódica del cableado para detectar daños o manipulaciones'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.13', domain_id: 'A7', order_num: 13,
    name: 'Mantenimiento de equipos',
    description: 'Los equipos deben ser mantenidos correctamente para garantizar la disponibilidad, integridad y confidencialidad de la información.',
    purpose: 'Prevenir la pérdida, daño, robo o compromiso de activos y la interrupción de las operaciones por falta de mantenimiento.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Programa de mantenimiento preventivo para equipos críticos establecido',
      'Mantenimiento realizado por personal autorizado o proveedores certificados',
      'Registro de todas las operaciones de mantenimiento mantenido',
      'Información sensible protegida o removida antes de enviar equipos a mantenimiento externo',
      'Procedimiento para verificar la integridad del equipo tras mantenimiento externo'
    ]),
    policy_template: null
  },
  {
    id: 'A.7.14', domain_id: 'A7', order_num: 14,
    name: 'Eliminación segura o reutilización de equipos',
    description: 'Los elementos del equipo que contienen medios de almacenamiento deben ser verificados para garantizar que cualquier dato sensible y software con licencia haya sido removido o sobreescrito de forma segura antes de su eliminación o reutilización.',
    purpose: 'Prevenir la divulgación de información sensible en equipos y medios antes de su eliminación o reutilización.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Proceso de borrado seguro de datos antes de reutilizar o desechar equipos documentado',
      'Herramienta de borrado seguro (certificada NIST 800-88 o similar) utilizada',
      'Discos duros de equipos con datos altamente sensibles destruidos físicamente',
      'Registro de eliminación/reutilización de equipos mantenido',
      'Proveedor de disposición de activos electrónicos (RAEE) certificado utilizado'
    ]),
    policy_template: null
  },
]

// ─── A.8 — CONTROLES TECNOLÓGICOS (34 controles) ─────────────────────────────

const A8_CONTROLS = [
  {
    id: 'A.8.1', domain_id: 'A8', order_num: 1,
    name: 'Dispositivos de punto final de usuario',
    description: 'La información almacenada, procesada o accesible a través de dispositivos de punto final de usuario debe ser protegida.',
    purpose: 'Proteger la información contra los riesgos introducidos por el uso de dispositivos de punto final de usuario.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Política de seguridad para dispositivos de punto final documentada',
      'Antivirus/Endpoint Protection instalado y actualizado en todos los equipos',
      'Cifrado de disco completo habilitado en laptops y dispositivos móviles',
      'Actualizaciones automáticas de sistema operativo y aplicaciones habilitadas',
      'Capacidad de borrado remoto en dispositivos móviles corporativos',
      'Inventario de dispositivos de punto final mantenido y actualizado'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.2', domain_id: 'A8', order_num: 2,
    name: 'Derechos de acceso privilegiado',
    description: 'La asignación y uso de derechos de acceso privilegiado debe ser restringida y gestionada.',
    purpose: 'Asegurar que los derechos de acceso privilegiado sean controlados para prevenir el compromiso no autorizado de sistemas y datos.',
    data_source: 'identidades',
    checklist: JSON.stringify([
      'Inventario de cuentas privilegiadas (admin, root, superusuario) mantenido',
      'Cuentas privilegiadas asignadas solo a personal específicamente autorizado',
      'Uso de cuentas privilegiadas registrado (logging detallado)',
      'Cuentas privilegiadas usadas solo cuando necesario (no como cuenta diaria)',
      'Revisión periódica de cuentas privilegiadas realizada',
      'MFA obligatorio para cuentas privilegiadas'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.3', domain_id: 'A8', order_num: 3,
    name: 'Restricción de acceso a la información',
    description: 'El acceso a la información y otros activos asociados debe ser restringido de acuerdo con la política de control de acceso establecida.',
    purpose: 'Asegurar que solo los usuarios autorizados, incluyendo software, puedan acceder a la información y otros activos.',
    data_source: 'accesos',
    checklist: JSON.stringify([
      'Acceso a sistemas basado en roles y necesidades de negocio',
      'Control de acceso aplicado a nivel de aplicación y sistema operativo',
      'Acceso a datos sensibles restringido a usuarios con necesidad demostrada',
      'Matrices de control de acceso documentadas para sistemas críticos',
      'Acceso a APIs y servicios restringido mediante autenticación adecuada'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.4', domain_id: 'A8', order_num: 4,
    name: 'Acceso al código fuente',
    description: 'El acceso de lectura y escritura al código fuente, herramientas de desarrollo y bibliotecas de software debe ser gestionado apropiadamente.',
    purpose: 'Prevenir la introducción de funcionalidades no autorizadas, evitar cambios no intencionales y mantener la confidencialidad de la propiedad intelectual.',
    data_source: 'accesos',
    checklist: JSON.stringify([
      'Repositorio de código fuente con control de acceso configurado',
      'Acceso al código fuente restringido a desarrolladores autorizados',
      'Historial de cambios al código fuente registrado (git log)',
      'Revisión de código requerida antes de integrar cambios a producción',
      'Separación entre entornos de desarrollo y producción aplicada'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.5', domain_id: 'A8', order_num: 5,
    name: 'Autenticación segura',
    description: 'Se deben implementar tecnologías y procedimientos de autenticación segura basándose en las restricciones de acceso a la información y la política de control de acceso.',
    purpose: 'Asegurar que los usuarios sean autenticados de forma segura al acceder a sistemas e información.',
    data_source: 'identidades',
    checklist: JSON.stringify([
      'Autenticación multifactor (MFA) implementada para accesos remotos y críticos',
      'Contraseñas con complejidad mínima configurada técnicamente',
      'Bloqueo automático de cuenta tras intentos fallidos de autenticación',
      'Sesiones con tiempo de expiración automática configurado',
      'Protocolos de autenticación seguros utilizados (OAuth 2.0, SAML, etc.)',
      'Credenciales por defecto cambiadas en todos los dispositivos y sistemas'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.6', domain_id: 'A8', order_num: 6,
    name: 'Gestión de la capacidad',
    description: 'El uso de los recursos debe ser monitoreado y ajustado, y se deben realizar proyecciones de los requisitos de capacidad futura para asegurar el rendimiento del sistema requerido.',
    purpose: 'Asegurar la capacidad y rendimiento requeridos de los recursos de procesamiento de información.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Monitoreo de uso de CPU, memoria y almacenamiento en sistemas críticos configurado',
      'Umbrales de alerta por capacidad definidos y configurados',
      'Planificación de capacidad revisada al menos semestralmente',
      'Proceso para solicitar y aprobar aumentos de capacidad definido',
      'Proyecciones de crecimiento basadas en tendencias históricas realizadas'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.7', domain_id: 'A8', order_num: 7,
    name: 'Protección contra malware',
    description: 'La protección contra malware debe ser implementada y soportada por la concienciación del usuario apropiada.',
    purpose: 'Asegurar que la información y otros activos estén protegidos contra el malware.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Solución de antimalware/EDR instalada en todos los endpoints',
      'Definiciones de malware actualizadas automáticamente',
      'Análisis periódico completo del sistema programado',
      'Personal capacitado para reconocer e-mails de phishing y adjuntos sospechosos',
      'Protección antimalware en servidores de correo y proxies web configurada',
      'Respuesta ante detección de malware documentada y conocida'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.8', domain_id: 'A8', order_num: 8,
    name: 'Gestión de vulnerabilidades técnicas',
    description: 'La información sobre vulnerabilidades técnicas de los sistemas de información en uso debe ser obtenida, la exposición de la organización a tales vulnerabilidades debe ser evaluada y se deben tomar las medidas apropiadas.',
    purpose: 'Prevenir la explotación de vulnerabilidades técnicas.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Proceso de gestión de vulnerabilidades documentado',
      'Fuentes de información de vulnerabilidades suscritas (CVE, CERT, vendor advisories)',
      'Escaneo de vulnerabilidades ejecutado al menos trimestralmente en sistemas expuestos',
      'Parches críticos aplicados dentro de los plazos definidos según severidad',
      'Registro de vulnerabilidades identificadas y estado de remediación mantenido',
      'Pruebas de penetración realizadas al menos anualmente en sistemas críticos'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.9', domain_id: 'A8', order_num: 9,
    name: 'Gestión de la configuración',
    description: 'Las configuraciones, incluidas las de seguridad, del hardware, software, servicios y redes deben ser establecidas, documentadas, implementadas, monitoreadas y revisadas.',
    purpose: 'Asegurar que el hardware, software, servicios y redes funcionen correctamente con la configuración de seguridad requerida y que la configuración no sea alterada por cambios no autorizados.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Líneas base de configuración segura (hardening) definidas para sistemas críticos',
      'Proceso de gestión de cambios de configuración documentado',
      'Configuraciones base documentadas y almacenadas de forma segura',
      'Derivaciones de las configuraciones base monitoreadas y justificadas',
      'Revisiones periódicas de configuraciones para detectar desviaciones realizadas'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.10', domain_id: 'A8', order_num: 10,
    name: 'Eliminación de información',
    description: 'La información almacenada en sistemas de información, dispositivos o en cualquier otro medio de almacenamiento debe ser eliminada cuando ya no sea requerida.',
    purpose: 'Prevenir la exposición innecesaria de información sensible y cumplir con los requisitos legales, estatutarios, reglamentarios y contractuales para la eliminación de información.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Política de retención y eliminación de información documentada',
      'Proceso de eliminación segura de datos aplicado antes de desechar medios',
      'Eliminación segura de información en servicios cloud al terminar contratos',
      'Confirmación de eliminación obtenida de proveedores cloud cuando aplica',
      'Registro de eliminaciones de información significativas mantenido'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.11', domain_id: 'A8', order_num: 11,
    name: 'Enmascaramiento de datos',
    description: 'El enmascaramiento de datos debe usarse de acuerdo con la política de control de acceso de la organización y otros requisitos de negocio y políticas específicas de tema relacionados, teniendo en cuenta la legislación aplicable.',
    purpose: 'Limitar la exposición de datos sensibles, incluyendo PII, y cumplir con los requisitos legales, estatutarios, reglamentarios y contractuales.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Datos sensibles (PII, tarjetas, contraseñas) enmascarados en logs y reportes',
      'Enmascaramiento o seudonimización aplicado en entornos de prueba y desarrollo',
      'Técnicas de enmascaramiento (truncado, tokenización, cifrado) apropiadas seleccionadas',
      'Acceso a datos sin enmascarar estrictamente controlado y registrado',
      'Cumplimiento con legislación de protección de datos verificado'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.12', domain_id: 'A8', order_num: 12,
    name: 'Prevención de fuga de datos',
    description: 'Las medidas de prevención de fuga de datos deben ser aplicadas a sistemas, redes y cualquier otro dispositivo que procese, almacene o transmita información sensible.',
    purpose: 'Detectar y prevenir la divulgación y extracción no autorizadas de información por personas o sistemas.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Solución DLP o controles equivalentes implementados en sistemas críticos',
      'Monitoreo de transferencias de datos hacia destinos no autorizados configurado',
      'Política de uso de dispositivos removibles y cloud de consumo definida',
      'Personal con acceso a datos sensibles capacitado sobre prevención de fuga de datos',
      'Incidentes de fuga de datos registrados y analizados'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.13', domain_id: 'A8', order_num: 13,
    name: 'Copia de seguridad de la información',
    description: 'Las copias de seguridad de la información, del software y de los sistemas deben ser mantenidas y probadas regularmente de acuerdo con la política acordada de copias de seguridad.',
    purpose: 'Permitir la recuperación de datos y sistemas tras pérdida, daño o compromiso de datos.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Política de copias de seguridad documentada con frecuencia, retención y alcance',
      'Copias de seguridad automatizadas configuradas para sistemas y datos críticos',
      'Copias almacenadas en ubicación separada o fuera del sitio (offsite/cloud)',
      'Restauración de copias de seguridad probada al menos trimestralmente',
      'Alertas de fallo de backup configuradas y monitoreadas',
      'RPO y RTO definidos y verificados con pruebas de restauración'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.14', domain_id: 'A8', order_num: 14,
    name: 'Redundancia de instalaciones de procesamiento de información',
    description: 'Las instalaciones de procesamiento de información deben ser implementadas con suficiente redundancia para satisfacer los requisitos de disponibilidad.',
    purpose: 'Asegurar la operación continua de los sistemas de información para satisfacer los requisitos de disponibilidad.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Análisis de requisitos de disponibilidad para sistemas críticos realizado',
      'Redundancia implementada en componentes críticos (servidores, red, almacenamiento)',
      'Plan de failover documentado y probado',
      'Tiempo de recuperación monitoreado y comparado contra objetivos (RTO)',
      'Infraestructura de nube usada para redundancia geográfica donde aplica'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.15', domain_id: 'A8', order_num: 15,
    name: 'Registro de actividades (Logging)',
    description: 'Los registros que graban actividades, excepciones, fallos y otros eventos relevantes de seguridad deben ser producidos, almacenados, protegidos y analizados.',
    purpose: 'Registrar eventos y generar evidencia de actividades para detectar y controlar acceso no autorizado y apoyar investigaciones de incidentes.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Logging habilitado en sistemas, aplicaciones y dispositivos de red críticos',
      'Eventos de seguridad clave registrados: autenticaciones, cambios de configuración, accesos a datos sensibles',
      'Logs almacenados de forma segura y protegidos contra modificación',
      'Período de retención de logs definido y cumplido (mínimo 90 días online)',
      'Logs revisados periódicamente o alertas automáticas configuradas',
      'Sistema de gestión de logs (SIEM o centralizado) implementado si aplica'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.16', domain_id: 'A8', order_num: 16,
    name: 'Actividades de monitoreo',
    description: 'Las redes, sistemas y aplicaciones deben ser monitoreados en busca de comportamientos anómalos y se deben tomar las acciones apropiadas para evaluar posibles incidentes de seguridad de la información.',
    purpose: 'Detectar comportamientos anómalos y posibles incidentes de seguridad de la información.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Monitoreo continuo de sistemas críticos implementado',
      'Alertas para comportamientos anómalos configuradas (intentos de acceso fallidos, tráfico inusual)',
      'Proceso de revisión y respuesta a alertas definido',
      'Monitoreo de acceso a datos sensibles o privilegiados implementado',
      'Informes periódicos de actividad de seguridad generados y revisados por la dirección'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.17', domain_id: 'A8', order_num: 17,
    name: 'Sincronización de relojes',
    description: 'Los relojes de los sistemas de procesamiento de información usados por la organización deben ser sincronizados con fuentes de tiempo aprobadas.',
    purpose: 'Asegurar la exactitud de los registros de auditoría y apoyar las investigaciones de incidentes con marcas de tiempo confiables.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Todos los sistemas críticos sincronizados con servidor NTP confiable',
      'Fuente NTP autorizada configurada (NTP Pool o servidor interno)',
      'Sincronización de tiempo verificada periódicamente',
      'Diferencias de tiempo superiores al umbral definido alertadas',
      'Registros de auditoría con marcas de tiempo confiables para correlación'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.18', domain_id: 'A8', order_num: 18,
    name: 'Uso de programas de utilidad privilegiados',
    description: 'El uso de programas de utilidad que puedan ser capaces de anular los controles del sistema y de las aplicaciones debe ser restringido y estrictamente controlado.',
    purpose: 'Asegurar que el uso de herramientas de utilidad privilegiadas no comprometa los controles del sistema y de las aplicaciones.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Inventario de herramientas de utilidad privilegiadas (diagnóstico, debug, acceso bajo nivel) mantenido',
      'Uso de herramientas privilegiadas restringido a personal autorizado',
      'Uso de herramientas privilegiadas registrado en logs',
      'Herramientas privilegiadas innecesarias desinstaladas o deshabilitadas',
      'Aprobación requerida para instalar nuevas herramientas privilegiadas'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.19', domain_id: 'A8', order_num: 19,
    name: 'Instalación de software en sistemas operativos en producción',
    description: 'Se deben implementar procedimientos para gestionar de forma segura la instalación de software en sistemas operativos.',
    purpose: 'Asegurar la integridad de los sistemas operativos y prevenir la explotación de vulnerabilidades técnicas.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Política de instalación de software en producción documentada',
      'Proceso de aprobación requerido antes de instalar software en producción',
      'Solo software con licencia y de fuentes verificadas instalado',
      'Usuarios sin privilegios de instalación de software en sistemas corporativos',
      'Lista de software autorizado (whitelist) mantenida y aplicada técnicamente'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.20', domain_id: 'A8', order_num: 20,
    name: 'Seguridad en redes',
    description: 'Las redes y dispositivos de red deben ser protegidos, gestionados y controlados para proteger la información en sistemas y aplicaciones.',
    purpose: 'Proteger la información en las redes y los sistemas de información conectados contra compromisos a través de la red.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Diagrama de red actualizado y documentado',
      'Firewall perimetral configurado y mantenido',
      'Reglas de firewall revisadas periódicamente y reglas innecesarias eliminadas',
      'Tráfico de red monitoreado para detectar anomalías',
      'Redes inalámbricas aseguradas con WPA3 o WPA2-Enterprise como mínimo',
      'Acceso remoto a la red mediante VPN o equivalente seguro'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.21', domain_id: 'A8', order_num: 21,
    name: 'Seguridad de los servicios de red',
    description: 'Los mecanismos de seguridad, los niveles de servicio y los requisitos de servicio de todos los servicios de red deben ser identificados, implementados y monitoreados.',
    purpose: 'Asegurar la protección de los servicios cuando se usan en redes.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Servicios de red críticos identificados y documentados',
      'SLA de seguridad definidos para servicios de red de terceros',
      'Servicios de red monitoreados para disponibilidad y anomalías de seguridad',
      'Acceso a servicios de red restringido a usuarios y sistemas autorizados',
      'Cifrado en tránsito implementado para servicios de red que manejan datos sensibles'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.22', domain_id: 'A8', order_num: 22,
    name: 'Segregación de redes',
    description: 'Los grupos de servicios de información, usuarios y sistemas de información deben ser segregados en las redes de la organización.',
    purpose: 'Limitar el impacto de un compromiso de seguridad al segmentar la red y controlar el tráfico entre segmentos.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Red segmentada en VLANs o segmentos según función y sensibilidad',
      'Red de usuarios separada de la red de servidores',
      'Red de invitados/WiFi visitantes separada de la red corporativa',
      'Tráfico entre segmentos controlado por firewall interno',
      'Sistemas críticos en segmento de red de acceso más restringido'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.23', domain_id: 'A8', order_num: 23,
    name: 'Filtrado web',
    description: 'El acceso a sitios web externos debe ser gestionado para reducir la exposición a contenido malicioso.',
    purpose: 'Proteger los sistemas contra el compromiso causado por malware y prevenir el uso de recursos web no autorizados.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Solución de filtrado web implementada en la red corporativa',
      'Categorías de sitios maliciosos y de riesgo bloqueadas',
      'Lista de sitios bloqueados revisada y actualizada regularmente',
      'Proceso para solicitar excepción de filtrado web definido',
      'Logs de acceso web revisados periódicamente para detectar anomalías'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.24', domain_id: 'A8', order_num: 24,
    name: 'Uso de criptografía',
    description: 'Se deben definir e implementar reglas para el uso efectivo de la criptografía, incluyendo la gestión de claves criptográficas.',
    purpose: 'Asegurar el uso apropiado y efectivo de la criptografía para proteger la confidencialidad, autenticidad e integridad de la información.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Política de uso de criptografía documentada',
      'Cifrado en tránsito implementado para comunicaciones sensibles (TLS 1.2+)',
      'Cifrado en reposo implementado para datos sensibles almacenados',
      'Algoritmos criptográficos aprobados definidos (AES-256, RSA 2048+, SHA-256+)',
      'Proceso de gestión de claves criptográficas (generación, distribución, rotación, revocación) definido',
      'Certificados digitales gestionados con control de vencimiento'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.25', domain_id: 'A8', order_num: 25,
    name: 'Ciclo de vida de desarrollo seguro',
    description: 'Se deben establecer e implementar reglas para el desarrollo seguro de software y sistemas.',
    purpose: 'Asegurar que la seguridad de la información sea diseñada e implementada dentro del ciclo de vida de desarrollo de sistemas de información.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Política de desarrollo seguro documentada',
      'Requisitos de seguridad incluidos en la fase de análisis de nuevos desarrollos',
      'Revisión de seguridad del diseño realizada antes del desarrollo',
      'Análisis de código estático (SAST) integrado en el proceso de desarrollo',
      'Pruebas de seguridad realizadas antes de pasar a producción',
      'Desarrolladores capacitados en prácticas de codificación segura'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.26', domain_id: 'A8', order_num: 26,
    name: 'Requisitos de seguridad de aplicaciones',
    description: 'Los requisitos de seguridad de la información deben ser identificados, especificados y aprobados cuando se desarrollan o adquieren aplicaciones.',
    purpose: 'Asegurar que todos los requisitos de seguridad sean identificados e integrados como parte del proceso de desarrollo o adquisición de aplicaciones.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Requisitos de seguridad especificados para nuevas aplicaciones o cambios significativos',
      'Requisitos de autenticación y autorización definidos para cada aplicación',
      'Validación de entradas y manejo de errores seguro especificado',
      'Requisitos de logging y auditoría especificados por aplicación',
      'Requisitos de seguridad verificados en pruebas de aceptación'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.27', domain_id: 'A8', order_num: 27,
    name: 'Arquitectura de sistema seguro y principios de ingeniería',
    description: 'Los principios para la ingeniería de sistemas seguros deben ser establecidos, documentados, mantenidos y aplicados a cualquier actividad de implementación de sistemas de información.',
    purpose: 'Asegurar que la seguridad de la información sea diseñada e implementada dentro del ciclo de vida de desarrollo de sistemas de información.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Principios de diseño seguro documentados y comunicados al equipo de desarrollo',
      'Principio de defensa en profundidad aplicado en arquitecturas críticas',
      'Principio de mínimo privilegio aplicado en diseño de sistemas',
      'Principio de fallo seguro (fail secure) aplicado en sistemas críticos',
      'Revisión de arquitectura de seguridad realizada para cambios significativos'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.28', domain_id: 'A8', order_num: 28,
    name: 'Codificación segura',
    description: 'Los principios de codificación segura deben ser aplicados al desarrollo de software.',
    purpose: 'Asegurar que el software sea escrito de manera que minimice las vulnerabilidades de seguridad de la información resultantes de prácticas de programación deficientes.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Guía de codificación segura (OWASP, CERT, etc.) adoptada y comunicada',
      'Validación de entradas implementada en todas las interfaces de usuario y APIs',
      'Prevención de inyección SQL y otras inyecciones aplicada',
      'Gestión segura de sesiones y tokens implementada',
      'Revisión de código con enfoque en seguridad (code review) practicada',
      'Análisis de código estático automatizado en el pipeline de CI/CD'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.29', domain_id: 'A8', order_num: 29,
    name: 'Pruebas de seguridad en desarrollo y aceptación',
    description: 'Los procesos de prueba de seguridad deben ser definidos e implementados en el ciclo de vida de desarrollo.',
    purpose: 'Verificar que los requisitos de seguridad de la información se cumplan cuando se despliega nuevo software o se modifican aplicaciones existentes.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Pruebas de seguridad integradas en el proceso de desarrollo',
      'Pruebas de vulnerabilidades realizadas antes de pases a producción',
      'Pruebas de regresión de seguridad automatizadas donde aplica',
      'Defectos de seguridad clasificados por severidad y remedidos según SLA definido',
      'Registro de pruebas de seguridad y resultados mantenido'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.30', domain_id: 'A8', order_num: 30,
    name: 'Desarrollo externalizado',
    description: 'La organización debe dirigir, monitorear y revisar las actividades relacionadas con el desarrollo externalizado de sistemas.',
    purpose: 'Asegurar que los requisitos de seguridad de la información sean cumplidos cuando el desarrollo de software es subcontratado.',
    data_source: 'documentos',
    checklist: JSON.stringify([
      'Requisitos de seguridad incluidos en contratos de desarrollo externalizado',
      'Derecho de auditoría de seguridad del código fuente incluido en contratos',
      'Proceso de revisión de seguridad del código entregado por terceros definido',
      'Propiedad intelectual del código claramente establecida en contratos',
      'Proveedores de desarrollo evaluados con respecto a prácticas de seguridad'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.31', domain_id: 'A8', order_num: 31,
    name: 'Separación de entornos de desarrollo, prueba y producción',
    description: 'Los entornos de desarrollo, prueba y producción deben estar separados y asegurados.',
    purpose: 'Proteger el entorno de producción y los datos contra acceso no autorizado o cambios accidentales causados por actividades de desarrollo y prueba.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Entornos de desarrollo, prueba y producción claramente separados',
      'Acceso al entorno de producción restringido y controlado',
      'Datos de producción no usados en entornos de desarrollo o prueba sin anonimizar',
      'Proceso de pase a producción (change management) formal implementado',
      'Cambios en producción solo realizados tras aprobación formal'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.32', domain_id: 'A8', order_num: 32,
    name: 'Gestión de cambios',
    description: 'Los cambios en instalaciones de procesamiento de información y sistemas de información deben estar sujetos a procedimientos de gestión de cambios.',
    purpose: 'Preservar la seguridad de la información y la disponibilidad del sistema durante la realización de cambios.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Proceso formal de gestión de cambios documentado',
      'Evaluación de impacto de seguridad incluida en el proceso de cambios',
      'Aprobación formal requerida antes de implementar cambios en producción',
      'Plan de rollback definido para todos los cambios significativos',
      'Registro de todos los cambios en producción mantenido',
      'Cambios de emergencia con proceso acelerado pero igualmente registrados'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.33', domain_id: 'A8', order_num: 33,
    name: 'Información de prueba',
    description: 'La información de prueba debe ser seleccionada, protegida y gestionada apropiadamente.',
    purpose: 'Asegurar la protección de datos de producción usados para pruebas.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Política sobre uso de datos de producción en entornos de prueba documentada',
      'Datos de producción sensibles anonimizados o seudonimizados antes de usar en pruebas',
      'Datos de prueba generados sintéticamente preferidos sobre datos de producción reales',
      'Acceso a entornos de prueba controlado aunque sean menos restrictivos que producción',
      'Datos de prueba eliminados al finalizar las pruebas'
    ]),
    policy_template: null
  },
  {
    id: 'A.8.34', domain_id: 'A8', order_num: 34,
    name: 'Protección de sistemas de información durante pruebas de auditoría',
    description: 'Las pruebas de auditoría y otras actividades de aseguramiento que involucren evaluación de sistemas operativos deben ser planificadas y acordadas entre el evaluador y la dirección apropiada.',
    purpose: 'Minimizar el impacto de las actividades de auditoría en los sistemas operativos y los procesos del negocio.',
    data_source: 'activos',
    checklist: JSON.stringify([
      'Proceso de planificación y aprobación de auditorías y pruebas de penetración establecido',
      'Alcance y actividades de prueba acordados previamente con la organización',
      'Pruebas intrusivas realizadas en ventanas de mantenimiento o fuera de horas pico',
      'Acceso de auditores a sistemas productivos controlado y monitoreado',
      'Herramientas de auditoría verificadas y aprobadas antes de uso en producción'
    ]),
    policy_template: null
  },
]

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

async function seedIso() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_dstac_core',
  })

  console.log('Cargando datos ISO 27001:2022 en db_dstac_core...\n')

  // ── Dominios ──────────────────────────────────────────────────────────────
  console.log('Insertando dominios...')
  for (const d of DOMAINS) {
    await conn.execute(
      `INSERT IGNORE INTO iso_domains (id, name, description, color, order_num, total_controls)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.id, d.name, d.description, d.color, d.order_num, d.total_controls]
    )
  }
  console.log(`  ✓ ${DOMAINS.length} dominios`)

  // ── Controles ─────────────────────────────────────────────────────────────
  const ALL_CONTROLS = [...A5_CONTROLS, ...A6_CONTROLS, ...A7_CONTROLS, ...A8_CONTROLS]
  console.log(`\nInsertando controles (${ALL_CONTROLS.length} en total)...`)

  for (const c of ALL_CONTROLS) {
    await conn.execute(
      `INSERT IGNORE INTO iso_controls
         (id, domain_id, name, description, purpose, data_source, checklist, policy_template, order_num)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.domain_id,
        c.name,
        c.description,
        c.purpose ?? null,
        c.data_source ?? null,
        c.checklist ?? null,
        c.policy_template ?? null,
        c.order_num,
      ]
    )
  }

  const a5Count = A5_CONTROLS.length
  const a6Count = A6_CONTROLS.length
  const a7Count = A7_CONTROLS.length
  const a8Count = A8_CONTROLS.length
  console.log(`  ✓ A5: ${a5Count} controles organizacionales`)
  console.log(`  ✓ A6: ${a6Count} controles de personas`)
  console.log(`  ✓ A7: ${a7Count} controles físicos`)
  console.log(`  ✓ A8: ${a8Count} controles tecnológicos`)
  console.log(`  ✓ Total: ${ALL_CONTROLS.length} controles`)

  // ── Verificación ──────────────────────────────────────────────────────────
  const [rows] = await conn.execute('SELECT COUNT(*) AS total FROM iso_controls')
  const [domainRows] = await conn.execute('SELECT COUNT(*) AS total FROM iso_domains')
  console.log(`\nVerificación:`)
  console.log(`  iso_domains:  ${domainRows[0].total} filas`)
  console.log(`  iso_controls: ${rows[0].total} filas`)

  if (rows[0].total !== 93) {
    console.warn(`\n  ADVERTENCIA: Se esperaban 93 controles, hay ${rows[0].total}`)
  } else {
    console.log(`\n  ✓ 93 controles ISO 27001:2022 Anexo A cargados correctamente`)
  }

  await conn.end()
  console.log('\nSeed ISO 27001:2022 completado.')
}

seedIso().catch(err => {
  console.error('Error en seed ISO:', err.message)
  process.exit(1)
})
