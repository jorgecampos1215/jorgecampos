import { Logo } from '../components/Logo'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Field, Modal, btnPriStyle, btnStyle, inputStyle, useToast } from '../components/ui'
import { ROUTES } from '../lib/routes'
import { actions } from '../lib/store'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { clientes } from '../data/seed'

/** Valores que el Cotizador manda a esta hoja (por query string `?d=` y por location.state). */
export type CotizacionPayload = {
  modelo: string
  info: [string, string][]
  items: { t: string; s: string; q: number; v: number | null }[]
  subtotal: number
  formato?: string
  folio?: string
  cliente?: string
  contacto?: string
  correo?: string
  telefono?: string
}

/** Valores del diseño (COT-1182 · Marsh · Méx–SLP nocturno). */
const DISENO: CotizacionPayload = {
  modelo: 'Custodia por evento',
  info: [
    ['Ruta', 'Tepotzotlán → San Luis Potosí'],
    ['Distancia y tiempo', '382 km · 4 h 40'],
    ['Salida', '8 oct 2026 · 22:00'],
    ['Nivel de riesgo', 'Alto · horario nocturno'],
  ],
  items: [
    { t: 'Custodios armados certificados', s: 'Turno nocturno, portación vigente y evaluación de confianza', q: 2, v: 15785 },
    { t: 'Unidad de custodia con GPS', s: 'Incluye combustible del trayecto', q: 1, v: 2685 },
    { t: 'Casetas de peaje', s: '6 casetas en ruta', q: 1, v: 2830 },
    { t: 'Monitoreo 24/7 desde centro de control', s: 'Seguimiento en vivo, alertas y protocolo de reacción', q: 1, v: null },
  ],
  subtotal: 21300,
  folio: 'COT-1182',
  cliente: 'Marsh',
}

const CSS = `
body{margin:0;background:#FFFFFF}
a{color:#0D1D41}a:hover{color:#5A3600}
.pdf-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;width:816px;max-width:100%;box-sizing:border-box;margin:0 auto;padding:16px 0}
.pdf-btn-pri:hover{color:#FFFFFF;background:#3448A8}
.pdf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.pdf-btn:hover{color:#0D1D41}
.pdf-btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.pdf-sheet{margin:0 auto 40px;box-shadow:0 1px 3px rgba(18,24,33,.08),0 8px 24px rgba(18,24,33,.08);border:1px solid #E4E8ED}
@page{size:letter;margin:0}
@media print{
  html,body{background:#FFFFFF !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pdf-bar,.pdf-nota{display:none !important}
  .pdf-wrap{background:#FFFFFF !important;padding:0 !important;min-height:0 !important}
  .pdf-sheet{margin:0 !important;box-shadow:none !important;border:0 !important;page-break-after:avoid;break-inside:avoid}
  /* Tablet y celular: la hoja se muestra escalada dentro de Shell; al imprimir vuelve a tamaño carta y se ocultan barra y menú */
  .pdf-escala{height:auto !important;overflow:visible !important}
  .pdf-sheet{transform:none !important}
  header:has(> button[aria-label="Abrir menú"]){display:none !important}
  main{padding:0 !important;display:block !important}
}
/* La hoja siempre se maqueta a tamaño carta: las reglas de celular de global.css (tabla a 13px, celdas a 8px) no deben alterarla */
.pdf-sheet table{font-size:inherit}
.pdf-sheet th,.pdf-sheet td{padding-left:12px !important;padding-right:12px !important}
`

/** Hoja carta del diseño: 816 × 1056 px (8.5 × 11 in a 96 dpi). */
const HOJA_ANCHO = 816
const HOJA_ALTO = 1056
const HOJA = "width:816px;height:1056px;box-sizing:border-box;padding:56px 72px 48px;background:#FFFFFF;color:#0D1D41;font-family:'Montserrat',system-ui,sans-serif;font-size:14px;line-height:1.5;display:flex;flex-direction:column;gap:22px"

/**
 * Escala de la hoja en tablet y celular: ancho disponible / 816, nunca mayor que 1.
 * La hoja conserva su maquetación de escritorio (alto fijo de 1056px) y se reduce con transform, que no cambia su caja de layout;
 * el contenedor toma el alto real de la hoja (incluido lo que asome por debajo) × escala para que nada quede recortado ni sobre espacio.
 */
