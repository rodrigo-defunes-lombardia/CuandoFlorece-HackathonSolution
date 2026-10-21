export function Negocio() {
  return (
    <main className="pagina" id="contenido">
      <h1>Un calendario vivo que se paga solo</h1>
      <p className="lead">La floración mueve a miles de personas, pero hoy nadie les dice cuándo ir con una fecha honesta. Cuándo Florece convierte esa pregunta en una relación continua con el visitante, el destino y el comercio local.</p>
      <div className="negocio-rejilla">
        <article className="neg neg--g"><h2>Destinos <small>B2G</small></h2>
          <p>Suscripción anual para ayuntamientos y oficinas de turismo: panel de floración de su zona, aviso a la hostelería, widget para su web y datos para gestionar aforos.</p>
          <p className="neg-dato">Modelo: cuota por destino + módulo de gestión de afluencia.</p></article>
        <article className="neg"><h2>Hostelería y operadores <small>B2B</small></h2>
          <p>Alojamientos, restaurantes y tour operadores pagan por aparecer destacados cuando el destino entra en pico, o por comisión de reserva. Acceso a API y datos agregados para agencias, con foco en el mercado asiático, que ya viaja por flor.</p>
          <p className="neg-dato">Modelo: destacados por temporada, comisión y API.</p></article>
        <article className="neg"><h2>Viajeros <small>B2C</small></h2>
          <p>Alertas gratuitas que atraen y alertas premium con más destinos y mejor margen de confianza, rutas de varios días y experiencias guiadas en torno a la floración.</p>
          <p className="neg-dato">Modelo: freemium + rutas y experiencias.</p></article>
      </div>
      <section className="neg-foso"><h2>Por qué se sostiene</h2>
        <ul>
          <li><b>Honestidad como marca.</b> Rangos de confianza, no fechas falsas: el visitante vuelve porque no se siente engañado.</li>
          <li><b>Datos propios que mejoran solos.</b> Satélite, modelo térmico y verificación ciudadana se refuerzan; cada visita afina la siguiente predicción.</li>
          <li><b>Escala barata.</b> Añadir un destino es añadir una fila de datos y su calendario, no construir una app nueva.</li>
        </ul>
        <p className="nota">Cifras de mercado y precios: por validar con Greenia. Este prototipo no incluye datos económicos reales.</p>
      </section>
    </main>
  )
}
