import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { Nota, PageHeader, Section } from '../components/Page'
import { ROUTES } from '../lib/routes'
import { actions, useStore, type Lead } from '../lib/store'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { AUTOPARTES, fmtM, todosLosClientes, type ClienteCRM } from '../data/crm'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.btn-sm{min-height:32px;padding:0 10px;font-size:13px}
.k{font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600}
.kpi{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:4px;min-width:0}
.mv{width:26px;height:26px;border-radius:6px;border:1px solid #D5DBE3;background:#FFFFFF;color:#3E4A59;font-size:14px;cursor:pointer;padding:0;line-height:1}
.mv:hover:not(:disabled){background:#F3F5F8}.mv:disabled{opacity:.35;cursor:default}
.op-card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px}
.op-card:hover{border-color:#C7D0F2}
.op-row:hover td{background:#FAFBFC}
button.pill{border:0;cursor:pointer;font-family:'Montserrat',sans-serif}
/* Celular: los botones ‹ › de etapa crecen a tamaño táctil (global.css les pone min-height 44px) */
@media (max-width:719px){.mv{width:36px;height:36px;min-height:36px;font-size:16px}}
`

type Etapa = Lead['etapa']
const ETAPAS: Etapa[] = ['Prospecto', 'Diagnóstico', 'Cotizado', 'Negociación', 'Ganado']
const RESPONSABLES = ['Laura Herrera', 'Miguel Torres', 'Daniela Ruiz', 'Comercial AI27']
type Deal = { id: string; name: string; what: string; amt: string; next: string; cls: string; etapa: Etapa; resp: string; prob: number; store?: boolean }
const D = (id: string, etapa: Etapa, name: string, what: string, amt: string, next: string, cls: string, resp: string, prob: number): Deal => ({ id, etapa, name, what, amt, next, cls: 'pill ' + cls, resp, prob })
/** Oportunidades del diseño (las mismas que vivían en el kanban de Clientes). */
const DEALS0: Deal[] = [
  D('d1', 'Prospecto', 'Grupo Textil Arrayán', 'Eventos Puebla–Pacífico', '$420K', 'Llamar 9 oct', 'p-mute', 'Laura Herrera', 30),
  D('d2', 'Prospecto', 'Cementos del Centro', 'Monitoreo 60 unidades', '$780K', 'Correo hoy', 'p-warn', 'Miguel Torres', 38),
  D('d3', 'Diagnóstico', 'Distribuidora Peninsular', 'Dedicado 4 custodios', '$560K', 'Visita 10 oct', 'p-info', 'Daniela Ruiz', 71),
  D('d4', 'Cotizado', 'Marsh', 'Méx–SLP nocturno', '$190K/evento', 'Seguimiento 8 oct', 'p-warn', 'Laura Herrera', 52),
  D('d5', 'Cotizado', 'Agroexport Sinaloa', 'Eventos Culiacán–Nogales', '$1.4M', 'Vencido 2 días', 'p-bad', 'Miguel Torres', 64),
  D('d6', 'Negociación', 'Farmacéutica Orión', 'Ampliar a Monterrey dedicado', '$1.6M', 'Junta 14 oct', 'p-info', 'Daniela Ruiz', 85),
  D('d7', 'Ganado', 'Autopartes Saltillo', 'Renovación 12 meses', '$188K/mes', 'Firmado', 'p-ok', 'Laura Herrera', 100),
]
/** Totales por etapa del diseño; al mover oportunidades se ajustan con la diferencia. */
const TOTAL0: Record<Etapa, number> = { Prospecto: 1.2e6, Diagnóstico: 0.9e6, Cotizado: 2.1e6, Negociación: 1.6e6, Ganado: 0.7e6 }
const PROB_ETAPA: Record<Etapa, number> = { Prospecto: 30, Diagnóstico: 45, Cotizado: 60, Negociación: 80, Ganado: 100 }
const monto = (s: string) => { const m = /\$?([\d.]+)\s*([KM])?/i.exec(s); if (!m) return 0; const n = parseFloat(m[1]); return m[2]?.toUpperCase() === 'M' ? n * 1e6 : m[2]?.toUpperCase() === 'K' ? n * 1e3 : n }

type Actividad = { empresa: string; tipo: string; nota: string; fecha: string }
const TH = 'text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED'
const TH_R = TH + ';text-align:right'
const td = 'padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap'
const PILL_ON = 'background:#E9EDFB;color:#0D1D41'
const hoy = () => new Date().toISOString().slice(0, 10)

const altaVacia = (empresa = '') => ({ nombre: empresa, sector: 'Alimentos y bebidas', contacto: '', correo: '', telefono: '', tipo: 'Por evento' as ClienteCRM['modelo'], tarifa: '' })

export default function Oportunidades() {
  const toast = useToast()
  const navigate = useNavigate()
  // Celular: el pipeline se recorre con scroll horizontal (una etapa por pantalla) y la tabla se muestra como tarjetas.
  const movil = useViewport() === 'movil'
  const leadsStore = useStore(s => s.leads ?? [])
  const nuevos = useStore(s => s.clientesNuevos ?? [])
  const clientes = useMemo(() => [...todosLosClientes(nuevos), AUTOPARTES], [nuevos])
  const esCliente = (empresa: string) => clientes.some(c => c.nombre === empresa)

  const [deals, setDeals] = useState<Deal[]>(DEALS0)
  const [acts, setActs] = useState<Actividad[]>([
    { empresa: 'Marsh', tipo: 'Correo', nota: 'Enviada cotización COT-1182 Méx–SLP nocturno.', fecha: '2026-10-07' },
    { empresa: 'Farmacéutica Orión', tipo: 'Reunión', nota: 'Revisión de alcance para Monterrey dedicado; piden 3 custodios con portación.', fecha: '2026-10-06' },
    { empresa: 'Agroexport Sinaloa', tipo: 'Sistema', nota: 'Cotización vencida; el cliente abrió el PDF 4 veces.', fecha: '2026-10-05' },
    { empresa: 'Distribuidora Peninsular', tipo: 'Llamada', nota: 'Agendada visita a Mérida el 10 oct.', fecha: '2026-10-03' },
  ])
  // modales
  const [leadOpen, setLeadOpen] = useState(false)
  const [lead, setLead] = useState({ empresa: '', que: '', monto: '', siguiente: 'Llamar mañana', resp: RESPONSABLES[0] })
  const [respStore, setRespStore] = useState<Record<string, string>>({})
  const [actOpen, setActOpen] = useState(false)
  const [act, setAct] = useState({ empresa: '', tipo: 'Llamada', nota: '' })
  const [ganado, setGanado] = useState<Deal | null>(null)
  const [alta, setAlta] = useState(altaVacia())
  // filtros de la tabla
  const [fEtapa, setFEtapa] = useState<'todas' | Etapa>('todas')
  const [fResp, setFResp] = useState('todos')
  const [busca, setBusca] = useState('')

  // Pipeline: oportunidades del diseño (estado local) + leads del store
  const allDeals: Deal[] = useMemo(() => [
    ...deals,
    ...leadsStore.map(l => ({ ...D(l.id, l.etapa, l.empresa, l.que, l.monto || '—', l.siguiente, l.etapa === 'Ganado' ? 'p-ok' : 'p-mute', respStore[l.id] ?? 'Comercial AI27', PROB_ETAPA[l.etapa]), store: true })),
  ], [deals, leadsStore, respStore])
  const totalEtapa = (e: Etapa) => {
    const base = TOTAL0[e] - DEALS0.filter(d => d.etapa === e).reduce((a, d) => a + monto(d.amt), 0)
    return Math.max(0, base + allDeals.filter(d => d.etapa === e).reduce((a, d) => a + monto(d.amt), 0))
  }
  const abiertas = allDeals.filter(d => d.etapa !== 'Ganado')
  const ganadas = allDeals.filter(d => d.etapa === 'Ganado')
  const pipelineTotal = ETAPAS.filter(e => e !== 'Ganado').reduce((a, e) => a + totalEtapa(e), 0)
  const probProm = abiertas.length ? Math.round(abiertas.reduce((a, d) => a + d.prob, 0) / abiertas.length) : 0
  const ganadoMes = ganadas.reduce((a, d) => a + monto(d.amt), 0)

  const mover = (d: Deal, dir: 1 | -1) => {
    const i = ETAPAS.indexOf(d.etapa) + dir
    if (i < 0 || i >= ETAPAS.length) return
    const etapa = ETAPAS[i]
    if (d.store) actions.moverLead(d.id, etapa)
    else setDeals(ds => ds.map(x => (x.id === d.id ? { ...x, etapa, prob: etapa === 'Ganado' ? 100 : Math.max(x.prob, PROB_ETAPA[etapa]), cls: etapa === 'Ganado' ? 'pill p-ok' : x.cls, next: etapa === 'Ganado' ? 'Firmado' : x.next } : x)))
    setActs(a => [{ empresa: d.name, tipo: 'Etapa', nota: `Movida a ${etapa}`, fecha: hoy() }, ...a])
    if (etapa === 'Ganado') {
      setAlta(altaVacia(d.name))
      setGanado({ ...d, etapa })
      toast(`¡${d.name} ganada!`)
    } else toast(`${d.name} movida a ${etapa}`, 'info')
  }

  function guardarLead() {
    if (!lead.empresa.trim()) { toast('Escribe la empresa de la oportunidad', 'warn'); return }
    const id = actions.crearLead({ empresa: lead.empresa.trim(), que: lead.que.trim() || 'Por calificar', monto: lead.monto.trim(), siguiente: lead.siguiente })
    setRespStore(r => ({ ...r, [id]: lead.resp }))
    setActs(a => [{ empresa: lead.empresa.trim(), tipo: 'Nueva', nota: `Oportunidad creada en Prospecto · ${lead.resp}`, fecha: hoy() }, ...a])
    setLeadOpen(false)
    setLead({ empresa: '', que: '', monto: '', siguiente: 'Llamar mañana', resp: RESPONSABLES[0] })
    toast(`Oportunidad ${lead.empresa.trim()} agregada a Prospecto`)
  }
  function abrirActividad(empresa: string, tipo = 'Llamada') { setAct({ empresa, tipo, nota: '' }); setActOpen(true) }
  function guardarActividad() {
    if (!act.nota.trim()) { toast('Escribe una nota de la actividad', 'warn'); return }
    setActs(a => [{ empresa: act.empresa, tipo: act.tipo, nota: act.nota.trim(), fecha: hoy() }, ...a])
    setActOpen(false)
    toast(`${act.tipo} registrada para ${act.empresa}`)
  }
  function darDeAlta() {
    if (!alta.nombre.trim()) { toast('Escribe el nombre del cliente', 'warn'); return }
    const nombre = alta.nombre.trim()
    actions.crearCliente({ ...alta, nombre, contacto: alta.contacto.trim() || 'Por asignar', correo: alta.correo.trim() || `logistica@${nombre.toLowerCase().replace(/[^a-z]/g, '')}.com.mx`, telefono: alta.telefono.trim() || '55 0000 0000' })
    setGanado(null)
    toast(`Cliente ${nombre} dado de alta`)
    navigate(ROUTES.CRM + '?cliente=' + encodeURIComponent(nombre))
  }

  // Tabla plegada
  const q = busca.trim().toLowerCase()
  const rows = useMemo(() => {
    let r = allDeals
    if (fEtapa !== 'todas') r = r.filter(d => d.etapa === fEtapa)
    if (fResp !== 'todos') r = r.filter(d => d.resp === fResp)
    if (q) r = r.filter(d => d.name.toLowerCase().includes(q) || d.what.toLowerCase().includes(q) || d.resp.toLowerCase().includes(q))
    return [...r].sort((a, b) => ETAPAS.indexOf(b.etapa) - ETAPAS.indexOf(a.etapa) || monto(b.amt) - monto(a.amt))
  }, [allDeals, fEtapa, fResp, q])
  const pg = usePagination(rows.length, 10)

  const top = [...abiertas].sort((a, b) => b.prob - a.prob).slice(0, 5)
  const cotizarA = (d: Deal) => ROUTES.Cotizador + '?cliente=' + encodeURIComponent(d.name)
  /** Acción de la última columna de la tabla (la comparten la fila de escritorio y la tarjeta de celular). */
  const accionDe = (d: Deal) => d.etapa !== 'Ganado' ? <Link className="btn btn-sm" to={cotizarA(d)}>Cotizar</Link> : !esCliente(d.name) ? <button type="button" className="btn btn-sm" onClick={() => { setAlta(altaVacia(d.name)); setGanado(d) }}>Dar de alta</button> : <Link className="btn btn-sm" to={ROUTES.CRM}>Ver cliente</Link>

  return (
    <Shell active="oportunidades" css={CSS}>
      <PageHeader seccion="Comercial" titulo="Oportunidades"
        descripcion="Empresas que todavía no son clientes o ventas nuevas a clientes actuales, por etapa. Avanza cada oportunidad de Prospecto a Ganado y, al ganarla, dala de alta como cliente."
        accion={{ label: 'Nueva oportunidad', onClick: () => setLeadOpen(true) }}
        secundarias={<Link className="btn" to={ROUTES.CRM}>Ver clientes</Link>} />

      <section aria-label="Sugerencia de la IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}>
          <span style={sx('font-weight:600')}>Siguiente mejor acción: llamar hoy a Agroexport Sinaloa</span>
          <span style={sx('font-size:14px;color:#3E4A59')}>Su cotización venció hace 2 días y abrió el PDF 4 veces. Si se le llama hoy, la probabilidad de cierre estimada es 64%. Farmacéutica Orión es la oportunidad con más probabilidad (85%): conviene confirmar la junta del 14 oct.</span>
        </div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label={'Probabilidad de cierre por oportunidad: ' + top.map(d => `${d.name} ${d.prob}%`).join(', ')} style={sx('display:block')}>
            <g fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#3E4A59">
              {top.map((d, i) => { const hgt = Math.round(d.prob / 100 * 51); return <g key={d.id}><rect x={4 + i * 44} y={60 - hgt} width="30" height={hgt} rx="2" fill={i === 0 ? '#2B9A66' : d.name === 'Agroexport Sinaloa' ? '#3448A8' : i === 4 ? '#AEB8C4' : '#475CC7'}></rect>{(i === 0 || d.name === 'Agroexport Sinaloa') && <text x={8 + i * 44} y={56 - hgt}>{d.prob}%</text>}</g> })}
            </g>
          </svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Probabilidad de cierre · las 5 más probables</figcaption>
        </figure>
        <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
          <button type="button" className="btn" onClick={() => abrirActividad('Agroexport Sinaloa')}>Registrar llamada a Agroexport</button>
          <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
        </div>
      </section>

      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px')}>
        <div className="kpi"><span className="lbl">Oportunidades abiertas</span><span className="k">{abiertas.length}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{abiertas.filter(d => d.next.startsWith('Vencido')).length} con seguimiento vencido</span></div>
        <div className="kpi"><span className="lbl">Monto en pipeline</span><span className="k">{fmtM(pipelineTotal)}</span><span style={sx('font-size:12px;color:#5F6B7A')}>valor mensual estimado, sin Ganado</span></div>
        <div className="kpi"><span className="lbl">Probabilidad promedio</span><span className="k" style={sx('color:' + (probProm >= 50 ? '#17784A' : '#9A5B00'))}>{probProm}%</span><span style={sx('font-size:12px;color:#5F6B7A')}>de las abiertas, según etapa y actividad</span></div>
        <div className="kpi"><span className="lbl">Cierres del mes</span><span className="k">{ganadas.length}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{ganadoMes ? fmtM(ganadoMes) + ' al mes ganados en octubre' : 'ninguno todavía en octubre'}</span></div>
      </div>

      <Section titulo="Pipeline por etapa" ayuda="Cada tarjeta es una oportunidad. Usa ‹ › para regresar o avanzar de etapa; al llegar a Ganado te proponemos darla de alta como cliente.">
        {/* Celular: 5 columnas de ~una pantalla cada una con scroll horizontal y ajuste por etapa (la siguiente asoma a la derecha) */}
        <div style={sx(movil ? 'overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;padding-bottom:4px' : 'overflow-x:auto')}>
          <div style={sx(movil ? 'display:grid;grid-template-columns:repeat(5,min(300px,84vw));gap:10px;--sx-fijo:1' : 'display:grid;grid-template-columns:repeat(5,minmax(196px,1fr));gap:10px;min-width:1020px')}>
            {ETAPAS.map((e, ei) => (
              <div key={e} style={sx('background:#F3F5F8;border:1px solid #E4E8ED;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px' + (movil ? ';scroll-snap-align:start' : ''))}>
                <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap')}><span style={sx('font-weight:600;font-size:14px;white-space:nowrap')}>{ei + 1}. {e}</span><span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{allDeals.filter(d => d.etapa === e).length} · {fmtM(totalEtapa(e))}</span></div>
                {allDeals.filter(d => d.etapa === e).map(d => (
                  <article key={d.id} className="op-card" aria-label={`${d.name}: ${d.what}`}>
                    <div style={sx('display:flex;justify-content:space-between;gap:6px;align-items:flex-start')}>
                      <span style={sx('font-weight:600;font-size:14px;line-height:1.3')}>{d.name}{esCliente(d.name) && <span className="pill p-info" style={sx('margin-left:6px;vertical-align:middle')}>cliente</span>}</span>
                      <span style={sx('display:flex;gap:4px;flex:none')}>
                        <button type="button" className="mv" aria-label={`Regresar ${d.name} a la etapa anterior`} title="Regresar a la etapa anterior" disabled={ei === 0} onClick={() => mover(d, -1)}>‹</button>
                        <button type="button" className="mv" aria-label={`Avanzar ${d.name} a la siguiente etapa`} title={ei === ETAPAS.length - 2 ? 'Marcar como ganada' : 'Avanzar a la siguiente etapa'} disabled={ei === ETAPAS.length - 1} onClick={() => mover(d, 1)}>›</button>
                      </span>
                    </div>
                    <span style={sx('font-size:13px;color:#3E4A59')}>{d.what}</span>
                    <div style={sx('display:flex;justify-content:space-between;gap:6px;align-items:center;flex-wrap:wrap')}><span className="mono" style={sx('font-size:14px;font-weight:500')}>{d.amt}</span><span className={d.cls} style={sx('white-space:normal;text-align:right')}>{d.next}</span></div>
                    <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px;color:#5F6B7A;border-top:1px solid #EEF1F4;padding-top:6px')}>
                      <span title="Responsable">{d.resp}</span>
                      <span className="mono">{d.prob}%</span>
                    </div>
                    <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}>
                      {e !== 'Ganado' && <Link className="btn btn-sm" to={cotizarA(d)}>Cotizar</Link>}
                      {e === 'Ganado' && !esCliente(d.name) && <button type="button" className="btn btn-sm" onClick={() => { setAlta(altaVacia(d.name)); setGanado(d) }}>Dar de alta como cliente</button>}
                      {e === 'Ganado' && esCliente(d.name) && <Link className="btn btn-sm" to={ROUTES.CRM}>Ver cliente</Link>}
                      <button type="button" className="btn btn-sm" onClick={() => abrirActividad(d.name)}>Registrar actividad</button>
                    </div>
                  </article>
                ))}
                {allDeals.filter(d => d.etapa === e).length === 0 && <span style={sx('font-size:12px;color:#5F6B7A')}>Sin oportunidades en esta etapa</span>}
              </div>
            ))}
          </div>
        </div>
        <Nota>{movil ? 'Desliza a los lados para ver las 5 etapas. ' : ''}Monto: valor mensual estimado en MXN. Probabilidad: estimación de la IA según la etapa, la actividad del cliente y el historial de cierres parecidos.</Nota>
      </Section>

      <Section titulo="Todas las oportunidades" ayuda={`${allDeals.length} oportunidades en total. Filtra por etapa o responsable; haz clic en “Cotizar” para armar la propuesta.`} plegable abierto={false} style="padding:20px 8px 12px"
        acciones={<>
          <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar empresa…" aria-label="Buscar oportunidad" style={sx(inputStyle + (movil ? ';width:100%' : ';width:180px') + ';min-height:34px')} />
          <select aria-label="Filtrar por etapa" value={fEtapa} onChange={e => setFEtapa(e.target.value as 'todas' | Etapa)} style={sx(inputStyle + (movil ? ';flex:1 1 140px;width:auto' : ';width:auto') + ';min-height:34px')}><option value="todas">Todas las etapas</option>{ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}</select>
          <select aria-label="Filtrar por responsable" value={fResp} onChange={e => setFResp(e.target.value)} style={sx(inputStyle + (movil ? ';flex:1 1 140px;width:auto' : ';width:auto') + ';min-height:34px')}><option value="todos">Todos los responsables</option>{RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
        </>}>
        {movil ? (
          // Celular: una tarjeta por oportunidad con los mismos datos que la fila
          <div style={sx('display:flex;flex-direction:column;gap:8px;padding:0 6px')}>
            {rows.slice(pg.from, pg.to).map(d => (
              <article key={d.id} className="op-card" aria-label={`${d.name}: ${d.what}`}>
                <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start')}><span style={sx('font-weight:600;font-size:14px;line-height:1.3')}>{d.name}{esCliente(d.name) && <span className="pill p-info" style={sx('margin-left:6px;vertical-align:middle')}>cliente</span>}</span><span className="mono" style={sx('font-size:14px;font-weight:500;flex:none')}>{d.amt}</span></div>
                <span style={sx('font-size:13px;color:#3E4A59')}>{d.what}</span>
                <div style={sx('display:flex;gap:6px;flex-wrap:wrap;align-items:center')}><span className={'pill ' + (d.etapa === 'Ganado' ? 'p-ok' : 'p-mute')} style={sx(d.etapa !== 'Ganado' ? PILL_ON : '')}>{ETAPAS.indexOf(d.etapa) + 1}. {d.etapa}</span><span className={d.cls}>{d.next}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')} title="Probabilidad de cierre">{d.prob}%</span></div>
                <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px;color:#5F6B7A;border-top:1px solid #EEF1F4;padding-top:6px')}><span title="Responsable">{d.resp}</span>{accionDe(d)}</div>
              </article>
            ))}
            {rows.length === 0 && <span style={sx('padding:12px 6px;color:#5F6B7A;text-align:center;font-size:14px')}>Ninguna oportunidad coincide con el filtro. Prueba con otra empresa o quita el filtro.</span>}
          </div>
        ) : (
        <div style={sx('overflow-x:auto')}>
          <table style={sx('width:100%;border-collapse:collapse;font-size:14px')}>
            <thead><tr>
              <th style={sx(TH)}>Empresa</th><th style={sx(TH)}>Qué necesita</th><th style={sx(TH)}>Etapa</th><th style={sx(TH_R)}>Monto</th><th style={sx(TH_R)}>Prob.</th><th style={sx(TH)}>Siguiente paso</th><th style={sx(TH)}>Responsable</th><th style={sx(TH)}></th>
            </tr></thead>
            <tbody>
              {rows.slice(pg.from, pg.to).map(d => (
                <tr key={d.id} className="op-row">
                  <td style={sx(td + ';font-weight:500')}>{d.name}{esCliente(d.name) && <span className="pill p-info" style={sx('margin-left:8px')}>cliente</span>}</td>
                  <td style={sx(td + ';white-space:normal;min-width:200px;color:#3E4A59')}>{d.what}</td>
                  <td style={sx(td)}><span className={'pill ' + (d.etapa === 'Ganado' ? 'p-ok' : 'p-mute')} style={sx(d.etapa !== 'Ganado' ? PILL_ON : '')}>{ETAPAS.indexOf(d.etapa) + 1}. {d.etapa}</span></td>
                  <td className="mono" style={sx(td + ';text-align:right')}>{d.amt}</td>
                  <td className="mono" style={sx(td + ';text-align:right')}>{d.prob}%</td>
                  <td style={sx(td)}><span className={d.cls}>{d.next}</span></td>
                  <td style={sx(td + ';color:#3E4A59')}>{d.resp}</td>
                  <td style={sx(td + ';text-align:right')}>{accionDe(d)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} style={sx('padding:20px 12px;color:#5F6B7A;text-align:center')}>Ninguna oportunidad coincide con el filtro. Prueba con otra empresa o quita el filtro.</td></tr>}
            </tbody>
          </table>
        </div>
        )}
        <div style={sx('padding:0 12px')}><Pager {...pg} /></div>
      </Section>

      <Section titulo="Actividad reciente" ayuda="Llamadas, correos, visitas y cambios de etapa, lo más nuevo arriba." plegable abierto={false}>
        <div style={sx('display:flex;flex-direction:column;gap:8px;font-size:13px')}>
          {acts.slice(0, 12).map((a, i) => (
            <div key={i} style={sx('display:flex;gap:10px;align-items:baseline;flex-wrap:wrap')}><span className="mono" style={sx('color:#3E4A59')}>{a.fecha}</span><span className="pill p-mute">{a.tipo}</span><span style={sx('font-weight:500')}>{a.empresa}</span><span style={sx('color:#3E4A59')}>{a.nota}</span></div>
          ))}
          {acts.length === 0 && <span style={sx('color:#5F6B7A')}>Sin actividad registrada. Usa “Registrar actividad” en una tarjeta.</span>}
        </div>
      </Section>

      <Modal open={leadOpen} onClose={() => setLeadOpen(false)} title="Nueva oportunidad" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setLeadOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarLead}>Agregar a Prospecto</button></>}>
        <Field label="Empresa"><input style={sx(inputStyle)} value={lead.empresa} onChange={e => setLead({ ...lead, empresa: e.target.value })} placeholder="Ej. Agroindustrias del Bajío" autoFocus list="op-clientes" /></Field>
        <datalist id="op-clientes">{clientes.map(c => <option key={c.nombre} value={c.nombre} />)}</datalist>
        <Field label="Qué necesita"><input style={sx(inputStyle)} value={lead.que} onChange={e => setLead({ ...lead, que: e.target.value })} placeholder="Ej. Eventos Qro–Mty nocturnos" /></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Valor mensual estimado"><input style={sx(inputStyle)} value={lead.monto} onChange={e => setLead({ ...lead, monto: e.target.value })} placeholder="$350K" /></Field>
          <Field label="Siguiente paso"><select style={sx(inputStyle)} value={lead.siguiente} onChange={e => setLead({ ...lead, siguiente: e.target.value })}>{['Llamar mañana', 'Correo hoy', 'Visita esta semana', 'Enviar cotización', 'Calificar hoy'].map(s => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Responsable"><select style={sx(inputStyle)} value={lead.resp} onChange={e => setLead({ ...lead, resp: e.target.value })}>{RESPONSABLES.map(r => <option key={r}>{r}</option>)}</select></Field>
        <Nota>Si la empresa ya es cliente (elige su nombre de la lista), la oportunidad cuenta como venta nueva a cliente actual.</Nota>
      </Modal>

      <Modal open={actOpen} onClose={() => setActOpen(false)} title={`Registrar actividad · ${act.empresa}`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setActOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarActividad}>Guardar</button></>}>
        <Field label="Tipo"><select style={sx(inputStyle)} value={act.tipo} onChange={e => setAct({ ...act, tipo: e.target.value })}>{['Llamada', 'Correo', 'Visita', 'Reunión', 'WhatsApp'].map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Nota"><textarea rows={4} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={act.nota} onChange={e => setAct({ ...act, nota: e.target.value })} placeholder="Qué se acordó y siguiente paso" autoFocus /></Field>
      </Modal>

      <Modal open={ganado !== null} onClose={() => setGanado(null)} title={`¡${ganado?.name ?? ''} ganada! · Dar de alta como cliente`}
        footer={<><button type="button" style={sx(btnStyle)} onClick={() => setGanado(null)}>Más tarde</button>{ganado && esCliente(ganado.name) ? <Link className="btn btn-pri" to={ROUTES.CRM} onClick={() => setGanado(null)}>Ver cliente</Link> : <button type="button" style={sx(btnPriStyle)} onClick={darDeAlta}>Dar de alta como cliente</button>}</>}>
        {ganado && esCliente(ganado.name) ? (
          <Nota>{ganado.name} ya es cliente: esta venta ({ganado.what}, {ganado.amt}) se suma a su cuenta. Ve a su ficha para asignar custodios y unidades.</Nota>
        ) : (
          <>
            <Nota>La oportunidad {ganado?.what} ({ganado?.amt}) se ganó. Completa los datos para que {ganado?.name} aparezca en Clientes y puedas asignarle custodios y unidades.</Nota>
            <Field label="Nombre o razón social"><input style={sx(inputStyle)} value={alta.nombre} onChange={e => setAlta({ ...alta, nombre: e.target.value })} autoFocus /></Field>
            <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
              <Field label="Sector"><select style={sx(inputStyle)} value={alta.sector} onChange={e => setAlta({ ...alta, sector: e.target.value })}>{['Alimentos y bebidas', 'Farmacéutica', 'Electrónica', 'Retail', 'Aseguradora', 'Textil', 'Química', 'Logística 3PL', 'Construcción', 'Automotriz', 'Agroindustria'].map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Tipo de servicio"><select style={sx(inputStyle)} value={alta.tipo} onChange={e => setAlta({ ...alta, tipo: e.target.value as ClienteCRM['modelo'] })}>{['Por evento', 'Dedicado', 'Monitoreo', 'Evento + monitoreo'].map(s => <option key={s}>{s}</option>)}</select></Field>
            </div>
            <Field label="Contacto principal"><input style={sx(inputStyle)} value={alta.contacto} onChange={e => setAlta({ ...alta, contacto: e.target.value })} placeholder="Nombre y puesto" /></Field>
            <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
              <Field label="Correo"><input type="email" style={sx(inputStyle)} value={alta.correo} onChange={e => setAlta({ ...alta, correo: e.target.value })} placeholder="logistica@empresa.com.mx" /></Field>
              <Field label="Teléfono"><input style={sx(inputStyle)} value={alta.telefono} onChange={e => setAlta({ ...alta, telefono: e.target.value })} placeholder="55 0000 0000" /></Field>
            </div>
            <Field label="Tarifa pactada"><input style={sx(inputStyle)} value={alta.tarifa} onChange={e => setAlta({ ...alta, tarifa: e.target.value })} placeholder={ganado?.amt && ganado.amt !== '—' ? ganado.amt : '$29.00/km'} /></Field>
          </>
        )}
      </Modal>
    </Shell>
  )
}
