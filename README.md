# Cuándo Florece · el mapa vivo de la floración en España

Prototipo para el reto de Greenia (Hackathon EPS UFV, 20–22 oct 2026). Mapa con 3 destinos, estado de floración con margen de confianza, simulador de fecha, verificación ciudadana y alertas simuladas. El modelo de negocio está en [`NEGOCIO.md`](NEGOCIO.md).

## Arrancar desde cero
```bash
python3 -m venv .venv && .venv/bin/pip install pandas numpy
.venv/bin/python pipeline/build.py      # genera web/public/data/destinos.json
cd web && npm install && npm run dev    # http://localhost:5173
```
Pruebas (opcional; `pip install playwright pillow && playwright install chromium`, con la app en marcha): `python tests/e2e.py` (recorrido), `python tests/precision_mapa.py` (cada flor cae en su coordenada a varios zooms) y `node tests/vivo.mts` (predicción en vivo).
Los CSV viven en `data/` (los 12 están presentes).

## Por qué esta tecnología
1. **Vite + React + TypeScript**: arranque instantáneo, tipos que evitan errores con datos de muchos formatos, y despliegue como sitio estático.
2. **Pipeline Python/pandas aparte**: el análisis (grados-día, percentiles) se queda en el lenguaje de los datos y escribe un JSON; la web no calcula modelos.
3. **MapLibre + OpenFreeMap**: mapa vectorial sin API key ni coste, con estilo oscuro propio.
4. **Sin backend**: la comunidad y las alertas usan localStorage tras una interfaz (`web/src/lib/repos.ts`) que se sustituye por una API sin tocar la UI.
5. **CSS propio con tokens** (`styles/tokens.css`): identidad visual sin librerías genéricas.

## Qué es real y qué es simulado
| Elemento | Estado |
|---|---|
| Tejera Negra: serie de color, hoja perdida, clima, calendario de hitos | **Real** (satélite + calendario de 6–8 otoños) |
| Tejera Negra: "hoja cayendo" y "hayedo desnudo" | **Supuesto** marcado (≈7 y ≈28 días tras el pleno; no hay dato) |
| Brihuega: predicción 2027, cosecha 2026 | **Real** (climatología v0, 10 temporadas; cosechas por satélite ±3 d) |
| Brihuega: "primeras flores" y "floración activa" | **Supuesto** marcado (derivados del margen de plena flor) |
| Azahar de Sevilla: modelo de grados-día con `meteo_sevilla.csv` | **Real**, con calibración débil (2 años) |
| Open-Meteo en vivo: tiempo de los 3 destinos, anomalía de 2026 y predicción de Sevilla en temporada | **Real**, con respaldo a caché local y al CSV |
| Observaciones semilla (5) | **Demo**, marcadas "de ejemplo" |
| Alertas, partners | **Simulado** ("Ejemplo" / "Demo") |
| Fecha "hoy" | La del dispositivo (nunca anterior al 21 oct 2026, fecha de los datos): las vistas avanzan solas |

## Modelo de Sevilla (grados-día)
- Se acumula `max(0, (Tmáx+Tmín)/2 − base)` desde el 1 de enero.
- **Base**: se probaron 7–13 °C y se eligió la de menor variación del umbral entre los 2 años observados (12 °C). Con 2 años es orientativo; la tabla de bases y su sensibilidad están en la ficha.
- **Umbrales**: las 7 observaciones (fotos de iNaturalist) dan el GDD de inicio (la más temprana), pico (mediana) y fin (la más tardía).
- **Rangos**: para cada uno de los 14 años de temperatura se busca el día que se alcanza el umbral. "Probable" = percentiles 25–75; "amplio" = percentil 10 del umbral bajo y 90 del alto (incluye la incertidumbre de calibración).
- **Comprobación** dejando un año fuera: −1,5 y +2,0 días (muestra muy pequeña: no es una garantía).
- **Hallazgo**: la mediana climática del pico (31 mar) es ~10 días posterior a los dos años observados (2022–23, cálidos).

