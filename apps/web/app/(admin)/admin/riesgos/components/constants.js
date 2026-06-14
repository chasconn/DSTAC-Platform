// Constantes compartidas del módulo de Riesgos.

// Nivel de riesgo (coincide con la columna generada nivel_categoria del backend).
export const NIVEL = {
  critico: { label: 'Crítico', color: '#E24B4A', bg: '#FCEBEB', text: '#791F1F' },
  alto:    { label: 'Alto',    color: '#EF9F27', bg: '#FEF3E2', text: '#633806' },
  medio:   { label: 'Medio',   color: '#C8951A', bg: '#FAEEDA', text: '#854F0B' },
  bajo:    { label: 'Bajo',    color: '#1D9E75', bg: '#EAF3DE', text: '#27500A' },
}

// Estado del riesgo.
export const ESTADO = {
  identificado:   { label: 'Identificado',   bg: '#E6F1FB', text: '#0C447C' },
  en_tratamiento: { label: 'En tratamiento', bg: '#EEEDFE', text: '#3C3489' },
  mitigado:       { label: 'Mitigado',       bg: '#EAF3DE', text: '#27500A' },
  aceptado:       { label: 'Aceptado',       bg: '#F1EFE8', text: '#444441' },
  cerrado:        { label: 'Cerrado',        bg: '#F1EFE8', text: '#888780' },
}

export const CATEGORIA = {
  tecnico:     'Técnico',
  operacional: 'Operacional',
  humano:      'Humano',
  externo:     'Externo',
  legal:       'Legal',
}

export const TRATAMIENTO = {
  mitigar:    'Mitigar',
  aceptar:    'Aceptar',
  transferir: 'Transferir',
  evitar:     'Evitar',
}

// Etiquetas de la escala 1-5.
export const PROB_LABELS = ['', 'Raro', 'Improbable', 'Posible', 'Probable', 'Casi seguro']
export const IMP_LABELS  = ['', 'Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico']

// Nivel a partir de probabilidad × impacto (misma fórmula que el backend).
export function nivelDe(prob, impacto) {
  const v = (Number(prob) || 0) * (Number(impacto) || 0)
  if (v >= 20) return 'critico'
  if (v >= 15) return 'alto'
  if (v >= 6)  return 'medio'
  return 'bajo'
}
