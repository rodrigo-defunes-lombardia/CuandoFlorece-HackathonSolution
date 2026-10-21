import { corta } from '../lib/fechas'
import type { Destino } from '../lib/tipos'
import type { Tiempo as T } from '../lib/tiempo'
import { Badge } from './Badge'
import { Grafico, type Serie } from './Grafico'

const suma = (v: (number | null)[]) => Math.round(v.reduce<number>((s, x) => s + (x ?? 0), 0) * 10) / 10

export function Tiempo({ d, t, hoy, cargando, onRefrescar, nota }: { d: Destino; t?: T; hoy: string; cargando: boolean; onRefrescar: () => void; nota?: string }) {
  const dias = t?.dias.filter(x => x.tmax !== null && x.tmin !== null) ?? []
  const real = dias.filter(x => x.fecha <= hoy), prev = dias.filter(x => x.fecha >= hoy)
  const pts = (a: typeof dias, k: 'tmax' | 'tmin') => a.map(x => [Date.parse(x.fecha), x[k] as number] as [number, number])
  const series: Serie[] = [
    { nombre: 'Máxima °C', color: 'var(--amber)', puntos: pts(real, 'tmax') }, { nombre: 'Mínima °C', color: 'var(--lila-2)', puntos: pts(real, 'tmin') },
    { nombre: 'Previsión máx.', color: 'var(--amber)', punteada: true, puntos: pts(prev, 'tmax') }, { nombre: 'Previsión mín.', color: 'var(--lila-2)', punteada: true, puntos: pts(prev, 'tmin') },
  ].filter(s => s.puntos.length > 1)
  const sig7 = prev.slice(0, 8), ant7 = real.slice(-7)
  return (
    <div className="tiempo">
      <div className="tiempo-cab">
        {t && (t.origen === 'vivo' || t.origen === 'cache') ? <Badge origen="Open-Meteo" /> : <span className="badge">{t?.origen === 'csv' ? 'CSV del proyecto · sin conexión' : 'Sin conexión'}</span>}
        <button className="btn btn--suave" onClick={onRefrescar} disabled={cargando} aria-label="Actualizar el tiempo ahora">{cargando ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
      {t && t.origen !== 'ninguno' && dias.length > 1 ? (<>
        <Grafico titulo={`Temperaturas en ${d.nombre}`} descripcion={`De ${corta(dias[0].fecha)} a ${corta(dias[dias.length - 1].fecha)}, con previsión a partir de hoy.`}
          series={series} xFmt={x => corta(new Date(x).toISOString().slice(0, 10))} yFmt={v => `${Math.round(v)}°`} marcas={[{ x: Date.parse(hoy), texto: 'hoy' }]} />
        <p className="tiempo-res">Últimos 7 días: <b>{suma(ant7.map(x => x.lluvia))} mm</b> de lluvia · mínima <b>{Math.min(...ant7.map(x => x.tmin as number))} °C</b>.
          {sig7.length > 0 && <> Próximos 7 días: <b>{suma(sig7.map(x => x.lluvia))} mm</b> · mínima <b>{Math.min(...sig7.map(x => x.tmin as number))} °C</b>.</>}</p>
      </>) : <p className="aviso" role="status">No hay datos de tiempo disponibles ahora mismo.</p>}
      <p className="nota">{t?.nota ?? 'Cargando…'}{t?.actualizado ? ` · actualizado ${t.actualizado.slice(11, 16)} UTC` : ''}. Se refresca solo cada 30 min. {nota}</p>
    </div>
  )
}
