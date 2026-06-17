// seed_iso_guidance.js — puebla la guía de cada control del Anexo A 2022 en el
// catálogo (iso_controls.purpose = objetivo, iso_controls.policy_template =
// documento/evidencia a preparar) y agrega la columna `responsable` al
// assessment. Idempotente. Correr en el contenedor api:
//   node apps/api/db/seed_iso_guidance.js
const centralDB = require('./central')

// p = objetivo (qué pide ISO) · d = documento/evidencia a preparar y qué debe contener
const GUIA = {
  // ── A.5 Organizacional ──────────────────────────────────────────────
  'A.5.1':  { p: 'Definir una política de seguridad de la información aprobada por la dirección y comunicada al personal.', d: 'Documento: Política de Seguridad de la Información. Debe contener: alcance, objetivos, compromiso de la dirección, roles, principios y referencias a políticas específicas, versión y fecha. Evidencia: política firmada por la dirección + registro de difusión.' },
  'A.5.2':  { p: 'Definir y asignar las responsabilidades de seguridad de la información.', d: 'Documento: Matriz de roles y responsabilidades (RACI). Debe contener: cargo, responsabilidades de SI asignadas, a quién reporta, fecha de asignación y aprobación de la dirección. Evidencia: organigrama + acta de asignación firmada.' },
  'A.5.3':  { p: 'Segregar funciones y áreas de responsabilidad en conflicto para reducir fraude/error.', d: 'Documento: Matriz de segregación de funciones. Debe contener: funciones incompatibles identificadas y controles compensatorios cuando no es posible separarlas. Evidencia: matriz + revisión de accesos.' },
  'A.5.4':  { p: 'La dirección exige a todo el personal aplicar la SI conforme a las políticas.', d: 'Documento: definición de responsabilidades de la dirección / acta de compromiso. Debe contener: expectativas de cumplimiento, recursos asignados y canales de comunicación. Evidencia: actas de revisión por la dirección.' },
  'A.5.5':  { p: 'Mantener contacto con las autoridades pertinentes.', d: 'Documento: registro de contactos con autoridades (PDI, CSIRT, reguladores). Debe contener: entidad, contacto, cuándo y cómo contactar. Evidencia: lista de contactos + registros de comunicación.' },
  'A.5.6':  { p: 'Mantener contacto con grupos de interés especial en seguridad.', d: 'Documento: registro de membresías y foros de seguridad. Debe contener: grupo, propósito y contacto. Evidencia: suscripciones/membresías vigentes.' },
  'A.5.7':  { p: 'Recopilar y analizar información sobre amenazas (inteligencia de amenazas).', d: 'Documento: procedimiento de inteligencia de amenazas. Debe contener: fuentes, frecuencia, análisis y cómo se integra a los controles. Evidencia: informes de amenazas + acciones derivadas.' },
  'A.5.8':  { p: 'Integrar la seguridad de la información en la gestión de proyectos.', d: 'Documento: lineamiento de SI en proyectos. Debe contener: requisitos de SI por fase y evaluación de riesgos del proyecto. Evidencia: checklist de SI aplicado en proyectos.' },
  'A.5.9':  { p: 'Inventariar la información y los activos asociados, con sus propietarios.', d: 'Documento: inventario de activos. Debe contener: activo, tipo, propietario, ubicación, clasificación y criticidad. Evidencia: inventario actualizado.' },
  'A.5.10': { p: 'Definir reglas de uso aceptable de la información y los activos.', d: 'Documento: Política de Uso Aceptable. Debe contener: usos permitidos y prohibidos, responsabilidades del usuario. Evidencia: política aceptada/firmada por usuarios.' },
  'A.5.11': { p: 'Asegurar la devolución de activos al terminar el empleo o contrato.', d: 'Documento: procedimiento de devolución de activos. Debe contener: lista de activos a devolver y checklist de baja. Evidencia: actas de devolución.' },
  'A.5.12': { p: 'Clasificar la información según su sensibilidad y criticidad.', d: 'Documento: esquema/política de clasificación. Debe contener: niveles (público/interno/confidencial), criterios y manejo por nivel. Evidencia: información clasificada.' },
  'A.5.13': { p: 'Etiquetar la información conforme al esquema de clasificación.', d: 'Documento: procedimiento de etiquetado. Debe contener: cómo etiquetar (digital y físico) por nivel. Evidencia: ejemplos de etiquetado aplicado.' },
  'A.5.14': { p: 'Proteger la información en sus transferencias internas y externas.', d: 'Documento: política/acuerdos de transferencia de información. Debe contener: medios permitidos, cifrado y acuerdos con terceros. Evidencia: acuerdos + controles aplicados.' },
  'A.5.15': { p: 'Establecer reglas de control de acceso según negocio y seguridad.', d: 'Documento: Política de Control de Acceso. Debe contener: principios (need-to-know, mínimo privilegio), roles y procesos de alta/baja. Evidencia: política + matriz de accesos.' },
  'A.5.16': { p: 'Gestionar el ciclo de vida completo de las identidades.', d: 'Documento: procedimiento de gestión de identidades. Debe contener: alta/baja, identidades únicas y revisión. Evidencia: registro de identidades.' },
  'A.5.17': { p: 'Gestionar la asignación y el uso de la información de autenticación.', d: 'Documento: procedimiento de gestión de credenciales. Debe contener: emisión, complejidad, MFA y resguardo. Evidencia: política de contraseñas + MFA configurado.' },
  'A.5.18': { p: 'Provisionar, revisar y revocar los derechos de acceso.', d: 'Documento: procedimiento de provisión y revisión de accesos. Debe contener: aprobaciones, revisión periódica y revocación al cese. Evidencia: registros de revisión de accesos.' },
  'A.5.19': { p: 'Gestionar los riesgos de SI en las relaciones con proveedores.', d: 'Documento: política de seguridad para proveedores. Debe contener: requisitos de SI, evaluación y responsabilidades. Evidencia: evaluaciones de proveedores.' },
  'A.5.20': { p: 'Incluir requisitos de SI en los acuerdos con proveedores.', d: 'Documento: cláusulas de SI en contratos. Debe contener: requisitos, niveles de servicio, confidencialidad y derecho a auditar. Evidencia: contratos con cláusulas de SI.' },
  'A.5.21': { p: 'Gestionar los riesgos de seguridad en la cadena de suministro TIC.', d: 'Documento: lineamiento de seguridad de la cadena de suministro. Debe contener: requisitos a proveedores TIC y trazabilidad de componentes. Evidencia: evaluaciones de la cadena.' },
  'A.5.22': { p: 'Monitorear, revisar y gestionar cambios en los servicios de proveedores.', d: 'Documento: procedimiento de seguimiento de proveedores. Debe contener: revisión de SLA, auditorías y gestión de cambios. Evidencia: informes de seguimiento.' },
  'A.5.23': { p: 'Asegurar la información en el uso de servicios en la nube.', d: 'Documento: política de uso de servicios cloud. Debe contener: criterios de selección, modelo de responsabilidad compartida y estrategia de salida/portabilidad. Evidencia: evaluación del proveedor cloud.' },
  'A.5.24': { p: 'Planificar y preparar la gestión de incidentes de seguridad.', d: 'Documento: plan de gestión de incidentes. Debe contener: roles, clasificación, escalamiento y contactos. Evidencia: plan aprobado.' },
  'A.5.25': { p: 'Evaluar los eventos de seguridad y decidir si son incidentes.', d: 'Documento: criterios de evaluación/clasificación de eventos. Debe contener: escala de severidad y criterios para declarar incidente. Evidencia: registros de evaluación.' },
  'A.5.26': { p: 'Responder a los incidentes de seguridad conforme a procedimientos.', d: 'Documento: procedimientos de respuesta a incidentes. Debe contener: contención, erradicación, recuperación y comunicación. Evidencia: registros de incidentes gestionados.' },
  'A.5.27': { p: 'Aprender de los incidentes para reducir su recurrencia.', d: 'Documento: informe post-incidente / lecciones aprendidas. Debe contener: causa raíz y acciones de mejora. Evidencia: informes de lecciones aprendidas.' },
  'A.5.28': { p: 'Recopilar y preservar evidencia relacionada con incidentes.', d: 'Documento: procedimiento de manejo de evidencia. Debe contener: cadena de custodia e integridad. Evidencia: registros de evidencia preservada.' },
  'A.5.29': { p: 'Mantener la seguridad de la información durante una disrupción.', d: 'Documento: plan de continuidad de la SI. Debe contener: controles a mantener, roles y recuperación. Evidencia: plan + resultados de pruebas.' },
  'A.5.30': { p: 'Preparar las TIC para la continuidad del negocio.', d: 'Documento: plan de continuidad TIC (RTO/RPO). Debe contener: objetivos de recuperación, estrategias y pruebas. Evidencia: pruebas de continuidad realizadas.' },
  'A.5.31': { p: 'Identificar y cumplir los requisitos legales, regulatorios y contractuales.', d: 'Documento: registro de requisitos legales y contractuales. Debe contener: ley/norma, requisito, cómo se cumple y responsable. Evidencia: registro actualizado.' },
  'A.5.32': { p: 'Proteger los derechos de propiedad intelectual.', d: 'Documento: procedimiento de gestión de PI y licencias. Debe contener: licencias de software y control de uso. Evidencia: inventario de licencias.' },
  'A.5.33': { p: 'Proteger los registros contra pérdida, alteración o falsificación.', d: 'Documento: política de retención y protección de registros. Debe contener: tipos de registros, plazos y protección. Evidencia: registros protegidos.' },
  'A.5.34': { p: 'Proteger la privacidad y los datos personales.', d: 'Documento: política de privacidad / protección de datos personales. Debe contener: bases legales, derechos de los titulares y responsable de datos. Evidencia: política + registro de tratamiento.' },
  'A.5.35': { p: 'Revisar la seguridad de la información de forma independiente.', d: 'Documento: programa/informe de revisión independiente. Debe contener: alcance, hallazgos y periodicidad. Evidencia: informes de revisión o auditoría.' },
  'A.5.36': { p: 'Verificar el cumplimiento de políticas, reglas y estándares.', d: 'Documento: procedimiento de verificación de cumplimiento. Debe contener: controles revisados, frecuencia y no conformidades. Evidencia: registros de cumplimiento.' },
  'A.5.37': { p: 'Documentar los procedimientos de operación.', d: 'Documento: procedimientos operativos (SOP). Debe contener: pasos, responsables y frecuencia. Evidencia: SOP disponibles al personal.' },
  // ── A.6 Personas ────────────────────────────────────────────────────
  'A.6.1':  { p: 'Verificar los antecedentes del personal antes de contratar.', d: 'Documento: procedimiento de verificación de antecedentes. Debe contener: chequeos proporcionales al rol y consentimiento. Evidencia: registros de verificación.' },
  'A.6.2':  { p: 'Incluir las responsabilidades de SI en los términos de empleo.', d: 'Documento: cláusulas de SI en contratos laborales. Debe contener: obligaciones de SI y confidencialidad. Evidencia: contratos firmados.' },
  'A.6.3':  { p: 'Concienciar y formar al personal en seguridad de la información.', d: 'Documento: plan de concienciación y formación. Debe contener: temas, audiencia, frecuencia y evaluación. Evidencia: registros de asistencia/capacitación.' },
  'A.6.4':  { p: 'Contar con un proceso disciplinario formal ante incumplimientos.', d: 'Documento: procedimiento disciplinario. Debe contener: pasos, proporcionalidad y comunicación. Evidencia: proceso comunicado al personal.' },
  'A.6.5':  { p: 'Definir responsabilidades de SI que perduran tras el cese o cambio.', d: 'Documento: cláusulas/procedimiento de desvinculación. Debe contener: confidencialidad post-empleo, devolución de activos y revocación de accesos. Evidencia: checklist de salida.' },
  'A.6.6':  { p: 'Establecer acuerdos de confidencialidad con personal y terceros.', d: 'Documento: NDA / acuerdo de confidencialidad. Debe contener: alcance, duración y sanciones. Evidencia: NDA firmados.' },
  'A.6.7':  { p: 'Proteger la información en el trabajo remoto.', d: 'Documento: política de trabajo remoto. Debe contener: requisitos de dispositivos, VPN y entorno de trabajo. Evidencia: política + configuración aplicada.' },
  'A.6.8':  { p: 'Disponer de un canal para notificar eventos de seguridad.', d: 'Documento: procedimiento de reporte de eventos. Debe contener: cómo y a quién reportar y plazos. Evidencia: canal de reporte + registros.' },
  // ── A.7 Físico ──────────────────────────────────────────────────────
  'A.7.1':  { p: 'Definir perímetros de seguridad física para proteger las áreas.', d: 'Documento: definición de perímetros y áreas seguras. Debe contener: zonas y barreras físicas. Evidencia: planos + controles instalados.' },
  'A.7.2':  { p: 'Controlar la entrada física a las instalaciones.', d: 'Documento: procedimiento de control de acceso físico. Debe contener: autorización, registro de visitas y credenciales. Evidencia: bitácora de accesos.' },
  'A.7.3':  { p: 'Proteger las oficinas, salas e instalaciones.', d: 'Documento: medidas de seguridad de instalaciones. Debe contener: protección de salas críticas. Evidencia: controles instalados.' },
  'A.7.4':  { p: 'Monitorear las instalaciones para detectar accesos no autorizados.', d: 'Documento: lineamiento de monitoreo físico (CCTV/alarmas). Debe contener: cobertura y retención de grabaciones. Evidencia: registros de monitoreo.' },
  'A.7.5':  { p: 'Proteger contra amenazas físicas y ambientales.', d: 'Documento: evaluación de amenazas ambientales. Debe contener: riesgos (incendio, inundación) y controles. Evidencia: controles de detección/supresión.' },
  'A.7.6':  { p: 'Definir reglas para trabajar en áreas seguras.', d: 'Documento: procedimiento de trabajo en áreas seguras. Debe contener: restricciones y supervisión. Evidencia: reglas comunicadas.' },
  'A.7.7':  { p: 'Aplicar escritorio despejado y pantalla despejada.', d: 'Documento: política de escritorio y pantalla despejada. Debe contener: bloqueo de sesión y resguardo de documentos. Evidencia: política comunicada.' },
  'A.7.8':  { p: 'Ubicar y proteger los equipos adecuadamente.', d: 'Documento: lineamiento de ubicación de equipos. Debe contener: protección contra riesgos ambientales y robo. Evidencia: controles aplicados.' },
  'A.7.9':  { p: 'Proteger los activos fuera de las instalaciones.', d: 'Documento: procedimiento de activos fuera de sede. Debe contener: autorización, cifrado y seguros. Evidencia: registro de activos móviles.' },
  'A.7.10': { p: 'Gestionar los medios de almacenamiento en su ciclo de vida.', d: 'Documento: política de gestión de medios. Debe contener: uso, transporte y eliminación. Evidencia: registros de medios.' },
  'A.7.11': { p: 'Proteger contra fallos de los servicios de apoyo (energía, etc.).', d: 'Documento: lineamiento de servicios de soporte. Debe contener: UPS, generador y redundancia. Evidencia: mantenimientos/pruebas.' },
  'A.7.12': { p: 'Proteger el cableado de energía y de datos.', d: 'Documento: lineamiento de cableado. Debe contener: protección y separación de cables. Evidencia: instalación conforme.' },
  'A.7.13': { p: 'Mantener correctamente los equipos.', d: 'Documento: plan de mantenimiento de equipos. Debe contener: periodicidad y registros. Evidencia: bitácoras de mantenimiento.' },
  'A.7.14': { p: 'Eliminar o reutilizar equipos de forma segura.', d: 'Documento: procedimiento de eliminación/reutilización segura. Debe contener: borrado seguro y certificado de destrucción. Evidencia: actas de destrucción.' },
  // ── A.8 Tecnológico ─────────────────────────────────────────────────
  'A.8.1':  { p: 'Proteger los dispositivos de punto final del usuario (endpoints).', d: 'Documento: política de endpoints. Debe contener: cifrado, EDR/antimalware, bloqueo y actualizaciones. Evidencia: configuración + inventario.' },
  'A.8.2':  { p: 'Restringir y controlar los derechos de acceso privilegiado.', d: 'Documento: procedimiento de gestión de accesos privilegiados. Debe contener: asignación, MFA y revisión. Evidencia: registro de cuentas privilegiadas.' },
  'A.8.3':  { p: 'Restringir el acceso a la información según la política.', d: 'Documento: reglas de acceso a la información. Debe contener: need-to-know y perfiles. Evidencia: matriz de accesos.' },
  'A.8.4':  { p: 'Controlar el acceso al código fuente.', d: 'Documento: lineamiento de acceso a repositorios. Debe contener: permisos y revisión de cambios. Evidencia: controles del repositorio.' },
  'A.8.5':  { p: 'Implementar tecnologías de autenticación segura.', d: 'Documento: estándar de autenticación. Debe contener: MFA y políticas de sesión. Evidencia: MFA configurado.' },
  'A.8.6':  { p: 'Gestionar la capacidad de los recursos.', d: 'Documento: lineamiento de gestión de capacidad. Debe contener: monitoreo, proyección y umbrales. Evidencia: informes de capacidad.' },
  'A.8.7':  { p: 'Proteger los sistemas contra malware.', d: 'Documento: política antimalware. Debe contener: cobertura, actualización y detección. Evidencia: consola antimalware/EDR.' },
  'A.8.8':  { p: 'Gestionar las vulnerabilidades técnicas.', d: 'Documento: procedimiento de gestión de vulnerabilidades. Debe contener: escaneo, priorización, parcheo y plazos. Evidencia: informes de escaneo + remediación.' },
  'A.8.9':  { p: 'Gestionar configuraciones seguras (hardening).', d: 'Documento: líneas base de configuración. Debe contener: estándares por sistema y control de desviaciones. Evidencia: baselines aplicadas.' },
  'A.8.10': { p: 'Eliminar la información cuando ya no se necesita.', d: 'Documento: procedimiento de eliminación de información. Debe contener: criterios de retención y métodos de borrado. Evidencia: registros de eliminación.' },
  'A.8.11': { p: 'Enmascarar los datos sensibles.', d: 'Documento: lineamiento de enmascaramiento de datos. Debe contener: dónde aplicar y técnicas. Evidencia: configuración aplicada.' },
  'A.8.12': { p: 'Prevenir la fuga de datos (DLP).', d: 'Documento: lineamiento de prevención de fuga de datos. Debe contener: canales monitoreados y reglas. Evidencia: configuración DLP.' },
  'A.8.13': { p: 'Respaldar la información y probar su restauración.', d: 'Documento: política de respaldos. Debe contener: alcance, frecuencia, retención y pruebas de restauración. Evidencia: registros de backup + pruebas de restore.' },
  'A.8.14': { p: 'Asegurar la disponibilidad mediante redundancia.', d: 'Documento: lineamiento de redundancia. Debe contener: componentes redundantes y failover. Evidencia: pruebas de redundancia.' },
  'A.8.15': { p: 'Registrar eventos y generar bitácoras (logging).', d: 'Documento: política de logging. Debe contener: qué se registra, retención y protección de logs. Evidencia: logs centralizados.' },
  'A.8.16': { p: 'Monitorear las actividades para detectar anomalías.', d: 'Documento: lineamiento de monitoreo. Debe contener: fuentes, alertas y respuesta. Evidencia: SIEM/monitoreo operando.' },
  'A.8.17': { p: 'Sincronizar los relojes de los sistemas.', d: 'Documento: lineamiento de sincronización de relojes (NTP). Debe contener: fuente de tiempo confiable. Evidencia: configuración NTP.' },
  'A.8.18': { p: 'Restringir el uso de programas de utilidad privilegiados.', d: 'Documento: control de herramientas privilegiadas. Debe contener: restricción y registro de uso. Evidencia: controles aplicados.' },
  'A.8.19': { p: 'Controlar la instalación de software en los sistemas operativos.', d: 'Documento: procedimiento de instalación de software. Debe contener: software autorizado y control de cambios. Evidencia: lista blanca/inventario.' },
  'A.8.20': { p: 'Proteger las redes y los dispositivos de red.', d: 'Documento: lineamiento de seguridad de red. Debe contener: segmentación, firewalls y controles. Evidencia: diagrama + reglas.' },
  'A.8.21': { p: 'Asegurar los servicios de red.', d: 'Documento: acuerdos/lineamiento de servicios de red. Debe contener: requisitos de seguridad y SLA. Evidencia: configuración aplicada.' },
  'A.8.22': { p: 'Segregar las redes por dominios.', d: 'Documento: diseño de segmentación de red. Debe contener: VLAN/zonas y reglas entre zonas. Evidencia: diagrama de segmentación.' },
  'A.8.23': { p: 'Filtrar el acceso a sitios web.', d: 'Documento: lineamiento de filtrado web. Debe contener: categorías bloqueadas. Evidencia: configuración del filtro.' },
  'A.8.24': { p: 'Usar la criptografía de forma correcta.', d: 'Documento: política criptográfica. Debe contener: algoritmos permitidos y gestión de llaves. Evidencia: cifrado aplicado + gestión de llaves.' },
  'A.8.25': { p: 'Establecer un ciclo de vida de desarrollo seguro.', d: 'Documento: política de desarrollo seguro (SDLC). Debe contener: fases y controles de seguridad. Evidencia: SDLC documentado.' },
  'A.8.26': { p: 'Definir los requisitos de seguridad de las aplicaciones.', d: 'Documento: requisitos de seguridad por aplicación. Debe contener: autenticación, validación y registro. Evidencia: requisitos en proyectos.' },
  'A.8.27': { p: 'Aplicar principios de ingeniería y arquitectura segura.', d: 'Documento: principios de arquitectura segura. Debe contener: defensa en profundidad y mínimo privilegio. Evidencia: diseños conformes.' },
  'A.8.28': { p: 'Aplicar codificación segura.', d: 'Documento: estándar de codificación segura. Debe contener: prácticas (OWASP) y revisión de código. Evidencia: revisiones/SAST.' },
  'A.8.29': { p: 'Probar la seguridad en desarrollo y aceptación.', d: 'Documento: plan de pruebas de seguridad. Debe contener: tipos de prueba y criterios de aceptación. Evidencia: informes de pruebas.' },
  'A.8.30': { p: 'Supervisar el desarrollo externalizado.', d: 'Documento: requisitos de SI para desarrollo externo. Debe contener: requisitos contractuales y revisión. Evidencia: evaluaciones del proveedor.' },
  'A.8.31': { p: 'Separar los entornos de desarrollo, prueba y producción.', d: 'Documento: lineamiento de separación de entornos. Debe contener: aislamiento y control de datos. Evidencia: entornos separados.' },
  'A.8.32': { p: 'Controlar los cambios en sistemas e información.', d: 'Documento: procedimiento de gestión de cambios. Debe contener: solicitud, aprobación, pruebas y rollback. Evidencia: registros de cambios.' },
  'A.8.33': { p: 'Proteger la información usada en pruebas.', d: 'Documento: lineamiento de datos de prueba. Debe contener: selección y anonimización. Evidencia: datos de prueba protegidos.' },
  'A.8.34': { p: 'Proteger los sistemas durante las pruebas de auditoría.', d: 'Documento: lineamiento de pruebas de auditoría. Debe contener: planificación y acceso de solo lectura. Evidencia: acuerdos de auditoría.' },
}

async function main() {
  console.log('› Seed de guía ISO + columna responsable…')

  // Columna responsable (idempotente)
  const [col] = await centralDB.query(
    `SELECT COUNT(*) c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'iso_control_assessments' AND column_name = 'responsable'`)
  if (!col[0].c) {
    await centralDB.query(`ALTER TABLE iso_control_assessments ADD COLUMN responsable VARCHAR(200) NULL AFTER notes_dstac`)
    console.log('  ✓ columna responsable agregada')
  } else {
    console.log('  • columna responsable ya existía')
  }

  let n = 0
  for (const [id, g] of Object.entries(GUIA)) {
    const [r] = await centralDB.execute(
      `UPDATE iso_controls SET purpose = ?, policy_template = ? WHERE id = ?`,
      [g.p, g.d, id])
    if (r.affectedRows) n++
  }
  console.log(`  ✓ guía cargada en ${n}/${Object.keys(GUIA).length} controles`)
  console.log('✓ Listo')
}

main().then(() => process.exit(0)).catch(err => { console.error('✗', err.message); process.exit(1) })
