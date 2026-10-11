import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Nota, PageHeader, Pasos, Section } from '../components/Page'
import { Field, Modal, btnPriStyle, btnStyle, inputStyle, useToast } from '../components/ui'
import { ROUTES } from '../lib/routes'
import { actions, useStore } from '../lib/store'
import { sx, fmtMXN as fmt } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { clientes as seedClientes, servicios, ZONAS, type Zona } from '../data/seed'
import { CIUDADES, etiqueta, factorRiesgo, ruta as rutaDe, tiempoTexto, zonaDe } from '../data/rutas'
import type { CotizacionPayload } from './CotizacionPDF'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select,.field input,.field textarea{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif}
.field textarea{padding:10px 12px;resize:vertical}
.step{width:40px;height:40px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#0D1D41;font:600 18px 'Montserrat',sans-serif;cursor:pointer}
.tipo{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;padding:12px 14px;border-radius:10px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;cursor:pointer;font-family:inherit;min-width:0}
.tipo:hover{background:#F3F5F8}
.tipo[aria-selected=true]{background:#E9EDFB;border-color:#475CC7}
.tipo b{font-size:14px;font-weight:600}.tipo span{font-size:12px;color:#5F6B7A;line-height:1.4}
`

type Tab = 'evt' | 'ded' | 'mon'
const ON = 'background:#E9EDFB;border-color:#475CC7;color:#0D1D41'
const TABS: [Tab, string, string][] = [
  ['evt', 'Por evento', 'Un viaje con custodios y unidad; se cobra por servicio.'],
  ['ded', 'Custodio dedicado', 'Custodios fijos para el cliente; se cobra por mes.'],
  ['mon', 'Monitoreo como servicio', 'Rastreamos la flota del cliente desde el centro de control; se cobra por mes.'],
]
type Rates = [string, string[]][]
const RATES_INIT: Rates = [
  ['Centro', ['$3,200', '$2.10', '$24,500', '$620']],
  ['Bajío', ['$3,000', '$2.10', '$23,000', '$600']],
  ['Occidente', ['$3,000', '$2.20', '$23,000', '$600']],
  ['Noreste', ['$3,400', '$2.30', '$26,000', '$650']],
  ['Golfo', ['$2,900', '$2.20', '$22,500', '$590']],
]
/** Zonas sin renglón propio en la tabla usan la zona más cercana. */
const ZONA_TARIFA: Record<Zona, string> = { Centro: 'Centro', Bajío: 'Bajío', Occidente: 'Occidente', Noreste: 'Noreste', Golfo: 'Golfo', Sureste: 'Golfo', Noroeste: 'Noreste' }
const RATES_KEY = 'ai27-tarifas-v1'
const FOLIO = 'COT-1182'
/** Encabezados de la tabla de tarifas (en celular se usan como etiqueta de cada campo). */
const TARIFA_COLS = ['Custodio / jornada', 'Unidad / km', 'Dedicado / mes', 'Monitoreo / unidad']
const TARIFA_INPUT = 'width:100%;min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 10px;font-size:14px;box-sizing:border-box'

function cargarTarifas(): Rates {
  try {
    const raw = localStorage.getItem(RATES_KEY)
    if (raw) { const r = JSON.parse(raw); if (Array.isArray(r) && r.length === RATES_INIT.length) return r }
  } catch { /* sin storage */ }
  return RATES_INIT
}

/** "$3,200" → 3200; si no es número válido, usa el respaldo. */
function num(s: string, fallback: number) {
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : fallback
}
const money = (n: number) => '$' + n.toLocaleString('es-MX')
const corto = (s: string) => s.split(',')[0].trim()

export default function Cotizador() {
  const navigate = useNavigate()
  const toast = useToast()
  // Tablet y celular: la tarjeta de precio ocupa todo el ancho y se pega debajo de la barra superior de Shell; en celular las tarifas van por zona.
  const modo = useViewport()
  const compacto = modo !== 'escritorio'
  const movil = modo === 'movil'
  const [search] = useSearchParams()
  const nuevos = useStore(s => s.clientesNuevos ?? [])
  // Clientes de seed + los dados de alta en CRM (store)
  const clientes = useMemo(() => [...seedClientes.map(c => ({ nombre: c.nombre, contacto: c.contacto, correo: c.correo, telefono: c.telefono, margen: c.margen })), ...nuevos.map(n => ({ nombre: n.nombre, contacto: n.contacto, correo: n.correo, telefono: n.telefono, margen: 30 }))], [nuevos])
  const [tab, setTab] = useState<Tab>('evt')
  const [cliente, setCliente] = useState(() => (clientes.some(c => c.nombre === search.get('cliente')) ? search.get('cliente')! : 'Marsh'))
  const [c, setC] = useState(2)
  const [u, setU] = useState(1)
  const [night, setNight] = useState(true)
  const [origen, setOrigen] = useState('Tepotzotlán, Edomex')
  const [destino, setDestino] = useState('San Luis Potosí, SLP')
  // Dedicado
  const [perfil, setPerfil] = useState('Custodio armado · carga alto valor')
  const [nDed, setNDed] = useState('3')
  const [plazo, setPlazo] = useState('12 meses')
  const [unidadDed, setUnidadDed] = useState('Con unidad AI27')
  // Monitoreo
  const [nMon, setNMon] = useState('40')
  const [horarioMon, setHorarioMon] = useState('24/7')
  const [sla, setSla] = useState('5 minutos')
  const [fuente, setFuente] = useState('Ruptela')
  // Formato y tarifas
  const [formato, setFormato] = useState('Estándar AI27 (carta)')
  const [rates, setRates] = useState<Rates>(cargarTarifas)
  const [ratesDirty, setRatesDirty] = useState(false)
  const [enviada, setEnviada] = useState(false)
  // Correo
  const [mailOpen, setMailOpen] = useState(false)
  const [mailPara, setMailPara] = useState('')
  const [mailCc, setMailCc] = useState('comercial@ai27.com')
  const [mailAsunto, setMailAsunto] = useState('')
  const [mailMsg, setMailMsg] = useState('')

  const cli = clientes.find(x => x.nombre === cliente) ?? clientes[1]
  const svCliente = useMemo(() => servicios.filter(s => s.cliente === cliente), [cliente])
  useEffect(() => { setEnviada(false) }, [cliente, tab])

  // Ruta y zona tarifaria según el origen
  const rt = rutaDe(origen, destino)
  const zona = zonaDe(origen)
  const zonaTarifa = ZONA_TARIFA[zona]
  const zi = Math.max(0, rates.findIndex(r => r[0] === zonaTarifa))
  const tarifa = rates[zi][1]
  const rCust = num(tarifa[0], 3200)
  const rKm = num(tarifa[1], 2.1)
  const rDed = num(tarifa[2], 24500)
  const rMon = num(tarifa[3], 620)
  const KM = rt.km

  let lines: [string, number][]
  let priceLbl = 'Precio sugerido'
  const risk = factorRiesgo(rt.riesgo, night)
  let parts = { cust: 0, unit: 0, fuel: 0, cas: 0, via: 0 }
  if (tab === 'evt') {
    const cust = c * rCust * risk, unit = u * KM * rKm, fuel = u * Math.round(KM / 9.8 * 24.2), cas = u * rt.costoCasetas, via = c * 650
    parts = { cust, unit, fuel, cas, via }
    lines = [['Custodios (' + c + ' × riesgo ' + risk + ')', cust], ['Unidades de custodia', unit], ['Combustible estimado', fuel], ['Casetas', cas], ['Viáticos', via]]
  } else if (tab === 'ded') {
    const n = Math.max(1, Math.round(num(nDed, 3)))
    const conUnidad = unidadDed === 'Con unidad AI27'
    lines = [[n + ' custodios × ' + money(rDed), n * rDed]]
    if (conUnidad) lines.push(['Unidad AI27 (renta + seguro)', 18900], ['Combustible estimado', 21600])
    lines.push(['Supervisión y monitoreo', 6000])
    priceLbl = 'Tarifa mensual'
  } else {
    const n = Math.max(1, Math.round(num(nMon, 40)))
    lines = [[n + ' unidades × ' + money(rMon), n * rMon], ['Monitorista dedicado (proporcional)', 9800], ['Plataforma y conectores', 3200]]
    priceLbl = 'Tarifa mensual'
  }
  const cost = lines.reduce((a, l) => a + l[1], 0)
  const price = cost / 0.65

  const tipo = tab === 'evt' ? 'Por evento' : tab === 'ded' ? 'Dedicado' : 'Monitoreo'
  const rutaTxt = tab === 'evt' ? corto(origen) + ' → ' + corto(destino) : tab === 'ded' ? 'Dedicado · ' + plazo : 'Monitoreo · ' + nMon + ' unidades'

  // Texto de la IA: el del diseño para Marsh; para los demás clientes, a partir de su historial en seed
  const ia = useMemo(() => {
    if (cliente === 'Marsh' && tab === 'evt') return { txt: 'Marsh aceptó 9 de 11 cotizaciones Méx–SLP nocturnas entre $19K y $23K; este precio cae en ese rango.', prob: 78 }
    const n = Math.max(3, svCliente.length), ok = Math.max(2, Math.round(n * (0.55 + (cli.margen % 7) / 20)))
    const lo = Math.round(price * 0.88 / 1000), hi = Math.round(price * 1.08 / 1000)
    const prob = Math.min(92, Math.round(ok / n * 100) - 4)
    return { txt: `${cliente} aceptó ${ok} de ${n} cotizaciones de ${tipo.toLowerCase()} entre $${lo}K y $${hi}K; este precio cae en ese rango.`, prob }
  }, [cliente, tab, svCliente.length, cli.margen, price, tipo])

  function payload(): CotizacionPayload {
    const subtotal = Math.round(price)
    const base = { folio: FOLIO, cliente: cli.nombre, contacto: cli.contacto, correo: cli.correo, telefono: cli.telefono, formato }
    if (tab === 'evt') {
      const custAmt = Math.round((parts.cust + parts.via) / 0.65)
      const unitAmt = Math.round((parts.unit + parts.fuel) / 0.65)
      return {
        ...base,
        modelo: 'Custodia por evento',
        info: [
          ['Ruta', corto(origen) + ' → ' + corto(destino)],
          ['Distancia y tiempo', KM + ' km · ' + tiempoTexto(rt.minutos)],
          ['Salida', night ? '8 oct 2026 · 22:00' : '8 oct 2026 · 08:00'],
          ['Nivel de riesgo', rt.riesgo + (night ? ' · horario nocturno' : ' · horario diurno')],
        ],
        items: [
          { t: 'Custodios armados certificados', s: (night ? 'Turno nocturno' : 'Turno diurno') + ', portación vigente y evaluación de confianza', q: c, v: custAmt },
          { t: 'Unidad de custodia con GPS', s: 'Incluye combustible del trayecto', q: u, v: unitAmt },
          { t: 'Casetas de peaje', s: rt.casetas * u + ' casetas en ruta', q: 1, v: subtotal - custAmt - unitAmt },
          { t: 'Monitoreo 24/7 desde centro de control', s: 'Seguimiento en vivo, alertas y protocolo de reacción', q: 1, v: null },
        ],
        subtotal,
      }
    }
    let acc = 0
    const items = lines.map(([k, v], i) => {
      const amt = i === lines.length - 1 ? subtotal - acc : Math.round(v / 0.65)
      acc += amt
      return { t: k, s: tab === 'ded' ? perfil + ' · ' + plazo : 'Horario ' + horarioMon + ' · SLA ' + sla, q: 1, v: amt }
    })
    const info: [string, string][] = tab === 'ded'
      ? [['Perfil', perfil], ['Custodios', String(Math.max(1, Math.round(num(nDed, 3))))], ['Plazo', plazo], ['Unidad', unidadDed]]
      : [['Unidades', String(Math.max(1, Math.round(num(nMon, 40))))], ['Horario', horarioMon], ['SLA de respuesta', sla], ['Fuente de rastreo', fuente]]
    return { ...base, modelo: tab === 'ded' ? 'Custodio dedicado · mensual' : 'Monitoreo como servicio · mensual', info, items, subtotal }
  }

  function generarPDF() {
    const p = payload()
    navigate(ROUTES.CotizacionPDF + '?d=' + encodeURIComponent(JSON.stringify(p)), { state: p })
  }

  function abrirCorreo() {
    setMailPara(cli.correo)
    setMailAsunto(`Cotización ${FOLIO} · ${tipo} · ${rutaTxt}`)
    setMailMsg(`Estimado/a ${cli.contacto}:\n\nAdjunto la cotización ${FOLIO} para ${tipo.toLowerCase()} (${rutaTxt}) por ${fmt(price)} MXN antes de IVA, vigente 15 días naturales.\n\nQuedo atento a sus comentarios.\n\nAI27 · Comercial`)
    setMailOpen(true)
  }
  function enviarCorreo() {
    setMailOpen(false)
    setEnviada(true)
    toast(`Cotización ${FOLIO} enviada a ${cli.nombre} por correo (${mailPara})`)
  }

  function aceptar() {
    const id = actions.crearServicio({ cliente: cli.nombre, tipo, ruta: rutaTxt, precio: Math.round(price) })
    toast(`Cotización aceptada: servicio ${id} creado para ${cli.nombre}. Ahora asigna custodios.`)
    navigate(ROUTES.AsignacionIA)
  }

  function setRate(zi: number, vi: number, val: string) {
    setRates(rs => rs.map((r, i) => (i === zi ? [r[0], r[1].map((x, j) => (j === vi ? val : x))] : r)))
    setRatesDirty(true)
  }
  function guardarTarifas() {
    try { localStorage.setItem(RATES_KEY, JSON.stringify(rates)) } catch { /* ignorar */ }
    setRatesDirty(false)
    toast('Tarifas base guardadas para las ' + rates.length + ' zonas')
  }
  function restaurarTarifas() {
    setRates(RATES_INIT)
    try { localStorage.removeItem(RATES_KEY) } catch { /* ignorar */ }
    setRatesDirty(false)
    toast('Tarifas restauradas a la lista base', 'info')
  }

  const riskPill = rt.riesgo === 'Alto' ? (night ? 'pill p-bad' : 'pill p-warn') : rt.riesgo === 'Medio' ? 'pill p-warn' : 'pill p-ok'
  const box = 'background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px'
  const grid = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:14px'
  const bloque = 'padding:16px 18px;gap:12px'

  return (
    <Shell active="cotizador" css={CSS}>
      <PageHeader
        seccion={`Comercial · ${FOLIO}`}
        titulo="Cotizaciones"
        descripcion="Arma el precio de un servicio de custodia en tres pasos y, cuando el cliente acepte, conviértelo en servicio con un clic."
      >
        <Pasos actual={1} />
      </PageHeader>

      {/* Sugerencia de la IA: una sola tarjeta corta */}
      <section aria-label="Sugerencia de la IA" style={sx('display:flex;flex-wrap:wrap;gap:14px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:12px;padding:12px 18px')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:2px;min-width:0')}>
          <span style={sx('font-weight:600;font-size:14px')}>La IA sugiere mantener este precio: {ia.prob}% de probabilidad de que {cli.nombre} lo acepte.</span>
          <span style={sx('font-size:13px;color:#3E4A59')}>{ia.txt}</span>
        </div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:2px')}>
          <svg width="180" height="44" viewBox="0 0 220 64" role="img" aria-label={`Precios aceptados por ${cli.nombre}; precio actual ${fmt(price)}`} style={sx('display:block')}><g fill="#B9C4EE"><rect x="4" y="40" width="16" height="20" rx="2"></rect><rect x="28" y="28" width="16" height="32" rx="2"></rect><rect x="52" y="14" width="16" height="46" rx="2"></rect><rect x="76" y="6" width="16" height="54" rx="2"></rect><rect x="100" y="20" width="16" height="40" rx="2"></rect><rect x="124" y="36" width="16" height="24" rx="2"></rect><rect x="148" y="48" width="16" height="12" rx="2"></rect></g><path d="M92 2V62" stroke="#3448A8" strokeWidth="2" strokeDasharray="4 3"></path><text x="98" y="10" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#0D1D41">${(price / 1000).toFixed(1)}K</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Cotizaciones aceptadas por rango de precio</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsistenteIA} style={sx('min-height:34px;font-size:13px')}>Preguntarle a la IA</Link>
      </section>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        {/* Izquierda: formulario en 3 bloques */}
        <div style={sx('flex:999 1 460px;min-width:0;display:flex;flex-direction:column;gap:14px')}>
          <Section titulo="1 · Cliente y tipo de servicio" ayuda="Para quién es y qué le vamos a vender." style={bloque}>
            <div style={sx(grid)}>
              <label className="field">Cliente
                <select value={cliente} onChange={e => setCliente(e.target.value)}>
                  {clientes.map(x => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </select>
              </label>
              <div className="field">Contacto<span style={sx("min-height:40px;display:flex;align-items:center;font-size:14px;color:#0D1D41" + (movil ? ';overflow-wrap:anywhere' : ''))}>{cli.contacto} · {cli.correo}</span></div>
            </div>
            <div role="tablist" aria-label="Tipo de servicio" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:10px')}>
              {TABS.map(([k, label, desc]) => (
                <button key={k} type="button" role="tab" aria-selected={k === tab} className="tipo" onClick={() => setTab(k)}><b>{label}</b><span>{desc}</span></button>
              ))}
            </div>
          </Section>

          <Section tour="precio" titulo="2 · Ruta y condiciones" ayuda={tab === 'evt' ? 'De dónde a dónde y en qué horario. La ruta define distancia, casetas y riesgo.' : tab === 'ded' ? 'Dónde opera el equipo y por cuánto tiempo.' : 'Cómo y cuándo monitoreamos la flota del cliente.'} style={bloque}>
            {tab === 'evt' && (
              <>
                <div style={sx(grid)}>
                  <label className="field">Origen<select value={origen} onChange={e => setOrigen(e.target.value)}>{CIUDADES.map(x => <option key={x.nombre}>{etiqueta(x)}</option>)}</select></label>
                  <label className="field">Destino<select value={destino} onChange={e => setDestino(e.target.value)}>{CIUDADES.map(x => <option key={x.nombre}>{etiqueta(x)}</option>)}</select></label>
                  <div className="field">Horario de salida
                    <div style={sx('display:flex;gap:8px')}><button type="button" className="btn" style={sx(night ? '' : ON)} onClick={() => setNight(false)}>Diurno</button><button type="button" className="btn" style={sx(night ? ON : '')} onClick={() => setNight(true)}>Nocturno</button></div>
                  </div>
                </div>
                <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr));gap:12px')}>
                  <div style={sx(box)}><span className="lbl">Distancia</span><span className="mono" style={sx('font-size:18px')}>{KM} km</span></div>
                  <div style={sx(box)}><span className="lbl">Tiempo</span><span className="mono" style={sx('font-size:18px')}>{tiempoTexto(rt.minutos)}</span></div>
                  <div style={sx(box)}><span className="lbl">Casetas</span><span className="mono" style={sx('font-size:18px')}>{rt.casetas}</span></div>
                  <div style={sx(box)}><span className="lbl">Riesgo</span><span className={riskPill} style={sx('align-self:flex-start')}>{rt.riesgo} · {risk}</span></div>
                </div>
                <Nota>Riesgo {risk}: el tramo {rt.tramo} multiplica el costo de los custodios por {risk} según su historial de incidentes{night ? ' (de noche sube)' : ''}. Tarifas de la zona {zonaTarifa}{zonaTarifa !== zona ? ` (aplican a ${zona})` : ''}.</Nota>
              </>
            )}
            {tab === 'ded' && (
              <div style={sx(grid)}>
                <label className="field">Base de operación<select value={origen} onChange={e => setOrigen(e.target.value)}>{CIUDADES.map(x => <option key={x.nombre}>{etiqueta(x)}</option>)}</select></label>
                <label className="field">Plazo<select value={plazo} onChange={e => setPlazo(e.target.value)}><option>12 meses</option><option>Indefinido</option><option>6 meses</option></select></label>
                <label className="field">Perfil<select value={perfil} onChange={e => setPerfil(e.target.value)}><option>Custodio armado · carga alto valor</option><option>Custodio no armado</option></select></label>
              </div>
            )}
            {tab === 'mon' && (
              <div style={sx(grid)}>
                <label className="field">Horario<select value={horarioMon} onChange={e => setHorarioMon(e.target.value)}><option>24/7</option><option>Lunes a sábado 6–22</option></select></label>
                <label className="field">SLA de respuesta<select value={sla} onChange={e => setSla(e.target.value)}><option>5 minutos</option><option>10 minutos</option></select></label>
                <label className="field">Fuente de rastreo del cliente<select value={fuente} onChange={e => setFuente(e.target.value)}><option>Ruptela</option><option>Samsara</option></select></label>
              </div>
            )}
            {tab === 'mon' && <Nota>SLA de respuesta: el tiempo máximo en que un monitorista reacciona a una alerta de la flota del cliente.</Nota>}
          </Section>

          <Section titulo="3 · Custodios y unidades" ayuda={tab === 'evt' ? 'Cuánta gente y cuántos vehículos van en el viaje.' : tab === 'ded' ? 'Cuántos custodios fijos y si van con unidad de AI27.' : 'Cuántos vehículos del cliente vamos a vigilar.'} style={bloque}>
            {tab === 'evt' && (
              <div style={sx('display:flex;flex-wrap:wrap;gap:28px')}>
                <div style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Custodios</span>
                  <div style={sx('display:flex;align-items:center;gap:10px')}><button type="button" className="step" aria-label="Quitar custodio" onClick={() => setC(Math.max(1, c - 1))}>−</button><span className="mono" style={sx('font-size:20px;min-width:24px;text-align:center')}>{c}</span><button type="button" className="step" aria-label="Agregar custodio" onClick={() => setC(Math.min(6, c + 1))}>+</button></div>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Unidades de custodia</span>
                  <div style={sx('display:flex;align-items:center;gap:10px')}><button type="button" className="step" aria-label="Quitar unidad" onClick={() => setU(Math.max(1, u - 1))}>−</button><span className="mono" style={sx('font-size:20px;min-width:24px;text-align:center')}>{u}</span><button type="button" className="step" aria-label="Agregar unidad" onClick={() => setU(Math.min(4, u + 1))}>+</button></div>
                </div>
                <Nota>Para carga de alto valor en ruta nocturna se recomiendan 2 custodios por unidad.</Nota>
              </div>
            )}
            {tab === 'ded' && (
              <div style={sx(grid)}>
                <label className="field">Número de custodios<input type="text" value={nDed} onChange={e => setNDed(e.target.value)} /></label>
                <label className="field">Unidad<select value={unidadDed} onChange={e => setUnidadDed(e.target.value)}><option>Con unidad AI27</option><option>Sin unidad</option></select></label>
              </div>
            )}
            {tab === 'mon' && (
              <div style={sx(grid)}>
                <label className="field">Unidades a monitorear<input type="text" value={nMon} onChange={e => setNMon(e.target.value)} /></label>
              </div>
            )}
          </Section>
        </div>

        {/* Derecha: precio y acciones */}
        <aside className="card" aria-label="Precio" style={sx('flex:1 1 320px;max-width:' + (compacto ? 'none' : '420px') + ';display:flex;flex-direction:column;gap:12px;border-color:#C7D0F2;position:sticky;top:' + (compacto ? '73px' : '20px'))}>
          <div style={sx('display:flex;flex-direction:column;gap:2px')}>
            <span className="lbl">{priceLbl} · {tipo}</span>
            <span style={sx("font-family:'Montserrat',sans-serif;font-size:40px;font-weight:700;color:#0D1D41;letter-spacing:-.01em")}>{fmt(price)}</span>
            <span style={sx('font-size:13px;color:#5F6B7A')}>MXN antes de IVA · {cli.nombre} · {rutaTxt}</span>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <button type="button" className="btn btn-pri" onClick={aceptar} style={sx('min-height:44px;font-size:15px')}>Aceptada → asignar custodios</button>
            <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
              <button type="button" className="btn" onClick={generarPDF}>Ver PDF</button>
              <button type="button" className="btn" onClick={abrirCorreo}>{enviada ? 'Enviada ✓' : 'Enviar por correo'}</button>
            </div>
            <label className="field">Formato del PDF<select value={formato} onChange={e => setFormato(e.target.value)}><option>Estándar AI27 (carta)</option><option>Corporativo con anexo de protocolos</option><option>Resumido para correo</option></select></label>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:0;padding-top:8px;border-top:1px solid #E4E8ED')}>
            <span className="lbl" style={sx('padding-bottom:6px')}>Cómo se llega al precio</span>
            {lines.map(([k, v]) => (
              <div key={k} style={sx('display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:6px 0;border-top:1px solid #EEF1F4')}><span>{k}</span><span className="mono">{fmt(v)}</span></div>
            ))}
            <div style={sx('display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#3E4A59;padding:6px 0;border-top:1px solid #EEF1F4')}><span>Costo total</span><span className="mono">{fmt(cost)}</span></div>
            <div style={sx('display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#3E4A59;padding:6px 0')}><span>Margen objetivo 35%</span><span className="mono">{fmt(price - cost)}</span></div>
          </div>
          <Nota>Margen objetivo: el precio se calcula para que el 35% quede como utilidad después de cubrir el costo.</Nota>
        </aside>
      </div>

      <Section titulo="Tarifas base por zona" ayuda="Lo que cuesta cada recurso en cada zona. Editables; un cliente puede tener tarifa pactada distinta." plegable abierto={false}
        acciones={<><button type="button" className="btn" style={sx('min-height:34px;font-size:13px')} onClick={restaurarTarifas}>Restaurar</button><button type="button" className="btn" style={sx('min-height:34px;font-size:13px' + (ratesDirty ? ';border-color:#475CC7;color:#3448A8' : ''))} onClick={guardarTarifas}>Guardar tarifas{ratesDirty ? ' ●' : ''}</button></>}>
        {movil ? (
          /* Celular: un bloque por zona con sus 4 tarifas etiquetadas (la rejilla de 5 columnas no cabe) */
          <div style={sx('display:flex;flex-direction:column;gap:12px')}>
            {rates.map(([z, vs], i) => (
              <div key={z} style={sx('display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid #E4E8ED;border-radius:10px;font-size:14px')}>
                <span style={sx(i === zi ? 'font-weight:600;color:#0D1D41' : '')}>{z}{i === zi ? ' ●' : ''}</span>
                <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;--sx-fijo:1')}>
                  {vs.map((v, vi) => (
                    <label key={z + vi} style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}><span className="lbl" style={sx('font-size:11px')}>{TARIFA_COLS[vi]}</span><input type="text" value={v} onChange={e => setRate(i, vi, e.target.value)} className="mono" aria-label={`Tarifa ${z} · ${TARIFA_COLS[vi]}`} style={sx(TARIFA_INPUT)} /></label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:140px repeat(4,minmax(120px,1fr));gap:8px;min-width:640px;align-items:center;font-size:14px')}>
            <span className="lbl">Zona</span>{TARIFA_COLS.map(c => <span key={c} className="lbl">{c}</span>)}
            {rates.map(([z, vs], i) => [
              <span key={z} style={sx(i === zi ? 'font-weight:600;color:#0D1D41' : '')}>{z}{i === zi ? ' ●' : ''}</span>,
              ...vs.map((v, vi) => (
                <label key={z + vi} style={sx('display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Tarifa {z}</span><input type="text" value={v} onChange={e => setRate(i, vi, e.target.value)} className="mono" style={sx(TARIFA_INPUT)} /></label>
              )),
            ])}
          </div>
        </div>
        )}
        <Nota>● zona que alimenta el cálculo actual (según el origen). Zonas {ZONAS.filter(z => !rates.some(r => r[0] === z)).join(' y ')} usan la zona vecina.</Nota>
      </Section>

      <Modal open={mailOpen} onClose={() => setMailOpen(false)} title={`Enviar cotización ${FOLIO} por correo`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMailOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={enviarCorreo}>Enviar correo</button></>}>
        <Field label="Para"><input style={sx(inputStyle)} value={mailPara} onChange={e => setMailPara(e.target.value)} /></Field>
        <Field label="CC"><input style={sx(inputStyle)} value={mailCc} onChange={e => setMailCc(e.target.value)} /></Field>
        <Field label="Asunto"><input style={sx(inputStyle)} value={mailAsunto} onChange={e => setMailAsunto(e.target.value)} /></Field>
        <Field label="Mensaje"><textarea rows={7} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={mailMsg} onChange={e => setMailMsg(e.target.value)} /></Field>
        <span style={sx('font-size:13px;color:#5F6B7A')}>Adjunto: {FOLIO}.pdf · {formato} · {fmt(price)} MXN + IVA</span>
      </Modal>
    </Shell>
  )
}
