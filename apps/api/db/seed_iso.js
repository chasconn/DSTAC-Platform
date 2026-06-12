// Seed ISO 27001:2022 — dominios y controles (Anexo A)
// Seguro correr más de una vez (INSERT IGNORE)
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const mysql = require('mysql2/promise')

async function seedIso() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: 'db_dstac_core'
  })

  console.log('Seeding ISO 27001:2022...')

  // ── DOMINIOS ───────────────────────────────────────────────────────────────
  const domains = [
    ['A.5', 'Controles Organizacionales', '#2563EB', 1, 37, 'Controles relacionados con la gestión organizacional de la seguridad de la información.'],
    ['A.6', 'Controles de Personas',      '#059669', 2,  8, 'Controles relacionados con el personal y la gestión de recursos humanos.'],
    ['A.7', 'Controles Físicos',          '#D97706', 3, 14, 'Controles relacionados con la seguridad física y del entorno.'],
    ['A.8', 'Controles Tecnológicos',     '#7C3AED', 4, 34, 'Controles relacionados con la tecnología y los sistemas de información.'],
  ]
  for (const [id, name, color, order_num, total_controls, description] of domains) {
    await conn.execute(
      `INSERT IGNORE INTO iso_domains (id, name, description, color, order_num, total_controls) VALUES (?,?,?,?,?,?)`,
      [id, name, description, color, order_num, total_controls]
    )
  }
  console.log('  ✓ iso_domains (4)')

  // ── CONTROLES ──────────────────────────────────────────────────────────────
  const controls = [
    // A.5 — Controles Organizacionales (37)
    ['A.5.1',  'A.5', 1,  'Políticas de Seguridad de la Información',           'Las políticas de seguridad de la información deben ser definidas, aprobadas por la dirección, publicadas y comunicadas al personal.'],
    ['A.5.2',  'A.5', 2,  'Roles y Responsabilidades de Seguridad de la Información','Los roles y responsabilidades de seguridad de la información deben ser definidos y asignados.'],
    ['A.5.3',  'A.5', 3,  'Segregación de Funciones',                            'Los conflictos de interés deben ser evitados mediante la segregación de funciones incompatibles.'],
    ['A.5.4',  'A.5', 4,  'Responsabilidades de la Dirección',                   'La dirección debe requerir que todo el personal aplique la seguridad de la información de acuerdo con las políticas.'],
    ['A.5.5',  'A.5', 5,  'Relación con Autoridades',                            'La organización debe establecer y mantener relación con las autoridades relevantes.'],
    ['A.5.6',  'A.5', 6,  'Relación con Grupos de Interés Especial',             'La organización debe establecer y mantener contacto con grupos de interés especial en seguridad.'],
    ['A.5.7',  'A.5', 7,  'Inteligencia de Amenazas',                            'La información relacionada con amenazas a la seguridad debe ser recopilada y analizada.'],
    ['A.5.8',  'A.5', 8,  'Seguridad de la Información en Gestión de Proyectos', 'La seguridad de la información debe integrarse en la gestión de proyectos.'],
    ['A.5.9',  'A.5', 9,  'Inventario de Información y Otros Activos',           'Se debe elaborar y mantener un inventario de la información y de otros activos asociados.'],
    ['A.5.10', 'A.5',10,  'Uso Aceptable de la Información y Otros Activos',     'Las reglas para el uso aceptable de la información y de los activos deben ser identificadas y documentadas.'],
    ['A.5.11', 'A.5',11,  'Devolución de Activos',                               'El personal debe devolver todos los activos de la organización al finalizar su relación laboral.'],
    ['A.5.12', 'A.5',12,  'Clasificación de la Información',                     'La información debe ser clasificada de acuerdo con sus requisitos de seguridad.'],
    ['A.5.13', 'A.5',13,  'Etiquetado de la Información',                        'Se debe desarrollar e implementar un procedimiento de etiquetado de la información.'],
    ['A.5.14', 'A.5',14,  'Transferencia de Información',                        'Las reglas para la transferencia de información deben estar implementadas.'],
    ['A.5.15', 'A.5',15,  'Control de Acceso',                                   'Las reglas para controlar el acceso físico y lógico a la información deben ser establecidas.'],
    ['A.5.16', 'A.5',16,  'Gestión de Identidades',                              'El ciclo de vida completo de las identidades debe ser gestionado.'],
    ['A.5.17', 'A.5',17,  'Información de Autenticación',                        'La asignación y gestión de la información de autenticación debe estar controlada.'],
    ['A.5.18', 'A.5',18,  'Derechos de Acceso',                                  'Los derechos de acceso deben ser provisionados, revisados, modificados y eliminados.'],
    ['A.5.19', 'A.5',19,  'Seguridad de la Información en Relaciones con Proveedores','Los requisitos de seguridad deben ser acordados con los proveedores.'],
    ['A.5.20', 'A.5',20,  'Seguridad en Contratos con Proveedores',              'Los requisitos de seguridad relevantes deben establecerse y acordarse con cada proveedor.'],
    ['A.5.21', 'A.5',21,  'Seguridad en la Cadena de Suministro TIC',            'Los procesos y procedimientos para gestionar la seguridad TIC de la cadena de suministro deben ser definidos.'],
    ['A.5.22', 'A.5',22,  'Monitoreo, Revisión y Gestión de Cambios en Servicios de Proveedores','La organización debe monitorear, revisar y gestionar los cambios en las prácticas de seguridad de los proveedores.'],
    ['A.5.23', 'A.5',23,  'Seguridad de la Información en el Uso de Servicios Cloud','Los procesos para adquirir, usar y gestionar servicios cloud deben establecerse.'],
    ['A.5.24', 'A.5',24,  'Planificación y Preparación para la Gestión de Incidentes','La organización debe planificar y prepararse para gestionar los incidentes de seguridad.'],
    ['A.5.25', 'A.5',25,  'Evaluación y Decisión sobre Eventos de Seguridad',    'Los eventos de seguridad deben ser evaluados y decidirse si serán clasificados como incidentes.'],
    ['A.5.26', 'A.5',26,  'Respuesta a Incidentes de Seguridad',                 'Los incidentes de seguridad deben ser respondidos de acuerdo con los procedimientos documentados.'],
    ['A.5.27', 'A.5',27,  'Aprendizaje de los Incidentes de Seguridad',          'El conocimiento obtenido de los incidentes de seguridad debe ser utilizado para mejorar.'],
    ['A.5.28', 'A.5',28,  'Recopilación de Evidencias',                          'La organización debe establecer procedimientos para recopilar, adquirir y preservar evidencias.'],
    ['A.5.29', 'A.5',29,  'Seguridad de la Información durante la Disrupción',   'La organización debe planificar cómo mantener la seguridad durante la disrupción.'],
    ['A.5.30', 'A.5',30,  'Preparación TIC para la Continuidad del Negocio',     'La preparación TIC para la continuidad de negocio debe ser planificada e implementada.'],
    ['A.5.31', 'A.5',31,  'Requisitos Legales, Estatutarios, Regulatorios y Contractuales','Los requisitos legales relevantes deben ser identificados y documentados.'],
    ['A.5.32', 'A.5',32,  'Derechos de Propiedad Intelectual',                   'La organización debe implementar procedimientos para proteger los derechos de propiedad intelectual.'],
    ['A.5.33', 'A.5',33,  'Protección de Registros',                             'Los registros deben ser protegidos de pérdida, destrucción, falsificación, acceso y divulgación no autorizados.'],
    ['A.5.34', 'A.5',34,  'Privacidad y Protección de Datos Personales',         'La organización debe identificar y cumplir los requisitos relacionados con la privacidad y protección de datos.'],
    ['A.5.35', 'A.5',35,  'Revisión Independiente de la Seguridad de la Información','El enfoque de la organización para gestionar la seguridad debe revisarse independientemente.'],
    ['A.5.36', 'A.5',36,  'Cumplimiento de Políticas, Reglas y Estándares',      'El cumplimiento de las políticas, reglas y estándares de seguridad debe ser revisado regularmente.'],
    ['A.5.37', 'A.5',37,  'Procedimientos de Operación Documentados',            'Los procedimientos de operación de las instalaciones de procesamiento deben ser documentados.'],
    // A.6 — Controles de Personas (8)
    ['A.6.1', 'A.6', 1,  'Investigación de Antecedentes',                        'La verificación de antecedentes de todos los candidatos debe realizarse antes de la incorporación.'],
    ['A.6.2', 'A.6', 2,  'Términos y Condiciones de Empleo',                     'Los contratos de empleo deben indicar las responsabilidades del empleado y de la organización respecto a la seguridad.'],
    ['A.6.3', 'A.6', 3,  'Concienciación, Educación y Formación en Seguridad',   'El personal debe recibir formación y concienciación en seguridad de la información.'],
    ['A.6.4', 'A.6', 4,  'Proceso Disciplinario',                                'Debe existir un proceso disciplinario formalizado para el personal que cometa infracciones de seguridad.'],
    ['A.6.5', 'A.6', 5,  'Responsabilidades tras la Finalización o Cambio de Empleo','Las responsabilidades de seguridad deben mantenerse tras la finalización o cambio de empleo.'],
    ['A.6.6', 'A.6', 6,  'Acuerdos de Confidencialidad o No Divulgación',        'Los acuerdos de confidencialidad deben identificarse, documentarse y revisarse regularmente.'],
    ['A.6.7', 'A.6', 7,  'Trabajo en Remoto',                                    'Las medidas de seguridad deben implementarse para proteger la información cuando se trabaja en remoto.'],
    ['A.6.8', 'A.6', 8,  'Notificación de Eventos de Seguridad',                 'La organización debe proporcionar un mecanismo para que el personal notifique eventos de seguridad.'],
    // A.7 — Controles Físicos (14)
    ['A.7.1',  'A.7', 1,  'Perímetros de Seguridad Física',                      'Los perímetros de seguridad física deben ser definidos y usados para proteger áreas que contienen información.'],
    ['A.7.2',  'A.7', 2,  'Entrada Física',                                      'Las áreas seguras deben estar protegidas por controles de entrada apropiados.'],
    ['A.7.3',  'A.7', 3,  'Seguridad de Oficinas, Salas e Instalaciones',        'La seguridad física de las oficinas, salas e instalaciones debe ser diseñada e implementada.'],
    ['A.7.4',  'A.7', 4,  'Monitoreo de la Seguridad Física',                    'Las instalaciones deben ser monitoreadas continuamente para detectar accesos físicos no autorizados.'],
    ['A.7.5',  'A.7', 5,  'Protección contra Amenazas Físicas y Ambientales',    'La protección contra amenazas físicas y ambientales debe ser diseñada e implementada.'],
    ['A.7.6',  'A.7', 6,  'Trabajo en Áreas Seguras',                            'Las medidas de seguridad para trabajar en áreas seguras deben ser diseñadas e implementadas.'],
    ['A.7.7',  'A.7', 7,  'Escritorio Despejado y Pantalla Despejada',           'Deben definirse y aplicarse reglas de escritorio despejado para documentos y medios extraíbles.'],
    ['A.7.8',  'A.7', 8,  'Ubicación y Protección de Equipos',                   'Los equipos deben ser ubicados y protegidos de forma segura.'],
    ['A.7.9',  'A.7', 9,  'Seguridad de Activos Fuera de las Instalaciones',     'Los activos fuera de las instalaciones deben ser protegidos.'],
    ['A.7.10', 'A.7',10,  'Medios de Almacenamiento',                            'Los medios de almacenamiento deben ser gestionados durante su ciclo de vida de adquisición a disposición.'],
    ['A.7.11', 'A.7',11,  'Servicios de Apoyo',                                  'Las instalaciones de procesamiento de información deben estar protegidas contra fallos de energía.'],
    ['A.7.12', 'A.7',12,  'Seguridad del Cableado',                              'Los cables de energía y telecomunicaciones que transportan datos deben estar protegidos.'],
    ['A.7.13', 'A.7',13,  'Mantenimiento de Equipos',                            'Los equipos deben ser mantenidos correctamente para asegurar la disponibilidad e integridad.'],
    ['A.7.14', 'A.7',14,  'Eliminación o Reutilización Segura de Equipos',       'Los equipos que contienen medios de almacenamiento deben ser verificados para garantizar que los datos se han eliminado.'],
    // A.8 — Controles Tecnológicos (34)
    ['A.8.1',  'A.8', 1,  'Dispositivos de Punto Final del Usuario',             'La información almacenada en, procesada o accedida a través de dispositivos de usuario final debe estar protegida.'],
    ['A.8.2',  'A.8', 2,  'Derechos de Acceso Privilegiado',                     'La asignación y uso de los derechos de acceso privilegiado debe estar restringida y gestionada.'],
    ['A.8.3',  'A.8', 3,  'Restricción de Acceso a la Información',              'El acceso a la información y a las funciones del sistema debe estar restringido conforme a la política de control de acceso.'],
    ['A.8.4',  'A.8', 4,  'Acceso al Código Fuente',                             'El acceso de lectura y escritura al código fuente, herramientas de desarrollo y librerías de software debe estar restringido.'],
    ['A.8.5',  'A.8', 5,  'Autenticación Segura',                                'Se deben implementar tecnologías y procedimientos de autenticación segura en función del riesgo.'],
    ['A.8.6',  'A.8', 6,  'Gestión de la Capacidad',                             'El uso de los recursos debe ser monitoreado y ajustado para cumplir con los requisitos de capacidad futuros.'],
    ['A.8.7',  'A.8', 7,  'Protección contra Malware',                           'La protección contra malware debe ser implementada y apoyada por la concienciación del usuario.'],
    ['A.8.8',  'A.8', 8,  'Gestión de Vulnerabilidades Técnicas',                'La información sobre vulnerabilidades técnicas debe ser obtenida de forma oportuna y las exposiciones mitigadas.'],
    ['A.8.9',  'A.8', 9,  'Gestión de la Configuración',                         'Las configuraciones del hardware, software, servicios y redes deben ser establecidas, documentadas y monitoreadas.'],
    ['A.8.10', 'A.8',10,  'Eliminación de Información',                          'La información almacenada en sistemas, dispositivos o medios debe ser eliminada cuando ya no sea necesaria.'],
    ['A.8.11', 'A.8',11,  'Enmascaramiento de Datos',                            'El enmascaramiento de datos debe usarse de acuerdo a la política de control de acceso.'],
    ['A.8.12', 'A.8',12,  'Prevención de Fuga de Datos',                         'Se deben aplicar medidas de prevención de fuga de datos en los sistemas, redes y dispositivos.'],
    ['A.8.13', 'A.8',13,  'Copia de Seguridad de la Información',                'Las copias de seguridad de la información, software e imágenes de sistemas deben ser realizadas y probadas periódicamente.'],
    ['A.8.14', 'A.8',14,  'Redundancia de las Instalaciones de Procesamiento',   'Las instalaciones de procesamiento de información deben implementarse con suficiente redundancia.'],
    ['A.8.15', 'A.8',15,  'Registro de Actividad',                               'Los registros que recogen actividades de los usuarios, excepciones, fallos y eventos de seguridad deben ser producidos.'],
    ['A.8.16', 'A.8',16,  'Actividades de Monitoreo',                            'Las redes, sistemas y aplicaciones deben ser monitoreados para detectar comportamientos anómalos.'],
    ['A.8.17', 'A.8',17,  'Sincronización de Relojes',                           'Los relojes de los sistemas de procesamiento de información de la organización deben estar sincronizados.'],
    ['A.8.18', 'A.8',18,  'Uso de Programas de Utilidad Privilegiados',          'El uso de programas de utilidad que puedan afectar a los controles del sistema debe estar restringido.'],
    ['A.8.19', 'A.8',19,  'Instalación de Software en Sistemas Operativos',      'Los procedimientos y medidas deben ser implementados para gestionar de forma segura la instalación de software.'],
    ['A.8.20', 'A.8',20,  'Seguridad en Redes',                                  'Las redes y los dispositivos de red deben ser asegurados, gestionados y controlados para proteger la información.'],
    ['A.8.21', 'A.8',21,  'Seguridad de los Servicios de Red',                   'Los mecanismos de seguridad y las características de los servicios de red deben ser identificados e incorporados.'],
    ['A.8.22', 'A.8',22,  'Separación de Redes',                                 'Los grupos de servicios, usuarios y sistemas de información deben ser separados en las redes de la organización.'],
    ['A.8.23', 'A.8',23,  'Filtrado Web',                                        'El acceso a sitios web externos debe ser gestionado para reducir la exposición a contenido malicioso.'],
    ['A.8.24', 'A.8',24,  'Uso de Criptografía',                                 'Las reglas para el uso efectivo de la criptografía deben ser definidas e implementadas.'],
    ['A.8.25', 'A.8',25,  'Ciclo de Vida del Desarrollo Seguro',                 'Se deben establecer e implementar reglas para el desarrollo seguro de software y sistemas.'],
    ['A.8.26', 'A.8',26,  'Requisitos de Seguridad de las Aplicaciones',         'Los requisitos de seguridad de la información deben ser identificados al desarrollar o adquirir aplicaciones.'],
    ['A.8.27', 'A.8',27,  'Principios de Ingeniería y Arquitectura de Sistemas Seguros','Los principios para diseñar sistemas seguros deben ser establecidos, documentados y aplicados.'],
    ['A.8.28', 'A.8',28,  'Codificación Segura',                                 'Los principios de codificación segura deben ser aplicados al desarrollo de software.'],
    ['A.8.29', 'A.8',29,  'Pruebas de Seguridad en Desarrollo y Aceptación',     'Los procesos de pruebas de seguridad deben ser definidos e implementados en el ciclo de vida de desarrollo.'],
    ['A.8.30', 'A.8',30,  'Desarrollo Externalizado',                            'La organización debe dirigir, monitorear y revisar las actividades de desarrollo de software externalizado.'],
    ['A.8.31', 'A.8',31,  'Separación de los Entornos de Desarrollo, Prueba y Producción','Los entornos de desarrollo, prueba y producción deben ser separados y asegurados.'],
    ['A.8.32', 'A.8',32,  'Gestión del Cambio',                                  'Los cambios en las instalaciones de procesamiento de información y sistemas deben estar sujetos a procedimientos de gestión del cambio.'],
    ['A.8.33', 'A.8',33,  'Información de Prueba',                               'La información de prueba debe ser seleccionada, protegida y gestionada apropiadamente.'],
    ['A.8.34', 'A.8',34,  'Protección de los Sistemas de Información durante las Pruebas de Auditoría','Las pruebas de auditoría y otras actividades de aseguramiento que implican evaluaciones de sistemas operativos deben ser planificadas y acordadas.'],
  ]
  for (const [id, domain_id, order_num, name, description] of controls) {
    await conn.execute(
      `INSERT IGNORE INTO iso_controls (id, domain_id, name, description, order_num) VALUES (?,?,?,?,?)`,
      [id, domain_id, name, description, order_num]
    )
  }
  console.log(`  ✓ iso_controls (${controls.length})`)

  await conn.end()
  console.log('\nSeed ISO 27001:2022 completado.')
}

seedIso().catch(err => { console.error('Error:', err.message); process.exit(1) })
