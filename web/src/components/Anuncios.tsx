import { useEffect, useId, useState } from 'react'
import type { Destino } from '../lib/tipos'
import { ANUNCIOS, aCinco, enlacesDe, esAlojamiento, type Local, type Valoracion } from '../data/anuncios'
import { Flor } from './Flor'

const num = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 })
const fechaEs = (iso: string) => iso.split('-').reverse().join('/')
const EXTERNO = { target: '_blank', rel: 'noopener noreferrer' } as const

/** Lee el destino de la URL (?destino=…) y lo valida contra los destinos de la app. */
const destinoDeUrl = (ids: string[]) => {
  const q = new URLSearchParams(window.location.search).get('destino')
  return q && ids.includes(q) ? q : ids[0]
}

export function Anuncios({ destinos }: { destinos: Destino[] }) {
  const ids = destinos.map(d => d.id)
  const [sel, setSel] = useState(() => destinoDeUrl(ids))
  const idSelect = useId()
  // La selección vive en la URL para poder compartirla
  useEffect(() => { window.history.replaceState(null, '', `/anuncios?destino=${encodeURIComponent(sel)}`) }, [sel])
  useEffect(() => {
    const f = () => setSel(destinoDeUrl(ids))
    window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f)
  }, [ids.join()])
  const d = destinos.find(x => x.id === sel)
  const datos = ANUNCIOS[sel]

  return (
    <div className="pagina anuncios">
      <header className="anu-cab">
        <p className="sobre">Demo del modelo de negocio</p>
        <h1 className="titulo">Anuncios</h1>
        <p className="dim">Ayuntamientos y negocios de cada destino aparecen junto a la predicción de floración.</p>
        <p className="banner-sim" role="note"><b>Esta página es una demostración.</b> Las ofertas y eventos son ficticios y no han sido publicados por los negocios ni los ayuntamientos citados.</p>
      </header>

      <div className="anu-alta">
        <p>¿Eres un ayuntamiento? Apúntate aquí</p>
        {/* TODO: URL del formulario de alta de ayuntamientos */}
        <a href="#" className="btn btn--suave anu-alta-btn" aria-disabled="true" title="Próximamente"
          onClick={e => e.preventDefault()}>Apuntarse <span className="tag-ej">Próximamente</span></a>
      </div>

      <div className="campo anu-select">
        <label htmlFor={idSelect}>Destino</label>
        <select id={idSelect} value={sel} onChange={e => setSel(e.target.value)}>
          {destinos.map(x => <option key={x.id} value={x.id}>{x.nombre} · {x.especie}</option>)}
        </select>
      </div>

      {!datos || !d ? (
        <p className="aviso" role="status">Todavía no hay anunciantes en este destino.</p>
      ) : (<>
        <section className="anu-ayto" aria-labelledby="anu-ayto-t">
          <div className="anu-ayto-cab">
            <Flor size={40} className="anu-flor anu-flor--ayto" />
            <div>
              <p className="sobre">{datos.ayuntamiento.localidad}</p>
              <h2 id="anu-ayto-t">{datos.ayuntamiento.nombre}</h2>
            </div>
          </div>
          {datos.ayuntamiento.anuncios.length === 0
            ? <p className="dim">Este ayuntamiento aún no ha publicado anuncios.</p>
            : <ul className="anu-lista">
              {datos.ayuntamiento.anuncios.map(a => (
                <li key={a.titulo} className="anu-anuncio">
                  <Etiquetas />
                  <h3>{a.titulo}</h3>
                  <p className="anu-fecha">{a.fecha}</p>
                  <p>{a.descripcion}</p>
                </li>
              ))}
            </ul>}
        </section>

        <section aria-labelledby="anu-loc-t">
          <h2 id="anu-loc-t" className="anu-sub">Dónde dormir y comer cerca de {d.nombre}</h2>
          {datos.locales.length === 0
            ? <p className="aviso" role="status">Aún no hay negocios anunciados en este destino.</p>
            : <ul className="anu-rejilla">{datos.locales.map(l => <Tarjeta key={l.nombre} l={l} />)}</ul>}
        </section>
      </>)}
    </div>
  )
}

function Etiquetas() {
  return <p className="anu-tags"><span className="anu-tag">Anuncio</span><span className="tag-ej">Ejemplo · ficticio</span></p>
}

function Tarjeta({ l }: { l: Local }) {
  const { principal, secundario } = enlacesDe(l)
  const aloja = esAlojamiento(l)
  return (
    <li className="anu-local">
      <Etiquetas />
      <div className="anu-local-cab">
        <Flor size={30} className={`anu-flor ${aloja ? 'anu-flor--aloja' : 'anu-flor--come'}`} />
        <div><h3>{l.nombre}</h3><p className="sobre">{l.tipo} · {l.localidad}</p></div>
      </div>
      <div className="anu-promo">
        <p className="anu-promo-t">{l.promocion}</p>
        <p className="nota">Vigencia: {l.vigencia}</p>
      </div>
      <Estrellas v={l.valoracion} />
      <div className="anu-enlaces">
        <a className="btn btn--primario btn--suave" href={principal.url} {...EXTERNO} aria-label={`${principal.texto}: ${l.nombre} (se abre en una pestaña nueva)`}>{principal.texto} ↗</a>
        <a className="btn btn--suave" href={secundario.url} {...EXTERNO} aria-label={`${secundario.texto}: ${l.nombre} (se abre en una pestaña nueva)`}>{secundario.texto} ↗</a>
      </div>
    </li>
  )
}

/** Valoración real con fuente. Sin dato comprobado no se pintan estrellas. */
function Estrellas({ v }: { v: Valoracion | null }) {
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
