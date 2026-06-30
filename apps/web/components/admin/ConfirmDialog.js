'use client'

// Reemplazo con estilo DSTAC de confirm()/alert() nativos del navegador (gris,
// sin marca, distinto en cada navegador). Mismo patrón imperativo que ya usan
// los overlays de PDF (BotonInforme.js, quotePreview.js): se construye con DOM
// directo y se agrega a document.body, así escapa el zoom del panel sin
// depender de React.
const ICONOS = {
  peligro: (color) => `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  info: (color) => `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  error: (color) => `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`,
}

function dialogoBase({ mensaje, titulo, icono, accent, accentBg, botones }) {
  const ov = document.createElement('div')
  ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(20,18,38,.55);display:flex;align-items:center;justify-content:center;padding:16px'

  const card = document.createElement('div')
  card.style.cssText = 'background:#fff;border-radius:16px;width:400px;max-width:100%;box-shadow:0 24px 60px -16px rgba(0,0,0,.45);padding:24px;font-family:inherit'

  const head = document.createElement('div')
  head.style.cssText = 'display:flex;align-items:center;gap:11px;margin-bottom:14px'
  const iconEl = document.createElement('div')
  iconEl.style.cssText = `width:38px;height:38px;border-radius:10px;background:${accentBg};display:flex;align-items:center;justify-content:center;flex-shrink:0`
  iconEl.innerHTML = icono(accent)
  const tit = document.createElement('div')
  tit.style.cssText = 'font-size:15.5px;font-weight:700;color:#2C2C2A'
  tit.textContent = titulo
  head.append(iconEl, tit)

  const msg = document.createElement('div')
  msg.style.cssText = 'font-size:13.5px;color:#444441;line-height:1.6;margin-bottom:24px;white-space:pre-line'
  msg.textContent = mensaje

  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end'

  const botonesEl = botones.map(b => {
    const btn = document.createElement('button')
    btn.textContent = b.texto
    btn.style.cssText = b.primario
      ? `padding:9px 18px;border-radius:8px;border:none;background:${accent};color:#fff;cursor:pointer;font-size:13px;font-weight:700`
      : 'padding:9px 18px;border-radius:8px;border:1px solid #e2e0d8;background:#fff;color:#444441;cursor:pointer;font-size:13px;font-weight:600'
    return btn
  })
  actions.append(...botonesEl)
  card.append(head, msg, actions)
  ov.appendChild(card)
  document.body.appendChild(ov)

  return { ov, card, botonesEl }
}

// Uso: if (!await confirmDstac('¿Seguro?', { titulo: 'Eliminar', peligro: true })) return
export function confirmDstac(mensaje, opciones = {}) {
  const {
    titulo = 'Confirmar',
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    peligro = false,
  } = opciones

  return new Promise(resolve => {
    const accent = peligro ? '#E24B4A' : '#3C3489'
    const accentBg = peligro ? '#FCEBEB' : '#EEEDFE'
    const { ov, botonesEl } = dialogoBase({
      mensaje, titulo, accent, accentBg,
      icono: peligro ? ICONOS.peligro : ICONOS.info,
      botones: [{ texto: textoCancelar, primario: false }, { texto: textoConfirmar, primario: true }],
    })
    const [btnCancel, btnOk] = botonesEl

    function close(result) {
      ov.remove()
      document.removeEventListener('keydown', onKey)
      resolve(result)
    }
    function onKey(e) {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter') close(true)
    }
    btnCancel.onclick = () => close(false)
    btnOk.onclick = () => close(true)
    ov.addEventListener('click', e => { if (e.target === ov) close(false) })
    document.addEventListener('keydown', onKey)
    btnOk.focus()
  })
}

// Uso: await alertDstac('Mensaje', { titulo: 'Error', tipo: 'error' })
export function alertDstac(mensaje, opciones = {}) {
  const { titulo = 'Aviso', textoOk = 'Aceptar', tipo = 'info' } = opciones

  return new Promise(resolve => {
    const accent = tipo === 'error' ? '#E24B4A' : '#3C3489'
    const accentBg = tipo === 'error' ? '#FCEBEB' : '#EEEDFE'
    const { ov, botonesEl } = dialogoBase({
      mensaje, titulo, accent, accentBg,
      icono: tipo === 'error' ? ICONOS.error : ICONOS.info,
      botones: [{ texto: textoOk, primario: true }],
    })
    const [btnOk] = botonesEl

    function close() {
      ov.remove()
      document.removeEventListener('keydown', onKey)
      resolve()
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter') close() }
    btnOk.onclick = close
    ov.addEventListener('click', e => { if (e.target === ov) close() })
    document.addEventListener('keydown', onKey)
    btnOk.focus()
  })
}
