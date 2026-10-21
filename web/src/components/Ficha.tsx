import { useEffect, useMemo, useState } from 'react'
import type { Destino, Observacion } from '../lib/tipos'
import { estadoEn, type Ajuste } from '../lib/estado'
import { aMs, corta, diasEntre, haceCuanto, larga, rango } from '../lib/fechas'
import { colorFase } from '../lib/colores'
import { anomaliaSevilla, type Anomalia } from '../lib/openmeteo'
import { Badge } from './Badge'
import { Flor } from './Flor'
import { Grafico, type Serie } from './Grafico'
import { LineaTiempo } from './LineaTiempo'
import { Tiempo } from './Tiempo'
import type { Tiempo as TiempoT } from '../lib/tiempo'
import type { Vivo } from '../lib/vivo'

interface Props {
  d: Destino; fecha: string; hoy: string; ajuste: Ajuste; obs: Observacion[]
  tiempo?: TiempoT; vivo?: Vivo; cargandoTiempo: boolean; onRefrescar: () => void
  onVolver: () => void; onAlerta: () => void; onObs: () => void
}
const NIVEL = { alta: 'Alta', media: 'Media', baja: 'Baja',  } as const
const fmtF = (x: number) => corta(new Date(x).toISOString().slice(0, 10))

export function Ficha({ d, fecha, hoy, ajuste, obs, tiempo, vivo, cargandoTiempo, onRefrescar, onVolver, onAlerta, onObs }: Props) {
  const e = useMemo(() => estadoEn(d, fecha, ajuste), [d, fecha, ajuste])
  const color = colorFase(d.tipo, e.faseId)
  const fases = d.tipo === 'hayedo' ? [{ id: 'previa', etiqueta: 'Verde' }, ...d.fases] : d.fases
  const idxActiva = fases.findIndex(f => f.id === e.faseId)
  const hitosClave = ['inicio', d.fin]
  const nCom = ajuste.n
  const origenes = [...d.origenes, ...(nCom > 0 ? ['Comunidad'] : [])]
  const [anom, setAnom] = useState<Anomalia | null>(null)
  useEffect(() => { if (d.id === 'sevilla' && d.modelo) anomaliaSevilla(d.modelo, d.lat, d.lon, hoy).then(setAnom) }, [d, hoy])

  return (
    <article className="ficha" aria-labelledby="ficha-titulo">
      <button className="volver" onClick={onVolver}>← Todos los destinos</button>
      <header className="ficha-cab">
        <p className="sobre">{d.especie} · {d.region}</p>
        <h2 id="ficha-titulo">{d.nombre}</h2>
        <div className="badges">{origenes.map(o => <Badge key={o} origen={o} n={nCom} />)}</div>
      </header>

      {/* 1. ¿Está en flor? */}
      <section className="bloque estado" style={{ ['--c' as string]: color }} aria-label="Estado actual">
        <div className="estado-cab">
          <Flor size={44} />
          <div><p className="estado-fase">{e.etiqueta}</p>
            <p className="estado-sub">{e.enTemporada ? `${e.pct} % de ${d.tipo === 'hayedo' ? 'color' : 'floración'} estimado` : e.proxima ? `Empieza hacia el ${corta(e.proxima)}` : 'Hasta la próxima temporada'}
              {' · '}<span className="dim">{fecha === hoy ? 'hoy' : larga(fecha)}</span></p></div>
        </div>
        <ol className="fases" aria-label="Fases de la temporada">
          {fases.map((f, i) => (
            <li key={f.id} className={i === idxActiva ? 'fase fase--on' : i < idxActiva ? 'fase fase--pasada' : 'fase'} aria-current={i === idxActiva ? 'step' : undefined}
              style={{ ['--fc' as string]: colorFase(d.tipo, f.id) }}><span className="fase-barra" /><span className="fase-txt">{f.etiqueta}</span></li>
          ))}
        </ol>
        {d.tipo === 'hayedo' && <p className="nota">Rampa del hayedo: verde → ocre → cobre. El color visto por satélite es una estimación desde el espacio, no una medida.</p>}
      </section>

      {/* 2. ¿Cuándo ir? */}
      <section className="bloque" aria-label="Cuándo ir">
        <h3>Cuándo ir</h3>
        <p className="ventana"><b>{rango([e.ventana.desde, e.ventana.hasta])}</b> <span className="dim">ventana óptima central</span></p>
        <p className="dim">Probable: {rango(e.ventana.probable)} · Amplio: {rango(e.ventana.amplia)}{e.anioExtra ? ' · calendario del año siguiente' : ''}</p>
        <LineaTiempo estado={e} fecha={fecha} hitosMostrar={hitosClave} />
        {vivo?.texto && <p className="vivo" role="status">{vivo.activo ? <Badge origen="Open-Meteo" /> : null} {vivo.texto}</p>}
        {ajuste.desplazamiento !== 0 && <p className="comunidad">La comunidad ha movido la predicción <b>{Math.abs(ajuste.desplazamiento).toFixed(1)} días {ajuste.desplazamiento < 0 ? 'antes' : 'después'}</b> y estrechado el margen un {Math.round((1 - ajuste.factor) * 100)} %.</p>}
        {d.hitos.some(h => h.revisar) && <p className="aviso" role="note"><b>Pendiente de revisar:</b> el satélite marcó el inicio el {corta(d.hitos[0].detectado_2026?.fecha ?? '')} (confirmado {corta(d.hitos[0].detectado_2026?.confirmado ?? '')}), semanas antes que en cualquier otoño anterior. No lo usamos para mover el calendario hasta revisarlo.</p>}
      </section>

      {/* 3. ¿Con qué fiabilidad? */}
      <section className="bloque" aria-label="Cuánto confiar">
        <h3>Cuánto confiar</h3>
        <p className="confianza"><span className={`nivel nivel--${d.confianza.nivel}`}>{NIVEL[d.confianza.nivel]}</span>
          {d.confianza.anios > 0 && <span> · respaldado por <b>{d.confianza.anios} {d.id === 'sevilla' ? 'años con observaciones' : 'años'}</b></span>}
          {d.confianza.observaciones > 0 && <span> · {d.confianza.observaciones} fotos</span>}</p>
        <p>{d.confianza.texto}</p>
        <p className="comunidad-n">{nCom > 0
          ? <>Verificado por <b>{nCom} {nCom === 1 ? 'persona' : 'personas'}</b>{ajuste.demos ? ` (${ajuste.demos} de ejemplo)` : ''} · última {ajuste.ultima ? haceCuanto(ajuste.ultima, hoy) : ''}.</>
          : 'Aún sin verificaciones de la comunidad. ¿Estás allí? Cuéntanos qué ves.'}</p>
      </section>

      {/* 4. Evolución */}
      <section className="bloque" aria-label="Evolución">
        <h3>Evolución</h3>
        <Evolucion d={d} fecha={fecha} hoy={hoy} anom={anom} />
      </section>

      <section className="bloque" aria-label="Tiempo">
        <h3>Tiempo</h3>
        <Tiempo d={d} t={tiempo} hoy={hoy} cargando={cargandoTiempo} onRefrescar={onRefrescar}
          nota={d.id === 'brihuega' ? 'El modelo de la lavanda (climatología v0) aún no usa el tiempo: esto es solo contexto.' : d.id === 'tejera_negra' ? 'Une el CSV del proyecto con datos en vivo. No modifica el calendario del hayedo.' : ''} />
      </section>

      {/* Acciones */}
      <section className="acciones" aria-label="Acciones">
        <button className="btn btn--primario" onClick={onAlerta}>Avísame cuando llegue la flor</button>
        <button className="btn" onClick={onObs}>Yo estuve aquí</button>
      </section>

      <section className="bloque" aria-label="Cerca de aquí">
        <h3>Para completar el viaje <span className="tag-ej">Ejemplo</span></h3>
        <div className="partners">
          <div className="partner partner--ej"><span className="tag-ej">Ejemplo · Partner</span><b>Casa rural “El Hayedo”</b><p>Alojamiento con desayuno de producto local.</p></div>
          <div className="partner partner--ej"><span className="tag-ej">Ejemplo · Partner</span><b>Restaurante “La Alcarria”</b><p>Menú de temporada a 10 minutos.</p></div>
        </div>
        <p className="nota">Tarjetas de ejemplo para ilustrar el modelo de negocio; no son negocios reales.</p>
      </section>
    </article>
  )
}

