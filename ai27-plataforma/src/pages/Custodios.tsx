import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { PageHeader, Section, Nota } from '../components/Page'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { ROUTES } from '../lib/routes'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { actions, useStore } from '../lib/store'
import { CLIENTES, ESTATUS_CUSTODIO, ZONAS, conteoCustodios, custodios as SEED, servicios, unidades as UNIDADES, type Custodio, type EstatusCustodio, type TipoServicio, type Zona } from '../data/seed'
import { HOY_DEMO, asignaciones as ASIG_SEED, asignacionesDeCustodio, horasSemana, inicioSemana, type Asignacion, type EstatusAsignacion } from '../data/asignaciones'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl th.sort{cursor:pointer;user-select:none}
.tbl th.sort:hover{color:#0D1D41}
.tbl td{padding:10px 10px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.tbl td.wrap{white-space:normal;min-width:150px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:600 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn:hover{background:#F3F5F8}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}.btn-pri:hover{background:#3448A8}
.btn-sm{min-height:36px;padding:0 12px}
.cus-row{cursor:pointer}
.cus-row:hover td{background:#FAFBFC}
.chip{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:0 16px;border-radius:999px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:600 14px 'Montserrat',sans-serif;cursor:pointer}
.chip:hover{background:#F3F5F8}
.chip[aria-pressed="true"]{background:#0D1D41;border-color:#0D1D41;color:#FFFFFF}
.chip .n{font-family:'Montserrat',sans-serif;font-size:18px;font-weight:700}
.ag{display:grid;gap:4px;min-width:980px;font-size:13px}
.ag-head{text-align:center;padding:6px 4px;border-bottom:1px solid #E4E8ED;display:flex;flex-direction:column;gap:2px;align-items:center}
.ag-head.hoy{background:#F0F3FD;border-radius:6px 6px 0 0}
.ag-head .d{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600;color:#0D1D41;text-transform:none;letter-spacing:0}
.ag-cell{min-height:52px;padding:4px;border-radius:6px;background:#FAFBFC;display:flex;flex-direction:column;gap:4px}
.ag-cell.hoy{background:#F0F3FD}
.ag-cust{display:flex;flex-direction:column;gap:2px;justify-content:center;padding:4px 8px 4px 0;border:0;background:none;text-align:left;cursor:pointer;font:inherit;color:inherit}
.ag-cust:hover .nm{text-decoration:underline}
.ag-cust .nm{font-weight:600;color:#0D1D41}
.ag-cust .hs{font-size:12px;color:#5F6B7A}
.blk{display:flex;flex-direction:column;gap:1px;text-align:left;border:1px solid transparent;border-left-width:4px;border-radius:6px;padding:5px 8px;font:inherit;font-size:12px;line-height:1.3;cursor:pointer;color:#0D1D41;min-width:0}
.blk:hover{filter:brightness(.96)}
.blk .c{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.blk .h{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#3E4A59;white-space:normal;overflow-wrap:anywhere}
.blk-Programada{background:#E3F2F8;border-color:#3FA7C9}
.blk-En{background:#E3F6EC;border-color:#2FA86B}
.blk-Terminada{background:#EBEEF2;border-color:#9AA6B5}
.blk-Cancelada{background:#FDE8E8;border-color:#D86A6A;text-decoration:line-through}
.lg{display:flex;gap:6px;align-items:center;font-size:12px;color:#3E4A59}
.lg i{display:inline-block;width:10px;height:10px;border-radius:2px}
.tab{min-height:38px;padding:0 14px;border:0;border-bottom:2px solid transparent;background:none;font:600 14px 'Montserrat',sans-serif;color:#5F6B7A;cursor:pointer}
.tab:hover{color:#0D1D41}
.tab[aria-selected="true"]{color:#0D1D41;border-bottom-color:#475CC7}
.kpi{display:flex;flex-direction:column;gap:2px;padding:10px 14px;border:1px solid #E4E8ED;border-radius:8px;min-width:120px}
.kpi .v{font-family:'Montserrat',sans-serif;font-size:22px;font-weight:700;color:#0D1D41}
/* Celular: la tabla de custodios y el historial se muestran como tarjetas; la agenda, por día */
.fila-m{display:flex;flex-direction:column;gap:8px;width:100%;padding:12px 0;border:0;border-top:1px solid #EEF1F4;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}
.fila-m:first-child{border-top:0;padding-top:4px}
.fila-m .dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;font-size:13px;margin:0}
.fila-m .dl dt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.fila-m .dl dd{margin:2px 0 0;overflow-wrap:anywhere}
.ag-dia{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 10px;border-radius:8px;background:#FAFBFC;border:1px solid #EEF1F4}
.ag-dia.hoy{background:#F0F3FD;border-color:#C7D0F2}
.ag-dia .d{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600;color:#0D1D41;text-transform:none;letter-spacing:0}
.ag-fila-m{display:grid;grid-template-columns:minmax(96px,34%) minmax(0,1fr);gap:8px;padding:8px 0;border-top:1px solid #EEF1F4;align-items:start}
.ag-fila-m .ag-cust{padding:0}
.ag-fila-m .blks{display:flex;flex-direction:column;gap:4px;min-width:0}
.ag-chip{min-height:40px;padding:0 4px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:600 12px 'Montserrat',sans-serif;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15;flex:1 1 0;min-width:0;white-space:nowrap}
.ag-chip small{font-size:11px;font-weight:500;color:#5F6B7A}
.ag-chip[aria-pressed="true"]{background:#0D1D41;border-color:#0D1D41;color:#FFFFFF}
.ag-chip[aria-pressed="true"] small{color:#C7D0F2}
.ag-chip.hoy:not([aria-pressed="true"]){background:#F0F3FD;border-color:#C7D0F2}
@media print{.no-print{display:none !important}}
`

const CLS: Record<string, string> = { 'Disponible': 'pill p-ok', 'Asignado': 'pill p-info', 'En servicio': 'pill p-info', 'Descanso': 'pill p-mute', 'Vacaciones': 'pill p-mute', 'Incapacidad': 'pill p-warn', 'Baja': 'pill p-bad' }
const ASG_CLS: Record<EstatusAsignacion, string> = { 'Programada': 'pill p-info', 'En curso': 'pill p-ok', 'Terminada': 'pill p-mute', 'Cancelada': 'pill p-bad' }
const RES_CLS: Record<string, string> = { 'Sin novedad': 'pill p-ok', 'Retraso': 'pill p-warn', 'Con incidente': 'pill p-bad' }
const docCls = (docs: string) => docs === 'Al día' ? 'pill p-ok' : (docs.indexOf('días') > 0 && parseInt(docs.replace(/\D/g, '')) <= 14 ? 'pill p-bad' : 'pill p-warn')
const DOC_CLS: Record<string, string> = { ok: 'pill p-ok', warn: 'pill p-warn', bad: 'pill p-bad' }
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY = 86_400_000
const fmtIngreso = (iso: string) => { const [y, m] = iso.split('-'); return `${MES[parseInt(m) - 1]} ${y}` }
const hh = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const fmtFecha = (iso: string) => { const d = new Date(iso); return `${DIA[(d.getDay() + 6) % 7]} ${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}` }
const fmtFechaCorta = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MES[d.getMonth()]}` }
const fmtHorario = (a: Asignacion) => { const i = new Date(a.inicio), f = new Date(a.fin); return f.getTime() - i.getTime() >= DAY ? `${fmtFechaCorta(a.inicio)} ${hh(i)} → ${fmtFechaCorta(a.fin)} ${hh(f)}` : `${hh(i)}–${hh(f)}${i.toDateString() !== f.toDateString() ? ' (+1 día)' : ''}` }
const semanaISO = (d: Date) => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x.getTime() - y0.getTime()) / DAY + 1) / 7) }
const toLocalInput = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return { fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hora: `${p(d.getHours())}:${p(d.getMinutes())}` } }
const FILTROS: string[] = ['Todos', ...ESTATUS_CUSTODIO]
const nombreDe = (id: string) => SEED.find(c => c.id === id)?.nombre ?? id

type SortKey = 'nombre' | 'zona' | 'estatus' | 'asignacion' | 'calificacion' | 'docs'
const COLS: [SortKey, string][] = [['nombre', 'Custodio'], ['zona', 'Zona'], ['estatus', 'Estatus'], ['asignacion', 'Servicio actual'], ['calificacion', 'Desempeño'], ['docs', 'Documentos']]

/* ───────────────────────── Agenda semanal (calendario Lun–Dom) ───────────────────────── */
function AgendaSemanal({ custodios, todas, semana, setSemana, onCustodio, onAsignacion, compacta }: { custodios: Custodio[]; todas: Asignacion[]; semana: number; setSemana: (n: number) => void; onCustodio?: (id: string) => void; onAsignacion: (a: Asignacion) => void; compacta?: boolean }) {
  // Celular: la rejilla Lun–Dom no cabe; se muestra un día a la vez (chips de día) o, para un solo custodio, los 7 días en lista.
  const movil = useViewport() === 'movil'
  const [diaSel, setDiaSel] = useState<number | null>(null)
  const ini = new Date(inicioSemana(HOY_DEMO).getTime() + semana * 7 * DAY)
  const dias = Array.from({ length: 7 }, (_, i) => new Date(ini.getTime() + i * DAY))
  const fin = new Date(ini.getTime() + 7 * DAY)
  const esHoy = (d: Date) => d.toDateString() === HOY_DEMO.toDateString()
  const idxHoy = dias.findIndex(esHoy)
  const diaIdx = diaSel ?? (idxHoy >= 0 ? idxHoy : 0)
  const listaMovil = movil && (!compacta || custodios.length > 0)
  const fechaLarga = (d: Date) => `${DIA[(d.getDay() + 6) % 7]} ${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`
  const titulo = `Semana ${semanaISO(ini)} · ${ini.getDate()} ${ini.getMonth() !== dias[6].getMonth() ? MES[ini.getMonth()] + ' ' : ''}– ${dias[6].getDate()} ${MES[dias[6].getMonth()]} ${dias[6].getFullYear()}`
  const bloques = (c: Custodio, d: Date) => {
    const d0 = d.getTime(), d1 = d0 + DAY
    return asignacionesDeCustodio(c.id, todas)
      .filter(a => new Date(a.inicio).getTime() < d1 && new Date(a.fin).getTime() > d0)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .map(a => {
        const s = Math.max(d0, new Date(a.inicio).getTime()), e = Math.min(d1, new Date(a.fin).getTime())
        const rango = s === d0 && e === d1 ? 'todo el día' : `${hh(new Date(s))}–${e === d1 ? '24:00' : hh(new Date(e))}`
        return { a, rango }
      })
  }
  const total = custodios.reduce((n, c) => n + asignacionesDeCustodio(c.id, todas).filter(a => new Date(a.inicio) < fin && new Date(a.fin) > ini).length, 0)
  return (
    <div style={sx('display:flex;flex-direction:column;gap:12px')}>
      <div className="no-print" style={sx('display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between')}>
        <div role="group" aria-label="Cambiar semana" style={sx('display:flex;gap:6px;align-items:center;flex-wrap:wrap')}>
          <button type="button" className="btn btn-sm" onClick={() => setSemana(semana - 1)}>‹ Semana anterior</button>
          <button type="button" className="btn btn-sm" aria-pressed={semana === 0} style={sx(semana === 0 ? 'background:#0D1D41;border-color:#0D1D41;color:#FFFFFF' : '')} onClick={() => setSemana(0)}>Esta semana</button>
          <button type="button" className="btn btn-sm" onClick={() => setSemana(semana + 1)}>Siguiente ›</button>
          <span style={sx('font-weight:600;margin-left:8px')}>{titulo}</span>
          <span style={sx('color:#5F6B7A;font-size:13px')}>· {total} asignaci{total === 1 ? 'ón' : 'ones'}</span>
        </div>
        <div style={sx('display:flex;gap:14px;flex-wrap:wrap')}>
          <span className="lg"><i style={sx('background:#3FA7C9')}></i>Programada</span>
          <span className="lg"><i style={sx('background:#2FA86B')}></i>En curso</span>
          <span className="lg"><i style={sx('background:#9AA6B5')}></i>Terminada</span>
          <span className="lg"><i style={sx('background:#D86A6A')}></i>Cancelada</span>
        </div>
      </div>
      {listaMovil && compacta && (
        /* Celular · un custodio: los 7 días en lista, cada uno con sus bloques */
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          {dias.map(d => {
            const bl = bloques(custodios[0], d)
            return (
              <div key={d.getTime()} className={'ag-dia' + (esHoy(d) ? ' hoy' : '')}>
                <span className="lbl" style={sx('display:flex;flex-direction:column;gap:1px;flex:0 0 72px')}><span>{DIA[(d.getDay() + 6) % 7]}</span><span className="d">{d.getDate()} {MES[d.getMonth()]}</span>{esHoy(d) && <span>hoy</span>}</span>
                <div style={sx('display:flex;flex-direction:column;gap:4px;flex:1 1 160px;min-width:0')}>
                  {bl.map(({ a, rango }) => (
                    <button key={a.id} type="button" className={`blk blk-${a.estatus.split(' ')[0]}`} title={`${a.cliente} · ${a.servicio} · ${rango} · ${a.estatus}`} onClick={() => onAsignacion(a)}>
                      <span className="c">{a.cliente}</span>
                      <span className="h">{a.servicio} · {rango}</span>
                    </button>
                  ))}
                  {bl.length === 0 && <span style={sx('font-size:12px;color:#5F6B7A')}>Sin asignación</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {listaMovil && !compacta && (
        /* Celular · varios custodios: se elige el día y se listan todos los custodios con sus bloques de ese día */
        <div style={sx('display:flex;flex-direction:column;gap:8px')}>
          <div role="group" aria-label="Día de la semana" style={sx('display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px')}>
            {dias.map((d, i) => <button key={d.getTime()} type="button" className={'ag-chip' + (esHoy(d) ? ' hoy' : '')} aria-pressed={i === diaIdx} onClick={() => setDiaSel(i)}>{DIA[(d.getDay() + 6) % 7]}<small>{d.getDate()} {MES[d.getMonth()]}</small></button>)}
          </div>
          <span className="lbl" style={sx('padding-top:4px')}>{fechaLarga(dias[diaIdx])}{esHoy(dias[diaIdx]) ? ' · hoy' : ''} · {custodios.length} custodio{custodios.length === 1 ? '' : 's'}</span>
          <div style={sx('display:flex;flex-direction:column')}>
            {custodios.map(c => {
              const hs = Math.round(horasSemana(c.id, ini, todas))
              const bl = bloques(c, dias[diaIdx])
              return (
                <div key={c.id} className="ag-fila-m">
                  <button type="button" className="ag-cust" onClick={() => onCustodio?.(c.id)}><span className="nm">{c.nombre}</span><span className="hs mono" style={sx(hs > 48 ? 'color:#B42318;font-weight:600' : '')}>{hs} h{hs > 48 ? ' · exceso' : ''}</span></button>
                  <div className="blks">
                    {bl.map(({ a, rango }) => (
                      <button key={a.id} type="button" className={`blk blk-${a.estatus.split(' ')[0]}`} title={`${a.cliente} · ${a.servicio} · ${rango} · ${a.estatus}`} onClick={() => onAsignacion(a)}>
                        <span className="c">{a.cliente}</span>
                        <span className="h">{a.servicio} · {rango}</span>
                      </button>
                    ))}
                    {bl.length === 0 && <span style={sx('font-size:12px;color:#5F6B7A;padding:6px 0')}>—</span>}
                  </div>
                </div>
              )
            })}
            {custodios.length === 0 && <span style={sx('padding:16px;color:#5F6B7A;text-align:center')}>Sin custodios en esta vista.</span>}
          </div>
        </div>
      )}
      {!listaMovil && (
      <div style={sx('overflow-x:auto;flex:none')}>
        <div className="ag" style={sx(`grid-template-columns:${compacta ? '0px' : '170px'} repeat(7,minmax(104px,1fr))`)}>
          <span></span>
          {dias.map(d => <span key={d.getTime()} className={'ag-head lbl' + (esHoy(d) ? ' hoy' : '')}><span>{DIA[(d.getDay() + 6) % 7]}</span><span className="d">{d.getDate()} {MES[d.getMonth()]}{esHoy(d) ? ' · hoy' : ''}</span></span>)}
          {custodios.map(c => {
            const hs = Math.round(horasSemana(c.id, ini, todas))
            return [
              compacta
                ? <span key={c.id}></span>
                : <button key={c.id} type="button" className="ag-cust" onClick={() => onCustodio?.(c.id)}><span className="nm">{c.nombre}</span><span className="hs mono" style={sx(hs > 48 ? 'color:#B42318;font-weight:600' : '')}>{hs} h{hs > 48 ? ' · exceso' : ''}</span></button>,
              ...dias.map(d => (
                <div key={c.id + d.getTime()} className={'ag-cell' + (esHoy(d) ? ' hoy' : '')}>
                  {bloques(c, d).map(({ a, rango }) => (
                    <button key={a.id} type="button" className={`blk blk-${a.estatus.split(' ')[0]}`} title={`${a.cliente} · ${a.servicio} · ${rango} · ${a.estatus}`} onClick={() => onAsignacion(a)}>
                      <span className="c">{a.cliente}</span>
                      <span className="h">{a.servicio} · {rango}</span>
                    </button>
                  ))}
                </div>
              )),
            ]
          })}
          {custodios.length === 0 && <span style={sx('grid-column:1/-1;padding:16px;color:#5F6B7A;text-align:center')}>Sin custodios en esta vista.</span>}
        </div>
      </div>
      )}
      {!compacta && custodios.length > 0 && total === 0 && <Nota>Ninguno de estos custodios tiene asignaciones en esta semana. Cambia de semana o usa “Asignar a un cliente” desde el expediente.</Nota>}
    </div>
  )
}

/* ───────────────────────── Historial completo de asignaciones ───────────────────────── */
function Historial({ lista, onAsignacion }: { lista: Asignacion[]; onAsignacion: (a: Asignacion) => void }) {
  // Celular: la tabla de 8 columnas se vuelve una lista de tarjetas con los mismos datos
  const movil = useViewport() === 'movil'
  const pg = usePagination(lista.length, 10)
  const horas = Math.round(lista.reduce((n, a) => n + a.horas, 0))
  const incidentes = lista.filter(a => a.resultado === 'Con incidente').length
  return (
    <div style={sx('display:flex;flex-direction:column;gap:12px')}>
      <div style={sx('display:flex;gap:10px;flex-wrap:wrap')}>
        <div className="kpi" style={sx(movil ? 'flex:1 1 40%;min-width:0' : '')}><span className="lbl">Asignaciones</span><span className="v">{lista.length}</span></div>
        <div className="kpi" style={sx(movil ? 'flex:1 1 40%;min-width:0' : '')}><span className="lbl">Horas acumuladas</span><span className="v">{horas.toLocaleString('es-MX')} h</span></div>
        <div className="kpi" style={sx(movil ? 'flex:1 1 40%;min-width:0' : '')}><span className="lbl">Con incidente</span><span className="v" style={sx(incidentes ? 'color:#B42318' : '')}>{incidentes}</span></div>
        <div className="kpi" style={sx(movil ? 'flex:1 1 40%;min-width:0' : '')}><span className="lbl">En curso / programadas</span><span className="v">{lista.filter(a => a.estatus === 'En curso' || a.estatus === 'Programada').length}</span></div>
      </div>
      <Nota>Todas las asignaciones del custodio, de la más reciente a la más antigua. Haz clic en una para ver el detalle.</Nota>
      {movil && (
        <div style={sx('display:flex;flex-direction:column')}>
          {lista.slice(pg.from, pg.to).map(a => (
            <button key={a.id} type="button" className="fila-m" onClick={() => onAsignacion(a)}>
              <span style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:nowrap')}>
                <span style={sx('display:flex;flex-direction:column;min-width:0')}><span style={sx('font-weight:600')}>{a.cliente}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{a.servicio} · {fmtFecha(a.inicio)}</span></span>
                {a.resultado ? <span className={RES_CLS[a.resultado]} style={sx('flex:none')}>{a.resultado}</span> : <span className={ASG_CLS[a.estatus]} style={sx('flex:none')}>{a.estatus}</span>}
              </span>
              <dl className="dl">
                <div><dt>Ruta</dt><dd>{a.ruta}</dd></div>
                <div><dt>Unidad</dt><dd className="mono">{a.unidades.join(', ') || '—'}</dd></div>
                <div><dt>Horario</dt><dd className="mono">{fmtHorario(a)}</dd></div>
                <div><dt>Horas</dt><dd className="mono">{a.horas} h</dd></div>
              </dl>
            </button>
          ))}
          {lista.length === 0 && <span style={sx('padding:24px 12px;color:#5F6B7A;text-align:center')}>Este custodio aún no tiene asignaciones registradas.</span>}
        </div>
      )}
      {!movil && (
      <div style={sx('overflow-x:auto;flex:none')}>
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Servicio</th><th>Ruta</th><th>Unidad</th><th>Horario</th><th>Horas</th><th>Resultado</th></tr></thead>
          <tbody>
            {lista.slice(pg.from, pg.to).map(a => (
              <tr key={a.id} className="cus-row" onClick={() => onAsignacion(a)}>
                <td>{fmtFecha(a.inicio)}</td>
                <td style={sx('font-weight:600')}>{a.cliente}</td>
                <td className="mono">{a.servicio}</td>
                <td className="wrap">{a.ruta}</td>
                <td className="mono">{a.unidades.join(', ') || '—'}</td>
                <td className="mono">{fmtHorario(a)}</td>
                <td className="mono">{a.horas} h</td>
                <td>{a.resultado ? <span className={RES_CLS[a.resultado]}>{a.resultado}</span> : <span className={ASG_CLS[a.estatus]}>{a.estatus}</span>}</td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={8} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Este custodio aún no tiene asignaciones registradas.</td></tr>}
          </tbody>
        </table>
      </div>
      )}
      <Pager {...pg} />
    </div>
  )
}

/* ───────────────────────── Página ───────────────────────── */
type Tab = 'resumen' | 'historial' | 'agenda' | 'documentos'
const TABS: [Tab, string][] = [['resumen', 'Resumen'], ['historial', 'Historial de asignaciones'], ['agenda', 'Agenda'], ['documentos', 'Documentos']]

export default function Custodios() {
  const toast = useToast()
  // Celular: la tabla se vuelve lista de tarjetas (con selector de orden) y el expediente acomoda su encabezado en una columna
  const modo = useViewport()
  const movil = modo === 'movil'
  const asigStore = useStore(s => s.asignaciones ?? [])
  const clientesNuevos = useStore(s => s.clientesNuevos ?? [])
  const overrides = useStore(s => s.estatusUnidades ?? [])
  const [lista, setLista] = useState<Custodio[]>(SEED)
  const [f, setF] = useState('Todos')
  const [zona, setZona] = useState<'Todas' | Zona>('Todas')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 } | null>(null)
  const [alta, setAlta] = useState(false)
  const [editar, setEditar] = useState(false)
  const [form, setForm] = useState({ nombre: '', zona: 'Centro' as Zona, base: '', telefono: '', estatus: 'Disponible' as EstatusCustodio, portacion: true })
  const [nuevoEstatus, setNuevoEstatus] = useState<EstatusCustodio>('Disponible')
  // Expediente (modal grande) y agenda
  const [expId, setExpId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [semana, setSemana] = useState(0)
  const [semanaExp, setSemanaExp] = useState(0)
  const [detalle, setDetalle] = useState<Asignacion | null>(null)
  const [asignar, setAsignar] = useState(false)
  const [aForm, setAForm] = useState(() => { const i = toLocalInput(new Date(HOY_DEMO.getTime() + DAY)); return { cliente: 'Alpura', servicio: '', tipo: 'Por evento' as TipoServicio, ruta: '', unidades: [] as string[], fIni: i.fecha, hIni: '06:00', fFin: i.fecha, hFin: '18:00', notas: '', buscaUnidad: '' } })

  const todas = useMemo<Asignacion[]>(() => [...asigStore.map(a => ({ ...a }) as Asignacion), ...ASIG_SEED], [asigStore])
  const counts = useMemo(() => conteoCustodios(lista), [lista])
  const nq = norm(q.trim())
  const rows = useMemo(() => {
    const r = lista
      .filter(c => f === 'Todos' || c.estatus === f)
      .filter(c => zona === 'Todas' || c.zona === zona)
      .filter(c => !nq || norm(c.nombre + ' ' + c.id + ' ' + c.zona + ' ' + c.base + ' ' + c.asignacion).includes(nq))
    if (!sort) return r
    return [...r].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * sort.dir })
  }, [lista, f, zona, nq, sort])
  const pg = usePagination(rows.length, 25)
  const pagina = rows.slice(pg.from, pg.to)
  const utilizacion = Math.round(lista.reduce((a, c) => a + c.horasSemana, 0) / (lista.length * 52) * 100)
  const horasProm = Math.round(lista.reduce((a, c) => a + c.horasSemana, 0) / lista.length)
  const sel = expId ? lista.find(c => c.id === expId) ?? null : null

  // Agenda: hasta 8 custodios de la página visible, primero los que tienen asignaciones en la semana mostrada
  const agendaCustodios = useMemo(() => {
    const ini = inicioSemana(HOY_DEMO).getTime() + semana * 7 * DAY, fin = ini + 7 * DAY
    const n = (c: Custodio) => asignacionesDeCustodio(c.id, todas).filter(a => new Date(a.inicio).getTime() < fin && new Date(a.fin).getTime() > ini).length
    return [...pagina].sort((a, b) => n(b) - n(a)).slice(0, 8)
  }, [pagina, todas, semana])
  const tituloAgenda = zona !== 'Todas' ? zona : f !== 'Todos' ? f : 'custodios visibles'

  const cambiarFiltro = (label: string) => { setF(label); pg.setPage(0) }
  const ordenar = (k: SortKey) => setSort(s => (s && s.k === k ? (s.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 }))
  const abrirExpediente = (id: string, t: Tab = 'resumen') => { setExpId(id); setTab(t); setSemanaExp(0) }
  const verRafael = () => abrirExpediente('C-0931')

  const guardarAlta = () => {
    if (!form.nombre.trim()) { toast('Escribe el nombre del custodio', 'warn'); return }
    const usados = new Set(lista.map(c => c.id))
    let n = 1400; while (usados.has('C-' + n)) n++
    const id = 'C-' + n
    const nuevo: Custodio = {
      id, nombre: form.nombre.trim(), zona: form.zona, base: form.base.trim() || form.zona, estatus: form.estatus, asignacion: '—', horasSemana: 0, calificacion: 0, docs: 'Al día',
      documentos: [{ k: 'Licencia federal', v: 'vigente · 2028', estado: 'ok' }, { k: 'Portación / permiso', v: form.portacion ? 'vigente · 2027' : 'en trámite', estado: form.portacion ? 'ok' : 'warn' }, { k: 'Evaluación de confianza', v: 'programada', estado: 'warn' }, { k: 'Certificación carga alto valor', v: 'pendiente', estado: 'warn' }, { k: 'Alta en Samsara', v: 'activo', estado: 'ok' }],
      telefono: form.telefono.trim() || '—', ingreso: new Date().toISOString().slice(0, 10), serviciosAcumulados: 0, incidentes: 0, certificaciones: ['Primeros auxilios'], portacion: form.portacion, turnos: 'lllllll',
    }
    setLista(l => [nuevo, ...l])
    setF('Todos'); setZona('Todas'); setQ(''); pg.setPage(0)
    setAlta(false)
    setForm({ nombre: '', zona: 'Centro', base: '', telefono: '', estatus: 'Disponible', portacion: true })
    toast(`Custodio ${nuevo.nombre} dado de alta como ${id}`)
    abrirExpediente(id)
  }
  const guardarEstatus = () => {
    if (!sel) return
    setLista(l => l.map(c => (c.id === sel.id ? { ...c, estatus: nuevoEstatus, asignacion: nuevoEstatus === 'En servicio' || nuevoEstatus === 'Asignado' ? c.asignacion : '—' } : c)))
    setEditar(false)
    toast(`${sel.nombre} ahora está “${nuevoEstatus}”`)
  }
  const exportar = () => {
    const head = ['ID', 'Nombre', 'Zona', 'Base', 'Estatus', 'Asignación', 'Horas semana', 'Desempeño', 'Documentos', 'Teléfono', 'Ingreso']
    const csv = [head, ...rows.map(c => [c.id, c.nombre, c.zona, c.base, c.estatus, c.asignacion, c.horasSemana, c.calificacion, c.docs, c.telefono, c.ingreso])].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `custodios-${f.toLowerCase().replace(' ', '-')}.csv`; a.click(); URL.revokeObjectURL(a.href)
    toast(`Exportados ${rows.length} custodios a CSV`)
  }

  // ── Asignar a un cliente ──
  const clientesOpc = useMemo(() => Array.from(new Set([...CLIENTES, ...clientesNuevos.map(c => c.nombre)])), [clientesNuevos])
  const serviciosCliente = useMemo(() => servicios.filter(s => s.cliente === aForm.cliente && (s.estatus === 'Confirmado' || s.estatus === 'En tránsito' || s.estatus === 'Cotizado')).slice(0, 12), [aForm.cliente])
  const estatusUnidad = (id: string) => overrides.find(o => o.unidad === id)?.estatus ?? UNIDADES.find(u => u.id === id)?.estatus
  const unidadesOpc = useMemo(() => {
    const nb = norm(aForm.buscaUnidad.trim())
    return UNIDADES
      .filter(u => { const e = estatusUnidad(u.id); return e === 'Operando' || e === 'Disponible' })
      .filter(u => (nb ? true : !sel || u.zona === sel.zona))
      .filter(u => !nb || norm(u.id + ' ' + u.vehiculo + ' ' + u.placas + ' ' + u.zona).includes(nb))
      .slice(0, 8)
  }, [aForm.buscaUnidad, sel, overrides])
  const abrirAsignar = () => {
    if (!sel) return
    const i = toLocalInput(new Date(HOY_DEMO.getTime() + DAY))
    const sugerido = servicios.find(s => s.estatus === 'Confirmado' && s.zona === sel.zona)
    setAForm({ cliente: sugerido?.cliente ?? 'Alpura', servicio: sugerido?.id ?? '', tipo: sugerido?.tipo ?? 'Por evento', ruta: sugerido?.ruta ?? '', unidades: [], fIni: i.fecha, hIni: '06:00', fFin: i.fecha, hFin: '18:00', notas: '', buscaUnidad: '' })
    setAsignar(true)
  }
  const elegirServicio = (id: string) => { const s = servicios.find(x => x.id === id); setAForm(fm => ({ ...fm, servicio: id, tipo: s?.tipo ?? fm.tipo, ruta: s?.ruta ?? fm.ruta })) }
  const toggleUnidad = (id: string) => setAForm(fm => ({ ...fm, unidades: fm.unidades.includes(id) ? fm.unidades.filter(x => x !== id) : [...fm.unidades, id] }))
  const guardarAsignacion = () => {
    if (!sel) return
    const inicio = new Date(`${aForm.fIni}T${aForm.hIni}`), fin = new Date(`${aForm.fFin}T${aForm.hFin}`)
    if (!aForm.servicio.trim()) { toast('Indica el servicio (p. ej. SRV-24817)', 'warn'); return }
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin <= inicio) { toast('El fin debe ser posterior al inicio', 'warn'); return }
    if (!aForm.unidades.length) { toast('Elige al menos una unidad', 'warn'); return }
    const traslape = asignacionesDeCustodio(sel.id, todas).find(a => a.estatus !== 'Cancelada' && a.estatus !== 'Terminada' && new Date(a.inicio) < fin && new Date(a.fin) > inicio)
    if (traslape) { toast(`${sel.nombre} ya tiene ${traslape.cliente} · ${traslape.servicio} en ese horario`, 'warn'); return }
    const horas = Math.round((fin.getTime() - inicio.getTime()) / 3_600_000)
    const id = actions.crearAsignacion({ cliente: aForm.cliente, servicio: aForm.servicio.trim().toUpperCase(), tipo: aForm.tipo, ruta: aForm.ruta.trim() || '—', custodios: [sel.id], unidades: aForm.unidades, inicio: inicio.toISOString(), fin: fin.toISOString(), notas: aForm.notas.trim() || undefined })
    setLista(l => l.map(c => (c.id === sel.id ? { ...c, estatus: c.estatus === 'Disponible' || c.estatus === 'Descanso' ? 'Asignado' : c.estatus, asignacion: `${aForm.cliente} · ${aForm.servicio.trim().toUpperCase()}` } : c)))
    setAsignar(false)
    setTab('agenda'); setSemanaExp(Math.floor((inicioSemana(inicio).getTime() - inicioSemana(HOY_DEMO).getTime()) / (7 * DAY)))
    toast(`${sel.nombre} asignado a ${aForm.cliente} · ${aForm.servicio.toUpperCase()} (${horas} h) · ${id}`)
  }
  const cambiarEstatusAsg = (a: Asignacion, e: EstatusAsignacion) => {
    actions.cambiarEstatusAsignacion(a.id, e)
    setDetalle({ ...a, estatus: e })
    toast(`${a.cliente} · ${a.servicio} ahora está “${e}”`)
  }

  const vacio = `Sin custodios ${f === 'Todos' ? '' : 'con estatus “' + f + '” '}${zona !== 'Todas' ? 'en ' + zona + ' ' : ''}${nq ? 'que coincidan con “' + q.trim() + '” ' : ''}en esta vista. Prueba con otra zona o estatus.`

  // Datos del expediente
  const histSel = sel ? [...asignacionesDeCustodio(sel.id, todas)].sort((a, b) => b.inicio.localeCompare(a.inicio)) : []
  const horasSel = sel ? Math.round(horasSemana(sel.id, HOY_DEMO, todas)) : 0
  const actual = histSel.find(a => a.estatus === 'En curso') ?? [...histSel].reverse().find(a => a.estatus === 'Programada' && new Date(a.inicio) >= HOY_DEMO)
  const esDelStore = (a: Asignacion) => asigStore.some(x => x.id === a.id)

  return (
    <Shell active="custodios" css={CSS}>
      <PageHeader seccion="Equipo" titulo="Custodios"
        descripcion="Quién está disponible, asignado o descansando; la agenda de asignaciones por día y hora, y el expediente completo de cada custodio. Para el coordinador que arma los servicios."
        accion={{ label: 'Alta de custodio', onClick: () => setAlta(true) }}>
        <span style={sx('color:#5F6B7A;font-size:13px')}>{lista.length} custodios en {ZONAS.length} zonas · utilización {utilizacion}% · {horasProm} h promedio por semana</span>
      </PageHeader>

      <section aria-label="Sugerencia de la IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:14px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}>
          <span style={sx('font-weight:600')}>Sugerencia de la IA: asignar a <button type="button" onClick={verRafael} style={sx('background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline')}>Rafael Uc</button> al hueco de Bajío de mañana</span>
          <span style={sx('font-size:14px;color:#3E4A59')}>Lleva 9 días sin asignar. En cambio, J. Ordaz acumula 52 h esta semana y 3 custodios de Bajío llevan semanas sin descanso completo.</span>
        </div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="56" viewBox="0 0 220 64" role="img" aria-label="Utilización semanal de custodios en las últimas 6 semanas: 72, 74, 76, 79, 77 y 78 por ciento" style={sx('display:block')}><path d="M10 60H210" stroke="#E4E8ED"></path><path d="M10 12.8H210" stroke="#C7D0F2" strokeDasharray="4 3"></path><polyline points="10,46.4 50,36.8 90,27.2 130,12.8 170,22.4 210,17.6" fill="none" stroke="#475CC7" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline><circle cx="210" cy="17.6" r="4" fill="#475CC7"></circle><text x="176" y="34" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#1E6488">78%</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Utilización semanal · línea punteada: tope sano</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsignacionIA} onClick={() => toast('Abriendo asignación con Rafael Uc sugerido', 'info')}>Asignar a Rafael Uc</Link>
      </section>

      <div role="group" aria-label="Filtrar por estatus" data-tour="estatus" style={sx('display:flex;flex-wrap:wrap;gap:10px')}>
        {FILTROS.map(label => (
          <button key={label} type="button" className="chip" aria-pressed={label === f} onClick={() => cambiarFiltro(label)}>
            <span>{label}</span><span className="n">{counts[label]}</span>
          </button>
        ))}
      </div>

      <Section titulo={`${rows.length} custodio${rows.length === 1 ? '' : 's'}${f !== 'Todos' ? ` · ${f}` : ''}${zona !== 'Todas' ? ` · ${zona}` : ''}`}
        ayuda="Haz clic en una fila para abrir el expediente completo: datos, documentos, agenda e historial de asignaciones. Los encabezados ordenan la tabla."
        acciones={<>
          <label style={sx('display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Buscar custodio</span><input type="search" placeholder="Buscar por nombre, ID o base" value={q} onChange={e => { setQ(e.target.value); pg.setPage(0) }} style={sx(inputStyle + ';min-height:36px;min-width:220px;width:auto')} /></label>
          <select aria-label="Zona" value={zona} onChange={e => { setZona(e.target.value as 'Todas' | Zona); pg.setPage(0) }} style={sx(inputStyle + ';width:auto;min-height:36px')}>
            <option value="Todas">Todas las zonas</option>
            {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          {movil && (
            <select aria-label="Ordenar por" value={sort ? `${sort.k}:${sort.dir}` : ''} onChange={e => { const [k, d] = e.target.value.split(':'); setSort(k ? { k: k as SortKey, dir: d === '-1' ? -1 : 1 } : null) }} style={sx(inputStyle + ';width:auto;min-height:36px')}>
              <option value="">Ordenar: sin orden</option>
              {COLS.flatMap(([k, label]) => [<option key={k + '1'} value={`${k}:1`}>{label} ▲</option>, <option key={k + '-1'} value={`${k}:-1`}>{label} ▼</option>])}
            </select>
          )}
          <button type="button" className="btn btn-sm" onClick={exportar}>Exportar CSV</button>
        </>}>
        {movil && (
          <div style={sx('display:flex;flex-direction:column')}>
            {pagina.map(r => {
              const n = asignacionesDeCustodio(r.id, todas).filter(a => new Date(a.inicio) < new Date(inicioSemana(HOY_DEMO).getTime() + 7 * DAY) && new Date(a.fin) > inicioSemana(HOY_DEMO)).length
              return (
                <button key={r.id} type="button" className="fila-m" data-lista="custodio" onClick={() => abrirExpediente(r.id)}>
                  <span style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:nowrap')}>
                    <span style={sx('display:flex;flex-direction:column;min-width:0')}><span style={sx('font-weight:600')}>{r.nombre}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{r.id} · {r.zona}</span></span>
                    <span className={CLS[r.estatus]} style={sx('flex:none')}>{r.estatus}</span>
                  </span>
                  <dl className="dl">
                    <div><dt>Servicio actual</dt><dd>{r.asignacion}</dd></div>
                    <div><dt>Documentos</dt><dd><span className={docCls(r.docs)}>{r.docs}</span></dd></div>
                    <div><dt>Desempeño</dt><dd className="mono">{r.calificacion ? r.calificacion.toFixed(1) + ' / 5' : '—'}</dd></div>
                    <div><dt>Esta semana</dt><dd className="mono" style={sx('color:#5F6B7A')}>{n ? `${n} asignaci${n === 1 ? 'ón' : 'ones'}` : '—'}</dd></div>
                  </dl>
                </button>
              )
            })}
            {rows.length === 0 && <span style={sx('padding:24px 12px;color:#5F6B7A;text-align:center')}>{vacio}</span>}
          </div>
        )}
        {!movil && (
        <div style={sx('overflow-x:auto;margin:0 -12px')}>
          <table className="tbl">
            <thead><tr>{COLS.map(([k, label]) => <th key={k} className="sort" aria-sort={sort?.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} onClick={() => ordenar(k)}>{label}{sort?.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</th>)}<th>Esta semana</th></tr></thead>
            <tbody>
              {pagina.map(r => {
                const n = asignacionesDeCustodio(r.id, todas).filter(a => new Date(a.inicio) < new Date(inicioSemana(HOY_DEMO).getTime() + 7 * DAY) && new Date(a.fin) > inicioSemana(HOY_DEMO)).length
                return (
                  <tr key={r.id} className="cus-row" onClick={() => abrirExpediente(r.id)}>
                    <td><span style={sx('display:flex;flex-direction:column')}><span style={sx('font-weight:600')}>{r.nombre}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{r.id}</span></span></td>
                    <td>{r.zona}</td><td><span className={CLS[r.estatus]}>{r.estatus}</span></td><td className="wrap">{r.asignacion}</td><td className="mono">{r.calificacion ? r.calificacion.toFixed(1) + ' / 5' : '—'}</td><td><span className={docCls(r.docs)}>{r.docs}</span></td>
                    <td className="mono" style={sx('color:#5F6B7A')}>{n ? `${n} asignaci${n === 1 ? 'ón' : 'ones'}` : '—'}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>{vacio}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
        <Pager {...pg} />
      </Section>

      <Section titulo={`Agenda de asignaciones · ${tituloAgenda}`} ayuda="Qué cliente, servicio y horario tiene cada custodio por día. Sirve para ver carga de horas, descansos y huecos de cobertura." plegable abierto={true} tour="agenda">
        <Nota>Cada bloque es una asignación: un cliente, un servicio y un horario. Un custodio puede tener varias en la semana; las horas se suman para controlar descanso y exceso de horas. Se muestran hasta 8 custodios de la tabla (primero los que tienen asignaciones); haz clic en un nombre para abrir su expediente o en un bloque para ver la asignación.</Nota>
        <AgendaSemanal custodios={agendaCustodios} todas={todas} semana={semana} setSemana={setSemana} onCustodio={id => abrirExpediente(id, 'agenda')} onAsignacion={setDetalle} />
      </Section>

      {/* ── Expediente del custodio ── */}
      {sel && (
        <Modal open={!!sel} onClose={() => { if (!detalle && !asignar && !editar) setExpId(null) }} title={`Expediente · ${sel.nombre}`} width={1040}
          footer={<>
            <a className="btn" href={`tel:${sel.telefono.replace(/\s/g, '')}`} onClick={() => toast(`Llamando a ${sel.nombre} · ${sel.telefono}`, 'info')}>Llamar</a>
            <button type="button" className="btn" onClick={() => { window.print(); toast(`Expediente de ${sel.nombre} enviado a impresión`, 'info') }}>Imprimir</button>
            <button type="button" className="btn" onClick={() => { setNuevoEstatus(sel.estatus); setEditar(true) }}>Cambiar estatus</button>
            <button type="button" style={sx(btnPriStyle)} onClick={abrirAsignar}>Asignar a un cliente</button>
          </>}>
          <div style={sx('display:flex;gap:14px;align-items:center;flex-wrap:wrap')}>
            <div style={sx('width:56px;height:56px;border-radius:10px;background:#E9EDFB;border:1px dashed #D5DBE3;display:flex;align-items:center;justify-content:center;font-size:11px;color:#5F6B7A')}>Foto</div>
            <div style={sx('display:flex;flex-direction:column;gap:4px;flex:1 1 240px')}>
              <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{sel.id} · {sel.zona} · base {sel.base}</span>
              <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
                <span className={CLS[sel.estatus]}>{sel.estatus}</span>
                <span className={docCls(sel.docs)}>Documentos: {sel.docs}</span>
                <span className="pill p-mute mono" style={sx(horasSel > 48 ? 'background:#FDE8E8;color:#B42318' : '')}>{horasSel} h esta semana{horasSel > 48 ? ' · exceso' : ''}</span>
              </div>
            </div>
            <div style={sx('display:flex;flex-direction:column;gap:2px;' + (movil ? 'text-align:left;flex:1 1 100%;padding-top:4px;border-top:1px solid #EEF1F4' : 'text-align:right'))}>
              <span className="lbl">{actual ? (actual.estatus === 'En curso' ? 'Servicio actual' : 'Próxima asignación') : 'Servicio actual'}</span>
              <span style={sx('font-weight:600')}>{actual ? `${actual.cliente} · ${actual.servicio}` : sel.asignacion}</span>
              {actual && <span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{fmtFecha(actual.inicio)} · {fmtHorario(actual)}</span>}
            </div>
          </div>
          {/* flex:none: el cuerpo del modal es un flex en columna con alto limitado y, al tener overflow, esta barra se encogía hasta desaparecer */}
          <div role="tablist" aria-label="Secciones del expediente" className="no-print" style={sx('display:flex;gap:4px;border-bottom:1px solid #E4E8ED;position:sticky;top:-20px;background:#FFFFFF;z-index:1;padding-top:4px;flex:none;overflow-x:auto;flex-wrap:nowrap;' + (movil ? '-webkit-overflow-scrolling:touch' : ''))}>
            {TABS.map(([k, label]) => <button key={k} type="button" role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}{k === 'historial' ? ` (${histSel.length})` : ''}</button>)}
          </div>

          {tab === 'resumen' && (
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px')}>
              <div style={sx('display:flex;flex-direction:column;gap:12px')}>
                <span className="lbl">Datos</span>
                <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:14px')}>
                  <div><dt className="lbl">Base</dt><dd style={sx('margin:4px 0 0')}>{sel.base}</dd></div>
                  <div><dt className="lbl">Cobertura</dt><dd style={sx('margin:4px 0 0')}>{sel.zona === 'Centro' ? 'Centro, Bajío' : sel.zona === 'Bajío' ? 'Bajío, Centro' : sel.zona}</dd></div>
                  <div><dt className="lbl">Ingreso</dt><dd style={sx('margin:4px 0 0')}>{fmtIngreso(sel.ingreso)}</dd></div>
                  <div><dt className="lbl">Desempeño</dt><dd style={sx('margin:4px 0 0')}>{sel.calificacion ? sel.calificacion.toFixed(1) + ' / 5' : 'sin evaluar'}</dd></div>
                  <div><dt className="lbl">Teléfono</dt><dd className="mono" style={sx('margin:4px 0 0')}>{sel.telefono}</dd></div>
                  <div><dt className="lbl">Servicios acumulados</dt><dd style={sx('margin:4px 0 0')}>{sel.serviciosAcumulados} · {sel.incidentes} incidente{sel.incidentes === 1 ? '' : 's'}</dd></div>
                  <div><dt className="lbl">Horas esta semana</dt><dd className="mono" style={sx('margin:4px 0 0' + (horasSel > 48 ? ';color:#B42318' : ''))}>{horasSel} h{horasSel > 48 ? ' · exceso' : ''}</dd></div>
                  <div><dt className="lbl">Portación</dt><dd style={sx('margin:4px 0 0')}>{sel.portacion ? 'Permiso vigente' : 'En trámite'}</dd></div>
                </dl>
                <Nota>Las horas se calculan sumando sus asignaciones de la semana (lunes a domingo). Arriba de 48 h se marca como exceso.</Nota>
                <span className="lbl">Documentos y vigencias</span>
                <div style={sx('display:flex;flex-direction:column')}>
                  {sel.documentos.map(d => (
                    <div key={d.k} style={sx('display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:6px 0;border-top:1px solid #EEF1F4')}><span>{d.k}</span><span className={DOC_CLS[d.estado]}>{d.v}</span></div>
                  ))}
                </div>
              </div>
              <div style={sx('display:flex;flex-direction:column;gap:12px')}>
                <span className="lbl">Últimas asignaciones</span>
                {histSel.slice(0, 5).map(a => (
                  <button key={a.id} type="button" className={`blk blk-${a.estatus.split(' ')[0]}`} style={sx('text-decoration:none')} onClick={() => setDetalle(a)}>
                    <span className="c">{a.cliente} · {a.servicio}</span>
                    <span className="h">{fmtFecha(a.inicio)} · {fmtHorario(a)} · {a.horas} h · {a.resultado ?? a.estatus}</span>
                  </button>
                ))}
                {histSel.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A')}>Aún sin asignaciones. Usa “Asignar a un cliente”.</span>}
                {histSel.length > 5 && <button type="button" className="btn btn-sm" style={sx('align-self:flex-start')} onClick={() => setTab('historial')}>Ver las {histSel.length} asignaciones</button>}
              </div>
            </div>
          )}

          {tab === 'historial' && <Historial lista={histSel} onAsignacion={setDetalle} />}

          {tab === 'agenda' && (
            <div style={sx('display:flex;flex-direction:column;gap:10px')}>
              <Nota>Semana de {sel.nombre}. Cada bloque es una asignación con su cliente, servicio y horario; las horas de la semana se suman para controlar descanso.</Nota>
              <AgendaSemanal custodios={[sel]} todas={todas} semana={semanaExp} setSemana={setSemanaExp} onAsignacion={setDetalle} compacta />
              <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>Horas en la semana mostrada: {Math.round(horasSemana(sel.id, new Date(inicioSemana(HOY_DEMO).getTime() + semanaExp * 7 * DAY), todas))} h</span>
            </div>
          )}

          {tab === 'documentos' && (
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px')}>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                <span className="lbl">Documentos y vigencias</span>
                {sel.documentos.map(d => (
                  <div key={d.k} style={sx('display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:8px 0;border-top:1px solid #EEF1F4')}><span>{d.k}</span><span className={DOC_CLS[d.estado]}>{d.v}</span></div>
                ))}
                <Nota>Verde: vigente. Ámbar: vence pronto o en trámite. Rojo: vencido o con menos de 14 días.</Nota>
              </div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                <span className="lbl">Certificaciones</span>
                {sel.certificaciones.map(c => <span key={c} className="pill p-ok" style={sx('align-self:flex-start')}>{c}</span>)}
                <span className="lbl" style={sx('margin-top:8px')}>Permiso de portación</span>
                <span className={sel.portacion ? 'pill p-ok' : 'pill p-warn'} style={sx('align-self:flex-start')}>{sel.portacion ? 'Vigente' : 'En trámite'}</span>
                <button type="button" className="btn btn-sm" style={sx('align-self:flex-start;margin-top:8px')} onClick={() => toast(`Se pidió a ${sel.nombre} actualizar sus documentos desde la app del custodio`, 'info')}>Pedir actualización de documentos</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Detalle de una asignación ── */}
      {detalle && (
        <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`${detalle.cliente} · ${detalle.servicio}`} width={520}
          footer={<>
            {esDelStore(detalle) && detalle.estatus === 'Programada' && <button type="button" className="btn" onClick={() => cambiarEstatusAsg(detalle, 'Cancelada')}>Cancelar asignación</button>}
            {esDelStore(detalle) && detalle.estatus === 'Programada' && <button type="button" className="btn" onClick={() => cambiarEstatusAsg(detalle, 'En curso')}>Marcar en curso</button>}
            {esDelStore(detalle) && detalle.estatus === 'En curso' && <button type="button" className="btn" onClick={() => cambiarEstatusAsg(detalle, 'Terminada')}>Marcar terminada</button>}
            {!sel && detalle.custodios[0] && <button type="button" className="btn" onClick={() => { const id = detalle.custodios[0]; setDetalle(null); abrirExpediente(id) }}>Ver expediente</button>}
            <button type="button" className="btn" onClick={() => setDetalle(null)}>Cerrar</button>
          </>}>
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
            <span className={ASG_CLS[detalle.estatus]}>{detalle.estatus}</span>
            {detalle.resultado && <span className={RES_CLS[detalle.resultado]}>{detalle.resultado}</span>}
            <span className="pill p-mute">{detalle.tipo}</span>
          </div>
          <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:14px')}>
            <div><dt className="lbl">Inicio</dt><dd style={sx('margin:4px 0 0')}>{fmtFecha(detalle.inicio)} · <span className="mono">{hh(new Date(detalle.inicio))}</span></dd></div>
            <div><dt className="lbl">Fin</dt><dd style={sx('margin:4px 0 0')}>{fmtFecha(detalle.fin)} · <span className="mono">{hh(new Date(detalle.fin))}</span></dd></div>
            <div><dt className="lbl">Horas</dt><dd className="mono" style={sx('margin:4px 0 0')}>{detalle.horas} h</dd></div>
            <div><dt className="lbl">Ruta</dt><dd style={sx('margin:4px 0 0')}>{detalle.ruta}</dd></div>
            <div><dt className="lbl">Custodios</dt><dd style={sx('margin:4px 0 0')}>{detalle.custodios.length ? detalle.custodios.map(nombreDe).join(', ') : '—'}</dd></div>
            <div><dt className="lbl">Unidades</dt><dd className="mono" style={sx('margin:4px 0 0')}>{detalle.unidades.join(', ') || '—'}</dd></div>
          </dl>
          {detalle.notas && <Nota>Notas: {detalle.notas}</Nota>}
          <Nota>{esDelStore(detalle) ? 'Asignación creada desde esta pantalla; puedes cambiar su estatus.' : 'Asignación del histórico de operación. Su estatus se actualiza desde Monitoreo al cerrar el servicio.'}</Nota>
        </Modal>
      )}

      {/* ── Asignar a un cliente ── */}
      {sel && (
        <Modal open={asignar} onClose={() => setAsignar(false)} title={`Asignar a un cliente · ${sel.nombre}`} width={640}
          footer={<><button type="button" style={sx(btnStyle)} onClick={() => setAsignar(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarAsignacion}>Guardar asignación</button></>}>
          <Nota>Una asignación une a este custodio con un cliente, un servicio y una o más unidades por un tiempo (días y horas). Aparecerá en su agenda e historial.</Nota>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <Field label="Cliente"><select value={aForm.cliente} onChange={e => setAForm({ ...aForm, cliente: e.target.value, servicio: '' })} style={sx(inputStyle)}>{clientesOpc.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Servicio"><input list="srv-cliente" value={aForm.servicio} onChange={e => elegirServicio(e.target.value)} placeholder="SRV-24817" style={sx(inputStyle)} /><datalist id="srv-cliente">{serviciosCliente.map(s => <option key={s.id} value={s.id}>{s.ruta} · {s.estatus}</option>)}</datalist></Field>
            <Field label="Tipo"><select value={aForm.tipo} onChange={e => setAForm({ ...aForm, tipo: e.target.value as TipoServicio })} style={sx(inputStyle)}><option>Por evento</option><option>Dedicado</option></select></Field>
            <Field label="Ruta"><input value={aForm.ruta} onChange={e => setAForm({ ...aForm, ruta: e.target.value })} placeholder="Méx–Qro–Gdl" style={sx(inputStyle)} /></Field>
            <Field label="Inicio · fecha"><input type="date" value={aForm.fIni} onChange={e => setAForm({ ...aForm, fIni: e.target.value, fFin: aForm.fFin < e.target.value ? e.target.value : aForm.fFin })} style={sx(inputStyle)} /></Field>
            <Field label="Inicio · hora"><input type="time" value={aForm.hIni} onChange={e => setAForm({ ...aForm, hIni: e.target.value })} style={sx(inputStyle)} /></Field>
            <Field label="Fin · fecha"><input type="date" value={aForm.fFin} min={aForm.fIni} onChange={e => setAForm({ ...aForm, fFin: e.target.value })} style={sx(inputStyle)} /></Field>
            <Field label="Fin · hora"><input type="time" value={aForm.hFin} onChange={e => setAForm({ ...aForm, hFin: e.target.value })} style={sx(inputStyle)} /></Field>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <Field label={`Unidades (${aForm.unidades.length} elegida${aForm.unidades.length === 1 ? '' : 's'})`}><input type="search" value={aForm.buscaUnidad} onChange={e => setAForm({ ...aForm, buscaUnidad: e.target.value })} placeholder={`Buscar unidad por ID, vehículo o placas · se muestran las de ${sel.zona}`} style={sx(inputStyle)} /></Field>
            {aForm.unidades.length > 0 && <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}>{aForm.unidades.map(u => <button key={u} type="button" className="pill p-info mono" style={sx('border:0;cursor:pointer')} onClick={() => toggleUnidad(u)}>{u} ×</button>)}</div>}
            <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px')}>
              {unidadesOpc.map(u => (
                <label key={u.id} style={sx('display:flex;gap:8px;align-items:center;font-size:13px;padding:6px 8px;border:1px solid #E4E8ED;border-radius:8px;cursor:pointer')}>
                  <input type="checkbox" checked={aForm.unidades.includes(u.id)} onChange={() => toggleUnidad(u.id)} />
                  <span style={sx('display:flex;flex-direction:column;min-width:0')}><span className="mono" style={sx('font-weight:600')}>{u.id} · {u.placas}</span><span style={sx('color:#5F6B7A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{u.vehiculo} · {u.zona} · {estatusUnidad(u.id)}</span></span>
                </label>
              ))}
              {unidadesOpc.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A;grid-column:1/-1')}>Sin unidades operando con ese texto.</span>}
            </div>
          </div>
          <Field label="Notas (opcional)"><input value={aForm.notas} onChange={e => setAForm({ ...aForm, notas: e.target.value })} placeholder="Instrucciones para el custodio" style={sx(inputStyle)} /></Field>
          {(() => { const i = new Date(`${aForm.fIni}T${aForm.hIni}`), fn = new Date(`${aForm.fFin}T${aForm.hFin}`); const hs = (fn.getTime() - i.getTime()) / 3_600_000; return <span className="mono" style={sx('font-size:13px;color:' + (hs > 0 ? '#3E4A59' : '#B42318'))}>{hs > 0 ? `Duración: ${Math.round(hs)} h · con esta asignación ${sel.nombre} llegaría a ${Math.round(horasSemana(sel.id, i, todas) + Math.min(hs, 7 * 24))} h en esa semana` : 'El fin debe ser posterior al inicio'}</span> })()}
        </Modal>
      )}

      <Modal open={alta} onClose={() => setAlta(false)} title="Alta de custodio" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setAlta(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarAlta}>Dar de alta</button></>}>
        <Field label="Nombre completo"><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre y apellido" style={sx(inputStyle)} autoFocus /></Field>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Zona"><select value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value as Zona })} style={sx(inputStyle)}>{ZONAS.map(z => <option key={z}>{z}</option>)}</select></Field>
          <Field label="Base"><input value={form.base} onChange={e => setForm({ ...form, base: e.target.value })} placeholder="p. ej. Cuautitlán" style={sx(inputStyle)} /></Field>
          <Field label="Teléfono"><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="55 0000 0000" style={sx(inputStyle)} /></Field>
          <Field label="Estatus inicial"><select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value as EstatusCustodio })} style={sx(inputStyle)}>{ESTATUS_CUSTODIO.map(z => <option key={z}>{z}</option>)}</select></Field>
        </div>
        <label style={sx('display:flex;align-items:center;gap:8px;font-size:14px')}><input type="checkbox" checked={form.portacion} onChange={e => setForm({ ...form, portacion: e.target.checked })} /> Cuenta con permiso de portación vigente</label>
        <span style={sx('font-size:12px;color:#5F6B7A')}>Se generará el expediente con licencia federal y alta en Samsara; la evaluación de confianza y la certificación de carga de alto valor quedan programadas.</span>
      </Modal>

      {sel && (
        <Modal open={editar} onClose={() => setEditar(false)} title={`Cambiar estatus · ${sel.nombre}`} width={440} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setEditar(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarEstatus}>Guardar</button></>}>
          <Field label="Nuevo estatus"><select value={nuevoEstatus} onChange={e => setNuevoEstatus(e.target.value as EstatusCustodio)} style={sx(inputStyle)}>{ESTATUS_CUSTODIO.map(z => <option key={z}>{z}</option>)}</select></Field>
          <span style={sx('font-size:12px;color:#5F6B7A')}>Estatus actual: {sel.estatus}. Los contadores de la pantalla se actualizan al guardar.</span>
        </Modal>
      )}
    </Shell>
  )
}
