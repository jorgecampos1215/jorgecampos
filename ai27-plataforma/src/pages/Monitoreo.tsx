import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { PageHeader, Pasos, Section, Nota } from '../components/Page'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { ROUTES } from '../lib/routes'
import { Modal, useToast, btnStyle, btnPriStyle } from '../components/ui'
import { simularEventos, type EventoTelemetria, type TipoEvento } from '../lib/telemetria'
import { unidadesMapa, HERO, conteosMapa, enZonaRiesgo, custodiosDeUnidad, type UnidadMapa } from '../data/monitoreo'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:600 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn:hover{background:#F3F5F8}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}.btn-pri:hover{background:#3448A8}
.city{font:500 13px 'Montserrat',sans-serif;fill:#5F6B7A}
@keyframes ping{0%{r:8;opacity:.9}100%{r:26;opacity:0}}
.ping{animation:ping 1.6s ease-out infinite}
@keyframes feedIn{from{background:#F0F3FD}to{background:transparent}}
.feed-new{animation:feedIn 2.4s ease-out}
.marker{cursor:pointer}.marker:hover circle,.marker:hover rect{stroke:#0D1D41;stroke-width:2}
.feed-row{cursor:pointer;background:transparent;border:0;border-top:1px solid #EEF1F4;text-align:left;font:inherit;color:inherit;width:100%}.feed-row:hover{background:#FAFBFC}
.kpi-btn{cursor:pointer;text-align:left;font:inherit;color:inherit}.kpi-btn:hover{border-color:#475CC7}
.lnk{background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline}.lnk:hover{color:#0D1D41}
.chip{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 14px;border-radius:999px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:600 13px 'Montserrat',sans-serif;cursor:pointer}
.chip:hover{background:#F3F5F8}
.chip[aria-pressed="true"]{background:#E9EDFB;border-color:#475CC7}
`

type Src = 'all' | 'samsara' | 'ruptela'
type Cat = 'all' | 'separacion' | 'senal' | 'riesgo'
type Ev = { k: string; t: string; text: string; src: 'Samsara' | 'Ruptela'; cls: string; nuevo?: boolean; unidad: string; tipo: string; velocidad?: number }

const SOURCES: [Src, string][] = [['all', 'Todas'], ['samsara', 'Samsara'], ['ruptela', 'Ruptela']]

const BASE: Ev[] = [
  { k: 'b1', t: '14:30:12', text: 'Desvío de ruta · TR-88213', src: 'Samsara', cls: 'pill p-bad', unidad: 'SRV-24817', tipo: 'Desvío de ruta' },
  { k: 'b2', t: '14:29:40', text: 'Separación 1.1 km · AU-3321 / TR-88213', src: 'Samsara', cls: 'pill p-warn', unidad: 'SRV-24817', tipo: 'Separación custodio–tráiler' },
  { k: 'b3', t: '14:27:03', text: 'Pérdida de señal · TR-71540', src: 'Ruptela', cls: 'pill p-warn', unidad: 'TR-71540', tipo: 'Pérdida de señal' },
  { k: 'b4', t: '14:25:51', text: 'Entrada a geocerca · CEDIS Monterrey', src: 'Samsara', cls: 'pill p-info', unidad: 'CEDIS Monterrey', tipo: 'Geocerca' },
  { k: 'b5', t: '14:24:18', text: 'Frenado brusco · AU-1876', src: 'Samsara', cls: 'pill p-mute', unidad: 'AU-1876', tipo: 'Frenado brusco' },
  { k: 'b6', t: '14:22:09', text: 'Parada no autorizada 6 min · TR-66012', src: 'Ruptela', cls: 'pill p-warn', unidad: 'TR-66012', tipo: 'Parada no autorizada' },
  { k: 'b7', t: '14:20:44', text: 'Evento de cámara: distracción · AU-2051', src: 'Samsara', cls: 'pill p-mute', unidad: 'AU-2051', tipo: 'Evento de cámara' },
  // Alertas abiertas anteriores (las del dashboard): se ven con "Ver los N eventos" y cuentan en los contadores.
  { k: 'b8', t: '14:19:30', text: 'Separación 1.8 km · SRV-24803 / Arco Norte', src: 'Samsara', cls: 'pill p-warn', unidad: 'SRV-24803', tipo: 'Separación custodio–tráiler' },
  { k: 'b9', t: '14:18:02', text: 'Pérdida de señal 9 min · C-214', src: 'Ruptela', cls: 'pill p-warn', unidad: 'C-214', tipo: 'Pérdida de señal' },
  { k: 'b10', t: '14:16:47', text: 'Pérdida de señal · TR-69320', src: 'Samsara', cls: 'pill p-warn', unidad: 'TR-69320', tipo: 'Pérdida de señal' },
]

/** Texto y severidad por tipo de evento normalizado (adaptador Samsara/Ruptela). */
const TIPO: Record<TipoEvento, [string, string]> = {
  ubicacion: ['Posición reportada', 'pill p-mute'],
  parada: ['Parada detectada', 'pill p-warn'],
  desvio: ['Desvío de ruta', 'pill p-bad'],
  geocerca: ['Salida de geocerca', 'pill p-info'],
  panico: ['Botón de pánico', 'pill p-bad'],
  gps_desconectado: ['Pérdida de señal', 'pill p-warn'],
  frenado_brusco: ['Frenado brusco', 'pill p-mute'],
  separacion: ['Separación custodio–tráiler', 'pill p-warn'],
  zona_riesgo: ['Entrada a zona de riesgo', 'pill p-warn'],
}

const T0 = 14 * 3600 + 30 * 60 + 12 // 14:30:12, último evento del diseño
const hms = (s: number) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':')

function toEv(e: EventoTelemetria, i: number): Ev {
  const [label, cls] = TIPO[e.tipo]
  const extra = e.tipo === 'ubicacion' ? ` ${e.velocidad} km/h` : ''
  return { k: 'live' + i, t: hms(T0 + (i + 1) * 23), text: `${label}${extra} · ${e.unidad}`, src: e.fuente === 'samsara' ? 'Samsara' : 'Ruptela', cls, nuevo: true, unidad: e.unidad, tipo: label, velocidad: e.velocidad }
}

/** Puntos de la ruta de SRV-24817 en el mapa, ligados al porcentaje del replay. */
const RUTA: [number, number, number][] = [[0, 500, 370], [41, 470, 330], [77, 456, 337], [100, 438, 344]]
function posReplay(r: number) {
  for (let i = 1; i < RUTA.length; i++) {
    const [p0, x0, y0] = RUTA[i - 1], [p1, x1, y1] = RUTA[i]
    if (r <= p1) { const f = (r - p0) / (p1 - p0); return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f] }
  }
  return [438, 344]
}

const ESTADO_CLS: Record<UnidadMapa['estado'], string> = { Desvío: 'pill p-bad', 'En ruta': 'pill p-ok', Detenido: 'pill p-mute', 'Sin señal': 'pill p-warn' }
const tel = (t: string) => 'tel:+52' + t.replace(/\D/g, '')
const FEED_TITULO: Record<Cat, string> = { all: 'Eventos de telemetría', separacion: 'Separaciones custodio–tráiler', senal: 'Unidades sin señal', riesgo: 'Unidades en zona de riesgo' }

export default function Monitoreo() {
  const navigate = useNavigate()
  const toast = useToast()
  // Celular: contadores a 2 columnas, mapa con scroll horizontal (para que ciudades y marcadores sigan legibles) y detalle del evento más compacto.
  const movil = useViewport() === 'movil'
  const [src, setSrc] = useState<Src>('all')
  const [cat, setCat] = useState<Cat>('all')
  const [feedKey, setFeedKey] = useState(0) // > 0 cuando un contador pidió abrir el feed
  const [selId, setSelId] = useState(HERO.id)
  const [verTodos, setVerTodos] = useState(false)
  const [modal, setModal] = useState<{ tipo: 'llamar'; u: UnidadMapa } | { tipo: 'evento'; e: Ev } | null>(null)
  const [replay, setReplay] = useState(92)
  const [playing, setPlaying] = useState(false)
  const sim = useMemo(() => simularEventos(60).map(toEv), [])
  const [live, setLive] = useState(0)

  // Feed en vivo: cada 6 s entra un evento normalizado desde el adaptador de telemetría.
  useEffect(() => {
    const id = window.setInterval(() => setLive(n => Math.min(n + 1, sim.length)), 6000)
    return () => window.clearInterval(id)
  }, [sim.length])

  // Reproducción automática del replay.
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setReplay(r => { if (r >= 100) { setPlaying(false); return 100 } return r + 1 }), 120)
    return () => window.clearInterval(id)
  }, [playing])

  const unidades = useMemo(() => unidadesMapa.filter(u => src === 'all' || u.fuente.toLowerCase() === src), [src])
  const conteos = useMemo(() => conteosMapa(unidades), [unidades])
  const sel = unidadesMapa.find(u => u.id === selId) ?? HERO
  const riesgo = enZonaRiesgo(unidades)

  const all = [...sim.slice(0, live).reverse(), ...BASE]
  const porFuente = src === 'all' ? all : all.filter(e => e.src.toLowerCase() === src)
  const alertasAbiertas = porFuente.filter(e => !e.text.startsWith('Posición'))
  const separacion = porFuente.filter(e => e.text.startsWith('Separación'))
  const sinSenal = porFuente.filter(e => e.text.startsWith('Pérdida de señal'))
  const feedCat = cat === 'separacion' ? separacion : cat === 'senal' ? sinSenal : porFuente
  const events = verTodos ? feedCat : feedCat.slice(0, 7)
  const sev = { crit: alertasAbiertas.filter(e => e.cls.includes('p-bad')).length, alta: alertasAbiertas.filter(e => e.cls.includes('p-warn')).length, media: alertasAbiertas.filter(e => e.cls.includes('p-info') || e.cls.includes('p-mute')).length }

  const mins = Math.round(492 + (870 - 492) * replay / 100)
  const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0')
  const replayLabel = hh + ':' + mm + ' · ' + Math.round(replay * 2.1) + ' km recorridos'
  const [rx, ry] = posReplay(replay)

  const seleccionar = (u: UnidadMapa) => { setSelId(u.id); setModal(null) }
  /** En celular abre el marcador; en escritorio copia el número y registra la llamada en la bitácora. */
  const llamar = (nombre: string, telefono: string) => {
    if (window.matchMedia?.('(pointer:coarse)').matches) window.location.href = tel(telefono)
    else navigator.clipboard?.writeText(telefono).catch(() => {})
    toast(`Llamando a ${nombre} · ${telefono} · registrado en bitácora`)
    setModal(null)
  }
  const verEnMapa = (e: Ev) => {
    const u = unidadesMapa.find(x => x.id === e.unidad || x.auto === e.unidad || x.trailer === e.unidad)
    if (u) { seleccionar(u); toast(`${u.id} seleccionado en el mapa`, 'info') } else toast(`${e.unidad} no tiene posición en el mapa de rutas activas`, 'warn')
    setModal(null)
  }
  /** Los contadores filtran el feed y lo abren. */
  const filtrarFeed = (k: Cat) => {
    setCat(c => (c === k ? 'all' : k))
    setVerTodos(false)
    setFeedKey(n => n + 1)
    window.setTimeout(() => document.getElementById('feed-eventos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const kpiBtn = (k: Cat, label: string, n: number, sub: string) => (
    <button type="button" className="card kpi-btn" aria-pressed={cat === k} onClick={() => filtrarFeed(k)} title={cat === k ? 'Quitar filtro' : 'Ver estos eventos'} style={sx('display:flex;flex-direction:column;gap:4px;padding:14px 18px' + (cat === k ? ';border-color:#475CC7;background:#F0F3FD' : ''))}>
      <span className="lbl">{label}</span><span style={sx("font-family:'Montserrat';font-size:26px;font-weight:600")}>{n}</span><span style={sx('font-size:13px;color:#5F6B7A')}>{sub}</span>
    </button>
  )

  return (
    <Shell active="monitoreo" css={CSS} mainStyle="flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px">
      <PageHeader seccion="Operación" titulo="Mapa en vivo"
        descripcion="Dónde están ahora los tráileres y custodios de cada servicio, y qué alertas necesitan atención. Para el monitorista de turno."
        accion={{ label: 'Atender incidente', to: ROUTES.Reaccion }}>
        <span style={sx('color:#5F6B7A;font-size:13px')}>{conteos.custodios} custodios · {conteos.autos} autos de custodia · {conteos.trailers} tráileres reportando{src !== 'all' ? ` · solo ${src === 'samsara' ? 'Samsara' : 'Ruptela'}` : ''}</span>
      </PageHeader>
      <Pasos actual={3} />

      <section aria-label="Sugerencia de la IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:14px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}>
          <span style={sx('font-weight:600')}>Sugerencia de la IA: escalar <button type="button" className="lnk" onClick={() => seleccionar(HERO)}>SRV-24817</button> a incidente ahora</span>
          <span style={sx('font-size:14px;color:#3E4A59')}>Su desvío coincide 87% con 5 robos previos en Méx–Qro: salida a terracería, velocidad baja y separación del custodio. Conviene pre-alertar a la unidad de reacción R-03.</span>
        </div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="56" viewBox="0 0 220 64" role="img" aria-label="Incidentes por franja horaria: el pico está entre 21 y 24 horas, seguido de 00 a 03" style={sx('display:block')}><g fill="#AEB8C4"><rect x="4" y="12" width="20" height="48" rx="2"></rect><rect x="31" y="42" width="20" height="18" rx="2"></rect><rect x="58" y="54" width="20" height="6" rx="2"></rect><rect x="85" y="48" width="20" height="12" rx="2"></rect><rect x="139" y="30" width="20" height="30" rx="2"></rect><rect x="166" y="36" width="20" height="24" rx="2"></rect><rect x="193" y="6" width="20" height="54" rx="2"></rect></g><rect x="112" y="24" width="20" height="36" rx="2" fill="#D9534F"></rect></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Incidentes por franja de 3 h · rojo: ahora</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.Reaccion} onClick={() => toast('Escalado a Incidentes · unidad R-03 pre-alertada', 'warn')}>Escalar a Incidentes</Link>
      </section>

      <section aria-label="Contadores de alertas" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(' + (movil ? 140 : 200) + 'px,100%),1fr));gap:12px')}>
        {kpiBtn('all', 'Alertas abiertas', alertasAbiertas.length, `${sev.crit} crítica${sev.crit === 1 ? '' : 's'} · ${sev.alta} alta${sev.alta === 1 ? '' : 's'} · ${sev.media} media${sev.media === 1 ? '' : 's'}`)}
        {kpiBtn('separacion', 'Separación custodio–tráiler', separacion.length, 'Custodio a más de 1 km por más de 3 min')}
        {kpiBtn('senal', 'Sin señal', sinSenal.length, `${sinSenal.filter(e => e.src === 'Ruptela').length} Ruptela · ${sinSenal.filter(e => e.src === 'Samsara').length} Samsara`)}
        {kpiBtn('riesgo', 'En zona de riesgo', riesgo.length, 'Tramos con más robos: Arco Norte, Méx–Qro, Puebla–Orizaba')}
      </section>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:stretch')}>
        <section className="card" aria-label="Mapa de rutas activas" data-tour="mapa" style={sx('flex:999 1 620px;padding:0;overflow:hidden;position:relative;display:flex;flex-direction:column')}>
          <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;padding:14px 20px;border-bottom:1px solid #E4E8ED')}>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}>
              <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600;color:#0D1D41")}>{unidades.length} rutas activas</h2>
              <span style={sx('font-size:13px;color:#5F6B7A')}>Haz clic en una unidad para ver su detalle a la derecha.</span>
            </div>
            <div role="group" aria-label="Fuente de telemetría" style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
              <span className="lbl">Fuente</span>
              {SOURCES.map(([k, label]) => (
                <button key={k} type="button" className="chip" aria-pressed={k === src} onClick={() => setSrc(k)}>{label}</button>
              ))}
            </div>
          </div>
          {/* En celular el mapa mide al menos 640px y se desplaza en horizontal: a 360px los marcadores no se pueden tocar ni leer. */}
          {movil && <span style={sx('font-size:12px;color:#5F6B7A')}>Desliza el mapa hacia los lados para recorrer todo el país →</span>}
          <div style={sx(movil ? 'overflow-x:auto;-webkit-overflow-scrolling:touch' : '')}>
          <svg viewBox="0 0 900 560" role="img" aria-label={`Mapa de ${unidades.length} rutas activas`} style={sx((movil ? 'width:max(100%,640px)' : 'width:100%') + ';height:auto;display:block;background:#F7F9FB')}>
            <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#F3F5F8" strokeWidth="1"></path></pattern></defs>
            <rect width="900" height="560" fill="url(#g)"></rect>
            <path d="M560 120L480 250L450 320L500 370L560 390L660 370M300 330L390 290L450 320M480 250L390 290M500 370L470 380L300 330M500 370L520 345L560 120" fill="none" stroke="#D5DBE3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M500 370L470 330L450 320L480 250" fill="none" stroke="#3FA7C9" strokeWidth="3" strokeDasharray="2 0"></path>
            <path d="M470 330L438 344L450 320" fill="none" stroke="#F0605D" strokeWidth="3" strokeDasharray="6 5"></path>
            <path d="M520 345L560 120" fill="none" stroke="#3FA7C9" strokeWidth="3"></path>
            <path d="M560 390L660 370" fill="none" stroke="#3FA7C9" strokeWidth="3"></path>
            <g className="city">
              <text x="572" y="116">Monterrey</text><text x="492" y="246">San Luis Potosí</text><text x="236" y="352">Guadalajara</text><text x="352" y="280">León</text><text x="372" y="316">Querétaro</text><text x="512" y="398">CDMX</text><text x="532" y="340">Pachuca</text><text x="566" y="414">Puebla</text><text x="668" y="366">Veracruz</text>
              <text x="790" y="500">Sureste</text><text x="80" y="190">Noroeste</text>
            </g>
            {/* Unidades activas (seed): tráiler del cliente + auto de custodia */}
            {unidades.map(u => {
              const esSel = u.id === sel.id
              const esHero = u.id === HERO.id
              const cx = esHero ? 452 : u.x + 14, cy = esHero ? 352 : u.y + 8
              return (
                <g key={u.id} className="marker" role="button" tabIndex={0} aria-label={`${u.id} · ${u.cliente} · ${u.estado}`} onClick={() => seleccionar(u)} onKeyDown={e => { if (e.key === 'Enter') seleccionar(u) }} opacity={u.estado === 'Sin señal' ? 0.55 : 1}>
                  <title>{`${u.id} · ${u.cliente} · ${u.ruta} · ${u.estado}`}</title>
                  {esHero && <circle cx="438" cy="344" r="8" fill="none" stroke="#F0605D" strokeWidth="2" className="ping"></circle>}
                  {esSel && <circle cx={u.x + 6} cy={u.y + 6} r="16" fill="none" stroke="#0D1D41" strokeWidth="1.5" strokeDasharray="3 3"></circle>}
                  <rect x={u.x - 6} y={u.y - 6} width="12" height="12" rx="2" fill={u.estado === 'Desvío' ? '#B42318' : '#0B6A8A'}></rect>
                  <circle cx={cx} cy={cy} r="7" fill="#475CC7"></circle>
                  {esHero && <path d="M438 344L452 352" stroke="#F0605D" strokeWidth="2" strokeDasharray="3 3"></path>}
                </g>
              )
            })}
            {/* Posición del replay de SRV-24817 */}
            <g aria-label={'Replay ' + replayLabel}>
              <circle cx={rx} cy={ry} r="6" fill="#FFFFFF" stroke="#0D1D41" strokeWidth="2"></circle>
              <circle cx={rx} cy={ry} r="2" fill="#0D1D41"></circle>
            </g>
            <rect x="140" y="470" width="380" height="70" rx="8" fill="#FFFFFF" stroke="#E4E8ED"></rect>
            <rect x="158" y="488" width="12" height="12" rx="2" fill="#0B6A8A"></rect><text x="178" y="499" className="city" style={sx('fill:#3E4A59')}>Tráiler del cliente</text>
            <circle cx="164" cy="520" r="6" fill="#475CC7"></circle><text x="178" y="525" className="city" style={sx('fill:#3E4A59')}>Custodio / auto de custodia</text>
            <path d="M372 494H400" stroke="#F0605D" strokeWidth="3" strokeDasharray="6 5"></path><text x="408" y="499" className="city" style={sx('fill:#3E4A59')}>Desvío</text>
            <text x="372" y="525" className="city" style={sx("fill:#3E4A59")}>{unidades.length} unidades en mapa</text>
          </svg>
          </div>
        </section>

        <aside style={sx('flex:1 1 320px;display:flex;flex-direction:column;gap:16px;min-width:0')}>
          <Section titulo={sel.estado === 'Desvío' ? 'Alerta crítica' : sel.estado === 'Sin señal' ? 'Alerta · sin señal' : 'Unidad seleccionada'}
            ayuda={sel.id === HERO.id ? 'Requiere atención inmediata del monitorista.' : 'Detalle de la unidad elegida en el mapa.'}
            style={'flex:1;border-color:' + (sel.estado === 'Desvío' ? '#F5C2C2' : sel.estado === 'Sin señal' ? '#C7D0F2' : '#E4E8ED')}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap')}><span className={ESTADO_CLS[sel.estado]}>{sel.estado === 'Desvío' ? 'Crítica · Desvío de ruta' : `${sel.tipo} · ${sel.estado}`}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{sel.id === HERO.id ? '14:30:12' : sel.fuente}</span></div>
            <span style={sx('font-weight:600;font-size:16px')}>{sel.id} · {sel.cliente} · {sel.trailer}</span>
            <span style={sx('font-size:14px;color:#3E4A59')}>{sel.detalle}</span>
            <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:13px')}>
              <div><dt className="lbl">Custodios</dt><dd style={sx('margin:3px 0 0')}>{sel.custodios}</dd></div>
              <div><dt className="lbl">Auto de custodia</dt><dd className="mono" style={sx('margin:3px 0 0')}>{sel.auto}</dd></div>
              <div><dt className="lbl">Monitorista</dt><dd style={sx('margin:3px 0 0')}>{sel.monitorista}</dd></div>
              <div><dt className="lbl">Fuente</dt><dd style={sx('margin:3px 0 0')}>{sel.fuente}</dd></div>
            </dl>
            <div style={sx('display:flex;gap:8px;flex-wrap:wrap;margin-top:auto')}>
              <button type="button" className="btn" onClick={() => setModal({ tipo: 'llamar', u: sel })}>Llamar custodio</button>
              {sel.id !== HERO.id && (sel.estado === 'Desvío' || sel.estado === 'Sin señal'
                ? <Link className="btn" to={ROUTES.Reaccion}>Abrir incidente</Link>
                : <Link className="btn" to={ROUTES.Servicios}>Ver servicio</Link>)}
              {sel.id !== HERO.id && <button type="button" className="btn" onClick={() => seleccionar(HERO)} title="Volver a la alerta crítica">Volver a SRV-24817</button>}
            </div>
            {sel.id === HERO.id && <Nota>Para abrir el caso y avisar a autoridades usa <strong>Atender incidente</strong>, arriba a la derecha.</Nota>}
          </Section>
        </aside>
      </div>

      <Section titulo="Replay de ruta · SRV-24817" ayuda="Recorre el día de la unidad en desvío, desde la salida hasta la alerta. El punto blanco se mueve en el mapa."
        acciones={<span className="mono" style={sx('font-size:13px;color:#3E4A59')}>{replayLabel}</span>}>
        <div style={sx('display:flex;gap:12px;align-items:center')}>
          <button type="button" className="btn" onClick={() => { if (!playing && replay >= 100) setReplay(0); setPlaying(p => !p) }} aria-label={playing ? 'Pausar replay' : 'Reproducir replay'} style={sx('min-height:36px;padding:0 12px')}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">{playing ? <path d="M3 2h2v8H3zM7 2h2v8H7z" fill="currentColor" /> : <path d="M3 1.5l7 4.5-7 4.5z" fill="currentColor" />}</svg>
            {playing ? 'Pausar' : 'Reproducir'}
          </button>
          <label style={sx('display:flex;gap:12px;align-items:center;flex:1')}>
            <span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Posición del replay</span>
            <input type="range" min="0" max="100" value={replay} onChange={e => { setPlaying(false); setReplay(Number(e.target.value)) }} style={sx('flex:1;accent-color:#475CC7;min-height:36px')} />
          </label>
        </div>
        <div style={sx('display:flex;justify-content:space-between;font-size:12px;color:#5F6B7A;flex-wrap:wrap;gap:8px')}>
          {([['08:12 salida', 0], ['10:47 parada', 41], ['13:05 frenado', 77], ['14:30 desvío', 100]] as const).map(([l, p]) => (
            <span key={l} role="button" tabIndex={0} style={sx('cursor:pointer;text-decoration:underline')} onClick={() => { setPlaying(false); setReplay(p) }} onKeyDown={e => { if (e.key === 'Enter') { setPlaying(false); setReplay(p) } }}>{l}</span>
          ))}
        </div>
      </Section>

      <div id="feed-eventos">
        <Section key={feedKey} titulo={FEED_TITULO[cat]} plegable abierto={feedKey > 0}
          ayuda="Todo lo que reportan Samsara y Ruptela, ya normalizado. Haz clic en un evento para verlo en el mapa, marcarlo atendido o escalarlo."
          acciones={cat !== 'all' ? <button type="button" className="btn" style={sx('min-height:34px;padding:0 12px;font-size:13px')} onClick={() => { setCat('all'); setVerTodos(false) }}>Ver todos los eventos</button> : undefined}>
          {cat === 'riesgo' ? (
            <div style={sx('display:flex;flex-direction:column')}>
              <Nota>Zona de riesgo: tramos donde el historial de robos del trimestre es más alto. Las unidades que los cruzan se vigilan con más frecuencia.</Nota>
              {riesgo.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A;padding:8px 0')}>Ninguna unidad en zona de riesgo con esta fuente. Prueba con «Todas».</span>}
              {(verTodos ? riesgo : riesgo.slice(0, 7)).map(u => (
                <button key={u.id} type="button" className="feed-row" onClick={() => seleccionar(u)} style={sx('display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;font-size:13px')}>
                  <span style={sx('min-width:0')}><strong>{u.id}</strong> · {u.cliente} · {u.ruta}</span>
                  <span className={ESTADO_CLS[u.estado]}>{u.estado}</span>
                </button>
              ))}
              {riesgo.length > 7 && <button type="button" className="lnk" style={sx('align-self:flex-start;font-size:13px;margin-top:6px')} onClick={() => setVerTodos(v => !v)}>{verTodos ? 'Ver menos' : `Ver las ${riesgo.length}`}</button>}
            </div>
          ) : (
            <div style={sx('display:flex;flex-direction:column')}>
              {events.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A;padding:8px 0')}>Sin eventos para este filtro. Prueba con otra fuente.</span>}
              {events.map(e => (
                <button key={e.k} type="button" className={'feed-row' + (e.nuevo ? ' feed-new' : '')} onClick={() => setModal({ tipo: 'evento', e })} title="Ver detalle del evento" style={sx('display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;font-size:13px')}>
                  <span className="mono" style={sx('color:#5F6B7A')}>{e.t}</span>
                  <span style={sx('min-width:0')}>{e.text}</span>
                  <span className={e.cls}>{e.src}</span>
                </button>
              ))}
              {feedCat.length > 7 && <button type="button" className="lnk" style={sx('align-self:flex-start;font-size:13px;margin-top:6px')} onClick={() => setVerTodos(v => !v)}>{verTodos ? 'Ver menos' : `Ver los ${feedCat.length} eventos`}</button>}
            </div>
          )}
        </Section>
      </div>

      <Modal open={modal?.tipo === 'llamar'} onClose={() => setModal(null)} title={`Llamar custodio · ${modal?.tipo === 'llamar' ? modal.u.id : ''}`} width={480}
        footer={<button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cerrar</button>}>
        {modal?.tipo === 'llamar' && (
          <>
            <span style={sx('font-size:14px;color:#3E4A59')}>{modal.u.cliente} · {modal.u.ruta} · {modal.u.trailer}</span>
            {custodiosDeUnidad(modal.u).map(c => (
              <div key={c.id + c.nombre} style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;background:#F3F5F8;border-radius:8px;padding:12px 14px;flex-wrap:wrap')}>
                <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('font-weight:600')}>{c.nombre}</span><span style={sx('font-size:13px;color:#5F6B7A')}>{c.id} · {c.base}</span></div>
                <button type="button" style={sx(btnPriStyle)} className="mono" onClick={() => llamar(c.nombre, c.telefono)}>Llamar {c.telefono}</button>
              </div>
            ))}
            <span style={sx('font-size:13px;color:#5F6B7A')}>Monitorista a cargo: {modal.u.monitorista}. La llamada queda registrada en la bitácora del servicio.</span>
          </>
        )}
      </Modal>

      <Modal open={modal?.tipo === 'evento'} onClose={() => setModal(null)} title={modal?.tipo === 'evento' ? modal.e.tipo : ''} width={480}
        footer={modal?.tipo === 'evento' ? (
          <>
            <button type="button" style={sx(btnStyle)} onClick={() => verEnMapa(modal.e)}>Ver en mapa</button>
            <button type="button" style={sx(btnStyle)} onClick={() => { toast(`Evento ${modal.e.t} marcado como atendido`); setModal(null) }}>Marcar atendido</button>
            <button type="button" style={sx(btnPriStyle)} onClick={() => { toast('Evento escalado a Incidentes', 'warn'); navigate(ROUTES.Reaccion) }}>Escalar a Incidentes</button>
          </>
        ) : undefined}>
        {modal?.tipo === 'evento' && (
          <>
            <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center')}><span className={modal.e.cls}>{modal.e.src}</span><span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{modal.e.t}</span></div>
            <span style={sx('font-weight:600;font-size:16px')}>{modal.e.text}</span>
            <div style={sx('display:grid;grid-template-columns:' + (movil ? '96px minmax(0,1fr)' : '140px 1fr') + ';gap:6px 12px;font-size:14px')}>
              <span className="lbl">Unidad</span><span className="mono">{modal.e.unidad}</span>
              <span className="lbl">Fuente</span><span>{modal.e.src} · normalizado por el adaptador de telemetría</span>
              {modal.e.velocidad !== undefined && <><span className="lbl">Velocidad</span><span className="mono">{modal.e.velocidad} km/h</span></>}
              <span className="lbl">Servicio</span><span>{unidadesMapa.find(x => x.id === modal.e.unidad || x.auto === modal.e.unidad)?.cliente ?? 'Sin servicio activo asociado'}</span>
            </div>
          </>
        )}
      </Modal>
    </Shell>
  )
}
