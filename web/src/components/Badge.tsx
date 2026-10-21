const FORMA: Record<string, string> = { 'Satélite': '◉', 'Modelo grados-día': 'ƒ', 'Calendario histórico': '▦', 'Comunidad': '●', 'Simulado': '◌', 'Open-Meteo': '≈' }
export function Badge({ origen, n }: { origen: string; n?: number }) {
  const base = origen.startsWith('Comunidad') ? 'Comunidad' : origen
  const texto = base === 'Comunidad' ? `Comunidad (${n ?? 0})` : origen
  const clase = { 'Satélite': 'sat', 'Modelo grados-día': 'mod', 'Calendario histórico': 'cal', 'Comunidad': 'com', 'Simulado': 'sim', 'Open-Meteo': 'om' }[base] || 'cal'
  return <span className={`badge badge--${clase}`} title={`Origen del dato: ${texto}`}><span aria-hidden="true">{FORMA[base] ?? '▦'}</span> {texto}</span>
}
