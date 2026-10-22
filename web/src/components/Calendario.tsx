import { useEffect, useId, useRef, useState } from 'react'
import { corta, diasEntre, rango, sumaDias } from '../lib/fechas'
import { clicDia, diaElegible, diasViaje, mesDe, mesSiguiente, semanasMes, type Fechas, type RangoViaje, type Seleccion } from '../lib/viaje'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const SEMANA_LARGA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const nombreMes = (mes: string) => `${MESES[Number(mes.slice(5)) - 1]} ${mes.slice(0, 4)}`
const diaSemana = (iso: string) => SEMANA_LARGA[(new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7]

/** Teclas de movimiento entre días (rejilla de calendario): días que avanza cada una. */
const PASOS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

/** Selector de fechas que se despliega bajo su botón: primer clic = ida, segundo = vuelta (de la ida al final de la ventana).
 *  Los días que no se pueden elegir llevan aria-disabled y siguen siendo navegables con las flechas (rejilla con foco itinerante). */
export function Calendario({ r, fechas, onChange, idBoton }: { r: RangoViaje | null; fechas: Fechas | null; onChange: (f: Fechas) => void; idBoton?: string }) {
  const [abierto, setAbierto] = useState(false)
  const [sel, setSel] = useState<Seleccion>({ fase: 'ida' })
  const [encima, setEncima] = useState<string | null>(null)
  const [mes, setMes] = useState(mesDe(fechas?.ida ?? r?.desde ?? '2026-01'))
  // Día con el foco de la rejilla: el único que entra con Tab; las flechas lo mueven
  const [foco, setFoco] = useState('')
  const caja = useRef<HTMLDivElement>(null), boton = useRef<HTMLButtonElement>(null)
  const idPanel = useId(), idAyuda = useId()

  const abrir = () => { if (!r) return; const f = fechas?.ida ?? r.desde; setSel({ fase: 'ida' }); setMes(mesDe(f)); setFoco(f); setAbierto(true) }
  const cerrar = (foco = true) => { setAbierto(false); setEncima(null); if (foco) boton.current?.focus() }
  // Clic fuera o Esc cierran sin cambiar nada
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) cerrar(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar() }
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])
  // El foco de la rejilla sigue a `foco` (al abrir, al mover con flechas y al cambiar de mes)
  useEffect(() => { if (abierto && foco) caja.current?.querySelector<HTMLButtonElement>(`.cal-dia[data-dia="${foco}"]`)?.focus() }, [abierto, foco, mes])

  const pulsar = (dia: string) => {
    if (!r || !diaElegible(r, sel, dia)) return // días no disponibles: ni clic ni teclado
    const res = clicDia(sel, dia)
    setSel(res.sel)
    if (res.fechas) { onChange(res.fechas); cerrar() }
  }
  const mover = (e: React.KeyboardEvent, dia: string) => {
    if (!r || !(e.key in PASOS)) return
    e.preventDefault()
    const nuevo = sumaDias(dia, PASOS[e.key])
    if (mesDe(nuevo) < mesDe(r.desde) || mesDe(nuevo) > mesDe(r.hasta)) return // no se sale de los meses de la ventana
    setMes(mesDe(nuevo)); setFoco(nuevo)
  }
  const cambiarMes = (n: number) => { setMes(mesSiguiente(mes, n)); setFoco('') }
  // Día que entra con Tab en el mes visible: el del foco si está en este mes; si no, el primero elegible (o el primero)
  const diasMes = semanasMes(mes).flat().filter((x): x is string => !!x)
  const tabulable = r && diasMes.includes(foco) ? foco : (r && diasMes.find(x => diaElegible(r, sel, x))) ?? diasMes[0]
  // Lo que se pinta como elegido: la selección en curso (con la vista previa al pasar el ratón) o las fechas actuales
  const [a, b] = sel.fase === 'vuelta'
    ? [sel.ida, encima && r && encima >= sel.ida && diaElegible(r, sel, encima) ? encima : sel.ida]
    : fechas ? [fechas.ida, fechas.vuelta] : ['', '']
  const n = fechas ? diasViaje(fechas) : 0

  return (
    <div className="cal" ref={caja}>
      <span className="cal-etq" id={idAyuda}>Fechas del viaje</span>
      <button type="button" ref={boton} id={idBoton} className={`cal-boton${fechas ? '' : ' cal-boton--vacio'}`} aria-expanded={abierto} aria-controls={idPanel} aria-describedby={idAyuda}
        disabled={!r} onClick={() => (abierto ? cerrar() : abrir())}>
        {fechas
          ? <><span className="cal-boton-f">{fechas.ida === fechas.vuelta ? corta(fechas.ida) : rango([fechas.ida, fechas.vuelta])}</span>
            <span className="cal-boton-n">{n} {n === 1 ? 'día' : 'días'}</span></>
          : <span className="cal-boton-f">{r ? 'Elige los días del viaje' : 'Elige antes el destino'}</span>}
      </button>
      {abierto && r && (
        <div className="cal-panel" id={idPanel} role="group" aria-label="Elegir fechas del viaje">
          <p className="cal-paso" role="status">{sel.fase === 'ida'
            ? <><b>1.</b> Elige el día de ida</>
            : <><b>2.</b> Ahora el día de vuelta <span className="dim">(ida: {corta(sel.ida)})</span></>}</p>
          {sel.fase === 'vuelta' && <button type="button" className="cal-cambiar" onClick={() => { setSel({ fase: 'ida' }); setFoco(sel.ida) }}>Cambiar día de ida</button>}
          <div className="cal-nav">
            <button type="button" className="cal-flecha" onClick={() => cambiarMes(-1)} disabled={mes <= mesDe(r.desde)} aria-label="Mes anterior">‹</button>
            <h3 className="cal-mes">{nombreMes(mes)}</h3>
            <button type="button" className="cal-flecha" onClick={() => cambiarMes(1)} disabled={mes >= mesDe(r.hasta)} aria-label="Mes siguiente">›</button>
          </div>
          <table className="cal-tabla" onMouseLeave={() => setEncima(null)}>
            <thead><tr>{SEMANA.map((s, i) => <th key={s} scope="col" abbr={SEMANA_LARGA[i]}>{s}</th>)}</tr></thead>
            <tbody>{semanasMes(mes).map((sem, i) => <tr key={i}>{sem.map((dia, j) => {
              if (!dia) return <td key={j} />
              const ok = diaElegible(r, sel, dia), enRango = dia >= a && dia <= b
              const clase = ['cal-dia', enRango && 'cal-dia--rango', (dia === a || dia === b) && 'cal-dia--extremo', dia >= r.desde && dia <= r.hasta && 'cal-dia--ventana'].filter(Boolean).join(' ')
              const nd = sel.fase === 'vuelta' && dia >= sel.ida ? diasEntre(sel.ida, dia) + 1 : 0, extra = nd ? `, viaje de ${nd} ${nd === 1 ? 'día' : 'días'}` : ''
              return <td key={j}><button type="button" className={clase} data-dia={dia} aria-disabled={!ok || undefined} aria-pressed={enRango}
                tabIndex={dia === tabulable ? 0 : -1} aria-label={`${diaSemana(dia)} ${corta(dia)}${ok ? extra : ', no disponible'}`}
                onClick={() => pulsar(dia)} onKeyDown={e => mover(e, dia)}
                onMouseEnter={() => setEncima(dia)} onFocus={() => { setEncima(dia); setFoco(dia) }}>{Number(dia.slice(8))}</button></td>
            })}</tr>)}</tbody>
          </table>
          <p className="nota">Solo se pueden elegir los días de la mejor ventana para ir ({rango(r.ventana)}){r.desde > r.ventana[0] ? `, desde hoy (${corta(r.desde)})` : ''}.</p>
        </div>
      )}
    </div>
  )
}
