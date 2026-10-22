import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Datos } from './lib/tipos'
import { estadoEn, momentoTexto, SIN_AJUSTE, type Ajuste } from './lib/estado'
import { sumaDias } from './lib/fechas'
import { colorFase } from './lib/colores'
import { Flor } from './components/Flor'
import { Badge } from './components/Badge'
import { Mapa } from './components/Mapa'
import { hayWebGL, type ModoMapa } from './lib/webgl'
import { Simulador } from './components/Simulador'
import { Ficha } from './components/Ficha'
import { FormAlerta } from './components/FormAlerta'
import { cargarTiempo, fusionar, type DiaTiempo, type Tiempo } from './lib/tiempo'
import { aplicarVivo, inicioAcumulacion, type Vivo } from './lib/vivo'
import { Agencia } from './components/Agencia'
import { Franja } from './components/Franja'

export default function App() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [fallo, setFallo] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [dias, setDias] = useState(0)
  const [modal, setModal] = useState<null | 'alerta'>(null)
  // Navegación mínima por ruta (sin librería): "/" es el mapa; "/agencia", la demo de negocio.
  const [ruta, setRuta] = useState(window.location.pathname)
  useEffect(() => { const f = () => setRuta(window.location.pathname); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f) }, [])
  const ir = (url: string) => (e?: React.MouseEvent) => { e?.preventDefault(); window.history.pushState(null, '', url); setRuta(window.location.pathname); setModal(null) }
  const pagina = ruta.replace(/\/$/, '') === '/agencia' ? 'agencia' : 'mapa'
  // Sin WebGL se usa el mapa alternativo; si también falla, solo la lista. Cada fallo baja un escalón y nunca deja la app en blanco.
  const [modoMapa, setModoMapa] = useState<ModoMapa>(() => hayWebGL() ? 'gl' : 'plano')
  const bajarModo = useCallback((desde: ModoMapa, e: unknown) => {
    console.warn('Mapa no disponible, se usa la alternativa:', e)
    setModoMapa(m => m !== desde ? m : desde === 'gl' ? 'plano' : 'lista')
  }, [])

  const [intento, setIntento] = useState(0)
  useEffect(() => {
    setFallo('')
    fetch('/data/destinos.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }).then(setDatos)
      .catch(e => { console.warn('destinos.json:', e); setFallo('No hemos podido cargar los datos de los destinos. Comprueba tu conexión y vuelve a intentarlo.') })
  }, [intento])
  // "Hoy" es la fecha real del dispositivo (nunca anterior a la de los datos), así las vistas avanzan solas con el calendario.
  const hoy = useMemo(() => { const r = new Date().toISOString().slice(0, 10); return datos && r < datos.hoy_demo ? datos.hoy_demo : r }, [datos])
  const [tiempos, setTiempos] = useState<Record<string, Tiempo>>({})
  const [cargandoT, setCargandoT] = useState(false)
  const refrescar = useCallback(async (forzar = false) => {
    if (!datos) return
    setCargandoT(true)
    const res = await Promise.all(datos.destinos.map(async d => {
      const csv: DiaTiempo[] | undefined = d.serie?.clima.map(c => ({ ...c, prevision: false }))
      const ini = inicioAcumulacion(d), desde = ini && hoy >= ini ? ini : undefined
      return [d.id, await cargarTiempo({ id: d.id, lat: d.lat, lon: d.lon, desde, csv, forzar })] as const
    }))
    setTiempos(Object.fromEntries(res)); setCargandoT(false)
  }, [datos, hoy])
  useEffect(() => { refrescar(); const i = setInterval(() => refrescar(), 30 * 60 * 1000); return () => clearInterval(i) }, [refrescar])
  /** Destinos con la predicción en vivo aplicada (Sevilla: grados-día; Brihuega y Tejera Negra: modelo térmico experimental). */
  const vivos = useMemo(() => (datos?.destinos ?? []).map(d => {
    const { destino, vivo } = aplicarVivo(d, tiempos[d.id]?.origen === 'ninguno' ? undefined : tiempos[d.id]?.dias, hoy)
    const t = tiempos[d.id]
    const dias = d.serie && t ? fusionar(d.serie.clima.map(c => ({ ...c, prevision: false })), t.dias) : t?.dias
    return { destino, vivo: vivo as Vivo, tiempo: t && dias ? { ...t, dias } : t }
  }), [datos, tiempos, hoy])
  const destinos = useMemo(() => vivos.map(v => v.destino), [vivos])

  const fecha = sumaDias(hoy, dias)
  const ajustes = useMemo(() => Object.fromEntries(destinos.map(d => [d.id, SIN_AJUSTE])) as Record<string, Ajuste>, [destinos])
  const estados = useMemo(() => Object.fromEntries(destinos.map(d => [d.id, estadoEn(d, fecha, ajustes[d.id])])), [destinos, fecha, ajustes])
  const d = destinos.find(x => x.id === sel) ?? null
  const vd = vivos.find(v => v.destino.id === sel)

  return (
    <div className={`app app--${pagina}${pagina === 'mapa' && modoMapa === 'lista' ? ' app--sinmapa' : ''}`}>
      <a className="salto" href="#contenido">Saltar al contenido</a>
      <header className="barra">
        <a className="marca-app" href="/" onClick={e => { setSel(null); ir('/')(e) }}><Flor size={28} className="logo" /><span>Cuándo Florece</span></a>
        <nav className="menu" aria-label="Principal">
          <a href="/" onClick={ir('/')} aria-current={pagina === 'mapa' ? 'page' : undefined}>Mapa</a>
          <a href="/agencia" onClick={ir('/agencia')} aria-current={pagina === 'agencia' ? 'page' : undefined}>Agencia</a>
        </nav>
      </header>

        {datos && pagina === 'mapa' && <Franja destinos={destinos} hoy={hoy} onIr={url => ir(url)()} />}
        <main className="vista" id="contenido">
          {fallo && <div className="pagina" role="alert"><p className="err">{fallo}</p><button className="btn" onClick={() => setIntento(i => i + 1)}>Reintentar</button></div>}
          {!datos && !fallo && <div className="cargando" role="status"><Flor size={56} className="gira" /> Cargando el mapa vivo…</div>}
          {datos && pagina === 'agencia' && <Agencia destinos={destinos} hoy={hoy} />}
          {datos && pagina === 'mapa' && (<>
            <Mapa modo={modoMapa} destinos={destinos} estados={estados} seleccionado={sel} onSeleccionar={setSel} onFallo={bajarModo} />
            <div className="flota"><Simulador dias={dias} fecha={fecha} hoy={hoy} onChange={setDias} /></div>
            <aside className="panel" aria-label="Destinos">
              {d ? (
                <Ficha d={d} fecha={fecha} hoy={hoy} ajuste={ajustes[d.id]}
                  tiempo={vd?.tiempo} vivo={vd?.vivo} cargandoTiempo={cargandoT} onRefrescar={() => refrescar(true)}
                  onVolver={() => setSel(null)} onAlerta={() => setModal('alerta')} />
              ) : (
                <div>
                  {modoMapa !== 'gl' && <p className="aviso-mapa" role="status">{modoMapa === 'plano'
                    ? 'Tu navegador no puede dibujar el mapa 3D. Te mostramos una versión alternativa.'
                    : 'Tu navegador no puede dibujar el mapa. Activa la aceleración por hardware o prueba con otro navegador. Todo lo demás funciona igual.'}</p>}
                  <h1 className="titulo">El mapa vivo de la floración en España</h1>
                  <p className="dim">Cuándo y dónde florece, y cuál es el mejor momento para ir. Mueve la máquina del tiempo para ver cómo cambia.</p>
                  <ul className="lista">
                    {destinos.map(x => {
                      const e = estados[x.id]
                      return (
                        <li key={x.id}><button className="tarjeta" style={{ ['--c' as string]: colorFase(x.tipo, e.faseId) }} onClick={() => setSel(x.id)}>
                          <Flor size={34} />
                          <span className="tarjeta-txt"><b>{x.nombre}</b><span>{x.especie}</span>
                            <span className="tarjeta-est">{e.etiqueta}{e.enTemporada ? ` · ${momentoTexto(e, x.tipo)}` : e.proxima ? ` · desde ~${e.proxima.slice(8)}/${e.proxima.slice(5, 7)}` : ''}</span></span>
                          <span className="tarjeta-b"><Badge origen={x.origenes[0]} /></span>
                        </button></li>
                      )
                    })}
                  </ul>
                  <p className="nota">Leyenda de estados: gris = fuera de temporada · lila claro = brote · lila = floración · ámbar = pico · ciruela = caída. Hayedos: verde → ocre → cobre. Cada tarjeta incluye el estado en texto.</p>
                </div>
              )}
            </aside>
            {d && modal === 'alerta' && <FormAlerta destino={d} onClose={() => setModal(null)} />}
          </>)}
        </main>
    </div>
  )
}
