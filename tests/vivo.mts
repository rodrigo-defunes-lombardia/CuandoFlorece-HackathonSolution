// Comprueba la predicción en vivo de Sevilla sin navegador. Uso: node tests/vivo.mts
import { readFileSync } from 'node:fs'
import { prediccionVivo } from '../web/src/lib/vivo.ts'

const datos = JSON.parse(readFileSync(new URL('../web/public/data/destinos.json', import.meta.url), 'utf8'))
const d = datos.destinos.find((x: { id: string }) => x.id === 'sevilla'), m = d.modelo
let fallos = 0
const ok = (c: boolean, msg: string) => { console.log(c ? 'OK   ' : 'FALLA', msg); if (!c) fallos++ }

// 1) Sin datos de la temporada en curso debe reproducir el pipeline
const base = prediccionVivo(m, d.hitos, [], 2027)
ok(base.every((h: { id: string; central: string; probable: string[]; amplia: string[] }, i: number) =>
  h.central === d.hitos[i].central && h.probable.join() === d.hitos[i].probable.join() && h.amplia.join() === d.hitos[i].amplia.join()),
  'sin datos en vivo reproduce el pipeline (central, probable y amplio)')

// 2) Una temporada cálida real (2025 observada hasta el 1 de marzo) debe adelantar o retrasar según su calor real
const gd25: number[] = m.gd_diario['2025'], hasta = 60
// Se excluye 2025 de los años análogos para que la prueba sea independiente
const sin25 = { ...m, gd_diario: Object.fromEntries(Object.entries(m.gd_diario).filter(([y]) => y !== '2025')) }
const prueba = prediccionVivo(sin25, d.hitos, gd25.slice(0, hasta), 2025)
const real = (() => { let acc = 0; for (let i = 0; i < gd25.length; i++) { acc += gd25[i]; if (acc >= m.umbrales.pico_ini) return i + 1 } return -1 })()
const doy = (iso: string) => Math.round((Date.parse(iso) - Date.parse('2025-01-01')) / 86400000) + 1
const pico = prueba.find((h: { id: string }) => h.id === 'pico_ini')
console.log(`   2025: pico real día ${real}; predicción desde el 1 mar → día ${doy(pico.central)} (probable ${pico.probable.join(' → ')})`)
ok(Math.abs(doy(pico.central) - real) <= 12, 'la predicción con 2 meses de datos reales cae a ≤ 12 días del cruce real de 2025')
// 3) Informativo: el rango probable según cuánta temperatura real se conoce (no se exige que se estreche)
const dias = (h: { probable: string[] }) => Math.round((Date.parse(h.probable[1]) - Date.parse(h.probable[0])) / 86400000)
for (const k of [0, 40, 60, 80]) {
  const h = prediccionVivo(sin25, d.hitos, gd25.slice(0, k), 2025).find((x: { id: string }) => x.id === 'pico_ini')
  console.log(`   con ${k} días reales: pico central día ${doy(h.central)}, rango probable de ${dias(h)} días`)
}
console.log(fallos ? `\n${fallos} fallos` : '\nTODO OK'); process.exit(fallos ? 1 : 0)
