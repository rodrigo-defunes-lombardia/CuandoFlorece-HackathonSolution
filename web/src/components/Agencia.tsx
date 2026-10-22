import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Destino } from '../lib/tipos'
import { estadoEn, momentoTexto, SIN_AJUSTE } from '../lib/estado'
import { corta, rango, sumaDias } from '../lib/fechas'
import { calcularPrecio, euros, generarRuta, DIAS_MAX_RUTA, MAX_PERSONAS, type LocalConPrecio, type Parada, type Ruta } from '../lib/agencia'
import { cielo, diasViaje, fechasIniciales, rangoViaje, type Fechas, type RangoViaje, type TiempoDia } from '../lib/viaje'
import { tiempoViaje } from '../lib/prevision'
import { AGENCY_MARGIN } from '../config/agencia'
import { esAlojamiento, urlBooking, urlMaps } from '../data/locales'
import type { Actividad } from '../data/agencia'
import { Badge } from './Badge'
import { Calendario } from './Calendario'
import { Flor } from './Flor'
import { Modal } from './Modal'
import { Estrellas } from './Valoracion'

const EXTERNO = { target: '_blank', rel: 'noopener noreferrer' } as const
const FICTICIO = 'Precio estimado de ejemplo (ficticio)'

/** Nada tiene valor por defecto: destino, fechas y personas los elige el usuario (o vienen en la URL). */
interface Estado { destino: string; ida?: string; vuelta?: string; dias?: number; personas?: number; alojamiento?: string }
const entero = (v: string | null, max: number) => { const n = Number(v); return v && Number.isInteger(n) && n >= 1 && n <= max ? n : undefined }
/** Lee la ruta de la URL (?destino=…&ida=…&vuelta=…&personas=…&alojamiento=…). También acepta `dias=N` (enlaces antiguos):
 *  N días desde el primero disponible. Las fechas se validan contra la ventana del destino. */
function deUrl(ids: string[]): Estado {
  const q = new URLSearchParams(window.location.search)
  const destino = q.get('destino') ?? ''
  return { destino: ids.includes(destino) ? destino : '', ida: q.get('ida') ?? undefined, vuelta: q.get('vuelta') ?? undefined,
    dias: entero(q.get('dias'), DIAS_MAX_RUTA), personas: entero(q.get('personas'), MAX_PERSONAS), alojamiento: q.get('alojamiento') ?? undefined }
}
function aUrl(e: Estado, f: Fechas | null) {
  const q = new URLSearchParams()
  if (e.destino) q.set('destino', e.destino)
  if (f) { q.set('ida', f.ida); q.set('vuelta', f.vuelta) }
  if (e.personas) q.set('personas', String(e.personas))
  if (e.alojamiento) q.set('alojamiento', e.alojamiento)
  return `/agencia${q.size ? `?${q}` : ''}`
}

