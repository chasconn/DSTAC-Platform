// Contenido de las 23 políticas ISO 27001:2022 que requieren documento.
// Cada entrada: { titulo, objetivo, directrices[] }. Las secciones estándar
// (Alcance, Roles, Cumplimiento, Control de versiones) las arma el renderer
// con tokens que la plataforma auto-rellena: {{EMPRESA}}, {{RESPONSABLE}},
// {{CARGO}}, {{FECHA}}, {{VERSION}}, {{APROBADOR}}.
module.exports = {
  'A.5.1': {
    titulo: 'Política de Seguridad de la Información',
    objetivo: 'Establecer el compromiso y los principios de {{EMPRESA}} para proteger la confidencialidad, integridad y disponibilidad de su información.',
    directrices: [
      'La dirección de {{EMPRESA}} aprueba, respalda y comunica esta política a todo el personal.',
      'La información se protege conforme a su clasificación y a los requisitos legales y contractuales aplicables.',
      'Se gestionan los riesgos de seguridad de la información de forma sistemática y documentada.',
      'Todo el personal y terceros deben cumplir esta política y las políticas específicas derivadas.',
      'Los incumplimientos se gestionan mediante el proceso disciplinario definido.',
      'Esta política se revisa al menos una vez al año o ante cambios significativos.',
    ],
  },
  'A.6.2': {
    titulo: 'Política de Términos y Condiciones de Empleo (Seguridad)',
    objetivo: 'Definir las responsabilidades de seguridad de la información que asume el personal de {{EMPRESA}} como parte de su relación laboral.',
    directrices: [
      'Los contratos laborales incluyen cláusulas de seguridad de la información y confidencialidad.',
      'El personal acepta cumplir las políticas de seguridad antes de acceder a la información.',
      'Se informan las consecuencias del incumplimiento de las obligaciones de seguridad.',
      'Las responsabilidades de seguridad relevantes perduran tras el término del empleo.',
    ],
  },
  'A.6.3': {
    titulo: 'Política de Concienciación, Educación y Formación en Seguridad',
    objetivo: 'Asegurar que el personal de {{EMPRESA}} reciba formación adecuada en seguridad de la información acorde a su rol.',
    directrices: [
      'Todo el personal recibe inducción de seguridad al incorporarse.',
      'Se ejecuta un programa de concienciación periódico (al menos anual).',
      'La formación cubre amenazas vigentes: phishing, contraseñas, manejo de datos y reporte de incidentes.',
      'Se mantiene registro de asistencia y, cuando aplica, evaluación de la formación.',
    ],
  },
  'A.8.5': {
    titulo: 'Política de Autenticación Segura',
    objetivo: 'Definir los mecanismos de autenticación que protegen el acceso a los sistemas e información de {{EMPRESA}}.',
    directrices: [
      'El acceso a sistemas requiere identificación única y autenticación.',
      'Se exige autenticación multifactor (MFA) en accesos remotos, privilegiados y a servicios críticos.',
      'Las contraseñas cumplen requisitos mínimos de longitud y complejidad y no se comparten.',
      'Las sesiones se bloquean tras inactividad y se cierran al finalizar.',
      'Las credenciales se almacenan y transmiten cifradas.',
    ],
  },
  'A.6.6': {
    titulo: 'Política / Acuerdo de Confidencialidad',
    objetivo: 'Proteger la información confidencial de {{EMPRESA}} mediante acuerdos de confidencialidad con personal y terceros.',
    directrices: [
      'El personal y terceros con acceso a información confidencial firman un acuerdo de confidencialidad (NDA).',
      'El acuerdo define el alcance de la información protegida y su duración.',
      'La obligación de confidencialidad se mantiene tras el término de la relación.',
      'El incumplimiento puede derivar en acciones disciplinarias y legales.',
    ],
  },
  'A.8.7': {
    titulo: 'Política de Protección contra Malware',
    objetivo: 'Proteger los sistemas de {{EMPRESA}} frente a software malicioso.',
    directrices: [
      'Todos los equipos cuentan con protección antimalware/EDR activa y actualizada.',
      'Se prohíbe deshabilitar las protecciones de seguridad de los equipos.',
      'Se restringe la instalación de software no autorizado.',
      'Se analizan los archivos y medios externos antes de su uso.',
      'Los eventos de malware se reportan y gestionan como incidentes.',
    ],
  },
  'A.7.7': {
    titulo: 'Política de Escritorio Despejado y Pantalla Despejada',
    objetivo: 'Reducir el riesgo de acceso no autorizado a la información en puestos de trabajo de {{EMPRESA}}.',
    directrices: [
      'La información sensible no se deja visible en escritorios ni impresoras.',
      'Las sesiones se bloquean al ausentarse del puesto de trabajo.',
      'Los documentos confidenciales se guardan bajo llave fuera del horario.',
      'Los medios extraíbles se resguardan cuando no están en uso.',
    ],
  },
  'A.6.7': {
    titulo: 'Política de Trabajo Remoto',
    objetivo: 'Proteger la información de {{EMPRESA}} cuando se accede desde ubicaciones fuera de las instalaciones.',
    directrices: [
      'El acceso remoto se realiza mediante canales cifrados (VPN) y MFA.',
      'Los equipos de trabajo remoto cuentan con cifrado de disco y antimalware.',
      'Se prohíbe el uso de redes públicas no seguras sin protección adicional.',
      'La información confidencial no se almacena en dispositivos personales no autorizados.',
    ],
  },
  'A.8.9': {
    titulo: 'Política de Gestión de la Configuración',
    objetivo: 'Asegurar que los sistemas de {{EMPRESA}} se configuren y mantengan de forma segura.',
    directrices: [
      'Se definen líneas base de configuración segura (hardening) por tipo de sistema.',
      'Las desviaciones respecto a la línea base se documentan y aprueban.',
      'Se revisan periódicamente las configuraciones para detectar cambios no autorizados.',
      'Se eliminan servicios, cuentas y puertos innecesarios.',
    ],
  },
  'A.7.10': {
    titulo: 'Política de Gestión de Medios de Almacenamiento',
    objetivo: 'Proteger la información de {{EMPRESA}} almacenada en medios físicos y extraíbles.',
    directrices: [
      'El uso de medios extraíbles se autoriza y se cifra la información sensible.',
      'Los medios se transportan de forma segura y se registran sus movimientos.',
      'Los medios se eliminan de forma segura al final de su vida útil.',
      'Se controla el acceso físico a los medios de almacenamiento.',
    ],
  },
  'A.5.10': {
    titulo: 'Política de Uso Aceptable de la Información y los Activos',
    objetivo: 'Definir el uso aceptable de la información y los activos de {{EMPRESA}}.',
    directrices: [
      'Los activos se usan únicamente para fines autorizados relacionados con el trabajo.',
      'Se prohíbe instalar software no autorizado o eludir controles de seguridad.',
      'El correo e internet corporativos se usan de forma responsable.',
      'El usuario es responsable de la información y los activos a su cargo.',
    ],
  },
  'A.5.12': {
    titulo: 'Política de Clasificación de la Información',
    objetivo: 'Clasificar la información de {{EMPRESA}} según su sensibilidad para aplicar la protección adecuada.',
    directrices: [
      'La información se clasifica en niveles: Público, Interno y Confidencial.',
      'El propietario de la información determina su clasificación.',
      'Cada nivel define reglas de acceso, almacenamiento, transferencia y eliminación.',
      'La clasificación se revisa cuando cambia el valor o la sensibilidad de la información.',
    ],
  },
  'A.8.13': {
    titulo: 'Política de Copia de Seguridad de la Información',
    objetivo: 'Garantizar la disponibilidad y recuperación de la información de {{EMPRESA}} ante pérdida o incidente.',
    directrices: [
      'Se realizan copias de seguridad periódicas de la información y los sistemas críticos.',
      'Se define la frecuencia, el alcance y el período de retención de los respaldos.',
      'Las copias se almacenan de forma segura, idealmente en ubicación separada y cifrada.',
      'Se prueban periódicamente las restauraciones para validar su efectividad.',
    ],
  },
  'A.5.14': {
    titulo: 'Política de Transferencia de Información',
    objetivo: 'Proteger la información de {{EMPRESA}} durante su transferencia interna y externa.',
    directrices: [
      'La información confidencial se transfiere por canales seguros y cifrados.',
      'Las transferencias a terceros se rigen por acuerdos formales.',
      'Se verifican los destinatarios antes de enviar información sensible.',
      'Se prohíbe el uso de servicios no autorizados para transferir información corporativa.',
    ],
  },
  'A.5.15': {
    titulo: 'Política de Control de Acceso',
    objetivo: 'Regular el acceso a la información y los sistemas de {{EMPRESA}} según las necesidades del negocio y la seguridad.',
    directrices: [
      'El acceso se otorga según los principios de necesidad de conocer y mínimo privilegio.',
      'Toda solicitud de acceso es aprobada por el responsable correspondiente.',
      'Los accesos se revisan periódicamente y se revocan al cese o cambio de funciones.',
      'Los accesos privilegiados se restringen, registran y revisan.',
      'Cada usuario tiene una identidad única e intransferible.',
    ],
  },
  'A.5.17': {
    titulo: 'Política de Información de Autenticación',
    objetivo: 'Gestionar de forma segura las credenciales de autenticación en {{EMPRESA}}.',
    directrices: [
      'Las credenciales se asignan de forma individual y segura.',
      'Las contraseñas cumplen requisitos de complejidad y se cambian ante sospecha de compromiso.',
      'Se prohíbe compartir o anotar credenciales en lugares visibles.',
      'Las credenciales se almacenan cifradas y nunca en texto plano.',
    ],
  },
  'A.5.19': {
    titulo: 'Política de Seguridad en Relaciones con Proveedores',
    objetivo: 'Gestionar los riesgos de seguridad de la información asociados a los proveedores de {{EMPRESA}}.',
    directrices: [
      'Se evalúa el riesgo de seguridad de los proveedores antes de contratarlos.',
      'Los acuerdos incluyen requisitos de seguridad y confidencialidad.',
      'Se monitorea el cumplimiento de seguridad de los proveedores durante la relación.',
      'Se gestiona de forma segura el término de la relación con el proveedor.',
    ],
  },
  'A.8.20': {
    titulo: 'Política de Seguridad en Redes',
    objetivo: 'Proteger las redes y la información en tránsito de {{EMPRESA}}.',
    directrices: [
      'Las redes se segmentan según su criticidad y se controlan los flujos entre segmentos.',
      'Se utilizan firewalls y controles perimetrales debidamente configurados.',
      'Los accesos remotos a la red se realizan mediante canales cifrados.',
      'Se monitorea el tráfico de red para detectar actividad anómala.',
    ],
  },
  'A.8.24': {
    titulo: 'Política de Uso de Criptografía',
    objetivo: 'Asegurar el uso correcto y efectivo de la criptografía para proteger la información de {{EMPRESA}}.',
    directrices: [
      'La información confidencial se cifra en reposo y en tránsito.',
      'Se utilizan algoritmos y longitudes de clave reconocidos y vigentes.',
      'Las claves criptográficas se gestionan de forma segura durante todo su ciclo de vida.',
      'Se prohíbe el uso de mecanismos criptográficos obsoletos o no autorizados.',
    ],
  },
  'A.5.29': {
    titulo: 'Política de Seguridad de la Información durante la Disrupción',
    objetivo: 'Mantener un nivel adecuado de seguridad de la información durante interrupciones en {{EMPRESA}}.',
    directrices: [
      'Se identifican los procesos y activos críticos para la continuidad.',
      'Se definen controles de seguridad a mantener durante una disrupción.',
      'Se establecen roles y responsabilidades para la respuesta y recuperación.',
      'Los planes de continuidad se prueban y actualizan periódicamente.',
    ],
  },
  'A.5.31': {
    titulo: 'Política de Cumplimiento de Requisitos Legales y Contractuales',
    objetivo: 'Asegurar que {{EMPRESA}} cumpla los requisitos legales, regulatorios y contractuales aplicables.',
    directrices: [
      'Se mantiene un registro actualizado de requisitos legales y contractuales aplicables.',
      'Se asignan responsables del cumplimiento de cada requisito.',
      'Se verifica periódicamente el cumplimiento y se gestionan las desviaciones.',
      'Se protege la propiedad intelectual y los registros conforme a la ley.',
    ],
  },
  'A.5.33': {
    titulo: 'Política de Protección de Registros',
    objetivo: 'Proteger los registros de {{EMPRESA}} contra pérdida, destrucción, falsificación y acceso no autorizado.',
    directrices: [
      'Se identifican los registros y sus períodos de retención.',
      'Los registros se protegen según su clasificación y requisitos legales.',
      'Se controla el acceso a los registros y se preserva su integridad.',
      'La eliminación de registros se realiza de forma segura al cumplir su retención.',
    ],
  },
  'A.5.34': {
    titulo: 'Política de Privacidad y Protección de Datos Personales',
    objetivo: 'Proteger los datos personales tratados por {{EMPRESA}} conforme a la normativa de privacidad aplicable.',
    directrices: [
      'El tratamiento de datos personales se realiza con base legal y para fines legítimos.',
      'Se aplican medidas de seguridad proporcionales al riesgo de los datos.',
      'Se respetan los derechos de los titulares de datos personales.',
      'Se mantiene un registro de las actividades de tratamiento de datos.',
      'Las brechas de datos personales se gestionan y notifican según corresponda.',
    ],
  },
}
