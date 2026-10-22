import { useEffect, useRef } from 'react'
import type { Destino } from '../lib/tipos'
import { MESES, origenTexto, plantasFranja, plantasPorMes } from '../lib/franja'
import { Flor } from './Flor'

const COLOR: Record<string, string> = { 'Hayedo': 'var(--pl-hayedo)', Lavanda: 'var(--pl-lavanda)', Azahar: 'var(--pl-azahar)' }
/** Nombre del lugar sin repetir la planta: «Hayedo de Tejera Negra» → «Tejera Negra». */
const lugar = (d: Destino) => d.nombre.replace(/^(Hayedo de |Azahar de )/, '')

/** Franja de meses encima del mapa: bajo cada mes, las plantas en temporada (meses calculados en el pipeline).
 *  Cada chip es un enlace a la agencia con solo el destino fijado. */
export function Franja({ destinos, hoy, onIr }: { destinos: Destino[]; hoy: string; onIr: (url: string) => void }) {
  const plantas = plantasFranja(destinos)
  const porMes = plantasPorMes(plantas)
  const mesHoy = Number(hoy.slice(5, 7))
  const caja = useRef<HTMLDivElement>(null)

  // En pantallas estrechas la franja se desplaza en horizontal: al cargar, centra el mes actual
  useEffect(() => {
    const c = caja.current, col = c?.querySelector<HTMLElement>('.franja-col--hoy')
    if (!c || !col || c.scrollWidth <= c.clientWidth) return
    c.scrollLeft = col.offsetLeft - (c.clientWidth - col.offsetWidth) / 2
  }, [mesHoy, plantas.length])

  if (!plantas.length) return null
  return (
    <section className="franja" aria-labelledby="franja-t">
      <h2 className="visually-hidden" id="franja-t">Calendario de floración</h2>
      <div className="franja-scroll" ref={caja}>
        <ol className="franja-meses">
          {MESES.map((m, i) => {
            const esHoy = i + 1 === mesHoy
            return (
              <li key={m} className={`franja-col${esHoy ? ' franja-col--hoy' : ''}`}>
                <span className="franja-mes" aria-current={esHoy ? 'date' : undefined}>
                  <abbr title={m}>{m.slice(0, 3)}</abbr>{esHoy && <b className="franja-hoy">Hoy</b>}
                </span>
                {porMes[i].length ? (
                  <ul className="franja-chips">
                    {porMes[i].map(p => {
                      // Hoy cada planta tiene un destino. Con varios, aquí iría un selector de destino en vez del enlace directo.
                      const d = p.destinos[0], url = `/agencia?destino=${encodeURIComponent(d.id)}#viaje`
                      return (
                        <li key={p.planta}>
                          <a className="franja-chip" href={url} style={{ ['--pc' as string]: COLOR[p.planta] ?? 'var(--lila-2)' }}
                            aria-label={`${p.planta}, ${lugar(d)}, ${m} (${p.cal.origen.toLowerCase()}). Planear viaje`}
                            title={`${p.planta} · ${lugar(d)} · ${p.cal.desde} – ${p.cal.hasta} · ${p.cal.origen}. ${p.cal.base}`}
                            onClick={e => { if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); onIr(url) }}>
                            <Flor size={16} className="franja-flor" />
                            <span>{p.planta}</span>
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                ) : <span className="franja-vacio"><span aria-hidden="true">–</span><span className="visually-hidden">Sin floración</span></span>}
              </li>
            )
          })}
        </ol>
      </div>
      <p className="franja-origen">{origenTexto(plantas)} Pulsa una planta para planear el viaje.</p>
    </section>
  )
}
