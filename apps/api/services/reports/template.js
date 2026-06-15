// Shared HTML/CSS helpers for all PDF reports — brand-aligned with DSTAC identity

const NAVY   = '#1a1740'
const PURPLE = '#534AB7'
const LOGO_PURPLE = '#7C4FDA'

// ── Logo: PNG real embebido (data URI). Fallback a recreación CSS si falta. ─────
let LOGO_DATA = ''
try {
  const fs = require('fs'); const path = require('path')
  LOGO_DATA = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../../assets/logo-dstac.png')).toString('base64')
} catch { /* sin archivo → fallback */ }

const LOGO_HTML = LOGO_DATA
  ? `<img src="${LOGO_DATA}" alt="DSTAC" style="height:44px;width:auto;display:block;" />`
  : `
<div style="display:flex;flex-direction:column;line-height:1;">
  <div style="line-height:0.9;">
    <span style="font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:28px;color:white;letter-spacing:-0.5px;">DS</span><span style="font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:28px;color:${LOGO_PURPLE};letter-spacing:-0.5px;">TAC</span>
  </div>
  <div style="font-size:7px;color:rgba(255,255,255,0.55);letter-spacing:2.5px;font-weight:400;font-family:Arial,sans-serif;">TACTICAL SECURITY</div>
</div>
`

// ── Shared CSS ────────────────────────────────────────────────────────────────
const CSS = `<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,Helvetica,sans-serif; background:white; color:#2C2C2A; font-size:13px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.page { break-after:page; min-height:297mm; display:flex; flex-direction:column; background:white; }
.page:last-child { break-after:auto; }
.page-body { flex:1; padding:32px 50px 16px; }
.page-header-strip { background:${NAVY}; padding:18px 50px; display:flex; align-items:center; justify-content:space-between; }
.page-footer { padding:10px 50px 18px; border-top:0.5px solid #e2e0d8; display:flex; justify-content:space-between; font-size:10px; color:#B4B2A9; margin-top:auto; }
.title { font-size:24px; font-weight:700; color:${NAVY}; margin-bottom:5px; line-height:1.2; }
.subtitle { font-size:11px; font-weight:700; color:${PURPLE}; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:22px; }
.sec-label { color:${PURPLE}; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:14px; }
.card { background:white; border:1px solid #e2e0d8; border-radius:10px; padding:16px 18px; }
.card-dark { background:${NAVY}; border-radius:14px; padding:26px 32px; display:flex; align-items:center; justify-content:space-between; margin-bottom:26px; }
.grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }
.grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
.bar-track { height:7px; background:#f1efe8; border-radius:99px; overflow:hidden; margin-top:8px; }
.bar-fill { height:100%; border-radius:99px; }
.badge { display:inline-block; font-size:10px; font-weight:700; padding:2px 9px; border-radius:20px; }
.risk-badge { padding:10px 22px; border-radius:40px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
.section-divider { height:0.5px; background:#f1efe8; margin:20px 0; }
.quote-block { border-left:4px solid ${PURPLE}; background:#EEEDFE; padding:14px 18px; border-radius:0 8px 8px 0; margin-bottom:20px; font-size:12px; color:#3C3489; line-height:1.6; }
.highlight-green { background:#EAF3DE; border-radius:10px; padding:14px 18px; }
.highlight-red { background:#FCEBEB; border-radius:10px; padding:14px 18px; }
.finding-item { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; background:white; border:1px solid #e2e0d8; border-radius:8px; margin-bottom:6px; }
.finding-dot-critical { width:8px; height:8px; border-radius:50%; background:#E24B4A; flex-shrink:0; margin-top:4px; }
.finding-dot-warning { width:8px; height:8px; border-radius:50%; background:#EF9F27; flex-shrink:0; margin-top:4px; }
.finding-dot-ok { width:8px; height:8px; border-radius:50%; background:#1D9E75; flex-shrink:0; margin-top:4px; }
.rec-item { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; background:#f8f7f4; border-radius:8px; margin-bottom:6px; font-size:12px; color:#2C2C2A; line-height:1.5; }
.cta-box { background:${PURPLE}; border-radius:14px; padding:28px 36px; text-align:center; color:white; margin-top:20px; }
</style>`

// ── Builder helpers ───────────────────────────────────────────────────────────

function colorFor(pct) {
  if (pct >= 70) return '#1D9E75'
  if (pct >= 40) return '#EF9F27'
  return '#E24B4A'
}

function levelText(score) {
  if (score >= 70) return 'NIVEL ALTO'
  if (score >= 40) return 'NIVEL MEDIO'
  return 'NIVEL BAJO'
}

function buildHeader(sectionTitle = '') {
  return `
<div class="page-header-strip">
  ${LOGO_HTML}
  <span style="color:rgba(255,255,255,0.45);font-size:11px;">${sectionTitle}</span>
</div>`
}

function buildFooter(pageNum, totalPages) {
  return `
<div class="page-footer">
  <span>DSTAC · DS Tactical Security</span>
  <span>Página ${pageNum} de ${totalPages}</span>
</div>`
}

function buildBar(pct, color) {
  const w = Math.min(100, Math.max(0, pct))
  return `<div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${color};"></div></div>`
}

function buildAreaCard(label, pct) {
  const color = colorFor(pct)
  return `
<div class="card">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:12px;font-weight:600;color:#2C2C2A;">${label}</span>
    <span style="font-size:14px;font-weight:700;color:${color};">${pct}%</span>
  </div>
  ${buildBar(pct, color)}
</div>`
}

function buildMetricCard(value, label, sublabel = '', borderColor = PURPLE) {
  return `
<div class="card" style="border-top:3px solid ${borderColor};">
  <div style="font-size:11px;color:#888780;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">${label}</div>
  <div style="font-size:26px;font-weight:700;color:#1a1740;line-height:1;margin-bottom:4px;">${value}</div>
  ${sublabel ? `<div style="font-size:11px;color:#888780;">${sublabel}</div>` : ''}
</div>`
}

function buildScoreCard(score) {
  const color = colorFor(score)
  const badge = levelText(score)
  return `
<div class="card-dark">
  <div>
    <span style="font-size:68px;font-weight:900;color:${color};line-height:1;">${score}</span>
    <span style="font-size:24px;color:rgba(255,255,255,0.35);font-weight:400;"> /100</span>
    <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;">Security Score · Evaluado por DSTAC</div>
  </div>
  <div class="risk-badge" style="background:${color};color:white;">${badge}</div>
</div>`
}

// ── Full document wrapper ─────────────────────────────────────────────────────
function wrapDocument(body) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${CSS}</head><body>${body}</body></html>`
}

module.exports = {
  buildHeader, buildFooter, buildBar, buildAreaCard,
  buildMetricCard, buildScoreCard, colorFor, levelText,
  wrapDocument, CSS, LOGO_HTML,
}
