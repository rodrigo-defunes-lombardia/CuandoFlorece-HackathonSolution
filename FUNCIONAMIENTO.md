# Cómo funciona Cuándo Florece

Documento técnico de la web: qué ocurre desde que se abren los datos hasta que se pinta el mapa, y qué hace cada archivo y carpeta del repositorio. Para arrancar el proyecto, ver [`README.md`](README.md); para el modelo de negocio, [`NEGOCIO.md`](NEGOCIO.md).

---

## 1. La idea en una frase

Un **pipeline en Python** convierte los CSV de `data/` en un único JSON (`destinos.json`). La **web en React** carga ese JSON, le aplica el tiempo en vivo de Open-Meteo y las observaciones de la comunidad, y calcula en el navegador el estado de cada destino para la fecha elegida en la máquina del tiempo.

```
 data/*.csv ──► pipeline/build.py ──► web/public/data/destinos.json
                (pandas, numpy)                   │
                                                  ▼
                                   ┌──────── App.tsx ────────┐
   Open-Meteo (en vivo) ─► tiempo.ts ─► vivo.ts (recalcula Sevilla)
   localStorage ─────────► repos.ts ─► estado.ts (ajuste comunidad + estado del día)
                                   └──────────┬──────────────┘
                                              ▼
                     MapView (mapa)  ·  Ficha (detalle)  ·  Simulador (fecha)
```

No hay servidor propio: la web es un sitio estático. Lo único que sale a internet son las teselas del mapa (Esri y OpenFreeMap) y las peticiones a Open-Meteo, que no necesitan clave.

---

## 2. Qué pasa al abrir la web, paso a paso

1. **`index.html`** carga **`src/main.tsx`**, que importa los estilos (`tokens.css`, `app.css`) y monta `<App />`.
2. **`App.tsx`** pide `/data/destinos.json`. Si no existe, muestra el aviso «Ejecuta `python pipeline/build.py`». Mientras tanto se ve la flor girando («Cargando el mapa vivo…»).
3. Se fija **«hoy»**: la fecha real del dispositivo, nunca anterior a `hoy_demo` del JSON (21 oct 2026).
4. **Tiempo en vivo**: para cada destino se llama a `cargarTiempo` (`lib/tiempo.ts`). Para Sevilla, a partir del 1 ene 2027, se piden los datos desde el 1 de enero; para el resto, los últimos 30 días y 16 de previsión. Se repite cada 30 minutos.
5. **Predicción en vivo**: `aplicarVivo` (`lib/vivo.ts`) recalcula los hitos de Sevilla con la temperatura real. Los otros destinos pasan sin cambios.
6. **Comunidad**: se leen las observaciones propias de `localStorage` y se suman las 5 semillas de ejemplo (`SEMILLAS`). Con ellas, `calcularAjuste` (`lib/estado.ts`) calcula cuánto mover y estrechar los rangos de cada destino.
7. **Estado del día**: con la fecha de la máquina del tiempo (`hoy + días`), `estadoEn` decide la fase, el porcentaje de floración y la ventana óptima de cada destino.
8. Se pintan el **mapa** (`MapView`), la **máquina del tiempo** (`Simulador`) y el **panel lateral**: primero la lista de destinos y, al elegir uno, su **ficha** (`Ficha`).

Cada vez que cambian la fecha, las observaciones o el tiempo, React recalcula los pasos 5–7 (con `useMemo`) y el mapa y la ficha se actualizan solos.

---

## 3. Árbol del repositorio

```
hackathon/
├── data/                      CSV de partida (los entrega el reto; no se editan)
├── pipeline/
│   └── build.py               CSV → destinos.json
├── web/
│   ├── index.html
│   ├── package.json · package-lock.json · tsconfig.json · vite.config.ts
│   ├── DESIGN.md              resumen del sistema de diseño
│   ├── public/data/
│   │   └── destinos.json      salida del pipeline (la lee la web)
│   └── src/
│       ├── main.tsx · App.tsx · vite-env.d.ts
│       ├── lib/               lógica sin interfaz (datos, cálculos, APIs)
│       ├── components/        piezas de la interfaz
│       └── styles/            tokens.css · app.css
├── tests/                     pruebas (Playwright y Node)
├── .claude/skills/            skills de Claude Code usadas para diseñar y probar
├── README.md · NEGOCIO.md · FUNCIONAMIENTO.md
└── .gitignore
```

