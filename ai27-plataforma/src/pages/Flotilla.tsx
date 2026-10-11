import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { PageHeader, Section, Nota } from '../components/Page'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { ROUTES } from '../lib/routes'
import { sx, fmtMXN } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { actions, useStore, type CargaNueva } from '../lib/store'
import { asignaciones as SEED_ASG, asignacionesDeUnidad, consumoDiario, HOY_DEMO, type Asignacion } from '../data/asignaciones'
import { CLIENTES, ZONAS, cargasCombustible as SEED_CARGAS, custodios, incidentes, ordenesTaller as SEED_OT, servicios, unidades, type CargaCombustible, type EstatusUnidad, type OrdenTaller, type TipoServicio, type Unidad, type Zona } from '../data/seed'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px;border-bottom:1px solid #E4E8ED;white-space:nowrap;cursor:pointer;user-select:none}
.tbl th:hover{color:#0D1D41}
.tbl td{padding:12px 10px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.tbl tr.sel td{background:#F0F3FD}
.tbl tbody tr{cursor:pointer}
.tbl tbody tr:hover td{background:#FAFBFC}
.tbl.sm td{padding:8px 10px;font-size:13px}.tbl.sm th{padding:8px 10px}
.tbl.quiet tbody tr{cursor:default}.tbl.quiet tbody tr:hover td{background:transparent}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:600 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn:hover{background:#F3F5F8}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}.btn-pri:hover{background:#3448A8}
.k{font-family:'Montserrat',sans-serif;font-size:26px;font-weight:600}
.kpi{cursor:pointer;text-align:left;font-family:inherit;color:#0D1D41}
.kpi:hover{border-color:#475CC7}
.venc{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-top:1px solid #EEF1F4;font-size:14px;background:none;border-left:0;border-right:0;border-bottom:0;width:100%;cursor:pointer;font-family:inherit;color:#0D1D41;text-align:left}
.venc:hover{color:#3448A8}
.tab{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 16px;border-radius:999px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:600 14px 'Montserrat',sans-serif;cursor:pointer}
.tab:hover{background:#F3F5F8}
.tab[aria-selected="true"]{background:#0D1D41;border-color:#0D1D41;color:#FFFFFF}
.ftab{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 12px;border-radius:8px;border:1px solid transparent;background:transparent;color:#5F6B7A;font:600 13px 'Montserrat',sans-serif;cursor:pointer}
.ftab:hover{background:#F3F5F8;color:#0D1D41}
.ftab[aria-selected="true"]{background:#F0F3FD;border-color:#C7D0F2;color:#3448A8}
.drawer{position:fixed;inset:0;z-index:800;display:flex;justify-content:flex-end;background:rgba(18,24,33,.38)}
.drawer>aside{width:min(880px,100%);height:100%;background:#FFFFFF;box-shadow:-20px 0 60px rgba(18,24,33,.18);display:flex;flex-direction:column;font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41}
.dato{display:flex;flex-direction:column;gap:3px;font-size:14px}
.dato .lbl{font-size:11px}
.hist{display:grid;grid-template-columns:110px minmax(0,1fr);gap:4px 14px;font-size:13px;padding:8px 0;border-top:1px solid #EEF1F4}
.chk{display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 8px;border-radius:6px;cursor:pointer;color:#0D1D41}
.chk:hover{background:#F3F5F8}
.chk input{accent-color:#475CC7}
.selpill{display:inline-flex;align-items:center;gap:6px;padding:4px 8px 4px 10px;border-radius:999px;background:#E9EDFB;color:#0D1D41;font-size:12px;font-weight:500}
.selpill button{border:0;background:none;color:#3448A8;cursor:pointer;font-size:14px;line-height:1;padding:0}
/* Celular: las tablas de unidades, taller y combustible se muestran como tarjetas */
.fila-m{display:flex;flex-direction:column;gap:8px;width:100%;padding:12px 0;border-top:1px solid #EEF1F4;text-align:left;font:inherit;color:inherit;cursor:pointer;box-sizing:border-box}
.fila-m:first-child{border-top:0;padding-top:4px}
.fila-m.sel{background:#F0F3FD;margin:0 -8px;padding-left:8px;padding-right:8px;width:auto;border-radius:6px}
.fila-m .dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;font-size:13px;margin:0}
.fila-m .dl dt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.fila-m .dl dd{margin:2px 0 0;overflow-wrap:anywhere}
.fila-m .dl .ancho{grid-column:1/-1}
`

const ST: Record<string, string> = { 'Operando': 'pill p-info', 'Disponible': 'pill p-ok', 'En taller': 'pill p-warn', 'Siniestrada': 'pill p-bad', 'Baja': 'pill p-mute', 'Abierta': 'pill p-warn', 'Cerrada': 'pill p-ok', 'En aseguradora': 'pill p-info', 'Normal': 'pill p-ok', 'Anómalo': 'pill p-bad', 'Programada': 'pill p-info', 'En curso': 'pill p-ok', 'Terminada': 'pill p-mute', 'Cancelada': 'pill p-bad' }
type Tab = 'u' | 't' | 'c'
const TABS: [Tab, string, string][] = [
  ['u', 'Unidades', 'Los autos de custodia: a qué cliente están asignados, con qué custodios y cómo rinden. Haz clic en una fila para abrir la ficha de la unidad.'],
  ['t', 'Taller', 'Órdenes de mantenimiento abiertas y cerradas, con costo y días fuera de operación.'],
  ['c', 'Combustible', 'Cargas de la tarjeta y registros manuales cruzados con los km del GPS para detectar consumo anómalo.'],
]
type FTab = 'resumen' | 'asig' | 'comb' | 'taller'
const FTABS: [FTab, string][] = [['resumen', 'Resumen'], ['asig', 'Asignaciones'], ['comb', 'Combustible y km'], ['taller', 'Taller']]
/** Columnas ordenables de cada pestaña (las mismas que los encabezados de la tabla); en celular alimentan el selector "Ordenar por". */
const COLS_TAB: Record<Tab, [string, string][]> = {
  u: [['id', 'Unidad'], ['vehiculo', 'Vehículo'], ['estatus', 'Estatus'], ['asignada', 'Asignada a'], ['custodios', 'Custodio(s)'], ['rend', 'Rendimiento'], ['venc', 'Próximo vencimiento']],
  t: [['id', 'Orden'], ['unidad', 'Unidad'], ['fecha', 'Fecha'], ['tipo', 'Tipo'], ['falla', 'Falla reportada'], ['proveedor', 'Proveedor'], ['costo', 'Costo'], ['diasFuera', 'Días fuera'], ['estatus', 'Estatus']],
  c: [['fecha', 'Fecha'], ['unidad', 'Unidad'], ['origen', 'Origen'], ['litros', 'Litros'], ['costo', 'Costo'], ['kmGps', 'Km'], ['rendimiento', 'km/l'], ['consumo', 'Consumo']],
}

/** Tarjeta-fila para celular: equivale a una fila de la tabla (clic = abrir la ficha). Es un div con rol de botón porque puede contener botones (p. ej. "Cerrar orden"). */
function FilaM({ onClick, sel, title, children }: { onClick: () => void; sel?: boolean; title?: string; children: ReactNode }) {
  return (
    <div role="button" tabIndex={0} className={'fila-m' + (sel ? ' sel' : '')} title={title} aria-pressed={sel} onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}>
      {children}
    </div>
  )
}
type Venc = 'none' | 'poliza' | 'verif' | 'km' | 'anomalo'
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (iso: string) => `${iso.slice(8, 10)} ${MESES[parseInt(iso.slice(5, 7)) - 1]}`
const fmtFechaHora = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const HOY = '2026-10-08'
const EN_30 = '2026-11-07'
const AHORA = HOY_DEMO.getTime()
const ESTATUS_U: EstatusUnidad[] = ['Operando', 'Disponible', 'En taller', 'Siniestrada', 'Baja']
const PROVEEDORES = ['Taller AI27 Cuautitlán', 'Nissan Satélite', 'Toyota Querétaro', 'Servicio Express Bajío', 'Frenos y Clutch MTY', 'Taller convenio aseguradora']
const PRECIO_LITRO = 24.2
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const corto = (n: string) => { const p = n.split(' '); return p.length > 1 ? `${p[0][0]}. ${p[1]}` : n }
const custodioPorId = new Map(custodios.map(c => [c.id, c]))
const nombreCustodio = (id: string) => { const c = custodioPorId.get(id); return c ? corto(c.nombre) : id }

type Carga = CargaCombustible & { origen: 'Tarjeta' | 'Manual'; id?: string }
const cargasSeed: Carga[] = SEED_CARGAS.map((c, i) => ({ ...c, origen: i % 9 === 4 ? 'Manual' : 'Tarjeta' }))
const cargaDeStore = (c: CargaNueva): Carga => { const rend = c.litros > 0 ? Math.round((c.km / c.litros) * 10) / 10 : 0; return { id: c.id, unidad: c.unidad, fecha: c.fecha, litros: c.litros, costo: c.costo, kmGps: c.km, rendimiento: rend, anomalo: c.litros > 0 && rend < 6.5, origen: 'Manual' } }

// Criterios de vencimiento (calculados desde seed)
const vencePoliza = (u: Unidad) => u.poliza.startsWith('vence') && u.polizaVence <= EN_30
const venceVerif = (u: Unidad) => u.verificacion.startsWith('vence')
const venceKm = (u: Unidad) => u.km % 10000 >= 9000
const anomalas = new Set(SEED_CARGAS.filter(c => c.anomalo).map(c => c.unidad))
const CRITERIO: Record<Venc, (u: Unidad) => boolean> = { none: () => true, poliza: vencePoliza, verif: venceVerif, km: venceKm, anomalo: u => anomalas.has(u.id) }

type Vencimiento = { txt: string; fecha: string; nivel: 'ok' | 'warn' | 'bad' }
function proximoVencimiento(u: Unidad): Vencimiento {
  const c: Vencimiento[] = []
  if (u.poliza.startsWith('vence')) c.push({ txt: `Póliza · ${u.poliza.slice(6)}`, fecha: u.polizaVence, nivel: u.polizaVence <= EN_30 ? 'warn' : 'ok' })
  else if (u.poliza === 'en trámite') c.push({ txt: 'Póliza en trámite', fecha: HOY, nivel: 'bad' })
  if (u.verificacion.startsWith('vence')) { const [, d, m] = u.verificacion.split(' '); c.push({ txt: `Verificación · ${d} ${m}`, fecha: `2026-${String(MESES.indexOf(m) + 1).padStart(2, '0')}-${d.padStart(2, '0')}`, nivel: 'bad' }) }
  if (venceKm(u)) c.push({ txt: `Servicio en ${(10000 - (u.km % 10000)).toLocaleString('es-MX')} km`, fecha: HOY, nivel: 'warn' })
  if (!c.length) return { txt: 'Sin pendientes', fecha: '9999-12-31', nivel: 'ok' }
  return c.sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
}

/** Costo del trimestre por unidad. AU-3321 conserva las cifras del diseño; el resto se deriva de seed (cargas, órdenes de taller y costo mensual). */
function costoTrimestre(u: Unidad, ordenes: OrdenTaller[], cargas: Carga[]) {
  if (u.id === 'AU-3321') return { comb: 41200, mant: 18300, seg: 12400, km: 18600 }
  const cg = cargas.filter(c => c.unidad === u.id)
  const ot = ordenes.filter(o => o.unidad === u.id && o.estatus !== 'En aseguradora')
  const comb = cg.length ? cg.reduce((a, c) => a + c.costo, 0) * Math.max(1, Math.round(12 / cg.length)) : Math.round(u.costoMes * 0.57 * 3)
  const mant = ot.length ? ot.reduce((a, o) => a + o.costo, 0) : Math.round(u.costoMes * 0.26 * 3)
  const seg = Math.round(u.costoMes * 0.17 * 3)
  const km = cg.length ? cg.reduce((a, c) => a + c.kmGps, 0) * Math.max(1, Math.round(12 / cg.length)) : Math.round(comb / 24.2 * u.rendimiento)
  return { comb, mant, seg, km }
}

type Asg = Asignacion & { nueva?: boolean }
/** Estatus real de una asignación creada en el demo: se calcula por tiempo (las de seed ya vienen calculadas). */
const estatusAsg = (a: Asg) => !a.nueva || a.estatus === 'Cancelada' ? a.estatus : new Date(a.fin).getTime() <= AHORA ? 'Terminada' : new Date(a.inicio).getTime() <= AHORA ? 'En curso' : 'Programada'
const ordenAsg = (a: Asg) => { const e = estatusAsg(a); return e === 'En curso' ? 0 : e === 'Programada' ? 1 : 2 }

/** Día a día de la unidad: lo calculado desde GPS/tarjeta (consumoDiario) más lo que se registró a mano en el demo. */
function diario(u: Unidad, nuevas: CargaNueva[]) {
  const base = consumoDiario(u.id, 30)
  const porFecha = new Map(base.map(d => [d.fecha, { ...d, manual: false }]))
  for (const c of nuevas) {
    const d = porFecha.get(c.fecha) ?? { fecha: c.fecha, km: 0, litros: 0, costo: 0, rendimiento: 0, cargo: false, manual: false }
    const km = d.km + c.km, litros = d.litros + c.litros
    porFecha.set(c.fecha, { fecha: c.fecha, km, litros, costo: d.costo + c.costo, rendimiento: litros > 0 ? Math.round((km / litros) * 10) / 10 : 0, cargo: d.cargo || c.litros > 0, manual: true })
  }
  const dias = Array.from(porFecha.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const km = dias.reduce((a, d) => a + d.km, 0), litros = dias.reduce((a, d) => a + d.litros, 0), costo = dias.reduce((a, d) => a + d.costo, 0)
  const rend = litros > 0 ? Math.round((km / litros) * 10) / 10 : u.rendimiento
  const anomalos = dias.filter(d => d.km > 0 && d.rendimiento > 0 && d.rendimiento < u.rendimiento * 0.8)
  return { dias, km, litros, costo, rend, anomalos, cargas: dias.filter(d => d.cargo).length }
}

export default function Flotilla() {
  const toast = useToast()
  // Celular: tablas como tarjetas con selector de orden; la ficha lateral ocupa todo el ancho con menos margen interior
  const modo = useViewport()
  const movil = modo === 'movil'
  const asgNuevas = useStore(s => s.asignaciones ?? [])
  const ordenesNuevas = useStore(s => s.ordenesNuevas ?? [])
  const cargasNuevas = useStore(s => s.cargasNuevas ?? [])
  const overrides = useStore(s => s.estatusUnidades ?? [])
  const clientesNuevos = useStore(s => s.clientesNuevos ?? [])

  const [tab, setTab] = useState<Tab>('u')
  const [ordenesSeed, setOrdenesSeed] = useState<OrdenTaller[]>(SEED_OT)
  const [cargasBase, setCargasBase] = useState<Carga[]>(cargasSeed)
  const [selU, setSelU] = useState('AU-3321')
  const [ficha, setFicha] = useState<string | null>(null)
  const [ftab, setFtab] = useState<FTab>('resumen')
  const [q, setQ] = useState('')
  const [fEst, setFEst] = useState<'Todos' | EstatusUnidad>('Todos')
  const [fZona, setFZona] = useState<'Todas' | Zona>('Todas')
  const [fVenc, setFVenc] = useState<Venc>('none')
  const [fOT, setFOT] = useState<'Todas' | OrdenTaller['estatus']>('Todas')
  const [fCarga, setFCarga] = useState<'Todas' | 'Normal' | 'Anómalo'>('Todas')
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null)
  const [mOrden, setMOrden] = useState(false)
  const [mCarga, setMCarga] = useState(false)
  const [mAsig, setMAsig] = useState(false)
  const [mEstatus, setMEstatus] = useState(false)
  const [mImport, setMImport] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [costoKey, setCostoKey] = useState(0) // > 0 cuando algo pidió abrir la sección de costo
  const fileRef = useRef<HTMLInputElement>(null)
  const [fo, setFo] = useState({ unidad: 'AU-1450', tipo: 'Correctivo' as OrdenTaller['tipo'], falla: '', proveedor: PROVEEDORES[0], costo: '', dias: '3' })
  const [fc, setFc] = useState({ unidad: 'AU-3321', fecha: HOY, litros: '', costo: '', km: '', odometro: '', nota: '' })
  const [fa, setFa] = useState({ cliente: CLIENTES[0], servicio: 'nuevo', tipo: 'Por evento' as TipoServicio, ruta: '', custodios: [] as string[], unidades: [] as string[], inicio: '2026-10-08T06:00', fin: '2026-10-08T18:00', notas: '', qCust: '', qUni: '' })
  const [fe, setFe] = useState({ estatus: 'Operando' as EstatusUnidad, motivo: '' })

  useEffect(() => {
    if (!ficha) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !mOrden && !mCarga && !mAsig && !mEstatus) setFicha(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ficha, mOrden, mCarga, mAsig, mEstatus])

  // Datos combinados: seed + lo creado en el demo
  const overridePorUnidad = useMemo(() => new Map(overrides.map(o => [o.unidad, o])), [overrides])
  const estatusDe = (u: Unidad): EstatusUnidad => overridePorUnidad.get(u.id)?.estatus ?? u.estatus
  const ordenes = useMemo<OrdenTaller[]>(() => [...ordenesNuevas, ...ordenesSeed], [ordenesNuevas, ordenesSeed])
  const idsOrdenesStore = useMemo(() => new Set(ordenesNuevas.map(o => o.id)), [ordenesNuevas])
  const cargas = useMemo<Carga[]>(() => [...cargasNuevas.map(cargaDeStore), ...cargasBase], [cargasNuevas, cargasBase])
  const todasAsg = useMemo<Asg[]>(() => [...asgNuevas.map(a => ({ ...a, nueva: true }) as Asg), ...SEED_ASG], [asgNuevas])
  const asgPorUnidad = useMemo(() => { const m = new Map<string, Asg[]>(); for (const a of todasAsg) for (const id of a.unidades) { const l = m.get(id) ?? []; l.push(a); m.set(id, l) } for (const l of m.values()) l.sort((a, b) => ordenAsg(a) - ordenAsg(b) || b.inicio.localeCompare(a.inicio)); return m }, [todasAsg])
  const cargasNuevasPorUnidad = useMemo(() => { const m = new Map<string, CargaNueva[]>(); for (const c of cargasNuevas) { const l = m.get(c.unidad) ?? []; l.push(c); m.set(c.unidad, l) } return m }, [cargasNuevas])
  const clientesLista = useMemo(() => Array.from(new Set([...clientesNuevos.map(c => c.nombre), ...CLIENTES])), [clientesNuevos])

  // Fila de la tabla de unidades (estatus real, a quién está asignada, custodios, rendimiento real, próximo vencimiento)
  type Fila = { u: Unidad; estatus: EstatusUnidad; asg?: Asg; asignada: string; custodiosTxt: string; rend: number; venc: Vencimiento }
  const filas = useMemo<Fila[]>(() => unidades.map(u => {
    const estatus = estatusDe(u)
    const lista = asgPorUnidad.get(u.id) ?? []
    const asg = lista.find(a => { const e = estatusAsg(a); return e === 'En curso' || e === 'Programada' })
    const asignada = asg ? `${asg.cliente} · ${asg.servicio}` : estatus === 'Operando' && u.servicio !== '—' ? u.servicio : '—'
    const custodiosTxt = asg ? asg.custodios.map(nombreCustodio).join(', ') || '—' : estatus === 'Operando' ? u.custodio : '—'
    const nuevas = cargasNuevasPorUnidad.get(u.id)
    const rend = nuevas ? diario(u, nuevas).rend : u.rendimiento
    return { u, estatus, asg, asignada, custodiosTxt, rend, venc: proximoVencimiento(u) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [overridePorUnidad, asgPorUnidad, cargasNuevasPorUnidad])

  // KPIs (con el estatus real de cada unidad)
  const kpi = useMemo(() => {
    const operando = filas.filter(f => f.estatus === 'Operando').length
    const enTaller = filas.filter(f => f.estatus === 'En taller').length
    const abiertas = ordenes.filter(o => o.estatus === 'Abierta').length
    const diasProm = ordenes.reduce((a, o) => a + o.diasFuera, 0) / ordenes.length
    const kmCargas = cargas.reduce((a, c) => a + c.kmGps, 0)
    const kmMes = Math.round(kmCargas / cargas.length * operando * 6) // km promedio por carga × ~6 cargas al mes por unidad operando
    const rend = cargas.reduce((a, c) => a + c.rendimiento, 0) / cargas.length
    const costoMes = filas.filter(f => f.estatus === 'Operando').reduce((a, f) => a + f.u.costoMes, 0) + ordenes.filter(o => o.estatus === 'Abierta').reduce((a, o) => a + o.costo, 0) / 3
    const siniestros = incidentes.filter(i => i.tipo === 'Accidente').length
    return { operando, total: unidades.length, pct: Math.round(operando / unidades.length * 100), enTaller, abiertas, diasProm, kmMes, rend, costoKm: costoMes / kmMes, siniestros, anomalas: cargas.filter(c => c.anomalo).length }
  }, [filas, ordenes, cargas])

  const venc = useMemo(() => ({ poliza: unidades.filter(vencePoliza).length, verif: unidades.filter(venceVerif).length, km: unidades.filter(venceKm).length, anomalo: anomalas.size }), [])

  const nq = norm(q.trim())
  const sortBy = <T,>(arr: T[], get: (x: T, k: string) => string | number) => !sort ? arr : [...arr].sort((a, b) => { const x = get(a, sort.k), y = get(b, sort.k); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * sort.dir })

  const rowsU = useMemo(() => sortBy(filas.filter(f => (fEst === 'Todos' || f.estatus === fEst) && (fZona === 'Todas' || f.u.zona === fZona) && CRITERIO[fVenc](f.u) && (!nq || norm(f.u.id + ' ' + f.u.vehiculo + ' ' + f.u.placas + ' ' + f.custodiosTxt + ' ' + f.asignada).includes(nq))), (f, k) => k === 'estatus' ? f.estatus : k === 'asignada' ? f.asignada : k === 'custodios' ? f.custodiosTxt : k === 'rend' ? f.rend : k === 'venc' ? f.venc.fecha : (f.u as unknown as Record<string, string | number>)[k]), [filas, fEst, fZona, fVenc, nq, sort])
  const rowsT = useMemo(() => sortBy(ordenes.filter(o => (fOT === 'Todas' || o.estatus === fOT) && (!nq || norm(o.id + ' ' + o.unidad + ' ' + o.falla + ' ' + o.proveedor).includes(nq))), (o, k) => (o as unknown as Record<string, string | number>)[k]), [ordenes, fOT, nq, sort])
  const rowsC = useMemo(() => sortBy(cargas.filter(c => (fCarga === 'Todas' || (fCarga === 'Anómalo') === c.anomalo) && (!nq || norm(c.unidad + ' ' + c.origen).includes(nq))), (c, k) => k === 'consumo' ? (c.anomalo ? 1 : 0) : (c as unknown as Record<string, string | number>)[k]), [cargas, fCarga, nq, sort])
  const total = tab === 'u' ? rowsU.length : tab === 't' ? rowsT.length : rowsC.length
  const pg = usePagination(total, 25)

  const sel = unidades.find(u => u.id === selU) ?? unidades[0]
  const costo = costoTrimestre(sel, ordenes, cargas)
  const costoTotal = costo.comb + costo.mant + costo.seg
  const maxCosto = Math.max(costo.comb, costo.mant, costo.seg)
  const tabInfo = TABS.find(t => t[0] === tab)!

  const cambiarTab = (k: Tab) => { setTab(k); setSort(null); pg.setPage(0) }
  const ordenar = (k: string) => { setSort(s => (s && s.k === k ? (s.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 })); pg.setPage(0) }
  const th = (k: string, label: string) => <th key={k} aria-sort={sort?.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} onClick={() => ordenar(k)}>{label}{sort?.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</th>
  const verUnidades = (est: 'Todos' | EstatusUnidad, v: Venc = 'none') => { setTab('u'); setFEst(est); setFVenc(v); setFZona('Todas'); setQ(''); setSort(null); pg.setPage(0); document.getElementById('tabla-flotilla')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const verTaller = (est: 'Todas' | OrdenTaller['estatus']) => { setTab('t'); setFOT(est); setQ(''); setSort(null); pg.setPage(0) }
  const verCargas = (f: 'Todas' | 'Normal' | 'Anómalo') => { setTab('c'); setFCarga(f); setQ(''); setSort(null); pg.setPage(0) }
  const verCosto = (id?: string) => { if (id) setSelU(id); setCostoKey(n => n + 1); window.setTimeout(() => document.getElementById('costo-unidad')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const abrirFicha = (id: string, t: FTab = 'resumen') => { setSelU(id); setFicha(id); setFtab(t) }

  // ── Acciones ──
  const abrirOrden = (unidad?: string, extra?: Partial<typeof fo>) => { setFo(f => ({ ...f, falla: '', costo: '', tipo: 'Correctivo', ...(unidad ? { unidad } : {}), ...extra })); setMOrden(true) }
  const guardarOrden = () => {
    if (!fo.falla.trim()) { toast('Describe la falla o el servicio', 'warn'); return }
    const costoN = parseInt(fo.costo.replace(/\D/g, '')) || (fo.tipo === 'Preventivo' ? 4500 : 12000)
    const id = actions.enviarATaller({ unidad: fo.unidad, tipo: fo.tipo, falla: fo.falla.trim(), proveedor: fo.proveedor, costo: costoN, diasFuera: parseInt(fo.dias) || 1, fecha: HOY })
    setMOrden(false)
    if (ficha) setFtab('taller'); else verTaller('Todas')
    toast(`Orden ${id} abierta · ${fo.unidad} pasó a En taller · ${fo.proveedor}`)
  }
  const cerrarOrden = (o: OrdenTaller) => {
    if (idsOrdenesStore.has(o.id)) actions.cerrarOrden(o.id)
    else {
      setOrdenesSeed(l => l.map(x => (x.id === o.id ? { ...x, estatus: 'Cerrada' } : x)))
      const otrasAbiertas = ordenes.some(x => x.unidad === o.unidad && x.id !== o.id && x.estatus === 'Abierta')
      const u = unidades.find(x => x.id === o.unidad)
      if (u && estatusDe(u) === 'En taller' && !otrasAbiertas) actions.cambiarEstatusUnidad(o.unidad, 'Operando', `Orden ${o.id} cerrada`)
    }
    toast(`Orden ${o.id} cerrada · ${o.unidad} regresa a Operando`)
  }
  const abrirCarga = (unidad?: string) => { setFc(f => ({ ...f, unidad: unidad ?? f.unidad, fecha: HOY, litros: '', costo: '', km: '', odometro: '', nota: '' })); setMCarga(true) }
  const guardarCarga = () => {
    const litros = parseFloat(fc.litros.replace(',', '.')) || 0, km = parseInt(fc.km.replace(/\D/g, '')) || 0
    if (!litros && !km) { toast('Captura los litros cargados o los km recorridos', 'warn'); return }
    const costoN = parseInt(fc.costo.replace(/\D/g, '')) || Math.round(litros * PRECIO_LITRO)
    const odometro = parseInt(fc.odometro.replace(/\D/g, '')) || undefined
    actions.registrarCarga({ unidad: fc.unidad, fecha: fc.fecha || HOY, litros, costo: costoN, km, odometro, nota: fc.nota.trim() || undefined })
    setMCarga(false)
    if (ficha) setFtab('comb'); else verCargas('Todas')
    const rend = litros > 0 && km > 0 ? ` · ${(km / litros).toFixed(1)} km/l` : ''
    toast(`Registro guardado · ${fc.unidad} · ${fmtFecha(fc.fecha || HOY)} · ${km.toLocaleString('es-MX')} km · ${litros} L${rend}`)
  }
  const abrirAsignar = (unidad: string) => { setFa(f => ({ ...f, unidades: [unidad], custodios: [], ruta: '', notas: '', qCust: '', qUni: '', servicio: 'nuevo' })); setMAsig(true) }
  const guardarAsignacion = () => {
    if (!fa.custodios.length) { toast('Elige al menos un custodio', 'warn'); return }
    if (!fa.unidades.length) { toast('Elige al menos una unidad', 'warn'); return }
    if (new Date(fa.fin).getTime() <= new Date(fa.inicio).getTime()) { toast('El fin debe ser después del inicio', 'warn'); return }
    const servicio = fa.servicio === 'nuevo' ? (fa.tipo === 'Dedicado' ? 'DED-' : 'SRV-') + (fa.tipo === 'Dedicado' ? 400 + asgNuevas.length : 25000 + asgNuevas.length) : fa.servicio
    const ruta = fa.ruta.trim() || (fa.servicio !== 'nuevo' ? servicios.find(s => s.id === fa.servicio)?.ruta ?? 'Por definir' : 'Por definir')
    const id = actions.crearAsignacion({ cliente: fa.cliente, servicio, tipo: fa.tipo, ruta, custodios: fa.custodios, unidades: fa.unidades, inicio: new Date(fa.inicio).toISOString(), fin: new Date(fa.fin).toISOString(), notas: fa.notas.trim() || undefined })
    for (const uid of fa.unidades) { const u = unidades.find(x => x.id === uid); if (u && estatusDe(u) === 'Disponible') actions.cambiarEstatusUnidad(uid, 'Operando', `Asignada a ${fa.cliente}`) }
    const horas = Math.round((new Date(fa.fin).getTime() - new Date(fa.inicio).getTime()) / 3_600_000)
    setMAsig(false); setFtab('asig')
    toast(`${id} · ${fa.cliente}: ${fa.custodios.length} custodio${fa.custodios.length > 1 ? 's' : ''} y ${fa.unidades.length} unidad${fa.unidades.length > 1 ? 'es' : ''} por ${horas} h`)
  }
  const abrirEstatus = (u: Unidad) => { setFe({ estatus: estatusDe(u), motivo: '' }); setMEstatus(true) }
  const guardarEstatus = () => {
    if (!ficha) return
    actions.cambiarEstatusUnidad(ficha, fe.estatus, fe.motivo.trim() || undefined)
    setMEstatus(false); setFtab('resumen')
    toast(`${ficha} ahora está ${fe.estatus}${fe.motivo.trim() ? ' · ' + fe.motivo.trim() : ''}`)
  }

  const importar = () => {
    const n = archivo ? Math.min(60, Math.max(8, Math.round(archivo.size / 1200))) : 24
    const ops = filas.filter(f => f.estatus === 'Operando')
    const nuevas: Carga[] = Array.from({ length: n }, (_, i) => {
      const u = ops[(i * 37 + n) % ops.length].u
      const litros = 40 + ((i * 13) % 30)
      const km = 320 + ((i * 71) % 380)
      const rend = Math.round((km / litros) * 10) / 10
      return { unidad: u.id, fecha: `2026-10-${String(1 + (i % 7)).padStart(2, '0')}`, litros, costo: Math.round(litros * PRECIO_LITRO), kmGps: km, rendimiento: rend, anomalo: rend < 6.5, origen: 'Tarjeta' }
    })
    setCargasBase(c => [...nuevas, ...c])
    setMImport(false); setArchivo(null)
    verCargas('Todas')
    toast(`${n} cargas importadas${archivo ? ' de ' + archivo.name : ''} · ${nuevas.filter(x => x.anomalo).length} con consumo anómalo`)
  }
  const exportar = () => {
    const data: (string | number)[][] = tab === 'u' ? [['Unidad', 'Vehículo', 'Placas', 'Zona', 'Estatus', 'Asignada a', 'Custodios', 'km/l', 'Próximo vencimiento', 'Km'], ...rowsU.map(f => [f.u.id, f.u.vehiculo, f.u.placas, f.u.zona, f.estatus, f.asignada, f.custodiosTxt, f.rend, f.venc.txt, f.u.km])]
      : tab === 't' ? [['Orden', 'Unidad', 'Tipo', 'Falla', 'Proveedor', 'Costo', 'Días fuera', 'Estatus', 'Fecha'], ...rowsT.map(o => [o.id, o.unidad, o.tipo, o.falla, o.proveedor, o.costo, o.diasFuera, o.estatus, o.fecha])]
      : [['Fecha', 'Unidad', 'Origen', 'Litros', 'Costo', 'Km', 'km/l', 'Consumo'], ...rowsC.map(c => [c.fecha, c.unidad, c.origen, c.litros, c.costo, c.kmGps, c.rendimiento, c.anomalo ? 'Anómalo' : 'Normal'])]
    const csv = data.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `flotilla-${tabInfo[1].toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(a.href)
    toast(`Exportadas ${total} filas a CSV`)
  }

  const selectSt = inputStyle + ';width:auto;max-width:100%;min-height:36px'
  const KPI = ({ label, v, sub, onClick }: { label: string; v: string; sub: string; onClick: () => void }) => (
    <button type="button" className="card kpi" onClick={onClick} style={sx('display:flex;flex-direction:column;gap:4px;padding:14px 18px')}><span className="lbl">{label}</span><span className="k">{v}</span><span style={sx('font-size:13px;color:#5F6B7A')}>{sub}</span></button>
  )
  const vencLabel = fVenc === 'poliza' ? 'póliza por vencer' : fVenc === 'verif' ? 'verificación pendiente' : fVenc === 'km' ? 'servicio por km' : 'consumo anómalo'
  const pillVenc = (v: Vencimiento) => v.txt === 'Sin pendientes' ? <span style={sx('color:#5F6B7A')}>—</span> : <span className={'pill ' + (v.nivel === 'bad' ? 'p-bad' : v.nivel === 'warn' ? 'p-warn' : 'p-mute')}>{v.txt}</span>

  // ── Ficha de la unidad ──
  const fichaU = ficha ? unidades.find(u => u.id === ficha) : undefined
  const fichaFila = fichaU ? filas.find(f => f.u.id === fichaU.id) : undefined
  const fichaAsg = fichaU ? asignacionesDeUnidad(fichaU.id, todasAsg) as Asg[] : []
  const fichaDiario = fichaU ? diario(fichaU, cargasNuevasPorUnidad.get(fichaU.id) ?? []) : null
  const fichaOrdenes = fichaU ? ordenes.filter(o => o.unidad === fichaU.id).sort((a, b) => b.fecha.localeCompare(a.fecha)) : []
  const fichaOverride = fichaU ? overridePorUnidad.get(fichaU.id) : undefined
  const historial = fichaU ? [
    ...(fichaOverride ? [{ fecha: fichaOverride.desde, txt: `Cambió a ${fichaOverride.estatus}`, det: fichaOverride.motivo ?? 'Registrado en la plataforma' }] : []),
    ...fichaOrdenes.flatMap(o => [o.estatus === 'Cerrada' ? { fecha: o.fecha, txt: 'Regresó a Operando', det: `Orden ${o.id} cerrada · ${o.falla}` } : null, { fecha: o.fecha, txt: o.estatus === 'En aseguradora' ? 'En aseguradora' : 'Enviada a taller', det: `Orden ${o.id} · ${o.tipo} · ${o.falla} · ${o.proveedor}` }].filter(Boolean) as { fecha: string; txt: string; det: string }[]),
    { fecha: `${fichaU.anio}-01-15`, txt: `Alta en la flotilla como ${fichaU.estatus}`, det: `${fichaU.vehiculo} · ${fichaU.placas} · GPS ${fichaU.gps}` },
  ].sort((a, b) => b.fecha.localeCompare(a.fecha)) : []

  const Grafica = ({ dias, esperado }: { dias: ReturnType<typeof diario>['dias']; esperado: number }) => {
    const W = 760, H = 150, padL = 34, padB = 22, padT = 8
    const max = Math.max(esperado * 1.25, ...dias.map(d => d.rendimiento)) || 1
    const n = dias.length, bw = (W - padL) / n
    const y = (v: number) => padT + (H - padB - padT) * (1 - v / max)
    const yRef = y(esperado)
    // Celular: la gráfica (760 de ancho) se lee con scroll horizontal en vez de encogerse a la mitad
    const svg = (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rendimiento diario en km por litro de los últimos ${n} días; línea de referencia en ${esperado} km/l`} style={sx((movil ? 'width:max(100%,640px)' : 'width:100%') + ';height:auto;display:block')}>
        {[0, 0.5, 1].map(t => <text key={t} x={padL - 6} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill="#5F6B7A" fontFamily="IBM Plex Mono, monospace">{(max * t).toFixed(0)}</text>)}
        <line x1={padL} x2={W} y1={y(0)} y2={y(0)} stroke="#E4E8ED" />
        {dias.map((d, i) => {
          if (!d.km) return <rect key={d.fecha} x={padL + i * bw + 2} y={y(0) - 2} width={Math.max(2, bw - 4)} height={2} fill="#E4E8ED" />
          const anom = d.rendimiento < esperado * 0.8
          return <rect key={d.fecha} x={padL + i * bw + 2} y={y(d.rendimiento)} width={Math.max(2, bw - 4)} height={y(0) - y(d.rendimiento)} rx="2" fill={anom ? '#D9534F' : d.manual ? '#0D1D41' : '#475CC7'}><title>{`${fmtFecha(d.fecha)} · ${d.km} km · ${d.litros} L · ${d.rendimiento} km/l${anom ? ' · consumo anómalo' : ''}`}</title></rect>
        })}
        <line x1={padL} x2={W} y1={yRef} y2={yRef} stroke="#9A5B00" strokeDasharray="4 4" />
        <text x={W - 4} y={yRef - 4} textAnchor="end" fontSize="10" fill="#9A5B00" fontFamily="Montserrat, sans-serif">esperado {esperado} km/l</text>
        {dias.map((d, i) => (i % 5 === 0 || i === n - 1) && <text key={'x' + d.fecha} x={padL + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#5F6B7A" fontFamily="Montserrat, sans-serif">{fmtFecha(d.fecha)}</text>)}
      </svg>
    )
    return movil ? <div style={sx('overflow-x:auto;-webkit-overflow-scrolling:touch')}>{svg}</div> : svg
  }
  const padFicha = movil ? 16 : 22 // margen interior del cajón de la ficha

  const custodiosDisponibles = useMemo(() => { const nqc = norm(fa.qCust.trim()); return custodios.filter(c => c.estatus === 'Disponible' && !fa.custodios.includes(c.id) && (!nqc || norm(c.id + ' ' + c.nombre + ' ' + c.zona + ' ' + c.base).includes(nqc))).slice(0, 8) }, [fa.qCust, fa.custodios])
  const unidadesCandidatas = useMemo(() => { const nqu = norm(fa.qUni.trim()); if (!nqu) return []; return filas.filter(f => (f.estatus === 'Disponible' || f.estatus === 'Operando') && !fa.unidades.includes(f.u.id) && norm(f.u.id + ' ' + f.u.vehiculo + ' ' + f.u.placas).includes(nqu)).slice(0, 6) }, [fa.qUni, fa.unidades, filas])
  const serviciosCliente = useMemo(() => servicios.filter(s => s.cliente === fa.cliente && s.tipo !== 'Monitoreo' && (s.estatus === 'Confirmado' || s.estatus === 'En tránsito')).slice(0, 12), [fa.cliente])
  const toggle = (arr: string[], id: string) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]

  return (
    <Shell active="flotilla" css={CSS}>
      <PageHeader seccion="Equipo" titulo="Flotilla"
        descripcion="Toda la operación de las unidades en un solo lugar: a qué cliente y custodios está asignada cada una, su gasolina y kilómetros por día, el taller y sus papeles. Para quien mantiene las unidades rodando."
        accion={{ label: 'Nueva orden de taller', onClick: () => abrirOrden() }}
        secundarias={<button type="button" className="btn" onClick={() => setMImport(true)}>Importar cargas de tarjeta</button>}>
        <span style={sx('color:#5F6B7A;font-size:13px')}>{kpi.total} unidades · {kpi.operando} operando · {kpi.enTaller} en taller · {kpi.abiertas} órdenes abiertas · {asgNuevas.length ? asgNuevas.length + ' asignaciones nuevas · ' : ''}Haz clic en una unidad para mandarla a taller, registrar su carga o asignarla a un cliente.</span>
      </PageHeader>

      <section aria-label="Sugerencia de la IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:14px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}>
          <span style={sx('font-weight:600')}>Sugerencia de la IA: revisar la suspensión de <button type="button" onClick={() => abrirFicha('AU-1450', 'taller')} style={sx('background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline')}>AU-1450</button> antes de 2,000 km</span>
          <span style={sx('font-size:14px;color:#3E4A59')}>Tiene 82% de probabilidad de falla. Además, <button type="button" onClick={() => abrirFicha('AU-1876', 'comb')} style={sx('background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline')}>AU-1876</button> y <button type="button" onClick={() => abrirFicha('AU-1688', 'comb')} style={sx('background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline')}>AU-1688</button> rinden 35% menos que la flotilla y sus km de GPS no cuadran con las cargas: posible fuga o uso no autorizado.</span>
        </div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="56" viewBox="0 0 220 64" role="img" aria-label="Rendimiento en km por litro: AU-3321 10.3, AU-1876 6.8, AU-2214 10.2, AU-2087 10.2, AU-1688 6.9, AU-1450 9.9" style={sx('display:block')}><g><rect x="4" y="11.8" width="28" height="48.2" rx="2" fill="#475CC7"></rect><rect x="40" y="28.2" width="28" height="31.8" rx="2" fill="#D9534F"></rect><rect x="76" y="12.3" width="28" height="47.7" rx="2" fill="#475CC7"></rect><rect x="112" y="12.3" width="28" height="47.7" rx="2" fill="#475CC7"></rect><rect x="148" y="27.7" width="28" height="32.3" rx="2" fill="#D9534F"></rect><rect x="184" y="13.7" width="28" height="46.3" rx="2" fill="#475CC7"></rect></g></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>km/l por unidad · rojo: consumo anómalo</figcaption>
        </figure>
        <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
          <button type="button" className="btn" onClick={() => abrirOrden('AU-1450', { tipo: 'Preventivo', falla: 'Revisión preventiva de suspensión (sugerencia de la IA)' })}>Abrir orden para AU-1450</button>
          <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
        </div>
      </section>

      <section aria-label="Indicadores" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px')}>
        <KPI label="Unidades operando" v={kpi.pct + '%'} sub={`${kpi.operando} de ${kpi.total} · ${kpi.siniestros} siniestros en el trimestre`} onClick={() => verUnidades('Operando')} />
        <KPI label="En taller" v={String(kpi.enTaller)} sub={`${kpi.abiertas} órdenes abiertas · ${kpi.diasProm.toFixed(1)} días fuera por orden`} onClick={() => verUnidades('En taller')} />
        <KPI label="Rendimiento promedio" v={kpi.rend.toFixed(1) + ' km/l'} sub={`meta 10.5 · ${kpi.anomalas} cargas con consumo anómalo`} onClick={() => verCargas('Anómalo')} />
        <KPI label="Costo por km" v={'$' + kpi.costoKm.toFixed(2)} sub={`combustible + taller + seguro · ${(kpi.kmMes / 1e6).toFixed(2)}M km al mes`} onClick={() => verCosto()} />
      </section>

      <div id="tabla-flotilla" data-tour="unidades" style={sx('display:flex;flex-direction:column;gap:12px')}>
        <div role="tablist" aria-label="Qué ver" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={k === tab} className="tab" onClick={() => cambiarTab(k)}>{label} <span className="mono" style={sx('font-size:12px;opacity:.8')}>{k === 'u' ? unidades.length : k === 't' ? ordenes.length : cargas.length}</span></button>
          ))}
        </div>

        <Section titulo={`${total} ${tab === 'u' ? (total === 1 ? 'unidad' : 'unidades') : tab === 't' ? (total === 1 ? 'orden de taller' : 'órdenes de taller') : (total === 1 ? 'carga de combustible' : 'cargas de combustible')}`} ayuda={tabInfo[2]}
          acciones={<>
            {tab === 'u' && <>
              <select aria-label="Estatus" value={fEst} onChange={e => { setFEst(e.target.value as 'Todos' | EstatusUnidad); pg.setPage(0) }} style={sx(selectSt)}><option value="Todos">Todos los estatus</option>{ESTATUS_U.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select aria-label="Zona" value={fZona} onChange={e => { setFZona(e.target.value as 'Todas' | Zona); pg.setPage(0) }} style={sx(selectSt)}><option value="Todas">Todas las zonas</option>{ZONAS.map(z => <option key={z} value={z}>{z}</option>)}</select>
              {fVenc !== 'none' && <button type="button" className="pill p-warn" style={sx('border:0;cursor:pointer;font-family:inherit')} onClick={() => { setFVenc('none'); pg.setPage(0) }}>Filtro: {vencLabel} ×</button>}
            </>}
            {tab === 't' && <select aria-label="Estatus de orden" value={fOT} onChange={e => { setFOT(e.target.value as 'Todas' | OrdenTaller['estatus']); pg.setPage(0) }} style={sx(selectSt)}><option value="Todas">Todas las órdenes</option><option>Abierta</option><option>Cerrada</option><option>En aseguradora</option></select>}
            {tab === 'c' && <>
              <select aria-label="Consumo" value={fCarga} onChange={e => { setFCarga(e.target.value as 'Todas' | 'Normal' | 'Anómalo'); pg.setPage(0) }} style={sx(selectSt)}><option value="Todas">Todo el consumo</option><option>Normal</option><option>Anómalo</option></select>
              <button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => abrirCarga()}>Registrar carga</button>
            </>}
            <input type="search" aria-label="Buscar" placeholder={tab === 'u' ? 'Buscar unidad, placas, cliente, custodio' : tab === 't' ? 'Buscar orden, unidad, falla' : 'Buscar unidad'} value={q} onChange={e => { setQ(e.target.value); pg.setPage(0) }} style={sx(selectSt + ';min-width:220px')} />
            {movil && (
              <select aria-label="Ordenar por" value={sort ? `${sort.k}:${sort.dir}` : ''} onChange={e => { const [k, d] = e.target.value.split(':'); setSort(k ? { k, dir: d === '-1' ? -1 : 1 } : null); pg.setPage(0) }} style={sx(selectSt)}>
                <option value="">Ordenar: sin orden</option>
                {COLS_TAB[tab].flatMap(([k, label]) => [<option key={k + '1'} value={`${k}:1`}>{label} ▲</option>, <option key={k + '-1'} value={`${k}:-1`}>{label} ▼</option>])}
              </select>
            )}
            <button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={exportar}>Exportar CSV</button>
          </>}>
          {movil && (
            <div role="tabpanel" aria-label={tabInfo[1]} style={sx('display:flex;flex-direction:column')}>
              {tab === 'u' && rowsU.slice(pg.from, pg.to).map(f => (
                <FilaM key={f.u.id} sel={f.u.id === ficha} onClick={() => abrirFicha(f.u.id)} title="Abrir la ficha de la unidad">
                  <span style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:nowrap')}>
                    <span style={sx('display:flex;flex-direction:column;min-width:0')}><span className="mono" style={sx('font-weight:600')}>{f.u.id}</span><span style={sx('font-size:13px;color:#3E4A59')}>{f.u.vehiculo} · {f.u.placas}</span></span>
                    <span className={ST[f.estatus]} style={sx('flex:none')}>{f.estatus}</span>
                  </span>
                  <dl className="dl">
                    <div className="ancho"><dt>Asignada a</dt><dd>{f.asignada === '—' ? <span style={sx('color:#5F6B7A')}>Sin asignar</span> : <>{f.asignada}{f.asg && <span style={sx('color:#5F6B7A;font-size:12px')}> · {estatusAsg(f.asg) === 'En curso' ? 'en curso' : 'desde ' + fmtFecha(f.asg.inicio.slice(0, 10))}</span>}</>}</dd></div>
                    <div><dt>Custodio(s)</dt><dd>{f.custodiosTxt}</dd></div>
                    <div><dt>Rendimiento</dt><dd className="mono">{f.rend.toFixed(1)} km/l{f.rend < f.u.rendimiento * 0.8 && <span className="pill p-bad" style={sx('margin-left:6px')}>bajo</span>}</dd></div>
                    <div className="ancho"><dt>Próximo vencimiento</dt><dd>{pillVenc(f.venc)}</dd></div>
                  </dl>
                </FilaM>
              ))}
              {tab === 'u' && rowsU.length === 0 && <span style={sx('padding:24px 12px;color:#5F6B7A;text-align:center')}>Sin unidades con estos filtros. Prueba con otra zona o estatus.</span>}
              {tab === 't' && rowsT.slice(pg.from, pg.to).map(o => (
                <FilaM key={o.id} sel={o.unidad === ficha} onClick={() => abrirFicha(o.unidad, 'taller')} title="Abrir la ficha de la unidad">
                  <span style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:nowrap')}>
                    <span style={sx('display:flex;flex-direction:column;min-width:0')}><span className="mono" style={sx('font-weight:600')}>{o.id}{idsOrdenesStore.has(o.id) && <span className="pill p-info" style={sx('margin-left:6px')}>nueva</span>}</span><span style={sx('font-size:13px;color:#3E4A59')}><span className="mono">{o.unidad}</span> · {fmtFecha(o.fecha)} · {o.tipo}</span></span>
                    <span className={ST[o.estatus]} style={sx('flex:none')}>{o.estatus}</span>
                  </span>
                  <dl className="dl">
                    <div className="ancho"><dt>Falla reportada</dt><dd>{o.falla}</dd></div>
                    <div><dt>Proveedor</dt><dd>{o.proveedor}</dd></div>
                    <div><dt>Costo</dt><dd className="mono">{o.estatus === 'En aseguradora' ? '—' : fmtMXN(o.costo)}</dd></div>
                    <div><dt>Días fuera</dt><dd className="mono">{o.diasFuera}</dd></div>
                  </dl>
                  {o.estatus === 'Abierta' && <button type="button" className="btn" style={sx('min-height:36px;padding:0 12px;align-self:flex-start')} onClick={e => { e.stopPropagation(); cerrarOrden(o) }}>Cerrar orden</button>}
                </FilaM>
              ))}
              {tab === 't' && rowsT.length === 0 && <span style={sx('padding:24px 12px;color:#5F6B7A;text-align:center')}>Sin órdenes con estos filtros. Prueba con otro estatus.</span>}
              {tab === 'c' && rowsC.slice(pg.from, pg.to).map((c, i) => (
                <FilaM key={(c.id ?? c.unidad + c.fecha) + i} sel={c.unidad === ficha} onClick={() => abrirFicha(c.unidad, 'comb')} title="Abrir la ficha de la unidad">
                  <span style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:nowrap')}>
                    <span style={sx('display:flex;flex-direction:column;min-width:0')}><span className="mono" style={sx('font-weight:600')}>{c.unidad}</span><span style={sx('font-size:13px;color:#3E4A59')}>{fmtFecha(c.fecha)} · {c.origen}{c.id && <span className="pill p-info" style={sx('margin-left:6px')}>nueva</span>}</span></span>
                    <span className={ST[c.anomalo ? 'Anómalo' : 'Normal']} style={sx('flex:none')}>{c.anomalo ? 'Anómalo' : 'Normal'}</span>
                  </span>
                  <dl className="dl">
                    <div><dt>Litros</dt><dd className="mono">{c.litros.toFixed(1)}</dd></div>
                    <div><dt>Costo</dt><dd className="mono">{fmtMXN(c.costo)}</dd></div>
                    <div><dt>Km</dt><dd className="mono">{c.kmGps}</dd></div>
                    <div><dt>km/l</dt><dd className="mono">{c.rendimiento ? c.rendimiento.toFixed(1) : '—'}</dd></div>
                  </dl>
                </FilaM>
              ))}
              {tab === 'c' && rowsC.length === 0 && <span style={sx('padding:24px 12px;color:#5F6B7A;text-align:center')}>Sin cargas con estos filtros. Registra una carga o importa el estado de cuenta de la tarjeta.</span>}
            </div>
          )}
          {!movil && (
          <div role="tabpanel" aria-label={tabInfo[1]} style={sx('overflow-x:auto;margin:0 -12px')}>
            {tab === 'u' && (
              <table className="tbl">
                <thead><tr>{th('id', 'Unidad')}{th('vehiculo', 'Vehículo')}{th('estatus', 'Estatus')}{th('asignada', 'Asignada a')}{th('custodios', 'Custodio(s)')}{th('rend', 'Rendimiento')}{th('venc', 'Próximo vencimiento')}</tr></thead>
                <tbody>
                  {rowsU.slice(pg.from, pg.to).map(f => (
                    <tr key={f.u.id} className={f.u.id === ficha ? 'sel' : ''} aria-selected={f.u.id === ficha} onClick={() => abrirFicha(f.u.id)} title="Abrir la ficha de la unidad">
                      <td className="mono">{f.u.id}</td><td title={f.u.placas}>{f.u.vehiculo}</td><td><span className={ST[f.estatus]}>{f.estatus}</span></td>
                      <td>{f.asignada === '—' ? <span style={sx('color:#5F6B7A')}>Sin asignar</span> : <>{f.asignada}{f.asg && <span style={sx('color:#5F6B7A;font-size:12px')}> · {estatusAsg(f.asg) === 'En curso' ? 'en curso' : 'desde ' + fmtFecha(f.asg.inicio.slice(0, 10))}</span>}</>}</td>
                      <td>{f.custodiosTxt}</td>
                      <td className="mono">{f.rend.toFixed(1)} km/l{f.rend < f.u.rendimiento * 0.8 && <span className="pill p-bad" style={sx('margin-left:6px')}>bajo</span>}</td>
                      <td>{pillVenc(f.venc)}</td>
                    </tr>
                  ))}
                  {rowsU.length === 0 && <tr><td colSpan={7} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin unidades con estos filtros. Prueba con otra zona o estatus.</td></tr>}
                </tbody>
              </table>
            )}
            {tab === 't' && (
              <table className="tbl">
                <thead><tr>{th('id', 'Orden')}{th('unidad', 'Unidad')}{th('fecha', 'Fecha')}{th('tipo', 'Tipo')}{th('falla', 'Falla reportada')}{th('proveedor', 'Proveedor')}{th('costo', 'Costo')}{th('diasFuera', 'Días fuera')}{th('estatus', 'Estatus')}<th style={sx('cursor:default')}></th></tr></thead>
                <tbody>
                  {rowsT.slice(pg.from, pg.to).map(o => (
                    <tr key={o.id} className={o.unidad === ficha ? 'sel' : ''} onClick={() => abrirFicha(o.unidad, 'taller')} title="Abrir la ficha de la unidad">
                      <td className="mono">{o.id}{idsOrdenesStore.has(o.id) && <span className="pill p-info" style={sx('margin-left:6px')}>nueva</span>}</td><td className="mono">{o.unidad}</td><td>{fmtFecha(o.fecha)}</td><td>{o.tipo}</td><td>{o.falla}</td><td>{o.proveedor}</td><td className="mono">{o.estatus === 'En aseguradora' ? '—' : fmtMXN(o.costo)}</td><td className="mono">{o.diasFuera}</td><td><span className={ST[o.estatus]}>{o.estatus}</span></td>
                      <td>{o.estatus === 'Abierta' && <button type="button" className="btn" style={sx('min-height:32px;padding:0 10px')} onClick={e => { e.stopPropagation(); cerrarOrden(o) }}>Cerrar orden</button>}</td>
                    </tr>
                  ))}
                  {rowsT.length === 0 && <tr><td colSpan={10} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin órdenes con estos filtros. Prueba con otro estatus.</td></tr>}
                </tbody>
              </table>
            )}
            {tab === 'c' && (
              <table className="tbl">
                <thead><tr>{th('fecha', 'Fecha')}{th('unidad', 'Unidad')}{th('origen', 'Origen')}{th('litros', 'Litros')}{th('costo', 'Costo')}{th('kmGps', 'Km')}{th('rendimiento', 'km/l')}{th('consumo', 'Consumo')}</tr></thead>
                <tbody>
                  {rowsC.slice(pg.from, pg.to).map((c, i) => (
                    <tr key={(c.id ?? c.unidad + c.fecha) + i} className={c.unidad === ficha ? 'sel' : ''} onClick={() => abrirFicha(c.unidad, 'comb')} title="Abrir la ficha de la unidad">
                      <td>{fmtFecha(c.fecha)}</td><td className="mono">{c.unidad}</td><td>{c.origen}{c.id && <span className="pill p-info" style={sx('margin-left:6px')}>nueva</span>}</td><td className="mono">{c.litros.toFixed(1)}</td><td className="mono">{fmtMXN(c.costo)}</td><td className="mono">{c.kmGps}</td><td className="mono">{c.rendimiento ? c.rendimiento.toFixed(1) : '—'}</td><td><span className={ST[c.anomalo ? 'Anómalo' : 'Normal']}>{c.anomalo ? 'Anómalo' : 'Normal'}</span></td>
                    </tr>
                  ))}
                  {rowsC.length === 0 && <tr><td colSpan={8} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin cargas con estos filtros. Registra una carga o importa el estado de cuenta de la tarjeta.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          )}
          {tab === 'u' && <Nota>Estatus: lo que el equipo cambió en la plataforma manda sobre el catálogo. Asignada a: cliente · servicio de la asignación en curso o la siguiente programada. Rendimiento: km/l de los últimos 30 días; "bajo" cuando queda 20% abajo de lo esperado para esa unidad.</Nota>}
          {tab === 'c' && <Nota>Consumo anómalo: el rendimiento (km/l) queda muy por debajo de la flotilla o los km del GPS no cuadran con los litros cargados. Las cargas "nuevas" se registraron a mano desde la ficha de la unidad.</Nota>}
          <Pager {...pg} />
        </Section>
      </div>

      <Section titulo="Vencimientos y alertas" ayuda="Pólizas, verificaciones y servicios próximos a vencer. Haz clic en una línea para ver esas unidades." plegable abierto={false}>
        <div style={sx('display:flex;flex-direction:column')}>
          <button type="button" className="venc" onClick={() => verUnidades('Todos', 'poliza')}><span>Pólizas de seguro que vencen en 30 días</span><span className="pill p-warn">{venc.poliza} unidades</span></button>
          <button type="button" className="venc" onClick={() => verUnidades('Todos', 'verif')}><span>Verificación vehicular pendiente · 2° semestre</span><span className="pill p-bad">{venc.verif} unidades</span></button>
          <button type="button" className="venc" onClick={() => verUnidades('Todos', 'km')}><span>Servicio por kilometraje a menos de 1,000 km</span><span className="pill p-warn">{venc.km} unidades</span></button>
          <button type="button" className="venc" onClick={() => verUnidades('Todos', 'anomalo')}><span>Consumo anómalo frente a km del GPS</span><span className="pill p-bad">{venc.anomalo} unidades</span></button>
          <button type="button" className="venc" onClick={() => verUnidades('Siniestrada')}><span>Siniestros del trimestre · unidades siniestradas</span><span className="pill p-bad">{kpi.siniestros} siniestros</span></button>
        </div>
      </Section>

      <div id="costo-unidad">
        <Section key={costoKey} titulo={`Costo por unidad · ${sel.id} · trimestre`} ayuda="Cuánto cuesta cada unidad en combustible, mantenimiento y seguro, y el costo por kilómetro que resulta." plegable abierto={costoKey > 0}
          acciones={<select aria-label="Unidad" value={sel.id} onChange={e => setSelU(e.target.value)} style={sx(selectSt)}>{unidades.map(u => <option key={u.id} value={u.id}>{u.id} · {u.vehiculo}</option>)}</select>}>
          <div style={sx('display:flex;flex-direction:column;gap:12px;max-width:640px')}>
            {([['Combustible', costo.comb], ['Mantenimiento', costo.mant], ['Seguro', costo.seg]] as [string, number][]).map(([k, v]) => (
              <div key={k} style={sx('display:grid;grid-template-columns:120px minmax(0,1fr) 90px;gap:12px;align-items:center;font-size:14px')}>
                <span>{k}</span>
                <div style={sx('height:10px;border-radius:5px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;width:' + Math.round(v / maxCosto * 100) + '%;background:#475CC7')}></div></div>
                <span className="mono" style={sx('text-align:right')}>{fmtMXN(v)}</span>
              </div>
            ))}
            <div style={sx('display:flex;justify-content:space-between;border-top:1px solid #E4E8ED;padding-top:10px;font-weight:600')}><span>Total</span><span className="mono">{fmtMXN(costoTotal)} · ${(costoTotal / costo.km).toFixed(2)}/km</span></div>
            <Nota>{sel.vehiculo} · {sel.placas} · {sel.km.toLocaleString('es-MX')} km · {estatusDe(sel)} · <button type="button" onClick={() => abrirFicha(sel.id)} style={sx('background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline')}>Abrir ficha</button></Nota>
          </div>
        </Section>
      </div>

      {/* ───────────── Ficha de la unidad (panel lateral) ───────────── */}
      {fichaU && fichaFila && fichaDiario && (
        <div className="drawer" onClick={() => setFicha(null)}>
          <aside role="dialog" aria-modal="true" aria-label={`Ficha de la unidad ${fichaU.id}`} onClick={e => e.stopPropagation()}>
            <div style={sx(`display:flex;flex-wrap:nowrap;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px ${padFicha}px 0`)}>
              <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
                <span className="lbl">Ficha de la unidad</span>
                <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:22px;font-weight:700;display:flex;align-items:center;gap:10px;flex-wrap:wrap")}><span className="mono">{fichaU.id}</span><span style={sx('font-weight:500;font-size:16px;color:#3E4A59')}>{fichaU.vehiculo} · {fichaU.placas}</span><span className={ST[fichaFila.estatus]}>{fichaFila.estatus}</span></h2>
                <span style={sx('font-size:13px;color:#5F6B7A')}>{fichaFila.asignada === '—' ? 'Sin asignación vigente' : `Asignada a ${fichaFila.asignada}`}{fichaFila.custodiosTxt !== '—' ? ` · ${fichaFila.custodiosTxt}` : ''} · {fichaU.zona} · GPS {fichaU.gps}</span>
              </div>
              <button type="button" onClick={() => setFicha(null)} aria-label="Cerrar" style={sx('width:32px;height:32px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#3E4A59;font-size:16px;cursor:pointer;flex:none')}>×</button>
            </div>
            <div style={sx(`display:flex;gap:8px;flex-wrap:wrap;padding:14px ${padFicha}px`)}>
              <button type="button" className="btn" onClick={() => abrirOrden(fichaU.id)}>Mandar a taller</button>
              <button type="button" className="btn" onClick={() => abrirCarga(fichaU.id)}>Registrar carga / km del día</button>
              <button type="button" className="btn" onClick={() => abrirAsignar(fichaU.id)}>Asignar a un cliente</button>
              <button type="button" className="btn" onClick={() => abrirEstatus(fichaU)}>Cambiar estatus</button>
            </div>
            <div role="tablist" aria-label="Secciones de la ficha" style={sx(`display:flex;gap:4px;flex-wrap:wrap;padding:0 ${padFicha}px 10px;border-bottom:1px solid #EEF1F4`)}>
              {FTABS.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={k === ftab} className="ftab" onClick={() => setFtab(k)}>{label}<span className="mono" style={sx('font-size:11px;opacity:.8')}>{k === 'asig' ? fichaAsg.length : k === 'taller' ? fichaOrdenes.length : k === 'comb' ? fichaDiario.cargas : ''}</span></button>)}
            </div>
            <div style={sx(`padding:18px ${padFicha}px;overflow:auto;display:flex;flex-direction:column;gap:16px;flex:1`)}>
              {ftab === 'resumen' && <>
                <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px')}>
                  {([['Vehículo', fichaU.vehiculo], ['Placas', fichaU.placas], ['VIN', fichaU.vin], ['Año', String(fichaU.anio)], ['Zona', fichaU.zona], ['GPS', fichaU.gps], ['Kilometraje', fichaU.km.toLocaleString('es-MX') + ' km'], ['Rendimiento esperado', fichaU.rendimiento.toFixed(1) + ' km/l'], ['Costo mensual', fmtMXN(fichaU.costoMes)]] as [string, string][]).map(([k, v]) => <div key={k} className="dato"><span className="lbl">{k}</span><span className={k === 'VIN' || k === 'Placas' ? 'mono' : ''}>{v}</span></div>)}
                  <div className="dato"><span className="lbl">Póliza de seguro</span><span><span className={fichaU.poliza.startsWith('vence') ? 'pill p-warn' : fichaU.poliza === 'en trámite' ? 'pill p-mute' : 'pill p-ok'}>{fichaU.poliza}</span> <span style={sx('font-size:12px;color:#5F6B7A')}>· {fmtFecha(fichaU.polizaVence)}</span></span></div>
                  <div className="dato"><span className="lbl">Verificación</span><span><span className={fichaU.verificacion.startsWith('vence') ? 'pill p-bad' : 'pill p-ok'}>{fichaU.verificacion}</span></span></div>
                  <div className="dato"><span className="lbl">Próximo vencimiento</span><span>{pillVenc(fichaFila.venc)}</span></div>
                </div>
                <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px')}>
                  {([['Km últimos 30 días', fichaDiario.km.toLocaleString('es-MX') + ' km'], ['Litros 30 días', fichaDiario.litros.toFixed(0) + ' L'], ['Gasto 30 días', fmtMXN(fichaDiario.costo)], ['Rendimiento real', fichaDiario.rend.toFixed(1) + ' km/l']] as [string, string][]).map(([k, v]) => <div key={k} className="card" style={sx('padding:12px 14px;display:flex;flex-direction:column;gap:2px')}><span className="lbl">{k}</span><span style={sx('font-size:20px;font-weight:600')}>{v}</span></div>)}
                </div>
                <div>
                  <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap')}><h3 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600")}>Estatus: {fichaFila.estatus}</h3><span style={sx('font-size:13px;color:#5F6B7A')}>{fichaOverride ? `desde ${fmtFecha(fichaOverride.desde)}${fichaOverride.motivo ? ' · ' + fichaOverride.motivo : ''}` : 'según el catálogo de la flotilla'}</span></div>
                  <Nota>Historial de cambios de estatus de esta unidad. Lo que cambies con "Mandar a taller", "Cerrar orden" o "Cambiar estatus" aparece aquí.</Nota>
                  <div style={sx('margin-top:8px')}>
                    {historial.map((h, i) => <div key={i} className="hist"><span className="mono" style={sx('color:#5F6B7A')}>{fmtFecha(h.fecha)} {h.fecha.slice(0, 4)}</span><span><strong style={sx('font-weight:600')}>{h.txt}</strong><span style={sx('color:#5F6B7A')}> · {h.det}</span></span></div>)}
                  </div>
                </div>
              </>}

              {ftab === 'asig' && <>
                <Nota>A un cliente se le asignan uno o más custodios y una o más unidades por un tiempo. Aquí está todo lo que esta unidad ha hecho: a quién sirvió, con qué custodios y cuántas horas.</Nota>
                {fichaAsg.length === 0 && <div style={sx('padding:24px 12px;color:#5F6B7A;text-align:center')}>Esta unidad no tiene asignaciones. Usa "Asignar a un cliente" para darle la primera.</div>}
                {fichaAsg.length > 0 && (
                  <div style={sx('overflow-x:auto;flex:none')}>
                    <table className="tbl sm quiet">
                      <thead><tr><th style={sx('cursor:default')}>Cliente</th><th style={sx('cursor:default')}>Servicio</th><th style={sx('cursor:default')}>Custodios</th><th style={sx('cursor:default')}>Desde</th><th style={sx('cursor:default')}>Hasta</th><th style={sx('cursor:default')}>Horas</th><th style={sx('cursor:default')}>Estatus</th></tr></thead>
                      <tbody>
                        {[...fichaAsg].sort((a, b) => ordenAsg(a) - ordenAsg(b) || b.inicio.localeCompare(a.inicio)).map(a => { const e = estatusAsg(a); return (
                          <tr key={a.id}>
                            <td>{a.cliente}{a.nueva && <span className="pill p-info" style={sx('margin-left:6px')}>nueva</span>}</td><td className="mono">{a.servicio}<span style={sx("font-family:'Montserrat',sans-serif;color:#5F6B7A;font-size:12px")}> · {a.tipo}{a.unidades.length > 1 ? ` · ${a.unidades.length} unidades` : ''}</span></td><td style={sx('white-space:normal;min-width:160px')}>{a.custodios.map(nombreCustodio).join(', ') || '—'}</td><td className="mono">{fmtFechaHora(a.inicio)}</td><td className="mono">{fmtFechaHora(a.fin)}</td><td className="mono">{a.horas || Math.round((new Date(a.fin).getTime() - new Date(a.inicio).getTime()) / 3_600_000)}</td><td><span className={ST[e]}>{e}</span>{a.resultado && a.resultado !== 'Sin novedad' && <span className={'pill ' + (a.resultado === 'Con incidente' ? 'p-bad' : 'p-warn')} style={sx('margin-left:6px')}>{a.resultado}</span>}</td>
                          </tr>
                        ) })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={sx('display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#5F6B7A')}><span>{fichaAsg.filter(a => estatusAsg(a) === 'Terminada').length} terminadas</span><span>{fichaAsg.filter(a => estatusAsg(a) === 'En curso').length} en curso</span><span>{fichaAsg.filter(a => estatusAsg(a) === 'Programada').length} programadas</span><span>{fichaAsg.reduce((s, a) => s + a.horas, 0).toLocaleString('es-MX')} h acumuladas</span></div>
              </>}

              {ftab === 'comb' && <>
                <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px')}>
                  {([['Km del mes', fichaDiario.km.toLocaleString('es-MX') + ' km'], ['Litros del mes', fichaDiario.litros.toFixed(0) + ' L'], ['Gasto del mes', fmtMXN(fichaDiario.costo)], ['km/l del mes', fichaDiario.rend.toFixed(1)], ['Días anómalos', String(fichaDiario.anomalos.length)]] as [string, string][]).map(([k, v], i) => <div key={k} className="card" style={sx('padding:12px 14px;display:flex;flex-direction:column;gap:2px' + (i === 4 && fichaDiario.anomalos.length ? ';border-color:#F5C2C0' : ''))}><span className="lbl">{k}</span><span style={sx('font-size:20px;font-weight:600' + (i === 4 && fichaDiario.anomalos.length ? ';color:#B42318' : ''))}>{v}</span></div>)}
                </div>
                {fichaDiario.anomalos.length > 0 && <div role="alert" style={sx('display:flex;gap:10px;align-items:flex-start;background:#FDE8E8;border:1px solid #F5C2C0;border-radius:10px;padding:12px 14px;font-size:14px;color:#B42318')}><strong style={sx('font-weight:600;flex:none')}>Consumo anómalo:</strong><span>{fichaDiario.anomalos.length} día{fichaDiario.anomalos.length > 1 ? 's' : ''} con rendimiento 20% abajo de lo esperado ({fichaU.rendimiento.toFixed(1)} km/l): {fichaDiario.anomalos.slice(0, 5).map(d => `${fmtFecha(d.fecha)} (${d.rendimiento} km/l)`).join(', ')}{fichaDiario.anomalos.length > 5 ? '…' : ''}. Revisa fuga, uso no autorizado o cargas mal registradas.</span></div>}
                <div>
                  <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap')}><h3 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600")}>km/l por día · últimos 30 días</h3><span style={sx('font-size:12px;color:#5F6B7A')}>azul: GPS / tarjeta · navy: registro manual · rojo: anómalo · línea: esperado</span></div>
                  <Grafica dias={fichaDiario.dias} esperado={fichaU.rendimiento} />
                </div>
                <div style={sx('overflow-x:auto;flex:none')}>
                  <table className="tbl sm quiet">
                    <thead><tr><th style={sx('cursor:default')}>Fecha</th><th style={sx('cursor:default')}>Km</th><th style={sx('cursor:default')}>Litros</th><th style={sx('cursor:default')}>Costo</th><th style={sx('cursor:default')}>km/l</th><th style={sx('cursor:default')}>Cargó tanque</th><th style={sx('cursor:default')}>Origen</th></tr></thead>
                    <tbody>
                      {[...fichaDiario.dias].reverse().map(d => { const anom = d.km > 0 && d.rendimiento > 0 && d.rendimiento < fichaU.rendimiento * 0.8; return (
                        <tr key={d.fecha} style={sx(anom ? 'background:#FFF7F7' : '')}>
                          <td>{fmtFecha(d.fecha)}</td><td className="mono">{d.km ? d.km.toLocaleString('es-MX') : <span style={sx('color:#5F6B7A')}>sin movimiento</span>}</td><td className="mono">{d.litros ? d.litros.toFixed(1) : '—'}</td><td className="mono">{d.costo ? fmtMXN(d.costo) : '—'}</td><td className="mono">{d.rendimiento ? <>{d.rendimiento.toFixed(1)}{anom && <span className="pill p-bad" style={sx('margin-left:6px')}>anómalo</span>}</> : '—'}</td><td>{d.cargo ? <span className="pill p-ok">Sí</span> : <span style={sx('color:#5F6B7A')}>No</span>}</td><td style={sx('color:#5F6B7A')}>{d.manual ? 'Manual' : d.km ? 'GPS / tarjeta' : '—'}</td>
                        </tr>
                      ) })}
                    </tbody>
                    <tfoot><tr style={sx('font-weight:600')}><td style={sx('padding:10px')}>Total del mes</td><td className="mono" style={sx('padding:10px')}>{fichaDiario.km.toLocaleString('es-MX')}</td><td className="mono" style={sx('padding:10px')}>{fichaDiario.litros.toFixed(1)}</td><td className="mono" style={sx('padding:10px')}>{fmtMXN(fichaDiario.costo)}</td><td className="mono" style={sx('padding:10px')}>{fichaDiario.rend.toFixed(1)}</td><td style={sx('padding:10px')}>{fichaDiario.cargas} cargas</td><td></td></tr></tfoot>
                  </table>
                </div>
              </>}

              {ftab === 'taller' && <>
                <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px')}>
                  {([['Órdenes', String(fichaOrdenes.length)], ['Abiertas', String(fichaOrdenes.filter(o => o.estatus === 'Abierta').length)], ['Costo acumulado', fmtMXN(fichaOrdenes.filter(o => o.estatus !== 'En aseguradora').reduce((s, o) => s + o.costo, 0))], ['Días fuera', String(fichaOrdenes.reduce((s, o) => s + o.diasFuera, 0))]] as [string, string][]).map(([k, v]) => <div key={k} className="card" style={sx('padding:12px 14px;display:flex;flex-direction:column;gap:2px')}><span className="lbl">{k}</span><span style={sx('font-size:20px;font-weight:600')}>{v}</span></div>)}
                </div>
                {fichaOrdenes.length === 0 && <div style={sx('padding:24px 12px;color:#5F6B7A;text-align:center')}>Esta unidad no ha pasado por taller. Usa "Mandar a taller" para abrir la primera orden.</div>}
                {fichaOrdenes.length > 0 && (
                  <div style={sx('overflow-x:auto;flex:none')}>
                    <table className="tbl sm quiet">
                      <thead><tr><th style={sx('cursor:default')}>Orden</th><th style={sx('cursor:default')}>Fecha</th><th style={sx('cursor:default')}>Tipo</th><th style={sx('cursor:default')}>Falla / servicio</th><th style={sx('cursor:default')}>Proveedor</th><th style={sx('cursor:default')}>Costo</th><th style={sx('cursor:default')}>Días fuera</th><th style={sx('cursor:default')}>Estatus</th><th style={sx('cursor:default')}></th></tr></thead>
                      <tbody>
                        {fichaOrdenes.map(o => (
                          <tr key={o.id}>
                            <td className="mono">{o.id}</td><td>{fmtFecha(o.fecha)}</td><td>{o.tipo}</td><td style={sx('white-space:normal;min-width:160px')}>{o.falla}</td><td>{o.proveedor}</td><td className="mono">{o.estatus === 'En aseguradora' ? '—' : fmtMXN(o.costo)}</td><td className="mono">{o.diasFuera}</td><td><span className={ST[o.estatus]}>{o.estatus}</span></td>
                            <td>{o.estatus === 'Abierta' && <button type="button" className="btn" style={sx('min-height:30px;padding:0 10px;font-size:13px')} onClick={() => cerrarOrden(o)}>Cerrar orden</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Nota>Cerrar una orden regresa la unidad a Operando. Los días fuera son los estimados al abrir cada orden.</Nota>
              </>}
            </div>
          </aside>
        </div>
      )}

      {/* ───────────── Modales ───────────── */}
      <Modal open={mOrden} onClose={() => setMOrden(false)} title={ficha ? `Mandar ${fo.unidad} a taller` : 'Nueva orden de taller'} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMOrden(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarOrden}>Abrir orden y mandar a taller</button></>}>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Unidad"><select value={fo.unidad} onChange={e => setFo({ ...fo, unidad: e.target.value })} style={sx(inputStyle)} disabled={!!ficha}>{unidades.map(u => <option key={u.id} value={u.id}>{u.id} · {u.vehiculo}</option>)}</select></Field>
          <Field label="Tipo"><select value={fo.tipo} onChange={e => setFo({ ...fo, tipo: e.target.value as OrdenTaller['tipo'] })} style={sx(inputStyle)}><option>Correctivo</option><option>Preventivo</option></select></Field>
        </div>
        <Field label="Falla reportada / servicio"><input value={fo.falla} onChange={e => setFo({ ...fo, falla: e.target.value })} placeholder="p. ej. Ruido en suspensión delantera" style={sx(inputStyle)} autoFocus /></Field>
        <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
          <Field label="Proveedor"><select value={fo.proveedor} onChange={e => setFo({ ...fo, proveedor: e.target.value })} style={sx(inputStyle)}>{PROVEEDORES.map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Costo estimado (MXN)"><input inputMode="numeric" value={fo.costo} onChange={e => setFo({ ...fo, costo: e.target.value })} placeholder={fo.tipo === 'Preventivo' ? '4,500' : '12,000'} style={sx(inputStyle)} /></Field>
          <Field label="Días fuera estimados"><input inputMode="numeric" value={fo.dias} onChange={e => setFo({ ...fo, dias: e.target.value })} style={sx(inputStyle)} /></Field>
        </div>
        <Nota>Al abrir la orden la unidad pasa a "En taller" en la tabla y en los indicadores. Al cerrarla regresa a Operando.</Nota>
      </Modal>

      <Modal open={mCarga} onClose={() => setMCarga(false)} title="Registrar carga / km del día" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMCarga(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarCarga}>Guardar registro</button></>}>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Unidad"><select value={fc.unidad} onChange={e => setFc({ ...fc, unidad: e.target.value })} style={sx(inputStyle)} disabled={!!ficha}>{unidades.map(u => <option key={u.id} value={u.id}>{u.id} · {u.vehiculo}</option>)}</select></Field>
          <Field label="Fecha"><input type="date" value={fc.fecha} onChange={e => setFc({ ...fc, fecha: e.target.value })} style={sx(inputStyle)} /></Field>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Litros cargados"><input inputMode="decimal" value={fc.litros} onChange={e => setFc({ ...fc, litros: e.target.value })} placeholder="48" style={sx(inputStyle)} autoFocus /></Field>
          <Field label="Costo (MXN)"><input inputMode="numeric" value={fc.costo} onChange={e => setFc({ ...fc, costo: e.target.value })} placeholder={fc.litros ? Math.round((parseFloat(fc.litros.replace(',', '.')) || 0) * PRECIO_LITRO).toLocaleString('es-MX') : `${PRECIO_LITRO} por litro`} style={sx(inputStyle)} /></Field>
          <Field label="Km recorridos en el día"><input inputMode="numeric" value={fc.km} onChange={e => setFc({ ...fc, km: e.target.value })} placeholder="420" style={sx(inputStyle)} /></Field>
          <Field label="Odómetro (opcional)"><input inputMode="numeric" value={fc.odometro} onChange={e => setFc({ ...fc, odometro: e.target.value })} placeholder={String(unidades.find(u => u.id === fc.unidad)?.km ?? '')} style={sx(inputStyle)} /></Field>
        </div>
        <Field label="Nota (opcional)"><input value={fc.nota} onChange={e => setFc({ ...fc, nota: e.target.value })} placeholder="p. ej. Carga en Pemex Tepotzotlán, ticket 4471" style={sx(inputStyle)} /></Field>
        <Nota>{(() => { const l = parseFloat(fc.litros.replace(',', '.')) || 0, k = parseInt(fc.km.replace(/\D/g, '')) || 0; const u = unidades.find(x => x.id === fc.unidad); return l && k ? `Rendimiento del registro: ${(k / l).toFixed(1)} km/l (esperado ${u?.rendimiento.toFixed(1)} km/l).` : 'El registro aparece en la tabla diaria de la unidad y recalcula su rendimiento. Si no hubo carga, captura solo los km.' })()}</Nota>
      </Modal>

      <Modal open={mAsig} onClose={() => setMAsig(false)} title={`Asignar ${fa.unidades[0] ?? ''} a un cliente`} width={680} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMAsig(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarAsignacion}>Crear asignación</button></>}>
        <Nota>A un cliente se le asignan uno o más custodios y una o más unidades por un tiempo (días y horas).</Nota>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Cliente"><select value={fa.cliente} onChange={e => setFa({ ...fa, cliente: e.target.value, servicio: 'nuevo' })} style={sx(inputStyle)}>{clientesLista.map(c => <option key={c} value={c}>{c}{clientesNuevos.some(x => x.nombre === c) ? ' · nuevo' : ''}</option>)}</select></Field>
          <Field label="Servicio"><select value={fa.servicio} onChange={e => { const s = servicios.find(x => x.id === e.target.value); setFa({ ...fa, servicio: e.target.value, ...(s ? { tipo: s.tipo, ruta: s.ruta } : {}) }) }} style={sx(inputStyle)}><option value="nuevo">Nuevo servicio (se crea al guardar)</option>{serviciosCliente.map(s => <option key={s.id} value={s.id}>{s.id} · {s.ruta}</option>)}</select></Field>
          <Field label="Tipo"><select value={fa.tipo} onChange={e => setFa({ ...fa, tipo: e.target.value as TipoServicio })} style={sx(inputStyle)}><option>Por evento</option><option>Dedicado</option></select></Field>
          <Field label="Ruta o planta"><input value={fa.ruta} onChange={e => setFa({ ...fa, ruta: e.target.value })} placeholder={fa.tipo === 'Dedicado' ? 'p. ej. Planta Cuautitlán (dedicado)' : 'p. ej. Méx–Qro–Gdl'} style={sx(inputStyle)} /></Field>
          <Field label="Inicio (fecha y hora)"><input type="datetime-local" value={fa.inicio} onChange={e => setFa({ ...fa, inicio: e.target.value })} style={sx(inputStyle)} /></Field>
          <Field label="Fin (fecha y hora)"><input type="datetime-local" value={fa.fin} onChange={e => setFa({ ...fa, fin: e.target.value })} style={sx(inputStyle)} /></Field>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px')}>
          <div style={sx('display:flex;flex-direction:column;gap:6px')}>
            <span style={sx('font-size:12px;color:#5F6B7A')}>Custodios ({fa.custodios.length} elegidos · mínimo 1)</span>
            {fa.custodios.length > 0 && <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}>{fa.custodios.map(id => <span key={id} className="selpill">{nombreCustodio(id)}<button type="button" aria-label={`Quitar ${nombreCustodio(id)}`} onClick={() => setFa({ ...fa, custodios: fa.custodios.filter(x => x !== id) })}>×</button></span>)}</div>}
            <input type="search" aria-label="Buscar custodio disponible" placeholder="Buscar custodio disponible…" value={fa.qCust} onChange={e => setFa({ ...fa, qCust: e.target.value })} style={sx(inputStyle + ';min-height:36px')} />
            <div style={sx('display:flex;flex-direction:column;max-height:200px;overflow:auto;border:1px solid #E4E8ED;border-radius:8px;padding:4px')}>
              {custodiosDisponibles.map(c => <label key={c.id} className="chk"><input type="checkbox" checked={false} onChange={() => setFa({ ...fa, custodios: toggle(fa.custodios, c.id) })} /><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{c.id}</span><span>{corto(c.nombre)}</span><span style={sx('color:#5F6B7A;font-size:12px;margin-left:auto')}>{c.zona} · ★ {c.calificacion.toFixed(1)}</span></label>)}
              {custodiosDisponibles.length === 0 && <span style={sx('padding:10px;font-size:13px;color:#5F6B7A')}>Sin custodios disponibles con ese texto. Prueba con otro nombre o zona.</span>}
            </div>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:6px')}>
            <span style={sx('font-size:12px;color:#5F6B7A')}>Unidades ({fa.unidades.length} elegidas · mínimo 1)</span>
            <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}>{fa.unidades.map(id => <span key={id} className="selpill"><span className="mono">{id}</span>{fa.unidades.length > 1 && <button type="button" aria-label={`Quitar ${id}`} onClick={() => setFa({ ...fa, unidades: fa.unidades.filter(x => x !== id) })}>×</button>}</span>)}</div>
            <input type="search" aria-label="Agregar otra unidad" placeholder="Agregar otra unidad (AU-…)" value={fa.qUni} onChange={e => setFa({ ...fa, qUni: e.target.value })} style={sx(inputStyle + ';min-height:36px')} />
            <div style={sx('display:flex;flex-direction:column;max-height:200px;overflow:auto;border:1px solid #E4E8ED;border-radius:8px;padding:4px')}>
              {unidadesCandidatas.map(f => <label key={f.u.id} className="chk"><input type="checkbox" checked={false} onChange={() => setFa({ ...fa, unidades: [...fa.unidades, f.u.id], qUni: '' })} /><span className="mono" style={sx('font-size:12px')}>{f.u.id}</span><span>{f.u.vehiculo}</span><span className={ST[f.estatus]} style={sx('margin-left:auto')}>{f.estatus}</span></label>)}
              {unidadesCandidatas.length === 0 && <span style={sx('padding:10px;font-size:13px;color:#5F6B7A')}>{fa.qUni ? 'Sin unidades disponibles u operando con ese texto.' : 'Escribe para buscar otra unidad disponible u operando.'}</span>}
            </div>
          </div>
        </div>
        <Field label="Notas (opcional)"><input value={fa.notas} onChange={e => setFa({ ...fa, notas: e.target.value })} placeholder="p. ej. Carga de alto valor, requiere custodio con portación" style={sx(inputStyle)} /></Field>
        <Nota>{(() => { const h = Math.round((new Date(fa.fin).getTime() - new Date(fa.inicio).getTime()) / 3_600_000); return isFinite(h) && h > 0 ? `Duración: ${h} h${h >= 24 ? ` (${Math.floor(h / 24)} día${Math.floor(h / 24) > 1 ? 's' : ''} ${h % 24} h)` : ''}.` : 'El fin debe ser después del inicio.' })()} La asignación aparece también en la agenda de cada custodio y en la ficha del cliente.</Nota>
      </Modal>

      <Modal open={mEstatus} onClose={() => setMEstatus(false)} title={`Cambiar estatus de ${ficha ?? ''}`} width={480} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMEstatus(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarEstatus}>Guardar estatus</button></>}>
        <Field label="Nuevo estatus"><select value={fe.estatus} onChange={e => setFe({ ...fe, estatus: e.target.value as EstatusUnidad })} style={sx(inputStyle)}>{ESTATUS_U.filter(s => s !== 'En taller').map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Motivo"><input value={fe.motivo} onChange={e => setFe({ ...fe, motivo: e.target.value })} placeholder={fe.estatus === 'Siniestrada' ? 'p. ej. Choque en la Méx–Qro, en aseguradora' : fe.estatus === 'Baja' ? 'p. ej. Fin de arrendamiento' : 'p. ej. Regresa de siniestro'} style={sx(inputStyle)} autoFocus /></Field>
        <Nota>Para "En taller" usa "Mandar a taller": así queda la orden con proveedor y costo. El cambio se guarda en el historial de la unidad.</Nota>
      </Modal>

      <Modal open={mImport} onClose={() => setMImport(false)} title="Importar cargas de tarjeta" width={520} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMImport(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={importar}>Importar</button></>}>
        <span style={sx('font-size:14px;color:#3E4A59')}>Sube el estado de cuenta de la tarjeta de combustible (CSV o XLSX). Cada carga se cruza con los km del GPS para detectar consumo anómalo.</span>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={sx('display:none')} onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
        <button type="button" style={sx(btnStyle + ';justify-content:flex-start')} onClick={() => fileRef.current?.click()}>{archivo ? `${archivo.name} · ${(archivo.size / 1024).toFixed(1)} KB` : 'Elegir archivo…'}</button>
        <Field label="Proveedor de tarjeta"><select defaultValue="Edenred" style={sx(inputStyle)}><option>Edenred</option><option>Sodexo</option><option>Toka</option><option>Si Vale</option></select></Field>
        <span style={sx('font-size:12px;color:#5F6B7A')}>{archivo ? 'Listo para importar.' : 'Sin archivo se importan las cargas de prueba del periodo (24 registros).'}</span>
      </Modal>
    </Shell>
  )
}
