import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { Nota, PageHeader, Section } from '../components/Page'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { ROUTES } from '../lib/routes'
import { useStore } from '../lib/store'
import { clientes } from '../data/seed'
import { ETIQUETA, FACTOR, GASTOS, PERIODOS, antiguedad, diasCobroPromedio, facturasIniciales, rentaPorCliente, rentaPorServicio, rentaPorUnidad, type Factura, type Periodo, type Renta } from '../data/finanzas'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap;cursor:pointer;user-select:none}
.tbl th:hover{color:#0D1D41}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.btn-sm{min-height:32px;padding:0 10px;font-size:13px}
.k{font-family:'Montserrat',sans-serif;font-size:26px;font-weight:600}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select{min-height:40px;background:#FFFFFF;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif}
.inv{cursor:pointer;border-radius:6px}.inv:hover{background:#FAFBFC}.inv.sel{background:#F0F3FD;outline:1px solid #C7D0F2}
.tab{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:8px;border:1px solid transparent;background:transparent;color:#3E4A59;font:500 14px 'Montserrat',sans-serif;cursor:pointer}
.tab[aria-selected="true"]{background:#E9EDFB;border-color:#C7D0F2;color:#0D1D41}
`

type By = 'cli' | 'srv' | 'uni'
const TABS: [By, string, string, Renta[]][] = [['cli', 'Por cliente', 'Cliente', rentaPorCliente], ['srv', 'Por tipo de servicio', 'Tipo de servicio', rentaPorServicio], ['uni', 'Por unidad', 'Unidad', rentaPorUnidad]]
type SortKey = 'n' | 'rev' | 'cost' | 'm' | 'pct'

const fmt = (n: number) => (Math.abs(n) >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1e3 ? '$' + (n / 1e3).toFixed(1) + 'K' : '$' + Math.round(n))
const fmtM1 = (n: number) => '$' + (n / 1e6).toFixed(1) + 'M'
const hoy = () => new Date().toISOString().slice(0, 10)

/** Genera un CSV (separador coma, BOM para que Excel respete acentos) y lo descarga en el navegador. */
function downloadCSV(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const estatusPill = (f: Factura) => f.estatus === 'Cobrada' ? ['pill p-ok', 'Cobrada'] : f.estatus === 'Registrada' ? ['pill p-mute', 'Registrada'] : f.dias > 60 ? ['pill p-bad', `${f.dias} días`] : ['pill p-warn', `${f.dias} días`]

export default function Finanzas() {
  const toast = useToast()
  // Celular: las filas de facturas y de gastos cambian a pistas angostas (la rejilla "90px 1fr 100px auto" dejaba el concepto en una letra).
  const movil = useViewport() === 'movil'
  const nuevos = useStore(s => s.clientesNuevos ?? [])
  const [by, setBy] = useState<By>('cli')
  const [periodo, setPeriodo] = useState<Periodo>('Septiembre 2026')
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: 'rev', d: -1 })
  const [facturas, setFacturas] = useState<Factura[]>(facturasIniciales)
  const [verTodas, setVerTodas] = useState(false)
  const [selInv, setSelInv] = useState<string | null>(null)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [pago, setPago] = useState({ id: '', monto: '', fecha: hoy(), metodo: 'Transferencia SPEI' })
  const [recOpen, setRecOpen] = useState(false)
  const [rec, setRec] = useState({ id: '', msg: '' })
  const [factOpen, setFactOpen] = useState(false)
  const [nueva, setNueva] = useState({ cliente: 'Alpura', concepto: '', monto: '' })

  const f = FACTOR[periodo]
  const [, , firstCol, base] = TABS.find(t => t[0] === by)!
  const rows = useMemo(() => {
    const r = base.map(x => { const rev = x.rev * f, cost = x.cost * f, m = rev - cost; return { ...x, rev, cost, m, pct: rev ? m / rev : 0 } })
    return r.sort((a, b) => (sort.k === 'n' ? a.n.localeCompare(b.n, 'es') : a[sort.k] - b[sort.k]) * sort.d)
  }, [base, f, sort])
  const pg = usePagination(rows.length, 25)
  const toggleSort = (k: SortKey) => setSort(s => (s.k === k ? { k, d: s.d === 1 ? -1 : 1 } : { k, d: k === 'n' ? 1 : -1 }))
  const arrow = (k: SortKey) => (sort.k === k ? (sort.d === 1 ? ' ▲' : ' ▼') : '')

  // KPI del periodo (hero del diseño en septiembre, escalados por el periodo)
  const ingresos = 14.1e6 * f, gastos = 9.7e6 * f, margen = ingresos - gastos
  const b = antiguedad(facturas)
  const dias = diasCobroPromedio(facturas)
  const pend = facturas.filter(x => x.estatus !== 'Cobrada')
  const lista = verTodas ? facturas : facturas.slice(0, 5)
  const clientesAll = [...clientes.map(c => c.nombre), ...nuevos.map(n => n.nombre)]
  const variacion = periodo === 'Agosto 2026' ? '+2.9% vs julio' : periodo === 'Septiembre 2026' ? '+3.7% vs agosto' : periodo === 'Q3 2026 (jul–sep)' ? '+9.8% vs Q2' : '+14% vs 2025'

  function exportExcel() {
    const out: (string | number)[][] = [
      ['AI27 · Finanzas · ' + ETIQUETA[periodo]], [],
      ['KPI', 'Valor'],
      ['Ingresos', fmt(ingresos)], ['Gastos', fmt(gastos)], ['Margen operativo', Math.round(margen / ingresos * 100) + '% · ' + fmt(margen)],
      ['Cuentas por cobrar', fmt(b.total)], ['Días de cobro', dias],
    ]
    for (const [, label, col, data] of TABS) {
      out.push([], ['Rentabilidad ' + label.toLowerCase()], [col, 'Ingresos', 'Costo directo', 'Margen', '% margen'])
      data.forEach(x => { const rev = x.rev * f, cost = x.cost * f; out.push([x.n, fmt(rev), fmt(cost), fmt(rev - cost), Math.round((rev - cost) / rev * 100) + '%']) })
    }
    out.push([], ['Gastos por categoría'], ['Categoría', 'Monto'])
    GASTOS.forEach(([k, v]) => out.push([k, fmt(v * f)]))
    out.push([], ['Cuentas por cobrar · antigüedad'], ['Al corriente', '1–30 d', '31–60 d', '+60 d'], [fmt(b.corriente), fmt(b.d30), fmt(b.d60), fmt(b.mas60)])
    out.push([], ['Factura', 'Cliente', 'Concepto', 'Monto', 'Días', 'Estatus', 'Fecha'])
    facturas.forEach(i => out.push([i.id, i.cliente, i.concepto, i.monto, i.dias, i.estatus, i.fecha]))
    const name = 'AI27_Finanzas_' + ETIQUETA[periodo].replace(/\s+/g, '_') + '.csv'
    downloadCSV(name, out)
    toast('Excel descargado: ' + name)
  }

  const abrirPago = () => { const f0 = pend.find(x => x.id === selInv) ?? pend[0]; setPago({ id: f0?.id ?? '', monto: f0 ? String(f0.monto) : '', fecha: hoy(), metodo: 'Transferencia SPEI' }); setPagoOpen(true) }
  function registrarPago() {
    const fx = facturas.find(x => x.id === pago.id)
    if (!fx) { toast('Selecciona una factura', 'warn'); return }
    const monto = parseFloat(pago.monto.replace(/[^0-9.]/g, '')) || fx.monto
    setFacturas(fs => fs.map(x => (x.id === fx.id ? (monto >= x.monto ? { ...x, estatus: 'Cobrada', dias: 0 } : { ...x, monto: x.monto - monto }) : x)))
    setPagoOpen(false)
    toast(`Pago de ${fmt(monto)} registrado en ${fx.id} · ${fx.cliente}${monto >= fx.monto ? ' (cobrada)' : ' (pago parcial)'}`)
  }
  const abrirRec = () => { const f0 = pend.find(x => x.id === selInv) ?? pend.find(x => x.estatus === 'Vencida') ?? pend[0]; setRec({ id: f0?.id ?? '', msg: f0 ? `Estimado cliente ${f0.cliente}: le recordamos que la factura ${f0.id} por ${fmt(f0.monto)} MXN tiene ${f0.dias} días de antigüedad. Agradecemos su pago a la brevedad.\n\nAI27 · Cobranza` : '' }); setRecOpen(true) }
  function enviarRec() {
    const fx = facturas.find(x => x.id === rec.id)
    if (!fx) { toast('Selecciona una factura', 'warn'); return }
    const c = clientes.find(x => x.nombre === fx.cliente)
    setRecOpen(false)
    toast(`Recordatorio de ${fx.id} enviado a ${fx.cliente}${c ? ' (' + c.correo + ')' : ''}`)
  }
  function crearFactura() {
    const monto = parseFloat(nueva.monto.replace(/[^0-9.]/g, ''))
    if (!monto) { toast('Captura el monto de la factura', 'warn'); return }
    const id = 'F-' + (9935 + facturas.filter(x => parseInt(x.id.slice(2)) >= 9935).length)
    const fx: Factura = { id, cliente: nueva.cliente, concepto: nueva.concepto.trim() || `${nueva.cliente} · servicios octubre`, monto, dias: 0, estatus: 'Registrada', fecha: hoy() }
    setFacturas(fs => [fx, ...fs])
    setSelInv(id)
    setFactOpen(false)
    setNueva({ cliente: 'Alpura', concepto: '', monto: '' })
    toast(`Factura ${id} registrada para ${nueva.cliente} por ${fmt(monto)} (sin timbrado CFDI en el demo)`)
  }

  const gmax = GASTOS[0][1] * f
  const bucket = (l: string, v: number, bad = false) => (
    <div style={sx((bad ? 'background:#FDECEC' : 'background:#F3F5F8') + ';border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:2px')}><span style={sx('font-size:12px;color:' + (bad ? '#B42318' : '#5F6B7A'))}>{l}</span><span className="mono">{fmtM1(v)}</span></div>
  )
  const riesgo60 = b.mas60 ? Math.round((facturas.filter(x => ['Bebidas del Golfo', 'Grupo Textil Arrayán'].includes(x.cliente) && x.estatus !== 'Cobrada' && x.dias > 60).reduce((a, x) => a + x.monto, 0) / b.mas60) * 100) : 0

  return (
    <Shell active="finanzas" css={CSS}>
      <PageHeader seccion={`Finanzas · ${ETIQUETA[periodo]}`} titulo="Finanzas"
        descripcion="Cuánto ingresa, cuánto cuesta operar y qué falta por cobrar. Para Dirección y Finanzas: aquí registras pagos, envías recordatorios y ves qué clientes y servicios dejan margen."
        accion={{ label: 'Registrar pago', onClick: abrirPago }}
        secundarias={<><label className="field" style={sx('flex-direction:row;align-items:center;gap:8px')}>Periodo<select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)}>{PERIODOS.map(p => <option key={p}>{p}</option>)}</select></label></>} />

      <section aria-label="Sugerencia de la IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>Sugerencia de la IA: condicionar nuevos servicios a Bebidas del Golfo y Grupo Textil Arrayán</span><span style={sx('font-size:14px;color:#3E4A59')}>Concentran {riesgo60}% del saldo a más de 60 días. Con el historial de pago de cada cliente, se esperan cobrar $7.9M en octubre.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Cobranza acumulada proyectada por semana de octubre: 1.8, 3.9, 5.6 y 7.9 millones" style={sx('display:block')}><g><rect x="8" y="49" width="40" height="11" rx="2" fill="#2B9A66"></rect><rect x="60" y="36.3" width="40" height="23.7" rx="2" fill="#2B9A66"></rect><rect x="112" y="26" width="40" height="34" rx="2" fill="#9FD6BB"></rect><rect x="164" y="12" width="40" height="48" rx="2" fill="#9FD6BB"></rect></g><text x="166" y="9" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#17784A">$7.9M</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Cobranza acumulada de octubre · claro: proyectado</figcaption>
        </figure>
        <button type="button" className="btn" onClick={abrirRec}>Enviar recordatorio de pago</button>
      </section>

      <section aria-label="Indicadores" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Ingresos</span><span className="k">{fmtM1(ingresos)}</span><span style={sx('font-size:13px;color:#17784A')}>{variacion}</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Margen operativo</span><span className="k">{Math.round(margen / ingresos * 100)}%</span><span style={sx('font-size:13px;color:#5F6B7A')}>{fmtM1(margen)} · gastos {fmtM1(gastos)} ({Math.round(gastos / ingresos * 100)}% de ingresos)</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Por cobrar</span><span className="k">{fmtM1(b.total)}</span><span style={sx('font-size:13px;color:#B42318')}>{fmtM1(b.mas60)} con más de 60 días</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Días de cobro</span><span className="k" style={sx('color:' + (dias > 30 ? '#9A5B00' : '#17784A'))}>{dias}</span><span style={sx('font-size:13px;color:#5F6B7A')}>promedio · meta 30 días</span></div>
      </section>

      <Section titulo="Cuentas por cobrar" ayuda="Facturas pendientes por antigüedad. Elige una y registra el pago o envía un recordatorio."
        acciones={<><button type="button" className="btn btn-sm" onClick={abrirRec}>Enviar recordatorio</button><button type="button" className="btn btn-sm" onClick={() => setFactOpen(true)}>Nueva factura</button></>}>
        <div style={sx('display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px')}>
          {bucket('Al corriente', b.corriente)}{bucket('1–30 días', b.d30)}{bucket('31–60 días', b.d60)}{bucket('Más de 60 días', b.mas60, true)}
        </div>
        {movil
          ? <div style={sx('display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:4px 4px 0;font-size:12px;color:#5F6B7A;--sx-fijo:1')}><span>Factura · concepto</span><span style={sx('text-align:right')}>Monto · estatus</span></div>
          : <div style={sx('display:grid;grid-template-columns:90px minmax(0,1fr) 100px auto;gap:10px;padding:4px 4px 0;font-size:12px;color:#5F6B7A')}><span>Factura</span><span>Concepto</span><span style={sx('text-align:right')}>Monto</span><span>Estatus</span></div>}
        {lista.map(i => {
          const [cls, txt] = estatusPill(i)
          if (movil) return (
            // Celular: folio y concepto a la izquierda, monto y estatus a la derecha
            <div key={i.id} className={'inv' + (selInv === i.id ? ' sel' : '')} onClick={() => setSelInv(s => (s === i.id ? null : i.id))} title="Seleccionar para registrar pago o recordatorio" style={sx('display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 4px;border-top:1px solid #EEF1F4;font-size:14px;--sx-fijo:1')}>
              <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{i.id}</span><span style={sx('overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{i.concepto}</span></span>
              <span style={sx('display:flex;flex-direction:column;align-items:flex-end;gap:4px')}><span className="mono">{fmt(i.monto)}</span><span className={cls}>{txt}</span></span>
            </div>
          )
          return (
            <div key={i.id} className={'inv' + (selInv === i.id ? ' sel' : '')} onClick={() => setSelInv(s => (s === i.id ? null : i.id))} title="Seleccionar para registrar pago o recordatorio" style={sx('display:grid;grid-template-columns:90px minmax(0,1fr) 100px auto;gap:10px;align-items:center;padding:8px 4px;border-top:1px solid #EEF1F4;font-size:14px')}>
              <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{i.id}</span><span style={sx('overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{i.concepto}</span><span className="mono" style={sx('text-align:right')}>{fmt(i.monto)}</span><span className={cls}>{txt}</span>
            </div>
          )
        })}
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <button type="button" className="btn btn-sm" onClick={() => setVerTodas(v => !v)}>{verTodas ? 'Ver solo las 5 recientes' : `Ver las ${facturas.length} facturas · ${pend.length} pendientes`}</button>
          <Nota>{selInv ? `Factura ${selInv} seleccionada: “Registrar pago” y “Enviar recordatorio” la usarán.` : 'Sin factura seleccionada: las acciones toman la más antigua pendiente.'}</Nota>
        </div>
      </Section>

      <Section titulo="Rentabilidad" ayuda={`Qué deja margen y qué no: ${rows.length} ${by === 'cli' ? 'clientes' : by === 'srv' ? 'tipos de servicio' : 'unidades'} en ${ETIQUETA[periodo]}. Haz clic en un encabezado para ordenar.`}
        acciones={<><button type="button" className="btn btn-sm" onClick={exportExcel} title="Descarga KPIs, rentabilidad, gastos y facturas del periodo">Exportar a Excel</button><div role="tablist" aria-label="Agrupar por" style={sx('display:flex;gap:4px;flex-wrap:wrap')}>
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={k === by} className="tab" onClick={() => { setBy(k); pg.setPage(0) }}>{label}</button>
          ))}
        </div></>}>
        <div style={sx('overflow-x:auto')}>
          <table className="tbl">
            <thead><tr><th onClick={() => toggleSort('n')}>{firstCol}{arrow('n')}</th><th onClick={() => toggleSort('rev')}>Ingresos{arrow('rev')}</th><th onClick={() => toggleSort('cost')}>Costo directo{arrow('cost')}</th><th onClick={() => toggleSort('m')}>Margen{arrow('m')}</th><th style={sx(movil ? 'min-width:120px' : 'min-width:200px')} onClick={() => toggleSort('pct')}>% margen{arrow('pct')}</th></tr></thead>
            <tbody>
              {rows.slice(pg.from, pg.to).map(r => (
                <tr key={r.n} title={r.detalle}><td>{r.n}{r.detalle && <span style={sx('display:block;font-size:12px;color:#5F6B7A;white-space:normal')}>{r.detalle}</span>}</td><td className="mono">{fmt(r.rev)}</td><td className="mono">{fmt(r.cost)}</td><td className="mono">{fmt(r.m)}</td>
                  <td><div style={sx('display:flex;align-items:center;gap:10px')}><div style={sx('flex:1;height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;width:' + Math.max(2, Math.round(r.pct * 100 / 0.45)) + '%;max-width:100%;background:' + (r.pct < 0 ? '#F0605D' : r.pct < 0.3 ? '#475CC7' : '#4CC38A'))}></div></div><span className="mono" style={sx('font-size:13px;min-width:40px;text-align:right')}>{Math.round(r.pct * 100)}%</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 25 && <Pager {...pg} />}
        <Nota>Margen = ingresos menos costo directo (nómina operativa, combustible, casetas, taller). Verde: 30% o más; azul: menos de 30%; rojo: pérdida.</Nota>
      </Section>

      <Section titulo="Gastos por categoría" ayuda={`En qué se va el dinero en ${ETIQUETA[periodo]}.`} plegable abierto={false}>
        {GASTOS.map(([k, v]) => (
          <div key={k} style={sx('display:grid;grid-template-columns:' + (movil ? '104px minmax(0,1fr) 64px;gap:8px' : '150px minmax(0,1fr) 80px;gap:12px') + ';align-items:center;font-size:14px')}>
            <span>{k}</span><div style={sx('height:10px;border-radius:5px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;width:' + Math.round(v * f / gmax * 100) + '%;background:#3FA7C9')}></div></div><span className="mono" style={sx('text-align:right')}>{fmtM1(v * f)}</span>
          </div>
        ))}
        <div style={sx('display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#5F6B7A;border-top:1px solid #EEF1F4;padding-top:8px')}><span>Total gastos directos</span><span className="mono">{fmtM1(GASTOS.reduce((a, g) => a + g[1], 0) * f)}</span></div>
        <Nota>¿Dudas sobre una cifra? <Link to={ROUTES.AsistenteIA}>Pregúntale a la IA</Link>.</Nota>
      </Section>

      <Modal open={pagoOpen} onClose={() => setPagoOpen(false)} title="Registrar pago" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setPagoOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={registrarPago}>Registrar</button></>}>
        <Field label="Factura"><select style={sx(inputStyle)} value={pago.id} onChange={e => { const fx = facturas.find(x => x.id === e.target.value); setPago({ ...pago, id: e.target.value, monto: fx ? String(fx.monto) : '' }) }}>{pend.map(x => <option key={x.id} value={x.id}>{x.id} · {x.cliente} · {fmt(x.monto)} · {x.dias} días</option>)}</select></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Monto recibido (MXN)"><input style={sx(inputStyle)} value={pago.monto} onChange={e => setPago({ ...pago, monto: e.target.value })} autoFocus /></Field>
          <Field label="Fecha"><input type="date" style={sx(inputStyle)} value={pago.fecha} onChange={e => setPago({ ...pago, fecha: e.target.value })} /></Field>
        </div>
        <Field label="Método"><select style={sx(inputStyle)} value={pago.metodo} onChange={e => setPago({ ...pago, metodo: e.target.value })}>{['Transferencia SPEI', 'Cheque', 'Compensación', 'Efectivo'].map(m => <option key={m}>{m}</option>)}</select></Field>
        <Nota>Si el monto cubre la factura completa queda “Cobrada”; si es menor, se registra como pago parcial.</Nota>
      </Modal>

      <Modal open={recOpen} onClose={() => setRecOpen(false)} title="Enviar recordatorio de pago" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setRecOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={enviarRec}>Enviar</button></>}>
        <Field label="Factura"><select style={sx(inputStyle)} value={rec.id} onChange={e => { const fx = facturas.find(x => x.id === e.target.value); setRec({ id: e.target.value, msg: fx ? `Estimado cliente ${fx.cliente}: le recordamos que la factura ${fx.id} por ${fmt(fx.monto)} MXN tiene ${fx.dias} días de antigüedad. Agradecemos su pago a la brevedad.\n\nAI27 · Cobranza` : '' }) }}>{pend.map(x => <option key={x.id} value={x.id}>{x.id} · {x.cliente} · {x.dias} días</option>)}</select></Field>
        <Field label="Para"><input style={sx(inputStyle)} readOnly value={clientes.find(c => c.nombre === facturas.find(x => x.id === rec.id)?.cliente)?.correo ?? 'cobranza@cliente.com.mx'} /></Field>
        <Field label="Mensaje"><textarea rows={5} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={rec.msg} onChange={e => setRec({ ...rec, msg: e.target.value })} /></Field>
      </Modal>

      <Modal open={factOpen} onClose={() => setFactOpen(false)} title="Nueva factura" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setFactOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={crearFactura}>Registrar factura</button></>}>
        <Field label="Cliente"><select style={sx(inputStyle)} value={nueva.cliente} onChange={e => setNueva({ ...nueva, cliente: e.target.value })}>{clientesAll.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Concepto"><input style={sx(inputStyle)} value={nueva.concepto} onChange={e => setNueva({ ...nueva, concepto: e.target.value })} placeholder={`${nueva.cliente} · servicios octubre`} /></Field>
        <Field label="Monto (MXN antes de IVA)"><input style={sx(inputStyle)} value={nueva.monto} onChange={e => setNueva({ ...nueva, monto: e.target.value })} placeholder="1,250,000" /></Field>
        <Nota>En el demo la factura se registra sin timbrado CFDI.</Nota>
      </Modal>
    </Shell>
  )
}
