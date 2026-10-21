const DIA = 86400000
export const aMs = (iso: string) => Date.parse(iso + 'T00:00:00Z')
export const deMs = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const sumaDias = (iso: string, n: number) => deMs(aMs(iso) + Math.round(n) * DIA)
export const diasEntre = (a: string, b: string) => Math.round((aMs(b) - aMs(a)) / DIA)
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const corta = (iso: string) => { const d = new Date(aMs(iso)); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}` }
export const larga = (iso: string) => `${corta(iso)} ${iso.slice(0, 4)}`
export const rango = (r: [string, string]) => `${corta(r[0])} – ${corta(r[1])}`
export const haceCuanto = (iso: string, hoy: string) => {
  const n = diasEntre(iso, hoy)
  return n <= 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`
}