## Datos en vivo (Open-Meteo)
Módulo `web/src/lib/tiempo.ts`: la API de previsión (`past_days` + 16 días de previsión) y, para el tramo anterior a 92 días, la API de archivo. Gratis y sin clave.
- **Actualización automática**: al abrir la app y cada 30 min (botón "Actualizar" para forzarla). Caché local de 30 min.
- **Respaldo**: red → caché local → CSV del proyecto (solo Tejera Negra lo trae) → aviso "sin datos". La etiqueta dice siempre de dónde viene el dato.
- **Tejera Negra**: el gráfico une `otono_clima_tejera_negra.csv` con los datos en vivo y la previsión. No modifica el calendario (no hay modelo de color basado en temperatura).
- **Brihuega**: tiempo reciente y previsión como contexto. No modifica la predicción (climatología v0).
- **Azahar de Sevilla**: desde el 1 de enero de la temporada (2027), `web/src/lib/vivo.ts` recalcula los hitos con el método de **años análogos**: calor real acumulado (observado + previsión) hasta hoy, y para el resto del año el calor diario de cada uno de los 14 años históricos. Mismos percentiles que el pipeline. Antes del 1 de enero muestra la climatología e indica por qué.
- **Prueba** (`node tests/vivo.mts`): sin datos en vivo reproduce exactamente el pipeline. Con 2025 fuera de los análogos y 60 días reales de 2025, el pico predicho cae 9 días antes del real; con 80 días, a 1 día.

## Cómo afecta la comunidad a la predicción (primer enfoque)
Cada observación válida (a ≤ 10 km, con foto y estado) se traduce en un desplazamiento: 0 si el estado observado cabe en lo previsto para ese día; si se ve antes (o después) de lo previsto, la diferencia en días. Se combinan con pesos que decaen a la mitad cada 7 días (ventana de 21):

- `desplazamiento = λ · media_ponderada`, con `λ = n_eff / (n_eff + 2)`, limitado a ±21 días.
- `margen × 1 / (1 + 0,25 · n_eff)` (mínimo 0,4): más observaciones recientes, rango más estrecho.
- Las observaciones a más de 45 días de la temporada se guardan pero no mueven nada.
Constantes en `web/src/lib/estado.ts` (`CIUDADANA`). No está validado con datos reales.

## Limitaciones
- Datos fenológicos de Sevilla muy escasos (2 años, 7 fotos casuales): márgenes anchos a propósito.
- Brihuega: no se guardó la predicción de 2026, así que no se puede medir su acierto; se compara el 2026 real con la predicción 2027.
- Tejera Negra: el satélite marcó el inicio el 4 sep (`revisar = True`), semanas antes que cualquier año anterior; **no se usa** para mover el calendario. Convive con un calendario que dice que el color cambia desde el 7 oct: conviene revisarlo con quien generó el dato.
- `referencia_fechas.csv` no trae percentiles: el rango "probable" de los calendarios es mediana ± ¼ del rango.
- `meteo_sevilla.csv` termina el 31-12-2025; los días fuera de temporada muestran "Fuera de temporada" y la próxima ventana.
- La comunidad vive en el navegador: no se comparte entre dispositivos.

## Hacia producción (que se sostenga solo)
1. **Sentinel-2** automático (STAC/Planetary Computer) → índices por parcela cada pasada de 5 días.
2. Mover la descarga de Open-Meteo a un proceso programado en servidor (hoy la hace el navegador) y añadir AEMET; enviar alertas reales con la previsión.
3. **Backend** para observaciones (API + almacenamiento de fotos + moderación y EXIF real de GPS) y alertas por email/push.
4. Reentrenar y publicar el acierto de cada predicción pasada (credibilidad).
5. Un destino nuevo = una fila de datos + calendario.
