import type { CSSProperties } from 'react'
import { modoActual, type Modo } from './viewport'

const caches: Record<Modo, Map<string, CSSProperties>> = { escritorio: new Map(), tablet: new Map(), movil: new Map() }

/**
 * Convierte un string CSS inline del diseño ("display:flex;gap:8px") a un objeto de estilo de React.
 *
 * Responsive: el diseño original es de escritorio (inline styles, sin media queries). En tablet y celular
 * `sx()` adapta las declaraciones que rompen el layout en pantallas angostas, sin tocar cada pantalla:
 *   - rejillas de N columnas iguales → 2 columnas en tablet (N≥3) y 1 columna en celular (2 si N≥4, para KPIs);
 *   - filas flex sin `flex-wrap` → envuelven en celular;
 *   - anchos fijos ≥ 360px → `min(Npx, 100%)`;
 *   - tipografías ≥ 30px → 80 % en celular.
 * `App` se suscribe a `useViewport()`, así que toda la pantalla se vuelve a renderizar al cruzar un corte.
 */
export function sx(css: string | undefined | null): CSSProperties {
  if (!css) return {}
  const modo = modoActual()
  const cache = caches[modo]
  const hit = cache.get(css)
  if (hit) return hit
  const out: Record<string, string> = {}
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    const val = decl.slice(i + 1).trim()
    if (!prop) continue
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    out[key] = val
  }
  // Escape: "--sx-fijo:1" en el string deja las declaraciones tal cual en todos los modos
  // (p. ej. una rejilla de 3 columnas pequeñas que sí cabe en celular, o un min-width de scroll deliberado).
  const fijo = '--sx-fijo' in out
  if (fijo) delete out['--sx-fijo']
  if (modo !== 'escritorio' && !fijo) adaptar(out, modo)
  cache.set(css, out as CSSProperties)
  return out as CSSProperties
}

/* ───────────── Reglas responsive ───────────── */

// repeat(N, 1fr) · repeat(N, minmax(0,1fr)) · repeat(N, minmax(160px,1fr)) · "1fr 1fr" · "1fr 1fr 1fr"
const RE_REPEAT = /^repeat\(\s*(\d+)\s*,\s*(?:1fr|minmax\(\s*(0|\d+)(?:px)?\s*,\s*1fr\s*\))\s*\)$/
const RE_FRS = /^(?:(?:1fr|minmax\(\s*0\s*,\s*1fr\s*\))\s*){2,}$/

/** Número de columnas iguales de una rejilla, o null si no aplica. Columnas con mínimo ≤120px ya caben en celular: no se tocan. */
function columnasIguales(valor: string): number | null {
  const m = RE_REPEAT.exec(valor)
  if (m) {
    const minimo = Number(m[2] ?? 0)
    if (minimo > 0 && minimo <= 120) return null
    return Number(m[1])
  }
  if (RE_FRS.test(valor)) return valor.trim().split(/\s+/).length
  return null
}

function adaptar(s: Record<string, string>, modo: Modo) {
  const movil = modo === 'movil'
  const pxDe = (v?: string) => { const m = v ? /^(\d+(?:\.\d+)?)px$/.exec(v) : null; return m ? Number(m[1]) : null }

  // Carrusel deliberado: rejilla + min-width grande dentro de un contenedor con scroll (kanban, agenda). Se deja tal cual.
  const carrusel = !!s.gridTemplateColumns && (pxDe(s.minWidth) ?? 0) >= 360

  // Rejillas de columnas iguales
  const cols = s.gridTemplateColumns
  if (cols && !carrusel) {
    const n = columnasIguales(cols)
    if (n && n >= 2) {
      if (movil) s.gridTemplateColumns = n >= 4 ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,1fr)'
      else if (n >= 3) s.gridTemplateColumns = 'repeat(2,minmax(0,1fr))'
    }
  }

  // Filas flex: que envuelvan en celular. Excepciones: columnas, carruseles con scroll, filas nowrap y el patrón
  // "título a la izquierda · acción a la derecha" (justify-content:space-between), donde el botón de cerrar debe quedarse en su fila.
  if (movil && (s.display === 'flex' || s.display === 'inline-flex') && !s.flexWrap && !/column/.test(s.flexDirection ?? '') && !s.overflowX && !/auto|scroll/.test(s.overflow ?? '') && s.whiteSpace !== 'nowrap' && s.justifyContent !== 'space-between') {
    s.flexWrap = 'wrap'
  }

  // Anchos fijos grandes: nunca más anchos que el contenedor
  const w = s.width
  if (w) {
    const px = /^(\d+(?:\.\d+)?)px$/.exec(w)
    if (px && Number(px[1]) >= 360) s.width = `min(${w},100%)`
  }
  if (s.minWidth && !carrusel) {
    const px = /^(\d+(?:\.\d+)?)px$/.exec(s.minWidth)
    if (px && Number(px[1]) >= 360 && s.display !== 'table' && !s.borderCollapse) s.minWidth = movil ? '0' : `min(${s.minWidth},100%)`
  }

  // Tipografía grande en celular (cifras de KPI, títulos)
  if (movil && s.fontSize) {
    const px = /^(\d+(?:\.\d+)?)px$/.exec(s.fontSize)
    if (px && Number(px[1]) >= 30) s.fontSize = `${Math.round(Number(px[1]) * 0.8)}px`
  }
}

export const fmtMXN = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
