import './App.css'
import { useEffect, useState } from 'react'
import { API_URLS } from './config'
import './MisMascotas.css'

type Pet = {
  id: number
  name: string
  breed: string
  description: string
}

type Props = {
  onGoToConsulta: () => void
  user: { id: number; name: string } | null
}

export default function MisMascotas({ onGoToConsulta, user }: Props) {
  const [mascotas, setMascotas] = useState<Pet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setError('Debes iniciar sesión para ver tus mascotas')
      return
    }

    setLoading(true)
    fetch(`${API_URLS.pets}?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setMascotas(data.pets || [])
        setError(null)
      })
      .catch(err => {
        console.error('[MisMascotas] Error al cargar mascotas:', err)
        setError('No se pudieron cargar tus mascotas')
      })
      .finally(() => setLoading(false))
  }, [user])

  return (
    <main className="content">
      <section className="cards">
        <article className="card-large">
  <div className="card-inner">
    <div className="card-text">
      <h2>Mis Mascotas</h2>
      {loading && <p>Cargando mascotas...</p>}
      {error && <p className="error-message">{error}</p>}
      {!loading && mascotas.length === 0 && !error && <p>No tienes mascotas guardadas aún.</p>}
    </div>
  </div>
</article>

<div className="pet-grid">
  {mascotas.map(pet => (
    <article key={pet.id} className="pet-card">
      <h3>{pet.name}</h3>
      <p><strong>Raza:</strong> {pet.breed}</p>
      <p><strong>Descripción:</strong> {pet.description || 'Sin descripción'}</p>
    </article>
  ))}
</div>

        <div style={{ width: '90%', maxWidth: 1100, display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="primary-button" onClick={onGoToConsulta}>Ir a Consulta por Foto</button>
        </div>
      </section>
    </main>
  )
}