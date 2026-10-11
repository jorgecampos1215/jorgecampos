import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { PageHeader, Section, Nota } from '../components/Page'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { ROUTES } from '../lib/routes'
import { Pager, usePagination, useToast } from '../components/ui'
import { descargarCSV } from '../data/dashboard'
import { margenPorCliente, incidentesPorCarretera, coberturaManana, combustibleAnomalo, documentosPorVencer, zonaEnTexto, disponiblesEnZona, usePins, togglePin } from '../data/asistente'
import type { Zona } from '../data/seed'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-bad{background:#FDE8E8;color:#B42318}.p-warn{background:#FFF3DC;color:#9A5B00}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;border-bottom:1px solid #E4E8ED;cursor:pointer;user-select:none}
.tbl td{padding:10px;border-bottom:1px solid #EEF1F4}
.row-link{cursor:pointer}.row-link:hover td{background:#F0F3FD}
.bar-row{cursor:pointer;border:0;background:none;padding:0;font:inherit;color:inherit;text-align:left}.bar-row:hover span:first-child{color:#0D1D41}
.chip{display:flex;align-items:center;gap:10px;text-align:left;min-height:60px;padding:12px 16px;border-radius:12px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 15px 'Montserrat',sans-serif;line-height:1.35;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.chip:hover{border-color:#475CC7;box-shadow:0 2px 10px rgba(71,92,199,.12)}
.chip.on{border-color:#475CC7;background:#E9EDFB}
.chip .q{width:28px;height:28px;border-radius:50%;background:#E9EDFB;color:#3448A8;display:inline-flex;align-items:center;justify-content:center;flex:none;font:600 13px 'Montserrat',sans-serif}
.chip.on .q{background:#475CC7;color:#FFFFFF}
`

type Kind = 'bars' | 'group' | 'table' | 'line' | 'docs' | 'zona'
type Prompt = { q: string; kind: Kind; a: string; title?: string; data?: [string, number][]; fmt?: (v: number) => string; to: string; act: string; keys: string[]; zona?: Zona }

const margen = margenPorCliente()
const carreteras = incidentesPorCarretera()
const cobertura = coberturaManana()
const combustible = combustibleAnomalo()
const documentos = documentosPorVencer()

const P: Prompt[] = [
  { q: '¿Qué cliente nos dejó más margen en septiembre?', kind: 'bars', title: 'Margen por cliente · septiembre 2026',
    a: margen.texto, data: margen.data, fmt: v => '$' + v.toFixed(2) + 'M',
    to: ROUTES.Finanzas, act: 'Ver rentabilidad por cliente',
    keys: ['cliente', 'clientes', 'margen', 'rentable', 'rentabilidad', 'utilidad', 'ganancia', 'alpura', 'marsh', 'septiembre', 'factura', 'facturacion'] },
  { q: '¿Dónde subieron los incidentes este trimestre?', kind: 'group',
    a: carreteras.texto,
    to: ROUTES.Cotizador, act: 'Actualizar riesgo en el cotizador',
    keys: ['incidente', 'incidentes', 'robo', 'robos', 'carretera', 'carreteras', 'arco', 'riesgo', 'trimestre', 'seguridad', 'subieron', 'reaccion', 'ruta', 'rutas'] },
  { q: '¿Cuántos custodios hay disponibles mañana por zona?', kind: 'table',
    a: cobertura.texto,
    to: ROUTES.AsignacionIA, act: 'Abrir asignación',
    keys: ['custodio', 'custodios', 'disponible', 'disponibles', 'manana', 'zona', 'zonas', 'bajio', 'faltan', 'cobertura', 'asignacion', 'personal'] },
  { q: 'Muéstrame ingresos contra gastos de los últimos 6 meses', kind: 'line',
    a: 'Los ingresos crecieron 17% de abril a septiembre ($12.1M a $14.1M) y los gastos 13% ($8.6M a $9.7M); el margen pasó de 29% a 31%. Combustible es la partida que más creció.',
    to: ROUTES.Finanzas, act: 'Abrir finanzas',
    keys: ['ingreso', 'ingresos', 'gasto', 'gastos', 'meses', 'finanzas', 'ventas', 'costos', 'costo', 'flujo', 'tendencia', 'crecimiento'] },
  { q: '¿Qué unidades tienen consumo de combustible anómalo?', kind: 'bars', title: `Rendimiento km/l vs promedio ${combustible.prom}`,
    a: combustible.texto, data: combustible.data, fmt: v => v.toFixed(1) + ' km/l',
    to: ROUTES.Flotilla, act: 'Abrir flotilla',
    keys: ['unidad', 'unidades', 'combustible', 'diesel', 'gasolina', 'consumo', 'rendimiento', 'flotilla', 'taller', 'anomalo', 'camion', 'camiones', 'km'] },
  { q: '¿Qué custodios tienen documentos por vencer este mes?', kind: 'docs',
    a: documentos.texto,
    to: ROUTES.Custodios, act: 'Abrir custodios',
    keys: ['documento', 'documentos', 'vencer', 'vencen', 'vence', 'licencia', 'portacion', 'confianza', 'renovar', 'vigencia'] },
]
const LINEA: [string, number, number][] = [['Abr', 12.1, 8.6], ['May', 12.4, 8.7], ['Jun', 12.6, 8.9], ['Jul', 12.9, 9.0], ['Ago', 13.6, 9.4], ['Sep', 14.1, 9.7]]
const groups = carreteras.filas.map(({ k, a, b }) => ({ k, a, b, v: a + ' → ' + b, b1: 'height:8px;border-radius:3px;background:#AEB8C4;width:' + Math.round(a / carreteras.max * 100) + '%', b2: 'height:8px;border-radius:3px;background:#3448A8;width:' + Math.round(b / carreteras.max * 100) + '%' }))

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ')
const STOP = new Set(['que', 'los', 'las', 'del', 'por', 'con', 'una', 'uno', 'para', 'hay', 'como', 'cual', 'cuales', 'cuantos', 'cuantas', 'este', 'esta', 'nos', 'mas', 'dame', 'muestrame'])
/** Coincidencia más cercana entre una pregunta libre y las preguntas que el demo sabe responder. */
function closest(text: string): number {
  const words = norm(text).split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
  let best = 0, bestScore = -1
  P.forEach((p, i) => {
    const qWords = new Set(norm(p.q).split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)))
    const score = words.reduce((acc, w) => acc
      + (p.keys.some(k => k === w || (w.length > 3 && (k.startsWith(w.slice(0, 5)) || w.startsWith(k.slice(0, 5))))) ? 2 : 0)
      + (qWords.has(w) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = i }
  })
  return best
}

/** Resuelve una pregunta libre: si menciona una zona y habla de custodios, responde con los datos reales de esa zona. */
function resolver(text: string): Prompt {
  const i = closest(text)
  const z = zonaEnTexto(text)
  if (z && i === 2) {
    const d = disponiblesEnZona(z)
    return { q: `Custodios disponibles en ${z}`, kind: 'zona', a: d.texto, to: ROUTES.Custodios, act: `Ver custodios de ${z}`, keys: [], zona: z }
  }
  return P[i]
}

type Turno = { id: number; asked: string | null; p: Prompt }

export default function AsistenteIA() {
  const navigate = useNavigate()
  const toast = useToast()
  const pins = usePins()
  const movil = useViewport() === 'movil'
  const [turnos, setTurnos] = useState<Turno[]>([{ id: 0, asked: null, p: P[0] }])
  const [input, setInput] = useState('')
  const last = turnos[turnos.length - 1]

  const pick = (n: number) => setTurnos([{ id: Date.now(), asked: null, p: P[n] }])
  const ask = () => {
    const t = input.trim()
    if (!t) return
    setTurnos(ts => [...ts, { id: Date.now(), asked: t, p: resolver(t) }])
    setInput('')
  }
  const nueva = () => { setTurnos([{ id: Date.now(), asked: null, p: P[0] }]); setInput(''); toast('Conversación reiniciada', 'info') }

  return (
    <Shell active="asistente" css={CSS} mainStyle="flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px">
      <PageHeader
        seccion="Asistente"
        titulo="Pregúntale a la operación"
        descripcion="Escribe una pregunta en tus palabras y te responde con la cifra, una gráfica o tabla, y un botón para ir a la pantalla donde se resuelve."
        secundarias={<>
          {pins.length > 0 && <Link className="btn" to={ROUTES.Main}>{pins.length} fijada{pins.length === 1 ? '' : 's'} en Inicio</Link>}
          <button type="button" className="btn" onClick={nueva}>Empezar de nuevo</button>
        </>}
      >
        <Nota>Puede responder sobre servicios, custodios, flotilla, incidentes, clientes y finanzas. Usa los datos de la plataforma (GPS de Samsara y Ruptela, CRM, finanzas) y respeta los permisos de tu rol.</Nota>
      </PageHeader>

      <Section tour="preguntas" titulo="Preguntas que puedes hacer" ayuda="Toca una para ver la respuesta, o escribe la tuya abajo.">
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:10px')}>
          {P.map((p, n) => {
            const on = p === last.p && last.asked === null
            return (
              <button key={n} type="button" className={'chip' + (on ? ' on' : '')} onClick={() => pick(n)} aria-pressed={on}>
                <span className="q" aria-hidden="true">{n + 1}</span>
                <span>{p.q}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Celular: menos margen interior para que las gráficas y tarjetas de respuesta aprovechen el ancho. */}
      <section className="card" aria-label="Conversación" style={sx(`display:flex;flex-direction:column;gap:18px;padding:${movil ? 16 : 24}px;border-color:#C7D0F2`)}>
        <form style={sx('display:flex;gap:10px;flex-wrap:wrap')} onSubmit={e => { e.preventDefault(); ask() }}>
          <label style={sx('flex:1 1 320px;display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Tu pregunta</span><input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe tu pregunta. Ej. ¿cuántos custodios hay libres en Bajío?" style={sx("flex:1;min-height:48px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:10px;color:#0D1D41;padding:0 14px;font:400 15px 'Montserrat',sans-serif")} /></label>
          <button type="submit" className="btn btn-pri" style={sx('min-height:48px')}>Preguntar</button>
        </form>

        {turnos.map(t => (
          <Respuesta key={t.id} turno={t} pinned={pins.some(x => x.key === (t.p.zona ? 'zona-' + t.p.zona : t.p.q))} onPin={() => {
            const key = t.p.zona ? 'zona-' + t.p.zona : t.p.q
            const ya = pins.some(x => x.key === key)
            togglePin({ key, q: t.p.q, a: t.p.a, to: t.p.to })
            toast(ya ? 'Respuesta quitada de Inicio' : 'Respuesta fijada en Inicio', ya ? 'info' : 'ok')
          }} onExport={() => { descargarCSV(`asistente-${t.p.kind}.csv`, csvDe(t.p)); toast('Respuesta exportada a CSV') }} navigate={navigate} />
        ))}
      </section>
    </Shell>
  )
}

function csvDe(p: Prompt): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  let rows: (string | number)[][]
  if (p.kind === 'bars') rows = [['Concepto', 'Valor'], ...(p.data || [])]
  else if (p.kind === 'group') rows = [['Carretera', 'Q2', 'Q3'], ...carreteras.filas.map(f => [f.k, f.a, f.b])]
  else if (p.kind === 'table') rows = [['Zona', 'Disponibles', 'Requeridos', 'Diferencia'], ...cobertura.filas.map(c => [c.zona, c.disponibles, c.requeridos, c.diff])]
  else if (p.kind === 'docs') rows = [['Custodio', 'ID', 'Zona', 'Documento', 'Vence'], ...documentos.docs.map(d => [d.custodio.nombre, d.custodio.id, d.custodio.zona, d.doc.k, d.doc.v])]
  else if (p.kind === 'zona') rows = [['Custodio', 'ID', 'Base', 'Calificación', 'Horas semana'], ...disponiblesEnZona(p.zona!).disp.map(c => [c.nombre, c.id, c.base, c.calificacion, c.horasSemana])]
  else rows = [['Mes', 'Ingresos', 'Gastos'], ...LINEA]
  return [[p.q], [p.a], [], ...rows].map(r => r.map(esc).join(',')).join('\n')
}

/** Fila de una gráfica de barras: escritorio = etiqueta · barra · valor en tres columnas; celular = etiqueta y valor arriba, barra a lo ancho abajo. */
const filaBarra = (movil: boolean, anchoValor: number) => movil
  ? 'display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"k v" "b b";gap:4px 12px;align-items:center;font-size:14px'
  : `display:grid;grid-template-columns:170px minmax(0,1fr) ${anchoValor}px;gap:12px;align-items:center;font-size:14px`

function Respuesta({ turno, pinned, onPin, onExport, navigate }: { turno: Turno; pinned: boolean; onPin: () => void; onExport: () => void; navigate: ReturnType<typeof useNavigate> }) {
  const modo = useViewport()
  const movil = modo === 'movil'
  const figura = `margin:0;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:${movil ? 14 : 18}px;display:flex;flex-direction:column;gap:12px`
  // Gráfica de líneas: en celular el lienzo es más angosto (340 en vez de 640) para que las etiquetas se lean al escalar al ancho de la tarjeta.
  const ancho = movil ? 340 : 640
  const paso = (ancho - 80) / 5
  const xs = (n: number) => 40 + n * paso
  const fz = movil ? 15 : 11, fz2 = movil ? 16 : 12, radio = movil ? 5 : 4
  const cur = turno.p
  const max = cur.data ? Math.max(...cur.data.map(d => d[1])) : 1
  const bars = (cur.data || []).map(([k, v], j) => ({ k, v: cur.fmt!(v), bar: 'height:100%;width:' + Math.round(v / max * 100) + '%;background:' + (cur.kind === 'bars' && cur.to === ROUTES.Flotilla && v < 6.5 ? '#D9534F' : (j === 0 && cur.to === ROUTES.Finanzas ? '#3448A8' : '#475CC7')) }))
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'diff', dir: 1 })
  const filas = useMemo(() => [...cobertura.filas].sort((a, b) => { const va = a[sort.k as keyof typeof a], vb = b[sort.k as keyof typeof b]; return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir }), [sort])
  const th = (k: string, label: string) => <th onClick={() => setSort(s => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))} title="Ordenar">{label}{sort.k === k ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</th>
  const pg = usePagination(documentos.docs.length, 25)
  const zona = cur.kind === 'zona' ? disponiblesEnZona(cur.zona!) : null
  const pgz = usePagination(zona?.disp.length ?? 0, 25)
  const avatar = (
    <span style={sx(`width:${movil ? 28 : 36}px;height:${movil ? 28 : 36}px;border-radius:50%;background:#E9EDFB;display:flex;align-items:center;justify-content:center;flex:none`)}>
      <svg width={movil ? 15 : 18} height={movil ? 15 : 18} viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
    </span>
  )

  return (
    <>
      <div style={sx('display:flex;flex-direction:column;gap:4px;border-top:1px solid #EEF1F4;padding-top:16px')}>
        <span className="lbl">Tu pregunta</span>
        <span style={sx("font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600;line-height:1.35")}>{turno.asked ?? cur.q}</span>
      </div>

      {/* Escritorio: avatar a la izquierda y la respuesta a su derecha. Celular: el avatar va junto a la etiqueta «Respuesta» y el contenido ocupa todo el ancho. */}
      <div style={sx(movil ? 'display:flex;flex-direction:column' : 'display:flex;gap:12px;align-items:flex-start')}>
        {!movil && avatar}
        <div style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:16px')}>
          {turno.asked !== null && (
            <span style={sx('font-size:13px;color:#5F6B7A')}>Entendí tu pregunta como: «{cur.q}»</span>
          )}
          {movil ? <span style={sx('display:flex;gap:10px;align-items:center')}>{avatar}<span className="lbl">Respuesta</span></span> : <span className="lbl">Respuesta</span>}
          <p style={sx('margin:-10px 0 0;font-size:15px;line-height:1.6;text-wrap:pretty')}>{cur.a}</p>

          {cur.kind === 'bars' && (
            <figure style={sx(figura)}>
              <figcaption className="lbl">{cur.title || ''}</figcaption>
              {bars.map(b => (
                <button type="button" className="bar-row" key={b.k} title={'Abrir ' + b.k} onClick={() => navigate(cur.to)} style={sx(filaBarra(movil, 80))}>
                  <span style={sx(movil ? 'grid-area:k' : '')}>{b.k}</span>
                  <div style={sx('height:14px;border-radius:4px;background:#EBEEF2;overflow:hidden' + (movil ? ';grid-area:b' : ''))}><div style={sx(b.bar)}></div></div>
                  <span className="mono" style={sx('text-align:right' + (movil ? ';grid-area:v' : ''))}>{b.v}</span>
                </button>
              ))}
            </figure>
          )}

          {cur.kind === 'group' && (
            <figure style={sx(figura)}>
              <figcaption style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap')}><span className="lbl">Incidentes por carretera · Q2 vs Q3 2026</span>
                <span style={sx('display:flex;gap:14px;font-size:12px;color:#3E4A59')}><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#AEB8C4')}></span>Q2</span><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#3448A8')}></span>Q3</span></span>
              </figcaption>
              {groups.map(g => (
                <button type="button" className="bar-row" key={g.k} title={'Ver incidentes en ' + g.k} onClick={() => navigate(ROUTES.Reaccion)} style={sx(filaBarra(movil, 60))}>
                  <span style={sx(movil ? 'grid-area:k' : '')}>{g.k}</span>
                  <div style={sx('display:flex;flex-direction:column;gap:3px' + (movil ? ';grid-area:b' : ''))}><div style={sx(g.b1)}></div><div style={sx(g.b2)}></div></div>
                  <span className="mono" style={sx('text-align:right' + (movil ? ';grid-area:v' : ''))}>{g.v}</span>
                </button>
              ))}
            </figure>
          )}

          {cur.kind === 'line' && (
            <figure style={sx(figura.replace('gap:12px', 'gap:10px'))}>
              <figcaption style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap')}><span className="lbl">Ingresos vs gastos · millones MXN</span>
                <span style={sx('display:flex;gap:14px;font-size:12px;color:#3E4A59')}><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:14px;height:3px;background:#3448A8')}></span>Ingresos</span><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:14px;height:3px;background:#475CC7')}></span>Gastos</span></span>
              </figcaption>
              <svg viewBox={`0 0 ${ancho} 230`} role="img" aria-label="Ingresos suben de 12.1 a 14.1 millones y gastos de 8.6 a 9.7 millones entre abril y septiembre" style={sx('width:100%;height:auto;display:block;cursor:pointer')} onClick={() => navigate(ROUTES.Finanzas)}>
                <g stroke="#E4E8ED" strokeWidth="1"><path d={`M30 200H${ancho - 20}M30 148.6H${ancho - 20}M30 97.1H${ancho - 20}M30 45.7H${ancho - 20}`}></path></g>
                <g fontFamily="IBM Plex Mono, monospace" fontSize={fz} fill="#5F6B7A"><text x="0" y="204">8</text><text x="0" y="152">10</text><text x="0" y="101">12</text><text x="0" y="49">14</text></g>
                <polyline points={LINEA.map(([, i], n) => `${xs(n)},${200 - (i - 8) * 25.7}`).join(' ')} fill="none" stroke="#3448A8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"></polyline>
                <polyline points={LINEA.map(([, , g], n) => `${xs(n)},${200 - (g - 8) * 25.7}`).join(' ')} fill="none" stroke="#475CC7" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"></polyline>
                <g fill="#3448A8">{LINEA.map(([m, i], n) => <circle key={m} cx={xs(n)} cy={200 - (i - 8) * 25.7} r={radio}><title>{m}: ingresos ${i}M</title></circle>)}</g>
                <g fill="#475CC7">{LINEA.map(([m, , g], n) => <circle key={m} cx={xs(n)} cy={200 - (g - 8) * 25.7} r={radio}><title>{m}: gastos ${g}M</title></circle>)}</g>
                <g fontFamily="IBM Plex Sans, sans-serif" fontSize={fz2} fill="#3E4A59" textAnchor="middle">{LINEA.map(([m], n) => <text key={m} x={xs(n)} y="224">{m}</text>)}</g>
                <g fontFamily="IBM Plex Mono, monospace" fontSize={fz} textAnchor="middle"><text x={ancho - 40} y="32" fill="#0D1D41">14.1</text><text x={ancho - 40} y="145" fill="#1E6488">9.7</text></g>
              </svg>
            </figure>
          )}

          {cur.kind === 'table' && (
            <div style={sx('overflow-x:auto;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:8px')}>
              {movil ? (
                <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                  {filas.map(r => (
                    <Tarjeta key={r.zona} titulo={r.zona} title={`Abrir asignación · ${r.zona}`} onClick={() => navigate(ROUTES.AsignacionIA)}
                      etiqueta={<span className={r.diff < 0 ? 'pill p-bad' : r.diff === 0 ? 'pill p-warn' : 'pill p-ok'}>{(r.diff > 0 ? '+' : '') + r.diff}</span>}
                      datos={[['Disponibles', <span className="mono">{r.disponibles}</span>], ['Requeridos', <span className="mono">{r.requeridos}</span>]]} />
                  ))}
                </div>
              ) : (
              <table className="tbl">
                <thead><tr>{th('zona', 'Zona')}{th('disponibles', 'Disponibles')}{th('requeridos', 'Requeridos')}{th('diff', 'Diferencia')}</tr></thead>
                <tbody>
                  {filas.map(r => (
                    <tr key={r.zona} className="row-link" title={`Abrir asignación · ${r.zona}`} onClick={() => navigate(ROUTES.AsignacionIA)}><td>{r.zona}</td><td className="mono">{r.disponibles}</td><td className="mono">{r.requeridos}</td><td><span className={r.diff < 0 ? 'pill p-bad' : r.diff === 0 ? 'pill p-warn' : 'pill p-ok'}>{(r.diff > 0 ? '+' : '') + r.diff}</span></td></tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          )}

          {cur.kind === 'docs' && (
            <div style={sx('overflow-x:auto;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:8px')}>
              {movil ? (
                <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                  {documentos.docs.slice(pg.from, pg.to).map((d, i) => (
                    <Tarjeta key={i} title={`Abrir expediente de ${d.custodio.nombre}`} onClick={() => navigate(ROUTES.Custodios)}
                      titulo={<>{d.custodio.nombre} <span className="mono" style={sx('color:#5F6B7A;font-size:12px;font-weight:400;white-space:nowrap')}>{d.custodio.id}</span></>}
                      etiqueta={<span className={d.doc.estado === 'bad' ? 'pill p-bad' : 'pill p-warn'}>{d.doc.v}</span>}
                      datos={[['Zona', d.custodio.zona], ['Documento', d.doc.k]]} />
                  ))}
                </div>
              ) : (
              <table className="tbl">
                <thead><tr><th>Custodio</th><th>Zona</th><th>Documento</th><th>Vence</th></tr></thead>
                <tbody>
                  {documentos.docs.slice(pg.from, pg.to).map((d, i) => (
                    <tr key={i} className="row-link" title={`Abrir expediente de ${d.custodio.nombre}`} onClick={() => navigate(ROUTES.Custodios)}><td>{d.custodio.nombre} <span className="mono" style={sx('color:#5F6B7A;font-size:12px')}>{d.custodio.id}</span></td><td>{d.custodio.zona}</td><td>{d.doc.k}</td><td><span className={d.doc.estado === 'bad' ? 'pill p-bad' : 'pill p-warn'}>{d.doc.v}</span></td></tr>
                  ))}
                </tbody>
              </table>
              )}
              <Pager {...pg} />
            </div>
          )}

          {cur.kind === 'zona' && zona && (
            <div style={sx('overflow-x:auto;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:8px')}>
              {movil ? (
                <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                  {zona.disp.slice(pgz.from, pgz.to).map(c => (
                    <Tarjeta key={c.id} title={`Abrir expediente de ${c.nombre}`} onClick={() => navigate(ROUTES.Custodios)}
                      titulo={<>{c.nombre} <span className="mono" style={sx('color:#5F6B7A;font-size:12px;font-weight:400;white-space:nowrap')}>{c.id}</span></>}
                      etiqueta={<span className={c.docs === 'Al día' ? 'pill p-ok' : 'pill p-warn'}>{c.docs}</span>}
                      datos={[['Base', c.base], ['Calificación', <span className="mono">{c.calificacion.toFixed(1)}</span>], ['Horas semana', <span className="mono">{c.horasSemana}</span>]]} />
                  ))}
                </div>
              ) : (
              <table className="tbl">
                <thead><tr><th>Custodio</th><th>Base</th><th>Calificación</th><th>Horas semana</th><th>Documentos</th></tr></thead>
                <tbody>
                  {zona.disp.slice(pgz.from, pgz.to).map(c => (
                    <tr key={c.id} className="row-link" title={`Abrir expediente de ${c.nombre}`} onClick={() => navigate(ROUTES.Custodios)}><td>{c.nombre} <span className="mono" style={sx('color:#5F6B7A;font-size:12px')}>{c.id}</span></td><td>{c.base}</td><td className="mono">{c.calificacion.toFixed(1)}</td><td className="mono">{c.horasSemana}</td><td><span className={c.docs === 'Al día' ? 'pill p-ok' : 'pill p-warn'}>{c.docs}</span></td></tr>
                  ))}
                </tbody>
              </table>
              )}
              <Pager {...pgz} />
            </div>
          )}

          <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
            <Link className="btn" to={cur.to}>{cur.act}</Link>
            <button type="button" className="btn" onClick={onPin} style={sx(pinned ? 'border-color:#475CC7;color:#0D1D41' : '')}>{pinned ? 'Fijada en Inicio ✓' : 'Fijar en Inicio'}</button>
            <button type="button" className="btn" onClick={onExport}>Exportar a CSV</button>
          </div>
        </div>
      </div>
    </>
  )
}

/** Fila de tabla vista como tarjeta (celular): título y etiqueta en la primera línea; los demás datos abajo, en una línea que envuelve. */
function Tarjeta({ titulo, etiqueta, datos, title, onClick }: { titulo: ReactNode; etiqueta?: ReactNode; datos: [string, ReactNode][]; title?: string; onClick?: () => void }) {
  return (
    <button type="button" title={title} onClick={onClick} style={sx('display:flex;flex-direction:column;gap:6px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #E4E8ED;border-radius:8px;padding:10px 12px;font:inherit;color:inherit;cursor:pointer;box-sizing:border-box')}>
      <span style={sx('display:flex;flex-wrap:nowrap;justify-content:space-between;gap:10px;align-items:flex-start')}>
        <span style={sx('font-weight:500;font-size:14px;min-width:0;overflow-wrap:anywhere')}>{titulo}</span>
        {etiqueta}
      </span>
      <span style={sx('display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:#3E4A59')}>
        {datos.map(([k, v]) => <span key={k} style={sx('display:inline-flex;gap:5px;align-items:baseline')}><span className="lbl" style={sx('font-size:10px')}>{k}</span>{v}</span>)}
      </span>
    </button>
  )
}
