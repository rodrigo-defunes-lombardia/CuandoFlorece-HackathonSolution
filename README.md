# Cuándo Florece · el mapa vivo de la floración en España

> Prototipo para el reto de **Greenia** del **Hackathon EPS UFV** (20–22 de octubre de 2026).
>
> 🌸 **Pruébala aquí: [cuando-florece-solution.netlify.app](https://cuando-florece-solution.netlify.app)**

Quien quiere ver una floración o un bosque de otoño siempre se pregunta lo mismo: *¿cuándo voy?* Las webs de turismo dan fechas fijas ("finales de marzo", "mediados de octubre") que no tienen en cuenta el año que hace, y si llegas una semana tarde, ya no hay nada que ver.

**Cuándo Florece** contesta a esa pregunta con datos. Junta imágenes de satélite, observaciones ciudadanas y el tiempo real para cada destino, y dice en lenguaje llano en qué fase está la floración, cuándo es el mejor momento para ir y con qué margen de confianza. Luego te ayuda a organizar el viaje.

---

## Qué hace

### 1. Mapa vivo
Mapa satélite con los destinos coloreados según su estado (fuera de temporada, brote, floración, pico, caída). Al pulsar uno se abre su ficha:

- **Estado actual** y **cuándo ir**, con una ventana central, una probable y una amplia. No damos una fecha exacta que no podemos garantizar.
- **De dónde sale cada dato**: cada bloque lleva una etiqueta (*Satélite*, *Modelo grados-día*, *Calendario histórico*, *Open-Meteo*, *Simulado*). Lo que es un supuesto lo pone.
- **Tiempo** de los últimos días y de los próximos 16, con un botón para actualizarlo.
- **Alerta "Avísame"** para cuando el destino entre en floración y en pico (en la demo no se envía ningún correo).

### 2. Máquina del tiempo
Un deslizador que mueve la fecha hasta un año hacia delante, con atajos (+7, +14 días, "1 abril 2027 · azahar", "5 julio 2027 · lavanda"…). El mapa y las fichas se recalculan para esa fecha.

### 3. Franja de temporadas
Encima del mapa, los 12 meses con las plantas que están en temporada en cada uno. Cada chip lleva a la agencia con ese destino elegido.

### 4. Agencia (`/agencia`)
La demo del modelo de negocio. Eliges destino, fechas (el calendario solo deja escoger días dentro de la ventana buena de floración) y número de personas, y la web arma una **ruta día a día** con alojamiento, restaurantes y actividades reales de la zona, sus valoraciones reales y el tiempo previsto para cada día. Los precios son de ejemplo, y el margen de la agencia es configurable.

---

## Los tres destinos

| Destino | Qué se ve | Temporada | Cómo se predice |
|---|---|---|---|
| **Hayedo de Tejera Negra** (Guadalajara) | Cambio de color del hayedo en otoño | sep – dic | Satélite Sentinel-2 (color y hoja perdida en 7 zonas), calendario de 6–8 otoños y modelo térmico experimental |
| **Campos de lavanda de Brihuega** (Guadalajara) | Floración de la lavanda / lavandín | jun – jul | Climatología de 10 temporadas, cosecha de 2026 medida por satélite y modelo térmico experimental |
| **Azahar de Sevilla** (casco histórico) | Floración de los naranjos | mar – abr | Modelo de grados-día calibrado con fotos de iNaturalist y 14 años de temperaturas |

Las coordenadas de cada destino están en `pipeline/build.py`, con la fuente de cada una (OpenStreetMap / Wikidata).

---

## Cómo funciona

```
 data/*.csv  ──►  pipeline/build.py  ──►  web/public/data/destinos.json  ──►  web (React)
 (satélite,       (modelos, rangos,        (un único JSON estático)           │
  fenología,       calendarios)                                                ▼
  meteo)                                                         Open-Meteo en vivo:
                                                                 ajusta las fechas con
                                                                 la temperatura real
```

1. **Datos** (`data/`): series de Sentinel-2 de Tejera Negra y Brihuega, observaciones de azahar en Sevilla, meteorología histórica, calendarios de referencia y la predicción 2027 de Brihuega. En `pipeline/clima/` está el clima histórico de Open-Meteo de cada destino, guardado para poder reconstruir el JSON sin red.
2. **Pipeline** (`pipeline/build.py`, Python + pandas): calcula los hitos de cada destino (inicio, floración, pico, fin…) con sus rangos de confianza y las temporadas de la franja, y lo escribe todo en `destinos.json`.
3. **Web** (`web/`, React + TypeScript + Vite): lee el JSON, pide el tiempo a Open-Meteo y **recalcula las fechas en vivo** según el año que esté haciendo.

### Modelo de grados-día (azahar de Sevilla)
- Se acumula `max(0, (Tmáx + Tmín)/2 − base)` desde el 1 de enero.
- **Base**: se probaron de 7 a 13 °C y se eligió la que menos variaba entre los años observados (12 °C).
- **Umbrales**: las 7 fotos de iNaturalist (2022 y 2023) dan los grados-día del inicio (la más temprana), del pico (la mediana) y del final (la más tardía).
- **Rangos**: para cada uno de los 14 años de temperaturas se busca el día en que se alcanza el umbral. *Probable* = percentiles 25–75; *amplio* = percentiles 10–90.
- **Validación dejando un año fuera**: error de −1,5 y +2,0 días. Con tan pocos datos es orientativo.
- **En temporada** (desde el 1 de enero) se usan **años análogos**: el calor real acumulado hasta hoy (observado + previsión) y, para el resto del año, el de cada uno de los 14 años históricos. En una prueba con 2025 fuera de la muestra, con 60 días reales el pico caía 9 días antes del real; con 80 días, a 1 día.

### Modelo térmico experimental (Tejera Negra y Brihuega)
No hay fechas de floración de cada año con las que calibrar un modelo propiamente dicho. Así que se supone que la fecha media del calendario corresponde al frío (hayedo: días con media bajo 16/18/20 °C desde el 1 de agosto) o al calor (lavanda: sobre 3/5/7 °C desde el 1 de enero) acumulado de un año medio. Con la temperatura real se calcula cuántos días va adelantado o retrasado este año y se desplazan las fechas, sin estrechar los márgenes. En la ficha aparece como *experimental, no validado*.

- Tejera Negra a 21 oct 2026: otoño más templado de lo normal → fechas unos 9 días más tarde.
- Prueba con Brihuega 2026: el modelo adelantaba la plena flor 12,5 días; la cosecha real por satélite llegó 4–8 días antes de lo habitual. Acierta la dirección pero exagera.

### Datos en vivo (Open-Meteo)
- API de previsión (últimos días + 16 de previsión) y API de archivo para fechas más antiguas. Gratuita y sin clave.
- Se actualiza al abrir la app y cada 30 minutos, con caché local.
- Si falla la red: caché local → CSV del proyecto → aviso de "sin datos". La etiqueta siempre dice de dónde viene el dato.

### Pensada para no romperse
- Si el navegador no tiene WebGL, el mapa 3D (MapLibre) pasa a un mapa plano (Leaflet), y si tampoco funciona, a una lista. La app nunca se queda en blanco.
- "Hoy" es la fecha del dispositivo (nunca anterior al 21 oct 2026, que es la fecha de los datos), así que las vistas avanzan solas.
- Accesibilidad: el significado nunca depende solo del color, hay foco visible, contraste mínimo de 4,5:1 y textos accesibles en el mapa y los chips. El sistema de diseño está en [`web/DESIGN.md`](web/DESIGN.md).

---

## Qué es real y qué es simulado

Queríamos ser honestos con lo que sabemos y lo que no, y cada dato lleva su origen en la propia web.

| Elemento | Estado |
|---|---|
| Tejera Negra: color, hoja perdida, clima y calendario de hitos | **Real** (satélite + 6–8 otoños) |
| Tejera Negra: "hoja cayendo" y "hayedo desnudo" | **Supuesto** (≈7 y ≈28 días después del pleno color) |
| Brihuega: predicción 2027 y cosecha 2026 | **Real** (climatología de 10 temporadas; cosecha por satélite ±3 días) |
| Brihuega: "primeras flores" y "floración activa" | **Supuesto** (derivados del margen de plena flor) |
| Sevilla: modelo de grados-día | **Real**, con calibración débil (2 años) |
| Tiempo y ajuste en vivo con Open-Meteo | **Real** |
| Modelo térmico de Brihuega y Tejera Negra | **Experimental**, marcado como no validado |
| Agencia: alojamientos, restaurantes, actividades y valoraciones | **Real** (Booking.com / Google Maps, consultado el 21/10/2026) |
| Agencia: precios, margen y atención al cliente | **Ficticio**, etiquetado en la web |
| Alertas por correo | **Simulado**: el correo solo se guarda en el navegador |

## Limitaciones conocidas
- Hay muy pocos datos de floración en Sevilla (7 fotos de 2 años), así que los márgenes son anchos a propósito.
- De Brihuega no se guardó la predicción de 2026, así que no se puede medir cuánto acertó.
- En Tejera Negra el satélite marcó el inicio del otoño el 4 de septiembre de 2026, semanas antes que cualquier año anterior. Está marcado para revisar y **no** se usa para mover el calendario.
- La imagen satélite del mapa es Esri World Imagery, que sirve para un prototipo. En producción haría falta una licencia o pasar a mosaicos Sentinel-2.

## Modelo de negocio (idea)
- **Destinos (B2G)**: suscripción para ayuntamientos y oficinas de turismo, con un panel de su zona, avisos a la hostelería y datos para gestionar aforos.
- **Hostelería y operadores (B2B)**: destacados cuando el destino entra en pico, comisión por reserva y acceso a la API.
- **Viajeros (B2C)**: alertas gratuitas y rutas a medida como las de `/agencia`, con un margen de la agencia (12 % en la demo, configurable en `web/src/config/agencia.ts`).

Añadir un destino nuevo es añadir sus datos y su calendario al pipeline: no hace falta tocar la web.

---

## Ejecutarlo en local

**Web** (Node 22):

```bash
cd web
npm install
npm run dev
```

Otros comandos: `npm run build` (compila a `web/dist`), `npm test` (tests con Vitest de la agencia, la franja y los viajes).

**Pipeline** (opcional, solo para regenerar `web/public/data/destinos.json` a partir de `data/`; Python 3 con `numpy` y `pandas`):

```bash
python pipeline/build.py
```

**Despliegue**: la web está publicada en Netlify ([cuando-florece-solution.netlify.app](https://cuando-florece-solution.netlify.app)). La configuración está en `web/netlify.toml`, y `web/public/_redirects` hace que funcione la ruta `/agencia`.

## Estructura

```
data/              CSV de partida (satélite, fenología, meteorología, calendarios)
pipeline/build.py  Modelos y generación de destinos.json
pipeline/clima/    Clima histórico de Open-Meteo de cada destino
web/src/
  components/      Mapa, ficha, simulador, franja, agencia, calendario…
  lib/             Estado de floración, ajuste en vivo, Open-Meteo, rutas y precios
  data/            Locales y actividades reales de la agencia
  config/          Margen de la agencia y tope de días
web/public/data/   destinos.json generado por el pipeline
```

## Tecnologías
React 18 · TypeScript · Vite · MapLibre GL · Leaflet · Vitest · Python (pandas, numpy) · Open-Meteo · Sentinel-2 · iNaturalist · Esri World Imagery · OpenFreeMap

## Licencia
El código se publica con licencia [MIT](LICENSE).

Los datos y servicios de terceros mantienen sus propias licencias y condiciones de uso: Open-Meteo (CC BY 4.0), Copernicus Sentinel-2, iNaturalist (cada observación tiene la licencia que le dio su autor), Esri World Imagery, OpenFreeMap / OpenStreetMap (ODbL), y las valoraciones de Booking.com y Google Maps.
