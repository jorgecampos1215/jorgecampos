import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { PageHeader, Section, Nota } from '../components/Page'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { ROUTES } from '../lib/routes'
import { useToast } from '../components/ui'
import { CLIENTES, ZONAS } from '../data/seed'
import { FILTROS_DEFAULT, PERIODOS, TIPOS, kpis, custodiosPorZona, alertas, seguridad, comercial, csvDashboard, descargarCSV, fmtM, type Filtros } from '../data/dashboard'
import { usePins, togglePin } from '../data/asistente'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.kpi{font-family:'Montserrat',sans-serif;font-size:30px;font-weight:600;letter-spacing:-.01em;line-height:1.1}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select,.field input{min-height:40px;background:#FFFFFF;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif}
.track{height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden}
.kpi-link{color:inherit;text-decoration:none;cursor:pointer}.kpi-link:hover{border-color:#475CC7;color:inherit}
.alert-row{cursor:pointer;background:transparent;border:0;border-top:1px solid #EEF1F4;text-align:left;font:inherit;color:inherit;width:100%}.alert-row:hover{background:#FAFBFC}
.lnk{background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline}.lnk:hover{color:#0D1D41}
.acceso{display:flex;gap:14px;align-items:center;padding:18px 20px;background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;text-decoration:none;color:#0D1D41;min-height:96px;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}
.acceso:hover{border-color:#475CC7;box-shadow:0 2px 10px rgba(71,92,199,.12);color:#0D1D41}
.acceso .ico{width:48px;height:48px;border-radius:12px;background:#E9EDFB;display:inline-flex;align-items:center;justify-content:center;flex:none}
.acceso .ttl{font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600;line-height:1.25}
.acceso .sub{font-size:13px;color:#5F6B7A;line-height:1.4}
.acceso .arr{margin-left:auto;color:#475CC7;font-size:22px;flex:none}
.chip{border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;border-radius:999px;min-height:40px;padding:0 16px;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-align:left;line-height:1.3}
.chip:hover{border-color:#475CC7}.chip.on{border-color:#475CC7;background:#E9EDFB}
.kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
@media (max-width:1280px){.kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
`

const Q = [
  { text: '¿Qué cliente nos dejó más margen en septiembre?', a: 'Alpura: $1.92M de margen en septiembre (38% sobre $5.05M facturados) con 46 servicios por evento en Méx–Qro–Gdl sin incidentes. Le siguen Marsh ($1.31M, 34%) y Farmacéutica Orión ($0.88M, 29%).' },
  { text: '¿Dónde subieron los incidentes?', a: 'Arco Norte (Edomex–Hidalgo): 7 incidentes este trimestre contra 3 el anterior, 5 de ellos entre 22:00 y 04:00. Sugiero subir el factor de riesgo de la ruta de 1.2 a 1.4 en el cotizador y exigir 2 custodios en horario nocturno.' },
  { text: '¿Cuántos custodios faltan mañana en Bajío?', a: 'Mañana hay 18 servicios agendados en Bajío y 12 custodios disponibles. Puedes cubrir el hueco moviendo 4 custodios de Centro (Querétaro a 2 h) y 2 de Occidente.' },
]

/** Los 4 accesos grandes: lo que un coordinador hace el 80% del tiempo, en el orden del flujo. */
const ACCESOS: { to: string; titulo: string; sub: string; d: string }[] = [
  { to: ROUTES.Cotizador, titulo: 'Cotizar un servicio', sub: 'Precio con distancia, riesgo y margen. Sale en PDF.', d: 'M6 3h12v18H6zM9 7h6M9 11h6M9 15h4' },
  { to: ROUTES.AsignacionIA, titulo: 'Asignar custodios', sub: 'La IA sugiere quién va y en qué unidad; tú confirmas.', d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4' },
  { to: ROUTES.Monitoreo, titulo: 'Ver el mapa en vivo', sub: 'Dónde están tus tráileres y custodios ahora.', d: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
  { to: ROUTES.Reaccion, titulo: 'Atender un incidente', sub: 'Avisar, mandar reacción y cerrar con reporte al cliente.', d: 'M12 3l9 16H3zM12 10v4M12 17.5v.01' },
]

const px = (v: number, total: number) => Math.round(v / Math.max(total, 0.1) * 140)
const ZONA_OPCIONES = ['Todas', ...ZONAS] as const

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ')
const KEYS = [
  ['cliente', 'margen', 'septiembre', 'rentable', 'alpura', 'utilidad', 'ganancia'],
  ['incidente', 'incidentes', 'subieron', 'robo', 'carretera', 'arco', 'riesgo', 'ruta'],
  ['custodios', 'custodio', 'faltan', 'bajio', 'manana', 'cobertura', 'hueco'],
]
function closest(text: string): number {
  const words = norm(text).split(/\s+/).filter(w => w.length > 2)
  let best = 0, bestScore = -1
  KEYS.forEach((ks, i) => {
    const qWords = norm(Q[i].text).split(/\s+/)
    const score = words.reduce((acc, w) => acc + (ks.some(k => k.startsWith(w) || w.startsWith(k)) ? 2 : 0) + (qWords.includes(w) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = i }
  })
  return best
}

/** Indicador: cifra grande + UNA línea que dice qué significa. Toda la tarjeta abre la pantalla de detalle. */
const Kpi = ({ to, label, significado, children }: { to: string; label: string; significado: string; children: ReactNode }) => (
  <Link to={to} className="card kpi-link" title={'Abrir ' + label.toLowerCase()} style={sx('display:flex;flex-direction:column;gap:8px;padding:16px 18px')}>
    <span className="lbl">{label}</span>
    {children}
    <span style={sx('font-size:12px;color:#5F6B7A;line-height:1.4')}>{significado}</span>
  </Link>
)
const Mini = ({ to, label, children }: { to: string; label: string; children: ReactNode }) => (
  <Link to={to} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">{label}</span>{children}</Link>
)

export default function Main() {
  const navigate = useNavigate()
  const toast = useToast()
  const pins = usePins()
  const modo = useViewport()
  const movil = modo === 'movil'
  // Mini indicadores (Seguridad, Comercial): en celular sx() dejaría la rejilla de 2 columnas en 1; con auto-fit caben 2 cifras por fila.
  const rejillaMini = movil ? 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(130px,100%),1fr));gap:12px' : 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px'
  const [f, setF] = useState<Filtros>(FILTROS_DEFAULT)
  const [masFiltros, setMasFiltros] = useState(false)
  const [masAlertas, setMasAlertas] = useState(false)
  const [q, setQ] = useState(0)
  const [free, setFree] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const ask = () => {
    if (!input.trim()) return
    setQ(closest(input))
    setFree(input.trim())
    setInput('')
  }
  const upd = (k: keyof Filtros) => (e: ChangeEvent<HTMLSelectElement>) => setF(prev => ({ ...prev, [k]: e.target.value }))

  const k = useMemo(() => kpis(f), [f])
  const zonas = useMemo(() => custodiosPorZona(f), [f])
  const al = useMemo(() => alertas(f), [f])
  const seg = useMemo(() => seguridad(f), [f])
  const com = useMemo(() => comercial(f), [f])
  const zones = zonas.filas.map(z => ({ ...z, bar: 'height:100%;width:' + Math.round(z.avail / z.total * 100 * 3) + '%;max-width:100%;background:' + (z.avail / z.total < 0.08 ? '#F0605D' : '#3FA7C9') }))
  const maxMes = Math.max(...k.meses.map(m => m.total), 0.1)
  const months = k.meses.map(m => ({ name: m.name, enPeriodo: m.enPeriodo, total: fmtM(m.total), evt: 'height:' + px(m.evt, maxMes) + 'px;background:#475CC7', ded: 'height:' + px(m.ded, maxMes) + 'px;background:#3FA7C9', mon: 'height:' + px(m.mon, maxMes) + 'px;background:#0D1D41' }))
  const alertasVisibles = masAlertas ? al : al.slice(0, 5)
  const hueco = zones.find(z => z.name === 'Bajío')
  const filtrado = f.periodo !== 'Octubre 2026' || f.zona !== 'Todas' || f.cliente !== 'Todos' || f.tipo !== 'Todos'
  const criticas = al.filter(a => a.level === 'Crítica' || a.level === 'Alta').length

  const exportar = () => {
    descargarCSV(`inicio-${f.periodo.replace(/\s/g, '-').toLowerCase()}.csv`, csvDashboard(f))
    toast(`Indicadores exportados a CSV · ${f.periodo} · ${f.zona === 'Todas' ? 'todas las zonas' : f.zona}`)
  }

  return (
    <Shell active="dashboard" css={CSS}>
      <PageHeader
        seccion="Inicio"
        titulo="¿Cómo va la operación hoy?"
        descripcion="Una sola pantalla para el coordinador y la dirección: qué hacer ahora, cómo vamos, qué alertas hay y cuántos custodios tienes por zona."
        secundarias={<button type="button" className="btn" onClick={exportar}>Exportar indicadores</button>}
      >
        <Nota>Datos al miércoles 7 oct 2026, 14:32 · GPS de Samsara y Ruptela en una sola vista.</Nota>
      </PageHeader>

      <Section tour="acciones" titulo="¿Qué quieres hacer?" ayuda="Los cuatro pasos del servicio, en orden. Entra al que te toca.">
        <nav aria-label="Accesos rápidos" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:12px')}>
          {ACCESOS.map((a, i) => (
            <Link key={a.to} to={a.to} className="acceso">
              <span className="ico" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475CC7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={a.d} /></svg></span>
              <span style={sx('display:flex;flex-direction:column;gap:3px;min-width:0')}>
                <span className="lbl" style={sx('font-size:11px')}>Paso {i + 1}</span>
                <span className="ttl">{a.titulo}</span>
                <span className="sub">{a.sub}</span>
              </span>
              <span className="arr" aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
      </Section>

      <div style={sx('display:flex;flex-direction:column;gap:12px')}>
        <form style={sx('display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end')} onSubmit={e => e.preventDefault()}>
          <h2 style={sx("margin:0 8px 0 0;font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600;align-self:center" + (movil ? ';flex-basis:100%;margin:0' : ''))}>Cómo vamos</h2>
          <label className="field">Periodo<select value={f.periodo} onChange={upd('periodo')}>{PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          <label className="field">Zona<select value={f.zona} onChange={upd('zona')}>{ZONA_OPCIONES.map(z => <option key={z} value={z}>{z === 'Todas' ? 'Todas las zonas' : z}</option>)}</select></label>
          {masFiltros && <label className="field">Cliente<select value={f.cliente} onChange={upd('cliente')}><option value="Todos">Todos los clientes</option>{CLIENTES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
          {masFiltros && <label className="field">Tipo de servicio<select value={f.tipo} onChange={upd('tipo')}><option value="Todos">Todos</option>{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</select></label>}
          <button type="button" className="btn" onClick={() => setMasFiltros(v => !v)} aria-expanded={masFiltros}>{masFiltros ? 'Menos filtros' : 'Más filtros'}</button>
          {filtrado && <button type="button" className="btn" onClick={() => setF(FILTROS_DEFAULT)} title="Quitar filtros">Limpiar</button>}
        </form>

        <section aria-label="Indicadores principales" className="kpis" data-tour="kpis">
          <Kpi to={ROUTES.Servicios} label={k.esOct ? 'Servicios activos' : 'Servicios del periodo'} significado="Tráileres que estamos custodiando o monitoreando ahora.">
            <span className="kpi">{k.activos}</span>
            <span style={sx('font-size:13px;color:#5F6B7A')}>{k.evento} por evento · {k.dedicado} dedicado · {k.monitoreo} monitoreo</span>
          </Kpi>
          <Kpi to={ROUTES.Custodios} label="Custodios ocupados" significado="Qué tanto de la plantilla está en servicio. Arriba de 85% ya no hay holgura.">
            <span className="kpi">{k.utilizacion}%</span>
            <div className="track"><div style={sx(`width:${k.utilizacion}%;height:100%;background:#475CC7`)}></div></div>
            <span style={sx('font-size:13px;color:#5F6B7A')}>{k.enServicio} de {k.plantilla} en servicio</span>
          </Kpi>
          <Kpi to={ROUTES.Reportes} label="Entregas sin incidente" significado="De cada 100 entregas, cuántas llegaron sin novedad.">
            <span className="kpi">{k.sinIncidente}%</span>
            <span style={sx('font-size:13px;color:#17784A')}>+0.4 pts vs septiembre</span>
          </Kpi>
          <Kpi to={ROUTES.Reaccion} label="Incidentes por 100 servicios" significado="Cuántos incidentes ocurren por cada 100 servicios. Menos es mejor.">
            <span className="kpi">{k.incPor100}</span>
            <span style={sx('font-size:13px;color:#B42318')}>+0.3 vs trimestre anterior</span>
          </Kpi>
          <Kpi to={ROUTES.Flotilla} label="Unidades operando" significado="Camionetas listas para salir; el resto está en taller.">
            <span className="kpi">{k.pctOperando}%</span>
            <span style={sx('font-size:13px;color:#5F6B7A')}>{k.operando} de {k.uniTotal} · {k.taller} en taller</span>
          </Kpi>
          <Kpi to={ROUTES.Finanzas} label={k.esOct ? 'Ingresos del mes' : 'Ingresos del periodo'} significado="Lo facturado en pesos y qué margen deja después de costos.">
            <span className="kpi">{fmtM(k.ingresos)}</span>
            <span style={sx('font-size:13px;color:#5F6B7A')}>Margen {k.margen}% · proyección MXN</span>
          </Kpi>
        </section>
      </div>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr));gap:16px')}>
        <Section titulo="Alertas que requieren atención" ayuda={criticas > 0 ? `${criticas} crítica${criticas === 1 ? '' : 's'} o alta${criticas === 1 ? '' : 's'}. Toca una para atenderla.` : 'Ordenadas por urgencia. Toca una para atenderla.'} acciones={<Link to={ROUTES.Monitoreo} style={sx('font-size:14px')}>Abrir mapa en vivo</Link>}>
          {alertasVisibles.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A;padding:12px 0;border-top:1px solid #EEF1F4')}>Sin alertas con estos filtros. Prueba con otra zona o periodo.</span>}
          {alertasVisibles.map((a, i) => (
            <button key={i} type="button" className="alert-row" title={'Abrir ' + a.title} onClick={() => navigate(a.to)} style={sx('display:flex;gap:12px;align-items:flex-start;padding:12px 0')}>
              <span className={a.cls} style={sx('min-width:64px;justify-content:center')}>{a.level}</span>
              <div style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;flex:1')}>
                <span style={sx('font-weight:500')}>{a.title}</span>
                <span style={sx('font-size:13px;color:#5F6B7A')}>{a.detail}</span>
              </div>
              <span className="mono" style={sx('font-size:12px;color:#5F6B7A;white-space:nowrap')}>{a.when}</span>
            </button>
          ))}
          {al.length > 5 && (
            <button type="button" className="lnk" style={sx('align-self:flex-start;font-size:13px')} onClick={() => setMasAlertas(v => !v)}>{masAlertas ? 'Ver menos' : `Ver ${al.length - 5} alertas más`}</button>
          )}
        </Section>

        <Section titulo="Custodios disponibles por zona" ayuda="Cuántos puedes asignar ahora mismo en cada zona, de la plantilla total." acciones={hueco && <Link to={ROUTES.AsignacionIA} className="pill p-warn" style={sx('text-decoration:none')} title="Ver huecos de cobertura">Falta cubrir: Bajío mañana −6</Link>}>
          {zones.map(z => (
            // Celular: columnas de nombre y cifra más angostas para que la barra conserve ancho legible.
            <Link key={z.name} to={ROUTES.Custodios} title={`Ver custodios de ${z.name}`} style={sx('display:grid;grid-template-columns:' + (movil ? '88px minmax(0,1fr) 72px;gap:10px' : '110px minmax(0,1fr) 92px;gap:12px') + ';align-items:center;font-size:14px;color:inherit;text-decoration:none')}>
              <span>{z.name}</span>
              <div className="track" style={sx('height:10px')}><div style={sx(z.bar)}></div></div>
              <span className="mono" style={sx('text-align:right;color:#3E4A59')}>{z.avail} / {z.total}</span>
            </Link>
          ))}
          <Nota>Disponibles ahora / plantilla de la zona. {zonas.fuera} custodios en descanso, vacaciones o incapacidad. La barra roja marca una zona con menos del 8% libre.</Nota>
        </Section>
      </section>

      <Section titulo="Más indicadores" ayuda="Ingresos por tipo de servicio, seguridad y reacción, comercial y equipo. Para la dirección y finanzas." plegable abierto={false}>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px')}>
          <div style={sx('display:flex;flex-direction:column;gap:14px;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:18px')}>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}>
              <h3 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600")}>Ingresos por tipo de servicio</h3>
              <span style={sx('font-size:13px;color:#5F6B7A')}>Millones de pesos por mes. Toca un color para filtrar por tipo.</span>
            </div>
            <div style={sx('display:flex;flex-wrap:nowrap;gap:20px;align-items:flex-end;height:180px;padding-top:8px' + (movil ? ';gap:12px' : ''))}>
              {months.map(m => (
                <Link to={ROUTES.Finanzas} key={m.name} title={`Ver finanzas de ${m.name}`} style={sx('flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;text-decoration:none;color:inherit' + (m.enPeriodo || f.periodo === 'Octubre 2026' ? '' : ';opacity:.45'))}>
                  <span className="mono" style={sx('font-size:12px;color:#3E4A59')}>{m.total}</span>
                  <div style={sx('width:100%;max-width:48px;display:flex;flex-direction:column;border-radius:4px;overflow:hidden')}>
                    <div style={sx(m.mon)}></div>
                    <div style={sx(m.ded)}></div>
                    <div style={sx(m.evt)}></div>
                  </div>
                  <span style={sx('font-size:12px;color:#5F6B7A')}>{m.name}</span>
                </Link>
              ))}
            </div>
            <div style={sx('display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#3E4A59')}>
              {([['Por evento', '#475CC7'], ['Dedicado', '#3FA7C9'], ['Monitoreo', '#0D1D41']] as const).map(([t, c]) => (
                <button key={t} type="button" title={`Filtrar por ${t}`} onClick={() => setF(prev => ({ ...prev, tipo: prev.tipo === t ? 'Todos' : t }))} style={sx('display:flex;gap:6px;align-items:center;background:none;border:0;padding:0;font-family:inherit;font-size:inherit;color:inherit;cursor:pointer;' + (f.tipo === t ? 'font-weight:600' : f.tipo !== 'Todos' ? 'opacity:.5' : 'font-weight:400'))}><span style={sx(`width:10px;height:10px;border-radius:2px;background:${c}`)}></span>{t}</button>
              ))}
            </div>
          </div>

          <div style={sx('display:flex;flex-direction:column;gap:14px;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:18px')}>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}>
              <h3 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600")}>Seguridad y reacción</h3>
              <span style={sx('font-size:13px;color:#5F6B7A')}>Qué tan rápido llegamos y cuánto recuperamos cuando hay un incidente.</span>
            </div>
            <div style={sx(rejillaMini)}>
              <Mini to={ROUTES.Reaccion} label="Tiempo de reacción"><span className="kpi" style={sx('font-size:24px')}>{seg.reaccion} min</span></Mini>
              <Mini to={ROUTES.Reaccion} label="Recuperación"><span className="kpi" style={sx('font-size:24px')}>{seg.recuperacion}%</span></Mini>
              <Mini to={ROUTES.Reportes} label="Recuperado"><span className="kpi" style={sx('font-size:24px;color:#17784A')}>{fmtM(seg.recuperado)}</span></Mini>
              <Mini to={ROUTES.Reportes} label="Perdido"><span className="kpi" style={sx('font-size:24px;color:#B42318')}>{fmtM(seg.perdido)}</span></Mini>
            </div>
            <span className="lbl" style={sx('margin-top:4px')}>Incidentes por carretera · {f.periodo === 'Q3 2026' ? 'Q3' : f.periodo === 'Septiembre 2026' ? 'septiembre' : 'trimestre'}</span>
            {seg.carreteras.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A;padding:6px 0;border-top:1px solid #EEF1F4')}>Sin incidentes con estos filtros.</span>}
            {seg.carreteras.map(r => (
              <Link to={ROUTES.Reaccion} key={r.name} title={`Ver incidentes en ${r.name}`} style={sx('display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-top:1px solid #EEF1F4;color:inherit;text-decoration:none')}><span>{r.name}</span><span className="mono">{r.n}</span></Link>
            ))}
          </div>

          <div style={sx('display:flex;flex-direction:column;gap:14px;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:18px')}>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}>
              <h3 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600")}>Comercial y equipo</h3>
              <span style={sx('font-size:13px;color:#5F6B7A')}>Cómo va la venta, el cobro y la plantilla.</span>
            </div>
            <div style={sx(rejillaMini)}>
              <Mini to={ROUTES.Cotizador} label="Cotizaciones ganadas"><span className="kpi" style={sx('font-size:24px')}>{com.cierre}%</span></Mini>
              <Mini to={ROUTES.CRM} label="Clientes activos"><span className="kpi" style={sx('font-size:24px')}>{com.clientesActivos}</span></Mini>
              <Mini to={ROUTES.Finanzas} label="Peso de los 5 mayores"><span className="kpi" style={sx('font-size:24px')}>{com.top5}%</span></Mini>
              <Mini to={ROUTES.Finanzas} label="Días para cobrar"><span className="kpi" style={sx('font-size:24px')}>{com.diasCobro}</span></Mini>
              <Mini to={ROUTES.RH} label="Vacantes abiertas"><span className="kpi" style={sx('font-size:24px')}>{com.vacantes}</span></Mini>
              <Mini to={ROUTES.RH} label="Rotación mensual"><span className="kpi" style={sx('font-size:24px')}>{com.rotacion}%</span></Mini>
            </div>
            <Nota>«Peso de los 5 mayores» es qué parte de los ingresos viene de solo 5 clientes: más alto, más dependencia.</Nota>
            <Link to={ROUTES.Finanzas} style={sx('font-size:14px')}>Ver rentabilidad por cliente</Link>
          </div>
        </div>
      </Section>

      {pins.length > 0 && (
        <Section titulo="Respuestas que fijaste" ayuda="Lo que marcaste en el asistente para tenerlo a la mano aquí." acciones={<Link to={ROUTES.AsistenteIA} style={sx('font-size:14px')}>Abrir asistente</Link>}>
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:12px')}>
            {pins.map(p => (
              <div key={p.key} style={sx('background:#F3F5F8;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:6px')}>
                <span className="lbl">{p.q}</span>
                <span style={sx('font-size:14px;line-height:1.5')}>{p.a}</span>
                {/* Celular: los botones miden 44px de alto (global.css); se centran para que «Quitar» quede a la altura de «Abrir». */}
                <div style={sx('display:flex;gap:12px;font-size:13px' + (movil ? ';align-items:center' : ''))}>
                  <Link to={p.to}>Abrir</Link>
                  <button type="button" className="lnk" onClick={() => { togglePin(p); toast('Respuesta quitada de Inicio', 'info') }}>Quitar</button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <section className="card" aria-label="Pregúntale a la operación" style={sx('display:flex;flex-direction:column;gap:16px;border-color:#C7D0F2')}>
        <div style={sx('display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475CC7" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('margin-top:2px')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
          <div style={sx('display:flex;flex-direction:column;gap:2px;flex:1;min-width:200px')}>
            <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600")}>Pregúntale a la operación</h2>
            <span style={sx('font-size:13px;color:#5F6B7A')}>Escribe la pregunta en tus palabras; responde con cifras de clientes, rutas, custodios o finanzas.</span>
          </div>
          <Link to={ROUTES.AsistenteIA} style={sx('font-size:14px')}>Abrir el asistente completo</Link>
        </div>
        <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
          {Q.map((qq, i) => (
            <button key={i} type="button" className={'chip' + (i === q && free === null ? ' on' : '')} onClick={() => { setQ(i); setFree(null) }}>{qq.text}</button>
          ))}
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <label style={sx('flex:1 1 320px;display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Pregunta</span><input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }} placeholder="Ej. ¿qué cliente nos deja más margen?" style={sx("flex:1;min-height:44px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 14px;font:400 14px 'Montserrat',sans-serif")} /></label>
          <button type="button" className="btn btn-pri" style={sx('min-height:44px')} onClick={ask}>Preguntar</button>
        </div>
        <div style={sx('background:#F3F5F8;border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">{free ?? Q[q].text}</span>
          <p style={sx('margin:0;font-size:15px;line-height:1.55;text-wrap:pretty')}>{Q[q].a}</p>
          <Link to={ROUTES.AsistenteIA} style={sx('font-size:13px')}>Ver esta respuesta con gráfica</Link>
        </div>
      </section>
    </Shell>
  )
}
