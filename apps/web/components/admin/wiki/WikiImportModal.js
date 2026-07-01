'use client'

import { useState, useRef } from 'react'

const INPUT = { padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13.5, color: '#2C2C2A', background: '#fff', outline: 'none', width: '100%' }

export default function WikiImportModal({ onClose, onImportado }) {
  const [archivos, setArchivos] = useState([])
  const [carpeta, setCarpeta] = useState('')
  const [visibilidad, setVisibilidad] = useState('privada')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  function elegirArchivos(e) {
    const lista = Array.from(e.target.files || [])
    setArchivos(lista)
    setResultado(null)
    setError(null)
  }

  async function importar() {
    if (!archivos.length) { setError('Selecciona al menos un archivo .md'); return }
    setImportando(true); setError(null)
    try {
      const fd = new FormData()
      archivos.forEach(f => fd.append('archivos', f))
      if (carpeta.trim()) fd.append('carpeta', carpeta.trim())
      fd.append('visibilidad', visibilidad)
      const r = await fetch('/api/admin/wiki/import', { method: 'POST', credentials: 'include', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Error al importar')
      setResultado(d)
      onImportado?.()
    } catch (err) {
      setError(err.message || 'Error al importar')
    } finally { setImportando(false) }
  }

  const totalOk = (resultado?.creadas?.length ?? 0) + (resultado?.reclamadas?.length ?? 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,40,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 26, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#2C2C2A' }}>Importar archivos .md</h2>
        <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#888780' }}>Cada archivo se convierte en una nota nueva. El título de la nota se toma del nombre del archivo.</p>

        {!resultado ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 6 }}>Archivos</label>
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt" multiple onChange={elegirArchivos} style={INPUT} />
              {archivos.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#888780' }}>
                  {archivos.length} archivo{archivos.length !== 1 ? 's' : ''} seleccionado{archivos.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 6 }}>Carpeta destino (opcional)</label>
              <input value={carpeta} onChange={e => setCarpeta(e.target.value)} placeholder="ej: Importado/Obsidian" style={INPUT} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 6 }}>Visibilidad para todo el lote</label>
              <div style={{ display: 'inline-flex', gap: 6, background: '#faf9f6', border: '1px solid #e2e0d8', borderRadius: 8, padding: 4 }}>
                <button type="button" onClick={() => setVisibilidad('privada')}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: visibilidad === 'privada' ? '#3C3489' : 'transparent', color: visibilidad === 'privada' ? '#fff' : '#888780' }}>
                  🔒 Privada
                </button>
                <button type="button" onClick={() => setVisibilidad('equipo')}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: visibilidad === 'equipo' ? '#3C3489' : 'transparent', color: visibilidad === 'equipo' ? '#fff' : '#888780' }}>
                  👥 Equipo
                </button>
              </div>
            </div>

            {error && <div style={{ color: '#B23434', fontSize: 12.5, marginBottom: 14 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={importar} disabled={importando || !archivos.length}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: importando || !archivos.length ? '#cfcdc4' : '#3C3489', color: '#fff', cursor: importando || !archivos.length ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                {importando ? 'Importando…' : `Importar ${archivos.length || ''}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: '#EAF3DE', border: '1px solid #A3D67A', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#27500A', fontWeight: 500, marginBottom: 12 }}>
              {totalOk} nota{totalOk !== 1 ? 's' : ''} importada{totalOk !== 1 ? 's' : ''}
              {resultado.reclamadas?.length > 0 && ` (${resultado.reclamadas.length} completó notas fantasma existentes)`}
            </div>
            {resultado.omitidas?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#B23434', marginBottom: 6 }}>{resultado.omitidas.length} omitida{resultado.omitidas.length !== 1 ? 's' : ''}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {resultado.omitidas.map((o, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: '#791F1F', background: '#FCEBEB', borderRadius: 6, padding: '6px 10px' }}>
                      <b>{o.archivo}</b> — {o.motivo}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Listo</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
