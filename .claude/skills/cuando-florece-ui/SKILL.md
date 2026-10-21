---
name: cuando-florece-ui
description: Guía de diseño, implementación y pruebas de la interfaz de "Cuándo Florece" (mapa vivo de floración en España). Úsala al crear o modificar cualquier pantalla, componente o estilo de /web, y antes de dar una tarea de UI por terminada. Coordina frontend-design, UI/UX Pro Max y webapp-testing.
---

# Cuándo Florece · UI

Esta skill coordina tres skills y fija el criterio visual del proyecto. Léela entera antes de tocar la interfaz.

## 1. Reparto de papeles (y quién gana si chocan)

| Skill | Papel | Gana en |
|---|---|---|
| **UI/UX Pro Max** | Decide el sistema de diseño UNA vez: estilo, paleta, tipografías, espaciado. | Colores, tipografías, tokens |
| **frontend-design** | Convierte ese sistema en una interfaz con identidad: composición, jerarquía, motion, detalles. | Layout, composición, microinteracciones |
| **webapp-testing** | Verifica en navegador real (Playwright) que lo construido funciona y se ve bien. | Dar algo por terminado |

Regla de desempate: los tokens de UI/UX Pro Max no se modifican a mano en componentes. Si frontend-design pide otro color o fuente, se cambia el token en un único sitio y se documenta por qué.

## 2. Flujo obligatorio

1. **Sistema de diseño (una sola vez, o si cambia la dirección).**
   - Consulta UI/UX Pro Max siguiendo su propio SKILL.md, partiendo de la dirección de la sección 3.
   - Guarda el resultado en `web/src/styles/tokens.css` (variables CSS) y un resumen de 10 líneas en `web/DESIGN.md`: estilo elegido, paleta, par tipográfico, escala de espaciado, radios, sombras.
   - Elige UN estilo coherente. No mezcles varios.
2. **Implementación.**
   - Aplica frontend-design usando solo variables de `tokens.css`.
   - Evita la estética genérica de IA: sin degradados morados por defecto, sin tarjetas idénticas repetidas sin jerarquía, sin emojis como iconos, sin fuentes por defecto del sistema como identidad.
   - Cada pantalla tiene un punto focal claro.
3. **Verificación.** Aplica webapp-testing (sección 5) tras cada pantalla o flujo completado.
4. **Entrega.** Resume qué cambió, qué probaste y qué queda pendiente.

## 3. Dirección visual del proyecto

Referencia: la presentación del reto de Greenia. Tono sereno, editorial y natural, no corporativo ni "dashboard".

- **Base**: fondo oscuro violeta-ciruela (≈ `#2B2333`), texto crema (≈ `#FAF7F0`).
- **Acentos**: ámbar/dorado para llamadas a la acción y el "hoy" (≈ `#F0B35A`); lila para elementos de floración (≈ `#8E6FC4` y `#A98BD9`).
- **Tipografía**: serif con carácter para títulos (estilo editorial, p. ej. Fraunces o similar) + sans neutra legible para datos (Inter o similar). Si UI/UX Pro Max propone un par distinto que respete este tono, puede usarlo.
- **Motivo**: la flor de seis pétalos de la presentación como marca (icono, loader, marcador del mapa). Es un SVG propio, sin librerías de iconos genéricas para la marca.
- **Estados del color (semántica fija)**: sin iniciar → gris-lila apagado; brote/inicio → lila claro; floración activa → lila medio; pico → ámbar intenso; caída/fin → marrón-ciruela apagado. Nunca dependas solo del color: añade etiqueta de texto y/o forma.
- **Hayedos (otoño)**: usan su propia rampa cálida (verde → ocre → cobre) para el color de la hoja, siempre con la leyenda visible.

Si el estilo de UI/UX Pro Max que elijas contradice esta dirección, gana esta dirección salvo que justifiques el cambio en `DESIGN.md`.

## 4. Reglas de producto que el diseño debe expresar

Son lo que diferencia al proyecto; un diseño bonito que las rompe se considera defectuoso.

1. **Incertidumbre visible.** Ninguna fecha predicha se muestra como fecha única. Siempre un rango (banda "probable" y banda "amplia") y un indicador de confianza. Representa los rangos como bandas sobre una línea de tiempo, no como texto suelto.
2. **Origen del dato en cada cifra.** Badge consistente: `Satélite`, `Modelo grados-día`, `Calendario histórico`, `Comunidad (N)`, `Simulado`. Los datos simulados tienen un aspecto reconocible (borde discontinuo o etiqueta) y nunca se confunden con los reales.
3. **Honestidad satelital.** Donde el dato es un índice de color o un corte detectado por satélite, la ficha lo dice en lenguaje llano ("estimación desde el espacio, no una medida").
4. **El turista primero.** La ficha responde en este orden: ¿está en flor?, ¿cuándo ir?, ¿con qué fiabilidad?, ¿qué más hacer allí? Las acciones secundarias (alerta, "Yo estuve aquí", AR) no tapan esa respuesta.
5. **Simulador de fecha** (Hoy / +7 / +14 días) siempre accesible desde el mapa; al moverlo, color del mapa, barra de estado y rangos cambian de forma visible y fluida.
6. **Móvil primero.** El mapa y la ficha se usan en el campo: botones grandes, ficha como panel inferior (bottom sheet) en móvil, lateral en escritorio.

## 5. Pruebas con webapp-testing (Playwright)

Sigue el SKILL.md de webapp-testing. Arranca la app (`npm run dev`) y comprueba como mínimo:

**Flujos**
- Carga inicial: el mapa se pinta y aparecen los 4 destinos, sin errores en consola.
- Abrir la ficha de cada destino: muestra estado, rango de fechas, confianza y badge de origen.
- Mover el simulador de fecha: cambia el estado y el color del destino.
- "Yo estuve aquí": rellenar estado + permitir/denegar geolocalización (simula ambos casos) + subir una foto de prueba; la observación aparece y la ficha se actualiza. Con una ubicación lejana, se rechaza con un mensaje claro.
- Alerta "Avísame": se guarda localmente y confirma que es una demo.
- Sección "Negocio" accesible desde la navegación.

**Viewports**: 390×844 (móvil), 768×1024 (tableta), 1440×900 (escritorio). Captura de pantalla en cada uno y revísala visualmente.

**Calidad**
- Ningún error ni aviso relevante en consola.
- Sin desbordes horizontales ni texto cortado, también con textos largos en español.
- Navegación por teclado: foco visible y orden lógico en ficha, slider y formulario.
- Contraste suficiente en los estados de color; el significado no depende solo del color.
- Si falla la red (Open-Meteo), la app cae al CSV y lo indica con el badge correspondiente, sin pantalla rota.
- Estado vacío y de carga diseñados (no pantallas en blanco).

Cuando algo falle: corrige, vuelve a ejecutar la prueba y solo entonces marca la tarea como hecha. No declares algo "verificado" sin haberlo ejecutado.

## 6. Definition of done de una pantalla

- [ ] Usa solo tokens de `tokens.css`
- [ ] Respeta las reglas de la sección 4
- [ ] Probada en los 3 viewports con capturas revisadas
- [ ] Sin errores de consola
- [ ] Accesible por teclado y con contraste correcto
- [ ] `DESIGN.md` al día si cambió algo del sistema
