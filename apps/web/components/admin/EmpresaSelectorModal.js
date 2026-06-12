'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

export default function EmpresaSelectorModal({ onClose, empresaActiva }) {
  const router  = useRouter()
  const [search, setSearch]     = useState('')
  const [internas, setInternas] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const searchRef  = useRef(null)
  const [mounted, setMounted] = useState(false)

  // Portal necesita document.body — solo disponible tras el mount en el cliente
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // 1. Quitar foco del elemento activo en el fondo antes de que el modal tome el control
    if (document.activeElement) document.activeElement.blur()

    // 2. Dar foco al buscador del modal en el siguiente frame de pintura
    const frame = requestAnimationFrame(() => {
      searchRef.current?.focus()
    })

    // 3. Marcar body para que el CSS suprima outlines del fondo
    document.body.setAttribute('data-modal-open', 'true')

    return () => {
      cancelAnimationFrame(frame)
      document.body.removeAttribute('data-modal-open')
    }
  }, [])

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/admin/empresas/selector', { credentials: 'include' })
        const data = await res.json()
        setInternas(data.internas ?? [])
        setClientes(data.clientes ?? [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    cargar()
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function seleccionar(empresa) {
    const data = {
      id:      empresa.id,
      name:    empresa.name,
      slug:    empresa.slug,
      plan:    empresa.plan_name,
      interno: empresa.is_internal === 1,
    }
    localStorage.setItem('empresa_activa', JSON.stringify(data))
    window.dispatchEvent(new Event('empresa_activa_changed'))
    onClose()
    router.push('/admin/activos')
  }

  const clientesFiltrados = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (!mounted) return null

  // createPortal saca el modal del árbol DOM del sidebar y lo monta en document.body.
  // Esto lo pone en el contexto de apilamiento raíz, donde z-index: 200 gana sin competencia.
  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="empresa-modal-overlay"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        background: '#fff', border: '0.5px solid #e2e0d8',
        borderRadius: 12,
        width: 400, maxWidth: '95vw', maxHeight: 520,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '0.5px solid #e2e0d8', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>Seleccionar empresa</span>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888780', lineHeight: 1, padding: 2 }}>
              ×
            </button>
          </div>
          {/* Buscador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f7f4', border: '0.5px solid #e2e0d8', borderRadius: 8, padding: '0 12px', height: 36 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar empresa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: '#2C2C2A', width: '100%', pointerEvents: 'auto' }}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#888780', padding: 24 }}>Cargando empresas...</div>
          ) : (
            <>
              {/* DSTAC Interno */}
              {internas.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 16px 4px' }}>
                    DSTAC
                  </div>
                  {internas.map(empresa => {
                    const isActive = empresaActiva?.slug === empresa.slug
                    return (
                      <div
                        key={empresa.id}
                        onClick={() => seleccionar(empresa)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 16px', cursor: 'pointer',
                          background: isActive ? '#EEEDFE' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8f7f4' }}
                        onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#EEEDFE' : 'transparent' }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#26215C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#EEEDFE', flexShrink: 0 }}>
                          D
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {empresa.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#888780' }}>Gestión interna</div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 500, padding: '2px 7px', borderRadius: 8, background: '#EEEDFE', color: '#3C3489', flexShrink: 0 }}>
                          Interno
                        </span>
                        {isActive && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ height: 0.5, background: '#e2e0d8', margin: '8px 16px' }} />
                </>
              )}

              {/* Clientes */}
              <div style={{ fontSize: 10, fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 16px 4px' }}>
                Clientes ({clientesFiltrados.length})
              </div>
              {clientesFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', fontSize: 12, color: '#888780', padding: 20 }}>
                  No se encontraron empresas
                </div>
              ) : (
                clientesFiltrados.map(empresa => {
                  const initials = empresa.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                  const isActive = empresaActiva?.slug === empresa.slug
                  const bgColor  = empresa.theme_color ? `${empresa.theme_color}22` : '#EEEDFE'
                  const txColor  = empresa.theme_color ?? '#3C3489'

                  return (
                    <div
                      key={empresa.id}
                      onClick={() => seleccionar(empresa)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 16px', cursor: 'pointer',
                        background: isActive ? '#EEEDFE' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8f7f4' }}
                      onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#EEEDFE' : 'transparent' }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: bgColor, color: txColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {empresa.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#888780' }}>Plan {empresa.plan_name}</div>
                      </div>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: empresa.status === 'active' ? '#1D9E75' : '#EF9F27', flexShrink: 0 }} title={empresa.status === 'active' ? 'Activa' : 'Suspendida'} />
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