export function Agencia({ destinos, hoy }: { destinos: Destino[]; hoy: string }) {
  const ids = destinos.map(d => d.id)
  const [st, setSt] = useState<Estado>(() => deUrl(ids))
  const [dialogo, setDialogo] = useState(false)
  const idDestino = useId(), idAloj = useId(), idFechas = useId()
  // Llegada desde la franja de temporadas del mapa (#viaje): se lee antes de que la URL se reescriba
  const [desdeFranja] = useState(() => window.location.hash === '#viaje')
  const form = useRef<HTMLFormElement>(null)
  const d = destinos.find(x => x.id === st.destino)
  // Solo se viaja dentro de la mejor ventana del destino; las fechas de la URL se corrigen si no caben
  const r = useMemo(() => (d ? rangoViaje(d, hoy) : null), [d, hoy])
  const fechas = useMemo(() => (r ? fechasIniciales(r, st.ida, st.vuelta, st.dias) : null), [r, st.ida, st.vuelta, st.dias])
  // El estado vive en la URL para poder compartir la ruta
  useEffect(() => { window.history.replaceState(null, '', aUrl(st, fechas)) }, [st, fechas])
  useEffect(() => { const f = () => setSt(deUrl(ids)); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f) }, [ids.join()])
  // Desde la franja: baja suavemente hasta el formulario y deja el foco en las fechas
  useEffect(() => {
    if (!desdeFranja) return
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    form.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
    document.getElementById(idFechas)?.focus({ preventScroll: true })
  }, [desdeFranja, idFechas])

  // Sin fechas o sin personas no hay ruta ni precio
  const ruta = useMemo(() => (fechas && st.personas ? generarRuta(st.destino, diasViaje(fechas), st.personas, st.alojamiento) : null), [st, fechas])
  const precio = useMemo(() => ruta && calcularPrecio(ruta, ruta.personas, AGENCY_MARGIN), [ruta])
  const cambiar = (p: Partial<Estado>) => setSt(s => ({ ...s, ...p, ...(p.destino && p.destino !== s.destino ? { alojamiento: undefined, ida: undefined, vuelta: undefined, dias: undefined } : {}) }))
  // Tiempo de los días elegidos (previsión real o lo habitual esas fechas)
  const [tiempo, setTiempo] = useState<{ clave: string; dias: TiempoDia[] | null } | null>(null)
  const claveT = d && fechas ? `${d.id}.${fechas.ida}.${fechas.vuelta}` : ''
  useEffect(() => {
    if (!d || !fechas) return
    let vivo = true
    tiempoViaje(d.id, d.lat, d.lon, fechas.ida, fechas.vuelta, hoy).then(dias => { if (vivo) setTiempo({ clave: claveT, dias }) })
    return () => { vivo = false }
  }, [claveT, hoy])
  const tiempoDe = (fecha: string) => (tiempo?.clave === claveT ? tiempo.dias?.find(t => t.fecha === fecha) ?? (tiempo.dias ? undefined : null) : 'cargando' as const)

  return (
    <div className="pagina agencia">
      <header className="anu-cab">
        <p className="sobre">Demo del modelo de agencia</p>
        <h1 className="titulo">Agencia</h1>
        <p className="dim">Elige destino, fechas y personas: te armamos la ruta completa alrededor de la floración, con alojamiento, actividades y dónde comer.</p>
        <p className="banner-sim" role="note"><b>Esta página es una simulación.</b> Los precios son orientativos y ficticios, y no se realiza ninguna reserva real.</p>
      </header>

      <form className="ag-form" ref={form} aria-label="Preferencias del viaje" onSubmit={e => e.preventDefault()}>
        <div className="campo">
          <label htmlFor={idDestino}>Destino</label>
          <select id={idDestino} value={st.destino} onChange={e => cambiar({ destino: e.target.value })}>
            <option value="" disabled>Elige un destino</option>
            {destinos.map(x => <option key={x.id} value={x.id}>{x.nombre} · {x.especie}</option>)}
          </select>
        </div>
        {d && !r
          ? <p className="aviso ag-sin-fechas" role="status">No quedan fechas disponibles en la mejor ventana de este destino.</p>
          : <Calendario key={d?.id} r={r} fechas={fechas} idBoton={idFechas} onChange={f => cambiar({ ida: f.ida, vuelta: f.vuelta, dias: undefined })} />}
        <Selector leyenda="Personas" pista="Elige cuántas personas" valor={st.personas} max={MAX_PERSONAS} nombre="personas" onChange={personas => cambiar({ personas })} />
      </form>

      {d && r && <Ventana d={d} hoy={hoy} r={r} />}

      {!d || !r || !fechas || !ruta || !precio ? (
        r || !d ? <p className="ag-falta" role="status">{
          !d ? 'Elige un destino, los días del viaje y cuántas personas viajáis para ver tu ruta.'
            : !fechas && !st.personas ? 'Elige los días del viaje y cuántas personas viajáis para ver tu ruta.'
              : !fechas ? 'Elige los días del viaje para ver tu ruta.'
                : !st.personas ? 'Elige cuántas personas viajáis para ver tu ruta.'
                  : 'Todavía no tenemos datos suficientes para armar una ruta en este destino.'}</p> : null
      ) : (<>

        {ruta.noches > 0 && ruta.alojamientos.length > 1 && (
          <section className="bloque ag-aloj" aria-label="Alojamiento">
            <div className="campo">
              <label htmlFor={idAloj}>Alojamiento ({ruta.noches} {ruta.noches === 1 ? 'noche' : 'noches'}, {ruta.habitaciones} {ruta.habitaciones === 1 ? 'habitación' : 'habitaciones'})</label>
              <select id={idAloj} value={ruta.alojamiento?.id ?? ''} onChange={e => cambiar({ alojamiento: e.target.value })}>
                {ruta.alojamientos.map(a => <option key={a.id} value={a.id}>{a.nombre} · {a.localidad}</option>)}
              </select>
            </div>
            <p className="nota">Por defecto: {ruta.criterioAlojamiento.charAt(0).toLowerCase() + ruta.criterioAlojamiento.slice(1)}</p>
          </section>
        )}

        <section aria-labelledby="ag-ruta-t">
          <h2 id="ag-ruta-t" className="anu-sub">Tu ruta de {ruta.dias} {ruta.dias === 1 ? 'día' : 'días'} por {d.nombre}</h2>
          {ruta.avisos.length > 0 && <ul className="aviso ag-avisos" role="status">{ruta.avisos.map(a => <li key={a}>{a}</li>)}</ul>}
          <ol className="ag-dias">
            {ruta.itinerario.map(dia => (
              <li key={dia.n} className="ag-dia">
                <h3 className="ag-dia-t"><span className="ag-dia-n">Día {dia.n}</span> · {fechaDia(sumaDias(fechas.ida, dia.n - 1))}{dia.n === 1 && ruta.dias > 1 ? ' · Llegada' : dia.n === ruta.dias && ruta.dias > 1 ? ' · Vuelta' : ''}</h3>
                <TiempoDiaInfo t={tiempoDe(sumaDias(fechas.ida, dia.n - 1))} />
                <ol className="ag-paradas">{dia.paradas.map((p, i) => <ParadaCard key={i} p={p} />)}</ol>
              </li>
            ))}
          </ol>
        </section>

        <section className="ag-total" aria-labelledby="ag-total-t" data-ficticio>
          <div className="ag-total-cab"><h2 id="ag-total-t">Precio final</h2><span className="precio-tag">{FICTICIO}</span></div>
          <table className="ag-desglose">
            <caption className="visually-hidden">Desglose del precio para {ruta.personas} {ruta.personas === 1 ? 'persona' : 'personas'}</caption>
            <tbody>
              {precio.lineas.map(l => <tr key={l.id} data-linea={l.id}><th scope="row">{l.concepto}<small>{l.detalle}</small></th><td className="precio" data-cent={l.cent}>{euros(l.cent)}</td></tr>)}
              <tr className="ag-sub" data-linea="subtotal"><th scope="row">Subtotal de proveedores</th><td className="precio" data-cent={precio.subtotal}>{euros(precio.subtotal)}</td></tr>
              <tr data-linea="margen"><th scope="row">Gestión y reservas de la agencia ({Math.round(precio.margenPct * 100)} %)<small>Margen por gestionar todas las reservas</small></th><td className="precio" data-cent={precio.margen}>{euros(precio.margen)}</td></tr>
              <tr className="ag-tot" data-linea="total"><th scope="row">Total</th><td className="precio" data-cent={precio.total}>{euros(precio.total)}</td></tr>
              <tr data-linea="persona"><th scope="row">Por persona</th><td className="precio" data-cent={precio.porPersona}>{euros(precio.porPersona)}</td></tr>
            </tbody>
          </table>
          <p className="nota">Precios con impuestos incluidos (supuesto de la demo). Cada precio de un rango se calcula con su punto medio.</p>
          <button type="button" className="btn btn--primario" onClick={() => setDialogo(true)}>Solicitar esta ruta (demo)</button>
        </section>

        {dialogo && <Solicitud ruta={ruta} d={d} total={euros(precio.total)} onClose={() => setDialogo(false)} />}
      </>)}

      <Atencion />
    </div>
  )
}

