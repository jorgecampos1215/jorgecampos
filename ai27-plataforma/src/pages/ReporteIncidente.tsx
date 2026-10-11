import { Logo } from '../components/Logo'
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { Shell } from '../components/Shell'
import { PageHeader, Section, Nota } from '../components/Page'
import { ROUTES } from '../lib/routes'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { useToast } from '../components/ui'
import { casoPorId, fmt } from '../data/reaccion'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:600 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn:hover{background:#F3F5F8}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}.btn-pri:hover{background:#3448A8}
@media print{
  @page{size:letter;margin:12mm}
  html,body{background:#FFFFFF !important}
  .ri-noprint{display:none !important}
  .ri-wrap{display:block !important;background:#FFFFFF !important;min-height:0 !important}
  .ri-main{padding:0 !important;display:block !important}
  /* Tablet y celular: la pantalla se arma con Shell (barra superior + <main>); al imprimir se ocultan igual que el sidebar */
  header:has(> button[aria-label="Abrir menú"]){display:none !important}
  main{padding:0 !important;display:block !important}
  .ri-doc{border:0 !important;border-radius:0 !important;padding:0 !important;max-width:none !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .ri-doc section,.ri-doc table tr{break-inside:avoid}
}
`

const TL0 = [
  { t: '14:30', x: 'Alerta automática de desvío de ruta (Samsara)' },
  { t: '14:31', x: 'Incidente abierto por el monitorista; custodio reporta cierre del paso' },
  { t: '14:34', x: 'Aviso a Guardia Nacional y C5 Edomex' },
  { t: '14:39', x: 'Tráiler detenido; motor apagado de forma remota' },
  { t: '14:47', x: 'Unidad de reacción R-03 y autoridades en sitio' },
  { t: '15:40', x: 'Carga inspeccionada y servicio reanudado' },
]
const EVID0 = ['Foto de sellos', 'Recorrido del replay', 'Acta del MP']
const EVID = 'aspect-ratio:4/3;background:#F3F5F8;border:1px dashed #C3CBD5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#5F6B7A'
const H3 = "margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600"

export default function ReporteIncidente() {
  const toast = useToast()
  // Escritorio: sidebar + hoja, como el diseño. Tablet y celular: Shell (barra superior con menú) y la hoja con menos margen interior.
  const modo = useViewport()
  const compacto = modo !== 'escritorio'
  const movil = modo === 'movil'
  const [search] = useSearchParams()
  const caso = casoPorId(search.get('inc'))
  const [sent, setSent] = useState<Record<string, boolean>>({})
  const [evid, setEvid] = useState<Record<string, string[]>>({})
  const [firma, setFirma] = useState('')
  const [tel, setTel] = useState('')
  const evidRef = useRef<HTMLInputElement>(null)
  const evidIdx = useRef(0)
  const enviado = !!sent[caso.id]
  const volverTo = caso.esPrincipal ? ROUTES.Reaccion : `${ROUTES.Reaccion}?inc=${caso.id}`
  // Línea de tiempo: la del diseño para el caso principal; para los demás, la bitácora completa del caso (hasta 7 hitos)
  const TL = caso.esPrincipal ? TL0 : [...caso.log, ...(caso.log.length < 7 ? [caso.stepLog[4]] : [])].filter(Boolean).slice(0, 8).map(l => ({ t: l.t, x: l.text }))
  const evids = evid[caso.id] ?? EVID0
  const enviar = () => { setSent(s => ({ ...s, [caso.id]: true })); toast(`Reporte ${caso.id} enviado al portal y por correo a ${caso.cliente}`) }
  const descargar = () => { toast(`Generando PDF del reporte ${caso.id}…`, 'info'); setTimeout(() => window.print(), 150) }

  const contenido = (
    <>
      <div className="ri-noprint">
        <PageHeader seccion="Operación · Incidentes · paso final" titulo="Reporte para el cliente"
          descripcion={`Documento listo para ${caso.cliente}: qué pasó, cómo se atendió y qué recomendamos. Revísalo, descárgalo o envíalo.`}
          accion={{ label: enviado ? 'Reenviar al cliente' : 'Enviar al cliente', onClick: enviar }}
          secundarias={<>
            <Link className="btn" to={volverTo}>‹ Volver al incidente</Link>
            <button type="button" className="btn" onClick={descargar}>Descargar PDF</button>
          </>}>
          {enviado && <span className="pill" style={sx('display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#E3F6EC;color:#17784A;align-self:flex-start')}>Enviado al portal y correo de {caso.cliente}</span>}
        </PageHeader>
      </div>

      <article className="ri-doc" style={sx('background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;max-width:880px;width:100%;box-sizing:border-box;padding:' + (movil ? '24px 18px' : compacto ? '36px 32px' : '56px 64px') + ';display:flex;flex-direction:column;gap:' + (movil ? 20 : 28) + 'px;align-self:center')}>
        <div style={sx('display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start;border-bottom:2px solid #0D1D41;padding-bottom:20px')}>
          <div style={sx('display:flex;align-items:center;gap:10px')}>
            <Logo height={26} />
            <span style={sx("font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px")}>AI27</span>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:2px;text-align:right;font-size:13px;color:#3E4A59')}>
            <span className="mono">{caso.id} · {caso.servicio}</span><span>Emitido {caso.cerrado}</span>
          </div>
        </div>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Reporte post-incidente</span>
          <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:26px;font-weight:600;text-wrap:balance")}>{caso.tituloReporte}</h2>
          <span style={sx('font-size:15px;color:#3E4A59')}>Para: {caso.cliente} · Gerencia de logística y seguridad corporativa</span>
        </div>
        <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:16px;background:#F7F9FB;border-radius:8px;padding:18px')}>
          <div><dt className="lbl">Ruta</dt><dd style={sx('margin:4px 0 0')}>{caso.ruta}</dd></div>
          <div><dt className="lbl">Ubicación</dt><dd style={sx('margin:4px 0 0')}>{caso.ubicacion}</dd></div>
          <div><dt className="lbl">Valor de la carga</dt><dd className="mono" style={sx('margin:4px 0 0')}>{fmt(caso.valor)}</dd></div>
          <div><dt className="lbl">Recuperado</dt><dd className="mono" style={sx('margin:4px 0 0;color:' + (caso.recuperado > 0 ? '#17784A' : '#B42318'))}>{fmt(caso.recuperado)}</dd></div>
          <div><dt className="lbl">Respuesta en sitio</dt><dd style={sx('margin:4px 0 0')}>{caso.minutos.sitio} minutos</dd></div>
          <div><dt className="lbl">Denuncia</dt><dd className="mono" style={sx('margin:4px 0 0;overflow-wrap:anywhere')}>{caso.denuncia}</dd></div>
        </dl>
        <section style={sx('display:flex;flex-direction:column;gap:10px')}>
          <h3 style={sx(H3)}>Resumen</h3>
          <p style={sx('margin:0;font-size:16px;line-height:1.6;text-wrap:pretty')}>{caso.resumen}</p>
        </section>
        <section style={sx('display:flex;flex-direction:column;gap:10px')}>
          <h3 style={sx(H3)}>Línea de tiempo</h3>
          <table style={sx('width:100%;border-collapse:collapse;font-size:15px')}>
            <tbody>
              {TL.map((t, i) => (
                <tr key={t.t + i}><td className="mono" style={sx('padding:9px 16px 9px 0;border-bottom:1px solid #E4E8ED;width:70px;color:#3E4A59;vertical-align:top')}>{t.t}</td><td style={sx('padding:9px 0;border-bottom:1px solid #E4E8ED')}>{t.x}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section style={sx('display:flex;flex-direction:column;gap:10px')}>
          <h3 style={sx(H3)}>Evidencias</h3>
          <input ref={evidRef} type="file" accept="image/*,application/pdf" className="ri-noprint" style={sx('display:none')} onChange={e => { const f = e.target.files?.[0]; if (f) { const ev = evids.slice(); ev[evidIdx.current] = f.name; setEvid(x => ({ ...x, [caso.id]: ev })); toast(`Evidencia agregada al reporte: ${f.name}`) }; e.target.value = '' }} />
          {/* En pantallas chicas las 3 casillas se quedan en una fila (auto-fit las reparte); sx() volvería "repeat(3,…)" una sola columna */}
          <div style={sx('display:grid;grid-template-columns:' + (compacto ? 'repeat(auto-fit,minmax(min(90px,100%),1fr))' : 'repeat(3,minmax(0,1fr))') + ';gap:12px')}>
            {evids.map((e, i) => (
              <button key={i} type="button" title="Adjuntar o reemplazar evidencia" onClick={() => { evidIdx.current = i; evidRef.current?.click() }} style={sx(EVID + ';cursor:pointer;font-family:inherit;padding:8px;overflow:hidden;word-break:break-word;text-align:center' + (EVID0.includes(e) ? '' : ';background:#E3F6EC;border-style:solid'))}>{e}</button>
            ))}
          </div>
          <span className="ri-noprint" style={sx('font-size:12px;color:#5F6B7A')}>Haz clic en una casilla para adjuntar o reemplazar la evidencia antes de enviar.</span>
        </section>
        <section style={sx('display:flex;flex-direction:column;gap:10px')}>
          <h3 style={sx(H3)}>Recomendaciones</h3>
          <p style={sx('margin:0;font-size:16px;line-height:1.6;text-wrap:pretty')}>{caso.recomendacion}</p>
        </section>
        <div style={sx('display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-top:1px solid #E4E8ED;padding-top:18px;font-size:14px;color:#3E4A59')}>
          <span style={sx('display:flex;gap:6px;align-items:center;flex-wrap:wrap')}>Coordinación de Reacción AI27 ·
            <input value={firma} onChange={e => setFirma(e.target.value)} placeholder="[NOMBRE Y FIRMA]" aria-label="Nombre y firma" style={sx("border:0;border-bottom:1px dashed #C3CBD5;background:transparent;font:inherit;color:inherit;padding:0 2px;min-width:160px")} /></span>
          <span style={sx('display:flex;gap:6px;align-items:center')}>Contacto 24/7:
            <input value={tel} onChange={e => setTel(e.target.value)} placeholder="[TELÉFONO]" aria-label="Teléfono de contacto" style={sx("border:0;border-bottom:1px dashed #C3CBD5;background:transparent;font:inherit;color:inherit;padding:0 2px;min-width:120px")} /></span>
        </div>
      </article>

      <div className="ri-noprint" style={sx('max-width:880px;width:100%;align-self:center')}>
        <Section titulo="Qué más puedes ver" ayuda="Atajos a las demás áreas de la plataforma una vez cerrado el incidente." plegable abierto={false}>
          <nav aria-label="Siguiente en el demo" style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
            <Link className="btn" to={ROUTES.Flotilla}>Flotilla</Link>
            <Link className="btn" to={ROUTES.RH}>Equipo</Link>
            <Link className="btn" to={ROUTES.Finanzas}>Rentabilidad</Link>
            <Link className="btn" to={ROUTES.Flujo}>Ver flujo completo</Link>
          </nav>
          <Nota>El reporte queda guardado en el expediente del servicio {caso.servicio} y en el portal del cliente.</Nota>
        </Section>
      </div>
    </>
  )

  if (compacto) return <Shell active="reaccion" css={CSS}>{contenido}</Shell>

  return (
    <div className="ri-wrap" style={sx("font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41;background:#F6F7F9;min-height:100vh;display:flex;flex-wrap:wrap")}>
      <style>{CSS}</style>
      <div className="ri-noprint" style={sx('flex:1 1 240px;background:#FFFFFF;border-right:1px solid #EEF1F4')}>
        <Nav active="reaccion" />
      </div>
      <main className="ri-main" style={sx('flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px')}>
        {contenido}
      </main>
    </div>
  )
}
