import './App.css'

type Props = {
  onGoToConsulta: () => void
}

export default function MisMascotas({ onGoToConsulta }: Props) {
  return (
    <main className="content">
      <section className="cards">
        <article className="card-large">
          <div className="card-inner">
            <div className="card-text">
              <h2>Mis Mascotas</h2>
              <p>Aquí se listarán tus mascotas guardadas. Aún no hay contenido.</p>
            </div>
          </div>
        </article>

        <div style={{ width: '90%', maxWidth: 1100, display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="primary-button" onClick={onGoToConsulta}>Ir a Consulta por Foto</button>
        </div>
      </section>
    </main>
  )
}
