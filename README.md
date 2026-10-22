# Cuándo Florece · el mapa vivo de la floración en España

Prototipo para el reto de Greenia (Hackathon EPS UFV, 20–22 oct 2026). Mapa con 3 destinos, cuándo ir y estado de la floración en lenguaje llano, simulador de fecha y alertas simuladas.

## Qué es real y qué es simulado
| Elemento | Estado |
|---|---|
| Tejera Negra: serie de color, hoja perdida, clima, calendario de hitos | **Real** (satélite + calendario de 6–8 otoños) |
| Tejera Negra: "hoja cayendo" y "hayedo desnudo" | **Supuesto** marcado (≈7 y ≈28 días tras el pleno; no hay dato) |
| Brihuega: predicción 2027, cosecha 2026 | **Real** (climatología v0, 10 temporadas; cosechas por satélite ±3 d) |
| Brihuega: "primeras flores" y "floración activa" | **Supuesto** marcado (derivados del margen de plena flor) |
| Azahar de Sevilla: modelo de grados-día con `meteo_sevilla.csv` | **Real**, con calibración débil (2 años) |
| Open-Meteo en vivo: tiempo de los 3 destinos, anomalía de 2026 y ajuste de las fechas de los 3 destinos en temporada | **Real**, con respaldo a caché local y al CSV |
| Modelo térmico de Brihuega y Tejera Negra (umbral, bases, años de referencia) | **Supuesto** marcado "experimental, no validado" en la ficha |
| Alertas | **Simulado** ("Demo") |
| Página `/agencia`: alojamientos, restaurantes, actividades y valoraciones | **Real** (valoraciones de Booking.com / Google Maps del 21/10/2026; actividades verificadas en webs de turismo y prensa; lo no verificado se dice en la tarjeta) |
| Página `/agencia`: precios y margen | **Ficticio** ("Precio estimado de ejemplo (ficticio)"); margen en `web/src/config/agencia.ts` (12 %) |
| Página `/agencia`: tiempo de cada día de la ruta | **Real** (Open-Meteo: previsión hasta 15 días vista; más allá, lo habitual esas fechas en los 5 años anteriores) |
| Página `/agencia`: atención al cliente (teléfono, correo, condiciones) | **Ficticio**, etiquetado "Ejemplo · en preparación" |
| Fecha "hoy" | La del dispositivo (nunca anterior al 21 oct 2026, fecha de los datos): las vistas avanzan solas |

## Modelo de Sevilla (grados-día)
El pipeline sigue calculando rangos probable/amplio: el mapa solo muestra la ventana central y la agencia usa la ventana probable (con el ajuste en vivo) como días que se pueden elegir en su calendario.
- Se acumula `max(0, (Tmáx+Tmín)/2 − base)` desde el 1 de enero.
- **Base**: se probaron 7–13 °C y se eligió la de menor variación del umbral entre los 2 años observados (12 °C). Con 2 años es orientativo; la tabla de bases y su sensibilidad están en la ficha.
- **Umbrales**: las 7 observaciones (fotos de iNaturalist) dan el GDD de inicio (la más temprana), pico (mediana) y fin (la más tardía).
- **Rangos**: para cada uno de los 14 años de temperatura se busca el día que se alcanza el umbral. "Probable" = percentiles 25–75; "amplio" = percentil 10 del umbral bajo y 90 del alto (incluye la incertidumbre de calibración).
- **Comprobación** dejando un año fuera: −1,5 y +2,0 días (muestra muy pequeña: no es una garantía).
- **Hallazgo**: la mediana climática del pico (31 mar) es ~10 días posterior a los dos años observados (2022–23, cálidos).

