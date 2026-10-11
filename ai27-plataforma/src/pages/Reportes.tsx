import { useRef, useState } from 'react'
import { Shell } from '../components/Shell'
import { Field, Modal, btnPriStyle, btnStyle, inputStyle, useToast } from '../components/ui'
import { Nota, PageHeader, Section } from '../components/Page'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { CLIENTES_FILTRO, ZONAS_FILTRO, desdeSeed } from '../data/reportes'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-mute{background:#EEF1F4;color:#4A5868}.p-info{background:#E3F2F8;color:#0B6A8A}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.btn:disabled{opacity:.6;cursor:progress}
.btn-sm{min-height:32px;padding:0 10px;font-size:13px}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select{min-height:36px;background:#FFFFFF;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif}
.pill-btn{border:0;cursor:pointer;font-family:inherit}
.chip{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid #D5DBE3;background:#FFFFFF;color:#3E4A59;font:500 13px 'Montserrat',sans-serif;cursor:pointer;white-space:nowrap}
.chip:hover{border-color:#475CC7;color:#0D1D41}
.chip[aria-current="true"]{background:#E9EDFB;border-color:#475CC7;color:#0D1D41}
.ej{border:0;background:none;padding:0;cursor:pointer;font:400 13px 'Montserrat',sans-serif;color:#3448A8;text-decoration:underline;text-underline-offset:2px;text-align:left}
/* Celular: los envíos programados se muestran como tarjetas */
.rep-tarjeta{display:flex;flex-direction:column;gap:6px;border:1px solid #E4E8ED;border-radius:8px;padding:10px 12px;font-size:13px}
@keyframes rep-pulse{0%,100%{opacity:.35}50%{opacity:1}}
@media print{
  body *{visibility:hidden}
  #rep-preview,#rep-preview *{visibility:visible}
  #rep-preview{position:absolute !important;left:0;top:0;width:100%;border:0;box-shadow:none}
  #rep-preview .no-print{display:none !important}
}
`

type Rep = {
  id: string; cat: string; name: string; desc: string; chart: string; unit: string; fmt?: number
  kpis: [string, string][]; data: [string, number][]; ai: string; prompt?: string
}

const R: Rep[] = [
  { id: 'srv', cat: 'Operación', name: 'Servicios por modelo', desc: 'Servicios del trimestre por modelo de servicio y su resultado.', chart: 'Servicios por modelo', unit: '', kpis: [['Servicios', '300'], ['Sin incidente', '98.6%'], ['Puntualidad', '96.4%']], data: [['Por evento', 182], ['Dedicado', 74], ['Monitoreo', 44]], ai: 'Los servicios por evento crecieron 12% contra Q2, impulsados por Alpura y Marsh.' },
  { id: 'pun', cat: 'Operación', name: 'Puntualidad por cliente', desc: 'Entregas a tiempo contra la ventana pactada.', chart: 'Puntualidad %', unit: '%', kpis: [['Promedio', '96.4%'], ['Mejor', 'Alpura'], ['Por mejorar', 'Bebidas del Golfo']], data: [['Alpura', 97.8], ['Marsh', 96.9], ['Autopartes Saltillo', 96.2], ['Farmacéutica Orión', 94.1], ['Bebidas del Golfo', 93.2]], ai: 'Los retrasos de Bebidas del Golfo se concentran en la entrada a Puebla entre 7:00 y 9:00.' },
  { id: 'inc', cat: 'Seguridad', name: 'Incidentes por carretera', desc: 'Incidentes del trimestre por tramo, para riesgo de rutas y cotizador.', chart: 'Incidentes Q3', unit: '', kpis: [['Incidentes', '40'], ['Por 100 servicios', '1.4'], ['Recuperación', '72%']], data: [['Arco Norte', 7], ['Méx–Puebla–Orizaba', 6], ['Méx–Querétaro', 5], ['Querétaro–SLP', 4], ['Guadalajara–Colima', 2]], ai: 'Arco Norte duplicó incidentes contra Q2; 5 de 7 fueron de noche.' },
  { id: 'rea', cat: 'Seguridad', name: 'Tiempo de reacción por zona', desc: 'Minutos desde la alerta hasta el equipo en sitio.', chart: 'Minutos promedio', unit: ' min', kpis: [['Promedio', '18 min'], ['Meta', '20 min'], ['Fuera de meta', 'Golfo']], data: [['Centro', 16], ['Bajío', 21], ['Occidente', 19], ['Golfo', 24], ['Noreste', 17]], ai: 'Golfo no tiene base de reacción propia; una unidad en Córdoba bajaría el tiempo a unos 15 min.' },
  { id: 'uti', cat: 'Custodios', name: 'Utilización por zona', desc: 'Porcentaje de custodios en servicio o asignados.', chart: 'Utilización %', unit: '%', kpis: [['Promedio', '78%'], ['Disponibles', '65'], ['Docs por vencer', '14']], data: [['Bajío', 94], ['Centro', 82], ['Occidente', 80], ['Noreste', 84], ['Golfo', 80]], ai: 'Bajío está sobre 90%: es la zona con más riesgo de fatiga y de huecos de cobertura.' },
  { id: 'cpk', cat: 'Flotilla', name: 'Costo por km por unidad', desc: 'Combustible, mantenimiento y seguro entre kilómetros GPS.', chart: 'Costo por km (MXN)', unit: '', fmt: 1, kpis: [['Promedio', '$4.10'], ['Unidades', '600'], ['En taller', '31']], data: [['AU-1876', 6.2], ['AU-1450', 5.4], ['AU-1688', 5.9], ['AU-2214', 3.9], ['AU-3321', 3.86]], ai: 'Las 3 unidades más caras coinciden con consumo anómalo o fallas recurrentes.' },
  { id: 'ing', cat: 'Comercial', name: 'Ingresos por cliente', desc: 'Facturación del trimestre por cliente.', chart: 'Millones MXN', unit: 'M', fmt: 2, kpis: [['Ingresos', '$40.6M'], ['Clientes activos', '25'], ['Top 5', '47%']], data: [['Alpura', 14.6], ['Marsh', 11.2], ['Farmacéutica Orión', 8.4], ['Autopartes Saltillo', 6.8], ['Electrónica del Bajío', 5.6]], ai: 'La concentración en los 2 primeros clientes es de 32%; conviene diversificar en Bajío.' },
  { id: 'cxc', cat: 'Finanzas', name: 'Antigüedad de saldos', desc: 'Cuentas por cobrar por rango de días.', chart: 'Millones MXN', unit: 'M', fmt: 1, kpis: [['Por cobrar', '$18.2M'], ['Días de cobro', '38'], ['+60 días', '$3.1M']], data: [['Al corriente', 9.8], ['1–30 días', 3.6], ['31–60 días', 1.7], ['+60 días', 3.1]], ai: '71% del saldo a más de 60 días está en Bebidas del Golfo y Grupo Textil Arrayán.' },
  { id: 'rot', cat: 'Equipo', name: 'Rotación por área', desc: 'Bajas del trimestre entre la plantilla promedio.', chart: 'Rotación trimestral %', unit: '%', fmt: 1, kpis: [['Headcount', '486'], ['Bajas', '23'], ['Rotación', '4.7%']], data: [['Custodia', 5.1], ['Monitoreo', 8.3], ['Flotilla y taller', 2.6], ['Comercial', 0], ['Oficinas', 1.9]], ai: 'Monitoreo tiene la rotación más alta; 2 de 3 bajas citan el turno nocturno fijo.' },
  { id: 'hc', cat: 'Equipo', name: 'Headcount por área', desc: 'Plantilla activa por área (RH), con filtro por zona.', chart: 'Colaboradores', unit: '', kpis: [['Headcount', '486'], ['Custodios', '400'], ['Áreas', '9']], data: [['Custodios', 400], ['Monitoreo', 28], ['Reacción', 14], ['Operaciones', 12], ['Flotilla y taller', 9]], ai: 'Custodios concentra 82% de la plantilla; Monitoreo opera con 28 personas para 86 servicios activos.' },
]

const PERIODOS = ['Q3 2026 (jul–sep)', 'Septiembre 2026', 'Año 2026']
const PERIODO_CORTO: Record<string, string> = { 'Q3 2026 (jul–sep)': 'Q3 2026', 'Septiembre 2026': 'Septiembre 2026', 'Año 2026': 'Año 2026' }
const ZONAS = ZONAS_FILTRO
const CLIENTES = CLIENTES_FILTRO
const TIPOS = ['Todos', 'Por evento', 'Dedicado', 'Monitoreo']

type Sched = { r: string; to: string; f: string; n: string; fmt: string; st: 'Activo' | 'Pausado' }
const SCHED0: Sched[] = [
  { r: 'Dashboard directivo', to: 'Dirección (3)', f: 'Lunes 7:00', n: '12 oct 07:00', fmt: 'PDF', st: 'Activo' },
  { r: 'Servicios y puntualidad · Alpura', to: 'Alpura logística (2)', f: 'Mensual', n: '1 nov 08:00', fmt: 'PDF', st: 'Activo' },
  { r: 'Incidentes y recuperación · Marsh', to: 'Marsh riesgos (2)', f: 'Mensual', n: '1 nov 08:00', fmt: 'PDF + Excel', st: 'Activo' },
  { r: 'Antigüedad de saldos', to: 'Finanzas (3)', f: 'Viernes 9:00', n: '9 oct 09:00', fmt: 'Excel', st: 'Activo' },
  { r: 'Headcount y rotación', to: 'RH y Dirección (5)', f: 'Mensual', n: '1 nov 08:00', fmt: 'PDF', st: 'Pausado' },
]

const DEST: Record<string, string> = { Operación: 'Operaciones (4)', Seguridad: 'Seguridad (3)', Custodios: 'Operaciones (4)', Flotilla: 'Flotilla y taller (2)', Comercial: 'Comercial (3)', Finanzas: 'Finanzas (3)', Equipo: 'RH y Dirección (5)', 'Pedidos a la IA': 'Dirección (3)' }

/** Reglas de la respuesta simulada de la IA: palabra clave → reporte base. */
const KEYWORDS: [RegExp, string][] = [
  [/incident|robo|carreter|tramo|mapa de calor/, 'inc'],
  [/reacci|alerta|tiempo de respuesta/, 'rea'],
  [/puntual|retras|a tiempo|ventana/, 'pun'],
  [/utiliz|custodi|fatiga|cobertura/, 'uti'],
  [/costo|km|kil[oó]metr|unidad|flotilla|taller|combustible/, 'cpk'],
  [/saldo|cobr|cartera|antig/, 'cxc'],
  [/ingreso|factur|venta|rentab/, 'ing'],
  [/rotaci|baja|personal|headcount|rh\b|personas|equipo/, 'rot'],
  [/servicio|evento|dedicado|monitoreo/, 'srv'],
]
const CLIENT_NAMES = [...CLIENTES_FILTRO.slice(1), 'Autopartes Saltillo']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const EXAMPLE = 'incidentes de septiembre para Marsh con mapa de calor'
const EJEMPLOS = [EXAMPLE, 'puntualidad de Alpura en el trimestre', 'saldos por cobrar con más de 60 días', 'rotación del equipo de monitoreo']

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function simulateAI(prompt: string, n: number): Rep {
  const q = norm(prompt)
  const baseId = KEYWORDS.find(([re]) => re.test(q))?.[1] ?? 'srv'
  const base = R.find(r => r.id === baseId)!
  const client = CLIENT_NAMES.find(c => q.includes(norm(c)))
  const month = MONTHS.find(m => q.includes(m))
  // Recorte determinista: un cliente ≈ 45% del volumen, un mes ≈ la mitad del trimestre (septiembre pesa más).
  const factor = (client ? 0.45 : 1) * (month ? 0.5 : 1)
  const isCount = base.unit === '' && !base.fmt
  const scaled = (v: number) => isCount ? Math.ceil(v * factor) : base.unit === 'M' ? +(v * factor).toFixed(2) : v
  const data = base.data.map(([k, v]) => [k, scaled(v)] as [string, number])
  const scope = [client, month && month[0].toUpperCase() + month.slice(1)].filter(Boolean).join(' · ')
  const name = base.name + (scope ? ' · ' + scope : '')
  const total = data.reduce((a, [, v]) => a + v, 0)
  const top = [...data].sort((a, b) => b[1] - a[1])[0]
  const ai = (client || month)
    ? `Con el filtro ${scope}, ${top[0]} concentra ${total ? Math.round(top[1] / total * 100) : 0}% del total. En el trimestre completo: ${base.ai}`
    : base.ai
  return {
    ...base, id: 'ia-' + n, cat: 'Pedidos a la IA', name, prompt,
    chart: month ? base.chart.replace('Q3', month[0].toUpperCase() + month.slice(1)) : base.chart,
    desc: `Generado a partir de: “${prompt}”.`,
    kpis: isCount && factor !== 1 ? [[base.kpis[0][0], String(Math.round(total))], ...base.kpis.slice(1)] as [string, string][] : base.kpis,
    data, ai,
  }
}

/** Genera un CSV (BOM para que Excel respete acentos) y lo descarga en el navegador. */
function downloadCSV(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export default function Reportes() {
  // Celular: barras del reporte apiladas (etiqueta y valor arriba, barra abajo), envíos programados como tarjetas y menos padding.
  const movil = useViewport() === 'movil'
  const [r, setR] = useState('inc')
  const [generated, setGenerated] = useState<Rep[]>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [periodo, setPeriodo] = useState(PERIODOS[0])
  const [zona, setZona] = useState(ZONAS[0])
  const [cliente, setCliente] = useState(CLIENTES[0])
  const [tipo, setTipo] = useState(TIPOS[0])
  const [masFiltros, setMasFiltros] = useState(false)
  const [sched, setSched] = useState<Sched[]>(SCHED0)
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [envOpen, setEnvOpen] = useState(false)
  const [env, setEnv] = useState({ para: '', msg: '' })
  const [progOpen, setProgOpen] = useState(false)
  const [prog, setProg] = useState({ to: '', f: 'Lunes 7:00', fmt: 'PDF + Excel' })

  const all = [...generated, ...R]
  const base0 = all.find(x => x.id === r) ?? R[2]
  // Cifras desde seed con los filtros aplicados (servicios, incidentes, custodios, cartera, plantilla);
  // los reportes sin base en seed se recortan por cliente cuando el cliente aparece en sus filas.
  const seed = base0.cat === 'Pedidos a la IA' ? null : desdeSeed(base0.id, { periodo, zona, cliente, tipo })
  const cur0: Rep = seed
    ? { ...base0, data: seed.data, kpis: seed.kpis ?? base0.kpis }
    : cliente !== CLIENTES[0] && base0.data.some(d => d[0] === cliente)
      ? { ...base0, data: base0.data.filter(d => d[0] === cliente) }
      : base0
  const max = Math.max(...cur0.data.map(d => d[1])) || 1
  const cats: { name: string; items: Rep[] }[] = []
  all.forEach(x => { let c = cats.find(c => c.name === x.cat); if (!c) { c = { name: x.cat, items: [] }; cats.push(c) } c.items.push(x) })
  const fv = (v: number) => cur0.unit === 'M' ? '$' + v.toFixed(cur0.fmt) + 'M' : (cur0.fmt ? (cur0.unit ? v.toFixed(cur0.fmt) + cur0.unit : '$' + v.toFixed(2)) : v + cur0.unit)
  const filtros = [zona !== ZONAS[0] && zona, cliente !== CLIENTES[0] && cliente, tipo !== TIPOS[0] && tipo].filter(Boolean) as string[]
  const activos = sched.filter(s => s.st === 'Activo').length

  const flash = (msg: string) => toast(msg)

  const generar = () => {
    if (loading) return
    const q = prompt.trim() || EXAMPLE
    setLoading(true)
    window.setTimeout(() => {
      const rep = simulateAI(q, Date.now())
      setGenerated(g => [rep, ...g])
      setR(rep.id)
      setLoading(false)
      setPrompt('')
      flash('Reporte listo: ' + rep.name)
    }, 1100)
  }

  const exportExcel = () => {
    const rows: (string | number)[][] = [
      ['AI27 · ' + cur0.name], [cur0.cat + ' · ' + PERIODO_CORTO[periodo]], [cur0.desc],
      ['Filtros', [periodo, zona, cliente, 'Tipo: ' + tipo].join(' | ')], [],
      ['Indicador', 'Valor'], ...cur0.kpis, [],
      [cur0.chart, 'Valor'], ...cur0.data.map(([k, v]) => [k, fv(v)]), [],
      ['Lectura de la IA', cur0.ai],
    ]
    downloadCSV('AI27_' + slug(cur0.name) + '.csv', rows)
    flash('Excel descargado: AI27_' + slug(cur0.name) + '.csv')
  }

  const abrirProgramar = () => {
    if (sched.some(s => s.r === cur0.name)) { toast('“' + cur0.name + '” ya tiene un envío programado', 'warn'); return }
    setProg({ to: DEST[cur0.cat] ?? 'Dirección (3)', f: 'Lunes 7:00', fmt: 'PDF + Excel' })
    setProgOpen(true)
  }
  const programar = () => {
    const prox: Record<string, string> = { 'Lunes 7:00': '12 oct 07:00', 'Viernes 9:00': '9 oct 09:00', Mensual: '1 nov 08:00', Diario: '9 oct 07:00' }
    setSched(s => [...s, { r: cur0.name, to: prog.to, f: prog.f, n: prox[prog.f] ?? '12 oct 07:00', fmt: prog.fmt, st: 'Activo' }])
    setProgOpen(false)
    flash('Envío programado: ' + cur0.name + ' · ' + prog.f.toLowerCase() + ' · ' + prog.to)
  }
  const abrirEnviar = () => { setEnv({ para: DEST[cur0.cat] ?? 'Dirección (3)', msg: `Adjunto el reporte “${cur0.name}” (${PERIODO_CORTO[periodo]}${filtros.length ? ' · ' + filtros.join(', ') : ''}).\n\nLectura de la IA: ${cur0.ai}` }); setEnvOpen(true) }
  const enviar = () => { setEnvOpen(false); flash('Enviado a ' + env.para + ': ' + cur0.name) }

  const toggle = (i: number) => setSched(s => s.map((x, j) => j === i ? { ...x, st: x.st === 'Activo' ? 'Pausado' : 'Activo' } : x))
  const enviarAhora = (s: Sched) => flash('Enviado ahora a ' + s.to + ': ' + s.r + ' (' + s.fmt + ')')
  const quitar = (i: number) => { const s = sched[i]; setSched(xs => xs.filter((_, j) => j !== i)); toast('Envío programado eliminado: ' + s.r, 'info') }
  const abrirReporte = (nombre: string) => { const x = all.find(y => y.name === nombre || nombre.startsWith(y.name)); if (x) { setR(x.id); window.scrollTo({ top: 0, behavior: 'smooth' }) } else toast('Este reporte programado es una plantilla de cliente', 'info') }

  return (
    <Shell active="reportes" css={CSS} mainStyle="flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:22px">
      <PageHeader seccion="Administración" titulo="Reportes"
        descripcion={`Pide un reporte en tus palabras o elige uno de la biblioteca; lo ves aquí mismo y lo descargas en PDF o Excel. ${R.length + generated.length} reportes listos · ${activos} envíos programados.`}
        accion={{ label: 'Generar con IA', onClick: () => { if (prompt.trim()) generar(); else inputRef.current?.focus() } }} />

      <section aria-label="Pide un reporte en tus palabras" style={sx('display:flex;flex-direction:column;gap:10px;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:12px;padding:' + (movil ? '16px' : '18px 24px'))}>
        <div style={sx('display:flex;gap:10px;align-items:center')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
          <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:19px;font-weight:600;color:#0D1D41")}>Pide un reporte en tus palabras</h2>
        </div>
        <div style={sx('display:flex;flex-wrap:wrap;gap:10px;align-items:center')}>
          <label style={sx('flex:1 1 420px;display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Pide un reporte en tus palabras</span><input ref={inputRef} type="text" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') generar() }} placeholder={`Ej. ${EXAMPLE}`} style={sx("flex:1;min-height:48px;background:#FFFFFF;border:1px solid #B9C4EE;border-radius:8px;color:#0D1D41;padding:0 14px;font:400 15px 'Montserrat',sans-serif")} /></label>
          <button type="button" className="btn" style={sx('min-height:48px')} onClick={generar} disabled={loading}>{loading ? 'Generando…' : 'Generar'}</button>
        </div>
        <div style={sx('display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:13px;color:#3E4A59')}>
          <span>Prueba con:</span>
          {EJEMPLOS.map(e => <button key={e} type="button" className="ej" onClick={() => { setPrompt(e); inputRef.current?.focus() }}>“{e}”</button>)}
          <span style={sx('color:#5F6B7A')}>· La IA entiende cliente, mes y tema; el resultado aparece abajo en la vista previa.</span>
        </div>
      </section>

      <Section titulo="Biblioteca de reportes" ayuda="Elige uno por área; la vista previa de abajo se actualiza al instante." style="gap:10px;padding:16px 20px">
        <div style={sx('display:flex;flex-wrap:wrap;gap:8px 6px;align-items:center')}>
          {cats.map((c, i) => (
            <span key={c.name} style={sx('display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center' + (i ? ';margin-left:14px' : ''))}>
              <span className="lbl" style={sx('margin-right:2px')}>{c.name}</span>
              {c.items.map(x => (
                <button key={x.id} type="button" className="chip" aria-current={x.id === r ? 'true' : undefined} onClick={() => setR(x.id)} title={x.desc}>{x.name}</button>
              ))}
            </span>
          ))}
        </div>
      </Section>

      <section id="rep-preview" className="card" aria-label="Vista previa" style={sx('display:flex;flex-direction:column;gap:18px;padding:' + (movil ? '16px' : '24px') + ';position:relative')}>
        {loading && (
          <div aria-live="polite" style={sx('position:absolute;inset:0;background:rgba(255,255,255,.82);border-radius:10px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;color:#0D1D41;z-index:1')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('animation:rep-pulse 1s ease-in-out infinite')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
            La IA está armando el reporte…
          </div>
        )}
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Vista previa · {cur0.cat} · {PERIODO_CORTO[periodo]}</span><h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600")}>{cur0.name}</h2><span style={sx('font-size:14px;color:#3E4A59')}>{cur0.desc}</span>
            {filtros.length > 0 && <span style={sx('display:flex;gap:6px;flex-wrap:wrap;margin-top:4px')}>{filtros.map(f => <span key={f} className="pill p-info">{f}</span>)}</span>}
          </div>
          <div className="no-print" style={sx('display:flex;gap:8px;flex-wrap:wrap')}><button type="button" className="btn" onClick={() => { window.print(); flash('PDF listo: ' + cur0.name) }}>Descargar PDF</button><button type="button" className="btn" onClick={exportExcel}>Descargar Excel</button><button type="button" className="btn" onClick={abrirEnviar}>Enviar por correo</button></div>
        </div>
        <form className="no-print" style={sx('display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;background:#F7F9FB;border-radius:8px;padding:12px 14px')} onSubmit={e => e.preventDefault()}>
          <label className="field">Periodo<select value={periodo} onChange={e => setPeriodo(e.target.value)}>{PERIODOS.map(o => <option key={o}>{o}</option>)}</select></label>
          <label className="field">Cliente<select value={cliente} onChange={e => setCliente(e.target.value)}>{CLIENTES.map(o => <option key={o}>{o}</option>)}</select></label>
          <button type="button" className="btn btn-sm" aria-expanded={masFiltros} onClick={() => setMasFiltros(m => !m)}>Más filtros{(zona !== ZONAS[0] ? 1 : 0) + (tipo !== TIPOS[0] ? 1 : 0) ? ` · ${(zona !== ZONAS[0] ? 1 : 0) + (tipo !== TIPOS[0] ? 1 : 0)}` : ''}</button>
          {masFiltros && (
            <>
              <label className="field">Zona<select value={zona} onChange={e => setZona(e.target.value)}>{ZONAS.map(o => <option key={o}>{o}</option>)}</select></label>
              <label className="field">Tipo de servicio<select value={tipo} onChange={e => setTipo(e.target.value)}>{TIPOS.map(o => <option key={o}>{o}</option>)}</select></label>
            </>
          )}
        </form>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(160px,100%),1fr));gap:12px')}>
          {cur0.kpis.map(([k, v]) => (
            <div key={k} style={sx('background:#F7F9FB;border:1px solid #E4E8ED;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">{k}</span><span style={sx("font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600")}>{v}</span></div>
          ))}
        </div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:12px')}>
          <figcaption className="lbl">{cur0.chart}</figcaption>
          {cur0.data.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A')}>Sin datos para los filtros seleccionados. Prueba con otro cliente o zona.</span>}
          {cur0.data.map(([k, v], i) => (
            // Celular: etiqueta y valor en la primera fila, barra a todo lo ancho debajo (en escritorio "180px 1fr 90px")
            <div key={k} style={sx(movil ? 'display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;font-size:14px;--sx-fijo:1' : 'display:grid;grid-template-columns:180px minmax(0,1fr) 90px;gap:12px;align-items:center;font-size:14px')}>
              <span>{k}</span>
              {movil && <span className="mono" style={sx('text-align:right')}>{fv(v)}</span>}
              <div style={sx('height:16px;border-radius:4px;background:#EBEEF2;overflow:hidden' + (movil ? ';grid-column:1 / -1;height:10px' : ''))}><div style={sx('height:100%;width:' + Math.max(1, Math.round(v / max * 100)) + '%;background:' + (i === 0 ? '#3448A8' : '#475CC7'))}></div></div>
              {!movil && <span className="mono" style={sx('text-align:right')}>{fv(v)}</span>}
            </div>
          ))}
        </figure>
        <div style={sx('display:flex;gap:10px;align-items:flex-start;background:#F7F9FB;border-radius:8px;padding:14px;font-size:14px;color:#3E4A59')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none;margin-top:2px')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
          <span><b style={sx('color:#0D1D41')}>Lectura de la IA:</b> {cur0.ai}</span>
        </div>
      </section>

      <Section titulo="Envíos programados" ayuda={`${activos} activos. Reportes que se mandan solos por correo a quien corresponda; puedes pausarlos, enviarlos ahora o quitarlos.`} plegable abierto={false} style="padding:20px 8px 8px"
        acciones={<button type="button" className="btn btn-sm" onClick={abrirProgramar}>Programar “{cur0.name.length > 28 ? cur0.name.slice(0, 26) + '…' : cur0.name}”</button>}>
        {movil ? (
          // Celular: una tarjeta por envío con los mismos datos y acciones que la fila
          <div style={sx('display:flex;flex-direction:column;gap:8px;padding:0 6px')}>
            {sched.map((s, i) => (
              <article key={s.r} className="rep-tarjeta" aria-label={`Envío programado: ${s.r}`}>
                <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start')}>
                  <button type="button" onClick={() => abrirReporte(s.r)} style={sx("background:none;border:0;padding:0;cursor:pointer;color:#0D1D41;font:600 14px 'Montserrat',sans-serif;text-align:left;min-height:0")} title="Abrir reporte">{s.r}</button>
                  <button type="button" title={s.st === 'Activo' ? 'Pausar envío' : 'Reactivar envío'} onClick={() => toggle(i)} className={'pill pill-btn ' + (s.st === 'Activo' ? 'p-ok' : 'p-mute')} style={sx('flex:none;min-height:0')}>{s.st}</button>
                </div>
                <span style={sx('color:#5F6B7A')}>{s.to} · {s.f} · {s.fmt}</span>
                <span>Próximo envío: <span className="mono">{s.n}</span></span>
                <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}><button type="button" className="btn btn-sm" onClick={() => enviarAhora(s)}>Enviar ahora</button><button type="button" className="btn btn-sm" aria-label="Eliminar envío" title="Quitar envío programado" onClick={() => quitar(i)}>×</button></div>
              </article>
            ))}
            {sched.length === 0 && <span style={sx('color:#5F6B7A;font-size:14px')}>Sin envíos programados. Usa “Programar envío” para que un reporte llegue solo por correo.</span>}
          </div>
        ) : (
        <div style={sx('overflow-x:auto')}>
          <table className="tbl">
            <thead><tr><th>Reporte</th><th>Destinatarios</th><th>Frecuencia</th><th>Próximo envío</th><th>Formato</th><th>Estatus</th><th></th></tr></thead>
            <tbody>
              {sched.map((s, i) => (
                <tr key={s.r}><td><button type="button" onClick={() => abrirReporte(s.r)} style={sx("background:none;border:0;padding:0;cursor:pointer;color:#0D1D41;font:400 14px 'Montserrat',sans-serif;text-align:left")} title="Abrir reporte">{s.r}</button></td><td>{s.to}</td><td>{s.f}</td><td className="mono">{s.n}</td><td>{s.fmt}</td><td><button type="button" title={s.st === 'Activo' ? 'Pausar envío' : 'Reactivar envío'} onClick={() => toggle(i)} className={'pill pill-btn ' + (s.st === 'Activo' ? 'p-ok' : 'p-mute')}>{s.st}</button></td>
                  <td><div style={sx('display:flex;gap:6px')}><button type="button" className="btn btn-sm" onClick={() => enviarAhora(s)}>Enviar ahora</button><button type="button" className="btn btn-sm" aria-label="Eliminar envío" title="Quitar envío programado" onClick={() => quitar(i)}>×</button></div></td></tr>
              ))}
              {sched.length === 0 && <tr><td colSpan={7} style={sx('color:#5F6B7A')}>Sin envíos programados. Usa “Programar envío” para que un reporte llegue solo por correo.</td></tr>}
            </tbody>
          </table>
        </div>
        )}
        <Nota>Haz clic en el estatus para pausar o reactivar un envío.</Nota>
      </Section>

      <Modal open={envOpen} onClose={() => setEnvOpen(false)} title={'Enviar reporte · ' + cur0.name} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setEnvOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={enviar}>Enviar</button></>}>
        <Field label="Destinatarios"><select style={sx(inputStyle)} value={env.para} onChange={e => setEnv({ ...env, para: e.target.value })}>{[...new Set(Object.values(DEST))].map(d => <option key={d}>{d}</option>)}<option>Alpura logística (2)</option><option>Marsh riesgos (2)</option></select></Field>
        <Field label="Mensaje"><textarea rows={5} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={env.msg} onChange={e => setEnv({ ...env, msg: e.target.value })} /></Field>
        <Nota>Adjuntos: {slug(cur0.name)}.pdf · {slug(cur0.name)}.csv</Nota>
      </Modal>
      <Modal open={progOpen} onClose={() => setProgOpen(false)} title={'Programar envío · ' + cur0.name} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setProgOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={programar}>Programar</button></>}>
        <Field label="Destinatarios"><select style={sx(inputStyle)} value={prog.to} onChange={e => setProg({ ...prog, to: e.target.value })}>{[...new Set(Object.values(DEST))].map(d => <option key={d}>{d}</option>)}<option>Alpura logística (2)</option><option>Marsh riesgos (2)</option></select></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Frecuencia"><select style={sx(inputStyle)} value={prog.f} onChange={e => setProg({ ...prog, f: e.target.value })}>{['Diario', 'Lunes 7:00', 'Viernes 9:00', 'Mensual'].map(d => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Formato"><select style={sx(inputStyle)} value={prog.fmt} onChange={e => setProg({ ...prog, fmt: e.target.value })}>{['PDF', 'Excel', 'PDF + Excel'].map(d => <option key={d}>{d}</option>)}</select></Field>
        </div>
        <Nota>Se enviará con los filtros actuales: {[PERIODO_CORTO[periodo], ...filtros].join(' · ')}</Nota>
      </Modal>
    </Shell>
  )
}
