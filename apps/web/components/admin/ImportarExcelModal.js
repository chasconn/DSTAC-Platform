'use client'

import { useState, useRef, useCallback } from 'react'

// Pasos: upload → preview → importando → resultado
const PASO = { UPLOAD: 'upload', PREVIEW: 'preview', IMPORTANDO: 'importando', RESULTADO: 'resultado' }

const MODULO_CONFIG = {
  personal:    { label: 'Personal',    endpoint: '/api/admin/importacion/personal',    icon: 'ti-users' },
  activos:     { label: 'Activos',     endpoint: '/api/admin/importacion/activos',     icon: 'ti-server' },
  identidades: { label: 'Identidades', endpoint: '/api/admin/importacion/identidades', icon: 'ti-id' },
  accesos:     { label: 'Accesos',     endpoint: '/api/admin/importacion/accesos',     icon: 'ti-key' },
  riesgos:     { label: 'Riesgos',     endpoint: '/api/admin/importacion/riesgos',     icon: 'ti-alert-triangle' },
  incidentes:  { label: 'Incidentes',  endpoint: '/api/admin/importacion/incidentes',  icon: 'ti-urgent' },
}

export default function ImportarExcelModal({ modulo, empresaSlug, onClose, onImportado }) {
  const config = MODULO_CONFIG[modulo]

  const [paso, setPaso]               = useState(PASO.UPLOAD)
  const [archivo, setArchivo]         = useState(null)
  const [preview, setPreview]         = useState(null)
  const [resultado, setResultado]     = useState(null)
  const [dragging, setDragging]       = useState(false)
  const [cargando, setCargando]       = useState(false)
  const [error, setError]             = useState('')
  const inputRef                      = useRef(null)

  // ── Descarga plantilla ────────────────────────────────────────────────────
  async function descargarPlantilla() {
    try {
      const res = await fetch(`${config.endpoint}/plantilla`, {
        credentials: 'include',
        headers: { 'X-Company-Slug': empresaSlug },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `plantilla_${modulo}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silencioso */ }
  }

  // ── Selección de archivo ──────────────────────────────────────────────────
  function seleccionarArchivo(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      setError('Solo se aceptan archivos Excel (.xlsx o .xls)')
      return
    }
    setError('')
    setArchivo(file)
  }

  function onInputChange(e) { seleccionarArchivo(e.target.files[0]) }
  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    seleccionarArchivo(e.dataTransfer.files[0])
  }
  const onDragOver  = useCallback(e => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])

  // ── Previsualizar ─────────────────────────────────────────────────────────
  async function previsualizar() {
    if (!archivo || !empresaSlug) return
    setCargando(true); setError('')
    try {
      const fd = new FormData()
      fd.append('archivo', archivo)
      const res = await fetch(`${config.endpoint}/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Company-Slug': empresaSlug },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al procesar el archivo'); return }
      setPreview(data)
      setPaso(PASO.PREVIEW)
    } catch (err) {
      setError(err.message || 'Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  // ── Confirmar importación ─────────────────────────────────────────────────
  async function confirmar() {
    if (!archivo || !empresaSlug) return
    setPaso(PASO.IMPORTANDO)
    try {
      const fd = new FormData()
      fd.append('archivo', archivo)
      const res = await fetch(`${config.endpoint}/confirmar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Company-Slug': empresaSlug },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al importar'); setPaso(PASO.PREVIEW); return }
      setResultado(data)
      setPaso(PASO.RESULTADO)
      if (data.creados > 0) onImportado?.()
    } catch (err) {
      setError(err.message || 'Error de conexión')
      setPaso(PASO.PREVIEW)
    }
  }

  function volver() {
    setPaso(PASO.UPLOAD); setArchivo(null); setPreview(null); setResultado(null); setError('')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid #e2e0d8', flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`ti ${config.icon}`} style={{ fontSize: 18, color: '#3C3489' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A' }}>
              Importar {config.label} desde Excel
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 1 }}>
              {paso === PASO.UPLOAD    && 'Selecciona o arrastra un archivo Excel'}
              {paso === PASO.PREVIEW   && `${preview?.total ?? 0} filas encontradas · ${preview?.validas ?? 0} válidas · ${preview?.invalidas ?? 0} con errores`}
              {paso === PASO.IMPORTANDO && 'Importando registros...'}
              {paso === PASO.RESULTADO  && `Importación completada`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 20, padding: 4, lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

          {/* ── PASO 1: UPLOAD ── */}
          {paso === PASO.UPLOAD && (
            <div>
              {/* Drop zone */}
              <div
                className="drop-zone"
                style={{
                  border: `2px dashed ${dragging ? '#534AB7' : archivo ? '#1D9E75' : '#e2e0d8'}`,
                  borderRadius: 10,
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: dragging ? '#EEEDFE' : archivo ? '#F0FAF5' : '#fafaf8',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: 16,
                }}
                onClick={() => inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={onInputChange} />
                {archivo ? (
                  <>
                    <i className="ti ti-file-spreadsheet" style={{ fontSize: 36, color: '#1D9E75', display: 'block', marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1D9E75' }}>{archivo.name}</div>
                    <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>{(archivo.size / 1024).toFixed(1)} KB · Haz clic para cambiar</div>
                  </>
                ) : (
                  <>
                    <i className="ti ti-upload" style={{ fontSize: 36, color: '#B4B2A9', display: 'block', marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Arrastra el archivo aquí</div>
                    <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>o haz clic para seleccionarlo · Solo .xlsx o .xls · máx 5 MB</div>
                  </>
                )}
              </div>

              {/* Descargar plantilla */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8f7f4', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12, color: '#888780' }}>
                <i className="ti ti-info-circle" style={{ fontSize: 14, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>¿Primera vez? Descarga la plantilla con las columnas requeridas.</span>
                <button onClick={descargarPlantilla} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontWeight: 600, fontSize: 12, padding: 0, whiteSpace: 'nowrap' }}>
                  <i className="ti ti-download" style={{ marginRight: 4 }} />Plantilla
                </button>
              </div>

              {error && <div className="import-error" style={{ marginTop: 12 }}><i className="ti ti-alert-circle" /> {error}</div>}
            </div>
          )}

          {/* ── PASO 2: PREVIEW ── */}
          {paso === PASO.PREVIEW && preview && (
            <div>
              {/* Resumen */}
              <div className="import-summary">
                <div className="summary-item summary-total">
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{preview.total}</div>
                  <div style={{ fontSize: 11, color: '#888780' }}>Total filas</div>
                </div>
                <div className="summary-item summary-ok">
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1D9E75' }}>{preview.validas}</div>
                  <div style={{ fontSize: 11, color: '#888780' }}>Válidas</div>
                </div>
                <div className="summary-item summary-err">
                  <div style={{ fontSize: 22, fontWeight: 700, color: preview.invalidas > 0 ? '#E24B4A' : '#B4B2A9' }}>{preview.invalidas}</div>
                  <div style={{ fontSize: 11, color: '#888780' }}>Con errores</div>
                </div>
                {preview.warnings?.length > 0 && (
                  <div className="summary-item summary-warn">
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#EF9F27' }}>{preview.warnings.length}</div>
                    <div style={{ fontSize: 11, color: '#888780' }}>Advertencias</div>
                  </div>
                )}
              </div>

              {/* Preview de filas válidas */}
              {preview.preview?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 8 }}>
                    Vista previa (primeras {preview.preview.length} filas válidas)
                  </div>
                  <div style={{ border: '1px solid #e2e0d8', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8f7f4' }}>
                          <th style={thStyle}>Fila</th>
                          {Object.keys(preview.preview[0].datos).map(k => (
                            <th key={k} style={thStyle}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.map(({ fila, datos }) => (
                          <tr key={fila} style={{ borderTop: '1px solid #f1efe8' }}>
                            <td style={tdStyle}>{fila}</td>
                            {Object.values(datos).map((v, i) => (
                              <td key={i} style={tdStyle}>{v === null || v === undefined ? '—' : String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Advertencias */}
              {preview.warnings?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#633806', marginBottom: 6 }}>
                    <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
                    Advertencias ({preview.warnings.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {preview.warnings.map((w, i) => (
                      <div key={i} className="import-warning">
                        <span style={{ fontWeight: 600 }}>Fila {w.fila} · {w.campo}:</span> {w.aviso}
                        {w.resultado && <span style={{ color: '#888780' }}> — {w.resultado}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errores por fila */}
              {preview.errores?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#791F1F', marginBottom: 6 }}>
                    <i className="ti ti-alert-circle" style={{ marginRight: 4 }} />
                    Filas con errores ({preview.errores.length}) — no se importarán
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {preview.errores.map((e, i) => (
                      <div key={i} className="import-error-row">
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#791F1F', marginBottom: 3 }}>Fila {e.fila}</div>
                        {e.errores.map((er, j) => (
                          <div key={j} style={{ fontSize: 11, color: '#555' }}>
                            <span style={{ fontWeight: 600 }}>{er.campo}:</span> {er.error}
                            {er.sugerencia && <span style={{ color: '#888780' }}> · {er.sugerencia}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <div className="import-error" style={{ marginTop: 8 }}><i className="ti ti-alert-circle" /> {error}</div>}
            </div>
          )}

          {/* ── PASO 3: IMPORTANDO ── */}
          {paso === PASO.IMPORTANDO && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 48, height: 48, border: '3px solid #e2e0d8', borderTop: '3px solid #534AB7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2C2A' }}>Importando {config.label.toLowerCase()}…</div>
              <div style={{ fontSize: 12, color: '#888780', marginTop: 6 }}>No cierres esta ventana</div>
            </div>
          )}

          {/* ── PASO 4: RESULTADO ── */}
          {paso === PASO.RESULTADO && resultado && (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: resultado.creados > 0 ? '#F0FAF5' : '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <i className={`ti ${resultado.creados > 0 ? 'ti-check' : 'ti-alert-circle'}`} style={{ fontSize: 28, color: resultado.creados > 0 ? '#1D9E75' : '#888780' }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#2C2C2A', marginBottom: 4 }}>
                {resultado.creados > 0 ? `${resultado.creados} registro${resultado.creados !== 1 ? 's' : ''} importado${resultado.creados !== 1 ? 's' : ''}` : 'Sin registros nuevos'}
              </div>
              {resultado.omitidos > 0 && (
                <div style={{ fontSize: 12, color: '#888780', marginBottom: 16 }}>
                  {resultado.omitidos} fila{resultado.omitidos !== 1 ? 's' : ''} omitida{resultado.omitidos !== 1 ? 's' : ''} por errores
                </div>
              )}
              {resultado.warnings?.length > 0 && (
                <div style={{ textAlign: 'left', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#633806', marginBottom: 6 }}>Advertencias</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {resultado.warnings.map((w, i) => (
                      <div key={i} className="import-warning" style={{ textAlign: 'left' }}>
                        <span style={{ fontWeight: 600 }}>Fila {w.fila}:</span> {w.aviso}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resultado.errores?.length > 0 && (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#791F1F', marginBottom: 6 }}>Filas omitidas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {resultado.errores.map((e, i) => (
                      <div key={i} className="import-error-row">
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#791F1F' }}>Fila {e.fila}</div>
                        {e.errores.map((er, j) => (
                          <div key={j} style={{ fontSize: 11, color: '#555' }}>{er.campo}: {er.error}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Pie con acciones */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #e2e0d8', flexShrink: 0, background: '#fafaf8' }}>
          {paso === PASO.UPLOAD && (
            <>
              <button onClick={onClose} style={btnSecundario}>Cancelar</button>
              <button
                onClick={previsualizar}
                disabled={!archivo || cargando}
                style={{ ...btnPrimario, opacity: (!archivo || cargando) ? 0.5 : 1, cursor: (!archivo || cargando) ? 'not-allowed' : 'pointer' }}
              >
                {cargando ? 'Procesando…' : 'Previsualizar'}
                {!cargando && <i className="ti ti-arrow-right" style={{ fontSize: 13 }} />}
              </button>
            </>
          )}

          {paso === PASO.PREVIEW && (
            <>
              <button onClick={volver} style={btnSecundario}><i className="ti ti-arrow-left" style={{ fontSize: 13 }} /> Volver</button>
              <button
                onClick={confirmar}
                disabled={!preview?.puede_importar}
                style={{ ...btnPrimario, opacity: !preview?.puede_importar ? 0.5 : 1, cursor: !preview?.puede_importar ? 'not-allowed' : 'pointer' }}
              >
                <i className="ti ti-upload" style={{ fontSize: 13 }} />
                Importar {preview?.validas ?? 0} registro{preview?.validas !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {paso === PASO.RESULTADO && (
            <>
              <button onClick={volver} style={btnSecundario}>Importar otro</button>
              <button onClick={onClose} style={btnPrimario}>Cerrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const thStyle = {
  padding: '7px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#888780', borderRight: '1px solid #e2e0d8', whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '6px 10px', color: '#2C2C2A', borderRight: '1px solid #f1efe8',
  maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: '#3C3489', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecundario = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e0d8',
  background: '#fff', color: '#2C2C2A', fontSize: 13, cursor: 'pointer',
}