/** Botones 1…max como radios nativos: táctiles, navegables con flechas y legibles por lectores de pantalla. */
function Selector({ leyenda, pista, valor, max, nombre, onChange }: { leyenda: string; pista: string; valor?: number; max: number; nombre: string; onChange: (n: number) => void }) {
  return (
    <fieldset className="ag-sel">
      <legend>{leyenda}{!valor && <span className="ag-pista"> · {pista}</span>}</legend>
      <div className="radios">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <label key={n} className={`radio ag-num${valor === n ? ' radio--on' : ''}`}>
            <input type="radio" name={nombre} value={n} checked={valor === n} onChange={() => onChange(n)} />{n}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Mejor ventana para ir: viene del modelo de la app (con el ajuste en vivo de Open-Meteo). */
function Ventana({ d, hoy, r }: { d: Destino; hoy: string; r: RangoViaje }) {
  const e = estadoEn(d, hoy, SIN_AJUSTE)
  return (
    <section className="bloque ag-ventana" aria-label="Mejor ventana para ir" style={{ ['--c' as string]: 'var(--amber)' }}>
      <div className="ag-ventana-cab">
        <Flor size={30} className="anu-flor anu-flor--ayto" />
        <div>
          <p className="sobre">Mejor ventana para ir · {r.ventana[0].slice(0, 4)}</p>
          <p className="ventana"><b>{rango(r.ventana)}</b></p>
        </div>
      </div>
      <div className="badges">{d.origenes.map(o => <Badge key={o} origen={o} />)}</div>
      <p className="ag-ahora">{e.enTemporada ? <>Ahora mismo: <b>{e.etiqueta}</b> · {momentoTexto(e, d.tipo).toLowerCase()}.</>
        : e.proxima ? <>Ahora está fuera de temporada: vuelve hacia el <b>{corta(e.proxima)} de {e.proxima.slice(0, 4)}</b>.</>
          : <>La temporada de este año ha terminado.</>}</p>
    </section>
  )
}

const SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const fechaDia = (iso: string) => `${SEMANA[(new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7]} ${corta(iso)}`

/** Tiempo de un día de la ruta: previsión real de Open-Meteo o, si aún queda lejos, lo habitual esas fechas. */
function TiempoDiaInfo({ t }: { t: TiempoDia | null | undefined | 'cargando' }) {
  if (t === 'cargando') return <p className="ag-tiempo ag-tiempo--vacio" role="status">Consultando el tiempo…</p>
  if (t === null) return <p className="ag-tiempo ag-tiempo--vacio">Sin conexión con Open-Meteo: no podemos mostrar el tiempo de este día.</p>
  if (!t) return <p className="ag-tiempo ag-tiempo--vacio">Sin datos de tiempo para este día.</p>
  return t.tipo === 'prevision' ? (
    <p className="ag-tiempo"><Badge origen="Open-Meteo" /> <b>Previsión: {cielo(t.codigo)}</b> · {t.tmin}–{t.tmax} °C
      {t.probLluvia !== null && <> · lluvia {t.probLluvia} %</>}</p>
  ) : (
    <p className="ag-tiempo"><Badge origen="Open-Meteo" /> <b>Lo habitual esos días: {t.tmin}–{t.tmax} °C</b> · llovió {t.aniosLluvia} de {t.anios} años
      <span className="dim"> ({t.desde}–{t.hasta}; la previsión real llega 15 días antes)</span></p>
  )
}

const ETIQUETA: Record<Parada['tipo'], string> = { checkin: 'Llegada y check-in', checkout: 'Check-out', noche: 'Noche en el alojamiento', actividad: 'Actividad', comida: 'Comida', cena: 'Cena', libre: 'Libre' }

function ParadaCard({ p }: { p: Parada }) {
  let cuerpo: ReactNode
  if ('actividad' in p) cuerpo = <ActividadInfo a={p.actividad} />
  else if ('restaurante' in p) cuerpo = <LocalInfo l={p.restaurante} />
  else if ('alojamiento' in p) cuerpo = p.tipo === 'checkin' ? <LocalInfo l={p.alojamiento} />
    : <p className="ag-breve">{p.alojamiento.nombre} <span className="dim">· {p.alojamiento.localidad}</span></p>
  else cuerpo = <p className="dim">{p.texto}</p>
  return (
    <li className={`ag-parada ag-parada--${p.tipo}`}>
      <p className="ag-hora"><time>{p.hora}</time> <span>{p.tipo === 'actividad' ? `${ETIQUETA.actividad} de ${p.momento}` : ETIQUETA[p.tipo]}</span></p>
      {cuerpo}
    </li>
  )
}

function PrecioFicticio({ texto }: { texto: string }) {
  return <p className="ag-precio" data-ficticio><span className="precio">{texto}</span> <span className="precio-tag">{FICTICIO}</span></p>
}

function ActividadInfo({ a }: { a: Actividad }) {
  return (<div className="ag-info">
    <h4>{a.nombre}</h4>
    <p className="sobre">{a.tipo} · {a.localidad} · {a.duracion}</p>
    <p>{a.descripcion}</p>
    <PrecioFicticio texto={a.precioPP === 0 ? 'Gratis (acceso libre)' : `${a.precioPP} € por persona`} />
    <p className={a.reserva ? 'ag-reserva' : 'ag-reserva ag-reserva--no'}><b>{a.reserva ? 'Reserva o permiso:' : 'Sin reserva.'}</b> {a.reserva ?? 'Según las fuentes consultadas, no hace falta reservar.'}</p>
  </div>)
}

function LocalInfo({ l }: { l: LocalConPrecio }) {
  const aloja = esAlojamiento(l)
  return (<div className="ag-info">
    <h4>{l.nombre}</h4>
    <p className="sobre">{l.tipo} · {l.localidad}{l.cocina && !aloja ? ` · Cocina: ${l.cocina} (según Google Maps)` : ''}</p>
    <p>{l.descripcion}</p>
    <PrecioFicticio texto={`${l.precio[0]}–${l.precio[1]} € ${aloja ? 'por habitación y noche' : 'por persona'}`} />
    <Estrellas v={l.valoracion} />
    <div className="anu-enlaces">
      {aloja && <a className="btn btn--suave" href={urlBooking(l)} {...EXTERNO} aria-label={`Ver ${l.nombre} en Booking (se abre en una pestaña nueva)`}>Ver en Booking ↗</a>}
      <a className="btn btn--suave" href={urlMaps(l)} {...EXTERNO} aria-label={`Ver ${l.nombre} en Google Maps (se abre en una pestaña nueva)`}>Ver en Google Maps ↗</a>
    </div>
  </div>)
}

function Solicitud({ ruta, d, total, onClose }: { ruta: Ruta; d: Destino; total: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState('')
  const copiar = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopiado('Enlace copiado.') }
    catch { setCopiado(`No se pudo copiar automáticamente. Enlace: ${window.location.href}`) }
  }
  const acts = ruta.itinerario.flatMap(x => x.paradas).filter(p => p.tipo === 'actividad').length
  const mesas = ruta.itinerario.flatMap(x => x.paradas).filter(p => p.tipo === 'comida' || p.tipo === 'cena').length
  return (
    <Modal titulo="Solicitar esta ruta (demo)" onClose={onClose}>
      <p className="ok" role="status"><b>No se ha reservado nada.</b> Esto es una demostración: en la versión real, la agencia gestionaría estas reservas por ti.</p>
      <ul className="ag-resumen">
        <li><b>{d.nombre}</b> · {ruta.dias} {ruta.dias === 1 ? 'día' : 'días'} · {ruta.personas} {ruta.personas === 1 ? 'persona' : 'personas'}</li>
        <li>{ruta.alojamiento ? `${ruta.noches} ${ruta.noches === 1 ? 'noche' : 'noches'} en ${ruta.alojamiento.nombre}` : 'Sin alojamiento (viaje de un día)'}</li>
        <li>{acts} actividades y {mesas} comidas o cenas</li>
        <li>Total: <b>{total}</b> <span className="precio-tag">{FICTICIO}</span></li>
      </ul>
      <div className="fila">
        <button type="button" className="btn btn--primario" onClick={copiar}>Copiar enlace de la ruta</button>
        <button type="button" className="btn" onClick={onClose}>Cerrar</button>
      </div>
      {copiado && <p className="nota" role="status">{copiado}</p>}
    </Modal>
  )
}

/** Atención al cliente. Contenido de ejemplo para la demo: los canales y condiciones reales se definirán más adelante. */
function Atencion() {
  const [chat, setChat] = useState(false)
  return (
    <section className="ag-atencion" aria-labelledby="ag-atencion-t" data-ficticio>
      <div className="ag-total-cab"><h2 id="ag-atencion-t">Atención al cliente</h2><span className="precio-tag">Ejemplo · en preparación</span></div>
      <p>Te acompañamos antes, durante y después del viaje. Si la floración cambia de fecha, te avisamos y buscamos contigo la mejor alternativa.</p>
      <ul className="ag-canales">
        <li><b>Teléfono</b><span>900 000 000</span><small>Lunes a viernes, 9:00–19:00 (número ficticio)</small></li>
        <li><b>Correo</b><span>ayuda@cuandoflorece.example</span><small>Respuesta en menos de 24 h (dirección ficticia)</small></li>
        <li><b>Durante el viaje</b><span>Asistencia 24 h</span><small>Para incidencias con el alojamiento o las actividades</small></li>
      </ul>
      <div className="ag-faq">
        <h3>Preguntas frecuentes</h3>
        <details><summary>¿Y si la floración se adelanta o se retrasa?</summary><p>Puedes cambiar las fechas sin coste hasta 7 días antes de la llegada, siempre que haya disponibilidad.</p></details>
        <details><summary>¿Puedo cancelar?</summary><p>Cancelación gratuita hasta 14 días antes. Después, se reembolsa todo salvo lo que el proveedor no devuelva.</p></details>
        <details><summary>¿Qué pasa si llueve?</summary><p>Te proponemos un plan alternativo bajo techo para ese día (museos, bodegas, talleres) sin coste de gestión.</p></details>
        <details><summary>¿Cómo se paga?</summary><p>Una señal del 20 % al confirmar y el resto 7 días antes del viaje, con tarjeta o transferencia.</p></details>
      </div>
      <p className="nota">Condiciones de ejemplo para la demo; no son un compromiso real.</p>
      <button type="button" className="btn" onClick={() => setChat(true)}>Abrir chat (demo)</button>
      {chat && <p className="nota" role="status">El chat estará disponible en la versión final. Mientras tanto, esto es solo una demostración.</p>}
    </section>
  )
}