---

## 4. Qué hace cada archivo y carpeta

### 4.1 Raíz

| Archivo | Qué hace |
|---|---|
| `README.md` | Cómo arrancar el proyecto, qué es real y qué es simulado, el modelo de Sevilla, los datos en vivo, la fórmula de la comunidad, las limitaciones y los pasos hacia producción. |
| `NEGOCIO.md` | Modelo de negocio (B2G, B2B, B2C), sacado de la web a petición. |
| `FUNCIONAMIENTO.md` | Este documento. |
| `.gitignore` | Excluye `.venv`, `node_modules`, `dist` y `*.tsbuildinfo`. |

### 4.2 `data/` — datos de partida

Son los 12 CSV del reto. **Nadie los modifica**: el pipeline solo los lee.

| Archivo | Contenido | Lo usa |
|---|---|---|
| `meteo_sevilla.csv` | Temperatura máxima y mínima y lluvia diarias de Sevilla, 2012–2025. | Modelo de grados-día de Sevilla |
| `obs_azahar_sevilla.csv` | Las 7 fotos de azahar en flor de iNaturalist (fecha, fuente, calidad). | Umbrales de calor de Sevilla |
| `fenologia_azahar_sevilla.csv` | Resumen por año de esas observaciones (2022 y 2023). | Años de calibración de Sevilla |
| `prediccion_2027_brihuega.csv` | Predicción 2027 de plena flor y cosecha, con rangos probable y amplio (climatología v0, 10 temporadas). | Hitos de Brihuega |
| `avance_brihuega.csv` | Porcentaje de lavanda cortada en 2026, fecha a fecha. | Gráfico «Cosecha de 2026» |
| `temporada_brihuega.csv` | Fechas reales de cosecha de 2026 detectadas por satélite. | Tabla 2026 frente a 2027 |
| `s2_brihuega.csv` | Reflectancias Sentinel-2 por parcela. | Solo para contar parcelas y el periodo de imágenes |
| `referencia_fechas.csv` | Calendario de otoño de Tejera Negra: mediana, mínimo y máximo de cada hito (6–8 otoños). | Hitos de Tejera Negra |
| `otono_hitos.csv` | Inicio de otoño detectado por satélite en 2026, con la marca `revisar`. | Aviso «Pendiente de revisar» y confianza de Tejera Negra |
| `otono_avance_tejera_negra.csv` | Índice de color y hoja perdida del hayedo en 2026 (mediana y percentiles de 7 zonas). | Gráfico «Índice de color del hayedo» |
| `otono_clima_tejera_negra.csv` | Tiempo diario de Tejera Negra. | Gráfico del tiempo y respaldo sin conexión |
| `s2_otono_tejera_negra.csv` | Reflectancias e índices Sentinel-2 del hayedo. | Hoy no lo usa el pipeline |

### 4.3 `pipeline/build.py` — de CSV a JSON

Se ejecuta con `python pipeline/build.py` y escribe `web/public/data/destinos.json`. Fecha de la demo fija: `HOY = 2026-10-21`.

| Función | Qué hace |
|---|---|
| `hito()` | Forma estándar de un hito: `central`, rango `probable`, rango `amplia`, `origen`, `nota`, y las marcas `supuesto` (estimado por nosotros) y `revisar`. |
| `gdd_anual`, `gdd_en`, `doy_cruce` | Grados-día acumulados de un año, valor en un día y día en que se cruza un umbral. |
| `modelo_sevilla()` | Prueba bases de 7 a 13 °C y elige la de menor variación del umbral entre años (12 °C). Calcula los umbrales de cada hito con las 7 fotos, busca en qué día se cruzan en cada uno de los 14 años y saca los rangos (probable p25–p75; amplio p10 del umbral bajo a p90 del alto). Hace la comprobación dejando un año fuera y guarda el calor diario de cada año (`gd_diario`) para la predicción en vivo. |
| `destino_sevilla()` | Arma el destino «Azahar de Sevilla» con el modelo, sus fases, la curva de intensidad y la confianza **baja**. |
| `destino_brihuega()` | Copia la predicción 2027 del CSV, deriva «Primeras flores» y «Floración activa» (marcados `supuesto`), añade el avance de la cosecha 2026 y la confianza **media**. |
| `destino_tejera()` | Convierte el calendario a fechas de 2026 (probable = mediana ± ¼ del rango; amplio = mínimo–máximo), añade «Empieza a caer la hoja» y «Hayedo desnudo» (`supuesto`), la serie de color y el clima. Confianza **media**, o **baja** si `otono_hitos.csv` trae `revisar = True` (como ahora). |
| `main()` | Junta los 3 destinos, escribe el JSON e imprime un resumen del modelo de Sevilla. |

