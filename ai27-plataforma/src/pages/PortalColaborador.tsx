import { Logo } from '../components/Logo'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { ROUTES } from '../lib/routes'
import { useStore, actions } from '../lib/store'
import { useToast } from '../components/ui'
import { Nota, PageHeader, Section } from '../components/Page'
import { YO, recibos, money, descargarReciboPDF, descargarReciboXML, descargarConstancia } from '../data/portal'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;padding:22px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-mute{background:#EEF1F4;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 18px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.field{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#3E4A59}
.field select,.field input,.field textarea{min-height:44px;background:#FFFFFF;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 15px 'Montserrat',sans-serif;box-sizing:border-box}
.field textarea{padding:10px 12px;resize:vertical}
.acceso{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:20px;border-radius:12px;border:1px solid #E4E8ED;background:#FFFFFF;cursor:pointer;text-align:left;font-family:inherit;color:#0D1D41;min-height:150px}
.acceso:hover{border-color:#475CC7;box-shadow:0 0 0 2px #E9EDFB}
.acceso .ico{width:44px;height:44px;border-radius:10px;background:#E9EDFB;display:flex;align-items:center;justify-content:center}
.acceso .t{font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600}
.acceso .d{font-size:13px;color:#5F6B7A;line-height:1.45}
.tabbtn{min-height:40px;padding:0 14px;border-radius:8px;border:0;cursor:pointer;font:500 14px 'Montserrat',sans-serif;background:transparent;color:#3E4A59}
.tabbtn[aria-current="page"]{background:#E9EDFB;color:#0D1D41}
`

type Tab = 'home' | 'vac' | 'pay' | 'docs'
const T: [Tab, string][] = [['home', 'Inicio'], ['vac', 'Vacaciones y permisos'], ['pay', 'Mis recibos'], ['docs', 'Documentos y trámites']]
const TYPES = ['Vacaciones', 'Permiso con goce', 'Permiso sin goce', 'Incapacidad']
const BASE = [
  { id: 'b1', t: 'Vacaciones', d: '18–19 ago 2026', n: '2 días', s: 'Aprobada', cls: 'pill p-ok' },
  { id: 'b2', t: 'Permiso con goce', d: '2 sep 2026 · cita médica', n: '1 día', s: 'Aprobada', cls: 'pill p-ok' },
  { id: 'b3', t: 'Vacaciones', d: '6–7 jul 2026', n: '2 días', s: 'Aprobada', cls: 'pill p-ok' },
]
const DOCS0 = [['Contrato individual de trabajo', 'Vigente', 'pill p-ok'], ['INE', 'Vigente', 'pill p-ok'], ['Comprobante de domicilio', 'Vence en 2 meses', 'pill p-warn'], ['Constancia de situación fiscal', 'Vigente', 'pill p-ok'], ['Certificado de capacitación en monitoreo', 'Vigente', 'pill p-ok']].map(([n, s, cls]) => ({ n, s, cls }))
const TRAMITES = ['Constancia laboral', 'Constancia de percepciones', 'Carta de recomendación', 'Cambio de datos bancarios']
const AVISOS: [string, string][] = [['Capacitación de protocolo de reacción', 'Jueves 16 oct · 10:00 · sala de monitoreo'], ['Actualiza tu contacto de emergencia', 'Antes del 31 de octubre']]
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
/** Días hábiles lunes a sábado (semana operativa de 6 días). */
function diasHabiles(desde: string, hasta: string) {
  if (!desde || !hasta) return 0
  const a = parse(desde), b = parse(hasta)
  let n = 0
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++
  return n
}
function rango(desde: string, hasta: string) {
  const a = parse(desde), b = parse(hasta)
  const y = b.getFullYear()
  if (desde === hasta) return `${a.getDate()} ${MES[a.getMonth()]} ${y}`
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MES[a.getMonth()]} ${y}` : `${a.getDate()} ${MES[a.getMonth()]}–${b.getDate()} ${MES[b.getMonth()]} ${y}`
}
const cls = (s: string) => (s === 'Aprobada' ? 'pill p-ok' : s === 'Rechazada' ? 'pill p-bad' : 'pill p-warn')

const ICO = {
  sol: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  clock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  doc: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l3 3v15H6z" /><path d="M9 12h6M9 16h6" /></svg>,
  folder: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h6l2 2h10v10H3z" /></svg>,
}

export default function PortalColaborador() {
  const toast = useToast()
  // Celular: márgenes de 16px (como el Shell) y los recibos como lista de tarjetas en vez de tabla.
  const movil = useViewport() === 'movil'
  const [tab, setTab] = useState<Tab>('home')
  const [docs, setDocs] = useState(DOCS0)
  const [adjunto, setAdjunto] = useState('')
  const [tramite, setTramite] = useState(TRAMITES[0])
  const [paraQue, setParaQue] = useState('')
  const [avisosOk, setAvisosOk] = useState<Record<number, boolean>>({})
  const incRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const tramitesTodos = useStore(s => s.tramites) ?? []
  const tramites = tramitesTodos.filter(x => x.colaborador === YO.nombre)
  const [type, setType] = useState('Vacaciones')
  const [sent, setSent] = useState(false)
  const [desde, setDesde] = useState('2026-10-27')
  const [hasta, setHasta] = useState('2026-10-31')
  const [cubre, setCubre] = useState('Sofía Campos · Monitorista')
  const [coment, setComent] = useState('')
  const todas = useStore(s => s.vacaciones)
  const mias = todas.filter(v => v.colaborador === YO.nombre)

  const dias = diasHabiles(desde, hasta)
  const valido = dias > 0 && desde <= hasta
  // Días de vacaciones usados: los aprobados del historial base (2 + 2) más los aprobados en el demo
  const used = BASE.filter(b => b.t === 'Vacaciones' && b.s === 'Aprobada').reduce((a, b) => a + parseInt(b.n), 0) + mias.filter(v => v.estatus === 'Aprobada' && (v.motivo || 'Vacaciones').startsWith('Vacaciones')).reduce((a, v) => a + v.dias, 0)
  const left = Math.max(0, 14 - used)
  const pending = mias.filter(v => v.estatus === 'Pendiente').length
  const reqs = [
    ...mias.map(v => ({ id: v.id, t: (v.motivo || 'Vacaciones').split(' · ')[0], d: rango(v.desde, v.hasta), n: v.dias + (v.dias === 1 ? ' día' : ' días'), s: v.estatus, cls: cls(v.estatus) })),
    ...BASE,
  ]
  const pendTram = tramites.filter(t => t.estatus === 'Pendiente').length

  const ir = (t: Tab, tipo?: string) => { if (tipo) { setType(tipo); setSent(false) } setTab(t); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const submit = () => {
    if (!valido) return
    const quien = cubre === 'Lo asigna mi jefe' ? 'Cubre: lo asigna el jefe' : 'Cubre: ' + cubre.split(' · ')[0]
    if (type === 'Incapacidad' && !adjunto) { toast('Adjunta tu incapacidad del IMSS para enviar la solicitud', 'warn'); return }
    const id = actions.solicitarVacaciones({ colaborador: YO.nombre, area: YO.area, desde, hasta, dias, motivo: [type, quien, coment.trim(), adjunto && 'Adjunto: ' + adjunto].filter(Boolean).join(' · ') })
    setSent(true)
    setComent('')
    setAdjunto('')
    toast(`Solicitud ${id} enviada a ${YO.jefe} · ${type} · ${dias} ${dias === 1 ? 'día' : 'días'}`)
  }
  const enviarTramite = () => {
    const id = actions.solicitarTramite({ colaborador: YO.nombre, area: YO.area, tramite, motivo: paraQue.trim() })
    toast(`Trámite ${id} enviado a RH: ${tramite}. Respuesta en 1 día hábil.`)
    setParaQue('')
  }
  const subirDoc = (f: File) => {
    const n = f.name.replace(/\.[^.]+$/, '')
    setDocs(d => [...d, { n, s: 'En revisión', cls: 'pill p-warn' }])
    toast(`Documento "${f.name}" subido · RH lo revisará`)
  }

  const explicacion: Record<Tab, string> = {
    home: 'Aquí pides vacaciones y permisos, descargas tus recibos de nómina y consultas o solicitas tus documentos. Todo llega a tu jefe directo y a RH.',
    vac: 'Elige el tipo, las fechas y quién te cubre. Tu solicitud llega a tu jefe directo y después a RH; te avisamos por correo y WhatsApp.',
    pay: 'Tus recibos quincenales. Descarga el PDF para verlo o el XML (CFDI) si lo necesitas para un trámite.',
    docs: 'Lo que RH tiene en tu expediente y lo que puedes pedirle: constancias, cartas y cambio de datos bancarios.',
  }

  return (
    <div style={sx("font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41;background:#F6F7F9;min-height:100vh")}>
      <style>{CSS}</style>
      <header style={sx('background:#FFFFFF;border-bottom:1px solid #E4E8ED')}>
        <div style={sx('max-width:1120px;margin:0 auto;padding:' + (movil ? '12px 16px' : '14px 24px') + ';display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between')}>
          <button type="button" onClick={() => ir('home')} style={sx('display:flex;align-items:center;gap:10px;background:none;border:0;padding:0;cursor:pointer;font-family:inherit;color:inherit')}>
            <Logo height={24} />
            <span style={sx("font-family:'Montserrat',sans-serif;font-weight:700;font-size:19px")}>AI27</span>
            <span style={sx('font-size:14px;color:#5F6B7A;padding-left:10px;border-left:1px solid #E4E8ED')}>Mi portal</span>
          </button>
          <nav aria-label="Secciones del portal" style={sx('display:flex;gap:4px;flex-wrap:wrap')}>
            {T.map(([k, label]) => (
              <button key={k} type="button" className="tabbtn" aria-current={k === tab ? 'page' : undefined} onClick={() => ir(k)}>{label}</button>
            ))}
          </nav>
          <div style={sx('display:flex;align-items:center;gap:10px')}>
            <span style={sx('width:38px;height:38px;border-radius:50%;background:#6A5ACD;color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px')}>LH</span>
            <span style={sx('display:flex;flex-direction:column;font-size:13px;line-height:1.3')}><span style={sx('font-weight:500')}>{YO.nombre}</span><span style={sx('color:#5F6B7A')}>{YO.puesto}</span></span>
          </div>
        </div>
      </header>

      <main style={sx('max-width:1120px;margin:0 auto;padding:' + (movil ? '20px 16px 40px' : '28px 24px 56px') + ';box-sizing:border-box;display:flex;flex-direction:column;gap:' + (movil ? 18 : 22) + 'px')}>
        <PageHeader seccion={`Mi portal · ${YO.puesto} · ${YO.area}`} titulo={tab === 'home' ? `Hola, ${YO.nombre.split(' ')[0]}` : T.find(t => t[0] === tab)![1]} descripcion={explicacion[tab]}
          accion={tab === 'vac' ? undefined : { label: 'Pedir vacaciones', onClick: () => ir('vac', 'Vacaciones') }}
          secundarias={tab !== 'home' ? <button type="button" className="btn" onClick={() => ir('home')}>Volver al inicio</button> : undefined} />

        {tab === 'home' && (
          <div style={sx('display:flex;flex-direction:column;gap:22px')}>
            <section aria-label="Accesos" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:14px')}>
              <button type="button" className="acceso" onClick={() => ir('vac', 'Vacaciones')}>
                <span className="ico">{ICO.sol}</span>
                <span className="t">Pedir vacaciones</span>
                <span className="d">Te quedan <b>{left} días</b> de 14 del periodo 2026.{pending ? ` Tienes ${pending} solicitud${pending === 1 ? '' : 'es'} por aprobar.` : ''}</span>
              </button>
              <button type="button" className="acceso" onClick={() => ir('vac', 'Permiso con goce')}>
                <span className="ico">{ICO.clock}</span>
                <span className="t">Pedir un permiso</span>
                <span className="d">Con goce, sin goce o incapacidad del IMSS. Tu turno: <b>vespertino</b>, 14:00 a 22:00, descanso miércoles.</span>
              </button>
              <button type="button" className="acceso" onClick={() => ir('pay')}>
                <span className="ico">{ICO.doc}</span>
                <span className="t">Descargar recibo</span>
                <span className="d">Próximo pago <b>15 oct</b> · quincena 19, depósito en nómina. {recibos.length} recibos disponibles en PDF y XML.</span>
              </button>
              <button type="button" className="acceso" onClick={() => ir('docs')}>
                <span className="ico">{ICO.folder}</span>
                <span className="t">Documentos y constancias</span>
                <span className="d">{docs.length} documentos en tu expediente.{pendTram ? ` ${pendTram} trámite${pendTram === 1 ? '' : 's'} en proceso con RH.` : ' Pide una constancia laboral o carta en un paso.'}</span>
              </button>
            </section>

            <Section titulo="Avisos de RH" ayuda="Toca un aviso para marcarlo como atendido.">
              {AVISOS.map(([t, d], i) => (
                <button key={t} type="button" aria-pressed={!!avisosOk[i]} onClick={() => { setAvisosOk(a => ({ ...a, [i]: !a[i] })); toast(avisosOk[i] ? 'Aviso marcado como pendiente' : i === 0 ? 'Asistencia confirmada · recordatorio agregado a tu calendario' : 'Aviso marcado como atendido') }}
                  style={sx('padding:10px 0;border:0;border-top:1px solid #EEF1F4;font-size:14px;display:flex;flex-direction:column;gap:2px;background:none;cursor:pointer;font-family:inherit;color:inherit;text-align:left')}>
                  <span style={sx('font-weight:500' + (avisosOk[i] ? ';text-decoration:line-through;color:#5F6B7A' : ''))}>{t}</span><span style={sx('color:#5F6B7A')}>{d}{avisosOk[i] ? ' · atendido' : ''}</span>
                </button>
              ))}
            </Section>
          </div>
        )}

        {tab === 'vac' && (
          <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
            <section className="card" aria-label="Nueva solicitud" style={sx('flex:1 1 380px;display:flex;flex-direction:column;gap:16px')}>
              <div style={sx('display:flex;flex-direction:column;gap:2px')}><h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600")}>Nueva solicitud</h2><Nota>1. Elige el tipo · 2. Las fechas · 3. Quién te cubre · 4. Envía.</Nota></div>
              <div role="group" aria-label="Tipo de solicitud" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                {TYPES.map(t => (
                  <button key={t} type="button" aria-pressed={t === type} className="btn" style={sx(t === type ? 'background:#E9EDFB;border-color:#475CC7;color:#0D1D41' : '')} onClick={() => { setType(t); setSent(false) }}>{t}</button>
                ))}
              </div>
              <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
                <label className="field">Desde<input type="date" value={desde} onChange={e => { setDesde(e.target.value); setSent(false) }} /></label>
                <label className="field">Hasta<input type="date" value={hasta} min={desde} onChange={e => { setHasta(e.target.value); setSent(false) }} /></label>
              </div>
              <div style={sx('display:flex;justify-content:space-between;align-items:center;background:#F7F9FB;border-radius:8px;padding:12px 14px;font-size:14px')}><span>Días hábiles (lunes a sábado)</span><span className="mono" style={sx('font-size:18px')}>{dias}</span></div>
              <label className="field">¿Quién te cubre?<select value={cubre} onChange={e => setCubre(e.target.value)}><option>Sofía Campos · Monitorista</option><option>Pedro Ruiz · Monitorista</option><option>Lo asigna mi jefe</option></select></label>
              <label className="field">Comentario (opcional)<textarea rows={3} placeholder="Ej. viaje familiar" value={coment} onChange={e => setComent(e.target.value)}></textarea></label>
              {type === 'Incapacidad' && (
                <>
                  <input ref={incRef} type="file" accept="application/pdf,image/*" style={sx('display:none')} onChange={e => { const f = e.target.files?.[0]; if (f) { setAdjunto(f.name); toast(`Incapacidad adjuntada: ${f.name}`) }; e.target.value = '' }} />
                  <button type="button" onClick={() => incRef.current?.click()} style={sx('border:1px dashed #C3CBD5;border-radius:8px;padding:16px;text-align:center;font-size:14px;color:#3E4A59;background:#FFFFFF;cursor:pointer;font-family:inherit')}>{adjunto ? `Adjunto: ${adjunto} · cambiar` : 'Adjunta tu incapacidad del IMSS (PDF o foto)'}</button>
                </>
              )}
              <Nota>Tu solicitud llega a {YO.jefe} (jefe directo) y después a RH. Te avisamos por correo y WhatsApp.</Nota>
              <button type="button" className="btn btn-pri" onClick={submit} disabled={!valido} style={sx(valido ? '' : 'opacity:.5;cursor:not-allowed')}>Enviar solicitud</button>
              {sent && <span className="pill p-ok" style={sx('align-self:flex-start')}>Solicitud enviada · pendiente de aprobación</span>}
            </section>
            <div style={sx('flex:999 1 460px;display:flex;flex-direction:column;gap:16px;min-width:0')}>
              <Section titulo="Mis solicitudes" ayuda={`${left} días de vacaciones disponibles · ${used} usados de 14 en 2026.`}>
                <div style={sx('height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;background:#475CC7;width:' + Math.round(used / 14 * 100) + '%')}></div></div>
                {reqs.map(r => (
                  <div key={r.id} style={sx('display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;padding:12px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
                    <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:200px')}><span style={sx('font-weight:500')}>{r.t}</span><span style={sx('color:#5F6B7A;font-size:13px')}>{r.d}</span></span>
                    <span style={sx('color:#3E4A59;min-width:120px')}>{r.n}</span>
                    <span className={r.cls}>{r.s}</span>
                  </div>
                ))}
              </Section>
              <Section titulo="Días festivos y descansos próximos" plegable abierto={false}>
                <span style={sx('font-size:14px;color:#3E4A59')}>2 nov · Día de Muertos (turno con prima) · 16 nov · Revolución mexicana · 25 dic · Navidad</span>
              </Section>
            </div>
          </div>
        )}

        {tab === 'pay' && movil && (
          /* Celular: una tarjeta por quincena con los mismos datos y botones que la tabla */
          <Section titulo="Mis recibos de nómina" ayuda="PDF para consultarlo o imprimirlo; XML es el CFDI timbrado para trámites.">
            {recibos.map(p => (
              <div key={p.periodo} style={sx('display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
                <span style={sx('display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap')}><span style={sx('font-weight:500')}>{p.periodo}</span><span style={sx('color:#5F6B7A;font-size:13px')}>Fecha de pago <span className="mono">{p.pago}</span></span></span>
                <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;--sx-fijo:1')}>
                  <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}><span className="lbl" style={sx('font-size:11px')}>Percepciones</span><span className="mono" style={sx('font-size:13px')}>{money(p.percepciones)}</span></span>
                  <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}><span className="lbl" style={sx('font-size:11px')}>Deducciones</span><span className="mono" style={sx('font-size:13px')}>{money(p.deducciones)}</span></span>
                  <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}><span className="lbl" style={sx('font-size:11px')}>Neto</span><span className="mono" style={sx('font-size:13px;font-weight:500')}>{money(p.neto)}</span></span>
                </div>
                <span style={sx('display:flex;gap:8px;flex-wrap:wrap')}><button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => { descargarReciboPDF(p); toast(`Recibo PDF descargado · ${p.periodo}`) }}>PDF</button><button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => { descargarReciboXML(p); toast(`CFDI XML descargado · ${p.periodo}`) }}>XML</button></span>
              </div>
            ))}
          </Section>
        )}

        {tab === 'pay' && !movil && (
          <Section titulo="Mis recibos de nómina" ayuda="PDF para consultarlo o imprimirlo; XML es el CFDI timbrado para trámites." style="padding:22px 10px 4px">
            <div style={sx('overflow-x:auto')}>
              <table className="tbl">
                <thead><tr><th>Periodo</th><th>Fecha de pago</th><th style={sx('text-align:right')}>Percepciones</th><th style={sx('text-align:right')}>Deducciones</th><th style={sx('text-align:right')}>Neto</th><th>Descargar</th></tr></thead>
                <tbody>
                  {recibos.map(p => (
                    <tr key={p.periodo}><td>{p.periodo}</td><td className="mono">{p.pago}</td><td className="mono" style={sx('text-align:right')}>{money(p.percepciones)}</td><td className="mono" style={sx('text-align:right')}>{money(p.deducciones)}</td><td className="mono" style={sx('text-align:right;font-weight:500')}>{money(p.neto)}</td>
                      <td><span style={sx('display:flex;gap:8px')}><button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => { descargarReciboPDF(p); toast(`Recibo PDF descargado · ${p.periodo}`) }}>PDF</button><button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => { descargarReciboXML(p); toast(`CFDI XML descargado · ${p.periodo}`) }}>XML</button></span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {tab === 'docs' && (
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:16px')}>
            <Section titulo="Mis documentos" ayuda="Haz clic en uno para descargarlo. Si algo está por vencer, súbelo actualizado."
              acciones={<><input ref={docRef} type="file" accept="application/pdf,image/*" style={sx('display:none')} onChange={e => { const f = e.target.files?.[0]; if (f) subirDoc(f); e.target.value = '' }} /><button type="button" className="btn" style={sx('min-height:36px')} onClick={() => docRef.current?.click()}>Subir documento</button></>}>
              {docs.map(d => (
                <button key={d.n} type="button" title="Descargar" onClick={() => { descargarConstancia(d.n, ''); toast(`Descargando ${d.n} (PDF)`, 'info') }} style={sx('display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border:0;border-top:1px solid #EEF1F4;font-size:14px;background:none;cursor:pointer;font-family:inherit;color:inherit;text-align:left')}><span>{d.n}</span><span className={d.cls}>{d.s}</span></button>
              ))}
            </Section>
            <Section titulo="Pedir algo a RH" ayuda="Constancias, cartas o cambio de datos bancarios. Respuesta habitual: 1 día hábil.">
              <label className="field">¿Qué necesitas?<select value={tramite} onChange={e => setTramite(e.target.value)}>{TRAMITES.map(x => <option key={x}>{x}</option>)}</select></label>
              <label className="field">¿Para qué la necesitas?<input type="text" placeholder="Ej. trámite de crédito Infonavit" value={paraQue} onChange={e => setParaQue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviarTramite() }} /></label>
              <button type="button" className="btn" style={sx('align-self:flex-start;background:#E9EDFB;border-color:#C7D0F2')} onClick={enviarTramite}>Enviar a RH</button>
              {tramites.length > 0 && (
                <div style={sx('display:flex;flex-direction:column;gap:4px;border-top:1px solid #EEF1F4;padding-top:12px')}>
                  <span className="lbl">Mis trámites</span>
                  {tramites.map(t => (
                    <div key={t.id} style={sx('display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px;flex-wrap:wrap')}>
                      <span style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('font-weight:500')}>{t.tramite}</span><span style={sx('color:#5F6B7A;font-size:13px')}>{t.id} · {t.motivo || 'sin comentario'}</span></span>
                      <span style={sx('display:flex;gap:8px;align-items:center')}>
                        <span className={cls(t.estatus === 'Entregado' ? 'Aprobada' : t.estatus === 'Rechazado' ? 'Rechazada' : 'Pendiente')}>{t.estatus}</span>
                        {t.estatus === 'Entregado' && t.tramite.startsWith('Constancia') && <button type="button" className="btn" style={sx('min-height:34px;padding:0 12px')} onClick={() => { descargarConstancia(t.tramite, t.motivo); toast(`${t.tramite} descargada (PDF)`) }}>Descargar</button>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        <Link to={ROUTES.RH} style={sx('font-size:14px;align-self:center')}>Volver a la vista de Equipo (demo)</Link>
      </main>
    </div>
  )
}
