import { useCallback, useEffect, useState, type ComponentType } from 'react'
import type { Destino } from '../lib/tipos'
import type { Estado } from '../lib/estado'
import type { ModoMapa } from '../lib/webgl'
import { MapView } from './MapView'
import { Limite } from './Limite'
import { Flor } from './Flor'

interface Props {
  modo: ModoMapa; destinos: Destino[]; estados: Record<string, Estado>; seleccionado: string | null
  onSeleccionar: (id: string) => void
  /** El mapa del modo `desde` ha fallado: la app baja un escalón (3D → alternativo → solo lista). */
  onFallo: (desde: ModoMapa, error: unknown) => void
}
type PropsPlano = Omit<Props, 'modo' | 'onFallo'> & { onFallo: (error: unknown) => void }

/** Elige el mapa según el modo. Ningún fallo de un mapa sale de aquí: se captura y se pasa al siguiente modo. */
export function Mapa({ modo, onFallo, ...resto }: Props) {
  const [Plano, setPlano] = useState<ComponentType<PropsPlano> | null>(null)
  // Cada fallo dice de qué modo viene: si llega dos veces (StrictMode, varios eventos), solo baja un escalón
  const caer = useCallback((e: unknown) => onFallo(modo, e), [modo, onFallo])
  const p = { ...resto, onFallo: caer }
  useEffect(() => {
    if (modo !== 'plano' || Plano) return
    // Leaflet solo se descarga cuando hace falta, para no engordar la carga normal
    import('./MapaPlano').then(mod => setPlano(() => mod.MapaPlano)).catch(p.onFallo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo])

  if (modo === 'lista') return null
  const caido = () => <div className="mapa" />
  return (
    <Limite key={modo} fallback={caido} onError={p.onFallo}>
      {modo === 'gl' ? <MapView {...p} />
        : Plano ? <Plano {...p} />
        : <div className="mapa cargando" role="status"><Flor size={44} className="gira" /> Preparando el mapa…</div>}
    </Limite>
  )
}