### 4.4 `web/` — configuración

| Archivo | Qué hace |
|---|---|
| `index.html` | Página única; carga las fuentes y `src/main.tsx`. |
| `package.json` | Dependencias (React 18, MapLibre GL 4, Vite 5, TypeScript) y scripts `dev`, `build` y `preview`. |
| `vite.config.ts` | Plugin de React y `host: true`, para abrir la web desde el móvil en la misma red. |
| `tsconfig.json` | TypeScript en modo estricto. |
| `DESIGN.md` | Resumen del sistema visual: paleta, tipografías, estados de color y accesibilidad. |
| `public/data/destinos.json` | Salida del pipeline. Lleva `generado`, `hoy_demo` y la lista de `destinos`. Cada destino tiene hitos, fases, ventana, curva, confianza, orígenes y, según el sitio, `modelo` (Sevilla), `historia` (Brihuega) o `serie` (Tejera Negra). |

### 4.5 `web/src/` — entrada

| Archivo | Qué hace |
|---|---|
| `main.tsx` | Importa los estilos y monta `<App />` dentro de `StrictMode`. |
| `App.tsx` | Coordina toda la web (sección 2): carga el JSON, fija «hoy», refresca el tiempo cada 30 min, aplica la predicción en vivo, lee las observaciones, calcula ajustes y estados y decide qué se ve: lista de destinos o ficha, y qué formulario está abierto. |
| `vite-env.d.ts` | Tipos de Vite (por ejemplo, `import.meta.env.DEV`). |

### 4.6 `web/src/lib/` — lógica (sin interfaz)

| Archivo | Qué hace |
|---|---|
| `tipos.ts` | Tipos TypeScript del JSON (`Destino`, `Hito`, `Fase`, `Confianza`, `ModeloSevilla`) y de la comunidad (`Observacion`, `Alerta`). |
| `fechas.ts` | Utilidades de fechas en UTC: sumar días, días entre fechas y formatos «21 oct», «21 oct 2026», «hace 3 días». |
| `estado.ts` | El corazón de la web. **`estadoEn(destino, fecha, ajuste)`**: devuelve la fase, la etiqueta, el % de floración (interpolando la curva), la ventana óptima con sus rangos y la próxima fecha de inicio. Los hayedos repiten su calendario cada año. **`calcularAjuste`**: combina las observaciones en un desplazamiento y un estrechamiento (constantes en `CIUDADANA`). **`hitosAjustados`**: aplica ese ajuste a los hitos. También contiene `haversineKm` (distancia) y `opcionesFase` (opciones del formulario). |
| `vivo.ts` | Predicción en vivo de Sevilla con **años análogos**: suma el calor real (observado + previsión) hasta donde hay datos y completa el resto con el calor diario de cada uno de los 14 años. Usa los mismos percentiles que el pipeline y lo reproduce exactamente si no hay datos en vivo. Antes del 1 ene 2027 no cambia nada y lo explica. |
| `tiempo.ts` | Cliente de Open-Meteo. Usa la API de previsión (`past_days` + 16 días) y, para fechas de hace más de 92 días, la de archivo. Caché de 30 min en `localStorage`. Si falla la red: caché → CSV (solo Tejera Negra) → «sin datos». `fusionar` une el CSV con los datos en vivo; si se solapan, gana Open-Meteo. |
| `openmeteo.ts` | `anomaliaSevilla`: compara el calor acumulado del año en curso (enero–abril, API de archivo) con la media histórica y dice si la temporada va adelantada o retrasada. Si no hay red, usa el último año del CSV. Se muestra en la ficha de Sevilla. |
| `repos.ts` | Acceso a los datos de la comunidad. Hoy guarda en `localStorage` (`cf.obs`, `cf.alertas`); para producción basta con implementar las mismas interfaces contra una API. Incluye las 5 observaciones `SEMILLAS` de ejemplo, con fechas relativas a «hoy». |
| `colores.ts` | Traduce cada fase a su color (variables CSS): rampa lila/ámbar para flores y verde → ocre → cobre para hayedos. |

