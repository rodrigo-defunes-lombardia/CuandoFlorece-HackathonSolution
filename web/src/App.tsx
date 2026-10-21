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
  const hoy = datos?.hoy_demo ?? '2026-10-21'
  const recargar = useCallback(async () => {
    const propias = await observacionesRepo.listar()
    setObs([...SEMILLAS(hoy), ...propias])
  }, [hoy])
  useEffect(() => { recargar() }, [recargar])
  useEffect(() => { const h = () => setVista(location.hash === '#negocio' ? 'negocio' : 'mapa'); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h) }, [])

  const fecha = sumaDias(hoy, dias)
  const ajustes = useMemo(() => Object.fromEntries((datos?.destinos ?? []).map(d => [d.id, calcularAjuste(d, obs, hoy)])) as Record<string, Ajuste>, [datos, obs, hoy])
  const estados = useMemo(() => Object.fromEntries((datos?.destinos ?? []).map(d => [d.id, estadoEn(d, fecha, ajustes[d.id])])), [datos, fecha, ajustes])
  const d = datos?.destinos.find(x => x.id === sel) ?? null

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
            <MapView destinos={datos.destinos} estados={estados} seleccionado={sel} onSeleccionar={id => setSel(id)} />
            <div className="flota"><Simulador dias={dias} fecha={fecha} hoy={hoy} onChange={setDias} /></div>
            <aside className="panel" aria-label="Destinos">
              {d ? (
                <Ficha d={d} fecha={fecha} hoy={hoy} ajuste={ajustes[d.id]} obs={obs.filter(o => o.destinoId === d.id)}
                  onVolver={() => setSel(null)} onAlerta={() => setModal('alerta')} onObs={() => setModal('obs')} onAR={() => setModal('ar')} />
              ) : (
                <div>
                  <h1 className="titulo">El mapa vivo de la floración en España</h1>
                  <p className="dim">Cuándo y dónde florece, con un margen de confianza honesto. Mueve la máquina del tiempo para ver cómo cambia.</p>
                  <ul className="lista">
                    {datos.destinos.map(x => {
                      const e = estados[x.id]
                      return (
                        <li key={x.id}><button className={`tarjeta${x.simulado ? ' tarjeta--sim' : ''}`} style={{ ['--c' as string]: colorFase(x.tipo, e.faseId) }} onClick={() => setSel(x.id)}>
                          <Flor size={34} />
                          <span className="tarjeta-txt"><b>{x.nombre}</b><span>{x.especie}</span>
                            <span className="tarjeta-est">{e.etiqueta}{e.enTemporada ? ` · ${e.pct} %` : e.proxima ? ` · desde ~${e.proxima.slice(8)}/${e.proxima.slice(5, 7)}` : ''}</span></span>
                          <span className="tarjeta-b">{x.simulado ? <Badge origen="Simulado" /> : <Badge origen={x.origenes[0]} />}</span>
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
