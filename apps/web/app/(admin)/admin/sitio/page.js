'use client'

// Gestor del "Trust bar" — los logos de clientes que se muestran en el home de dstac.cl.
// Habla con /api/admin/trustbar, que a su vez es proxy a la API del sitio (los datos
// y las imágenes siguen viviendo en el sitio; el home no cambia).
import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../../../lib/api'
import { confirmDstac } from '../../../../components/admin/ConfirmDialog'

export default function SitioPage() {
  const [data,    setData]    = useState(null)   // { enabled, heading, items }
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [toast,   setToast]   = useState(null)
  const [heading, setHeading] = useState('')
  const [savingHeading, setSavingHeading] = useState(false)

  const [upNombre, setUpNombre] = useState('')
  const [subiendo,  setSubiendo] = useState(false)
  const fileRef = useRef(null)

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3200) }

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const d = await api.get('/api/admin/trustbar')
      setData(d); setHeading(d.heading || '')
    } catch (err) {
      setError(err.message || 'No se pudo cargar el trust bar')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function toggleEnabled() {
    const next = !data.enabled
    try { await api.patch('/api/admin/trustbar/config', { enabled: next }); setData(d => ({ ...d, enabled: next })); showToast(next ? 'Sección visible en el home' : 'Sección oculta en el home') }
    catch (err) { showToast(err.message || 'Error', 'error') }
  }

  async function guardarHeading() {
    setSavingHeading(true)
    try { await api.patch('/api/admin/trustbar/config', { heading }); setData(d => ({ ...d, heading })); showToast('Encabezado actualizado') }
    catch (err) { showToast(err.message || 'Error', 'error') }
    finally { setSavingHeading(false) }
  }

  async function subirLogo(e) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!upNombre.trim()) return showToast('Indica el nombre', 'error')
    if (!file) return showToast('Elige una imagen', 'error')
    if (file.size > 1048576) return showToast('El logo supera 1 MB', 'error')
    setSubiendo(true)
    try {
      const file_base64 = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result).split(',')[1])  // quita el prefijo data:...;base64,
        r.onerror = reject
        r.readAsDataURL(file)
      })
      await api.post('/api/admin/trustbar/logo', { nombre: upNombre.trim(), file_base64 })
      setUpNombre(''); if (fileRef.current) fileRef.current.value = ''
      showToast('Logo agregado')
      cargar()
    } catch (err) { showToast(err.message || 'No se pudo subir', 'error') }
    finally { setSubiendo(false) }
  }

  async function eliminar(id) {
    if (!await confirmDstac('¿Eliminar este logo del home?', { titulo: 'Eliminar logo', textoConfirmar: 'Eliminar', peligro: true })) return
    try { await api.delete(`/api/admin/trustbar/logo/${id}`); showToast('Logo eliminado'); cargar() }
    catch (err) { showToast(err.message || 'Error', 'error') }
  }

  async function toggleVisible(id) {
    try { await api.patch(`/api/admin/trustbar/logo/${id}/toggle`); cargar() }
    catch (err) { showToast(err.message || 'Error', 'error') }
  }

  async function mover(idx, dir) {
    const items = [...data.items]
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    ;[items[idx], items[j]] = [items[j], items[idx]]
    setData(d => ({ ...d, items }))  // optimista
    try { await api.patch('/api/admin/trustbar/reorder', { ids: items.map(i => i.id) }) }
    catch (err) { showToast(err.message || 'Error', 'error'); cargar() }
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>Sitio web · Trust bar</h1>
      <p style={{ margin: '4px 0 20px', fontSize: 13, color: '#888780' }}>
        Logos de clientes que aparecen en el home de dstac.cl. Los cambios se reflejan en el sitio al instante.
      </p>

      {toast && (
        <div style={{ background: toast.type === 'error' ? '#FCEBEB' : '#EAF3DE', border: '1px solid', borderColor: toast.type === 'error' ? '#E8A6A6' : '#A3D67A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: toast.type === 'error' ? '#791F1F' : '#27500A', fontWeight: 500, marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}

      {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: 13 }}>Cargando…</div>}

      {!loading && error && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '18px 20px', color: '#9A3412', fontSize: 13.5, lineHeight: 1.5 }}>
          <strong>No se pudo cargar el trust bar.</strong><br />{error}
          <div style={{ marginTop: 8, color: '#7C2D12' }}>
            Si dice que falta <code>PUBLIC_LEADS_SECRET</code>, agrégala en el servicio <b>api</b> (EasyPanel) con el mismo valor del sitio y vuelve a desplegar.
          </div>
          <button onClick={cargar} style={{ marginTop: 12, padding: '7px 14px', borderRadius: 8, border: '1px solid #FDBA74', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#9A3412' }}>Reintentar</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Configuración de la sección */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '18px 20px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Sección visible en el home</div>
                <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>Si la ocultas, la franja de logos no aparece en dstac.cl.</div>
              </div>
              <button onClick={toggleEnabled}
                style={{ width: 52, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', background: data.enabled ? '#1D9E75' : '#cfcdc4', position: 'relative', transition: 'background .15s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: data.enabled ? 27 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888780', display: 'block', marginBottom: 6 }}>Encabezado de la sección</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={heading} onChange={e => setHeading(e.target.value)} placeholder="Ej. Clientes que confían en nosotros"
                  style={{ flex: 1, minWidth: 240, padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13.5, color: '#2C2C2A', outline: 'none' }} />
                <button onClick={guardarHeading} disabled={savingHeading || heading === data.heading}
                  style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: heading === data.heading ? '#cfcdc4' : '#3C3489', color: '#fff', cursor: heading === data.heading ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {savingHeading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>

          {/* Subir logo */}
          <form onSubmit={subirLogo} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '18px 20px', marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 12 }}>Agregar logo</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={upNombre} onChange={e => setUpNombre(e.target.value)} placeholder="Nombre del cliente"
                style={{ flex: '1 1 200px', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e0d8', fontSize: 13.5, color: '#2C2C2A', outline: 'none' }} />
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
                style={{ flex: '1 1 220px', fontSize: 13, color: '#888780' }} />
              <button type="submit" disabled={subiendo}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3C3489', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {subiendo ? 'Subiendo…' : '+ Agregar'}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: '#B4B2A9', marginTop: 8 }}>PNG, JPG o WEBP · máx. 1 MB. Sube solo logos con autorización del cliente.</div>
          </form>

          {/* Lista de logos */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            {data.items.length} logo{data.items.length !== 1 ? 's' : ''}
          </div>
          {data.items.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '40px', textAlign: 'center', color: '#888780', fontSize: 13 }}>
              Aún no hay logos. La sección no aparece en el home hasta que agregues al menos uno.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {data.items.map((it, idx) => (
                <div key={it.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', overflow: 'hidden', opacity: it.visible ? 1 : 0.55 }}>
                  <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0c16', padding: 14 }}>
                    <img src={it.url} alt={it.nombre} style={{ maxHeight: 80, maxWidth: '90%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nombre}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <IconBtn onClick={() => mover(idx, -1)} disabled={idx === 0} title="Subir">↑</IconBtn>
                        <IconBtn onClick={() => mover(idx, 1)} disabled={idx === data.items.length - 1} title="Bajar">↓</IconBtn>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <IconBtn onClick={() => toggleVisible(it.id)} title={it.visible ? 'Ocultar' : 'Mostrar'}>{it.visible ? '👁' : '🚫'}</IconBtn>
                        <IconBtn onClick={() => eliminar(it.id)} title="Eliminar" danger>🗑</IconBtn>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function IconBtn({ onClick, title, disabled, danger, children }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      style={{ background: 'none', border: '1px solid #e2e0d8', borderRadius: 6, cursor: disabled ? 'default' : 'pointer', padding: '4px 8px', fontSize: 13, opacity: disabled ? 0.4 : 1, color: danger ? '#C0392B' : '#444441' }}>
      {children}
    </button>
  )
}