function useEscalaHoja(activo: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const hojaRef = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  const [alto, setAlto] = useState(HOJA_ALTO)
  useLayoutEffect(() => {
    if (!activo) { setEscala(1); setAlto(HOJA_ALTO); return }
    const cont = ref.current, hoja = hojaRef.current
    if (!cont || !hoja) return
    const medir = () => { setEscala(Math.min(1, cont.clientWidth / HOJA_ANCHO)); setAlto(Math.max(HOJA_ALTO, hoja.offsetHeight, hoja.scrollHeight)) }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(cont); ro?.observe(hoja)
    window.addEventListener('resize', medir)
    return () => { ro?.disconnect(); window.removeEventListener('resize', medir) }
  }, [activo])
  return { ref, hojaRef, escala, alto }
}

const money = (n: number) => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function leer(search: URLSearchParams, state: unknown): CotizacionPayload | null {
  const ok = (p: unknown): p is CotizacionPayload =>
    !!p && typeof p === 'object' && Array.isArray((p as CotizacionPayload).items) && Array.isArray((p as CotizacionPayload).info) && typeof (p as CotizacionPayload).subtotal === 'number'
  if (ok(state)) return state
  const d = search.get('d')
  if (d) {
    try { const p = JSON.parse(d); if (ok(p)) return p } catch { /* query inválido: se usan los valores del diseño */ }
  }
  return null
}

