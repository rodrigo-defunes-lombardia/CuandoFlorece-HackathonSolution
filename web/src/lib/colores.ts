import type { Destino } from './tipos'
export const colorFase = (tipo: Destino['tipo'], faseId: string) => {
  if (tipo === 'hayedo') return { previa: 'var(--hy-verde)', brote: 'var(--hy-cambiando)', floracion: 'var(--hy-avanzado)', pico: 'var(--hy-pleno)', caida: 'var(--hy-caida)', fuera: 'var(--st-fuera)' }[faseId] ?? 'var(--st-fuera)'
  return { brote: 'var(--st-brote)', floracion: 'var(--st-floracion)', pico: 'var(--st-pico)', caida: 'var(--st-caida)', fuera: 'var(--st-fuera)', previa: 'var(--st-fuera)' }[faseId] ?? 'var(--st-fuera)'
}
