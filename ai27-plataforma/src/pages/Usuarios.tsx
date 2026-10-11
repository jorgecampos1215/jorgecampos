import { useMemo, useState } from 'react'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { Field, Modal, btnPriStyle, btnStyle, inputStyle, useToast } from '../components/ui'
import { Nota, PageHeader, Section } from '../components/Page'
import { usuarios as USUARIOS_SEED, type Usuario } from '../data/usuarios'
import { descargar, toCSV } from '../data/rh'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-mute{background:#EBEEF2;color:#4A5868}.p-info{background:#E3F2F8;color:#0B6A8A}.p-bad{background:#FDE8E8;color:#B42318}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:8px 12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.tbl tbody tr:hover td{background:#FAFBFC}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.btn-sm{min-height:32px;padding:0 10px;font-size:13px}
.btn-ok{background:#E3F6EC;border-color:#BFE8D0;color:#17784A}
.th-act{text-align:center;cursor:pointer}
.th-act:hover{color:#0D1D41}
.th-act small{display:block;text-transform:none;letter-spacing:0;font-size:11px;color:#8A95A3;font-weight:400;margin-top:2px}
/* Celular: la tabla de permisos (pantalla + 4 casillas) cabe en 390px con celdas más angostas que las de global.css */
@media (max-width:719px){.tbl-permisos th,.tbl-permisos td{padding-left:4px !important;padding-right:4px !important}}
`

const SR = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'
const SEL = "min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif"

const MODS = ['Dashboard', 'Servicios', 'Asignación IA', 'Monitoreo', 'Reacción', 'Custodios (datos sensibles)', 'Flotilla y taller', 'Cotizador', 'CRM', 'RH', 'Finanzas', 'Usuarios y roles']
/** Nombre que ve el usuario en el menú (lenguaje de la operación). */
const MOD_LABEL: Record<string, string> = { 'Dashboard': 'Inicio (tablero)', 'Servicios': 'Servicios', 'Asignación IA': 'Asignar custodios', 'Monitoreo': 'Mapa en vivo', 'Reacción': 'Incidentes', 'Custodios (datos sensibles)': 'Custodios (datos sensibles)', 'Flotilla y taller': 'Flotilla y taller', 'Cotizador': 'Cotizaciones', 'CRM': 'Clientes', 'RH': 'Equipo', 'Finanzas': 'Finanzas', 'Usuarios y roles': 'Usuarios' }
const ACTS = ['Ver', 'Crear', 'Editar', 'Aprobar']
const ACT_HELP: Record<string, string> = { Ver: 'abrir la pantalla', Crear: 'agregar registros', Editar: 'cambiar registros', Aprobar: 'autorizar (tarifas, gastos, altas)' }
const R: Record<string, string[]> = {
  'Dirección':        ['1111', '1111', '1111', '1111', '1111', '1001', '1001', '1111', '1111', '1001', '1111', '1111'],
  'Operaciones':      ['1000', '1111', '1111', '1110', '1110', '1010', '1000', '1000', '1000', '0000', '0000', '0000'],
  'Monitorista':      ['0000', '1010', '0000', '1110', '1100', '1000', '1000', '0000', '0000', '0000', '0000', '0000'],
  'Reacción':         ['0000', '1000', '0000', '1000', '1111', '1000', '0000', '0000', '0000', '0000', '0000', '0000'],
  'Flotilla / Taller':['0000', '1000', '0000', '1000', '0000', '0000', '1111', '0000', '0000', '0000', '1000', '0000'],
  'RH':               ['0000', '0000', '0000', '0000', '0000', '1111', '0000', '0000', '0000', '1111', '0000', '0000'],
  'Comercial':        ['1000', '1100', '0000', '0000', '0000', '0000', '0000', '1111', '1111', '0000', '1000', '0000'],
  'Finanzas':         ['1000', '1000', '0000', '0000', '1000', '0000', '1000', '1000', '1000', '0000', '1111', '0000'],
  'Portal cliente':   ['0000', '1000', '0000', '1000', '1000', '0000', '0000', '0000', '0000', '0000', '0000', '0000'],
}
type Perms = Record<string, boolean[][]>
const INITIAL: Perms = Object.fromEntries(Object.entries(R).map(([k, rows]) => [k, rows.map(s => s.split('').map(c => c === '1'))]))
const DESC0: Record<string, string> = { 'Dirección': 'Acceso total con aprobación de tarifas, gastos y altas.', 'Operaciones': 'Coordina servicios y asignaciones; acepta o cambia la sugerencia de la IA.', 'Monitorista': 'Da seguimiento en vivo, registra bitácora y escala incidentes.', 'Reacción': 'Atiende incidentes, registra recuperación y evidencias.', 'Flotilla / Taller': 'Gestiona unidades, órdenes de taller y combustible.', 'RH': 'Reclutamiento, expedientes y datos sensibles de custodios.', 'Comercial': 'Cotiza, da seguimiento a leads y administra clientes.', 'Finanzas': 'Ingresos, cuentas por cobrar, gastos y rentabilidad.', 'Portal cliente': 'El cliente ve sus servicios en vivo y sus reportes.' }
const ZONAS = ['Todas las zonas', 'Centro', 'Bajío', 'Centro y Bajío', 'Noreste', 'Golfo', 'Occidente', 'Sureste', 'Noroeste']
const CLIENTES = ['Todos los clientes', 'Clientes asignados', 'Solo su empresa', 'Marsh', 'Autopartes Saltillo']
type Scope = { zone: string; client: string }
const INITIAL_SCOPE: Record<string, Scope> = Object.fromEntries(Object.keys(R).map(r => [r, { zone: r === 'Monitorista' ? 'Centro y Bajío' : 'Todas las zonas', client: r === 'Portal cliente' ? 'Solo su empresa' : 'Todos los clientes' }]))
type Audit = { t: string; who: string; what: string }
const AUDIT: Audit[] = [
  { t: '07 oct 14:02', who: 'Dirección · A. Gómez', what: 'Aprobó tarifa base Bajío: $28.50/km → $30.00/km' },
  { t: '07 oct 13:41', who: 'RH · K. May', what: 'Actualizó evaluación de confianza de C-1240' },
  { t: '07 oct 12:15', who: 'Operaciones · J. Pérez', what: 'Cambió sugerencia IA en SRV-24822 (C-0612 → C-0654)' },
  { t: '07 oct 11:58', who: 'Sistema', what: 'Alta de usuario portal cliente para Marsh' },
  { t: '06 oct 19:20', who: 'Finanzas · L. Cruz', what: 'Marcó factura F-9921 como cobrada' },
  { t: '06 oct 16:05', who: 'Monitorista · S. Campos', what: 'Escaló alerta de desvío en SRV-24817 a Reacción' },
  { t: '06 oct 10:48', who: 'Flotilla / Taller · R. Salas', what: 'Cerró orden OT-1188 (AU-1450, suspensión)' },
  { t: '05 oct 17:30', who: 'Comercial · A. Domínguez', what: 'Envió cotización COT-2291 a Farmacéutica Orión' },
  { t: '05 oct 09:02', who: 'Sistema', what: 'Respaldo diario completado · 1.8 GB' },
  { t: '04 oct 12:40', who: 'RH · K. May', what: 'Registró alta de C-1311 (Luis Canché)' },
]
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const stamp = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())} ${MES[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}` }
const actor = (who: string) => who.split(' · ')[0]
const ini = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('')

/** Lista legible de los cambios entre lo guardado y lo editado. */
function diff(saved: Perms, cur: Perms, savedScope: Record<string, Scope>, curScope: Record<string, Scope>): Audit[] {
  const out: Audit[] = []
  for (const role of Object.keys(cur)) {
    if (!saved[role]) continue
    const plus: string[] = [], minus: string[] = []
    cur[role].forEach((row, i) => row.forEach((on, j) => {
      if (on !== saved[role][i][j]) (on ? plus : minus).push(`${ACTS[j]} ${MODS[i]}`)
    }))
    const parts: string[] = []
    if (plus.length) parts.push('otorgó ' + plus.join(', '))
    if (minus.length) parts.push('retiró ' + minus.join(', '))
    if (curScope[role].zone !== savedScope[role].zone) parts.push(`zona: ${savedScope[role].zone} → ${curScope[role].zone}`)
    if (curScope[role].client !== savedScope[role].client) parts.push(`cliente: ${savedScope[role].client} → ${curScope[role].client}`)
    if (parts.length) out.push({ t: stamp(), who: 'Dirección · Tú', what: `Rol ${role}: ` + parts.join(' · ') })
  }
  return out
}

export default function Usuarios() {
  const toast = useToast()
  // Tablet y celular: la tabla de permisos cabe sin scroll (encabezados cortos, leyenda aparte); en celular la bitácora y la lista de usuarios se apilan.
  const modo = useViewport()
  const compacto = modo !== 'escritorio'
  const movil = modo === 'movil'
  const [role, setRole] = useState('Monitorista')
  const [perms, setPerms] = useState<Perms>(INITIAL)
  const [saved, setSaved] = useState<Perms>(INITIAL)
  const [scope, setScope] = useState(INITIAL_SCOPE)
  const [savedScope, setSavedScope] = useState(INITIAL_SCOPE)
  const [desc, setDesc] = useState(DESC0)
  const [audit, setAudit] = useState<Audit[]>(AUDIT)
  const [users, setUsers] = useState<Usuario[]>(USUARIOS_SEED)
  const [modal, setModal] = useState<null | 'invitar' | 'rol' | 'usuarios'>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [fActor, setFActor] = useState('Todos')
  const [fQ, setFQ] = useState('')
  const [uQ, setUQ] = useState('')

  const roles = Object.keys(perms)
  const counts = useMemo(() => Object.fromEntries(roles.map(r => [r, users.filter(u => u.rol === r && u.estatus !== 'Inactivo').length])), [roles, users])
  const changes = diff(saved, perms, savedScope, scope)
  const toggle = (i: number, j: number) => {
    const p = { ...perms }
    p[role] = p[role].map(r => r.slice())
    p[role][i][j] = !p[role][i][j]
    setPerms(p)
  }
  const setRoleScope = (k: keyof Scope, v: string) => setScope({ ...scope, [role]: { ...scope[role], [k]: v } })
  const guardar = () => {
    if (!changes.length) { toast('No hay cambios pendientes', 'info'); return }
    setAudit([...changes, ...audit])
    setSaved(perms)
    setSavedScope(scope)
    toast(`Permisos guardados · ${changes.length} ${changes.length === 1 ? 'rol actualizado' : 'roles actualizados'}`)
  }
  const descartar = () => { setPerms(saved); setScope(savedScope); toast('Cambios descartados', 'info') }
  const cur = scope[role]
  const nPermisos = perms[role].flat().filter(Boolean).length

  const open = (m: typeof modal, f: Record<string, string> = {}) => { setForm(f); setModal(m) }
  const F = (k: string) => form[k] ?? ''
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const abrirInvitar = () => open('invitar', { rol: role, zona: scope[role].zone })

  const invitar = () => {
    const nombre = F('nombre').trim(), correo = F('correo').trim()
    if (!nombre || !correo.includes('@')) { toast('Captura nombre y un correo válido', 'warn'); return }
    const rol = F('rol') || role
    const u: Usuario = { id: 'U-' + String(100 + users.length), nombre, correo, rol, zona: F('zona') || 'Todas las zonas', ultimoAcceso: 'sin acceso aún', estatus: 'Invitado' }
    setUsers(us => [u, ...us])
    setAudit(a => [{ t: stamp(), who: 'Dirección · Tú', what: `Invitó a ${nombre} (${correo}) con rol ${rol}` }, ...a])
    setModal(null); setRole(rol)
    toast(`Invitación enviada a ${correo} · rol ${rol}`)
  }
  const crearRol = () => {
    const nombre = F('nombre').trim()
    if (!nombre) { toast('Escribe el nombre del rol', 'warn'); return }
    if (perms[nombre]) { toast('Ya existe un rol con ese nombre', 'warn'); return }
    const base = F('base') || 'Monitorista'
    const p = perms[base].map(r => r.slice())
    setPerms({ ...perms, [nombre]: p }); setSaved({ ...saved, [nombre]: p })
    setScope({ ...scope, [nombre]: { ...scope[base] } }); setSavedScope({ ...savedScope, [nombre]: { ...scope[base] } })
    setDesc({ ...desc, [nombre]: F('desc').trim() || `Rol basado en ${base}.` })
    setAudit(a => [{ t: stamp(), who: 'Dirección · Tú', what: `Creó el rol ${nombre} a partir de ${base}` }, ...a])
    setRole(nombre); setModal(null)
    toast(`Rol "${nombre}" creado · ajusta sus permisos y guarda`)
  }
  const toggleUser = (u: Usuario) => {
    const next: Usuario['estatus'] = u.estatus === 'Inactivo' ? 'Activo' : 'Inactivo'
    setUsers(us => us.map(x => (x.id === u.id ? { ...x, estatus: next } : x)))
    setAudit(a => [{ t: stamp(), who: 'Dirección · Tú', what: `${next === 'Inactivo' ? 'Desactivó' : 'Reactivó'} al usuario ${u.nombre} (${u.rol})` }, ...a])
    toast(`${u.nombre} ${next === 'Inactivo' ? 'desactivado' : 'reactivado'}`, next === 'Inactivo' ? 'warn' : 'ok')
  }
  const reenviar = (u: Usuario) => { setAudit(a => [{ t: stamp(), who: 'Sistema', what: `Reenvió invitación a ${u.correo}` }, ...a]); toast(`Invitación reenviada a ${u.correo}`) }

  const actores = ['Todos', ...Array.from(new Set(audit.map(a => actor(a.who))))]
  const fq = fQ.trim().toLowerCase()
  const auditView = audit.filter(a => (fActor === 'Todos' || actor(a.who) === fActor) && (!fq || (a.who + ' ' + a.what + ' ' + a.t).toLowerCase().includes(fq)))
  const exportar = () => { descargar('bitacora-auditoria.csv', toCSV([['Fecha', 'Quién', 'Qué'], ...auditView.map(a => [a.t, a.who, a.what])])); toast(`Bitácora exportada · ${auditView.length} eventos (CSV)`) }

  const uq = uQ.trim().toLowerCase()
  const usersRol = users.filter(u => u.rol === role && (!uq || (u.nombre + ' ' + u.correo + ' ' + u.zona).toLowerCase().includes(uq)))
  const activos = users.filter(u => u.estatus !== 'Inactivo').length

  return (
    <Shell active="usuarios" css={CSS}>
      <PageHeader seccion="Administración" titulo="Usuarios"
        descripcion={`Quién entra a la plataforma y qué puede hacer: cada persona tiene un rol, y el rol dice qué pantallas ve y si puede crear, editar o aprobar. ${activos} usuarios en ${roles.length} roles.`}
        accion={{ label: 'Invitar usuario', onClick: abrirInvitar }}
        secundarias={<button type="button" className="btn" onClick={() => open('rol', { base: role })}>Nuevo rol</button>} />

      {changes.length > 0 && (
        <div role="status" style={sx('display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;background:#FFF3DC;border:1px solid #F3D9A4;border-radius:10px;padding:12px 16px;font-size:14px;color:#0D1D41')}>
          <span><b>{changes.length} {changes.length === 1 ? 'rol con cambios' : 'roles con cambios'} sin guardar.</b> Los permisos nuevos aplican hasta que guardes.</span>
          <span style={sx('display:flex;gap:8px')}><button type="button" className="btn btn-sm" onClick={descartar}>Descartar</button><button type="button" className="btn btn-sm btn-ok" onClick={guardar}>Guardar cambios</button></span>
        </div>
      )}

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <nav aria-label="Roles" className="card" style={sx('flex:1 1 240px;padding:10px;display:flex;flex-direction:column;gap:4px')}>
          <span className="lbl" style={sx('padding:6px 12px 4px')}>Roles · {roles.length}</span>
          {roles.map(name => (
            <button key={name} type="button" aria-current={name === role ? 'true' : undefined} onClick={() => setRole(name)}
              style={sx("display:flex;justify-content:space-between;align-items:center;min-height:44px;padding:0 12px;border-radius:8px;border:0;cursor:pointer;font:500 14px 'Montserrat',sans-serif;text-align:left;" + (name === role ? 'background:#E9EDFB;color:#0D1D41' : 'background:transparent;color:#2A3442'))}>
              <span>{name}</span><span className="mono" title={`${counts[name]} usuarios activos`} style={sx('font-size:12px;color:#5F6B7A')}>{counts[name]}</span>
            </button>
          ))}
          <Nota>El número es cuántos usuarios activos tienen ese rol. Elige uno para ver y editar sus permisos.</Nota>
        </nav>

        <div style={sx('flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:16px')}>
          <Section titulo={`Permisos del rol ${role}`} ayuda={`${desc[role]} ${nPermisos} permisos activos.`}
            acciones={<button type="button" className="btn btn-sm" onClick={() => { setUQ(''); setModal('usuarios') }}>Ver {counts[role]} {counts[role] === 1 ? 'usuario' : 'usuarios'}</button>}>
            <Nota>Marca una casilla para dar el permiso y desmárcala para quitarlo. Haz clic en el nombre de una pantalla para marcar toda la fila, o en un encabezado para marcar toda la columna. Después, guarda.</Nota>
            <div style={sx('overflow-x:auto')}>
              <table className="tbl tbl-permisos">
                <thead><tr><th>Pantalla</th>{ACTS.map((a, j) => <th key={a} className="th-act" title={`Marcar/desmarcar “${a}” en todas las pantallas`} style={sx(movil ? 'font-size:11px;letter-spacing:0' : '')} onClick={() => { const all = perms[role].every(r => r[j]); const p = { ...perms, [role]: perms[role].map(r => { const c = r.slice(); c[j] = !all; return c }) }; setPerms(p) }}>{a}{!compacto && <small>{ACT_HELP[a]}</small>}</th>)}</tr></thead>
                <tbody>
                  {MODS.map((mod, i) => (
                    <tr key={mod}><td style={sx('cursor:pointer' + (movil ? ';white-space:normal' : ''))} title="Marcar/desmarcar toda la fila" onClick={() => { const all = perms[role][i].every(Boolean); const p = { ...perms, [role]: perms[role].map((r, k) => (k === i ? r.map(() => !all) : r)) }; setPerms(p) }}>{MOD_LABEL[mod] ?? mod}</td>
                      {ACTS.map((a, j) => (
                        <td key={a} style={sx('text-align:center')}><label style={sx(`display:inline-flex;min-width:${movil ? 36 : 44}px;min-height:36px;align-items:center;justify-content:center;cursor:pointer`)}><span style={sx(SR)}>{a + ' ' + mod}</span><input type="checkbox" checked={perms[role][i][j]} onChange={() => toggle(i, j)} style={sx('width:18px;height:18px;accent-color:#475CC7')} /></label></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* En pantallas chicas la ayuda de cada columna sale del encabezado (para que la tabla quepa) y se muestra aquí */}
            {compacto && <Nota>{ACTS.map(a => `${a}: ${ACT_HELP[a]}`).join(' · ')}</Nota>}
          </Section>

          <Section titulo="Alcance del rol" ayuda="Hasta dónde llega lo que ve: solo su zona, solo sus clientes o toda la empresa." plegable abierto={false}>
            <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
              <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>Zonas que puede ver<select style={sx(SEL)} value={cur.zone} onChange={e => setRoleScope('zone', e.target.value)}>{ZONAS.map(z => <option key={z}>{z}</option>)}</select></label>
              <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>Clientes que puede ver<select style={sx(SEL)} value={cur.client} onChange={e => setRoleScope('client', e.target.value)}>{CLIENTES.map(c => <option key={c}>{c}</option>)}</select></label>
            </div>
            <Nota>Ejemplo: un monitorista con alcance “Centro y Bajío” solo ve los servicios y custodios de esas zonas en el mapa en vivo.</Nota>
          </Section>
        </div>
      </div>

      <Section titulo="Bitácora de cambios" ayuda="Quién hizo qué y cuándo en toda la plataforma. Sirve para auditoría." plegable abierto={false}
        acciones={<><label style={sx('display:flex')}><span style={sx(SR)}>Buscar en bitácora</span><input type="search" placeholder="Buscar en la bitácora" value={fQ} onChange={e => setFQ(e.target.value)} style={sx(SEL + ';min-width:220px;min-height:34px')} /></label>
          <label style={sx('display:flex')}><span style={sx(SR)}>Filtrar por quién</span><select style={sx(SEL + ';min-height:34px')} value={fActor} onChange={e => setFActor(e.target.value)}>{actores.map(a => <option key={a}>{a}</option>)}</select></label>
          <button type="button" className="btn btn-sm" onClick={exportar}>Exportar CSV</button></>}>
        {auditView.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A;padding:8px 0;border-top:1px solid #EEF1F4')}>Sin eventos para ese filtro. Prueba con otra palabra o quita el filtro de quién.</span>}
        {auditView.map((a, k) => movil ? (
          /* Celular: fecha y quién en un renglón, el qué debajo (la rejilla de 3 columnas no cabe) */
          <div key={a.t + a.what + k} style={sx('display:flex;flex-direction:column;gap:2px;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
            <span style={sx('display:flex;gap:10px;flex-wrap:wrap;align-items:baseline')}><span className="mono" style={sx('color:#5F6B7A;font-size:13px')}>{a.t}</span><span>{a.who}</span></span>
            <span style={sx('color:#3E4A59')}>{a.what}</span>
          </div>
        ) : (
          <div key={a.t + a.what + k} style={sx('display:grid;grid-template-columns:140px 180px minmax(0,1fr);gap:12px;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
            <span className="mono" style={sx('color:#5F6B7A;font-size:13px')}>{a.t}</span><span>{a.who}</span><span style={sx('color:#3E4A59')}>{a.what}</span>
          </div>
        ))}
        <span style={sx('font-size:12px;color:#5F6B7A')}>{auditView.length} de {audit.length} eventos</span>
      </Section>

      <Modal open={modal === 'invitar'} onClose={() => setModal(null)} title="Invitar usuario" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={invitar}>Enviar invitación</button></>}>
        <Field label="Nombre completo"><input style={sx(inputStyle)} value={F('nombre')} onChange={set('nombre')} placeholder="Ej. Sofía Campos" autoFocus /></Field>
        <Field label="Correo"><input type="email" style={sx(inputStyle)} value={F('correo')} onChange={set('correo')} placeholder="nombre@ai27.mx" /></Field>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Rol"><select style={sx(inputStyle)} value={F('rol')} onChange={set('rol')}>{roles.map(r => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Zona"><select style={sx(inputStyle)} value={F('zona')} onChange={set('zona')}>{ZONAS.map(z => <option key={z}>{z}</option>)}</select></Field>
        </div>
        <Nota>Recibe un correo con liga de acceso válida 48 horas y entra con los permisos del rol elegido.</Nota>
      </Modal>

      <Modal open={modal === 'rol'} onClose={() => setModal(null)} title="Nuevo rol" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={crearRol}>Crear rol</button></>}>
        <Field label="Nombre del rol"><input style={sx(inputStyle)} value={F('nombre')} onChange={set('nombre')} placeholder="Ej. Supervisor de monitoreo" autoFocus /></Field>
        <Field label="Copiar permisos de"><select style={sx(inputStyle)} value={F('base')} onChange={set('base')}>{roles.map(r => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Descripción"><textarea rows={2} style={sx(inputStyle + ';padding:10px 12px;min-height:60px')} value={F('desc')} onChange={set('desc')} placeholder="Qué puede hacer este rol" /></Field>
        <Nota>El rol nuevo empieza con los permisos del rol que copies; después los ajustas en la tabla.</Nota>
      </Modal>

      <Modal open={modal === 'usuarios'} onClose={() => setModal(null)} title={`Usuarios con rol ${role}`} width={720} footer={<><button type="button" style={sx(btnStyle)} onClick={() => { setModal(null); abrirInvitar() }}>Invitar usuario</button><button type="button" style={sx(btnPriStyle)} onClick={() => setModal(null)}>Listo</button></>}>
        <label style={sx('display:flex')}><span style={sx(SR)}>Buscar usuario</span><input type="search" placeholder="Buscar por nombre, correo o zona" value={uQ} onChange={e => setUQ(e.target.value)} style={sx(inputStyle)} /></label>
        {movil ? (
          /* Celular: una tarjeta por usuario con los mismos datos que la tabla */
          <div style={sx('display:flex;flex-direction:column')}>
            {usersRol.map(u => (
              <div key={u.id} style={sx('display:flex;flex-direction:column;gap:6px;padding:12px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
                <span style={sx('display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap')}>
                  <span style={sx('display:flex;gap:8px;align-items:center;font-weight:500')}><span style={sx('width:28px;height:28px;border-radius:50%;background:#6A5ACD;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex:none')}>{ini(u.nombre)}</span>{u.nombre}</span>
                  <span className={'pill ' + (u.estatus === 'Activo' ? 'p-ok' : u.estatus === 'Invitado' ? 'p-info' : 'p-mute')}>{u.estatus}</span>
                </span>
                <span className="mono" style={sx('font-size:13px;overflow-wrap:anywhere')}>{u.correo}</span>
                <span style={sx('font-size:13px;color:#5F6B7A')}>{u.zona} · Último acceso: <span className="mono">{u.ultimoAcceso}</span></span>
                <span style={sx('display:flex;gap:6px;flex-wrap:wrap')}>{u.estatus === 'Invitado' && <button type="button" className="btn btn-sm" onClick={() => reenviar(u)}>Reenviar</button>}<button type="button" className="btn btn-sm" onClick={() => toggleUser(u)}>{u.estatus === 'Inactivo' ? 'Reactivar' : 'Desactivar'}</button></span>
              </div>
            ))}
            {usersRol.length === 0 && <span style={sx('color:#5F6B7A;font-size:14px;padding:8px 0;border-top:1px solid #EEF1F4')}>Sin usuarios con ese criterio. Prueba con otro nombre o invita a alguien nuevo.</span>}
          </div>
        ) : (
        <div style={sx('overflow-x:auto')}>
          <table className="tbl">
            <thead><tr><th>Usuario</th><th>Correo</th><th>Zona / cliente</th><th>Último acceso</th><th>Estatus</th><th></th></tr></thead>
            <tbody>
              {usersRol.map(u => (
                <tr key={u.id}>
                  <td><span style={sx('display:flex;gap:8px;align-items:center')}><span style={sx('width:28px;height:28px;border-radius:50%;background:#6A5ACD;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600')}>{ini(u.nombre)}</span>{u.nombre}</span></td>
                  <td className="mono" style={sx('font-size:13px')}>{u.correo}</td><td>{u.zona}</td><td className="mono" style={sx('font-size:13px')}>{u.ultimoAcceso}</td>
                  <td><span className={'pill ' + (u.estatus === 'Activo' ? 'p-ok' : u.estatus === 'Invitado' ? 'p-info' : 'p-mute')}>{u.estatus}</span></td>
                  <td><span style={sx('display:flex;gap:6px')}>{u.estatus === 'Invitado' && <button type="button" className="btn btn-sm" onClick={() => reenviar(u)}>Reenviar</button>}<button type="button" className="btn btn-sm" onClick={() => toggleUser(u)}>{u.estatus === 'Inactivo' ? 'Reactivar' : 'Desactivar'}</button></span></td>
                </tr>
              ))}
              {usersRol.length === 0 && <tr><td colSpan={6} style={sx('color:#5F6B7A')}>Sin usuarios con ese criterio. Prueba con otro nombre o invita a alguien nuevo.</td></tr>}
            </tbody>
          </table>
        </div>
        )}
      </Modal>
    </Shell>
  )
}
