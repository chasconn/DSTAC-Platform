'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../../../../../../lib/api'

const STATUS_MAP = {
  pendiente: { bg: '#FAEEDA', color: '#633806', label: 'Pendiente'  },
  aprobada:  { bg: '#EAF3DE', color: '#27500A', label: 'Aprobada'   },
  rechazada: { bg: '#FCEBEB', color: '#791F1F', label: 'Rechazada'  },
}

function fileIcon(fileType) {
  if (!fileType) return { icon: '📄', color: '#888780' }
  if (fileType.includes('pdf'))   return { icon: '📕', color: '#E24B4A' }
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('xlsx'))
    return { icon: '📗', color: '#1D9E75' }
  if (fileType.includes('word') || fileType.includes('doc'))
    return { icon: '📘', color: '#185FA5' }
  if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg'))
    return { icon: '🖼️', color: '#534AB7' }
  return { icon: '📎', color: '#888780' }
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Mini donut SVG
function DonutRing({ pct = 0, size = 48, color = '#3C3489' }) {
  const r    = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.min(100, pct) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1efe8" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.22} fontWeight="800" fontFamily="inherit">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export default function EvidenciaPanel({ evidencia, slug, allEvidencias = [], onClose, onUpdated }) {
  const headers = { 'X-Company-Slug': slug }
  const [saving,   setSaving]   = useState(false)
  const [comment,  setComment]  = useState(evidencia.comments ?? '')
  const [expiring, setExpiring] = useState([])

  // Evidencias próximas a vencer (dentro de 30 días)
  useEffect(() => {
    const today = new Date()
    const in30  = new Date(today.getTime() + 30 * 24 * 3600 * 1000)
    setExpiring(
      allEvidencias.filter(e => {
        if (!e.expires_at) return false
        const d = new Date(e.expires_at)
        return d >= today && d <= in30
      })
    )
  }, [allEvidencias])

  // Cobertura: controles únicos con al menos 1 evidencia aprobada / total controles únicos
  const controlsWithEvidence = useMemo(() => {
    const set = new Set(allEvidencias.filter(e => e.status === 'aprobada').map(e => e.control_id))
    return set.size
  }, [allEvidencias])

  const totalControls = useMemo(() => {
    return new Set(allEvidencias.map(e => e.control_id)).size
  }, [allEvidencias])

  const coveragePct = totalControls ? Math.round((controlsWithEvidence / totalControls) * 100) : 0

  // Controles sin evidencia alguna — necesitamos la lista de controles total
  const controlsNoEvidence = useMemo(() => {
    const withEvidence = new Set(allEvidencias.map(e => e.control_id))
    // Agrupamos por control
    const all = allEvidencias.reduce((acc, e) => { acc[e.control_id] = e.control_name; return acc }, {})
    // No podemos saber controles sin evidencia sin la lista completa, mostramos los que sí
    return controlsWithEvidence
  }, [allEvidencias])

  async function handleRevisar(status) {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/nist/evidencias/${evidencia.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments: comment })
      })
      onUpdated?.({ ...evidencia, status, comments: comment })
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const fi = fileIcon(evidencia.file_type)
  const st = STATUS_MAP[evidencia.status] ?? STATUS_MAP.pendiente

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 94vw)',
      background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column', zIndex: 100, overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1efe8', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 28 }}>{fi.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {evidencia.original_name}
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>
              {formatBytes(evidencia.file_size)} · {evidencia.file_type?.split('/').pop()?.toUpperCase() ?? 'Archivo'}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, padding: '0 0 0 8px', flexShrink: 0, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Control + estado */}
        <div style={{ background: '#fafaf8', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Control asociado</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#534AB7', fontWeight: 700 }}>{evidencia.control_id}</span>
              <div style={{ fontSize: 12, color: '#2C2C2A', marginTop: 2, fontWeight: 500 }}>{evidencia.control_name}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{evidencia.category_name}</div>
            </div>
            <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>
              {st.label}
            </span>
          </div>
        </div>

        {/* Subido por */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 2 }}>Subido por</div>
            <div style={{ fontSize: 12, color: '#2C2C2A', fontWeight: 500 }}>{evidencia.uploaded_by_name ?? 'DSTAC'}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 2 }}>Fecha</div>
            <div style={{ fontSize: 12, color: '#2C2C2A', fontWeight: 500 }}>
              {evidencia.created_at ? new Date(evidencia.created_at).toLocaleDateString('es-CL') : '—'}
            </div>
          </div>
          {evidencia.expires_at && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#888780', marginBottom: 2 }}>Vence</div>
              <div style={{ fontSize: 12, color: expiring.some(e => e.id === evidencia.id) ? '#791F1F' : '#2C2C2A', fontWeight: 500 }}>
                {new Date(evidencia.expires_at).toLocaleDateString('es-CL')}
              </div>
            </div>
          )}
        </div>

        {/* Cobertura de evidencias */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e0d8', padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2A', marginBottom: 12 }}>Cobertura de evidencias</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <DonutRing pct={coveragePct} size={56} color={coveragePct >= 61 ? '#1D9E75' : coveragePct >= 41 ? '#EF9F27' : '#E24B4A'} />
            <div>
              <div style={{ fontSize: 12, color: '#888780' }}><b style={{ color: '#2C2C2A' }}>{controlsWithEvidence}</b> de {totalControls} controles con evidencia aprobada</div>
              {expiring.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#791F1F', background: '#FCEBEB', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                  ⚠ {expiring.length} evidencia{expiring.length > 1 ? 's' : ''} próxima{expiring.length > 1 ? 's' : ''} a vencer
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evidencias próximas a vencer */}
        {expiring.length > 0 && (
          <div style={{ background: '#FAEEDA', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#633806', marginBottom: 8 }}>Próximas a vencer (30 días)</div>
            {expiring.slice(0, 4).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#633806', marginBottom: 4 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{e.original_name}</span>
                <span style={{ flexShrink: 0, fontWeight: 600 }}>{new Date(e.expires_at).toLocaleDateString('es-CL')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notas / comentario de revisión */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: 6 }}>Comentario de revisión</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Observaciones sobre esta evidencia…"
            rows={3}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e0d8', borderRadius: 8, fontSize: 12, color: '#2C2C2A', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {evidencia.file_path && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/${evidencia.file_path}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', textAlign: 'center', padding: '9px 0', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#534AB7', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
            >
              Descargar archivo
            </a>
          )}
          {evidencia.status === 'pendiente' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleRevisar('aprobada')} disabled={saving}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#EAF3DE', color: '#27500A', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                Aprobar
              </button>
              <button onClick={() => handleRevisar('rechazada')} disabled={saving}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#FCEBEB', color: '#791F1F', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                Rechazar
              </button>
            </div>
          )}
          {evidencia.status !== 'pendiente' && (
            <button onClick={() => handleRevisar('pendiente')} disabled={saving}
              style={{ padding: '9px 0', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#888780', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              Marcar como pendiente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
