import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Datos, Observacion } from './lib/tipos'
import { calcularAjuste, estadoEn, type Ajuste } from './lib/estado'
import { SEMILLAS, observacionesRepo } from './lib/repos'
import { sumaDias } from './lib/fechas'
import { colorFase } from './lib/colores'
import { Flor } from './components/Flor'
import { Badge } from './components/Badge'
import { MapView } from './components/MapView'
import { Simulador } from './components/Simulador'
import { Ficha } from './components/Ficha'
import { FormObs } from './components/FormObs'
import { FormAlerta } from './components/FormAlerta'
import { Negocio } from './components/Negocio'
import { Modal } from './components/Modal'
import { cargarTiempo, fusionar, type DiaTiempo, type Tiempo } from './lib/tiempo'
import { aplicarVivo, type Vivo } from './lib/vivo'

/** URL oficial de Greenia: no la conocemos con certeza, se rellena antes de la demo. */
const URL_GREENIA = 'https://cuandoflorece.es/es'

export default function App() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [fallo, setFallo] = useState('')
  const [vista, setVista] = useState<'mapa' | 'negocio'>(location.hash === '#negocio' ? 'negocio' : 'mapa')
  const [sel, setSel] = useState<string | null>(null)
  const [dias, setDias] = useState(0)
  const [obs, setObs] = useState<Observacion[]>([])
  const [modal, setModal] = useState<null | 'obs' | 'alerta' | 'ar'>(null)

  useEffect(() => {
    fetch('/data/destinos.json').then(r => { if (!r.ok) throw new Error(); return r.json() }).then(setDatos)
      .catch(() => setFallo('No encontramos los datos. Ejecuta `python pipeline/build.py` y recarga.'))
  }, [])
  // "Hoy" es la fecha real del dispositivo (nunca anterior a la de los datos), así las vistas avanzan solas con el calendario.
  const hoy = useMemo(() => { const r = new Date().toISOString().slice(0, 10); return datos && r < datos.hoy_demo ? datos.hoy_demo : r }, [datos])
  const [tiempos, setTiempos] = useState<Record<string, Tiempo>>({})
  const [cargandoT, setCargandoT] = useState(false)
  const refrescar = useCallback(async (forzar = false) => {
    if (!datos) return
    setCargandoT(true)
    const res = await Promise.all(datos.destinos.map(async d => {
      const csv: DiaTiempo[] | undefined = d.serie?.clima.map(c => ({ ...c, prevision: false }))
      const desde = d.modelo && hoy >= `${d.temporada}-01-01` ? `${d.temporada}-01-01` : undefined
      return [d.id, await cargarTiempo({ id: d.id, lat: d.lat, lon: d.lon, desde, csv, forzar })] as const
    }))
    setTiempos(Object.fromEntries(res)); setCargandoT(false)
  }, [datos, hoy])
  useEffect(() => { refrescar(); const i = setInterval(() => refrescar(), 30 * 60 * 1000); return () => clearInterval(i) }, [refrescar])
  /** Destinos con la predicción en vivo aplicada (hoy solo Azahar de Sevilla) y tiempo listo para pintar. */
  const vivos = useMemo(() => (datos?.destinos ?? []).map(d => {
    const { destino, vivo } = aplicarVivo(d, tiempos[d.id]?.origen === 'ninguno' ? undefined : tiempos[d.id]?.dias, hoy)
    const t = tiempos[d.id]
    const dias = d.serie && t ? fusionar(d.serie.clima.map(c => ({ ...c, prevision: false })), t.dias) : t?.dias
    return { destino, vivo: vivo as Vivo, tiempo: t && dias ? { ...t, dias } : t }
  }), [datos, tiempos, hoy])
  const destinos = useMemo(() => vivos.map(v => v.destino), [vivos])
  const recargar = useCallback(async () => {
    const propias = await observacionesRepo.listar()
    setObs([...SEMILLAS(hoy), ...propias])
  }, [hoy])
  useEffect(() => { recargar() }, [recargar])
  useEffect(() => { const h = () => setVista(location.hash === '#negocio' ? 'negocio' : 'mapa'); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h) }, [])

  const fecha = sumaDias(hoy, dias)
  const ajustes = useMemo(() => Object.fromEntries(destinos.map(d => [d.id, calcularAjuste(d, obs, hoy)])) as Record<string, Ajuste>, [destinos, obs, hoy])
  const estados = useMemo(() => Object.fromEntries(destinos.map(d => [d.id, estadoEn(d, fecha, ajustes[d.id])])), [destinos, fecha, ajustes])
  const d = destinos.find(x => x.id === sel) ?? null
  const vd = vivos.find(v => v.destino.id === sel)

  return (
    <div className="app">
      <a className="salto" href="#contenido">Saltar al contenido</a>
      <header className="barra">
        <a className="marca-app" href="#" onClick={() => { setVista('mapa'); setSel(null) }}><Flor size={28} className="logo" /><span>Cuándo Florece</span></a>
        <nav aria-label="Principal">
          <a href="#" className={vista === 'mapa' ? 'on' : ''} aria-current={vista === 'mapa' ? 'page' : undefined} onClick={() => { location.hash = ''; setVista('mapa') }}>Mapa</a>
          <a href="#negocio" className={vista === 'negocio' ? 'on' : ''} aria-current={vista === 'negocio' ? 'page' : undefined}>Negocio</a>
        </nav>
      </header>

      {vista === 'negocio' ? <Negocio /> : (
        <main className="vista" id="contenido">
          {fallo && <p className="err pagina">{fallo}</p>}
          {!datos && !fallo && <div className="cargando" role="status"><Flor size={56} className="gira" /> Cargando el mapa vivo…</div>}
          {datos && (<>
            <MapView destinos={destinos} estados={estados} seleccionado={sel} onSeleccionar={id => setSel(id)} />
            <div className="flota"><Simulador dias={dias} fecha={fecha} hoy={hoy} onChange={setDias} /></div>
            <aside className="panel" aria-label="Destinos">
              {d ? (
                <Ficha d={d} fecha={fecha} hoy={hoy} ajuste={ajustes[d.id]} obs={obs.filter(o => o.destinoId === d.id)}
                  tiempo={vd?.tiempo} vivo={vd?.vivo} cargandoTiempo={cargandoT} onRefrescar={() => refrescar(true)}
                  onVolver={() => setSel(null)} onAlerta={() => setModal('alerta')} onObs={() => setModal('obs')} onAR={() => setModal('ar')} />
              ) : (
                <div>
                  <h1 className="titulo">El mapa vivo de la floración en España</h1>
                  <p className="dim">Cuándo y dónde florece, con un margen de confianza honesto. Mueve la máquina del tiempo para ver cómo cambia.</p>
                  <ul className="lista">
                    {destinos.map(x => {
                      const e = estados[x.id]
                      return (
                        <li key={x.id}><button className="tarjeta" style={{ ['--c' as string]: colorFase(x.tipo, e.faseId) }} onClick={() => setSel(x.id)}>
                          <Flor size={34} />
                          <span className="tarjeta-txt"><b>{x.nombre}</b><span>{x.especie}</span>
                            <span className="tarjeta-est">{e.etiqueta}{e.enTemporada ? ` · ${e.pct} %` : e.proxima ? ` · desde ~${e.proxima.slice(8)}/${e.proxima.slice(5, 7)}` : ''}</span></span>
                          <span className="tarjeta-b"><Badge origen={x.origenes[0]} /></span>
                        </button></li>
                      )
                    })}
                  </ul>
                  <p className="nota">Leyenda de estados: gris = fuera de temporada · lila claro = brote · lila = floración · ámbar = pico · ciruela = caída. Hayedos: verde → ocre → cobre. Cada tarjeta incluye el estado en texto.</p>
                </div>
              )}
            </aside>
            {d && modal === 'obs' && <FormObs destino={d} hoy={hoy} todas={obs} onClose={() => setModal(null)} onGuardada={recargar} />}
            {d && modal === 'alerta' && <FormAlerta destino={d} onClose={() => setModal(null)} />}
            {d && modal === 'ar' && (
              <Modal titulo="Vive la experiencia AR" onClose={() => setModal(null)}>
                <p className="banner-sim">Simulado · esto no abre ninguna experiencia real.</p>
                <p>Aquí enlazaríamos con las gafas de realidad aumentada de Greenia para ver {d.nombre} en su mejor momento antes de ir, o superponer la floración del año pasado.</p>
                <p className="nota">Enlace a Greenia (configurable en <code>URL_GREENIA</code>, <code>App.tsx</code>).</p>
                {URL_GREENIA && <a className="btn btn--primario" href={URL_GREENIA} target="_blank" rel="noreferrer">Conocer Greenia (se abre en otra pestaña)</a>}
              </Modal>
            )}
          </>)}
        </main>
      )}
    </div>
  )
}
