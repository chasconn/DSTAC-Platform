// Genera un borrador de propuesta técnica/comercial a partir de los datos
// de una licitación. Es solo un punto de partida editable por el equipo —
// SIEMPRE debe ser revisado y completado a mano antes de subirlo al portal
// (anexos, garantías, firma electrónica, boleta de seriedad, etc. no están
// cubiertos aquí).

function fmtFecha(fecha) {
  if (!fecha) return 'no informada'
  try { return new Date(fecha).toLocaleDateString('es-CL') } catch { return String(fecha) }
}

function generarBorrador(oportunidad) {
  const keywords = (() => {
    try { return JSON.parse(oportunidad.keywords_matched || '[]') } catch { return [] }
  })()

  return `PROPUESTA TÉCNICA Y ECONÓMICA — DSTAC
Licitación: ${oportunidad.nombre}
Código Mercado Público: ${oportunidad.codigo_externo}
Organismo: ${oportunidad.organismo || 'no informado'}
Fecha de cierre: ${fmtFecha(oportunidad.fecha_cierre)}

1. PRESENTACIÓN DE DSTAC
DSTAC es una empresa chilena de ciberseguridad especializada en evaluación de
riesgos, cumplimiento normativo (ISO 27001, NIST CSF, Ley 21.663, Ley 21.719),
auditorías de seguridad, pentesting, gestión de identidades y accesos, EDR,
respuesta a incidentes y capacitación a equipos.

2. RELEVANCIA DETECTADA
Esta oportunidad fue identificada como relevante para nuestros servicios por
coincidencia con: ${keywords.length ? keywords.join(', ') : 'sin keywords registradas'}.

3. PROPUESTA TÉCNICA
[COMPLETAR — describir metodología, alcance y entregables específicos para
los requerimientos de esta licitación. Revisar las bases y anexos técnicos
publicados en la ficha de Mercado Público antes de continuar.]

4. EQUIPO Y EXPERIENCIA
[COMPLETAR — antecedentes del equipo asignado, certificaciones relevantes
(ej. OSCP, CISSP, ISO 27001 Lead Auditor) y proyectos similares ejecutados.]

5. PROPUESTA ECONÓMICA
[COMPLETAR — desglose de precios según formato exigido en las bases.]

6. PLAZOS
[COMPLETAR — cronograma de ejecución.]

— Borrador generado automáticamente el ${new Date().toLocaleString('es-CL')}.
  Ficha oficial: ${oportunidad.link_ficha || 'no disponible'}
  ESTE TEXTO ES UN PUNTO DE PARTIDA. Debe ser revisado, completado y
  validado por un analista DSTAC antes de cualquier envío oficial.`
}

module.exports = { generarBorrador }
