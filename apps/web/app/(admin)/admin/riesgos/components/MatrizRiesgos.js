'use client'

// Matriz de riesgo 5×5. Eje Y = probabilidad (5 arriba → 1 abajo),
// eje X = impacto (1 izq → 5 der). El color de cada celda sigue el nivel
// (probabilidad × impacto). Al hacer clic en una celda se filtra la tabla.
import { NIVEL, nivelDe } from './constants'

export default function MatrizRiesgos({ matriz = [], celda, onCeldaClick }) {
  // Agrupar riesgos por celda "prob-impacto"
  const porCelda = {}
  for (const r of matriz) {
    const k = `${r.probabilidad}-${r.impacto}`
    ;(porCelda[k] ||= []).push(r)
  }

  const probs = [5, 4, 3, 2, 1]
  const imps  = [1, 2, 3, 4, 5]

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e0d8', padding: '16px 18px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 12 }}>Matriz de riesgo</div>

      <div style={{ display: 'flex', gap: 8 }}>
        {/* Etiqueta vertical del eje Y */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, fontWeight: 600, color: '#888780', letterSpacing: 0.5 }}>
            Probabilidad →
          </span>
        </div>

        <div style={{ flex: 1 }}>
          {/* Grilla 5×5: filas = probabilidad (label + 5 celdas) */}
          <div style={{ display: 'grid', gridTemplateColumns: '26px repeat(5, 1fr)', gap: 4 }}>
            {probs.map(p => (
              <div key={`row-${p}`} style={{ display: 'contents' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#888780' }}>{p}</div>
                {imps.map(im => {
                  const k = `${p}-${im}`
                  const items = porCelda[k] ?? []
                  const niv = NIVEL[nivelDe(p, im)]
                  const sel = celda && celda.prob === p && celda.imp === im
                  return (
                    <div
                      key={k}
                      onClick={() => onCeldaClick(sel ? null : { prob: p, imp: im })}
                      title={items.length ? items.map(r => r.nombre).join('\n') : `P:${p} × I:${im}`}
                      style={{
                        position: 'relative', aspectRatio: '1 / 1', minHeight: 42,
                        background: niv.bg, border: sel ? `2px solid ${niv.color}` : `1px solid ${niv.color}55`,
                        borderRadius: 7, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        transition: 'transform .1s', transform: sel ? 'scale(1.04)' : 'none',
                      }}
                    >
                      {items.length > 0 && (
                        <span style={{ minWidth: 22, height: 22, padding: '0 5px', borderRadius: 11, background: niv.color, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {items.length}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            {/* Última fila: etiquetas del eje X (impacto) */}
            <div />
            {imps.map(im => (
              <div key={`xl-${im}`} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#888780', paddingTop: 2 }}>{im}</div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#888780', marginTop: 4 }}>Impacto →</div>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
        {Object.entries(NIVEL).map(([k, n]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888780' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: n.color }} /> {n.label}
          </span>
        ))}
        {celda && (
          <button onClick={() => onCeldaClick(null)} style={{ marginLeft: 'auto', fontSize: 11, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Quitar filtro de celda ×
          </button>
        )}
      </div>
    </div>
  )
}
