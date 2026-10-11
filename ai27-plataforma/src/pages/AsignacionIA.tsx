import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Nota, PageHeader, Pasos, Section } from '../components/Page'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { ROUTES } from '../lib/routes'
import { actions, useStore, type DecisionIA } from '../lib/store'
import { Modal, Field, inputStyle, btnStyle, btnPriStyle, useToast } from '../components/ui'
import { SERVICIO, FACTORES, candidatos, resumenEvaluacion, riesgoRuta, unidadesDisponibles, type Candidato } from '../data/asignacion'
import { coberturaPorZona, sugerirCobertura, PICOS_48H, type Cobertura } from '../data/cobertura'
import type { Zona } from '../data/seed'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select,.field input{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif}
.track{height:6px;border-radius:3px;background:#EBEEF2;overflow:hidden}
.gap{cursor:pointer;border:1px solid transparent;text-align:left;font:inherit;color:inherit}.gap:hover{border-color:#475CC7}
.btn-ok{background:#E3F6EC;border-color:#9ED9BC;color:#17784A}.btn-ok:hover{background:#D5F0E1}
.lnk{background:none;border:0;padding:0;font:inherit;font-size:13px;color:#3448A8;cursor:pointer;text-decoration:underline;text-align:left}
`

type Dec = 'Asignado' | 'Descartado'
const bar = (v: number) => 'height:100%;width:' + v + '%;background:' + (v >= 80 ? '#4CC38A' : v >= 60 ? '#3FA7C9' : '#475CC7')
const PASO = 4
/** Primera frase del "porqué" (el resto se ve con "Ver por qué"). */
const frase = (s: string) => { const m = s.match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : s }

/** Última decisión registrada por custodio para este servicio (el store guarda la más reciente primero). */
function desdeStore(decs: DecisionIA[], lista: Candidato[]): Record<string, Dec> {
  const out: Record<string, Dec> = {}
  for (const d of decs) {
    if (d.servicio !== SERVICIO.id) continue
    const c = lista.find(x => x.name === d.custodio)
    if (c && !out[c.id]) out[c.id] = d.decision === 'aceptada' ? 'Asignado' : 'Descartado'
  }
  return out
}

type Hueco = { key: string; zona: Zona; titulo: string; diff: number; cls: string; text: string; cob?: Cobertura }

export default function AsignacionIA() {
  const navigate = useNavigate()
  const toast = useToast()
  // Pantallas chicas: el bloque de puntaje/acciones de cada candidato pasa a fila completa y el panel lateral deja de ser sticky.
  const modo = useViewport()
  const movil = modo === 'movil'
  const tablet = modo === 'tablet'
  const LIST = useMemo(() => candidatos(), [])
  const resumen = useMemo(() => resumenEvaluacion(), [])
  const riesgo = useMemo(() => riesgoRuta(), [])
  const UNIDADES = useMemo(() => unidadesDisponibles(), [])
  const cobertura = useMemo(() => coberturaPorZona(), [])
  const decisiones = useStore(s => s.decisiones)
  const [dec, setDec] = useState<Record<string, Dec>>(() => desdeStore(decisiones, LIST))
  const [visibles, setVisibles] = useState(PASO)
  const [soloCumplen, setSoloCumplen] = useState(false)
  const [editar, setEditar] = useState(false)
  const [detalle, setDetalle] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ cliente: SERVICIO.cliente, origen: SERVICIO.origen, destino: SERVICIO.destino, fecha: SERVICIO.fecha, salida: SERVICIO.salida, custodios: String(SERVICIO.custodios), unidades: String(SERVICIO.unidades) })
  const [unidadId, setUnidadId] = useState(UNIDADES[0]?.id ?? 'AU-2087')
  const [modal, setModal] = useState<'unidad' | Hueco | null>(null)
  const [cubiertos, setCubiertos] = useState<Record<string, string>>({})

  const requeridos = Math.max(1, parseInt(form.custodios) || 1)
  const lista = soloCumplen ? LIST.filter(c => c.cumple) : LIST
  const mostrados = lista.slice(0, visibles)
  const unidad = UNIDADES.find(u => u.id === unidadId) ?? UNIDADES[0]

  const set = (c: Candidato, v: Dec) => {
    if (dec[c.id] === v) return
    setDec(d => ({ ...d, [c.id]: v }))
    actions.registrarDecision({ servicio: SERVICIO.id, custodio: c.name, decision: v === 'Asignado' ? 'aceptada' : 'descartada' })
    toast(v === 'Asignado' ? `${c.name} asignado a ${SERVICIO.id}` : `${c.name} descartado · la decisión alimenta al modelo`, v === 'Asignado' ? 'ok' : 'info')
  }
  const assigned = LIST.filter(c => dec[c.id] === 'Asignado')
  const faltan = Math.max(0, requeridos - assigned.length)
  const top = LIST.slice(0, requeridos)
  const nombres = (cs: Candidato[]) => cs.map(c => c.name.split(' ')[0]).reduce((acc, n, i, arr) => (i === 0 ? n : acc + (i === arr.length - 1 ? (/^[iíIÍ]/.test(n) ? ' e ' : ' y ') : ', ') + n), '')

  const asignarSugeridos = () => {
    const pendientes = top.filter(c => dec[c.id] !== 'Asignado')
    if (!pendientes.length) { toast('Los custodios sugeridos ya están asignados', 'info'); return }
    setDec(d => { const n = { ...d }; pendientes.forEach(c => { n[c.id] = 'Asignado' }); return n })
    pendientes.forEach(c => actions.registrarDecision({ servicio: SERVICIO.id, custodio: c.name, decision: 'aceptada' }))
    toast(`${nombres(pendientes)} asignado${pendientes.length > 1 ? 's' : ''} a ${SERVICIO.id} siguiendo la sugerencia de la IA`)
  }

  const confirmar = () => {
    if (faltan > 0) { toast(`Asigna ${faltan} custodio${faltan > 1 ? 's' : ''} más antes de confirmar`, 'warn'); return }
    actions.crearServicio({ cliente: form.cliente, tipo: 'Por evento', ruta: `${form.origen.split(',')[0]}–${form.destino.split(',')[0]}`, precio: 38500 })
    toast(`${SERVICIO.id} confirmado con ${nombres(assigned)} y unidad ${unidad?.id}. Pasando al mapa en vivo.`)
    navigate(ROUTES.Monitoreo)
  }

  const huecos: Hueco[] = useMemo(() => {
    const porZona: Hueco[] = cobertura.map(c => {
      const sug = c.diff < 0 ? sugerirCobertura(c.zona, -c.diff, cobertura) : []
      const text = c.diff < 0
        ? `${c.requeridos} servicios agendados, ${c.disponibles} custodios disponibles.${sug.length ? ' Sugerencia: mover ' + sug.map(s => `${s.n} de ${s.zona}`).join(', ').replace(/, ([^,]*)$/, ' y $1') + '.' : ' Sin excedente cercano: considerar horas extra.'}`
        : c.diff === 0 ? `${c.requeridos} servicios agendados, ${c.disponibles} disponibles: cobertura justa, sin reserva.`
        : `Cobertura completa con ${c.diff} custodio${c.diff > 1 ? 's' : ''} de reserva${c.diff >= 5 ? ' · excedente disponible para apoyar a otras zonas' : ''}.`
      return { key: c.zona, zona: c.zona, titulo: `${c.zona} · mañana`, diff: c.diff, cls: c.diff < 0 ? 'pill p-bad' : c.diff === 0 ? 'pill p-warn' : 'pill p-ok', text, cob: c }
    })
    const picos: Hueco[] = PICOS_48H.map(p => {
      const c = cobertura.find(x => x.zona === p.zona)!
      const diff = c.disponibles - c.vacaciones - p.eventos
      return { key: p.zona + p.dia, zona: p.zona, titulo: `${p.zona} · ${p.dia}`, diff, cls: diff < 0 ? 'pill p-bad' : diff === 0 ? 'pill p-warn' : 'pill p-ok', text: `Pico de ${p.cliente} (${p.eventos} eventos). ${c.vacaciones} custodio${c.vacaciones === 1 ? '' : 's'} con vacaciones aprobadas.`, cob: c }
    })
    return [...porZona, ...picos].sort((a, b) => a.diff - b.diff)
  }, [cobertura])
  const huecosRojos = huecos.filter(h => h.diff < 0 && !cubiertos[h.key]).length

  const cubrir = (h: Hueco) => {
    const sug = sugerirCobertura(h.zona, -h.diff, cobertura)
    const txt = sug.length ? sug.map(s => `${s.n} de ${s.zona}`).join(', ').replace(/, ([^,]*)$/, ' y $1') : 'horas extra autorizadas'
    setCubiertos(c => ({ ...c, [h.key]: txt }))
    toast(`Hueco en ${h.titulo} cubierto: ${txt}. Se notificó a los coordinadores de zona.`)
    setModal(null)
  }

  const riesgoPill = riesgo.factor >= 1.4 ? 'pill p-bad' : riesgo.factor >= 1.2 ? 'pill p-warn' : 'pill p-ok'
  const riesgoTxt = riesgo.factor >= 1.4 ? 'Alto' : riesgo.factor >= 1.2 ? 'Medio' : 'Bajo'
  const dato = 'display:flex;flex-direction:column;gap:2px;min-width:0'
  const val = 'font-size:14px;font-weight:600;color:#0D1D41;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'

  return (
    <Shell active="ia" css={CSS}>
      <PageHeader
        seccion={`Operación · ${SERVICIO.id}`}
        titulo="Asignar custodios"
        descripcion="La IA ordena a los custodios disponibles para este servicio; tú eliges quién va y con qué unidad, y pasas al mapa en vivo."
        accion={{ label: 'Confirmar y pasar al mapa en vivo', onClick: confirmar }}
      >
        <Pasos actual={2} />
      </PageHeader>

      {/* Resumen compacto del servicio */}
      <Section titulo={`Servicio ${SERVICIO.id} · ${form.cliente}`} ayuda="Viene de la cotización COT-1182 aceptada; nada se vuelve a capturar." style="padding:16px 18px;gap:12px"
        acciones={<button type="button" className="btn" style={sx('min-height:34px;font-size:13px')} onClick={() => setEditar(e => !e)}>{editar ? 'Listo' : 'Editar datos'}</button>}>
        {!editar ? (
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:12px 20px')}>
            <div style={sx(dato)}><span className="lbl">Ruta</span><span style={sx(val)} title={`${form.origen} → ${form.destino}`}>{form.origen.split(',')[0]} → {form.destino.split(',')[0]}</span></div>
            <div style={sx(dato)}><span className="lbl">Salida</span><span style={sx(val)}>{form.fecha} · {form.salida}</span></div>
            <div style={sx(dato)}><span className="lbl">Se necesitan</span><span style={sx(val)}>{requeridos} custodio{requeridos > 1 ? 's' : ''} · {form.unidades} unidad{parseInt(form.unidades) > 1 ? 'es' : ''}</span></div>
            <div style={sx(dato)}><span className="lbl">Riesgo de la ruta</span><span className={riesgoPill} style={sx('align-self:flex-start')}>{riesgoTxt} · {riesgo.factor.toFixed(1)}</span></div>
            <div style={sx(dato)}><span className="lbl">Pide el cliente</span><span style={sx('font-size:13px;color:#3E4A59')}>Portación vigente · confianza &lt; 12 meses · experiencia en alto valor</span></div>
          </div>
        ) : (
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:12px')}>
            <label className="field">Cliente<input type="text" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} /></label>
            <label className="field">Origen<input type="text" value={form.origen} onChange={e => setForm(f => ({ ...f, origen: e.target.value }))} /></label>
            <label className="field">Destino<input type="text" value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} /></label>
            <label className="field">Fecha<input type="text" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></label>
            <label className="field">Salida<input type="text" value={form.salida} onChange={e => setForm(f => ({ ...f, salida: e.target.value }))} /></label>
            <label className="field">Custodios<input type="number" min={1} max={4} value={form.custodios} onChange={e => setForm(f => ({ ...f, custodios: e.target.value }))} /></label>
            <label className="field">Unidades<input type="number" min={1} max={3} value={form.unidades} onChange={e => setForm(f => ({ ...f, unidades: e.target.value }))} /></label>
          </div>
        )}
        <Nota>Riesgo {riesgo.factor.toFixed(1)}: {SERVICIO.carretera} de noche acumula {riesgo.n} incidentes en el trimestre ({riesgo.nocturnos} entre 23:00 y 03:00); por eso se piden custodios con experiencia. <Link to={ROUTES.Reaccion}>Ver incidentes</Link></Nota>
      </Section>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        {/* Ranking */}
        <section aria-label="Ranking de candidatos" data-tour="ranking" style={sx('flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:12px')}>
          <div className="card" style={sx('display:flex;gap:14px;align-items:center;flex-wrap:wrap;border-color:#C7D0F2;background:#F0F3FD;padding:14px 18px')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475CC7" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
            <div style={sx('flex:1 1 320px;display:flex;flex-direction:column;gap:2px;min-width:0')}>
              <span style={sx('font-weight:600;font-size:14px')}>La IA recomienda: {top.map(c => c.name).join(' + ')} con la unidad {unidad?.id}</span>
              <span style={sx('font-size:13px;color:#3E4A59')}>Revisó {resumen.zona} custodios de {SERVICIO.zona} y {resumen.apoyo} de {SERVICIO.zonaApoyo}: {resumen.disponibles} están libres y {resumen.cumplen} cumplen todo lo que pide el cliente. Abajo van ordenados de mejor a peor.</span>
            </div>
            <button type="button" className="btn" style={sx('min-height:36px')} onClick={asignarSugeridos}>Asignar a {nombres(top)}</button>
          </div>

          <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
            <span style={sx('font-size:13px;color:#5F6B7A')}>Mostrando {mostrados.length} de {lista.length} candidatos libres en {SERVICIO.zona} y {SERVICIO.zonaApoyo}.</span>
            <label style={sx('display:flex;gap:8px;align-items:center;font-size:13px;color:#3E4A59;cursor:pointer')}><input type="checkbox" checked={soloCumplen} onChange={e => { setSoloCumplen(e.target.checked); setVisibles(PASO) }} style={sx('accent-color:#475CC7')} />Solo quienes cumplen todos los requisitos ({LIST.filter(c => c.cumple).length})</label>
          </div>

          {mostrados.length === 0 && <div className="card" style={sx('color:#5F6B7A;font-size:14px')}>Nadie cumple todos los requisitos con este filtro. Quita el filtro o revisa los requisitos del cliente.</div>}

          {mostrados.map((c, i) => {
            const d = dec[c.id]
            const abierto = !!detalle[c.id]
            return (
              <article key={c.id} className="card" style={sx('padding:16px 18px;' + (d === 'Asignado' ? 'border-color:#9ED9BC;background:#FBFEFC' : d === 'Descartado' ? 'opacity:.55' : ''))}>
                <div style={sx('display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start')}>
                  <span style={sx('width:44px;height:44px;border-radius:50%;background:#E9EDFB;display:flex;align-items:center;justify-content:center;font-weight:600;color:#0D1D41;flex:none')}>{c.name.split(' ').map(s => s[0]).join('')}</span>
                  <div style={sx('flex:1 1 260px;display:flex;flex-direction:column;gap:4px;min-width:0')}>
                    <div style={sx('display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
                      <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>#{i + 1}</span>
                      <Link to={ROUTES.Custodios} style={sx('font-weight:600;font-size:16px;color:inherit;text-decoration:none')} title="Abrir expediente">{c.name}</Link>
                      <span className="pill p-mute">{c.base}</span>
                      {!c.cumple && <span className="pill p-warn" title="No cumple todos los requisitos del cliente">Revisar requisitos</span>}
                      {d && <span className={d === 'Asignado' ? 'pill p-ok' : 'pill p-mute'}>{d}</span>}
                    </div>
                    <span style={sx('font-size:14px;color:#3E4A59;text-wrap:pretty')}>{abierto ? c.why : frase(c.why)}</span>
                    {abierto && (
                      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(120px,100%),1fr));gap:10px;margin-top:6px')}>
                        {c.f.map((v, j) => (
                          <div key={j} title={FACTORES[j] + ': ' + v + '/100'} style={sx('display:flex;flex-direction:column;gap:4px')}><span style={sx('font-size:12px;color:#5F6B7A')}>{FACTORES[j]} · <span className="mono">{v}</span></span><div className="track"><div style={sx(bar(v))}></div></div></div>
                        ))}
                      </div>
                    )}
                    <button type="button" className="lnk" onClick={() => setDetalle(x => ({ ...x, [c.id]: !abierto }))}>{abierto ? 'Ocultar detalle' : 'Ver por qué'}</button>
                  </div>
                  <div style={sx(movil ? 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;width:100%' : 'display:flex;flex-direction:column;align-items:flex-end;gap:8px')}>
                    <span style={sx(movil ? 'display:flex;align-items:baseline;gap:6px' : 'display:flex;flex-direction:column;align-items:flex-end')}><span style={sx("font-family:'Montserrat',sans-serif;font-size:28px;font-weight:700;line-height:1")} title="Promedio de cercanía, descanso, experiencia y desempeño">{c.score}</span><span style={sx('font-size:11px;color:#5F6B7A')}>puntos de 100</span></span>
                    <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                      <button type="button" className={'btn' + (d === 'Asignado' ? ' btn-ok' : '')} aria-pressed={d === 'Asignado'} onClick={() => set(c, 'Asignado')}>{d === 'Asignado' ? 'Asignado ✓' : 'Asignar'}</button>
                      <button type="button" className="btn" aria-pressed={d === 'Descartado'} onClick={() => set(c, 'Descartado')}>Descartar</button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}

          <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
            {visibles < lista.length && <button type="button" className="btn" onClick={() => setVisibles(v => Math.min(lista.length, v + PASO))}>Ver más candidatos ({lista.length - visibles} más)</button>}
            {visibles > PASO && <button type="button" className="btn" onClick={() => setVisibles(PASO)}>Ver menos</button>}
          </div>
        </section>

        {/* Unidad sugerida + avance */}
        <aside style={sx(movil ? 'flex:1 1 300px;display:flex;flex-direction:column;gap:14px'
          : tablet ? 'flex:1 1 300px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start'
          : 'flex:1 1 300px;max-width:380px;display:flex;flex-direction:column;gap:14px;position:sticky;top:20px')}>
          <Section titulo="Unidad sugerida" ayuda="El vehículo de AI27 que acompaña el viaje." style="padding:16px 18px;gap:10px">
            <span style={sx('font-weight:600;font-size:15px')}>{unidad ? `${unidad.id} · ${unidad.vehiculo}` : 'Sin unidades disponibles'}</span>
            <span style={sx('font-size:13px;color:#5F6B7A')}>{unidad?.id === 'AU-2087' ? 'En Tepotzotlán, a 6 km del origen · seguro y verificación vigentes · 4,200 km de uso' : unidad ? `${unidad.zona} · ${unidad.placas} · GPS ${unidad.gps} · póliza ${unidad.poliza} · ${unidad.km.toLocaleString('es-MX')} km` : ''}</span>
            <button type="button" className="btn" style={sx('align-self:flex-start;min-height:34px;font-size:13px')} onClick={() => setModal('unidad')}>Cambiar unidad ({UNIDADES.length} disponibles)</button>
          </Section>
          <Section titulo="Avance" ayuda={`${assigned.length} de ${requeridos} custodios asignados`} style="padding:16px 18px;gap:10px">
            <div className="track" style={sx('height:8px')}><div style={sx('height:100%;width:' + Math.min(100, Math.round(assigned.length / requeridos * 100)) + '%;background:#4CC38A')}></div></div>
            {assigned.length > 0 ? (
              <div style={sx('display:flex;flex-wrap:wrap;gap:6px')}>{assigned.map(c => <span key={c.id} className="pill p-ok">{c.name}</span>)}{unidad && <span className="pill p-info">{unidad.id}</span>}</div>
            ) : <span style={sx('font-size:14px;color:#3E4A59')}>Sin custodios asignados todavía.</span>}
            <Nota>{faltan > 0 ? `Falta${faltan > 1 ? 'n' : ''} ${faltan} custodio${faltan > 1 ? 's' : ''}. Cuando estén todos, usa "Confirmar y pasar al mapa en vivo" arriba a la derecha.` : 'Equipo completo. Confirma arriba a la derecha para empezar a monitorear.'} Cada decisión queda registrada y mejora las siguientes sugerencias.</Nota>
          </Section>
        </aside>
      </div>

      <Section titulo={`Huecos de cobertura · próximas 48 h${huecosRojos ? ` (${huecosRojos} zona${huecosRojos > 1 ? 's' : ''} sin cubrir)` : ''}`} ayuda="Zonas donde mañana faltan custodios para los servicios agendados. Haz clic en una zona para ver quién hay y cubrirla." plegable abierto={false}
        acciones={<Link className="btn" style={sx('min-height:34px;font-size:13px')} to={ROUTES.Custodios}>Ver calendario de turnos</Link>}>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px')}>
          {huecos.map(g => (
            <button key={g.key} type="button" className="gap" title="Ver detalle del hueco" onClick={() => setModal(g)} style={sx('background:#F3F5F8;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:6px')}>
              <div style={sx('display:flex;justify-content:space-between;gap:8px;width:100%')}><span style={sx('font-weight:600')}>{g.titulo}</span><span className={cubiertos[g.key] ? 'pill p-ok' : g.cls}>{cubiertos[g.key] ? 'Cubierto' : (g.diff > 0 ? '+' : g.diff < 0 ? '−' : '') + Math.abs(g.diff)}</span></div>
              <span style={sx('font-size:13px;color:#3E4A59')}>{cubiertos[g.key] ? `Cubierto con ${cubiertos[g.key]}.` : g.text}</span>
            </button>
          ))}
        </div>
        <Nota>Hueco de cobertura = más servicios agendados que custodios disponibles en la zona. Disponibles = custodios con estatus Disponible · Requeridos = servicios agendados para mañana.</Nota>
      </Section>

      <Modal open={modal === 'unidad'} onClose={() => setModal(null)} title="Elegir unidad de custodia" width={560} footer={<button type="button" style={sx(btnPriStyle)} onClick={() => { setModal(null); toast(`Unidad ${unidadId} seleccionada`) }}>Usar esta unidad</button>}>
        <span style={sx('font-size:14px;color:#3E4A59')}>Unidades disponibles en {SERVICIO.zona}. La sugerida está primero.</span>
        {UNIDADES.map(u => (
          <label key={u.id} style={sx('display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:8px;cursor:pointer;background:' + (u.id === unidadId ? '#E9EDFB' : '#F3F5F8'))}>
            <input type="radio" name="unidad" checked={u.id === unidadId} onChange={() => setUnidadId(u.id)} style={sx('accent-color:#475CC7')} />
            <span style={sx('display:flex;flex-direction:column;gap:2px;flex:1')}><span style={sx('font-weight:600')}>{u.id} · {u.vehiculo}</span><span style={sx('font-size:13px;color:#5F6B7A')}>{u.placas} · GPS {u.gps} · póliza {u.poliza} · {u.km.toLocaleString('es-MX')} km</span></span>
          </label>
        ))}
      </Modal>

      <Modal open={modal !== null && modal !== 'unidad'} onClose={() => setModal(null)} title={modal && modal !== 'unidad' ? `Cobertura · ${modal.titulo}` : ''} width={520}
        footer={modal && modal !== 'unidad' ? (
          <>
            <Link to={ROUTES.Custodios} style={sx(btnStyle)}>Ver custodios de la zona</Link>
            {modal.diff < 0 && !cubiertos[modal.key] && <button type="button" style={sx(btnPriStyle)} onClick={() => cubrir(modal)}>Cubrir hueco</button>}
          </>
        ) : undefined}>
        {modal && modal !== 'unidad' && modal.cob && (
          <>
            <div style={sx('display:grid;grid-template-columns:' + (movil ? 'repeat(auto-fit,minmax(min(80px,100%),1fr))' : 'repeat(3,minmax(0,1fr))') + ';gap:12px')}>
              <Field label="Disponibles"><span className="mono" style={sx(inputStyle + ';display:flex;align-items:center')}>{modal.cob.disponibles}</span></Field>
              <Field label="Requeridos"><span className="mono" style={sx(inputStyle + ';display:flex;align-items:center')}>{modal.cob.requeridos}</span></Field>
              <Field label="Diferencia"><span className="mono" style={sx(inputStyle + ';display:flex;align-items:center;color:' + (modal.diff < 0 ? '#B42318' : '#17784A'))}>{modal.diff > 0 ? '+' : ''}{modal.diff}</span></Field>
            </div>
            <span style={sx('font-size:14px;color:#3E4A59')}>{modal.text} En descanso: {modal.cob.descanso} · vacaciones: {modal.cob.vacaciones}.</span>
            <span className="lbl">Disponibles en {modal.zona}</span>
            <div style={sx('display:flex;flex-wrap:wrap;gap:6px')}>
              {modal.cob.nombres.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A')}>Nadie disponible.</span>}
              {modal.cob.nombres.map(n => <span key={n} className="pill p-mute">{n}</span>)}
            </div>
          </>
        )}
      </Modal>
    </Shell>
  )
}
