const FORMA: Record<string, string> = { 'Satélite': '◉', 'Modelo grados-día': 'ƒ', 'Calendario histórico': '▦', 'Simulado': '◌', 'Open-Meteo': '≈' }
export function Badge({ origen }: { origen: string }) {
  const clase = { 'Satélite': 'sat', 'Modelo grados-día': 'mod', 'Calendario histórico': 'cal', 'Simulado': 'sim', 'Open-Meteo': 'om' }[origen] || 'cal'
  return <span className={`badge badge--${clase}`} title={`Origen del dato: ${origen}`}><span aria-hidden="true">{FORMA[origen] ?? '▦'}</span> <span className="badge-t">{origen}</span></span>
}
