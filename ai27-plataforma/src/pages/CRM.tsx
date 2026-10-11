import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { Nota, PageHeader, Section } from '../components/Page'
import { ROUTES } from '../lib/routes'
import { actions, useStore, type AsignacionNueva } from '../lib/store'
import { sx, fmtMXN } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { AUTOPARTES, clientesCRM, fmtM, incidentesDe, serviciosDe, todosLosClientes, type ClienteCRM } from '../data/crm'
import { asignacionesDeCliente, HOY_DEMO, type Asignacion } from '../data/asignaciones'
import { custodios as seedCustodios, unidades as seedUnidades, type TipoServicio } from '../data/seed'

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
.crm-row{cursor:pointer}.crm-row:hover td{background:#FAFBFC}
.crm-row.sel td{background:#F0F3FD}
button.pill{border:0;cursor:pointer;font-family:'Montserrat',sans-serif}
.crm-th{cursor:pointer;user-select:none}.crm-th:hover{color:#0D1D41}
.field select,.field input,.field textarea{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif;width:100%;box-sizing:border-box}
.cli{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:52px;padding:6px 12px;border-radius:8px;border:0;cursor:pointer;font:400 14px 'Montserrat',sans-serif;text-align:left;background:transparent;color:#0D1D41}
.cli:hover{background:#F3F5F8}
.cli[aria-pressed="true"]{background:#E9EDFB}
.kpi{background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px}
.chk{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;border:1px solid transparent}
.chk:hover{background:#F3F5F8}.chk[data-on="true"]{background:#E9EDFB;border-color:#C7D0F2}
.chk input{width:16px;height:16px;margin:0;min-height:0;accent-color:#475CC7}
.lista{display:flex;flex-direction:column;gap:2px;max-height:200px;overflow:auto;border:1px solid #E4E8ED;border-radius:8px;padding:4px}
/* Celular: las tablas de asignaciones y de clientes se muestran como tarjetas */
.crm-tarjeta{display:flex;flex-direction:column;gap:6px;width:100%;box-sizing:border-box;text-align:left;background:#FFFFFF;border:1px solid #E4E8ED;border-radius:8px;padding:10px 12px;font:400 14px 'Montserrat',sans-serif;color:#0D1D41}
button.crm-tarjeta{cursor:pointer}button.crm-tarjeta[aria-pressed="true"]{background:#F0F3FD;border-color:#C7D0F2}
`

/** Clientes de la lista lateral del diseño (en ese orden). */
const LATERAL = ['Alpura', 'Marsh', 'Farmacéutica Orión', 'Autopartes Saltillo', 'Electrónica del Bajío', 'Logística Pacífico Norte', 'Bebidas del Golfo']

type Actividad = { cliente: string; tipo: string; nota: string; fecha: string }
type SortKey = 'nombre' | 'modelo' | 'activos' | 'trimestre' | 'margen' | 'diasCobro' | 'ultimo'
/** Opciones del selector "Ordenar por" que sustituye a los encabezados de la tabla en celular. */
const ORDEN: [SortKey, string][] = [['trimestre', 'Facturado trimestre'], ['nombre', 'Cliente'], ['modelo', 'Tipo de servicio'], ['activos', 'Servicios activos'], ['margen', 'Margen'], ['diasCobro', 'Cobranza'], ['ultimo', 'Último servicio']]
/** Fila de la tabla de asignaciones: las derivadas de seed y las creadas por el usuario comparten los campos esenciales. */
type FilaAsg = Asignacion | AsignacionNueva

const TH = 'text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED'
const TH_R = TH + ';text-align:right'
const PILL_ON = 'background:#E9EDFB;color:#0D1D41'
const td = 'padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap'
/** Celdas de la tabla de asignaciones: más compactas y con salto de línea para caber a 1440 px. */
const tdA = 'padding:10px 8px;border-bottom:1px solid #EEF1F4;vertical-align:top;font-size:13px'
const hoy = () => new Date().toISOString().slice(0, 10)

/** "07 oct · 14:32" */
const fmtFH = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', '') + ' · ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}
/** Date → valor de <input type="datetime-local"> en hora local. */
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const pillEstatus = (e: FilaAsg['estatus']) => 'pill ' + (e === 'En curso' ? 'p-ok' : e === 'Programada' ? 'p-info' : e === 'Cancelada' ? 'p-bad' : 'p-mute')
const nombreCustodio = (id: string) => seedCustodios.find(c => c.id === id)?.nombre ?? 'Custodio'
const unidadDe = (id: string) => seedUnidades.find(u => u.id === id)

const defInicio = () => { const d = new Date(HOY_DEMO.getTime() + 86_400_000); d.setHours(8, 0, 0, 0); return d }
const formVacio = (ruta = '') => {
  const ini = defInicio()
  return { tipo: 'Por evento' as TipoServicio, servicio: '', ruta, custodios: [] as string[], unidades: [] as string[], inicio: toLocalInput(ini), fin: toLocalInput(new Date(ini.getTime() + 10 * 3_600_000)), notas: '' }
}

export default function CRM() {
  const toast = useToast()
  // Celular: las tablas de asignaciones y de "Todos los clientes" se muestran como tarjetas (misma información, sin scroll horizontal).
  const movil = useViewport() === 'movil'
  const nuevos = useStore(s => s.clientesNuevos ?? [])
  const asgStore = useStore(s => s.asignaciones ?? [])
  const overrides = useStore(s => s.estatusUnidades ?? [])
  const todos = useMemo(() => [...todosLosClientes(nuevos), AUTOPARTES], [nuevos])
  const tabla = useMemo(() => todosLosClientes(nuevos), [nuevos]) // los 25 de seed + altas
  const lateral = [...LATERAL.map(n => todos.find(c => c.nombre === n)!).filter(Boolean), ...nuevos.map(n => todos.find(c => c.nombre === n.nombre)!).filter(Boolean)]

  const [search] = useSearchParams()
  const [selName, setSelName] = useState(() => search.get('cliente') || 'Alpura')
  const [filtro, setFiltro] = useState<'todos' | 'portal' | 'vencidos'>('todos')
  const [busca, setBusca] = useState('')
  const [buscaLat, setBuscaLat] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: 'trimestre', d: -1 })
  const [desdeTabla, setDesdeTabla] = useState(false)
  const [verTodasAsg, setVerTodasAsg] = useState(false)
  const [acts, setActs] = useState<Actividad[]>([
    { cliente: 'Alpura', tipo: 'Llamada', nota: 'Confirmó 3 eventos nocturnos para la semana del 13 oct.', fecha: '2026-10-06' },
    { cliente: 'Marsh', tipo: 'Correo', nota: 'Enviada cotización COT-1182 Méx–SLP.', fecha: '2026-10-07' },
  ])
  // modales
  const [altaOpen, setAltaOpen] = useState(false)
  const [alta, setAlta] = useState({ nombre: '', sector: 'Alimentos y bebidas', contacto: '', correo: '', telefono: '', tipo: 'Por evento' as ClienteCRM['modelo'], tarifa: '' })
  const [actOpen, setActOpen] = useState(false)
  const [act, setAct] = useState({ tipo: 'Llamada', nota: '' })
  const [propOpen, setPropOpen] = useState(false)
  const [prop, setProp] = useState({ para: '', asunto: '', msg: '' })
  const [asgOpen, setAsgOpen] = useState(false)
  const [asg, setAsg] = useState(formVacio())
  const [qCust, setQCust] = useState('')
  const [qUni, setQUni] = useState('')

  const sel = todos.find(c => c.nombre === selName) ?? clientesCRM[0]
  const svSel = useMemo(() => serviciosDe(sel.nombre), [sel.nombre])
  const incSel = useMemo(() => incidentesDe(sel.nombre), [sel.nombre])
  const actsSel = acts.filter(a => a.cliente === sel.nombre)
  /** Asignaciones del cliente: las creadas en el demo primero, luego las derivadas de seed (más recientes arriba). */
  const asgSel = useMemo<FilaAsg[]>(() => {
    const desc = (a: FilaAsg, b: FilaAsg) => b.inicio.localeCompare(a.inicio)
    const propias = asgStore.filter(a => a.cliente === sel.nombre).sort(desc)
    return [...propias, ...asignacionesDeCliente(sel.nombre).sort(desc)]
  }, [asgStore, sel.nombre])
  const asgVista = verTodasAsg ? asgSel : asgSel.slice(0, 8)
  const custodiosActivos = new Set(asgSel.filter(a => a.estatus === 'En curso' || a.estatus === 'Programada').flatMap(a => a.custodios)).size
  const unidadesActivas = new Set(asgSel.filter(a => a.estatus === 'En curso' || a.estatus === 'Programada').flatMap(a => a.unidades)).size

  const vista = useRef<HTMLDivElement>(null)
  const pick = (name: string, scroll = true) => {
    if (!todos.some(c => c.nombre === name)) return
    setSelName(name)
    setVerTodasAsg(false)
    if (scroll) vista.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Lista lateral: los principales del diseño + altas; si se busca, cualquiera de los 25.
  const ql = buscaLat.trim().toLowerCase()
  const lateralView = ql ? todos.filter(c => c.nombre.toLowerCase().includes(ql) || c.sector.toLowerCase().includes(ql)) : lateral

  // Tabla: filtro + búsqueda + orden + paginación
  const q = busca.trim().toLowerCase()
  const rows = useMemo(() => {
    let r = tabla
    if (filtro === 'portal') r = r.filter(c => c.portal)
    if (filtro === 'vencidos') r = r.filter(c => c.cobranza !== 'Al corriente')
    if (q) r = r.filter(c => c.nombre.toLowerCase().includes(q) || c.modelo.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q))
    const ultimoN = (s: string) => s === 'hoy' ? 0 : s === 'ayer' ? 1 : s === 'continuo' ? -1 : s === '—' ? 999 : parseInt(s.replace(/\D/g, '')) || 0
    return [...r].sort((a, b) => {
      const k = sort.k
      const va = k === 'ultimo' ? ultimoN(a.ultimo) : a[k], vb = k === 'ultimo' ? ultimoN(b.ultimo) : b[k]
      return (typeof va === 'string' ? String(va).localeCompare(String(vb), 'es') : (va as number) - (vb as number)) * sort.d
    })
  }, [tabla, filtro, q, sort])
  const pg = usePagination(rows.length, 25)
  const toggleSort = (k: SortKey) => setSort(s => (s.k === k ? { k, d: s.d === 1 ? -1 : 1 } : { k, d: k === 'nombre' || k === 'modelo' ? 1 : -1 }))
  const arrow = (k: SortKey) => (sort.k === k ? (sort.d === 1 ? ' ▲' : ' ▼') : '')

  // Disponibles para asignar (estatus real de la unidad = override del demo ?? seed)
  const estatusUnidad = (id: string, seed: string) => overrides.find(o => o.unidad === id)?.estatus ?? seed
  const ocupados = useMemo(() => {
    const ini = new Date(asg.inicio).getTime(), fin = new Date(asg.fin).getTime()
    const todasAsg: FilaAsg[] = [...asgStore, ...asignacionesDeCliente(sel.nombre)]
    const c = new Set<string>(), u = new Set<string>()
    todasAsg.forEach(a => { if (a.estatus !== 'Cancelada' && new Date(a.inicio).getTime() < fin && new Date(a.fin).getTime() > ini) { a.custodios.forEach(x => c.add(x)); a.unidades.forEach(x => u.add(x)) } })
    return { c, u }
  }, [asg.inicio, asg.fin, asgStore, sel.nombre])
  const qc = qCust.trim().toLowerCase()
  const custDisp = seedCustodios.filter(c => c.estatus === 'Disponible' && !ocupados.c.has(c.id) && (!qc || c.nombre.toLowerCase().includes(qc) || c.id.toLowerCase().includes(qc) || c.zona.toLowerCase().includes(qc)))
  const qu = qUni.trim().toLowerCase()
  const uniDisp = seedUnidades.filter(u => estatusUnidad(u.id, u.estatus) === 'Disponible' && !ocupados.u.has(u.id) && (!qu || u.id.toLowerCase().includes(qu) || u.placas.toLowerCase().includes(qu) || u.vehiculo.toLowerCase().includes(qu) || u.zona.toLowerCase().includes(qu)))
  const toggleIn = (k: 'custodios' | 'unidades', id: string) => setAsg(f => ({ ...f, [k]: f[k].includes(id) ? f[k].filter(x => x !== id) : [...f[k], id] }))
  const horasForm = Math.max(0, Math.round((new Date(asg.fin).getTime() - new Date(asg.inicio).getTime()) / 3_600_000))

  // Acciones
  function abrirAsignar() {
    setAsg(formVacio(sel.rutas !== '—' ? sel.rutas.split(',')[0].trim() : ''))
    setQCust(''); setQUni('')
    setAsgOpen(true)
  }
  function guardarAsignacion() {
    if (asg.custodios.length === 0) { toast('Elige al menos un custodio', 'warn'); return }
    if (asg.unidades.length === 0) { toast('Elige al menos una unidad', 'warn'); return }
    if (!(new Date(asg.fin).getTime() > new Date(asg.inicio).getTime())) { toast('El fin debe ser después del inicio', 'warn'); return }
    const servicio = asg.servicio || `SRV-${24300 + asgStore.length}`
    actions.crearAsignacion({ cliente: sel.nombre, servicio, tipo: asg.tipo, ruta: asg.ruta.trim() || sel.rutas, custodios: asg.custodios, unidades: asg.unidades, inicio: new Date(asg.inicio).toISOString(), fin: new Date(asg.fin).toISOString(), notas: asg.notas.trim() || undefined })
    setAsgOpen(false)
    setVerTodasAsg(false)
    toast(`${asg.custodios.length} custodio${asg.custodios.length > 1 ? 's' : ''} y ${asg.unidades.length} unidad${asg.unidades.length > 1 ? 'es' : ''} asignados a ${sel.nombre} (${horasForm} h)`)
  }
  function guardarAlta() {
    if (!alta.nombre.trim()) { toast('Escribe el nombre del cliente', 'warn'); return }
    const nombre = alta.nombre.trim()
    actions.crearCliente({ ...alta, nombre, contacto: alta.contacto.trim() || 'Por asignar', correo: alta.correo.trim() || `logistica@${nombre.toLowerCase().replace(/[^a-z]/g, '')}.com.mx`, telefono: alta.telefono.trim() || '55 0000 0000' })
    setAltaOpen(false)
    setSelName(nombre)
    setDesdeTabla(true)
    setAlta({ nombre: '', sector: 'Alimentos y bebidas', contacto: '', correo: '', telefono: '', tipo: 'Por evento', tarifa: '' })
    toast(`Cliente ${nombre} dado de alta (${tabla.length + 1} clientes)`)
  }
  function guardarActividad() {
    if (!act.nota.trim()) { toast('Escribe una nota de la actividad', 'warn'); return }
    setActs(a => [{ cliente: sel.nombre, tipo: act.tipo, nota: act.nota.trim(), fecha: hoy() }, ...a])
    setActOpen(false)
    setAct({ tipo: 'Llamada', nota: '' })
    toast(`${act.tipo} registrada para ${sel.nombre}`)
  }
  function abrirPropuesta() {
    setProp({ para: sel.correo, asunto: `Propuesta de servicio AI27 · ${sel.nombre}`, msg: `Estimado/a ${sel.contacto.split(' · ').pop()}:\n\nAdjunto la propuesta de ${sel.modelo.toLowerCase()} con tarifa ${sel.tarifa}. Quedo atento a sus comentarios.\n\nAI27 · Comercial` })
    setPropOpen(true)
  }
  function enviarPropuesta() {
    setPropOpen(false)
    setActs(a => [{ cliente: sel.nombre, tipo: 'Correo', nota: `Propuesta enviada: ${prop.asunto}`, fecha: hoy() }, ...a])
    toast(`Propuesta enviada a ${sel.nombre} (${prop.para})`)
  }

  const portalCount = tabla.filter(c => c.portal).length
  const vencidosCount = tabla.filter(c => c.cobranza !== 'Al corriente').length

  // Contenido de las celdas de asignaciones (lo comparten la tabla de escritorio y las tarjetas de celular)
  const celCustodios = (a: FilaAsg) => (<>
    {a.custodios.length === 0 && <span style={sx('color:#5F6B7A')}>Sin custodio (monitoreo)</span>}
    {a.custodios.map(id => <div key={id}><Link to={ROUTES.Custodios} style={sx('text-decoration:none;color:#0D1D41;font-weight:500')}>{nombreCustodio(id)}</Link> <span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{id}</span></div>)}
  </>)
  const celUnidades = (a: FilaAsg) => (<>
    {a.unidades.length === 0 && <span style={sx('color:#5F6B7A')}>—</span>}
    {a.unidades.map(id => { const u = unidadDe(id); return <div key={id}><Link to={ROUTES.Flotilla} className="mono" style={sx('text-decoration:none;color:#0D1D41;font-size:13px')}>{id}</Link> <span style={sx('font-size:12px;color:#5F6B7A')}>{u ? `${u.vehiculo} · ${u.placas}` : ''}</span></div> })}
  </>)
  const pillsAsg = (a: FilaAsg) => (
    <div style={sx('display:flex;gap:6px;flex-wrap:wrap;align-items:center')}>
      <span className={pillEstatus(a.estatus)}>{a.estatus}</span>
      {'resultado' in a && a.resultado && a.resultado !== 'Sin novedad' && <span className={'pill ' + (a.resultado === 'Con incidente' ? 'p-bad' : 'p-warn')}>{a.resultado}</span>}
    </div>
  )
  const accionesAsg = (a: FilaAsg, propia: boolean) => propia && a.estatus !== 'Terminada' && a.estatus !== 'Cancelada' && (
    <div style={sx('display:flex;gap:6px;flex-wrap:wrap;margin-top:6px')}>
      {a.estatus === 'Programada' && <button type="button" className="btn btn-sm" style={sx('min-height:28px;padding:0 8px')} onClick={() => { actions.cambiarEstatusAsignacion(a.id, 'En curso'); toast(`Asignación ${a.id} en curso`) }}>Iniciar</button>}
      {a.estatus === 'En curso' && <button type="button" className="btn btn-sm" style={sx('min-height:28px;padding:0 8px')} onClick={() => { actions.cambiarEstatusAsignacion(a.id, 'Terminada'); toast(`Asignación ${a.id} terminada`) }}>Terminar</button>}
      {a.estatus === 'Programada' && <button type="button" className="btn btn-sm" style={sx('min-height:28px;padding:0 8px')} onClick={() => { actions.cambiarEstatusAsignacion(a.id, 'Cancelada'); toast(`Asignación ${a.id} cancelada`, 'info') }}>Cancelar</button>}
    </div>
  )

  return (
    <Shell active="crm" css={CSS}>
      <PageHeader seccion="Comercial" titulo="Clientes"
        descripcion={`A quién le damos servicio y cómo va cada cuenta: ${tabla.length} clientes activos. Elige un cliente para ver su ficha: contactos, contrato, custodios y unidades asignadas, servicios e incidentes.`}
        accion={{ label: 'Alta de cliente', onClick: () => setAltaOpen(true) }}
        secundarias={<>
          <Link className="btn" to={ROUTES.Oportunidades}>Ver oportunidades</Link>
          <Link className="btn" to={ROUTES.Cotizador + '?cliente=' + encodeURIComponent(sel.nombre)}>Cotizar a {sel.nombre}</Link>
        </>} />

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <nav aria-label="Clientes" className="card" style={sx('flex:1 1 260px;padding:10px;display:flex;flex-direction:column;gap:4px')}>
          <input type="search" value={buscaLat} onChange={e => setBuscaLat(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente en la lista" style={sx(inputStyle + ';min-height:38px;margin-bottom:4px')} />
          <span className="lbl" style={sx('padding:4px 12px')}>{ql ? `${lateralView.length} resultados` : 'Clientes principales · ingreso mensual'}</span>
          {lateralView.map(c => (
            <button key={c.nombre} type="button" className="cli" aria-pressed={c.nombre === sel.nombre} onClick={() => { pick(c.nombre, false); setDesdeTabla(false) }}>
              <span style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:2px')}><span style={sx('font-weight:500')}>{c.nombre}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{c.modelo}{c.nuevo ? ' · nuevo' : ''}</span></span>
              <span className="mono" style={sx('font-size:13px;color:#3E4A59')}>{c.nuevo ? '—' : fmtM(c.ingresosMes)}</span>
            </button>
          ))}
          {lateralView.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A;padding:8px 12px')}>Sin clientes con ese nombre. Prueba con otra palabra.</span>}
          {!ql && <Nota>Los demás clientes están en “Todos los clientes”, más abajo, o búscalos aquí arriba.</Nota>}
        </nav>

        <section ref={vista} aria-label="Ficha del cliente" style={sx('flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px')}>
          <div className="card" data-tour="cliente" style={sx('display:flex;flex-direction:column;gap:16px')}>
            <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start')}>
              <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Ficha del cliente</span><h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600")}>{sel.nombre}</h2><span style={sx('font-size:14px;color:#5F6B7A')}>{sel.modelo} · {sel.sector} · cliente desde {sel.desde}</span></div>
              <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
                <span className={sel.nuevo ? 'pill p-info' : sel.cobranza === 'Al corriente' ? 'pill p-ok' : 'pill p-warn'}>{sel.nuevo ? 'Alta reciente' : sel.cobranza === 'Al corriente' ? 'Contrato vigente · al corriente' : `Cobranza ${sel.cobranza}`}</span>
                <button type="button" className="btn btn-sm" onClick={() => setActOpen(true)}>Registrar llamada o visita</button>
                <button type="button" className="btn btn-sm" onClick={abrirPropuesta}>Enviar propuesta</button>
              </div>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr));gap:12px')}>
              <div className="kpi"><span className="lbl">Servicios activos</span><span className="k">{sel.activos}</span><span style={sx('font-size:12px;color:#5F6B7A')}>en curso hoy</span></div>
              <div className="kpi"><span className="lbl">Facturado trimestre</span><span className="k">{sel.trimestre ? fmtM(sel.trimestre) : '—'}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{sel.nuevo ? 'sin facturar aún' : fmtM(sel.ingresosMes) + ' al mes'}</span></div>
              <div className="kpi"><span className="lbl">Margen</span><span className="k" style={sx('color:' + (sel.margen < 28 ? '#9A5B00' : '#17784A'))}>{sel.margen}%</span><span style={sx('font-size:12px;color:#5F6B7A')}>{sel.margen < 28 ? 'bajo el objetivo de 28%' : 'sobre el objetivo de 28%'}</span></div>
              <div className="kpi"><span className="lbl">Incidentes</span><span className="k" style={sel.incidentes ? sx('color:#B42318') : undefined}>{sel.incidentes}</span><span style={sx('font-size:12px;color:#5F6B7A')}>en el trimestre</span></div>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:20px;font-size:14px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                <span className="lbl">Contactos</span>
                <span>{sel.contacto}</span>
                {sel.contacto2 && sel.contacto2 !== '—' && <span>{sel.contacto2}</span>}
                <span style={sx('color:#5F6B7A;font-size:13px')}><a href={'mailto:' + sel.correo}>{sel.correo}</a> · {sel.telefono}</span>
              </div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                <span className="lbl">Contrato</span>
                <span>{sel.modelo} · tarifa <span className="mono">{sel.tarifa}</span></span>
                <span style={sx('color:#5F6B7A;font-size:13px')}>Cobranza: {sel.cobranza}{sel.cxc ? ` · por cobrar ${fmtMXN(sel.cxc)}` : ''}{sel.portal ? ' · portal en vivo activo' : ''}</span>
              </div>
            </div>
            <Nota>Margen: lo que queda del ingreso después del costo directo (custodios, combustible, casetas). El objetivo de la empresa es 28%.</Nota>
          </div>

          <Section titulo="Custodios y unidades asignados" ayuda={`${custodiosActivos} custodio${custodiosActivos === 1 ? '' : 's'} y ${unidadesActivas} unidad${unidadesActivas === 1 ? '' : 'es'} en curso o programados para ${sel.nombre}. Cada asignación tiene un rango de fecha y hora.`}
            acciones={<button type="button" className="btn btn-sm" onClick={abrirAsignar}>Asignar custodios y unidades</button>} style="padding:20px 8px 12px">
            {movil ? (
              // Celular: una tarjeta por asignación con los mismos datos que la tabla
              <div style={sx('display:flex;flex-direction:column;gap:10px;padding:0 6px')}>
                {asgVista.map(a => (
                  <article key={a.id} className="crm-tarjeta" aria-label={`Asignación ${a.servicio}`} style={sx('font-size:13px')}>
                    <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start')}>
                      <span style={sx('min-width:0')}><span className="mono" style={sx('font-size:13px;color:#3E4A59')}>{a.servicio}</span><div style={sx('font-size:12px;color:#5F6B7A')}>{a.tipo} · {a.ruta}</div></span>
                      <span className="mono" style={sx('flex:none;font-size:13px')}>{a.horas ? `${a.horas} h` : '—'}</span>
                    </div>
                    <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;--sx-fijo:1')}>
                      <div><span className="lbl" style={sx('display:block;margin-bottom:2px')}>Custodio(s)</span>{celCustodios(a)}</div>
                      <div><span className="lbl" style={sx('display:block;margin-bottom:2px')}>Unidad(es)</span>{celUnidades(a)}</div>
                    </div>
                    <div className="mono" style={sx('font-size:13px;overflow-wrap:anywhere')}>{fmtFH(a.inicio)} <span style={sx('color:#5F6B7A')}>→ {fmtFH(a.fin)}</span></div>
                    {pillsAsg(a)}
                    {accionesAsg(a, asgStore.some(s => s.id === a.id))}
                  </article>
                ))}
                {asgSel.length === 0 && <span style={sx('padding:12px 6px;color:#5F6B7A;text-align:center;font-size:14px')}>Este cliente aún no tiene custodios ni unidades asignados. Usa “Asignar custodios y unidades”.</span>}
              </div>
            ) : (
            <div style={sx('overflow-x:auto')}>
              <table style={sx('width:100%;border-collapse:collapse;font-size:14px')}>
                <thead><tr>
                  <th style={sx(TH + ';padding:10px 8px')}>Custodio(s)</th>
                  <th style={sx(TH + ';padding:10px 8px')}>Unidad(es)</th>
                  <th style={sx(TH + ';padding:10px 8px')}>Servicio</th>
                  <th style={sx(TH + ';padding:10px 8px')}>Desde – hasta</th>
                  <th style={sx(TH_R + ';padding:10px 8px')}>Horas</th>
                  <th style={sx(TH + ';padding:10px 8px')}>Estatus</th>
                </tr></thead>
                <tbody>
                  {asgVista.map(a => {
                    const propia = asgStore.some(s => s.id === a.id)
                    return (
                      <tr key={a.id}>
                        <td style={sx(tdA + ';min-width:130px')}>{celCustodios(a)}</td>
                        <td style={sx(tdA + ';min-width:130px')}>{celUnidades(a)}</td>
                        <td style={sx(tdA + ';min-width:120px')}><span className="mono" style={sx('font-size:13px;color:#3E4A59')}>{a.servicio}</span><div style={sx('font-size:12px;color:#5F6B7A')}>{a.tipo} · {a.ruta}</div></td>
                        <td style={sx(tdA + ';white-space:nowrap')}><span className="mono" style={sx('font-size:13px')}>{fmtFH(a.inicio)}</span><div className="mono" style={sx('font-size:13px;color:#5F6B7A')}>→ {fmtFH(a.fin)}</div></td>
                        <td className="mono" style={sx(tdA + ';text-align:right;white-space:nowrap')}>{a.horas ? `${a.horas} h` : '—'}</td>
                        <td style={sx(tdA + ';min-width:120px')}>
                          {pillsAsg(a)}
                          {accionesAsg(a, propia)}
                        </td>
                      </tr>
                    )
                  })}
                  {asgSel.length === 0 && <tr><td colSpan={6} style={sx('padding:20px 12px;color:#5F6B7A;text-align:center')}>Este cliente aún no tiene custodios ni unidades asignados. Usa “Asignar custodios y unidades”.</td></tr>}
                </tbody>
              </table>
            </div>
            )}
            <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;padding:0 12px')}>
              <Nota>Una asignación une al cliente con uno o más custodios y una o más unidades por un tiempo (fecha y hora de inicio y fin). Haz clic en un custodio o unidad para ver su ficha.</Nota>
              {asgSel.length > 8 && <button type="button" className="btn btn-sm" onClick={() => setVerTodasAsg(v => !v)}>{verTodasAsg ? 'Ver menos' : `Ver las ${asgSel.length} asignaciones`}</button>}
            </div>
          </Section>

          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px')}>
            <Section titulo="Servicios recientes" ayuda={`${svSel.length} en el trimestre. Haz clic para ir a Servicios.`}>
              {svSel.length === 0 && <span style={sx('color:#5F6B7A;font-size:13px')}>Sin servicios registrados todavía.</span>}
              {svSel.slice(0, 5).map(s => (
                <Link key={s.id} to={ROUTES.Servicios} style={sx('display:flex;justify-content:space-between;gap:8px;text-decoration:none;color:#0D1D41;font-size:13px')}><span><span className="mono" style={sx('color:#3E4A59')}>{s.id}</span> · {s.ruta}</span><span className={'pill ' + (s.estatus === 'En tránsito' ? 'p-info' : s.estatus === 'Con incidente' ? 'p-bad' : s.estatus === 'Confirmado' ? 'p-warn' : 'p-mute')}>{s.estatus}</span></Link>
              ))}
            </Section>
            <Section titulo="Incidentes" ayuda={`${incSel.length} en el historial. Haz clic para ver el seguimiento.`}>
              {incSel.length === 0 && <span style={sx('color:#5F6B7A;font-size:13px')}>Sin incidentes en el trimestre.</span>}
              {incSel.slice(0, 5).map(i => (
                <Link key={i.id} to={ROUTES.Reaccion} style={sx('display:flex;justify-content:space-between;gap:8px;text-decoration:none;color:#0D1D41;font-size:13px')}><span><span className="mono" style={sx('color:#3E4A59')}>{i.id}</span> · {i.tipo} · {i.carretera}</span><span className={'pill ' + (i.resultado === 'Pérdida' ? 'p-bad' : i.resultado === 'Recuperación parcial' ? 'p-warn' : 'p-ok')}>{i.resultado}</span></Link>
              ))}
            </Section>
          </div>

          <Section titulo="Más detalle del cliente" ayuda="Rutas frecuentes, tarifa pactada, requisitos y actividad comercial." plegable abierto={false}>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:20px;font-size:14px')}>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Rutas frecuentes</span><span>{sel.rutas}</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Tarifa pactada</span><span className="mono">{sel.tarifa}</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Requisitos especiales</span><span>{sel.requisitos}</span></div>
            </div>
            <div style={sx('display:flex;flex-direction:column;gap:6px;font-size:13px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <span className="lbl">Actividad comercial · {actsSel.length}</span>
              {actsSel.length === 0 && <span style={sx('color:#5F6B7A')}>Sin actividad registrada. Usa “Registrar llamada o visita”.</span>}
              {actsSel.slice(0, 6).map((a, i) => (
                <span key={i}><span className="mono" style={sx('color:#3E4A59')}>{a.fecha}</span> · <b style={sx('font-weight:500')}>{a.tipo}</b>: {a.nota}</span>
              ))}
            </div>
          </Section>
        </section>
      </div>

      <Section titulo="Todos los clientes" ayuda={`Los ${tabla.length} clientes activos con su facturación, margen y cobranza. Haz clic en una fila para ver su ficha arriba.`} plegable abierto={false} style="padding:20px 8px 12px"
        acciones={<><input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente" style={sx(inputStyle + (movil ? ';width:100%' : ';width:180px') + ';min-height:34px')} />
          <button type="button" aria-pressed={filtro === 'todos'} className="pill p-mute" style={sx(filtro === 'todos' ? PILL_ON : '')} onClick={() => setFiltro('todos')}>{tabla.length} activos</button>
          <button type="button" aria-pressed={filtro === 'portal'} className="pill p-mute" style={sx(filtro === 'portal' ? PILL_ON : '')} onClick={() => setFiltro(f => (f === 'portal' ? 'todos' : 'portal'))}>{portalCount} con portal en vivo</button>
          <button type="button" aria-pressed={filtro === 'vencidos'} className="pill p-mute" style={sx(filtro === 'vencidos' ? PILL_ON : '')} onClick={() => setFiltro(f => (f === 'vencidos' ? 'todos' : 'vencidos'))}>{vencidosCount} con cobranza vencida</button>
          {movil && (
            // Celular: sin encabezados de tabla, el orden se elige aquí
            <div style={sx('display:flex;gap:6px;align-items:center;width:100%')}>
              <select aria-label="Ordenar por" value={sort.k} onChange={e => { const k = e.target.value as SortKey; setSort({ k, d: k === 'nombre' || k === 'modelo' ? 1 : -1 }) }} style={sx(inputStyle + ';flex:1;min-height:34px')}>{ORDEN.map(([k, label]) => <option key={k} value={k}>Ordenar por {label.toLowerCase()}</option>)}</select>
              <button type="button" className="btn btn-sm" aria-label={sort.d === 1 ? 'Orden ascendente; invertir' : 'Orden descendente; invertir'} onClick={() => setSort(s => ({ ...s, d: s.d === 1 ? -1 : 1 }))}>{sort.d === 1 ? '▲' : '▼'}</button>
            </div>
          )}</>}>
        {movil ? (
          // Celular: una tarjeta por cliente con los mismos datos que la fila
          <div style={sx('display:flex;flex-direction:column;gap:8px;padding:0 6px')}>
            {rows.slice(pg.from, pg.to).map(c => {
              const cls = c.cobranza === 'Al corriente' ? 'pill p-ok' : (parseInt(c.cobranza) > 60 ? 'pill p-bad' : 'pill p-warn')
              const bar = 'height:100%;width:' + Math.min(100, Math.round(c.margen / 45 * 100)) + '%;background:' + (c.margen < 28 ? '#3448A8' : '#2B9A66')
              return (
                <button key={c.nombre} type="button" className="crm-tarjeta" aria-pressed={desdeTabla && c.nombre === sel.nombre} onClick={() => { pick(c.nombre); setDesdeTabla(true) }} title="Ver ficha del cliente">
                  <span style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center')}><span style={sx('font-weight:500')}>{c.nombre}{c.nuevo ? <span className="pill p-info" style={sx('margin-left:8px')}>nuevo</span> : null}</span><span className="mono" style={sx('flex:none')}>{c.trimestre ? fmtM(c.trimestre) : '—'}</span></span>
                  <span style={sx('font-size:12px;color:#5F6B7A')}>{c.modelo} · {c.activos} servicio{c.activos === 1 ? '' : 's'} activo{c.activos === 1 ? '' : 's'} · último servicio: {c.ultimo}</span>
                  <span style={sx('display:flex;align-items:center;gap:8px')}><span style={sx('flex:1;height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden;display:block')}><span style={sx(bar + ';display:block')}></span></span><span className="mono" style={sx('font-size:13px')}>{c.margen + '%'}</span><span className={cls}>{c.cobranza}</span></span>
                </button>
              )
            })}
            {rows.length === 0 && <span style={sx('padding:12px 6px;color:#5F6B7A;text-align:center;font-size:14px')}>Ningún cliente coincide con el filtro. Prueba con otro nombre o quita el filtro.</span>}
          </div>
        ) : (
        <div style={sx('overflow-x:auto')}>
          <table style={sx('width:100%;border-collapse:collapse;font-size:14px')}>
            <thead><tr>
              <th className="crm-th" style={sx(TH)} onClick={() => toggleSort('nombre')}>Cliente{arrow('nombre')}</th>
              <th className="crm-th" style={sx(TH)} onClick={() => toggleSort('modelo')}>Tipo de servicio{arrow('modelo')}</th>
              <th className="crm-th" style={sx(TH_R)} onClick={() => toggleSort('activos')}>Servicios activos{arrow('activos')}</th>
              <th className="crm-th" style={sx(TH_R)} onClick={() => toggleSort('trimestre')}>Facturado trimestre{arrow('trimestre')}</th>
              <th className="crm-th" style={sx(TH + ';min-width:160px')} onClick={() => toggleSort('margen')}>Margen{arrow('margen')}</th>
              <th className="crm-th" style={sx(TH)} onClick={() => toggleSort('diasCobro')}>Cobranza{arrow('diasCobro')}</th>
              <th className="crm-th" style={sx(TH)} onClick={() => toggleSort('ultimo')}>Último servicio{arrow('ultimo')}</th>
            </tr></thead>
            <tbody>
              {rows.slice(pg.from, pg.to).map(c => {
                const cls = c.cobranza === 'Al corriente' ? 'pill p-ok' : (parseInt(c.cobranza) > 60 ? 'pill p-bad' : 'pill p-warn')
                const bar = 'height:100%;width:' + Math.min(100, Math.round(c.margen / 45 * 100)) + '%;background:' + (c.margen < 28 ? '#3448A8' : '#2B9A66')
                return (
                  <tr key={c.nombre} className={'crm-row' + (desdeTabla && c.nombre === sel.nombre ? ' sel' : '')} onClick={() => { pick(c.nombre); setDesdeTabla(true) }} title="Ver ficha del cliente">
                    <td style={sx(td + ';font-weight:500')}>{c.nombre}{c.nuevo ? <span className="pill p-info" style={sx('margin-left:8px')}>nuevo</span> : null}</td>
                    <td style={sx(td)}>{c.modelo}</td>
                    <td className="mono" style={sx(td + ';text-align:right')}>{c.activos}</td>
                    <td className="mono" style={sx(td + ';text-align:right')}>{c.trimestre ? fmtM(c.trimestre) : '—'}</td>
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4')}><div style={sx('display:flex;align-items:center;gap:8px')}><div style={sx('flex:1;height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx(bar)}></div></div><span className="mono" style={sx('font-size:13px')}>{c.margen + '%'}</span></div></td>
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4')}><span className={cls}>{c.cobranza}</span></td>
                    <td style={sx(td + ';color:#3E4A59')}>{c.ultimo}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={7} style={sx('padding:20px 12px;color:#5F6B7A;text-align:center')}>Ningún cliente coincide con el filtro. Prueba con otro nombre o quita el filtro.</td></tr>}
            </tbody>
          </table>
        </div>
        )}
        <div style={sx('padding:0 12px')}><Pager {...pg} /></div>
      </Section>

      <Modal open={asgOpen} onClose={() => setAsgOpen(false)} title={`Asignar custodios y unidades · ${sel.nombre}`} width={720}
        footer={<><span style={sx('flex:1;font-size:13px;color:#5F6B7A;align-self:center')}>{asg.custodios.length} custodio{asg.custodios.length === 1 ? '' : 's'} · {asg.unidades.length} unidad{asg.unidades.length === 1 ? '' : 'es'} · {horasForm} h</span><button type="button" style={sx(btnStyle)} onClick={() => setAsgOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarAsignacion}>Asignar</button></>}>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Tipo de servicio"><select style={sx(inputStyle)} value={asg.tipo} onChange={e => setAsg({ ...asg, tipo: e.target.value as TipoServicio })}>{['Por evento', 'Dedicado', 'Monitoreo'].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Servicio (folio)"><select style={sx(inputStyle)} value={asg.servicio} onChange={e => setAsg({ ...asg, servicio: e.target.value })}>
            <option value="">Servicio nuevo (folio automático)</option>
            {svSel.filter(s => s.estatus === 'Confirmado' || s.estatus === 'En tránsito' || s.estatus === 'Cotizado').slice(0, 12).map(s => <option key={s.id} value={s.id}>{s.id} · {s.ruta} · {s.estatus}</option>)}
          </select></Field>
        </div>
        <Field label="Ruta o tramo"><input style={sx(inputStyle)} value={asg.ruta} onChange={e => setAsg({ ...asg, ruta: e.target.value })} placeholder="Ej. Cuautitlán–Guadalajara" /></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Inicio (fecha y hora)"><input type="datetime-local" style={sx(inputStyle)} value={asg.inicio} onChange={e => setAsg({ ...asg, inicio: e.target.value })} /></Field>
          <Field label="Fin (fecha y hora)"><input type="datetime-local" style={sx(inputStyle)} value={asg.fin} onChange={e => setAsg({ ...asg, fin: e.target.value })} /></Field>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:14px')}>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <span className="lbl">Custodios disponibles · {custDisp.length}</span>
            <input type="search" style={sx(inputStyle + ';min-height:36px')} value={qCust} onChange={e => setQCust(e.target.value)} placeholder="Buscar por nombre, id o zona…" aria-label="Buscar custodio disponible" />
            <div className="lista" role="group" aria-label="Custodios disponibles">
              {custDisp.slice(0, 40).map(c => (
                <label key={c.id} className="chk" data-on={asg.custodios.includes(c.id)}>
                  <input type="checkbox" checked={asg.custodios.includes(c.id)} onChange={() => toggleIn('custodios', c.id)} />
                  <span style={sx('flex:1;display:flex;flex-direction:column')}><span style={sx('font-weight:500')}>{c.nombre}</span><span style={sx('font-size:12px;color:#5F6B7A')}><span className="mono">{c.id}</span> · {c.zona} · ★ {c.calificacion}</span></span>
                </label>
              ))}
              {custDisp.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A;padding:8px 10px')}>Sin custodios disponibles con ese filtro en ese horario.</span>}
            </div>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <span className="lbl">Unidades disponibles · {uniDisp.length}</span>
            <input type="search" style={sx(inputStyle + ';min-height:36px')} value={qUni} onChange={e => setQUni(e.target.value)} placeholder="Buscar por id, placas o vehículo…" aria-label="Buscar unidad disponible" />
            <div className="lista" role="group" aria-label="Unidades disponibles">
              {uniDisp.slice(0, 40).map(u => (
                <label key={u.id} className="chk" data-on={asg.unidades.includes(u.id)}>
                  <input type="checkbox" checked={asg.unidades.includes(u.id)} onChange={() => toggleIn('unidades', u.id)} />
                  <span style={sx('flex:1;display:flex;flex-direction:column')}><span style={sx('font-weight:500')}><span className="mono">{u.id}</span> · {u.vehiculo}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{u.placas} · {u.zona} · GPS {u.gps}</span></span>
                </label>
              ))}
              {uniDisp.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A;padding:8px 10px')}>Sin unidades disponibles con ese filtro en ese horario.</span>}
            </div>
          </div>
        </div>
        <Field label="Notas"><textarea rows={2} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={asg.notas} onChange={e => setAsg({ ...asg, notas: e.target.value })} placeholder="Requisitos del cliente, punto de encuentro, contacto en planta…" /></Field>
        <Nota>Solo se muestran custodios y unidades sin otra asignación en ese horario. La asignación aparece también en la ficha del custodio y de la unidad.</Nota>
      </Modal>

      <Modal open={altaOpen} onClose={() => setAltaOpen(false)} title="Alta de cliente" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setAltaOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarAlta}>Dar de alta</button></>}>
        <Field label="Nombre o razón social"><input style={sx(inputStyle)} value={alta.nombre} onChange={e => setAlta({ ...alta, nombre: e.target.value })} placeholder="Ej. Cementos del Centro" autoFocus /></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Sector"><select style={sx(inputStyle)} value={alta.sector} onChange={e => setAlta({ ...alta, sector: e.target.value })}>{['Alimentos y bebidas', 'Farmacéutica', 'Electrónica', 'Retail', 'Aseguradora', 'Textil', 'Química', 'Logística 3PL', 'Construcción', 'Automotriz'].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Tipo de servicio"><select style={sx(inputStyle)} value={alta.tipo} onChange={e => setAlta({ ...alta, tipo: e.target.value as ClienteCRM['modelo'] })}>{['Por evento', 'Dedicado', 'Monitoreo', 'Evento + monitoreo'].map(s => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Contacto principal"><input style={sx(inputStyle)} value={alta.contacto} onChange={e => setAlta({ ...alta, contacto: e.target.value })} placeholder="Nombre y puesto" /></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Correo"><input type="email" style={sx(inputStyle)} value={alta.correo} onChange={e => setAlta({ ...alta, correo: e.target.value })} placeholder="logistica@empresa.com.mx" /></Field>
          <Field label="Teléfono"><input style={sx(inputStyle)} value={alta.telefono} onChange={e => setAlta({ ...alta, telefono: e.target.value })} placeholder="55 0000 0000" /></Field>
        </div>
        <Field label="Tarifa pactada"><input style={sx(inputStyle)} value={alta.tarifa} onChange={e => setAlta({ ...alta, tarifa: e.target.value })} placeholder={alta.tipo === 'Dedicado' ? '$46,000/mes por custodio' : alta.tipo === 'Monitoreo' ? '$880/unidad/mes' : '$29.00/km'} /></Field>
        <Nota>El cliente nuevo aparece en la lista y en “Todos los clientes”; después puedes cotizarle o asignarle custodios y unidades desde su ficha.</Nota>
      </Modal>

      <Modal open={actOpen} onClose={() => setActOpen(false)} title={`Registrar llamada o visita · ${sel.nombre}`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setActOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarActividad}>Guardar</button></>}>
        <Field label="Tipo"><select style={sx(inputStyle)} value={act.tipo} onChange={e => setAct({ ...act, tipo: e.target.value })}>{['Llamada', 'Correo', 'Visita', 'Reunión', 'WhatsApp'].map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Nota"><textarea rows={4} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={act.nota} onChange={e => setAct({ ...act, nota: e.target.value })} placeholder="Qué se acordó y siguiente paso" autoFocus /></Field>
      </Modal>

      <Modal open={propOpen} onClose={() => setPropOpen(false)} title={`Enviar propuesta · ${sel.nombre}`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setPropOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={enviarPropuesta}>Enviar</button></>}>
        <Field label="Para"><input style={sx(inputStyle)} value={prop.para} onChange={e => setProp({ ...prop, para: e.target.value })} /></Field>
        <Field label="Asunto"><input style={sx(inputStyle)} value={prop.asunto} onChange={e => setProp({ ...prop, asunto: e.target.value })} /></Field>
        <Field label="Mensaje"><textarea rows={6} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={prop.msg} onChange={e => setProp({ ...prop, msg: e.target.value })} /></Field>
        <Nota>Adjunto: Propuesta_AI27_{sel.nombre.replace(/\s+/g, '_')}.pdf · tarifa {sel.tarifa} · facturación {fmtMXN(sel.ingresosMes)}/mes</Nota>
      </Modal>
    </Shell>
  )
}
