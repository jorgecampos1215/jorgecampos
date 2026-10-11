import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'

/* ───────────────────────── Toast ─────────────────────────
 * Aviso breve abajo a la derecha. Úsalo para confirmar acciones que no tienen otro efecto visible
 * ("Correo enviado a Alpura", "Orden guardada").  const toast = useToast(); toast('Guardado')
 */
type ToastKind = 'ok' | 'warn' | 'bad' | 'info'
type ToastItem = { id: number; msg: string; kind: ToastKind }
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

const KIND_STYLE: Record<ToastKind, string> = {
  ok: 'background:#E3F6EC;color:#17784A;border-color:#BFE8D0',
  warn: 'background:#E9EDFB;color:#0D1D41;border-color:#C7D0F2',
  bad: 'background:#FDE8E8;color:#B42318;border-color:#F5C2C0',
  info: 'background:#E3F2F8;color:#0B6A8A;border-color:#BFDDE9',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((msg: string, kind: ToastKind = 'ok') => {
    const id = Date.now() + Math.random()
    setItems(xs => [...xs, { id, msg, kind }])
    setTimeout(() => setItems(xs => xs.filter(x => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" style={sx('position:fixed;right:20px;bottom:20px;display:flex;flex-direction:column;gap:8px;z-index:1000;max-width:min(360px,calc(100vw - 40px))')}>
        {items.map(t => (
          <div key={t.id} role="status" style={sx(`border:1px solid;border-radius:10px;padding:12px 14px;font:500 14px 'Montserrat',sans-serif;box-shadow:0 6px 24px rgba(18,24,33,.12);${KIND_STYLE[t.kind]}`)}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ───────────────────────── Modal ─────────────────────────
 * Diálogo centrado con el estilo de tarjeta del diseño. Úsalo para formularios (Alta de custodio,
 * Nueva orden de taller, Nuevo lead…) y para confirmaciones.
 *   <Modal open={open} onClose={() => setOpen(false)} title="Alta de custodio" footer={<>…botones…</>}>…</Modal>
 */
export function Modal({ open, onClose, title, children, footer, width = 560 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const movil = useViewport() === 'movil'
  if (!open) return null
  const pad = movil ? '16px' : '22px'
  return (
    <div onClick={onClose} style={sx(`position:fixed;inset:0;background:rgba(18,24,33,.38);display:flex;align-items:center;justify-content:center;padding:${movil ? 12 : 16}px;z-index:900`)}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} style={sx(`background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;width:min(${width}px,100%);max-height:${movil ? '92vh' : 'calc(100vh - 32px)'};display:flex;flex-direction:column;font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41;box-shadow:0 20px 60px rgba(18,24,33,.18)`)}>
        <div style={sx(`display:flex;align-items:center;justify-content:space-between;flex-wrap:nowrap;gap:12px;padding:${movil ? '14px 16px' : '18px 22px'};border-bottom:1px solid #EEF1F4`)}>
          <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600;min-width:0;overflow-wrap:anywhere")}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={sx('flex:none;width:36px;height:36px;min-height:36px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#3E4A59;font-size:18px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center')}>×</button>
        </div>
        <div className="modal-body" style={sx(`padding:${movil ? '16px' : '20px 22px'};overflow:auto;display:flex;flex-direction:column;gap:14px`)}>{children}</div>
        {footer && <div style={sx(`display:flex;justify-content:flex-end;gap:10px;padding:${movil ? '12px' : '14px'} ${pad};border-top:1px solid #EEF1F4;flex-wrap:wrap`)}>{footer}</div>}
      </div>
    </div>
  )
}

/* Campo de formulario con la etiqueta del diseño (.field). */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>
      {label}
      {children}
    </label>
  )
}
export const inputStyle = "min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif;width:100%;box-sizing:border-box"
export const btnStyle = "display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none"
export const btnPriStyle = btnStyle + ';background:#475CC7;border-color:#475CC7;color:#FFFFFF'

/* ───────────────────────── Paginación ─────────────────────────
 * Para tablas con cientos de filas: muestra "1–25 de 400" y botones anterior/siguiente.
 *   const pg = usePagination(rows.length, 25); rows.slice(pg.from, pg.to) ... <Pager {...pg} />
 */
export function usePagination(total: number, pageSize = 25) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const p = Math.min(page, pages - 1)
  useEffect(() => { if (page > pages - 1) setPage(0) }, [pages, page])
  return { page: p, pages, total, pageSize, from: p * pageSize, to: Math.min(total, (p + 1) * pageSize), setPage }
}
export function Pager({ page, pages, total, from, to, setPage }: ReturnType<typeof usePagination>) {
  if (total === 0) return null
  return (
    <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px;color:#5F6B7A;padding-top:8px')}>
      <span className="mono">{from + 1}–{to} de {total.toLocaleString('es-MX')}</span>
      <div style={sx('display:flex;flex-wrap:nowrap;gap:6px;align-items:center;white-space:nowrap')}>
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} style={sx(btnStyle + ';min-height:32px;padding:0 10px' + (page === 0 ? ';opacity:.45;cursor:default' : ''))}>‹ Anterior</button>
        <span className="mono" style={sx('padding:0 6px')}>{page + 1} / {pages}</span>
        <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} style={sx(btnStyle + ';min-height:32px;padding:0 10px' + (page >= pages - 1 ? ';opacity:.45;cursor:default' : ''))}>Siguiente ›</button>
      </div>
    </div>
  )
}
