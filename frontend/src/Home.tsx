import './App.css'

type Props = {
  onNavigate: (page: 'catalogo' | 'curiosidades' | 'mis-mascotas') => void
}

export default function Home({ onNavigate }: Props) {
  return (
    <main className="content">
      <section className="cards">
        <article className="card-large">
          <div className="card-inner">
            <img className="card-image" src="https://tse2.mm.bing.net/th/id/OIP._TaIGWEpnTUKbakVwDJMMwHaEK?rs=1&pid=ImgDetMain&o=7&rm=3" alt="Destacado" />
            <div className="card-text">
              <h2>Tour Rápido</h2>
              <p>Esta página sirve para facilitar el cuidado de las mascotas. Con el uso de inteligencia artifical podemos ayudarte a identificar la raza de tu mascota.<br/>
                También tenemos datos sobre múltiples razas de perros y gatos para ayudarte a cuidar de tu mascota.</p>
            </div>
          </div>
        </article>

        <article className="card-large" onClick={() => onNavigate('catalogo')} style={{ cursor: 'pointer' }}>
          <div className="card-inner">
            <img className="card-image" src="https://tse4.mm.bing.net/th/id/OIP.2UKTmm4Lzd-gk9mi6KzyKAHaEK?rs=1&pid=ImgDetMain&o=7&rm=3" alt="Catálogo recomendado" />
            <div className="card-text">
              <h2>Almanaque de razas</h2>
              <p>Muestra de todos los tipos y razas de mascotas que tenemos registrados con datos varios y consejos para su cuidado.</p>
            </div>
          </div>
        </article>

        <article className="card-large" onClick={() => onNavigate('curiosidades')} style={{ cursor: 'pointer' }}>
          <div className="card-inner">
            <img className="card-image" src="https://img.freepik.com/fotos-premium/gato-tratando-colarse-pegatinas-signo-interrogacion_96270-405.jpg" alt="Curiosidades" />
            <div className="card-text">
              <h2>Curiosidades</h2>
              <p>Dato curioso del día sobre mascotas. Estos recuadros se apilan en columna y son fácilmente desplazables.</p>
            </div>
          </div>
        </article>

        <article className="card-large" onClick={() => onNavigate('mis-mascotas')} style={{ cursor: 'pointer' }}>
          <div className="card-inner">
            <img className="card-image" src="https://tse1.mm.bing.net/th/id/OIP.UA9dXRB-wqqH_w61gjvl8gHaHa?rs=1&pid=ImgDetMain&o=7&rm=3" alt="Mis Mascotas" />
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
