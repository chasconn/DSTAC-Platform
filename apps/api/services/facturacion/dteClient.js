// Cliente del microservicio de emisión de DTE (LibreDTE autohospedado).
// Ver apps/dte/README.md para cómo levantar ese servicio en el VPS con tu
// certificado digital y los CAF descargados del SII.
//
// Mientras DTE_SERVICE_URL no esté configurado, emitirDTE() falla con un
// mensaje claro en vez de intentar una emisión real.

async function emitirDTE({ factura, items, company }) {
  const baseUrl = process.env.DTE_SERVICE_URL
  if (!baseUrl) {
    throw new Error('DTE_SERVICE_URL no está configurado. Configura el microservicio LibreDTE (ver apps/dte/README.md) antes de emitir al SII.')
  }

  const res = await fetch(`${baseUrl}/emitir`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.DTE_SERVICE_TOKEN ? { Authorization: `Bearer ${process.env.DTE_SERVICE_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      tipo_dte: factura.tipo_dte,
      receptor: {
        razon_social: company.name,
        rut: company.rut || null,
        giro: company.giro || null,
      },
      items: items.map(it => ({
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
      })),
      glosa: factura.glosa || null,
      fecha_emision: factura.fecha_emision,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`El servicio DTE respondió ${res.status}: ${body || 'sin detalle'}`)
  }

  return res.json() // { folio, track_id, estado_sii, pdf_url, xml_url }
}

module.exports = { emitirDTE }