## Datos en vivo (Open-Meteo)
Módulo `web/src/lib/tiempo.ts`: la API de previsión (últimos días + 16 de previsión) y, para lo anterior a 30 días, la API de archivo (la de previsión solo trae ~40 días hacia atrás; los anteriores llegan vacíos). Gratis y sin clave.
- **Actualización automática**: al abrir la app y cada 30 min (botón "Actualizar" para forzarla). Caché local de 30 min.
- **Respaldo**: red → caché local → CSV del proyecto (solo Tejera Negra lo trae) → aviso "sin datos". La etiqueta dice siempre de dónde viene el dato.
- **Los 3 destinos ajustan sus fechas con la temperatura real**, cada uno desde que empieza su ventana de acumulación (Tejera Negra: 1 ago, activo ahora; Sevilla y Brihuega: 1 ene 2027).
- **Tejera Negra y Brihuega: modelo térmico experimental** (`termico` en el JSON, `aplicarTermico` en `web/src/lib/vivo.ts`). No hay fechas de floración por año para calibrar un modelo, así que se asume que la fecha media del CSV corresponde al frío (hayedo, media diaria bajo 16/18/20 °C desde el 1 ago) o al calor (lavanda, sobre 3/5/7 °C desde el 1 ene) acumulado medio de los años de referencia (2018–2025 y 2016–2025, de la API de archivo de Open-Meteo, guardados en `pipeline/clima/`). Con la temperatura real (observada + previsión, y para lo que falta cada año de referencia) se calcula cuántos días se adelanta o retrasa ese acumulado; se usa la mediana entre bases y se desplazan todas las fechas del CSV, **sin estrechar los márgenes** y sin salir del margen amplio del hito de referencia.
  - Tejera Negra hoy (21 oct 2026, 82 días reales + 15 de previsión): otoño más templado que la media → fechas 9 días después (8–9,5 según la base).
  - Prueba de Brihuega con 2026 (no usado para calibrar): el modelo habría adelantado la plena flor 12,5 días; la cosecha real por satélite llegó 8 días (10 %) y 4 días (50 %) antes de lo climatológico. Misma dirección, pero exagera; es otra fase y un solo año.
- **Tejera Negra**: el gráfico une `otono_clima_tejera_negra.csv` con los datos en vivo y la previsión.
- **Azahar de Sevilla**: desde el 1 de enero de la temporada (2027), `web/src/lib/vivo.ts` recalcula los hitos con el método de **años análogos**: calor real acumulado (observado + previsión) hasta hoy, y para el resto del año el calor diario de cada uno de los 14 años históricos. Mismos percentiles que el pipeline. Antes del 1 de enero muestra la climatología e indica por qué.
- **Prueba** (`node tests/vivo.mts`): sin datos en vivo reproduce exactamente el pipeline. Con 2025 fuera de los análogos y 60 días reales de 2025, el pico predicho cae 9 días antes del real; con 80 días, a 1 día.

## Franja de temporadas (encima del mapa)
Los meses de cada planta los calcula el pipeline (`calendario_*` en `build.py`, campo `calendario` del JSON) con una regla común: del extremo más temprano al más tardío de los datos.

| Planta | Meses | Fechas | De dónde sale |
|---|---|---|---|
| Hayedo (Tejera Negra) | sep–dic | 19 sep – 19 dic | `referencia_fechas.csv`: inicio más temprano (día 262,1) a pleno color más tardío (día 352,7), 8 otoños. El 19 dic es el extremo de un solo año; con las medianas sería solo octubre (7–19 oct). No se usa el inicio por satélite de 2026 (pendiente de revisar). |
| Lavanda (Brihuega) | jun–jul | 25 jun – 16 jul | `prediccion_2027_brihuega.csv`, hito `plena_flor` (rango amplio, climatología de 10 temporadas). La cosecha por satélite (jul–sep) no se cuenta como floración. |
| Azahar (Sevilla) | mar–abr | 7 mar – 1 abr | `fenologia_azahar_sevilla.csv`: primera y última foto en flor (días 66–91), 7 fotos de 2022 y 2023. |

Bajo cada mes aparecen como chips las plantas en temporada (un mes cuenta si el rango lo toca, así que el hayedo sale en sep, oct, nov y dic). El origen va en el texto accesible de cada chip y en una línea bajo la franja. Cada chip enlaza a `/agencia?destino=<id>`: la agencia abre con ese destino y sin fechas ni personas, y no arma la ruta hasta que el usuario elige ambas.

El clima de referencia del modelo térmico se descarga para esa coordenada exacta: los archivos de `pipeline/clima/` llevan la latitud y la longitud en el nombre, así que si cambia el punto se descarga de nuevo.
