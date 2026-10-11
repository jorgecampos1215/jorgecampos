import { useMemo, useState } from 'react'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { Nota, Section } from './Page'
import { AREAS_DISENO, headcountMensual } from '../data/rh'

/**
 * Gráfica de cómo ha crecido o decrecido el equipo mes a mes (headcount al cierre), con filtro de área.
 * Una sola serie (línea azul de marca) + altas/bajas del mes como barras pequeñas bajo el eje.
 * Hover: línea guía y tarjeta con headcount, altas y bajas del mes.
 */
export function EvolucionEquipo() {
  const [area, setArea] = useState('Todas las áreas')
  const [meses, setMeses] = useState<6 | 12>(12)
  const [hover, setHover] = useState<number | null>(null)
  // Celular: la gráfica (900 de ancho) se desplaza en horizontal en lugar de encogerse hasta que las etiquetas no se leen
  const movil = useViewport() === 'movil'
  const datos = useMemo(() => headcountMensual(area, meses), [area, meses])

  const W = 900, H = 260, L = 44, R = 16, T = 18, B = 58
  const xs = datos.map((_, i) => L + (i * (W - L - R)) / Math.max(1, datos.length - 1))
  const vals = datos.map(d => d.headcount)
  const min = Math.min(...vals), max = Math.max(...vals)
  const pad = Math.max(2, Math.round((max - min) * 0.25))
  const y0 = Math.max(0, min - pad), y1 = max + pad
  const y = (v: number) => T + (H - T - B) * (1 - (v - y0) / Math.max(1, y1 - y0))
  const path = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y(vals[i]).toFixed(1)}`).join(' ')
  const area_ = `${path} L${xs[xs.length - 1].toFixed(1)},${(H - B).toFixed(1)} L${xs[0].toFixed(1)},${(H - B).toFixed(1)} Z`
  const ticks = [y0, Math.round((y0 + y1) / 2), y1]
  const primero = datos[0], ultimo = datos[datos.length - 1]
  const delta = ultimo.headcount - primero.headcount
  const pct = primero.headcount ? Math.round((delta / primero.headcount) * 1000) / 10 : 0
  const altasTot = datos.reduce((a, d) => a + d.altas, 0), bajasTot = datos.reduce((a, d) => a + d.bajas, 0)
  const maxMov = Math.max(1, ...datos.map(d => Math.max(d.altas, d.bajas)))
  const h = hover !== null ? datos[hover] : null

  return (
    <Section titulo="Evolución del equipo" ayuda="Cuántas personas había al cierre de cada mes, y las altas y bajas de ese mes. Filtra por área para ver dónde crece o se encoge el equipo."
      acciones={<>
        <label style={sx('display:flex;align-items:center;gap:8px;font-size:13px;color:#5F6B7A')}>Área
          <select className="sel" value={area} onChange={e => setArea(e.target.value)} style={sx("min-height:36px;border:1px solid #D5DBE3;border-radius:8px;padding:0 10px;background:#fff;font:500 13px 'Montserrat',sans-serif;color:#0D1D41")}>
            <option>Todas las áreas</option>{AREAS_DISENO.map(a => <option key={a}>{a}</option>)}
          </select>
        </label>
        <div role="group" aria-label="Periodo" style={sx('display:flex;gap:4px')}>
          {([6, 12] as const).map(m => <button key={m} type="button" className="btn" aria-pressed={meses === m} onClick={() => setMeses(m)} style={sx('min-height:36px;padding:0 12px;font-size:13px;' + (meses === m ? 'background:#0D1D41;color:#fff;border-color:#0D1D41' : ''))}>{m} meses</button>)}
        </div>
      </>}>
      <div style={sx('display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end')}>
        <div style={sx('display:flex;flex-direction:column;gap:2px')}>
          <span className="lbl">{area === 'Todas las áreas' ? 'Equipo hoy' : area + ' hoy'}</span>
          <span style={sx("font-family:'Montserrat',sans-serif;font-size:30px;font-weight:700;line-height:1.1")}>{ultimo.headcount}</span>
        </div>
        <div style={sx('display:flex;flex-direction:column;gap:2px')}>
          <span className="lbl">Cambio en {meses} meses</span>
          <span style={sx(`font-family:'Montserrat',sans-serif;font-size:22px;font-weight:700;color:${delta > 0 ? '#17784A' : delta < 0 ? '#B42318' : '#0D1D41'}`)}>{delta > 0 ? '+' : ''}{delta} <span style={sx('font-size:14px;font-weight:600')}>({pct > 0 ? '+' : ''}{pct}%)</span></span>
        </div>
        <div style={sx('display:flex;flex-direction:column;gap:2px')}>
          <span className="lbl">Altas · bajas</span>
          <span style={sx("font-family:'Montserrat',sans-serif;font-size:22px;font-weight:700")}><span style={sx('color:#17784A')}>{altasTot}</span> <span style={sx('color:#AEB8C4')}>·</span> <span style={sx('color:#B42318')}>{bajasTot}</span></span>
        </div>
        <Nota>Desde {primero.etiqueta} hasta {ultimo.etiqueta}. Pasa el cursor sobre la gráfica para ver cada mes.</Nota>
      </div>

      {movil && <span style={sx('font-size:12px;color:#5F6B7A')}>Desliza la gráfica hacia la derecha para ver los meses recientes →</span>}
      <div style={sx(movil ? 'overflow-x:auto;-webkit-overflow-scrolling:touch' : '')} onMouseLeave={() => setHover(null)}>
      <div style={sx(movil ? 'position:relative;width:max(100%,640px)' : 'position:relative;width:100%;overflow:hidden')}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Headcount mensual de ${area}: de ${primero.headcount} en ${primero.etiqueta} a ${ultimo.headcount} en ${ultimo.etiqueta}`} style={sx('width:100%;height:auto;display:block')}>
          <defs><linearGradient id="hc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#475CC7" stopOpacity="0.18" /><stop offset="100%" stopColor="#475CC7" stopOpacity="0" /></linearGradient></defs>
          {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EEF1F4" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5F6B7A" fontFamily="IBM Plex Mono, monospace">{t}</text></g>)}
          <path d={area_} fill="url(#hc-fill)" />
          <path d={path} fill="none" stroke="#475CC7" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {datos.map((d, i) => (
            <g key={d.mes}>
              {/* altas (verde) y bajas (rojo) bajo el eje */}
              <rect x={xs[i] - 7} y={H - B + 14 + (18 - (d.altas / maxMov) * 18)} width="6" height={(d.altas / maxMov) * 18} rx="1.5" fill="#2B9A66" />
              <rect x={xs[i] + 1} y={H - B + 14 + (18 - (d.bajas / maxMov) * 18)} width="6" height={(d.bajas / maxMov) * 18} rx="1.5" fill="#D9534F" />
              <text x={xs[i]} y={H - 8} textAnchor="middle" fontSize="11" fill="#5F6B7A" fontFamily="Montserrat, sans-serif">{d.etiqueta}</text>
              <circle cx={xs[i]} cy={y(d.headcount)} r={hover === i ? 5 : i === datos.length - 1 ? 4 : 3} fill={hover === i || i === datos.length - 1 ? '#475CC7' : '#FFFFFF'} stroke="#475CC7" strokeWidth="2" />
              {(i === 0 || i === datos.length - 1) && <text x={xs[i]} y={y(d.headcount) - 10} textAnchor={i === 0 ? 'start' : 'end'} fontSize="12" fontWeight="600" fill="#0D1D41" fontFamily="IBM Plex Mono, monospace">{d.headcount}</text>}
              {hover === i && <line x1={xs[i]} x2={xs[i]} y1={T} y2={H - B} stroke="#0D1D41" strokeDasharray="3 3" />}
              <rect x={xs[i] - (W - L - R) / datos.length / 2} y={0} width={(W - L - R) / datos.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          ))}
          <text x={L} y={H - B + 10} fontSize="10" fill="#5F6B7A" fontFamily="Montserrat, sans-serif">▮ altas  ▮ bajas</text>
        </svg>
        {h && hover !== null && (
          <div style={sx(`position:absolute;top:8px;left:${Math.min(92, Math.max(2, (xs[hover] / W) * 100))}%;transform:translateX(-50%);background:#0D1D41;color:#fff;border-radius:8px;padding:8px 12px;font-size:12px;line-height:1.5;pointer-events:none;white-space:nowrap;box-shadow:0 6px 20px rgba(13,29,65,.25)`)}>
            <strong style={sx('font-size:13px')}>{h.etiqueta} · {h.headcount} personas</strong><br />
            <span style={sx('color:#A7F0C5')}>+{h.altas} altas</span> · <span style={sx('color:#FFB4AE')}>−{h.bajas} bajas</span>{hover > 0 && <> · neto {h.headcount - datos[hover - 1].headcount >= 0 ? '+' : ''}{h.headcount - datos[hover - 1].headcount}</>}
          </div>
        )}
      </div>
      </div>
    </Section>
  )
}