function Evolucion({ d, fecha, hoy, anom }: { d: Destino; fecha: string; hoy: string; anom: Anomalia | null }) {
  const x = (iso: string) => aMs(iso)
  const marcaHoy = [{ x: x(fecha), texto: fecha === hoy ? 'hoy' : corta(fecha) }]
  if (d.id === 'tejera_negra' && d.serie) {
    const c = d.serie.color
    const col: Serie = { nombre: 'Color (mediana de 7 zonas)', color: 'var(--hy-avanzado)', puntos: c.map(p => [x(p.fecha), p.color]), banda: c.map(p => [p.p25, p.p75]) }
    const hoja: Serie = { nombre: 'Hoja perdida', color: 'var(--hy-caida)', punteada: true, puntos: c.map(p => [x(p.fecha), p.hoja_perdida]) }
    return (<>
      <Badge origen="Satélite" />
      <Grafico titulo="Índice de color del hayedo" descripcion={`Del ${corta(c[0].fecha)} al ${corta(c[c.length - 1].fecha)}; banda entre percentiles 25 y 75 de las zonas.`}
        series={[col, hoja]} xFmt={fmtF} marcas={fecha <= '2026-12-31' ? marcaHoy : []} />
      <p className="nota">Índice de color: estimación desde el espacio, no una medida. Última imagen: {larga(d.serie.color_hasta)}. La banda es el rango entre el 25 % y el 75 % de las zonas.</p>
    </>)
  }
  if (d.id === 'brihuega' && d.historia) {
    const h = d.historia, r = h.real_2026
    const serie: Serie = { nombre: 'Lavanda cortada en 2026 (% de la superficie)', color: 'var(--lila-2)', puntos: h.avance_2026.map(p => [x(p.fecha), p.pct_cortado * 100]) }
    const c10 = d.hitos.find(i => i.id === 'pico_fin')!, c50 = d.hitos.find(i => i.id === 'fin')!
    return (<>
      <Badge origen="Satélite" />
      <Grafico titulo="Cosecha de 2026" descripcion={`Avance de la cosecha en ${h.parcelas} parcelas, del ${corta(h.avance_2026[0].fecha)} al ${corta(h.avance_2026[h.avance_2026.length - 1].fecha)}.`}
        series={[serie]} xFmt={fmtF} yFmt={v => `${Math.round(v)} %`} yMin={0} yMax={100}
        marcas={[{ x: x(String(r.cosecha_10)), texto: '10 %', color: 'var(--amber)' }, { x: x(String(r.cosecha_50)), texto: '50 %', color: 'var(--amber)' }]} />
      <table className="tabla"><caption>2026 (real) frente a 2027 (predicho)</caption>
        <thead><tr><th>Hito</th><th>2026 satélite (±3 d)</th><th>2027 central</th></tr></thead>
        <tbody><tr><td>10 % cortado</td><td>{corta(String(r.cosecha_10))}</td><td>{corta(c10.central)} <small>({diasEntre(`2027-${String(r.cosecha_10).slice(5)}`, c10.central) >= 0 ? '+' : ''}{diasEntre(`2027-${String(r.cosecha_10).slice(5)}`, c10.central)} d)</small></td></tr>
          <tr><td>Cosecha casi completa</td><td>{corta(String(r.cosecha_final))}</td><td>{corta(c50.central)}</td></tr></tbody></table>
      <p className="nota">{h.nota_comparacion} Los hitos son cortes detectados por satélite (±3 días): una estimación, no una medida. Predicción emitida el {larga(h.emision_prediccion)} (modelo de climatología, 10 temporadas).</p>
    </>)
  }
  if (d.id === 'sevilla' && d.modelo) {
    const m = d.modelo
    const serie: Serie = { nombre: 'Grados-día acumulados (media 2012–2025)', color: 'var(--lila-2)', puntos: m.serie_gdd.map(r => [r[0], r[1]]), banda: m.serie_gdd.map(r => [r[2], r[3]]) }
    return (<>
      <Badge origen="Modelo grados-día" />
      <Grafico titulo="Acumulación de calor en Sevilla" descripcion={`Grados-día desde el 1 de enero con base ${m.base_c} °C; la línea de umbral marca la entrada en pico.`}
        series={[serie]} xFmt={v => `día ${Math.round(v)}`} yFmt={v => `${Math.round(v)}`}
        lineasH={[{ y: m.umbral_pico_ini, texto: `umbral pico ${Math.round(m.umbral_pico_ini)}` }]} />
      {anom && (
        <p className="anom"><Badge origen={anom.origen === 'live' ? 'Modelo grados-día' : 'Calendario histórico'} /> <b>Temporada {anom.anio}: {anom.diasAdelanto === 0 ? 'en la media' : `${Math.abs(anom.diasAdelanto)} días ${anom.diasAdelanto > 0 ? 'adelantada' : 'retrasada'}`}</b> respecto a la media, por acumulación térmica
          ({Math.round(anom.gdd75)} frente a {Math.round(anom.gdd75Media)} °C·día a mitad de marzo). <span className="dim">{anom.nota}.</span></p>
      )}
      <details className="det"><summary>Cómo funciona el modelo y qué incertidumbre tiene</summary>
        <p>Sumamos cada día <code>max(0, (Tmáx+Tmín)/2 − base)</code> desde el {m.inicio_acumulacion}. La flor aparece al alcanzar un umbral de calor calibrado con las {m.obs_individuales} fotos disponibles ({m.anios_calibracion.join(' y ')}). Después buscamos cuándo se alcanza ese umbral en cada uno de los {m.anios_clima.length} años de temperatura y damos el rango (percentiles 25–75 como “probable”, ampliado con el margen de calibración como “amplio”).</p>
        <p>{m.justificacion_base}</p>
        <table className="tabla"><caption>Bases probadas</caption><thead><tr><th>Base</th><th>Umbral</th><th>CV</th><th>Pico mediano</th></tr></thead>
          <tbody>{m.bases_probadas.map(b => <tr key={b.base} className={b.base === m.base_c ? 'fila-sel' : ''}><td>{b.base} °C{b.base === m.base_c ? ' ✓' : ''}</td><td>{Math.round(b.umbral_pico)}</td><td>{(b.cv * 100).toFixed(1)} %</td><td>día {Math.round(b.pico_central_doy)}</td></tr>)}</tbody></table>
        <p>Comprobación dejando un año fuera: {m.backtest_loo.map(b => `${b.anio}: ${b.error_dias > 0 ? '+' : ''}${b.error_dias} días`).join(' · ')}. Con solo 2 años es una comprobación débil, no una garantía.</p>
        <p className="nota">Las observaciones son fotos casuales de iNaturalist ({m.observaciones.length}); la temperatura llega hasta el {larga(m.meteo_hasta)}.</p>
      </details>
    </>)
  }
  return null
}
