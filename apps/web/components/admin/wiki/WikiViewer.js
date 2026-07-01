'use client'

import { renderWikiMarkdown } from './wikiMarkdown'

export default function WikiViewer({ nota, onWikiLinkClick, onEditar, onEliminar, onAbrirAdjunto, onEliminarAdjunto }) {
  if (!nota) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C2C2A' }}>{nota.titulo}</h1>
            <span style={badgeStyle(nota.visibilidad)}>
              {nota.visibilidad === 'equipo' ? '👥 Equipo' : '🔒 Privada'}
            </span>
            {nota.es_fantasma === 1 && <span style={{ ...badgeStyle('fantasma') }}>👻 Sin escribir</span>}
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: '#888780' }}>
            {nota.carpeta && <>📁 {nota.carpeta} · </>}
            de <b>{nota.es_mia ? 'ti' : (nota.propietario_nombre || 'otro usuario')}</b>
            {nota.tags?.length > 0 && <> · {nota.tags.map(t => `#${t}`).join(' ')}</>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {nota.puedo_editar && (
            <button onClick={onEditar} style={btnSecondary}>✎ Editar</button>
          )}
          {nota.es_mia && (
            <button onClick={onEliminar} style={btnDanger}>Eliminar</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {nota.es_fantasma === 1 ? (
            <div style={{ color: '#888780', fontSize: 13.5, fontStyle: 'italic' }}>
              Esta nota todavía no tiene contenido — fue creada automáticamente por un enlace [[{nota.titulo}]].
              {nota.puedo_editar && ' Haz clic en "Editar" para escribirla.'}
            </div>
          ) : (
            <div className="wiki-content">
              {renderWikiMarkdown(nota.contenido, { onWikiLinkClick })}
            </div>
          )}

          {nota.adjuntos?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#7F77DD', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Adjuntos</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {nota.adjuntos.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e2e0d8', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                    <a href="#" onClick={e => { e.preventDefault(); onAbrirAdjunto?.(a) }} style={{ color: '#3C3489', textDecoration: 'none', fontWeight: 600 }}>
                      {a.mimetype.startsWith('image/') ? '🖼️' : '📄'} {a.filename}
                    </a>
                    {nota.puedo_editar && onEliminarAdjunto && (
                      <button onClick={() => onEliminarAdjunto(a)} style={{ background: 'none', border: 'none', color: '#B23434', cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel lateral: backlinks / enlaces salientes */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <PanelEnlaces titulo={`Enlaza a (${nota.enlaces_salientes?.length ?? 0})`} items={nota.enlaces_salientes} onClick={onWikiLinkClick} vacio="Esta nota no enlaza a otras." />
          <PanelEnlaces titulo={`Mencionada en (${nota.backlinks?.length ?? 0})`} items={nota.backlinks} onClick={onWikiLinkClick} vacio="Todavía nadie enlaza aquí." />
        </div>
      </div>
    </div>
  )
}

function PanelEnlaces({ titulo, items, onClick, vacio }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#7F77DD', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{titulo}</div>
      {!items?.length ? (
        <div style={{ fontSize: 12, color: '#B4B2A9' }}>{vacio}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(n => (
            <a key={n.id} href="#" onClick={e => { e.preventDefault(); onClick?.(n.titulo) }}
              style={{ fontSize: 12.5, color: n.es_fantasma ? '#B4B2A9' : '#3C3489', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              {n.es_fantasma ? '👻' : '📄'} {n.titulo}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function badgeStyle(tipo) {
  const map = {
    equipo:   { bg: 'rgba(29,158,117,.12)', fg: '#1D9E75' },
    privada:  { bg: 'rgba(60,52,137,.10)',  fg: '#3C3489' },
    fantasma: { bg: 'rgba(180,178,169,.18)', fg: '#888780' },
  }
  const c = map[tipo] || map.privada
  return { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: c.bg, color: c.fg }
}

const btnSecondary = { padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', color: '#444441', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }
const btnDanger = { padding: '7px 14px', borderRadius: 8, border: '1px solid #F0C4C4', background: '#fff', color: '#B23434', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }
