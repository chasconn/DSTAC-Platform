'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../../lib/api'
import FixedPortal from '../../../../components/admin/FixedPortal'
import { confirmDstac } from '../../../../components/admin/ConfirmDialog'

const NAVY = '#1a1740', PURPLE = '#534AB7'

function estadoStyle(s) {
  if (s === 'ACTIVE')       return { label: 'Activo',        color: '#27500A', bg: '#EAF3DE' }
  if (s === 'PROVISIONING') return { label: 'Inscribiendo',  color: '#854F0B', bg: '#FAEEDA' }
  if (s === 'DISABLED')     return { label: 'Deshabilitado', color: '#791F1F', bg: '#FCEBEB' }
  if (s === 'DELETED')      return { label: 'Borrado',       color: '#5A5A57', bg: '#EFEFEC' }
  return { label: s || '—', color: '#5A5A57', bg: '#EFEFEC' }
}
function fechaHora(d) {
  if (!d) return '—'
  let date = new Date(d)
  if (isNaN(date.getTime())) date = new Date(String(d).replace(' ', 'T') + 'Z')
  return isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function MdmPage() {
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [configured, setConfigured] = useState(true)
  const [devices, setDevices]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [enroll, setEnroll]         = useState(null)   // { qrPng, value, expiration, mode }
  const [enrolling, setEnrolling]   = useState(false)
  const [chooser, setChooser]       = useState(false)  // selector de modo de inscripción
  const [toast, setToast]           = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('empresa_activa')
    if (raw) { try { setEmpresaActiva(JSON.parse(raw)) } catch {} }
  }, [])

  const slug    = empresaActiva?.slug
  const headers = slug ? { 'X-Company-Slug': slug } : {}
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const cargar = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const d = await api.get('/api/admin/mdm/devices', headers)
      setConfigured(d.configured)
      setDevices(d.devices ?? [])
    } catch { showToast('No se pudieron cargar los dispositivos') }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { cargar() }, [slug])

  async function sincronizar() {
    if (!slug) return
    setLoading(true)
    try { const r = await api.post('/api/admin/mdm/sync', {}, headers); showToast(`Sincronizado: ${r.synced} dispositivo(s)`); await cargar() }
    catch (e) { showToast(e.message || 'Error al sincronizar') }
    finally { setLoading(false) }
  }

  async function inscribir(mode) {
    if (!slug) return
    setChooser(false)
    setEnrolling(true)
    try { const r = await api.post('/api/admin/mdm/enroll', { mode }, headers); setEnroll({ ...r, mode }) }
    catch (e) { showToast(e.message || 'No se pudo generar la inscripción') }
    finally { setEnrolling(false) }
  }

  async function comando(device_name, type) {
    const txt = { LOCK: 'bloquear', RESET_PASSWORD: 'resetear el PIN de', REBOOT: 'reiniciar', WIPE: 'BORRAR (restaurar de fábrica)' }[type]
    if (!await confirmDstac(`¿Seguro que quieres ${txt} este dispositivo?`, { titulo: 'Comando MDM', textoConfirmar: 'Confirmar', peligro: type === 'WIPE' })) return
    try { await api.post('/api/admin/mdm/devices/comando', { device_name, type }, headers); showToast('Comando enviado'); setTimeout(cargar, 1200) }
    catch (e) { showToast(e.message || 'No se pudo enviar el comando') }
  }

  if (!slug) return <div style={{ padding: 24 }}>Selecciona una empresa para gestionar sus dispositivos móviles.</div>

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(120deg, ${NAVY}, ${PURPLE})`, borderRadius: 14, padding: '22px 26px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>📱 MDM — Dispositivos móviles</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{empresaActiva?.name} · gestión de teléfonos Android</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={sincronizar} disabled={loading || !configured}
            style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '9px 16px', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Cargando…' : '↻ Sincronizar'}
          </button>
          <button onClick={() => setChooser(true)} disabled={enrolling || !configured}
            style={{ background: '#fff', color: NAVY, border: 'none', borderRadius: 999, padding: '9px 18px', fontWeight: 700, cursor: 'pointer' }}>
            {enrolling ? 'Generando…' : '+ Inscribir dispositivo'}
          </button>
        </div>
      </div>

      {/* Aviso de configuración pendiente */}
      {!configured && (
        <div style={{ marginTop: 18, background: '#FFF6DD', border: '1px solid #E9D9A6', borderRadius: 12, padding: '16px 18px', color: '#6B5300' }}>
          <b>MDM aún no configurado.</b> Falta conectar la cuenta de Google (Android Management API).
          Sigue los pasos de <code>deploy/mdm/README.md</code> y define <code>MDM_ENTERPRISE</code> y la
          service account (<code>MDM_SA_JSON</code>) en las variables del servicio <b>api</b>.
        </div>
      )}

      {/* Lista de dispositivos */}
      <div style={{ marginTop: 20 }}>
        {devices.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 28, textAlign: 'center', color: '#6A675E' }}>
            No hay dispositivos inscritos en esta empresa todavía.<br />
            Usa <b>“Inscribir dispositivo”</b> para generar el código QR.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {devices.map((d) => {
              const st = estadoStyle(d.state)
              return (
                <div key={d.id} style={{ background: '#fff', border: '1px solid #ECEAE3', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#2C2C2A' }}>{d.brand || 'Android'} {d.model || ''}</div>
                      <div style={{ fontSize: 12, color: '#8A877E' }}>Android {d.os_version || '—'}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '3px 9px', borderRadius: 999 }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6A675E', marginTop: 10 }}>Últ. reporte: {fechaHora(d.last_sync)}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    <button onClick={() => comando(d.device_name, 'LOCK')}           style={btn(PURPLE)}>🔒 Bloquear</button>
                    <button onClick={() => comando(d.device_name, 'RESET_PASSWORD')} style={btn('#5A5A57')}>PIN</button>
                    <button onClick={() => comando(d.device_name, 'REBOOT')}         style={btn('#5A5A57')}>⟳ Reiniciar</button>
                    <button onClick={() => comando(d.device_name, 'WIPE')}           style={btn('#B23B3B')}>🗑 Borrar</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selector de modo de inscripción */}
      {chooser && (
        <FixedPortal>
        <div onClick={() => setChooser(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 460 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 4 }}>¿Qué tipo de equipo vas a inscribir?</div>
            <div style={{ fontSize: 12.5, color: '#6A675E', marginBottom: 16 }}>Elige según el estado del teléfono.</div>
            <button onClick={() => inscribir('managed')} style={{ display: 'block', width: '100%', textAlign: 'left', background: '#F7F6F2', border: '1px solid #ECEAE3', borderRadius: 12, padding: 14, marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, color: '#2C2C2A' }}>📦 Equipo nuevo (totalmente gestionado)</div>
              <div style={{ fontSize: 12, color: '#6A675E', marginTop: 3 }}>Teléfono de fábrica o restaurado. DSTAC controla todo el equipo.</div>
            </button>
            <button onClick={() => inscribir('work_profile')} style={{ display: 'block', width: '100%', textAlign: 'left', background: '#F7F6F2', border: `1px solid ${PURPLE}`, borderRadius: 12, padding: 14, cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, color: NAVY }}>📱 Equipo en uso (perfil de trabajo)</div>
              <div style={{ fontSize: 12, color: '#6A675E', marginTop: 3 }}>Teléfono que ya usas. <b>No se borra</b>: crea una burbuja de trabajo; lo personal queda privado.</div>
            </button>
            <button onClick={() => setChooser(false)} style={{ marginTop: 14, background: 'transparent', color: '#6A675E', border: 'none', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
        </FixedPortal>
      )}

      {/* Modal de inscripción (QR) */}
      {enroll && (
        <FixedPortal>
        <div onClick={() => setEnroll(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 26, maxWidth: 440, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>
              {enroll.mode === 'work_profile' ? 'Inscribir equipo en uso (perfil de trabajo)' : 'Inscribir equipo nuevo'}
            </div>
            {enroll.mode === 'work_profile' ? (
              <ol style={{ textAlign: 'left', fontSize: 13, color: '#444441', lineHeight: 1.6, margin: '12px 0' }}>
                <li>En el teléfono, instala <b>“Android Device Policy”</b> desde Google Play.</li>
                <li>Ábrela → opción <b>escanear código QR</b> → <b>escanea este código</b>.</li>
                <li>Se crea un <b>perfil de trabajo</b> separado. Tus datos personales <b>no se tocan</b>.</li>
              </ol>
            ) : (
              <ol style={{ textAlign: 'left', fontSize: 13, color: '#444441', lineHeight: 1.6, margin: '12px 0' }}>
                <li>En un teléfono <b>recién restaurado de fábrica</b>, toca <b>6 veces</b> la pantalla de bienvenida.</li>
                <li>Se abrirá un escáner de QR → <b>escanea este código</b>.</li>
                <li>El teléfono queda gestionado por DSTAC con la política base.</li>
              </ol>
            )}
            {enroll.qrPng
              ? <img src={enroll.qrPng} alt="QR de inscripción" style={{ width: 260, height: 260 }} />
              : <div style={{ fontSize: 12, color: '#B23B3B' }}>No se pudo generar el QR (revisa la dependencia <code>qrcode</code>).</div>}
            <div style={{ fontSize: 11, color: '#8A877E', marginTop: 8 }}>Válido hasta {fechaHora(enroll.expiration)}</div>
            <button onClick={() => setEnroll(null)} style={{ marginTop: 14, background: NAVY, color: '#fff', border: 'none', borderRadius: 999, padding: '9px 22px', fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
        </FixedPortal>
      )}

      {toast && <FixedPortal><div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '11px 20px', borderRadius: 999, fontSize: 13, zIndex: 1100 }}>{toast}</div></FixedPortal>}
    </div>
  )
}

function btn(color) {
  return { background: '#fff', color, border: `1px solid ${color}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
}