### 4.7 `web/src/components/` — interfaz

| Archivo | Qué hace |
|---|---|
| `MapView.tsx` | Mapa MapLibre. Fondo de **satélite** (Esri World Imagery) con carreteras, límites y ciudades de OpenFreeMap encima. Se atenúa en **modo oscuro** según la preferencia del navegador y cambia en el momento si el usuario la cambia. Cada destino es una **flor dibujada en el propio mapa** (capa de símbolos), con su centro exacto en la coordenada, así que no se desplaza al hacer zoom. Las etiquetas se colocan donde no chocan, y el seleccionado lleva halo y queda encima. Al elegir un destino, el mapa vuela hasta él respetando el panel. Incluye una lista oculta de botones para teclado y lector de pantalla, y un aviso si no cargan las teselas. |
| `Simulador.tsx` | La **máquina del tiempo** (arriba a la izquierda, semitransparente): botones Hoy / +7 / +14 días, desplegable «Saltar a…» con fechas clave de 2027 y un deslizador de 0 a 365 días. |
| `Ficha.tsx` | Detalle de un destino, en el orden que necesita el turista: **¿está en flor?** (fase y %), **¿cuándo ir?** (ventana y `LineaTiempo`, aviso de predicción en vivo, ajuste de la comunidad y aviso «Pendiente de revisar»), **¿cuánto confiar?** (nivel, años, fotos y verificaciones), **Evolución** (gráfico propio de cada sitio: color del hayedo, cosecha de Brihuega, grados-día de Sevilla con tabla de bases y comprobación), **Tiempo**, acciones (Avísame / Yo estuve aquí) y partners de **ejemplo**. |
| `LineaTiempo.tsx` | Bandas de fechas: amplia (clara), probable (intensa), marca central y línea de la fecha consultada. Nunca muestra una fecha suelta. |
| `Grafico.tsx` | Gráfico SVG propio, sin librerías: líneas, banda de percentiles, líneas verticales (hoy, hitos) y horizontales (umbral). Lleva texto alternativo para lectores de pantalla. |
| `Tiempo.tsx` | Tarjeta del tiempo: temperatura real (continua) y previsión (punteada), lluvia y mínima de los últimos y próximos 7 días, botón «Actualizar» y la etiqueta de origen (Open-Meteo, CSV o sin conexión). |
| `FormObs.tsx` | Formulario «**Yo estuve aquí**»: estado observado, foto (reducida a 480 px para que quepa en el navegador), ubicación por GPS o simulada (demo cerca/lejos) y comentario. Rechaza observaciones sin foto, sin ubicación o a más de 10 km, y dice cuánto ha movido la predicción. |
| `FormAlerta.tsx` | Formulario «**Avísame**»: valida el correo y lo guarda solo en el navegador, dejando claro que es una demo y no se envía nada. |
| `Modal.tsx` | Ventana modal accesible: foco al primer campo, cierre con Esc o clic fuera y devuelve el foco al cerrar. |
| `Badge.tsx` | Etiqueta de origen del dato (Satélite, Modelo grados-día, Calendario histórico, Comunidad (N), Simulado, Open-Meteo), cada una con un símbolo propio para no depender solo del color. |
| `Flor.tsx` | La marca: flor de seis pétalos en SVG; el color llega por la variable CSS `--c`. |

### 4.8 `web/src/styles/`

