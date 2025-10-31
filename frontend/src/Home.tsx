import './App.css'

export default function Home() {
  return (
    <main className="content">
      {/* Sección principal: tarjetas rectangulares apiladas */}
      <section className="cards">
        <article className="card-large">
          <div className="card-inner">
            <img className="card-image" src="https://via.placeholder.com/320x200?text=Destacado" alt="Destacado" />
            <div className="card-text">
              <h2>Destacado</h2>
              <p>Contenido destacado o anuncio importante. Este recuadro ocupa casi todo el ancho disponible y está diseñado para llamar la atención.</p>
            </div>
          </div>
        </article>

        <article className="card-large">
          <div className="card-inner">
            <img className="card-image" src="https://via.placeholder.com/320x200?text=Cat%C3%A1logo" alt="Catálogo recomendado" />
            <div className="card-text">
              <h2>Catálogo recomendado</h2>
              <p>Una breve descripción del catálogo o categoría. En pantallas grandes las tarjetas mantendrán un ancho máximo para mejor lectura.</p>
            </div>
          </div>
        </article>

        <article className="card-large">
          <div className="card-inner">
            <img className="card-image" src="https://via.placeholder.com/320x200?text=Curiosidades" alt="Curiosidades" />
            <div className="card-text">
              <h2>Curiosidades</h2>
              <p>Dato curioso del día sobre mascotas. Estos recuadros se apilan en columna y son fácilmente desplazables.</p>
            </div>
          </div>
        </article>

        <article className="card-large">
          <div className="card-inner">
            <img className="card-image" src="https://via.placeholder.com/320x200?text=Mis+Mascotas" alt="Mis Mascotas" />
            <div className="card-text">
              <h2>Mis Mascotas</h2>
              <p>Acceso rápido a tus mascotas guardadas y su información. Agrega, edita o elimina registros desde aquí.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}
