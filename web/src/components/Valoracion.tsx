import { useId } from 'react'
import { aCinco, type Valoracion } from '../data/locales'

const num = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 })
const fechaEs = (iso: string) => iso.split('-').reverse().join('/')
const EXTERNO = { target: '_blank', rel: 'noopener noreferrer' } as const

/** Valoración real con fuente. Sin dato comprobado no se pintan estrellas. */
export function Estrellas({ v }: { v: Valoracion | null }) {
  if (!v) return <div className="anu-val"><p className="anu-val-t">Valoración real</p><p className="dim">Valoración no disponible</p></div>
  const cinco = aCinco(v)
  return (
    <div className="anu-val">
      <p className="anu-val-t">Valoración real</p>
      <div className="anu-estrellas-fila">
        <span className="anu-estrellas" role="img" aria-label={`Valoración ${num(cinco)} de 5 según ${v.fuente}`}>
          {[0, 1, 2, 3, 4].map(i => <Estrella key={i} relleno={Math.max(0, Math.min(1, cinco - i))} />)}
        </span>
        <span className="anu-estrellas-n" aria-hidden="true">{num(cinco)} / 5</span>
      </div>
      <p className="nota">
        <a href={v.url} {...EXTERNO}>Fuente: {v.fuente} · {v.puntuacion.toLocaleString('es-ES', { minimumFractionDigits: v.puntuacion % 1 ? 1 : v.escala === 5 ? 1 : 0 })}/{v.escala}{v.opiniones ? ` · ${v.opiniones.toLocaleString('es-ES')} opiniones` : ''} · consultado el {fechaEs(v.fechaConsulta)}</a>
      </p>
    </div>
  )
}

function Estrella({ relleno }: { relleno: number }) {
  const id = 'est' + useId().replace(/:/g, '')
  const camino = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z'
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <defs><clipPath id={id}><rect x="0" y="0" width={24 * relleno} height="24" /></clipPath></defs>
      <path d={camino} className="anu-estrella-fondo" />
      <path d={camino} className="anu-estrella-relleno" clipPath={`url(#${id})`} />
    </svg>
  )
}
