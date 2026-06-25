// services/marketing/cardOcr.js — OCR local (Tesseract, gratuito) para tarjetas
// de presentacion. Extrae el texto de la foto y sugiere empresa/nombre/correo
// con heuristicas simples. El usuario SIEMPRE revisa y corrige el resultado en
// el formulario antes de enviar -- esto es una ayuda para no tipear todo a
// mano, no un parser perfecto.
const { createWorker } = require('tesseract.js')

function limpiarLineas(texto) {
  return String(texto || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

function extraerEmail(lineas) {
  for (const l of lineas) {
    const m = l.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (m) return m[0].toLowerCase()
  }
  return ''
}

// Mayormente mayusculas, sin @, largo razonable -> probable nombre de empresa.
function pareceEmpresa(linea) {
  const soloLetras = linea.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')
  if (soloLetras.length < 3) return false
  const mayus = soloLetras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length
  return mayus / soloLetras.length > 0.8 && linea.length <= 45 && !linea.includes('@')
}

// 2 a 4 palabras en Title Case -> probable nombre de persona.
function pareceNombre(linea) {
  const palabras = linea.split(/\s+/).filter(Boolean)
  if (palabras.length < 2 || palabras.length > 4) return false
  return palabras.every(p => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ'-]+$/.test(p))
}

function sugerirCampos(textoOCR) {
  const lineas = limpiarLineas(textoOCR)
  const email = extraerEmail(lineas)
  const restantes = lineas.filter(l => !l.includes('@'))

  let empresa = restantes.find(pareceEmpresa) || ''
  let nombre = restantes.find(pareceNombre) || ''

  if (!nombre) nombre = restantes.find(l => l !== empresa && l.length >= 4 && l.length <= 40) || ''
  if (!empresa) empresa = restantes.find(l => l !== nombre && l.length >= 3) || ''

  return { empresa, nombre, email }
}

// imageDataUrl: string completo "data:image/jpeg;base64,...." tal como lo
// entrega FileReader.readAsDataURL en el navegador.
async function leerTarjeta(imageDataUrl) {
  const worker = await createWorker('spa')
  try {
    const { data } = await worker.recognize(imageDataUrl)
    return { textoCompleto: data.text, sugerido: sugerirCampos(data.text) }
  } finally {
    await worker.terminate()
  }
}

module.exports = { leerTarjeta, sugerirCampos }
