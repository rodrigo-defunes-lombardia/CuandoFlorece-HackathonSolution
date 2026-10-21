/** Gráfico SVG mínimo (líneas, banda, marcas verticales y horizontales). Sin dependencias. */
export interface Serie { puntos: [number, number][]; color: string; punteada?: boolean; banda?: [number, number][]; nombre: string }
export interface Marca { x: number; texto: string; color?: string }
interface Props {
  series: Serie[]; marcas?: Marca[]; lineasH?: { y: number; texto: string }[]; xFmt: (x: number) => string; yFmt?: (y: number) => string
  titulo: string; descripcion: string; yMin?: number; yMax?: number; xDom?: [number, number]
}
const W = 320, H = 170, P = { l: 34, r: 10, t: 12, b: 24 }

export function Grafico({ series, marcas = [], lineasH = [], xFmt, yFmt = v => String(Math.round(v * 100) / 100), titulo, descripcion, yMin, yMax, xDom }: Props) {
  const xs = series.flatMap(s => s.puntos.map(p => p[0])).concat(marcas.map(m => m.x))
  const ys = series.flatMap(s => s.puntos.map(p => p[1]).concat((s.banda ?? []).flatMap(b => [b[0], b[1]]))).concat(lineasH.map(l => l.y))
  const [x0, x1] = xDom ?? [Math.min(...xs), Math.max(...xs)]
  const y0 = yMin ?? Math.min(...ys), y1 = yMax ?? Math.max(...ys)
  const X = (x: number) => P.l + ((x - x0) / (x1 - x0 || 1)) * (W - P.l - P.r)
  const Y = (y: number) => H - P.b - ((y - y0) / (y1 - y0 || 1)) * (H - P.t - P.b)
  const camino = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('')
  const ticksX = [0, 1, 2, 3].map(i => x0 + ((x1 - x0) * i) / 3)
  const ticksY = [0, 1, 2].map(i => y0 + ((y1 - y0) * i) / 2)
  return (
    <figure className="graf">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}. ${descripcion}`}>
        {ticksY.map((t, i) => <g key={i}><line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} className="graf-rej" /><text x={P.l - 4} y={Y(t) + 3} textAnchor="end" className="graf-t">{yFmt(t)}</text></g>)}
        {ticksX.map((t, i) => <text key={i} x={X(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'} className="graf-t">{xFmt(t)}</text>)}
        {series.map((s, i) => s.banda && (
          <path key={'b' + i} d={camino(s.puntos.map((p, k) => [p[0], s.banda![k][1]] as [number, number])) + s.puntos.map((p, k) => `L${X(p[0]).toFixed(1)},${Y(s.banda![s.puntos.length - 1 - k][0]).toFixed(1)}`).reverse().join('').replace(/^L/, 'L')} fill={s.color} opacity=".18" />
        ))}
        {lineasH.map((l, i) => <g key={i}><line x1={P.l} x2={W - P.r} y1={Y(l.y)} y2={Y(l.y)} className="graf-umbral" /><text x={W - P.r} y={Y(l.y) - 3} textAnchor="end" className="graf-t graf-t--a">{l.texto}</text></g>)}
        {series.map((s, i) => <path key={i} d={camino(s.puntos)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.punteada ? '4 3' : undefined} strokeLinejoin="round" />)}
        {marcas.map((m, i) => m.x >= x0 && m.x <= x1 && (
          <g key={i}><line x1={X(m.x)} x2={X(m.x)} y1={P.t} y2={H - P.b} stroke={m.color ?? 'var(--amber)'} strokeWidth="1.5" strokeDasharray="3 3" />
            <text x={X(m.x) + (X(m.x) > W - 90 ? -3 : 3)} y={P.t + 8 + (i % 2) * 11} textAnchor={X(m.x) > W - 90 ? 'end' : 'start'} className="graf-t graf-t--a" fill={m.color}>{m.texto}</text></g>
        ))}
      </svg>
      <figcaption className="graf-leyenda">
        {series.map((s, i) => <span key={i}><i style={{ background: s.color }} aria-hidden="true" /> {s.nombre}</span>)}
      </figcaption>
    </figure>
  )
}
