import { aMs, corta, rango } from '../lib/fechas'
import type { Estado } from '../lib/estado'

/** Rangos sobre una línea de tiempo: banda amplia (clara) + banda probable (intensa) + marca central. Nunca una fecha única. */
export function LineaTiempo({ estado, fecha, hitosMostrar }: { estado: Estado; fecha: string; hitosMostrar: string[] }) {
  const filas = [
    ...hitosMostrar.map(id => { const h = estado.hitos.find(x => x.id === id)!; return { id, t: h.etiqueta, c: h.c, prob: h.prob, amp: h.amp, sup: h.supuesto } }),
  ]
  const v = estado.ventana
  filas.splice(1, 0, { id: 'ventana', t: 'Ventana óptima', c: v.desde, prob: v.probable, amp: v.amplia, sup: false })
  const todos = filas.flatMap(f => [aMs(f.amp[0]), aMs(f.amp[1])]).concat(aMs(fecha))
  const ini = Math.min(...todos) - 5 * 86400000, fin = Math.max(...todos) + 5 * 86400000
  const pos = (iso: string) => ((aMs(iso) - ini) / (fin - ini)) * 100
  const ancho = (a: string, b: string) => Math.max(1.2, pos(b) - pos(a))
  const ticks = [0, 1, 2, 3, 4].map(i => new Date(ini + ((fin - ini) * i) / 4).toISOString().slice(0, 10))
  return (
    <div className="lt" role="group" aria-label="Fechas previstas con margen de incertidumbre">
      {filas.map(f => (
        <div className="lt-fila" key={f.id}>
          <div className="lt-etq"><b>{f.t}</b>{f.sup ? <small> · estimado</small> : null}<span>{rango(f.prob)} <small>(amplio: {rango(f.amp)})</small></span></div>
          <div className="lt-pista" aria-hidden="true">
            <span className="lt-amp" style={{ left: pos(f.amp[0]) + '%', width: ancho(f.amp[0], f.amp[1]) + '%' }} />
            <span className={`lt-prob${f.id === 'ventana' ? ' lt-prob--v' : ''}`} style={{ left: pos(f.prob[0]) + '%', width: ancho(f.prob[0], f.prob[1]) + '%' }} />
            <span className="lt-c" style={{ left: pos(f.c) + '%' }} />
            <span className="lt-hoy" style={{ left: pos(fecha) + '%' }} />
          </div>
        </div>
      ))}
      <div className="lt-eje" aria-hidden="true">{ticks.map(t => <span key={t}>{corta(t)}</span>)}</div>
      <p className="lt-leyenda"><i className="k k-prob" /> probable <i className="k k-amp" /> amplio <i className="k k-hoy" /> fecha consultada</p>
    </div>
  )
}
