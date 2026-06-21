// Carga el catálogo de pasos de Onboarding (plan PYME). Pensado para que
// alguien sin experiencia previa en ciberseguridad pueda seguirlo solo,
// paso a paso, sin supervisión. Seguro de re-correr: si ya existen pasos,
// no duplica (los reemplaza por título).
const centralDB = require('./central')

const PASOS = [
  // ── FASE 0 ──────────────────────────────────────────────────────────────
  {
    fase: 'Antes de empezar',
    titulo: 'Reunir los datos del cliente y verificar el correo',
    explicacion_simple:
      'Antes de tocar la plataforma, junta toda la información del cliente nuevo en una sola llamada o videollamada, y revisa el correo dos veces — un correo mal escrito es la causa más común de "no puedo entrar".',
    instrucciones:
`¿Por qué importa este paso? Si te equivocas en el correo del cliente, esa persona no podrá entrar nunca a la
plataforma y vas a perder tiempo después tratando de averiguar "por qué no funciona" cuando en realidad el
problema es que el correo nunca quedó bien escrito.

Qué pedirle al cliente (anótalo en algún lado, un bloc de notas sirve):
1. Razón social exacta de la empresa (el nombre legal completo) y su RUT.
2. Nombre completo de la persona de contacto principal — esta persona va a ser quien administre la cuenta.
3. El CORREO de esa persona. Regla de oro: pídele que TE LO ESCRIBA ÉL MISMO por WhatsApp o correo, nunca lo
   escribas tú de memoria ni lo copies de una tarjeta de presentación a mano. Si te lo dicta por teléfono,
   repíteselo letra por letra ("f, flores, arroba, g, y, v, arriendos, punto, c, l — ¿correcto?").
4. Teléfono de contacto directo (para coordinar después).
5. Cuántas personas trabajan en la empresa, aproximadamente (para saber el tamaño del trabajo de carga de datos).
6. Si ya tienen una lista de sus equipos/computadores (aunque sea un Excel desordenado) o si hay que armarla
   desde cero contigo.
7. Si ya tienen algún documento de políticas de seguridad de antes (para no partir de cero si ya existe algo).

Con esto ya tienes lo necesario para crear la empresa en la plataforma (siguiente paso).`,
    modulo_link: null,
    modulo_label: null,
    opcional: 0,
  },

  // ── FASE 1 ──────────────────────────────────────────────────────────────
  {
    fase: 'Crear la empresa',
    titulo: 'Crear la empresa en la plataforma',
    explicacion_simple:
      'Cada cliente de DSTAC tiene su propio espacio separado dentro de la plataforma (como una "casilla" propia donde solo se guarda su información). Este paso crea esa casilla.',
    instrucciones:
`Qué es esto: la plataforma DSTAC es "multi-cliente" — cada empresa que atendemos tiene su propia base de datos
separada, para que la información de un cliente nunca se mezcle con la de otro. Crear "la empresa" en la
plataforma es literalmente crear esa casilla nueva y vacía, lista para llenarla.

Pasos exactos:
1. Entra a portal.dstac.cl con tu usuario y clave de DSTAC (no la del cliente, la tuya).
2. En el menú de la izquierda, haz clic en "Clientes".
3. Arriba a la derecha, haz clic en el botón "+ Nueva empresa".
4. Completa el formulario:
   - Nombre: la razón social que te dio el cliente.
   - RUT: el RUT de la empresa.
   - Plan: elige "PYME" (es el plan más básico; incluye hasta 5 usuarios).
   - Datos de contacto: nombre, correo y teléfono del contacto principal.
5. Haz clic en "Guardar" o "Crear".
6. Espera unos segundos — la plataforma está creando por detrás la base de datos exclusiva de esta empresa.
   No cierres la pantalla mientras carga.
7. Verifica que la empresa aparezca en la lista de Clientes con el estado "Activo" (un punto verde).

Si la empresa NO aparece o queda en otro estado, no sigas al siguiente paso — revisa el error o pide ayuda.`,
    modulo_link: '/admin/clientes',
    modulo_label: 'Ir a Clientes',
    opcional: 0,
  },

  // ── FASE 2 ──────────────────────────────────────────────────────────────
  {
    fase: 'Dar acceso al cliente',
    titulo: 'Crear el usuario del cliente',
    explicacion_simple:
      'Hasta ahora solo tú puedes ver la empresa dentro de la plataforma. Este paso crea la cuenta con la que el cliente va a entrar por su cuenta.',
    instrucciones:
`Qué es un "usuario": es la cuenta (correo + clave) con la que una persona específica entra a la plataforma.
La "empresa" es la casilla general; el "usuario" es la llave de una persona puntual para entrar a esa casilla.

Pasos exactos:
1. Arriba a la izquierda del panel, asegúrate de tener seleccionada la empresa que acabas de crear (selector de
   "empresa activa"). Si seleccionas la empresa equivocada, el usuario quedará creado para el cliente incorrecto.
2. En el menú de la izquierda, haz clic en "Usuarios".
3. Haz clic en "+ Nuevo usuario".
4. Correo: pega exactamente el correo que verificaste en el Paso 0 (Ctrl+V, no lo vuelvas a tipear).
5. Rol: elige "cliente_admin" si esta persona va a administrar la cuenta de su empresa (lo normal para el
   primer contacto), o "cliente_lectura" si esta persona solo va a poder ver información sin modificar nada.
6. Define una contraseña temporal (algo simple de dictar por teléfono, ej. una palabra + números).
7. Guarda.

Después de crear el usuario, sigue inmediatamente al siguiente paso — no dejes la cuenta creada sin probar.`,
    modulo_link: '/admin/usuarios',
    modulo_label: 'Ir a Usuarios',
    opcional: 0,
  },
  {
    fase: 'Dar acceso al cliente',
    titulo: 'Probar el login en vivo con el cliente',
    explicacion_simple:
      'Antes de cortar la llamada con el cliente, pídele que intente entrar a la plataforma ÉL MISMO, ahí en el momento. Si algo está mal, lo arreglas de inmediato en vez de descubrirlo días después.',
    instrucciones:
`Por qué este paso existe: la situación que más se repite es crear la cuenta, despedirte del cliente, y que
horas o días después te escriba diciendo "no puedo entrar" — y ahí toca investigar a ciegas qué pasó. Si lo
prueban juntos en el momento, el problema (si existe) se ve y se arregla al instante.

Pasos exactos:
1. Sin cortar la llamada o videollamada, pídele al cliente que abra portal.dstac.cl en su navegador (computador
   o celular).
2. Que ingrese el correo y la contraseña temporal que le compartiste.
3. Confirma que pueda entrar y que vea su Dashboard (el panel principal de su empresa).
4. Si la plataforma le pide cambiar la contraseña al primer ingreso, que lo haga ahí mismo y anote la nueva
   clave en un lugar seguro.
5. Si algo falla ("credenciales inválidas"), lo más probable es: (a) el correo no quedó exactamente igual al
   que se usó para crear el usuario (revisa mayúsculas, espacios, dominio), o (b) la empresa quedó "Suspendida"
   por error. Corrígelo en el momento, con el cliente todavía en la línea.

Solo una vez que el cliente entró exitosamente, márcalo como completado y sigue.`,
    modulo_link: '/admin/usuarios',
    modulo_label: 'Ir a Usuarios',
    opcional: 0,
  },

  // ── FASE 3 ──────────────────────────────────────────────────────────────
  {
    fase: 'Cargar los datos base',
    titulo: 'Cargar el Personal de la empresa',
    explicacion_simple:
      '"Personal" es la lista de las personas que trabajan en la empresa del cliente. Esta lista es la base para casi todo lo demás (identidades, accesos, simulaciones de phishing).',
    instrucciones:
`Qué es esto: necesitamos saber quién trabaja en la empresa del cliente — nombre, cargo, correo — porque varios
módulos de la plataforma (Identidades, Accesos, Phishing) se construyen sobre esta lista.

Dos formas de cargarlo:

FORMA RÁPIDA (recomendada si son más de 5-6 personas):
1. Ve al módulo "Personal" (con la empresa del cliente seleccionada como activa).
2. Busca el botón de "Plantilla" y descárgala — es un archivo Excel con las columnas correctas ya preparadas.
3. Pídele al cliente que llene esa plantilla (o llénala tú con la información que te pasó) — nombre, cargo,
   correo, etc.
4. Vuelve al módulo Personal y usa el botón "Importar", selecciona el archivo Excel lleno.
5. La plataforma te va a mostrar una vista previa antes de confirmar — revisa que los datos se vean bien y
   confirma la importación.

FORMA MANUAL (si son pocas personas, 1 a 5):
1. Ve al módulo "Personal".
2. Haz clic en "+ Nuevo" y completa los datos de cada persona, una por una.

Tip: si el cliente no tiene la lista lista todavía, carga al menos a la persona de contacto principal y sigue
avanzando — puedes volver a completar esta lista en cualquier momento, no es necesario tener el 100% hoy.`,
    modulo_link: '/admin/personal',
    modulo_label: 'Ir a Personal',
    opcional: 0,
  },
  {
    fase: 'Cargar los datos base',
    titulo: 'Cargar los Activos (equipos, servidores, etc.)',
    explicacion_simple:
      'Un "activo" es cualquier equipo o sistema que la empresa usa y que hay que proteger: computadores, notebooks, servidores, routers. Este módulo guarda el inventario de todo eso.',
    instrucciones:
`Qué es un "activo" en ciberseguridad: cualquier cosa de valor que la empresa necesita proteger — en este caso,
hablamos de equipos tecnológicos: notebooks, computadores de escritorio, servidores, routers/módems, impresoras
en red, etc. Saber qué activos existen es el primer paso para saber qué hay que proteger y de qué.

Pasos (mismo patrón que Personal):
1. Ve al módulo "Activos".
2. Descarga la "Plantilla" Excel si son varios equipos, o usa "+ Nuevo" si son pocos.
3. Para cada activo anota al menos: nombre/identificador, tipo (notebook, servidor, etc.), y si es posible,
   quién es el responsable de ese equipo dentro de la empresa.
4. Si usas la plantilla, vuelve al módulo y usa "Importar" para subir el archivo lleno.

Tip: empieza por los equipos más importantes (servidores, el computador donde se maneja la contabilidad, etc.)
y completa el resto del inventario en las semanas siguientes si el cliente no tiene todo ordenado todavía.`,
    modulo_link: '/admin/activos',
    modulo_label: 'Ir a Activos',
    opcional: 0,
  },
  {
    fase: 'Cargar los datos base',
    titulo: 'Cargar las Identidades',
    explicacion_simple:
      'Una "identidad" es una cuenta digital de una persona — por ejemplo, su correo corporativo o su usuario de algún sistema. Este módulo registra esas cuentas para saber si están activas, comprometidas o vencidas.',
    instrucciones:
`Qué es una "identidad" en ciberseguridad: no es la persona en sí, es su CUENTA digital — el correo corporativo,
el usuario de un sistema interno, etc. Una misma persona puede tener varias identidades (su correo, su usuario
del sistema contable, etc.). El motivo de registrarlas es simple: si una cuenta queda "comprometida" (alguien
más obtuvo la clave) o "vencida" (un ex-empleado que nunca le quitaron el acceso), hay que poder detectarlo.

Pasos:
1. Ve al módulo "Identidades".
2. Igual que en los pasos anteriores: plantilla Excel + Importar (si son varias), o "+ Nuevo" (si son pocas).
3. Para cada identidad: a qué persona del Personal pertenece, cuál es la cuenta/correo, y su estado actual
   (activa, etc.).

Esto suele ir de la mano con el Personal que ya cargaste — cada persona normalmente tiene al menos una
identidad (su correo corporativo).`,
    modulo_link: '/admin/identidades',
    modulo_label: 'Ir a Identidades',
    opcional: 0,
  },
  {
    fase: 'Cargar los datos base',
    titulo: 'Cargar los Accesos',
    explicacion_simple:
      'Un "acceso" conecta una identidad (una cuenta) con un activo (un sistema o equipo) — es decir, registra QUIÉN puede entrar a QUÉ. Esto ayuda a detectar accesos que ya no deberían existir.',
    instrucciones:
`Qué es un "acceso": la relación entre una identidad y un activo — por ejemplo, "Juan (identidad) tiene acceso
al servidor de contabilidad (activo), con nivel de acceso Administrador". Registrar esto permite, más adelante,
detectar cosas como "esta persona ya no trabaja aquí pero su acceso sigue activo" — un riesgo de seguridad real
y común.

Pasos:
1. Ve al módulo "Accesos".
2. Por cada combinación relevante de identidad + activo, registra: quién tiene acceso, a qué, y qué tan crítico
   es ese acceso (por ejemplo, acceso de administrador a un servidor es mucho más crítico que acceso de lectura
   a una carpeta compartida).
3. No necesitas registrar absolutamente todo el primer día — prioriza los accesos a los sistemas más críticos
   (financieros, datos de clientes, infraestructura).`,
    modulo_link: '/admin/accesos',
    modulo_label: 'Ir a Accesos',
    opcional: 0,
  },

  // ── FASE 4 ──────────────────────────────────────────────────────────────
  {
    fase: 'Evaluaciones iniciales',
    titulo: 'Hacer el Diagnóstico de madurez',
    explicacion_simple:
      'Es un cuestionario corto que mide qué tan preparada está la empresa frente a riesgos de ciberseguridad hoy. El resultado es un puntaje y sirve como punto de partida para todo lo demás.',
    instrucciones:
`Qué es esto: un cuestionario de preguntas simples (sí/parcial/no) sobre prácticas básicas de seguridad de la
empresa (¿tienen respaldos de información? ¿usan antivirus? ¿el personal está capacitado?, etc.). No necesitas
saber de ciberseguridad para hacerlo — solo lee cada pregunta al cliente y anota su respuesta honesta.

Pasos:
1. Ve al módulo "Diagnóstico".
2. Idealmente, hazlo en una llamada con el cliente, leyendo cada pregunta en voz alta y registrando su
   respuesta — así evitas adivinar.
3. Al terminar, haz clic en "Guardar evaluación".
4. La plataforma te muestra automáticamente un puntaje de madurez y, según las respuestas, sugiere qué
   servicios podrían convenirle al cliente (esto es información útil para ofrecerle más adelante, sin presionar).
5. Genera el informe del diagnóstico (hay un botón de informe en el módulo) — este es un buen primer documento
   para entregarle al cliente, porque le muestra valor concreto desde el primer día.`,
    modulo_link: '/admin/diagnostico',
    modulo_label: 'Ir a Diagnóstico',
    opcional: 0,
  },
  {
    fase: 'Evaluaciones iniciales',
    titulo: 'Evaluación NIST CSF',
    explicacion_simple:
      'NIST CSF es un marco internacional (hecho por el gobierno de EE.UU., pero usado en todo el mundo) que organiza la ciberseguridad en 5 funciones simples: Identificar, Proteger, Detectar, Responder y Recuperar. Este módulo evalúa a la empresa en cada una.',
    instrucciones:
`Qué es "NIST CSF": son las siglas de "National Institute of Standards and Technology - Cybersecurity
Framework". No te preocupes por el nombre — en la práctica es simplemente una forma ordenada de mirar la
seguridad de una empresa en 5 preguntas grandes:
  1. IDENTIFICAR: ¿sabemos qué activos e información tenemos que proteger?
  2. PROTEGER: ¿tenemos medidas para evitar que algo malo pase (antivirus, respaldos, capacitación)?
  3. DETECTAR: ¿nos daríamos cuenta si algo malo está pasando ahora mismo?
  4. RESPONDER: ¿sabemos qué hacer si pasa un incidente?
  5. RECUPERAR: ¿podemos volver a funcionar normal después de un incidente?

Disponible para todos los planes, incluido PYME.

Pasos:
1. Ve al módulo "NIST CSF".
2. Completa la evaluación por cada una de las 5 funciones — son preguntas o controles específicos dentro de
   cada una.
3. Guarda. Vas a obtener un puntaje por función, que sirve para mostrarle al cliente en qué áreas está mejor o
   peor parado.

No es obligatorio hacerlo el primer día — puedes agendarlo para la primera o segunda semana de trabajo con el
cliente.`,
    modulo_link: '/admin/nist',
    modulo_label: 'Ir a NIST CSF',
    opcional: 0,
  },
  {
    fase: 'Evaluaciones iniciales',
    titulo: 'Evaluación ISO 27001 (si el cliente busca certificarse)',
    explicacion_simple:
      'ISO 27001 es la norma internacional más conocida para certificar formalmente la seguridad de la información de una empresa. Este paso solo aplica si el cliente quiere ir hacia ese tipo de certificación formal — no es obligatorio para todos.',
    instrucciones:
`Qué es "ISO 27001": es una norma (un estándar escrito) que define qué controles de seguridad debe tener una
empresa para considerarse "segura" de forma certificable por un organismo externo. Es más exigente y formal que
el Diagnóstico o el NIST CSF — normalmente solo lo piden empresas grandes, o PYMEs que necesitan esa
certificación para trabajar con ciertos clientes (bancos, gobierno, etc.).

¿Cuándo usar este paso? Solo si el cliente específicamente menciona que necesita o quiere una certificación
ISO 27001 (por ejemplo, porque un cliente suyo se lo exige). Si no es el caso, puedes saltarte este paso por
ahora y marcarlo como "no aplica".

Pasos (si aplica):
1. Ve al módulo "ISO 27001".
2. Completa la autoevaluación por dominio (la plataforma la organiza por secciones de la norma).
3. Esto genera una "Declaración de Aplicabilidad" (SoA) — un documento que lista qué controles aplican y en
   qué estado están, que es parte de lo que pide la certificación formal.`,
    modulo_link: '/admin/iso',
    modulo_label: 'Ir a ISO 27001',
    opcional: 1,
  },

  // ── FASE 5 ──────────────────────────────────────────────────────────────
  {
    fase: 'Cumplimiento legal',
    titulo: 'Evaluación Ley N° 21.663 (Ley Marco de Ciberseguridad)',
    explicacion_simple:
      'Es una ley chilena que exige a ciertas empresas tener prácticas mínimas de ciberseguridad y reportar incidentes graves al Estado. Este módulo evalúa si el cliente cumple con lo que la ley pide.',
    instrucciones:
`Qué es la Ley 21.663: una ley chilena (2024) que crea obligaciones de ciberseguridad para empresas — sobre
todo para las que son "esenciales" para el país (bancos, telecomunicaciones, etc.), pero sus principios básicos
(tener un responsable de seguridad, saber qué hacer ante un incidente) son una buena práctica para cualquier
empresa, incluidas las PYME.

Pasos:
1. Ve al módulo "Ley 21.663".
2. Completa el cuestionario de autoevaluación (preguntas sí/parcial/no, igual que el Diagnóstico).
3. Guarda — vas a obtener un puntaje y un "nivel" (Bajo, Medio o Alto).
4. Si quieres, descarga la "Política de Ciberseguridad" (un documento Word ya redactado) para entregarle al
   cliente como referencia formal — útil incluso si no llegó a nivel Alto.`,
    modulo_link: '/admin/ley21663',
    modulo_label: 'Ir a Ley 21.663',
    opcional: 0,
  },
  {
    fase: 'Cumplimiento legal',
    titulo: 'Evaluación Ley N° 21.719 (Protección de Datos Personales)',
    explicacion_simple:
      'Es la ley chilena de protección de datos personales — aplica a casi cualquier empresa, porque casi todas manejan datos de personas (clientes, empleados). Este módulo evalúa si el cliente cumple con lo que la ley pide.',
    instrucciones:
`Qué es la Ley 21.719: regula cómo las empresas deben tratar los datos personales de las personas (nombre, RUT,
correo, etc. de clientes y empleados) — exige cosas como informar para qué se usan esos datos, permitir que las
personas pidan corregirlos o eliminarlos, y avisar si hay una filtración. Aplica prácticamente a cualquier
empresa, porque cualquiera que tenga una lista de clientes o de empleados está "tratando datos personales".

Pasos: exactamente el mismo patrón que la Ley 21.663.
1. Ve al módulo "Ley 21.719".
2. Completa el cuestionario.
3. Guarda — obtienes puntaje y nivel.
4. Descarga la "Política de Protección de Datos" generada para el cliente.`,
    modulo_link: '/admin/ley21719',
    modulo_label: 'Ir a Ley 21.719',
    opcional: 0,
  },
  {
    fase: 'Cumplimiento legal',
    titulo: 'Emitir certificados de cumplimiento (si el nivel es Alto)',
    explicacion_simple:
      'Si la evaluación de alguna de las dos leyes dio nivel "Alto", la plataforma puede generar un certificado oficial que el cliente puede mostrar a terceros como prueba de que cumple.',
    instrucciones:
`Cuándo aplica: SOLO si la evaluación de Ley 21.663 o Ley 21.719 dio nivel "Alto" (puntaje 80% o más). Si dio
Medio o Bajo, no se puede emitir el certificado todavía — primero hay que cerrar las brechas detectadas (la
plataforma las lista).

Pasos:
1. Dentro del módulo de la ley correspondiente, después de guardar una evaluación con nivel Alto, vas a ver el
   botón "👁 Vista previa" — úsalo primero para revisar que todo se vea bien (nombre de la empresa correcto,
   etc.) antes de comprometerte a nada.
2. Si todo se ve bien, haz clic en "🏅 Emitir certificado". Esto genera un código único que queda guardado para
   siempre (no tiene vencimiento).
3. El cliente va a poder ver y descargar ese certificado desde su propio portal, en la sección "Certificados".
4. El certificado incluye un código QR que cualquiera puede escanear para verificar que es auténtico.`,
    modulo_link: null,
    modulo_label: null,
    opcional: 1,
  },

  // ── FASE 6 (opcional) ────────────────────────────────────────────────────
  {
    fase: 'Servicios técnicos opcionales',
    titulo: 'EDR — protección de endpoints (si fue contratado)',
    explicacion_simple:
      'EDR es un programa que se instala en cada computador para detectar y bloquear actividad sospechosa en tiempo real (como un antivirus, pero más avanzado). Solo aplica si el cliente contrató este servicio.',
    instrucciones:
`Qué es "EDR": viene de "Endpoint Detection and Response" — un "endpoint" es cualquier computador o servidor
individual, y EDR es un software que se instala en cada uno de esos equipos para vigilar lo que pasa ahí y
avisar (o bloquear automáticamente) si detecta algo peligroso. Es más completo que un antivirus tradicional.

¿Cuándo usar este paso? Solo si el cliente contrató específicamente el servicio de EDR — revisa la cotización o
contrato antes de prometer esto. No es parte del plan PYME base.

Pasos (si fue contratado):
1. Ve al módulo "EDR".
2. Vas a necesitar instalar un pequeño programa ("agente") en cada computador/servidor del cliente que se
   quiera proteger — coordina una ventana de tiempo con el cliente para hacerlo (puede ser remoto).
3. Una vez instalados los agentes, el módulo EDR te va a mostrar alertas de seguridad en tiempo real desde esos
   equipos.`,
    modulo_link: '/admin/edr',
    modulo_label: 'Ir a EDR',
    opcional: 1,
  },
  {
    fase: 'Servicios técnicos opcionales',
    titulo: 'MDM Móviles — gestión de celulares Android (si fue contratado)',
    explicacion_simple:
      'MDM permite gestionar de forma remota los celulares corporativos del cliente: bloquearlos, borrarlos a distancia si se pierden, o exigir un código de seguridad. Solo aplica si el cliente lo contrató.',
    instrucciones:
`Qué es "MDM": "Mobile Device Management" — gestión de dispositivos móviles. Permite, por ejemplo, borrar de
forma remota un celular corporativo que se perdió o fue robado, antes de que alguien acceda a la información
que tenía dentro. Por ahora solo funciona con celulares Android (no iPhone).

¿Cuándo usar este paso? Solo si el cliente contrató este servicio.

Pasos (si fue contratado):
1. Ve al módulo "MDM Móviles".
2. El cliente necesita aceptar la inscripción de cada celular que quiera que se gestione — esto genera un
   código QR o link que la persona dueña del celular debe escanear/abrir desde su propio teléfono.
3. Una vez inscrito, desde este módulo vas a poder enviar comandos al celular (bloquear, restablecer clave,
   reiniciar, borrar) si es necesario.`,
    modulo_link: '/admin/mdm',
    modulo_label: 'Ir a MDM Móviles',
    opcional: 1,
  },
  {
    fase: 'Servicios técnicos opcionales',
    titulo: 'Simulación de Phishing (si fue contratado)',
    explicacion_simple:
      '"Phishing" son los correos falsos que intentan engañar a alguien para que entregue su clave o haga clic en algo peligroso. Este módulo envía correos falsos pero seguros (de prueba) al personal del cliente, para entrenarlos a reconocerlos.',
    instrucciones:
`Qué es "phishing": es un tipo de engaño donde alguien recibe un correo que parece legítimo (de un banco, de un
proveedor, del jefe) pero en realidad busca robar información o instalar algo malicioso. Es una de las formas
más comunes en que las empresas son atacadas — por eso entrenar al personal a reconocerlo es valioso.

Qué hace este módulo: envía correos de prueba (inofensivos, controlados por nosotros) al personal del cliente
que simulan ser intentos de phishing reales, y mide quién hace clic, quién lo reporta como sospechoso, etc.
Es una herramienta de entrenamiento, no un ataque real.

¿Cuándo usar este paso? Solo si el cliente contrató este servicio de concientización.

Pasos (si fue contratado):
1. Ve al módulo "Phishing".
2. Crea una campaña: elige una plantilla de correo (hay varias, de distinta dificultad) y selecciona a quién
   del Personal se le va a enviar.
3. Envía la campaña y espera — el módulo te muestra después quién hizo clic, quién lo reportó, y un ranking
   por área si quieres profundizar.`,
    modulo_link: '/admin/phishing',
    modulo_label: 'Ir a Phishing',
    opcional: 1,
  },

  // ── FASE 7 ──────────────────────────────────────────────────────────────
  {
    fase: 'Entrega y seguimiento',
    titulo: 'Generar y revisar el Reporte Ejecutivo',
    explicacion_simple:
      'Es un documento resumen con todo lo evaluado hasta ahora — el primer entregable "oficial" que le mandas al cliente para mostrarle resultados concretos.',
    instrucciones:
`Qué es esto: un PDF que junta en pocas páginas el puntaje general, los hallazgos principales y las
recomendaciones — pensado para que el cliente (que probablemente no es técnico) entienda de un vistazo cómo
está su empresa en ciberseguridad.

Pasos:
1. Ve al "Dashboard" de la empresa del cliente (con la empresa seleccionada como activa).
2. Busca el botón de informe "Reporte Ejecutivo" y haz clic.
3. SIEMPRE revísalo tú mismo primero en la vista previa antes de enviarlo — verifica que los datos se vean
   correctos y que no haya nada incompleto o raro.
4. Si todo se ve bien, descárgalo (botón "Guardar PDF" dentro de la vista previa) y envíaselo al cliente por
   correo, junto con un mensaje breve explicando qué encontraron y cuáles son los próximos pasos.`,
    modulo_link: '/admin/dashboard',
    modulo_label: 'Ir al Dashboard',
    opcional: 0,
  },
  {
    fase: 'Entrega y seguimiento',
    titulo: 'Capacitar al cliente en el uso del portal',
    explicacion_simple:
      'Una llamada corta (15-20 minutos) mostrándole al cliente dónde ve cada cosa en su propio portal, para que se sienta cómodo usándolo sin tener que preguntarte todo.',
    instrucciones:
`Pasos sugeridos para esta llamada (comparte tu pantalla o la del cliente):
1. Que entre a portal.dstac.cl con su usuario.
2. Muéstrale su "Dashboard" — el resumen general de su empresa.
3. Muéstrale "Reportes" — ahí puede descargar él mismo los informes que le vayas generando.
4. Muéstrale "Documentos" y "Certificados" — ahí va a ver las políticas y certificados que emitas para su
   empresa.
5. Cuéntale que puede "instalar" el portal en su celular como si fuera una app normal, abriendo
   portal.dstac.cl desde el navegador del teléfono y usando la opción "Agregar a pantalla de inicio" (iPhone)
   o "Instalar app" (Android).`,
    modulo_link: null,
    modulo_label: null,
    opcional: 0,
  },
  {
    fase: 'Entrega y seguimiento',
    titulo: 'Registrar tareas de seguimiento en Pendientes',
    explicacion_simple:
      'Anota en el módulo de Pendientes todo lo que quedó abierto (datos por completar, evaluaciones por hacer) para no perderlo de vista, y agenda con el cliente una próxima revisión.',
    instrucciones:
`Pasos:
1. Ve al módulo "Pendientes" (con la empresa del cliente seleccionada).
2. Crea una tarea por cada cosa que quedó incompleta — por ejemplo "Completar inventario de Activos",
   "Agendar evaluación ISO 27001 si el cliente la pide", etc.
3. Si detectaste brechas durante el Diagnóstico o las evaluaciones de las leyes, puedes generar una Cotización
   (borrador) directamente desde ese mismo módulo, para ofrecerle al cliente los servicios que corrigen esas
   brechas — sin presionar, simplemente dejando la propuesta lista.
4. Agenda con el cliente una próxima revisión (por ejemplo, en 30 días) para ver cómo va avanzando.

Con esto termina el proceso de onboarding de este cliente. ¡Bien hecho!`,
    modulo_link: '/admin/pendientes',
    modulo_label: 'Ir a Pendientes',
    opcional: 0,
  },
]

async function main() {
  await centralDB.query('DELETE FROM onboarding_pasos')
  let orden = 1
  for (const p of PASOS) {
    await centralDB.execute(
      `INSERT INTO onboarding_pasos (orden, fase, titulo, explicacion_simple, instrucciones, modulo_link, modulo_label, opcional)
       VALUES (?,?,?,?,?,?,?,?)`,
      [orden++, p.fase, p.titulo, p.explicacion_simple, p.instrucciones, p.modulo_link, p.modulo_label, p.opcional ? 1 : 0]
    )
  }
  console.log(`✓ ${PASOS.length} pasos de onboarding cargados`)
}
main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