export default function CotizacionPDF() {
  const [search] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  // Escritorio: hoja carta a tamaño real, como el diseño. Tablet y celular: Shell (barra superior con menú) y la hoja escalada al ancho disponible.
  const modo = useViewport()
  const compacto = modo !== 'escritorio'
  const movil = modo === 'movil'
  const { ref: escalaRef, hojaRef, escala, alto } = useEscalaHoja(compacto)
  const p = useMemo(() => leer(search, location.state) ?? DISENO, [search, location.state])
  // Contacto del cliente: lo que mandó el Cotizador o, si no, el de seed
  const seedCli = clientes.find(c => c.nombre === p.cliente)
  const contacto = p.contacto ?? seedCli?.contacto ?? '[NOMBRE DEL CONTACTO]'
  const correo = p.correo ?? seedCli?.correo ?? '[CORREO]'
  const telefono = p.telefono ?? seedCli?.telefono ?? '[TELÉFONO]'
  const folio = p.folio ?? 'COT-1182'
  const clienteNombre = p.cliente ?? 'Marsh'
  const [mail, setMail] = useState(false)
  const [para, setPara] = useState(correo)
  const [asunto, setAsunto] = useState(`Cotización ${folio} · ${p.modelo}`)
  const [msg, setMsg] = useState(`Estimado/a ${contacto}:\n\nAdjunto la cotización ${folio} (${p.modelo}) por ${money(p.subtotal)} MXN antes de IVA, vigente 15 días naturales.\n\nAI27 · Comercial`)
  const iva = Math.round(p.subtotal * 0.16 * 100) / 100
  const total = p.subtotal + iva

  const enviar = () => { setMail(false); toast(`Cotización ${folio} enviada a ${clienteNombre} (${para})`) }
  const copiar = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast('Liga de la cotización copiada al portapapeles', 'info') } catch { toast('No se pudo copiar la liga', 'warn') }
  }
  const aceptar = () => {
    const ruta = p.info.find(i => i[0] === 'Ruta')?.[1] ?? p.modelo
    const tipo = p.modelo.startsWith('Custodio dedicado') ? 'Dedicado' : p.modelo.startsWith('Monitoreo') ? 'Monitoreo' : 'Por evento'
    const id = actions.crearServicio({ cliente: clienteNombre, tipo, ruta, precio: p.subtotal })
    toast(`Cotización ${folio} aceptada: servicio ${id} creado. Ahora asigna custodios.`)
    navigate(ROUTES.AsignacionIA)
  }
  const td = 'padding:12px;border-bottom:1px solid #D5DBE3'
  const tdNum = "padding:12px;border-bottom:1px solid #D5DBE3;text-align:right;font-family:'IBM Plex Mono',monospace"
  // Dentro de la hoja los estilos son fijos (la hoja siempre mide 816px y se escala entera); sx() no debe reacomodar sus rejillas en celular.
  const hx = (css: string) => sx(css + ';--sx-fijo:1')

  const barra = (
      <div className="pdf-bar">
        <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
          <Link className="pdf-btn" to={ROUTES.Cotizador}>← Volver</Link>
          <span style={sx("display:flex;flex-direction:column;gap:1px;font-family:'Montserrat',sans-serif;color:#0D1D41")}>
            <span style={sx('font-weight:600;font-size:14px')}>Cotización {folio} · {clienteNombre}</span>
            <span style={sx('font-size:12px;color:#5F6B7A')}>Así la recibe el cliente{p.formato ? ` (${p.formato})` : ''}. Si la acepta, márcala aquí.</span>
          </span>
        </div>
        <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
          <button type="button" className="pdf-btn" onClick={copiar} title="Copiar la liga de esta cotización">Copiar liga</button>
          <button type="button" className="pdf-btn" onClick={() => setMail(true)}>Enviar</button>
          <button type="button" className="pdf-btn" onClick={() => { window.print(); toast(`${folio}.pdf listo para descargar / imprimir`, 'info') }}>Descargar PDF</button>
          <button type="button" className="pdf-btn pdf-btn-pri" onClick={aceptar}>Aceptada → asignar custodios</button>
        </div>
      </div>
  )

  const hoja = (
      <div ref={compacto ? hojaRef : undefined} className="pdf-sheet" style={sx(HOJA + (compacto ? `;--sx-fijo:1;transform:scale(${escala});transform-origin:top left` : ''))}>
        <header style={hx('display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:18px;border-bottom:3px solid #3448A8')}>
          <div style={hx('display:flex;align-items:center;gap:10px')}>
            <Logo height={31} />
            <div style={hx('display:flex;flex-direction:column;line-height:1.2')}>
              <span style={hx("font-family:'Montserrat',sans-serif;font-weight:700;font-size:24px")}>AI27</span>
              <span style={hx('font-size:12px;color:#5F6B7A')}>Seguridad y custodia de carga en tránsito</span>
            </div>
          </div>
          <div style={hx('display:flex;flex-direction:column;align-items:flex-end;gap:2px')}>
            <span style={hx("font-family:'Montserrat',sans-serif;font-size:22px;font-weight:600;letter-spacing:.04em")}>COTIZACIÓN</span>
            <span style={hx("font-family:'IBM Plex Mono',monospace;font-size:13px")}>{folio}</span>
          </div>
        </header>

        <section style={hx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px')}>
          <div style={hx('display:flex;flex-direction:column;gap:2px')}>
            <span style={hx('font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A')}>Cliente</span>
            <span style={hx('font-weight:600;font-size:16px')}>{clienteNombre}</span>
            <span>Atención: {contacto}</span>
            <span>{correo} · {telefono}</span>
          </div>
          <div style={hx('display:grid;grid-template-columns:auto 1fr;gap:2px 16px;align-content:start')}>
            <span style={hx('color:#5F6B7A')}>Fecha</span><span>7 de octubre de 2026</span>
            <span style={hx('color:#5F6B7A')}>Vigencia</span><span>15 días naturales</span>
            <span style={hx('color:#5F6B7A')}>Modelo</span><span>{p.modelo}</span>
            <span style={hx('color:#5F6B7A')}>Ejecutivo</span><span>[NOMBRE DEL EJECUTIVO]</span>
          </div>
        </section>

        <section style={hx('background:#F7F9FB;border:1px solid #E4E8ED;border-radius:8px;padding:14px 16px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px')}>
          {p.info.map(([k, v]) => (
            <div key={k} style={hx('display:flex;flex-direction:column')}><span style={hx('font-size:12px;color:#5F6B7A')}>{k}</span><span style={hx('font-weight:500')}>{v}</span></div>
          ))}
        </section>

        <table style={hx('width:100%;border-collapse:collapse')}>
          <thead>
            <tr style={hx('background:#0D1D41;color:#FFFFFF')}>
              <th style={hx('text-align:left;padding:10px 12px;font-weight:500;font-size:13px')}>Concepto</th>
              <th style={hx('text-align:right;padding:10px 12px;font-weight:500;font-size:13px')}>Cant.</th>
              <th style={hx('text-align:right;padding:10px 12px;font-weight:500;font-size:13px')}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map(it => (
              <tr key={it.t}><td style={hx(td)}><b style={hx('font-weight:600')}>{it.t}</b><br /><span style={hx('color:#3E4A59')}>{it.s}</span></td><td style={hx(tdNum)}>{it.q}</td><td style={hx(tdNum)}>{it.v == null ? 'Incluido' : money(it.v)}</td></tr>
            ))}
          </tbody>
        </table>

        <section style={hx('display:flex;justify-content:flex-end')}>
          <div style={hx("width:300px;display:grid;grid-template-columns:1fr auto;gap:6px 16px;font-family:'IBM Plex Mono',monospace")}>
            <span style={hx("font-family:'Montserrat',sans-serif;color:#3E4A59")}>Subtotal</span><span style={hx('text-align:right')}>{money(p.subtotal)}</span>
            <span style={hx("font-family:'Montserrat',sans-serif;color:#3E4A59")}>IVA 16%</span><span style={hx('text-align:right')}>{money(iva)}</span>
            <span style={hx("font-family:'Montserrat',sans-serif;font-weight:600;font-size:18px;border-top:2px solid #0D1D41;padding-top:8px")}>Total MXN</span><span style={hx('text-align:right;font-weight:600;font-size:18px;border-top:2px solid #0D1D41;padding-top:8px')}>{money(total)}</span>
          </div>
        </section>

        <section style={hx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px')}>
          <div style={hx('display:flex;flex-direction:column;gap:4px')}>
            <span style={hx("font-family:'Montserrat',sans-serif;font-weight:600;font-size:15px")}>Incluye</span>
            <span>Bitácora del servicio con evidencias fotográficas</span>
            <span>Acceso al portal para ver el servicio en vivo</span>
            <span>Reporte post-incidente en caso de evento</span>
          </div>
          <div style={hx('display:flex;flex-direction:column;gap:4px')}>
            <span style={hx("font-family:'Montserrat',sans-serif;font-weight:600;font-size:15px")}>Condiciones</span>
            <span>Precios en pesos mexicanos más IVA</span>
            <span>Forma de pago: [CONDICIONES DE PAGO]</span>
            <span>Cancelación: [POLÍTICA DE CANCELACIÓN]</span>
          </div>
        </section>

        <section style={hx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px;margin-top:auto')}>
          <div style={hx('display:flex;flex-direction:column;gap:4px;border-top:1px solid #0D1D41;padding-top:8px')}><span style={hx('font-weight:600')}>Acepta por el cliente</span><span style={hx('color:#3E4A59')}>Nombre, firma y fecha</span></div>
          <div style={hx('display:flex;flex-direction:column;gap:4px;border-top:1px solid #0D1D41;padding-top:8px')}><span style={hx('font-weight:600')}>Por AI27</span><span style={hx('color:#3E4A59')}>[NOMBRE Y CARGO]</span></div>
        </section>

        <footer style={hx('display:flex;justify-content:space-between;gap:16px;font-size:12px;color:#5F6B7A;border-top:1px solid #E4E8ED;padding-top:10px')}>
          <span>AI27 · [DIRECCIÓN FISCAL]</span><span>[TELÉFONO] · ai27.com</span><span>Página 1 de 1</span>
        </footer>
      </div>
  )

  const modal = (
      <Modal open={mail} onClose={() => setMail(false)} title={`Enviar ${folio} por correo`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMail(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={enviar}>Enviar correo</button></>}>
        <Field label="Para"><input style={sx(inputStyle)} value={para} onChange={e => setPara(e.target.value)} /></Field>
        <Field label="Asunto"><input style={sx(inputStyle)} value={asunto} onChange={e => setAsunto(e.target.value)} /></Field>
        <Field label="Mensaje"><textarea rows={6} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={msg} onChange={e => setMsg(e.target.value)} /></Field>
        <span style={sx("font:400 13px 'Montserrat',sans-serif;color:#5F6B7A")}>Adjunto: {folio}.pdf · {money(total)} MXN con IVA</span>
      </Modal>
  )

  if (compacto) {
    // La hoja mantiene sus 816px y se reduce con transform; el contenedor mide el ancho disponible y recorta el alto sobrante.
    return (
      <Shell active="cotizador" css={CSS}>
        {barra}
        {movil && <span className="pdf-nota" style={sx("font:400 13px 'Montserrat',sans-serif;color:#5F6B7A")}>Vista previa a escala ({Math.round(escala * 100)}%). Descarga el PDF para leerla a tamaño completo.</span>}
        <div ref={escalaRef} className="pdf-escala" style={sx(`width:100%;height:${Math.ceil(alto * escala)}px;overflow:hidden`)}>
          {hoja}
        </div>
        {modal}
      </Shell>
    )
  }

  return (
    <div className="pdf-wrap" style={sx('background:#F6F7F9;min-height:100vh;padding:0 16px;box-sizing:border-box')}>
      <style>{CSS}</style>
      {barra}
      {hoja}
      {modal}
    </div>
  )
}
