import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import type { Destino } from '../lib/tipos'
import { estadoEn, SIN_AJUSTE, type Ajuste } from '../lib/estado'
import { corta, rango } from '../lib/fechas'
import { calcularPrecio, euros, generarRuta, MAX_DIAS, MAX_PERSONAS, type LocalConPrecio, type Parada, type Ruta } from '../lib/agencia'
import { AGENCY_MARGIN } from '../config/agencia'
import { esAlojamiento, urlBooking, urlMaps } from '../data/locales'
import type { Actividad } from '../data/agencia'
import { Badge } from './Badge'
import { Flor } from './Flor'
import { Modal } from './Modal'
import { Estrellas } from './Valoracion'

const EXTERNO = { target: '_blank', rel: 'noopener noreferrer' } as const
const FICTICIO = 'Precio estimado de ejemplo (ficticio)'
const NIVEL = { alta: 'Alta', media: 'Media', baja: 'Baja' } as const

interface Estado { destino: string; dias: number; personas: number; alojamiento?: string }
const entero = (v: string | null, def: number, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= max ? n : def }
/** Lee la ruta de la URL (?destino=…&dias=…&personas=…&alojamiento=…), con valores por defecto si algo no es válido. */
function deUrl(ids: string[]): Estado {
  const q = new URLSearchParams(window.location.search)
  const destino = q.get('destino') ?? ''
  return { destino: ids.includes(destino) ? destino : ids[0], dias: entero(q.get('dias'), 2, MAX_DIAS), personas: entero(q.get('personas'), 2, MAX_PERSONAS), alojamiento: q.get('alojamiento') ?? undefined }
}
const aUrl = (e: Estado) => `/agencia?destino=${encodeURIComponent(e.destino)}&dias=${e.dias}&personas=${e.personas}${e.alojamiento ? `&alojamiento=${encodeURIComponent(e.alojamiento)}` : ''}`

export function Agencia({ destinos, hoy, ajustes }: { destinos: Destino[]; hoy: string; ajustes: Record<string, Ajuste> }) {
  const ids = destinos.map(d => d.id)
  const [st, setSt] = useState<Estado>(() => deUrl(ids))
  const [dialogo, setDialogo] = useState(false)
  const idDestino = useId(), idAloj = useId()
  // El estado vive en la URL para poder compartir la ruta
  useEffect(() => { window.history.replaceState(null, '', aUrl(st)) }, [st])
  useEffect(() => { const f = () => setSt(deUrl(ids)); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f) }, [ids.join()])

  const d = destinos.find(x => x.id === st.destino)
  const ruta = useMemo(() => generarRuta(st.destino, st.dias, st.personas, st.alojamiento), [st])
  const precio = useMemo(() => ruta && calcularPrecio(ruta, ruta.personas, AGENCY_MARGIN), [ruta])
  const cambiar = (p: Partial<Estado>) => setSt(s => ({ ...s, ...p, ...(p.destino && p.destino !== s.destino ? { alojamiento: undefined } : {}) }))

  return (
    <div className="pagina agencia">
      <header className="anu-cab">
        <p className="sobre">Demo del modelo de agencia</p>
        <h1 className="titulo">Agencia</h1>
        <p className="dim">Elige destino, días y personas: te armamos la ruta completa alrededor de la floración, con alojamiento, actividades y dónde comer.</p>
        <p className="banner-sim" role="note"><b>Esta página es una simulación.</b> Los precios son orientativos y ficticios, y no se realiza ninguna reserva real.</p>
      </header>

      <form className="ag-form" aria-label="Preferencias del viaje" onSubmit={e => e.preventDefault()}>
        <div className="campo">
          <label htmlFor={idDestino}>Destino</label>
          <select id={idDestino} value={st.destino} onChange={e => cambiar({ destino: e.target.value })}>
            {destinos.map(x => <option key={x.id} value={x.id}>{x.nombre} · {x.especie}</option>)}
          </select>
        </div>
        <Selector leyenda="Días" valor={st.dias} max={MAX_DIAS} nombre="dias" onChange={dias => cambiar({ dias })} />
        <Selector leyenda="Personas" valor={st.personas} max={MAX_PERSONAS} nombre="personas" onChange={personas => cambiar({ personas })} />
      </form>

      {!d || !ruta || !precio ? (
        <p className="aviso" role="status">Todavía no tenemos datos suficientes para armar una ruta en este destino.</p>
      ) : (<>
        <Ventana d={d} hoy={hoy} ajuste={ajustes[d.id] ?? SIN_AJUSTE} />

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
                <h3 className="ag-dia-t"><span className="ag-dia-n">Día {dia.n}</span>{dia.n === 1 && ruta.dias > 1 ? ' · Llegada' : dia.n === ruta.dias && ruta.dias > 1 ? ' · Vuelta' : ''}</h3>
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
    </div>
  )
}

/** Botones 1…max como radios nativos: táctiles, navegables con flechas y legibles por lectores de pantalla. */
function Selector({ leyenda, valor, max, nombre, onChange }: { leyenda: string; valor: number; max: number; nombre: string; onChange: (n: number) => void }) {
  return (
    <fieldset className="ag-sel">
      <legend>{leyenda}</legend>
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

/** Mejor ventana para ir: viene del modelo de la app (rango + confianza), nunca una fecha única. */
function Ventana({ d, hoy, ajuste }: { d: Destino; hoy: string; ajuste: Ajuste }) {
  const e = estadoEn(d, hoy, ajuste), v = e.ventana
  return (
    <section className="bloque ag-ventana" aria-label="Mejor ventana para ir" style={{ ['--c' as string]: 'var(--amber)' }}>
      <div className="ag-ventana-cab">
        <Flor size={30} className="anu-flor anu-flor--ayto" />
        <div>
          <p className="sobre">Mejor ventana para ir · {v.probable[0].slice(0, 4)}</p>
          <p className="ventana"><b>{rango(v.probable)}</b> <span className="dim">probable</span></p>
        </div>
      </div>
      <p className="dim">Amplio: {rango(v.amplia)} · Confianza <span className={`nivel nivel--${d.confianza.nivel}`}>{NIVEL[d.confianza.nivel]}</span></p>
      <div className="badges">{d.origenes.map(o => <Badge key={o} origen={o} />)}</div>
      <p className="ag-ahora">{e.enTemporada ? <>Ahora mismo: <b>{e.etiqueta}</b> ({e.pct} %).</>
        : e.proxima ? <>Ahora está fuera de temporada: vuelve hacia el <b>{corta(e.proxima)} de {e.proxima.slice(0, 4)}</b>.</>
          : <>La temporada de este año ha terminado.</>}</p>
    </section>
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
