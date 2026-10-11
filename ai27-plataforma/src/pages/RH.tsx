import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { ROUTES } from '../lib/routes'
import { useStore, actions, type SolicitudVacaciones, type TramiteRH } from '../lib/store'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { Nota, PageHeader, Section } from '../components/Page'
import { EvolucionEquipo } from '../components/EvolucionEquipo'
import { AREAS_DISENO, HOY, JEFE_POR_AREA, altas as altasDe, antiguedad, bajas as BAJAS_SEED, descargar, diasPorLey, esVoluntaria, fechaCorta, fmtPesos, mesAnio, personas as PERSONAS, porArea, porMes, sedes as SEDES, toCSV, type Movimiento, type Persona } from '../data/rh'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EEF1F4;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl th.sortable{cursor:pointer;user-select:none}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.btn-sm{min-height:30px;padding:0 10px;font-size:12px}
.k{font-family:'Montserrat',sans-serif;font-size:26px;font-weight:600}
.sel{min-height:40px;background:#FFFFFF;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif}
.pillbtn{border:0;cursor:pointer;font-family:inherit}
.kpi{display:flex;flex-direction:column;gap:6px;padding:16px;cursor:pointer;text-align:left;font-family:inherit}
.kpi:hover{border-color:#C7D0F2}
.tab{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:8px;border:1px solid transparent;background:transparent;color:#3E4A59;font:500 14px 'Montserrat',sans-serif;cursor:pointer}
.tab[aria-selected="true"]{background:#E9EDFB;border-color:#C7D0F2;color:#0D1D41}
.tab .n{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#5F6B7A}
/* Celular: las tablas de bajas y movimientos se muestran como tarjetas */
.fila-m{display:flex;flex-direction:column;gap:8px;width:100%;padding:12px 0;border:0;border-top:1px solid #EEF1F4;background:none;text-align:left;font:inherit;color:inherit;box-sizing:border-box}
.fila-m:first-child{border-top:0;padding-top:4px}
.fila-m .dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;font-size:13px;margin:0}
.fila-m .dl dt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.fila-m .dl dd{margin:2px 0 0;overflow-wrap:anywhere}
.fila-m .dl .ancho{grid-column:1/-1}
`

const SR = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'

const areaColor: Record<string, string> = { 'Custodia': '#475CC7', 'Monitoreo': '#6A5ACD', 'Reacción': '#C0492F', 'Operaciones': '#3448A8', 'Flotilla y taller': '#4A5868', 'Comercial': '#2B9A66', 'Finanzas': '#8A4FA0', 'RH': '#3448A8', 'Dirección': '#0D1D41' }
const st: Record<string, string> = { 'Activo': 'pill p-ok', 'Vacaciones': 'pill p-info', 'Incapacidad': 'pill p-warn', 'Onboarding': 'pill p-warn', 'Baja en proceso': 'pill p-bad' }

const ini = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('')
const av = (a: string, size: number) => 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:600;font-size:' + Math.round(size * 0.36) + 'px;background:' + (areaColor[a] ?? '#4A5868')

type TabKey = 'dir' | 'vac' | 'on' | 'off' | 'rec' | 'mov'
const TABS: [TabKey, string][] = [['dir', 'Directorio'], ['vac', 'Vacaciones y permisos'], ['on', 'Ingresos'], ['off', 'Bajas'], ['rec', 'Reclutamiento'], ['mov', 'Altas y bajas']]
const LABELS = ['Expediente digital y contrato', 'Pruebas de confianza registradas', 'Capacitación en protocolo de custodia', 'Uniforme, radio y equipo', 'Alta en nómina e IMSS', 'Alta en Samsara y en la plataforma', 'Asignación de unidad']
const V: [string, string, string, string, boolean?][] = [['Laura Cruz', 'Contadora general', '6–17 oct · 10 días', 'Cubre: Pedro Ruiz', true], ['Iván Cetina', 'Custodio · Centro', '20–24 oct · 5 días', 'Sin impacto: Centro +9'], ['Marco Ríos', 'Custodio · Bajío', '13–17 oct · 5 días', 'Bajío queda −7'], ['Sofía Campos', 'Monitorista', '27–31 oct · 5 días', 'Cubre: M. Quintal'], ['Ana Domínguez', 'Ejecutiva comercial', '3–7 nov · 5 días', 'Sin impacto']]

type Onb = { n: string; r: string; d: string; ck: boolean[] }
const ONB0: Onb[] = [
  { n: 'Luis Canché', r: 'Custodio · Bajío', d: '1 oct', ck: [true, true, true, false, true, false, false] },
  { n: 'Mariana Ek', r: 'Analista de cobranza', d: '3 oct', ck: [true, true, true, true, true, true, false] },
  { n: 'Patricia Vela', r: 'Ejecutiva comercial', d: '29 sep', ck: [true, true, true, true, true, true, true] },
  { n: 'Mario Tun', r: 'Custodio · Bajío', d: '13 oct', ck: [true, false, false, false, false, false, false] },
  { n: 'Sergio Ávila', r: 'Custodio · Bajío', d: '13 oct', ck: [true, true, false, false, false, false, false] },
]
const OFF_COLS = ['Equipo y uniforme', 'Unidad', 'Accesos y Samsara', 'Finiquito', 'Entrevista de salida']
type Off = { n: string; r: string; d: string; why: string; steps: string[] }
const OFF0: Off[] = [
  { n: 'Rafael Gómez', r: 'Custodio · Centro', d: '02 oct', why: 'Mejor oferta', steps: ['Listo', 'Listo', 'Listo', 'Pendiente', 'Listo'] },
  { n: 'Ernesto Lara', r: 'Monitorista', d: '30 sep', why: 'Cambio de ciudad', steps: ['Listo', 'No aplica', 'Listo', 'Listo', 'Listo'] },
  { n: 'Omar Chi', r: 'Custodio · Golfo', d: '26 sep', why: 'Evaluación de confianza', steps: ['Pendiente', 'Listo', 'Listo', 'Pendiente', 'Pendiente'] },
]
const stepCls = (t: string) => 'pill pillbtn ' + (t === 'Listo' ? 'p-ok' : t === 'Pendiente' ? 'p-warn' : 'p-mute')

type Card = { name: string; meta: string; tag: string; cls: string }
type Col = { name: string; n: number; cards: Card[] }
const card = (name: string, meta: string, tag: string, cls: string): Card => ({ name, meta, tag, cls: 'pill ' + cls })
const COLS0: Col[] = [
  { name: 'Solicitud', n: 14, cards: [card('Juan Pablo Euán', 'Custodio · León', 'Nuevo', 'p-mute'), card('Fernanda Ruiz', 'Monitorista · Cuautitlán', 'Referida', 'p-info')] },
  { name: 'Entrevista', n: 6, cards: [card('Mario Tun', 'Custodio · Irapuato', 'Agendada', 'p-info'), card('Carlos Ibarra', 'Analista de nómina', 'Aprobada', 'p-ok')] },
  { name: 'Pruebas de confianza', n: 5, cards: [card('Alan Vega', 'Poligrafía y toxicológico', 'En proceso', 'p-warn')] },
  { name: 'Documentos', n: 3, cards: [card('Rodrigo Pool', 'Falta licencia federal', 'Incompleto', 'p-bad')] },
  { name: 'Contratación', n: 2, cards: [card('Sergio Ávila', 'Ingresa 13 oct', 'Oferta firmada', 'p-ok')] },
]
const TAG_ETAPA: [string, string][] = [['Nuevo', 'p-mute'], ['Agendada', 'p-info'], ['En proceso', 'p-warn'], ['En revisión', 'p-warn'], ['Oferta enviada', 'p-ok']]

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** '2026-10-19' + '2026-10-23' → '19–23 oct' (o '30 oct–3 nov'). */
function rango(desde: string, hasta: string) {
  const [, m1, d1] = desde.split('-').map(Number)
  const [, m2, d2] = hasta.split('-').map(Number)
  if (!m1 || !m2) return desde + ' – ' + hasta
  return m1 === m2 ? `${d1}–${d2} ${MES[m1 - 1]}` : `${d1} ${MES[m1 - 1]}–${d2} ${MES[m2 - 1]}`
}
const hoyISO = () => { const p = (n: number) => String(n).padStart(2, '0'); return `${HOY.getFullYear()}-${p(HOY.getMonth() + 1)}-${p(HOY.getDate())}` }

function VacRow({ n, r, d, cover, state, ok, no }: { n: string; r: string; d: string; cover: string; state: string | null; ok: () => void; no: () => void }) {
  return (
    <div style={sx('display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
      <span style={sx('display:flex;flex-direction:column;min-width:200px')}><span style={sx('font-weight:500')}>{n}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{r}</span></span>
      <span className="mono" style={sx('min-width:180px')}>{d}</span>
      <span style={sx('min-width:150px;color:#3E4A59')}>{cover}</span>
      {!state && <span style={sx('display:flex;gap:8px')}><button type="button" className="btn btn-sm" style={sx('background:#E3F6EC;border-color:#BFE8D0;color:#17784A')} onClick={ok}>Aprobar</button><button type="button" className="btn btn-sm" onClick={no}>Rechazar</button></span>}
      {state && <span className={state === 'Aprobada' || state === 'Entregado' ? 'pill p-ok' : 'pill p-bad'}>{state}</span>}
    </div>
  )
}

/** Construye una Persona nueva (alta manual o contratación desde reclutamiento). */
function nuevaPersona(f: { nombre: string; puesto: string; area: string; sede: string; sueldo: number; ingreso: string; n: number }): Persona {
  const id = (f.area === 'Custodia' ? 'C-' : 'E-') + String(1400 + f.n).padStart(4, '0')
  return {
    id, name: f.nombre, role: f.puesto, area: f.area, site: f.sede, zona: 'Centro', status: 'Onboarding', ingreso: f.ingreso, since: mesAnio(f.ingreso), tenure: antiguedad(f.ingreso),
    boss: JEFE_POR_AREA[f.area] ?? 'Dirección general', sueldo: f.sueldo, pay: fmtPesos(f.sueldo), vac: [0, diasPorLey(f.ingreso)], payHist: [[mesAnio(f.ingreso), 'Contratación', fmtPesos(f.sueldo)]],
    hist: [[mesAnio(f.ingreso), 'Ingreso · onboarding en curso']], contrato: 'Determinado · 3 meses',
  }
}

type SortKey = 'fecha' | 'nombre' | 'area' | 'tipo'
const EMPTY_TRAMITES: TramiteRH[] = []

function Kpi({ label, value, sub, color, onClick }: { label: string; value: string | number; sub: string; color?: string; onClick: () => void }) {
  return (
    <button type="button" className="card kpi" onClick={onClick}>
      <span className="lbl">{label}</span>
      <span className="k" style={color ? sx('color:' + color) : undefined}>{value}</span>
      <span style={sx('font-size:13px;color:#5F6B7A')}>{sub}</span>
    </button>
  )
}

export default function RH() {
  const toast = useToast()
  // Celular: tablas como tarjetas (con selector de orden), reclutamiento en una columna y barras de mes más angostas
  const modo = useViewport()
  const movil = modo === 'movil'
  const [tab, setTab] = useState<TabKey>('dir')
  const [selId, setSelId] = useState(PERSONAS[0].id)
  const [q, setQ] = useState('')
  const [fArea, setFArea] = useState('Todas las áreas')
  const [fSede, setFSede] = useState('Todas las sedes')
  const [fEstatus, setFEstatus] = useState('Todos')
  const [masFiltros, setMasFiltros] = useState(false)
  const [extra, setExtra] = useState<Persona[]>([])
  const [edits, setEdits] = useState<Record<string, Partial<Persona>>>({})
  const [bajasLocal, setBajasLocal] = useState<Movimiento[]>([])
  const [off, setOff] = useState<Off[]>(OFF0)
  const [onb, setOnb] = useState<Onb[]>(ONB0)
  const [onbSel, setOnbSel] = useState(0)
  const [vac, setVac] = useState<Record<number, string>>({})
  const [cols, setCols] = useState<Col[]>(COLS0)
  const [vacantes, setVacantes] = useState<{ puesto: string; area: string; sede: string }[]>([])
  const [vacantesBase, setVacantesBase] = useState(23)
  const [movFiltro, setMovFiltro] = useState<'Todos' | 'Alta' | 'Baja'>('Todos')
  const [movSort, setMovSort] = useState<{ k: SortKey; asc: boolean }>({ k: 'fecha', asc: false })
  const [modal, setModal] = useState<null | 'alta' | 'editar' | 'baja' | 'vacante' | 'candidato'>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const fotoRef = useRef<HTMLInputElement>(null)
  const solicitudes = useStore(s => s.vacaciones)
  const tramites = useStore(s => s.tramites) ?? EMPTY_TRAMITES

  // ── Datos ──
  const people = useMemo(() => [...extra, ...PERSONAS].map(p => (edits[p.id] ? { ...p, ...edits[p.id] } : p)), [extra, edits])
  const p0 = people.find(p => p.id === selId) ?? people[0]
  const altasList = useMemo(() => altasDe(people).sort((a, b) => b.fecha.localeCompare(a.fecha)), [people])
  const bajasAll = useMemo(() => [...bajasLocal, ...BAJAS_SEED], [bajasLocal])
  const meses = useMemo(() => porMes(people, bajasAll), [people, bajasAll])
  const areas = useMemo(() => porArea(people), [people])
  const sedesAll = useMemo(() => [...new Set([...SEDES, ...people.map(p => p.site)])].sort((a, b) => a.localeCompare(b, 'es')), [people])

  const altasMes = altasList.filter(a => a.fecha.startsWith('2026-10'))
  const bajasMes = bajasAll.filter(b => b.fecha.startsWith('2026-10'))
  const altasCust = altasMes.filter(a => a.area === 'Custodia').length
  const bajasVol = bajasMes.filter(b => esVoluntaria(b.motivo)).length
  const headcount = people.filter(p => p.status !== 'Baja en proceso').length
  const neto = altasList.filter(a => a.fecha >= '2026-09-01').length - bajasAll.filter(b => b.fecha >= '2026-09-01').length
  const rotacion = headcount ? ((bajasMes.length / headcount) * 100).toFixed(1) : '0.0'
  const deVacaciones = people.filter(p => p.status === 'Vacaciones').length + solicitudes.filter(v => v.estatus === 'Aprobada' && v.desde <= hoyISO() && v.hasta >= hoyISO()).length
  const nVacantes = vacantesBase + vacantes.length
  const pendStore = solicitudes.filter(v => v.estatus === 'Pendiente').length
  const pendDesign = V.filter(([, , , , d0], i) => !(vac[i] || d0)).length
  const pendTram = tramites.filter(t => t.estatus === 'Pendiente').length
  const porAprobar = pendStore + pendDesign + pendTram
  const candidatos = cols.reduce((a, c) => a + c.n, 0)

  // ── Directorio ──
  const qn = q.trim().toLowerCase()
  const areaMatch = (a: string) => fArea === 'Todas las áreas' || a === fArea || (fArea === 'Finanzas y administración' && a === 'Finanzas')
  const filtered = useMemo(() => people.filter(p =>
    (!qn || (p.name + ' ' + p.role + ' ' + p.id + ' ' + p.site).toLowerCase().includes(qn)) && areaMatch(p.area) && (fSede === 'Todas las sedes' || p.site === fSede) && (fEstatus === 'Todos' || p.status === fEstatus)),
    [people, qn, fArea, fSede, fEstatus]) // eslint-disable-line react-hooks/exhaustive-deps
  const pg = usePagination(filtered.length, 25)
  const pageRows = filtered.slice(pg.from, pg.to)
  const filtrosExtra = (fSede !== 'Todas las sedes' ? 1 : 0) + (fEstatus !== 'Todos' ? 1 : 0)

  // ── Movimientos ──
  const movs = useMemo(() => {
    const all: Movimiento[] = [...altasList, ...bajasAll].filter(m => movFiltro === 'Todos' || m.tipo === movFiltro)
    const dir = movSort.asc ? 1 : -1
    return all.sort((a, b) => dir * (movSort.k === 'fecha' ? a.fecha.localeCompare(b.fecha) : movSort.k === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : movSort.k === 'area' ? a.area.localeCompare(b.area, 'es') : a.tipo.localeCompare(b.tipo)))
  }, [altasList, bajasAll, movFiltro, movSort])
  const pgMov = usePagination(movs.length, 25)
  const sortBy = (k: SortKey) => setMovSort(s => ({ k, asc: s.k === k ? !s.asc : k !== 'fecha' }))
  const sortMark = (k: SortKey) => (movSort.k === k ? (movSort.asc ? ' ▲' : ' ▼') : '')

  // ── Acciones ──
  const open = (m: typeof modal, f: Record<string, string> = {}) => { setForm(f); setModal(m) }
  const F = (k: string) => form[k] ?? ''
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const abrirAlta = () => open('alta', { area: 'Custodia', puesto: 'Custodio', sede: 'Cuautitlán', sueldo: '14500', ingreso: hoyISO() })
  const verExpediente = (id: string) => { setSelId(id); setTab('dir'); setQ(''); setFArea('Todas las áreas'); setFSede('Todas las sedes'); setFEstatus('Todos'); pg.setPage(0) }

  const exportar = () => {
    const rows = [['ID', 'Nombre', 'Puesto', 'Área', 'Sede', 'Zona', 'Estatus', 'Ingreso', 'Sueldo'], ...filtered.map(p => [p.id, p.name, p.role, p.area, p.site, p.zona, p.status, p.ingreso, p.sueldo])]
    descargar(`plantilla-ai27-${hoyISO()}.csv`, toCSV(rows))
    toast(`Plantilla exportada: ${filtered.length} colaboradores (CSV)`)
  }
  const guardarAlta = () => {
    if (!F('nombre').trim()) { toast('Escribe el nombre del colaborador', 'warn'); return }
    const p = nuevaPersona({ nombre: F('nombre').trim(), puesto: F('puesto') || 'Custodio', area: F('area') || 'Custodia', sede: F('sede') || 'Cuautitlán', sueldo: Number(F('sueldo')) || 14500, ingreso: F('ingreso') || hoyISO(), n: extra.length + 1 })
    setExtra(x => [p, ...x])
    setOnb(o => [{ n: p.name, r: `${p.role} · ${p.site}`, d: fechaCorta(p.ingreso).replace(/^0/, ''), ck: [true, false, false, false, false, false, false] }, ...o])
    setModal(null); verExpediente(p.id)
    toast(`Alta registrada: ${p.name} (${p.id}) · ingreso creado en “Ingresos”`)
  }
  const guardarEdicion = () => {
    const sueldo = Number(F('sueldo')) || p0.sueldo
    setEdits(e => ({ ...e, [p0.id]: { ...e[p0.id], role: F('puesto') || p0.role, site: F('sede') || p0.site, boss: F('boss') || p0.boss, status: F('status') || p0.status, sueldo, pay: fmtPesos(sueldo), payHist: sueldo !== p0.sueldo ? [[mesAnio(hoyISO()), 'Ajuste', fmtPesos(sueldo)], ...p0.payHist] : p0.payHist } }))
    setModal(null); toast(`Expediente de ${p0.name} actualizado`)
  }
  const confirmarBaja = () => {
    const fecha = F('ultimo') || hoyISO()
    const motivo = F('motivo') || 'Motivos personales'
    setEdits(e => ({ ...e, [p0.id]: { ...e[p0.id], status: 'Baja en proceso', hist: [...p0.hist, [mesAnio(fecha), `Baja iniciada · ${motivo}`]] } }))
    setBajasLocal(b => [{ fecha, nombre: p0.name, puesto: p0.role, area: p0.area, tipo: 'Baja', motivo, id: p0.id }, ...b])
    setOff(o => [{ n: p0.name, r: `${p0.role} · ${p0.site}`, d: fechaCorta(fecha), why: motivo, steps: ['Pendiente', p0.area === 'Custodia' ? 'Pendiente' : 'No aplica', 'Pendiente', 'Pendiente', 'Pendiente'] }, ...o])
    setModal(null); toast(`Baja iniciada para ${p0.name} · lista de salida creada en “Bajas”`, 'warn')
  }
  const guardarVacante = () => {
    if (!F('puesto').trim()) { toast('Indica el puesto de la vacante', 'warn'); return }
    setVacantes(v => [{ puesto: F('puesto').trim(), area: F('area') || 'Custodia', sede: F('sede') || 'Cuautitlán' }, ...v])
    setModal(null); toast(`Vacante publicada: ${F('puesto').trim()} · ${F('sede') || 'Cuautitlán'}`)
  }
  const guardarCandidato = () => {
    if (!F('nombre').trim()) { toast('Escribe el nombre del candidato', 'warn'); return }
    const c = card(F('nombre').trim(), `${F('puesto') || 'Custodio'} · ${F('sede') || 'Cuautitlán'}`, F('fuente') === 'Referido' ? 'Referido' : 'Nuevo', F('fuente') === 'Referido' ? 'p-info' : 'p-mute')
    setCols(cs => cs.map((col, i) => (i === 0 ? { ...col, n: col.n + 1, cards: [c, ...col.cards] } : col)))
    setModal(null); toast(`Candidato agregado a Solicitud: ${c.name}`)
  }
  const avanzar = (ci: number, k: number) => {
    const c = cols[ci].cards[k]
    if (ci >= cols.length - 1) {
      // Contratar: crea el colaborador y su onboarding
      const [puesto, sede] = c.meta.includes(' · ') ? c.meta.split(' · ') : ['Custodio', 'Cuautitlán']
      const area = /custodio/i.test(puesto) ? 'Custodia' : /monitor/i.test(puesto) ? 'Monitoreo' : /nómina|cobranza|conta/i.test(puesto) ? 'Finanzas' : /mec/i.test(puesto) ? 'Flotilla y taller' : 'Operaciones'
      const p = nuevaPersona({ nombre: c.name, puesto: /ingresa/i.test(puesto) ? 'Custodio' : puesto, area, sede: /ingresa/i.test(puesto) ? 'Querétaro' : sede, sueldo: area === 'Custodia' ? 13800 : 18000, ingreso: hoyISO(), n: extra.length + 1 })
      setExtra(x => [p, ...x])
      setOnb(o => (o.some(x => x.n === p.name) ? o : [{ n: p.name, r: `${p.role} · ${p.site}`, d: fechaCorta(p.ingreso).replace(/^0/, ''), ck: [true, false, false, false, false, false, false] }, ...o]))
      setCols(cs => cs.map((col, i) => (i === ci ? { ...col, n: Math.max(0, col.n - 1), cards: col.cards.filter((_, j) => j !== k) } : col)))
      setVacantesBase(v => Math.max(0, v - 1))
      toast(`${c.name} contratado · alta ${p.id} e ingreso creados`)
      return
    }
    const [tag, cls] = TAG_ETAPA[ci + 1]
    setCols(cs => cs.map((col, i) => i === ci ? { ...col, n: Math.max(0, col.n - 1), cards: col.cards.filter((_, j) => j !== k) } : i === ci + 1 ? { ...col, n: col.n + 1, cards: [...col.cards, { ...c, tag, cls: 'pill ' + cls }] } : col))
    toast(`${c.name} → ${cols[ci + 1].name}`)
  }
  const descartar = (ci: number, k: number) => {
    const c = cols[ci].cards[k]
    setCols(cs => cs.map((col, i) => (i === ci ? { ...col, n: Math.max(0, col.n - 1), cards: col.cards.filter((_, j) => j !== k) } : col)))
    toast(`${c.name} descartado del proceso`, 'warn')
  }
  const toggleOff = (oi: number, si: number) => setOff(o => o.map((x, i) => (i === oi ? { ...x, steps: x.steps.map((s, j) => (j === si ? (s === 'Listo' ? 'Pendiente' : s === 'Pendiente' ? 'Listo' : s) : s)) } : x)))
  const toggleCk = (i: number) => setOnb(o => o.map((x, k) => (k === onbSel ? { ...x, ck: x.ck.map((v, j) => (j === i ? !v : v)) } : x)))
  const docDescarga = (d: string) => toast(`Descargando ${d} de ${p0.name} (PDF)`, 'info')

  const onbCur = onb[Math.min(onbSel, onb.length - 1)]
  const done = onbCur ? onbCur.ck.filter(Boolean).length : 0
  const onbRows = onb.map(o => { const p = o.ck.filter(Boolean).length / 7; return { ...o, p: Math.round(p * 100) + '%', bar: 'height:100%;width:' + Math.round(p * 100) + '%;background:' + (p >= 1 ? '#2B9A66' : '#3448A8') } })
  const maxBar = Math.max(1, ...meses.flatMap(([, a, b]) => [a, b]))
  const barH = (v: number) => Math.max(v ? 4 : 0, Math.round((v / maxBar) * 96))
  const tabCount: Partial<Record<TabKey, number>> = { vac: porAprobar, on: onb.length, off: off.length, rec: candidatos }

  return (
    <Shell active="rh" css={CSS} mainStyle="flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:22px">
      <PageHeader tour="equipo" seccion="Equipo" titulo="Equipo"
        descripcion={`Quién trabaja en AI27 y qué necesita de RH: ${headcount} colaboradores en ${areas.filter(([, n]) => n > 0).length} áreas y ${sedesAll.length} sedes. Aquí das de alta, apruebas vacaciones y llevas ingresos, bajas y reclutamiento.`}
        accion={{ label: 'Alta de colaborador', onClick: abrirAlta }}
        secundarias={<Link className="btn" to={ROUTES.PortalColaborador}>Ver Mi portal</Link>} />

      <section aria-label="Sugerencia de la IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>Sugerencia de la IA: revisar a 7 personas con riesgo de renunciar</span><span style={sx('font-size:14px;color:#3E4A59')}>Muestran el patrón previo a una baja: exceso de horas 3 semanas seguidas, vacaciones sin tomar y sin ajuste de sueldo en más de 18 meses. 5 son custodios de Bajío y 2 monitoristas.</span></div>
        <Link className="btn" to={ROUTES.AsistenteIA}>Ver a quiénes</Link>
      </section>

      <section aria-label="Indicadores" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px')}>
        <Kpi label="Colaboradores" value={headcount} sub={`${neto >= 0 ? '+' : ''}${neto} desde septiembre · ${altasMes.length} altas y ${bajasMes.length} bajas en octubre`} onClick={() => { setTab('dir'); setFEstatus('Todos') }} />
        <Kpi label="Por aprobar" value={porAprobar} sub={`solicitudes de vacaciones, permisos y trámites · ${deVacaciones} de vacaciones hoy`} color={porAprobar ? '#9A5B00' : undefined} onClick={() => setTab('vac')} />
        <Kpi label="Ingresos en curso" value={onb.length} sub={`${onb.filter(o => o.ck.every(Boolean)).length} listos para cerrar · ${off.length} bajas en proceso`} onClick={() => setTab('on')} />
        <Kpi label="Vacantes abiertas" value={nVacantes} sub={`${candidatos} candidatos en proceso · 19 días para contratar`} onClick={() => setTab('rec')} />
      </section>

      <EvolucionEquipo />

      <div role="tablist" aria-label="Secciones de Equipo" style={sx('display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid #E4E8ED;padding-bottom:10px')}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={k === tab} className="tab" onClick={() => setTab(k)}>{label}{tabCount[k] ? <span className="n">{tabCount[k]}</span> : null}</button>
        ))}
      </div>

      {tab === 'dir' && (
        <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
          <section aria-label="Directorio" style={sx('flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:14px')}>
            <div style={sx('display:flex;gap:10px;flex-wrap:wrap;align-items:center')}>
              <label style={sx('display:flex;flex:1 1 260px')}><span style={sx(SR)}>Buscar persona</span><input type="search" className="sel" placeholder="Buscar por nombre, puesto o número" style={sx('flex:1')} value={q} onChange={e => { setQ(e.target.value); pg.setPage(0) }} /></label>
              <label style={sx('display:flex')}><span style={sx(SR)}>Área</span><select className="sel" value={fArea} onChange={e => { setFArea(e.target.value); pg.setPage(0) }}><option>Todas las áreas</option>{AREAS_DISENO.map(a => <option key={a}>{a}</option>)}</select></label>
              <button type="button" className="btn" aria-expanded={masFiltros} onClick={() => setMasFiltros(m => !m)}>Más filtros{filtrosExtra ? ` · ${filtrosExtra}` : ''}</button>
              <button type="button" className="btn" onClick={exportar} title="Descarga en CSV los colaboradores filtrados">Exportar plantilla</button>
              {masFiltros && (
                <>
                  <label style={sx('display:flex')}><span style={sx(SR)}>Sede</span><select className="sel" value={fSede} onChange={e => { setFSede(e.target.value); pg.setPage(0) }}><option>Todas las sedes</option>{sedesAll.map(s => <option key={s}>{s}</option>)}</select></label>
                  <label style={sx('display:flex')}><span style={sx(SR)}>Estatus</span><select className="sel" value={fEstatus} onChange={e => { setFEstatus(e.target.value); pg.setPage(0) }}><option>Todos</option>{Object.keys(st).map(s => <option key={s}>{s}</option>)}</select></label>
                </>
              )}
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(min(210px,100%),1fr));gap:12px')}>
              {pageRows.map(p => (
                <button key={p.id} type="button" onClick={() => setSelId(p.id)} aria-pressed={p.id === p0.id} style={sx('display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:10px;cursor:pointer;font-family:inherit;color:#0D1D41;background:#FFFFFF;border:1px solid ' + (p.id === p0.id ? '#475CC7;box-shadow:0 0 0 2px #E9EDFB' : '#E4E8ED'))}>
                  <span style={sx(av(p.area, 48))}>{ini(p.name)}</span>
                  <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;text-align:left' + (movil ? ';flex:1 1 0' : ''))}>
                    <span style={sx('font-weight:600;font-size:14px')}>{p.name}</span>
                    <span style={sx('font-size:13px;color:#3E4A59')}>{p.role}</span>
                    <span style={sx('font-size:12px;color:#5F6B7A')}>{p.area} · {p.site}</span>
                    <span className={st[p.status] ?? 'pill p-mute'} style={sx('align-self:flex-start;margin-top:4px')}>{p.status}</span>
                  </span>
                </button>
              ))}
              {pageRows.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A;padding:12px 0')}>Sin colaboradores con estos filtros. Prueba con otra área o borra la búsqueda.</span>}
            </div>
            <Pager {...pg} />
            <Nota>Mostrando {pageRows.length} de {filtered.length}. Haz clic en una persona para ver su expediente a la derecha; las iniciales se reemplazan por la foto del expediente.</Nota>

            <Section titulo="Colaboradores por área" ayuda="Haz clic en un área para filtrar el directorio." plegable abierto={false}>
              {areas.map(([n, v]) => (
                <button key={n} type="button" onClick={() => { setFArea(fArea === n ? 'Todas las áreas' : n); pg.setPage(0) }} aria-pressed={fArea === n} style={sx('display:grid;grid-template-columns:150px minmax(0,1fr) 44px;gap:10px;align-items:center;font-size:13px;background:none;border:0;padding:0;cursor:pointer;font-family:inherit;color:inherit;text-align:left' + (fArea === n ? ';font-weight:600' : ''))}>
                  <span>{n}</span><div style={sx('height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;width:' + Math.max(2, Math.round(Math.sqrt(v / 400) * 100)) + '%;background:' + areaColor[n])}></div></div><span className="mono" style={sx('text-align:right')}>{v}</span>
                </button>
              ))}
            </Section>
          </section>

          <aside className="card" aria-label="Expediente" style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:18px')}>
            <span className="lbl">Expediente</span>
            <div style={sx('display:flex;gap:16px;align-items:center')}>
              <span style={sx(av(p0.area, 80))}>{ini(p0.name)}</span>
              <div style={sx('display:flex;flex-direction:column;gap:3px;min-width:0' + (movil ? ';flex:1 1 0' : ''))}>
                <span style={sx("font-family:'Montserrat',sans-serif;font-size:20px;font-weight:600")}>{p0.name}</span>
                <span style={sx('font-size:14px;color:#3E4A59')}>{p0.role}</span>
                <span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{p0.id} · {p0.area} · {p0.site}</span>
                <span className={st[p0.status] ?? 'pill p-mute'} style={sx('align-self:flex-start;margin-top:2px')}>{p0.status}</span>
              </div>
            </div>
            <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
              <input ref={fotoRef} type="file" accept="image/*" style={sx('display:none')} onChange={e => { const f = e.target.files?.[0]; if (f) toast(`Foto de ${p0.name} actualizada (${f.name})`); e.target.value = '' }} />
              <button type="button" className="btn" onClick={() => open('editar', { puesto: p0.role, sede: p0.site, boss: p0.boss, status: p0.status, sueldo: String(p0.sueldo) })}>Editar expediente</button>
              <button type="button" className="btn" onClick={() => fotoRef.current?.click()}>Cambiar foto</button>
              <button type="button" className="btn" disabled={p0.status === 'Baja en proceso'} style={p0.status === 'Baja en proceso' ? sx('opacity:.5;cursor:default') : undefined} onClick={() => open('baja', { ultimo: hoyISO(), motivo: 'Motivos personales' })}>{p0.status === 'Baja en proceso' ? 'Baja en proceso' : 'Iniciar baja'}</button>
            </div>
            <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:14px')}>
              <div><dt className="lbl">Ingreso</dt><dd style={sx('margin:4px 0 0')}>{p0.since}</dd></div>
              <div><dt className="lbl">Antigüedad</dt><dd style={sx('margin:4px 0 0')}>{p0.tenure}</dd></div>
              <div><dt className="lbl">Jefe directo</dt><dd style={sx('margin:4px 0 0')}>{p0.boss}</dd></div>
              <div><dt className="lbl">Contrato</dt><dd style={sx('margin:4px 0 0')}>{p0.contrato}</dd></div>
            </dl>
            <section style={sx('display:flex;flex-direction:column;gap:10px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <span className="lbl">Vacaciones 2026</span>
              <div style={sx('height:10px;border-radius:5px;background:#EBEEF2;overflow:hidden;display:flex')}><div style={sx('height:100%;background:#475CC7;width:' + Math.round(p0.vac[0] / Math.max(1, p0.vac[1]) * 100) + '%')}></div></div>
              <div style={sx('display:flex;justify-content:space-between;font-size:13px;color:#3E4A59')}><span>{p0.vac[0]} tomados</span><span>{p0.vac[1] - p0.vac[0]} disponibles de {p0.vac[1]}</span></div>
            </section>
            <section style={sx('display:flex;flex-direction:column;gap:10px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center')}><span className="lbl">Sueldo</span><span className="pill p-mute">Solo RH y Dirección</span></div>
              <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:baseline')}><span style={sx('font-size:14px')}>Mensual bruto</span><span className="mono" style={sx('font-size:20px;font-weight:500')}>{p0.pay}</span></div>
              {p0.payHist.map(([d, why, v]) => (
                <div key={d + why} style={sx('display:flex;justify-content:space-between;gap:8px;font-size:13px;color:#3E4A59')}><span>{d} · {why}</span><span className="mono">{v}</span></div>
              ))}
            </section>
            <section style={sx('display:flex;flex-direction:column;gap:8px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <span className="lbl">Documentos</span>
              <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                {['INE', 'Contrato', 'Comprobante de domicilio', 'Constancia fiscal', p0.area === 'Custodia' ? 'Portación y licencia federal' : 'Evaluación anual'].map((d, i) => (
                  <button key={d} type="button" title={`Descargar ${d}`} onClick={() => docDescarga(d)} className={'pill pillbtn ' + (i === 4 && p0.status === 'Incapacidad' ? 'p-warn' : 'p-ok')}>{d}</button>
                ))}
              </div>
              <Nota>Haz clic en un documento para descargarlo en PDF.</Nota>
            </section>
            <section style={sx('display:flex;flex-direction:column;gap:8px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <span className="lbl">Historial</span>
              <ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column')}>
                {p0.hist.map(([d, t]) => (
                  <li key={d + t} style={sx('display:grid;grid-template-columns:80px 12px minmax(0,1fr);gap:10px;padding:6px 0;font-size:13px')}><span className="mono" style={sx('color:#5F6B7A')}>{d}</span><span style={sx('width:8px;height:8px;border-radius:50%;background:#3448A8;margin-top:5px')}></span><span>{t}</span></li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      )}

      {tab === 'vac' && (
        <>
          <Section titulo="Solicitudes por aprobar" ayuda="Vacaciones y permisos que llegan desde Mi portal, ya revisados por el jefe directo. Aprueba o rechaza en un clic.">
            {solicitudes.map((v: SolicitudVacaciones) => (
              <VacRow key={v.id} n={v.colaborador} r={v.area + ' · ' + v.id} d={rango(v.desde, v.hasta) + ' · ' + v.dias + (v.dias === 1 ? ' día' : ' días')}
                cover={v.motivo || 'Desde Mi portal'} state={v.estatus === 'Pendiente' ? null : v.estatus}
                ok={() => { actions.resolverVacaciones(v.id, 'Aprobada'); toast(`Solicitud ${v.id} de ${v.colaborador} aprobada`) }} no={() => { actions.resolverVacaciones(v.id, 'Rechazada'); toast(`Solicitud ${v.id} rechazada`, 'warn') }} />
            ))}
            {V.map(([n, r, d, cover, done0], i) => (
              <VacRow key={'d' + i} n={n} r={r} d={d} cover={cover} state={vac[i] || (done0 ? 'Aprobada' : null)}
                ok={() => { setVac({ ...vac, [i]: 'Aprobada' }); toast(`Vacaciones de ${n} aprobadas`) }} no={() => { setVac({ ...vac, [i]: 'Rechazada' }); toast(`Vacaciones de ${n} rechazadas`, 'warn') }} />
            ))}
            <Nota>La columna de cobertura indica quién cubre el puesto o si la zona queda corta de custodios durante esas fechas.</Nota>
          </Section>
          <Section titulo="Trámites pedidos a RH" ayuda="Constancias, cartas y cambios de datos solicitados desde Mi portal. Marca entregado cuando lo envíes." plegable abierto={tramites.length > 0}>
            {tramites.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A;padding:8px 0;border-top:1px solid #EEF1F4')}>Sin trámites pendientes. Los nuevos aparecen aquí en cuanto alguien los pide desde Mi portal.</span>}
            {tramites.map((t: TramiteRH) => (
              <VacRow key={t.id} n={t.colaborador} r={t.area + ' · ' + t.id} d={t.tramite} cover={t.motivo || '—'} state={t.estatus === 'Pendiente' ? null : t.estatus}
                ok={() => { actions.resolverTramite(t.id, 'Entregado'); toast(`${t.tramite} de ${t.colaborador} marcada como entregada`) }} no={() => { actions.resolverTramite(t.id, 'Rechazado'); toast(`Trámite ${t.id} rechazado`, 'warn') }} />
            ))}
          </Section>
        </>
      )}

      {tab === 'on' && (
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:16px')}>
          <Section titulo="Ingresos en curso" ayuda="Personas que acaban de entrar. Elige una para ver qué le falta.">
            {onbRows.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A')}>Sin ingresos en curso. Al dar de alta a alguien aparece aquí con su lista de bienvenida.</span>}
            {onbRows.map((o, i) => (
              <button key={o.n + i} type="button" onClick={() => setOnbSel(i)} aria-pressed={i === onbSel} style={sx('display:grid;grid-template-columns:minmax(0,1fr) 120px 44px;gap:12px;align-items:center;border:0;border-top:1px solid #EEF1F4;font-size:14px;cursor:pointer;font-family:inherit;color:inherit;text-align:left;' + (i === onbSel ? 'padding:8px 8px;background:#F0F3FD;margin:0 -8px;border-radius:6px' : 'padding:8px 0;background:none'))}>
                <span style={sx('display:flex;flex-direction:column')}><span style={sx('font-weight:500')}>{o.n}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{o.r} · ingresa {o.d}</span></span>
                <div style={sx('height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx(o.bar)}></div></div>
                <span className="mono" style={sx('font-size:13px;text-align:right')}>{o.p}</span>
              </button>
            ))}
          </Section>
          {onbCur && (
            <Section titulo={`Lista de bienvenida · ${onbCur.n}`} ayuda={`${onbCur.r} · ${done} de 7 pasos completos. Marca cada paso al terminarlo.`}>
              {LABELS.map((label, i) => (
                <label key={label} style={sx('display:flex;gap:12px;align-items:center;min-height:40px;font-size:14px;border-top:1px solid #EEF1F4;cursor:pointer')}>
                  <input type="checkbox" checked={onbCur.ck[i]} onChange={() => toggleCk(i)} style={sx('width:18px;height:18px;accent-color:#3448A8')} />
                  <span style={sx(onbCur.ck[i] ? 'color:#5F6B7A;text-decoration:line-through' : '')}>{label}</span>
                </label>
              ))}
              {done === 7 && <button type="button" className="btn" style={sx('align-self:flex-start;margin-top:6px;background:#E3F6EC;border-color:#BFE8D0;color:#17784A')} onClick={() => { toast(`Ingreso de ${onbCur.n} cerrado · ahora es colaborador activo`); setOnb(o => o.filter((_, k) => k !== onbSel)); setOnbSel(0); const p = people.find(x => x.name === onbCur.n); if (p) setEdits(e => ({ ...e, [p.id]: { ...e[p.id], status: 'Activo' } })) }}>Cerrar ingreso: ya es colaborador activo</button>}
            </Section>
          )}
        </div>
      )}

      {tab === 'off' && (
        <Section titulo="Bajas en proceso" ayuda="Lista de salida de cada persona. Haz clic en un paso para marcarlo listo o pendiente. Las bajas iniciadas desde el expediente aparecen aquí." style={movil ? 'padding:20px 14px 14px' : 'padding:20px 8px 8px'}>
          {movil && (
            <div style={sx('display:flex;flex-direction:column')}>
              {off.map((o, oi) => (
                <div key={o.n + oi} className="fila-m">
                  <span style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:nowrap')}>
                    <span style={sx('display:flex;flex-direction:column;min-width:0')}><span style={sx('font-weight:600')}>{o.n}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{o.r}</span></span>
                    <span className="mono" style={sx('flex:none;font-size:13px')}>{o.d}</span>
                  </span>
                  <dl className="dl">
                    <div className="ancho"><dt>Motivo</dt><dd>{o.why}</dd></div>
                    {o.steps.map((s, j) => <div key={j}><dt>{OFF_COLS[j]}</dt><dd><button type="button" className={stepCls(s)} title={s === 'No aplica' ? 'No aplica' : 'Cambiar estado'} onClick={() => { if (s !== 'No aplica') { toggleOff(oi, j); toast(`${o.n} · ${OFF_COLS[j]}: ${s === 'Listo' ? 'Pendiente' : 'Listo'}`, s === 'Listo' ? 'warn' : 'ok') } }}>{s}</button></dd></div>)}
                  </dl>
                </div>
              ))}
              {off.length === 0 && <span style={sx('color:#5F6B7A;font-size:14px')}>Sin bajas en proceso.</span>}
            </div>
          )}
          {!movil && (
          <div style={sx('overflow-x:auto')}>
            <table className="tbl">
              <thead><tr><th>Persona</th><th>Último día</th><th>Motivo</th>{OFF_COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {off.map((o, oi) => (
                  <tr key={o.n + oi}><td>{o.n}<br /><span style={sx('font-size:12px;color:#5F6B7A')}>{o.r}</span></td><td className="mono">{o.d}</td><td>{o.why}</td>
                    {o.steps.map((s, j) => <td key={j}><button type="button" className={stepCls(s)} title={s === 'No aplica' ? 'No aplica' : 'Cambiar estado'} onClick={() => { if (s !== 'No aplica') { toggleOff(oi, j); toast(`${o.n} · ${OFF_COLS[j]}: ${s === 'Listo' ? 'Pendiente' : 'Listo'}`, s === 'Listo' ? 'warn' : 'ok') } }}>{s}</button></td>)}
                  </tr>
                ))}
                {off.length === 0 && <tr><td colSpan={8} style={sx('color:#5F6B7A')}>Sin bajas en proceso.</td></tr>}
              </tbody>
            </table>
          </div>
          )}
        </Section>
      )}

      {tab === 'rec' && (
        <Section titulo="Candidatos por etapa" ayuda={`${nVacantes} vacantes abiertas · ${candidatos} candidatos en proceso${vacantes.length > 0 ? ' · nuevas: ' + vacantes.map(v => v.puesto + ' (' + v.sede + ')').join(', ') : ''}. Avanza a cada candidato hasta contratarlo.`}
          acciones={<><button type="button" className="btn" onClick={() => open('vacante', { area: 'Custodia', puesto: 'Custodio', sede: 'Querétaro' })}>Nueva vacante</button><button type="button" className="btn" onClick={() => open('candidato', { puesto: 'Custodio', sede: 'Cuautitlán', fuente: 'Bolsa de trabajo' })}>Agregar candidato</button></>}>
          <div style={sx('overflow-x:auto')}>
            {/* Celular: las 5 etapas en una sola columna; tablet y escritorio: tablero con scroll horizontal */}
            <div style={sx(movil ? 'display:grid;grid-template-columns:minmax(0,1fr);gap:12px' : 'display:grid;grid-template-columns:repeat(5,minmax(200px,1fr));gap:12px;min-width:1040px')}>
              {cols.map((c, ci) => (
                <div key={c.name} style={sx('background:#F3F5F8;border:1px solid #E4E8ED;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px')}>
                  <div style={sx('display:flex;justify-content:space-between')}><span style={sx('font-weight:600;font-size:14px')}>{ci + 1}. {c.name}</span><span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{c.n}</span></div>
                  {c.cards.map((p, k) => (
                    <div key={p.name + k} style={sx('background:#FFFFFF;border:1px solid #E4E8ED;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px')}>
                      <span style={sx('font-weight:500;font-size:14px')}>{p.name}</span>
                      <span style={sx('font-size:12px;color:#5F6B7A')}>{p.meta}</span>
                      <span className={p.cls} style={sx('align-self:flex-start')}>{p.tag}</span>
                      <div style={sx('display:flex;gap:6px;flex-wrap:wrap;margin-top:4px')}>
                        <button type="button" className="btn btn-sm" style={ci === cols.length - 1 ? sx('background:#E3F6EC;border-color:#BFE8D0;color:#17784A') : undefined} onClick={() => avanzar(ci, k)}>{ci === cols.length - 1 ? 'Contratar' : 'Pasar a ' + cols[ci + 1].name.toLowerCase()}</button>
                        <button type="button" className="btn btn-sm" onClick={() => descartar(ci, k)}>Descartar</button>
                      </div>
                    </div>
                  ))}
                  {c.cards.length === 0 && <span style={sx('font-size:12px;color:#5F6B7A;padding:6px 0')}>Sin candidatos en esta etapa</span>}
                </div>
              ))}
            </div>
          </div>
          <Nota>Al contratar, la persona pasa automáticamente al directorio y a “Ingresos” con su lista de bienvenida.</Nota>
        </Section>
      )}

      {tab === 'mov' && (
        <>
          <section aria-label="Resumen del mes" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px')}>
            <Kpi label="Altas de octubre" value={altasMes.length} color="#17784A" sub={`${altasCust} custodios · ${altasMes.length - altasCust} de oficina`} onClick={() => { setMovFiltro('Alta'); pgMov.setPage(0) }} />
            <Kpi label="Bajas de octubre" value={bajasMes.length} color="#B42318" sub={`${bajasVol} voluntarias`} onClick={() => { setMovFiltro('Baja'); pgMov.setPage(0) }} />
            <Kpi label="Rotación mensual" value={rotacion + '%'} sub="bajas del mes entre el total de colaboradores" onClick={() => { setMovFiltro('Todos'); pgMov.setPage(0) }} />
          </section>
          <Section titulo="Movimientos de 2026" ayuda="Todas las altas y bajas del año. Haz clic en una fila para abrir el expediente." style={movil ? 'padding:20px 14px 14px' : 'padding:20px 8px 8px'}
            acciones={<><div role="group" aria-label="Tipo de movimiento" style={sx('display:flex;gap:6px;flex-wrap:wrap')}>
              {(['Todos', 'Alta', 'Baja'] as const).map(k => (
                <button key={k} type="button" className="btn btn-sm" aria-pressed={movFiltro === k} style={sx(movFiltro === k ? 'background:#E9EDFB;border-color:#475CC7;color:#0D1D41' : '')} onClick={() => { setMovFiltro(k); pgMov.setPage(0) }}>{k === 'Todos' ? 'Todos' : k + 's'} · {k === 'Todos' ? altasList.length + bajasAll.length : k === 'Alta' ? altasList.length : bajasAll.length}</button>
              ))}
            </div>
            {movil && (
              <select className="sel" aria-label="Ordenar por" value={`${movSort.k}:${movSort.asc ? 'asc' : 'desc'}`} onChange={e => { const [k, d] = e.target.value.split(':'); setMovSort({ k: k as SortKey, asc: d === 'asc' }); pgMov.setPage(0) }} style={sx('min-height:30px;font-size:12px')}>
                {([['fecha', 'Fecha'], ['nombre', 'Persona'], ['area', 'Área'], ['tipo', 'Movimiento']] as [SortKey, string][]).flatMap(([k, label]) => [<option key={k + 'asc'} value={`${k}:asc`}>{label} ▲</option>, <option key={k + 'desc'} value={`${k}:desc`}>{label} ▼</option>])}
              </select>
            )}
            <button type="button" className="btn btn-sm" onClick={() => { descargar(`altas-bajas-2026-${movFiltro.toLowerCase()}.csv`, toCSV([['Fecha', 'Persona', 'Puesto', 'Área', 'Movimiento', 'Motivo'], ...movs.map(m => [m.fecha, m.nombre, m.puesto, m.area, m.tipo, m.motivo])])); toast(`Movimientos exportados: ${movs.length} filas (CSV)`) }}>Descargar CSV</button></>}>
            {movil && (
              <div style={sx('display:flex;flex-direction:column')}>
                {movs.slice(pgMov.from, pgMov.to).map(m => (
                  <button key={m.fecha + m.nombre + m.tipo} type="button" className="fila-m" aria-disabled={!m.id} style={sx(m.id ? 'cursor:pointer' : 'cursor:default')} title={m.id ? 'Ver expediente' : undefined} onClick={() => { if (m.id) verExpediente(m.id) }}>
                    <span style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:nowrap')}>
                      <span style={sx('display:flex;flex-direction:column;min-width:0')}><span style={sx('font-weight:600')}>{m.nombre}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{m.puesto} · {m.area}</span></span>
                      <span className={m.tipo === 'Alta' ? 'pill p-ok' : 'pill p-bad'} style={sx('flex:none')}>{m.tipo}</span>
                    </span>
                    <dl className="dl">
                      <div><dt>Fecha</dt><dd className="mono">{fechaCorta(m.fecha)}</dd></div>
                      <div><dt>Motivo</dt><dd>{m.motivo}</dd></div>
                    </dl>
                  </button>
                ))}
                {movs.length === 0 && <span style={sx('color:#5F6B7A;font-size:14px')}>Sin movimientos de este tipo.</span>}
              </div>
            )}
            {!movil && (
            <div style={sx('overflow-x:auto')}>
              <table className="tbl">
                <thead><tr><th className="sortable" onClick={() => sortBy('fecha')}>Fecha{sortMark('fecha')}</th><th className="sortable" onClick={() => sortBy('nombre')}>Persona{sortMark('nombre')}</th><th>Puesto</th><th className="sortable" onClick={() => sortBy('area')}>Área{sortMark('area')}</th><th className="sortable" onClick={() => sortBy('tipo')}>Movimiento{sortMark('tipo')}</th><th>Motivo</th></tr></thead>
                <tbody>
                  {movs.slice(pgMov.from, pgMov.to).map(m => (
                    <tr key={m.fecha + m.nombre + m.tipo} onClick={() => { if (m.id) verExpediente(m.id) }} style={m.id ? sx('cursor:pointer') : undefined} title={m.id ? 'Ver expediente' : undefined}>
                      <td className="mono">{fechaCorta(m.fecha)}</td><td>{m.nombre}</td><td>{m.puesto}</td><td>{m.area}</td><td><span className={m.tipo === 'Alta' ? 'pill p-ok' : 'pill p-bad'}>{m.tipo}</span></td><td>{m.motivo}</td>
                    </tr>
                  ))}
                  {movs.length === 0 && <tr><td colSpan={6} style={sx('color:#5F6B7A')}>Sin movimientos de este tipo.</td></tr>}
                </tbody>
              </table>
            </div>
            )}
            <div style={sx(movil ? 'padding:0' : 'padding:0 12px')}><Pager {...pgMov} /></div>
          </Section>
          <Section titulo="Altas y bajas por mes" ayuda="Verde: altas. Rojo: bajas. Haz clic en un mes para ver el detalle." plegable abierto={false}>
            {/* Celular: barras más angostas y sin envolver, para que los 10 meses quepan en una fila dentro de los 130px de alto */}
            <div style={sx(movil ? 'display:flex;flex-wrap:nowrap;gap:6px;align-items:flex-end;height:130px' : 'display:flex;gap:18px;align-items:flex-end;height:130px')}>
              {meses.map(([n, a, b]) => (
                <button key={n} type="button" title={`${n}: ${a} altas · ${b} bajas`} onClick={() => { setMovFiltro('Todos'); toast(`${n} 2026: ${a} altas · ${b} bajas`, 'info') }} style={sx('flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;padding:0;cursor:pointer;font-family:inherit' + (movil ? ';min-width:0' : ''))}>
                  <div style={sx('display:flex;gap:3px;align-items:flex-end;height:104px')}><div title={`Altas ${a}`} style={sx((movil ? 'width:10px' : 'width:14px') + ';border-radius:3px 3px 0 0;background:#2B9A66;height:' + barH(a) + 'px')}></div><div title={`Bajas ${b}`} style={sx((movil ? 'width:10px' : 'width:14px') + ';border-radius:3px 3px 0 0;background:#D9534F;height:' + barH(b) + 'px')}></div></div>
                  <span style={sx('font-size:12px;color:#5F6B7A')}>{n}</span>
                </button>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Modales ── */}
      <Modal open={modal === 'alta'} onClose={() => setModal(null)} title="Alta de colaborador" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarAlta}>Registrar alta</button></>}>
        <Field label="Nombre completo"><input style={sx(inputStyle)} value={F('nombre')} onChange={set('nombre')} placeholder="Ej. Mario Tun Pech" autoFocus /></Field>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Área"><select style={sx(inputStyle)} value={F('area')} onChange={set('area')}>{AREAS_DISENO.map(a => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Puesto"><input style={sx(inputStyle)} value={F('puesto')} onChange={set('puesto')} /></Field>
          <Field label="Sede"><select style={sx(inputStyle)} value={F('sede')} onChange={set('sede')}>{sedesAll.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Fecha de ingreso"><input type="date" style={sx(inputStyle)} value={F('ingreso')} onChange={set('ingreso')} /></Field>
          <Field label="Sueldo mensual bruto (MXN)"><input type="number" min={0} step={100} style={sx(inputStyle)} value={F('sueldo')} onChange={set('sueldo')} /></Field>
          <Field label="Contrato"><select style={sx(inputStyle)} defaultValue="Determinado · 3 meses"><option>Determinado · 3 meses</option><option>Indefinido</option></select></Field>
        </div>
        <Nota>Al registrar la alta se crea el expediente, la lista de bienvenida en “Ingresos” y el movimiento en “Altas y bajas”.</Nota>
      </Modal>

      <Modal open={modal === 'editar'} onClose={() => setModal(null)} title={`Editar expediente · ${p0.name}`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarEdicion}>Guardar cambios</button></>}>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Puesto"><input style={sx(inputStyle)} value={F('puesto')} onChange={set('puesto')} /></Field>
          <Field label="Sede"><select style={sx(inputStyle)} value={F('sede')} onChange={set('sede')}>{sedesAll.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Jefe directo"><input style={sx(inputStyle)} value={F('boss')} onChange={set('boss')} /></Field>
          <Field label="Estatus"><select style={sx(inputStyle)} value={F('status')} onChange={set('status')}>{Object.keys(st).map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Sueldo mensual bruto (MXN)"><input type="number" min={0} step={100} style={sx(inputStyle)} value={F('sueldo')} onChange={set('sueldo')} /></Field>
        </div>
        <Nota>Un cambio de sueldo agrega una línea al historial de sueldo.</Nota>
      </Modal>

      <Modal open={modal === 'baja'} onClose={() => setModal(null)} title={`Iniciar baja · ${p0.name}`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle + ';background:#D9534F;border-color:#D9534F;color:#FFFFFF')} onClick={confirmarBaja}>Confirmar baja</button></>}>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Último día laboral"><input type="date" style={sx(inputStyle)} value={F('ultimo')} onChange={set('ultimo')} /></Field>
          <Field label="Motivo"><select style={sx(inputStyle)} value={F('motivo')} onChange={set('motivo')}>{['Motivos personales', 'Mejor oferta económica', 'Cambio de ciudad', 'Fin de contrato', 'Desempeño', 'No aprobó evaluación de confianza', 'Abandono de trabajo'].map(m => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <Field label="Comentarios para finiquito (opcional)"><textarea rows={3} style={sx(inputStyle + ';padding:10px 12px;min-height:72px')} value={F('coment')} onChange={set('coment')} placeholder="Ej. entrega de radio y uniforme pendiente" /></Field>
        <Nota>Se crea la lista de salida en “Bajas” (equipo, unidad, accesos, finiquito y entrevista de salida) y el movimiento de baja.</Nota>
      </Modal>

      <Modal open={modal === 'vacante'} onClose={() => setModal(null)} title="Nueva vacante" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarVacante}>Publicar vacante</button></>}>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Puesto"><input style={sx(inputStyle)} value={F('puesto')} onChange={set('puesto')} autoFocus /></Field>
          <Field label="Área"><select style={sx(inputStyle)} value={F('area')} onChange={set('area')}>{AREAS_DISENO.map(a => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Sede"><select style={sx(inputStyle)} value={F('sede')} onChange={set('sede')}>{sedesAll.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Prioridad"><select style={sx(inputStyle)} value={F('prioridad') || 'Normal'} onChange={set('prioridad')}><option>Normal</option><option>Alta · cubrir en 2 semanas</option><option>Reemplazo</option></select></Field>
        </div>
        <Nota>Se publica en bolsa de trabajo y portal de referidos; los candidatos entran a la etapa Solicitud.</Nota>
      </Modal>

      <Modal open={modal === 'candidato'} onClose={() => setModal(null)} title="Agregar candidato" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarCandidato}>Agregar a Solicitud</button></>}>
        <Field label="Nombre completo"><input style={sx(inputStyle)} value={F('nombre')} onChange={set('nombre')} placeholder="Ej. Rosa Chan Dzul" autoFocus /></Field>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Puesto"><input style={sx(inputStyle)} value={F('puesto')} onChange={set('puesto')} /></Field>
          <Field label="Sede"><select style={sx(inputStyle)} value={F('sede')} onChange={set('sede')}>{sedesAll.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Fuente"><select style={sx(inputStyle)} value={F('fuente')} onChange={set('fuente')}><option>Bolsa de trabajo</option><option>Referido</option><option>Redes sociales</option><option>Agencia</option></select></Field>
          <Field label="Teléfono"><input style={sx(inputStyle)} value={F('tel')} onChange={set('tel')} placeholder="55 0000 0000" /></Field>
        </div>
      </Modal>
    </Shell>
  )
}
