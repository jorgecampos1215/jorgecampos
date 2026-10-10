import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { sx } from '../lib/sx'
import { useViewport } from '../lib/viewport'
import { Nav, etiquetaNav, type NavId } from './Nav'
import { Logo } from './Logo'

/**
 * Contenedor estándar de las pantallas con sidebar.
 *  - Escritorio (≥1024px): sidebar fijo a la izquierda + contenido, igual que los .dc.html del diseño.
 *  - Tablet y celular: barra superior con logo y botón de menú; el menú se abre como cajón lateral.
 * `css` = el bloque <style> del <helmet> de la pantalla original (se monta solo mientras la pantalla está visible).
 */
export function Shell({ active, css, children, mainStyle }: { active: NavId; css?: string; children: ReactNode; mainStyle?: string }) {
  const modo = useViewport()
  const compacto = modo !== 'escritorio'
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => { setAbierto(false) }, [pathname])
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [abierto])

  if (!compacto) {
    return (
      <div style={sx("font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41;background:#F6F7F9;min-height:100vh;display:flex;flex-wrap:wrap")}>
        {css && <style>{css}</style>}
        <div style={sx('flex:1 1 240px;background:#FFFFFF;border-right:1px solid #EEF1F4')}>
          <Nav active={active} />
        </div>
        <main style={sx(mainStyle ?? 'flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:24px')}>
          {children}
        </main>
      </div>
    )
  }

  const movil = modo === 'movil'
  return (
    <div style={sx("font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41;background:#F6F7F9;min-height:100vh;display:flex;flex-direction:column")}>
      {css && <style>{css}</style>}
      <header className="shell-top" style={sx('position:sticky;top:0;z-index:800;display:flex;align-items:center;gap:12px;padding:10px 16px;background:#FFFFFF;border-bottom:1px solid #EEF1F4;box-sizing:border-box')}>
        <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto} aria-controls="menu-lateral"
          style={sx('width:40px;height:40px;border-radius:10px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <Link to="/" aria-label="Inicio" style={sx('display:flex;align-items:center;text-decoration:none')}><Logo height={24} /></Link>
        <span style={sx('margin-left:auto;font-size:13px;font-weight:600;color:#3E4A59;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0')}>{etiquetaNav(active)}</span>
      </header>
      <main className="shell-main" style={sx(`flex:1;min-width:0;padding:${movil ? '16px 16px 40px' : '22px 24px 48px'};box-sizing:border-box;display:flex;flex-direction:column;gap:${movil ? 18 : 22}px`)}>
        {children}
      </main>
      {abierto && (
        <>
          <div onClick={() => setAbierto(false)} aria-hidden="true" style={sx('position:fixed;inset:0;background:rgba(13,29,65,.45);z-index:900')} />
          <aside id="menu-lateral" role="dialog" aria-modal="true" aria-label="Menú principal"
            style={sx('position:fixed;top:0;left:0;bottom:0;width:min(300px,86vw);background:#FFFFFF;z-index:910;overflow-y:auto;box-shadow:0 24px 70px rgba(13,29,65,.3);display:flex;flex-direction:column')}>
            <div style={sx('display:flex;justify-content:flex-end;padding:8px 8px 0')}>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" style={sx('width:36px;height:36px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#3E4A59;font-size:18px;cursor:pointer')}>×</button>
            </div>
            <Nav active={active} />
          </aside>
        </>
      )}
    </div>
  )
}