| Archivo | Qué hace |
|---|---|
| `tokens.css` | Variables de diseño: colores (fondo, texto, ámbar, lilas, estados `--st-*`, rampa del hayedo `--hy-*`), tipografías (Fraunces + Inter), espaciados, radios y sombra. Todo el color sale de aquí. |
| `app.css` | Maquetación y componentes. En móvil, la ficha es un panel inferior; en escritorio (más de 859 px), un panel lateral con la máquina del tiempo flotando a su derecha. Incluye el foco visible ámbar, los estados de fase y el estilo de los datos de ejemplo. |

### 4.9 `tests/`

| Archivo | Qué comprueba | Cómo se lanza |
|---|---|---|
| `e2e.py` | Recorrido completo con Playwright: carga, fichas, máquina del tiempo, observación cerca y lejos, alerta, consola sin errores y capturas en 3 tamaños. | `python tests/e2e.py` con `npm run dev` en marcha |
| `precision_mapa.py` | Que el punto central de cada flor cae exactamente en su coordenada a varios zooms, en móvil y escritorio. | `python tests/precision_mapa.py` |
| `vivo.mts` | Que la predicción en vivo reproduce el pipeline sin datos y que, con datos reales de 2025 (excluido de los análogos), se acerca a la fecha real. | `node tests/vivo.mts` |

### 4.10 `.claude/skills/`

Instrucciones para Claude Code; no forman parte de la web.

| Carpeta | Para qué |
|---|---|
| `cuando-florece-ui` | Guía propia del proyecto: dirección visual, reglas de producto (incertidumbre visible, origen del dato…) y lista de comprobación de cada pantalla. |
| `frontend-design` | Criterios de diseño de interfaz (de anthropics/skills). |
| `ui-ux-pro-max` | Catálogo de estilos, paletas y tipografías usado para fijar los tokens. |
| `webapp-testing` | Pruebas en navegador con Playwright (de anthropics/skills). |

---

## 5. Recorridos clave

**Elegir un destino.** Clic en la flor del mapa o en la tarjeta de la lista → `App` guarda `sel` → `MapView` vuela hasta él y le pone el halo → el panel muestra su `Ficha`.

**Mover la máquina del tiempo.** `Simulador` cambia `dias` → `App` recalcula `fecha = hoy + dias` → `estadoEn` da nuevos estados → cambian el color de las flores del mapa, las etiquetas, la ficha y la línea de «fecha consultada».

**Enviar una observación.** `FormObs` valida foto, ubicación y distancia → `observacionesRepo.crear` la guarda en `localStorage` → `App` recarga las observaciones → `calcularAjuste` mueve y estrecha los rangos → la ficha muestra «Verificado por N personas» y cuánto se ha movido la predicción.

**Actualizar el tiempo.** Botón «Actualizar» (o cada 30 min) → `cargarTiempo` con `forzar` → nuevos datos → Sevilla se recalcula en `vivo.ts` (desde el 1 ene 2027) y la tarjeta del tiempo se redibuja.

---

## 6. Qué se guarda en el navegador

Todo en `localStorage`. Si se borra, la web sigue funcionando: solo se pierden las observaciones propias y las alertas, y se vuelve a pedir el tiempo.

| Clave | Contenido |
|---|---|
| `cf.obs` | Observaciones propias (con la foto reducida, en base64). |
| `cf.alertas` | Correos de «Avísame» (demo; no se envían). |
| `cf.tiempo.<id>` | Última respuesta de Open-Meteo de cada destino (caché de 30 min y respaldo sin conexión). |

---

## 7. Cambios habituales

- **Actualizar datos:** sustituir los CSV en `data/` → `python pipeline/build.py` → recargar la web.
- **Añadir un destino:** escribir una función `destino_x()` en `build.py` que devuelva la misma estructura (hitos, fases, ventana, curva, confianza, orígenes) y añadirla en `main()`. El mapa, la lista y la ficha lo recogen sin tocar la web. Solo hace falta añadir código en `Ficha.tsx › Evolucion` si se quiere un gráfico propio.
- **Cambiar colores o tipografías:** solo en `styles/tokens.css`.
- **Ajustar el peso de la comunidad:** constantes `CIUDADANA` en `lib/estado.ts`.
- **Pasar a un backend real:** implementar `ObservacionesRepo` y `AlertasRepo` de `lib/repos.ts` con `fetch` contra una API; la interfaz no cambia.
