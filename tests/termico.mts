// Modelo térmico experimental (Brihuega y Tejera Negra) sin navegador. Uso: node tests/termico.mts  (la parte 3 necesita red)
import { readFileSync } from 'node:fs'
import { aplicarVivo, desplazamientoTermico, tmedTemporada } from '../web/src/lib/vivo.ts'
import { cargarTiempo } from '../web/src/lib/tiempo.ts'

const datos = JSON.parse(readFileSync(new URL('../web/public/data/destinos.json', import.meta.url), 'utf8'))
const dest = (id: string) => datos.destinos.find((x: { id: string }) => x.id === id)
let fallos = 0
const ok = (c: boolean, msg: string) => { console.log(c ? 'OK   ' : 'FALLA', msg); if (!c) fallos++ }

// 1) Sin datos de la temporada no se mueve nada
for (const id of ['brihuega', 'tejera_negra']) ok(desplazamientoTermico(dest(id).termico, []).dias === 0, `${id}: sin datos, desplazamiento 0`)

// 2) La web reproduce el cálculo del pipeline (validación de Brihuega con 2026)
const bri = dest('brihuega'), csv = readFileSync(new URL('../pipeline/clima/brihuega_2016-01-01_2026-08-31.csv', import.meta.url), 'utf8')
const dias26 = csv.trim().split('\n').slice(1).map(l => l.split(',')).filter(([f]) => f.startsWith('2026'))
  .map(([fecha, tmax, tmin]) => ({ fecha, tmax: Number(tmax), tmin: Number(tmin), lluvia: 0, prevision: false }))
const r = desplazamientoTermico(bri.termico, tmedTemporada(dias26, '2026-01-01', 243).map(x => x === undefined ? x : Math.round(x * 100) / 100))
ok(r.dias === bri.termico.validacion.desplazamiento_modelo && r.porBase.join() === bri.termico.validacion.por_base.join(),
  `Brihuega 2026: web ${r.dias} d (${r.porBase.join(', ')}) = pipeline ${bri.termico.validacion.desplazamiento_modelo} d`)
console.log('INFO ', bri.termico.validacion.nota)

// 3) Tejera Negra con la temperatura real de este otoño (Open-Meteo, como en la app)
const tej = dest('tejera_negra'), hoy = new Date().toISOString().slice(0, 10)
try {
  // Mismo cliente que usa la app (lib/tiempo.ts)
  const t = await cargarTiempo({ id: 'tejera_negra', lat: tej.lat, lon: tej.lon, desde: '2026-08-01', forzar: true })
  if (t.origen !== 'vivo') throw new Error(t.nota)
  const dias = t.dias
  const huecos = dias.filter(x => x.fecha <= hoy && x.fecha >= '2026-08-01' && x.tmax === null).length
  ok(dias[0].fecha === '2026-08-01' && huecos === 0, `Open-Meteo sin huecos desde el 1 ago (${dias.length} días, ${huecos} vacíos)`)
  const { destino, vivo } = aplicarVivo(tej, dias, hoy)
  ok(vivo.activo && vivo.diasReales > 60, `Tejera Negra en vivo: ${vivo.diasReales} días reales + ${vivo.diasPrevision} de previsión`)
  const ref = tej.hitos.find((h: { id: string }) => h.id === 'floracion'), nuevo = destino.hitos.find((h: { id: string }) => h.id === 'floracion')
  ok(nuevo.central >= ref.amplia[0] && nuevo.central <= ref.amplia[1], `«Color avanzado» ${ref.central} → ${nuevo.central} (dentro del rango histórico ${ref.amplia.join(' – ')})`)
  ok(destino.hitos.every((h: { probable: string[]; amplia: string[] }, i: number) => (Date.parse(h.probable[1]) - Date.parse(h.probable[0])) === (Date.parse(tej.hitos[i].probable[1]) - Date.parse(tej.hitos[i].probable[0]))), 'los márgenes no se estrechan')
  console.log('INFO ', vivo.texto)
} catch (e) { console.log('INFO  sin red: se omite la prueba en vivo de Tejera Negra', e) }

// 4) Antes de que empiece la temporada, Brihuega no se mueve y lo explica
const antes = aplicarVivo(bri, dias26, '2026-10-21')
ok(!antes.vivo.activo && antes.destino.hitos === bri.hitos && /1 ene/.test(antes.vivo.texto), `Brihuega antes del 1 ene 2027: ${antes.vivo.texto}`)
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0)
