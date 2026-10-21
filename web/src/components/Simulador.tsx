import { corta } from '../lib/fechas'

const SALTOS = [
  { v: '', t: 'Saltar a…' }, { v: '0', t: 'Hoy' }, { v: '2027-03-15', t: 'Mediados de marzo 2027' },
  { v: '2027-04-01', t: '1 abril 2027 · azahar' }, { v: '2027-07-05', t: '5 julio 2027 · lavanda' },
]
export function Simulador({ dias, fecha, hoy, onChange }: { dias: number; fecha: string; hoy: string; onChange: (d: number) => void }) {
  const saltar = (v: string) => {
    if (!v) return
    onChange(v === '0' ? 0 : Math.round((Date.parse(v) - Date.parse(hoy)) / 86400000))
  }
  return (
    <section className="sim" aria-label="Simulador de fecha">
      <div className="sim-fila">
        <span className="sim-titulo">Máquina del tiempo</span>
        <output className="sim-fecha" aria-live="polite">{dias === 0 ? 'Hoy · ' : `+${dias} d · `}{corta(fecha)} {fecha.slice(0, 4)}</output>
      </div>
      <div className="sim-presets" role="group" aria-label="Atajos">
        {[[0, 'Hoy'], [7, '+7 días'], [14, '+14 días']].map(([n, t]) => (
          <button key={n} className={`chip${dias === n ? ' chip--on' : ''}`} aria-pressed={dias === n} onClick={() => onChange(n as number)}>{t}</button>
        ))}
        <select className="chip chip--sel" aria-label="Saltar a una fecha clave" value="" onChange={e => saltar(e.target.value)}>
          {SALTOS.map(s => <option key={s.v} value={s.v}>{s.t}</option>)}
        </select>
      </div>
      <input className="sim-rango" type="range" min={0} max={365} step={1} value={dias} aria-label="Días desde hoy"
        aria-valuetext={`${dias} días desde hoy, ${corta(fecha)}`} onChange={e => onChange(Number(e.target.value))} />
    </section>
  )
}
