'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'
import FixedPortal from '../../../../components/admin/FixedPortal'

const NAVY = '#1a1740', PURPLE = '#534AB7'
const CLP = (n) => n ? '$' + Number(n).toLocaleString('es-CL') : '—'
const SELECT_STYLE = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, color: '#2C2C2A', background: '#fff', outline: 'none' }
const LIMIT = 20

const ESTADOS = [
  { value: 'nueva',          label: 'Nueva',          color: '#3C8DBC' },
  { value: 'revisando',      label: 'Revisando',      color: '#C98A1E' },
  { value: 'en_preparacion', label: 'En preparación', color: '#9B59B6' },
  { value: 'postulada',      label: 'Postulada',      color: '#1D9E75' },
  { value: 'descartada',     label: 'Descartada',     color: '#B4B2A9' },
  { value: 'no_adjudicada',  label: 'No adjudicada',  color: '#D8543F' },
  { value: 'adjudicada',     label: 'Adjudicada',     color: '#1D9E75' },
]
const estadoInfo = (v) => ESTADOS.find(e => e.value === v) || ESTADOS[0]

function StatCard({ label, value, color = '#2C2C2A' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', borderTop: `3px solid ${PURPLE}`, padding: '14px 18px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888780', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function Badge({ estado }) {
  const info = estadoInfo(estado)
  return <span style={{ background: info.color + '22', color: info.color, borderRadius: 999, padding: '3px 9px', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{info.label}</span>
}

export default function OportunidadesPage() {
  const [stats, setStats] = useState(null)
  const [oportunidades, setOportunidades] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState('')

  const [fEstado, setFEstado] = useState('')
  const [search, setSearch] = useState('')

  const [detalle, setDetalle] = useState(null)
  const [borrador, setBorrador] = useState('')
  const [generandoBorrador, setGenerandoBorrador] = useState(false)
  const [notas, setNotas] = useState('')

  const [keywordsOpen, setKeywordsOpen] = useState(false)
  const [keywords, setKeywords] = useState([])
  const [nuevaKeyword, setNuevaKeyword] = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const cargarStats = useCallback(async () => {
    try { setStats(await api.get('/api/admin/oportunidades/stats')) } catch {}
  }, [])

  const cargarOportunidades = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (fEstado) params.set('estado_interno', fEstado)
      if (search)  params.set('search', search)
      const data = await api.get(`/api/admin/oportunidades?${params}`)
      setOportunidades(data.oportunidades || []); setTotal(data.total || 0); setPage(p)
    } catch { setOportunidades([]) }
    finally { setLoading(false) }
  }, [fEstado, search])

  useEffect(() => { cargarStats(); cargarOportunidades(1) }, [cargarStats, cargarOportunidades])

  async function sincronizarAhora() {
    setSyncing(true)
    try {
      const r = await api.post('/api/admin/oportunidades/sync', {})
      showToast(`Sincronizado: ${r.relevantes} oportunidades relevantes de ${r.revisadas} revisadas`)
      cargarStats(); cargarOportunidades(page)
    } catch (e) { showToast(e.message || 'Error al sincronizar') }
    finally { setSyncing(false) }
  }

  async function abrirDetalle(op) {
    try {
      const full = await api.get(`/api/admin/oportunidades/${op.id}`)
      setDetalle(full)
      setBorrador(full.borrador_generado || '')
      setNotas(full.notas || '')
    } catch (e) { showToast(e.message || 'No se pudo cargar el detalle') }
  }

  async function cambiarEstado(estado_interno) {
    try {
      await api.put(`/api/admin/oportunidades/${detalle.id}`, { estado_interno })
      setDetalle(d => ({ ...d, estado_interno }))
      cargarStats(); cargarOportunidades(page)
    } catch (e) { showToast(e.message || 'No se pudo actualizar') }
  }

  async function guardarNotas() {
    try {
      await api.put(`/api/admin/oportunidades/${detalle.id}`, { notas })
      showToast('Notas guardadas')
    } catch (e) { showToast(e.message || 'No se pudo guardar') }
  }

  async function generarBorrador() {
    setGenerandoBorrador(true)
    try {
      const r = await api.post(`/api/admin/oportunidades/${detalle.id}/borrador`, {})
      setBorrador(r.borrador)
      showToast('Borrador generado — revísalo y complétalo antes de postular')
      cargarOportunidades(page)
    } catch (e) { showToast(e.message || 'No se pudo generar el borrador') }
    finally { setGenerandoBorrador(false) }
  }

  async function abrirKeywords() {
    setKeywordsOpen(true)
    try { setKeywords((await api.get('/api/admin/oportunidades/keywords')).keywords || []) } catch {}
  }

  async function agregarKeyword() {
    if (!nuevaKeyword.trim()) return
    try {
      await api.post('/api/admin/oportunidades/keywords', { palabra: nuevaKeyword.trim() })
      setNuevaKeyword('')
      setKeywords((await api.get('/api/admin/oportunidades/keywords')).keywords || [])
    } catch (e) { showToast(e.message || 'No se pudo agregar') }
  }

  async function toggleKeyword(k) {
    try {
      await api.put(`/api/admin/oportunidades/keywords/${k.id}`, { activo: !k.activo })
      setKeywords(ks => ks.map(x => x.id === k.id ? { ...x, activo: !x.activo } : x))
    } catch {}
  }

  async function eliminarKeyword(k) {
    try {
      await api.delete(`/api/admin/oportunidades/keywords/${k.id}`)
      setKeywords(ks => ks.filter(x => x.id !== k.id))
    } catch {}
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ padding: 24, maxWidth: 1280 }}>
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Oportunidades · Mercado Público</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
            Detección automática de licitaciones de ciberseguridad — la postulación final siempre la hace un analista DSTAC.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={abrirKeywords}
            style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            Palabras clave
          </button>
          <button onClick={sincronizarAhora} disabled={syncing}
            style={{ background: '#fff', color: NAVY, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: syncing ? 'default' : 'pointer', fontSize: 13, opacity: syncing ? 0.7 : 1 }}>
            {syncing ? 'Sincronizando…' : '↻ Sincronizar ahora'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <StatCard label="Nuevas"          value={stats?.nuevas ?? '—'}          color="#3C8DBC" />
        <StatCard label="Revisando"       value={stats?.revisando ?? '—'}       color="#C98A1E" />
        <StatCard label="En preparación"  value={stats?.en_preparacion ?? '—'}  color="#9B59B6" />
        <StatCard label="Postuladas"      value={stats?.postuladas ?? '—'}      color="#1D9E75" />
        <StatCard label="Score promedio"  value={stats?.score_promedio ?? '—'}  />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} style={SELECT_STYLE}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre u organismo…"
          style={{ flex: 1, minWidth: 200, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none', color: '#2C2C2A' }} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f7f4' }}>
              {['Score', 'Licitación', 'Organismo', 'Cierre', 'Monto est.', 'Estado', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '9px 10px', fontSize: 10.5, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #e2e0d8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#B4B2A9', fontSize: 13 }}>Cargando…</td></tr>
            ) : oportunidades.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#B4B2A9', fontSize: 13 }}>Sin oportunidades detectadas con estos filtros. Prueba "Sincronizar ahora".</td></tr>
            ) : oportunidades.map(o => (
              <tr key={o.id} onClick={() => abrirDetalle(o)} style={{ cursor: 'pointer' }}>
                <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: 800, color: PURPLE, borderBottom: '1px solid #f5f4ef' }}>{o.score}</td>
                <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#2C2C2A', borderBottom: '1px solid #f5f4ef', maxWidth: 320 }}>{o.nombre}</td>
                <td style={{ padding: '9px 10px', fontSize: 12, color: '#888780', borderBottom: '1px solid #f5f4ef' }}>{o.organismo || '—'}</td>
                <td style={{ padding: '9px 10px', fontSize: 12, color: '#888780', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>{o.fecha_cierre ? new Date(o.fecha_cierre).toLocaleDateString('es-CL') : '—'}</td>
                <td style={{ padding: '9px 10px', fontSize: 12, color: '#888780', borderBottom: '1px solid #f5f4ef', whiteSpace: 'nowrap' }}>{CLP(o.monto_estimado)}</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #f5f4ef' }}><Badge estado={o.estado_interno} /></td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #f5f4ef', color: PURPLE, fontSize: 12 }}>Ver →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => cargarOportunidades(page - 1)} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === 1 ? '#f8f7f4' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, color: page === 1 ? '#B4B2A9' : '#2C2C2A' }}>← Anterior</button>
          <span style={{ fontSize: 13, color: '#888780' }}>{page} / {totalPages}</span>
          <button onClick={() => cargarOportunidades(page + 1)} disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: page === totalPages ? '#f8f7f4' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, color: page === totalPages ? '#B4B2A9' : '#2C2C2A' }}>Siguiente →</button>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <FixedPortal>
        <div onClick={() => setDetalle(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,18,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#2C2C2A' }}>{detalle.nombre}</div>
              <Badge estado={detalle.estado_interno} />
            </div>
            <div style={{ fontSize: 12.5, color: '#888780', marginBottom: 16 }}>
              {detalle.organismo || 'Organismo no informado'} · Código {detalle.codigo_externo} · Score {detalle.score}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, fontSize: 12.5 }}>
              <div><strong>Cierre:</strong> {detalle.fecha_cierre ? new Date(detalle.fecha_cierre).toLocaleString('es-CL') : '—'}</div>
              <div><strong>Monto estimado:</strong> {CLP(detalle.monto_estimado)}</div>
            </div>

            {detalle.descripcion && (
              <div style={{ fontSize: 12.5, color: '#444441', background: '#f8f7f4', borderRadius: 8, padding: 12, marginBottom: 14, maxHeight: 120, overflowY: 'auto' }}>
                {detalle.descripcion}
              </div>
            )}

            {detalle.link_ficha && (
              <a href={detalle.link_ficha} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: PURPLE, fontWeight: 600, display: 'inline-block', marginBottom: 16 }}>
                Ver ficha oficial en Mercado Público →
              </a>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#888780', marginBottom: 6 }}>Estado interno</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ESTADOS.map(e => (
                  <button key={e.value} onClick={() => cambiarEstado(e.value)}
                    style={{
                      padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                      border: detalle.estado_interno === e.value ? `2px solid ${e.color}` : '1px solid #e2e0d8',
                      background: detalle.estado_interno === e.value ? e.color + '22' : '#fff',
                      color: detalle.estado_interno === e.value ? e.color : '#888780',
                    }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#888780', marginBottom: 6 }}>Notas internas</div>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} onBlur={guardarNotas} rows={2}
                placeholder="Observaciones del equipo sobre esta oportunidad…"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 12.5, color: '#2C2C2A', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#888780' }}>Borrador de propuesta (punto de partida — revisar antes de usar)</div>
              <button onClick={generarBorrador} disabled={generandoBorrador}
                style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12, opacity: generandoBorrador ? 0.7 : 1 }}>
                {generandoBorrador ? 'Generando…' : (borrador ? 'Regenerar borrador' : 'Generar borrador')}
              </button>
            </div>
            {borrador && (
              <textarea value={borrador} readOnly rows={10}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 11.5, fontFamily: 'monospace', color: '#444441', background: '#f8f7f4', resize: 'vertical', boxSizing: 'border-box' }} />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setDetalle(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cerrar</button>
            </div>
          </div>
        </div>
        </FixedPortal>
      )}

      {/* Modal palabras clave */}
      {keywordsOpen && (
        <FixedPortal>
        <div onClick={() => setKeywordsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,18,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#2C2C2A', marginBottom: 4 }}>Palabras clave de relevancia</div>
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 16 }}>Se usan para detectar licitaciones de ciberseguridad y calcular su puntaje.</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={nuevaKeyword} onChange={e => setNuevaKeyword(e.target.value)} placeholder="Nueva palabra clave…"
                onKeyDown={e => e.key === 'Enter' && agregarKeyword()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13, outline: 'none' }} />
              <button onClick={agregarKeyword} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Agregar</button>
            </div>

            {keywords.map(k => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f4ef' }}>
                <span style={{ fontSize: 13, color: k.activo ? '#2C2C2A' : '#B4B2A9', textDecoration: k.activo ? 'none' : 'line-through' }}>{k.palabra}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#888780' }}>peso {k.peso}</span>
                  <button onClick={() => toggleKeyword(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PURPLE, fontSize: 11.5 }}>{k.activo ? 'Desactivar' : 'Activar'}</button>
                  <button onClick={() => eliminarKeyword(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D8543F', fontSize: 11.5 }}>Eliminar</button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setKeywordsOpen(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cerrar</button>
            </div>
          </div>
        </div>
        </FixedPortal>
      )}

      {toast && <FixedPortal><div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1300 }}>{toast}</div></FixedPortal>}
    </div>
  )
}
