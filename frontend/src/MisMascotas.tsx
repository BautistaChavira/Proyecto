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

  function handleDelete(petId: number) {
    if (!user) return
    fetch(`${API_URLS.deletepet}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pet_id: petId,
        user_id: user.id
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al eliminar')
        setMascotas(prev => prev.filter(p => p.id !== petId))
      })
      .catch(err => {
        console.error('[MisMascotas] Error al eliminar mascota:', err)
        setError('No se pudo eliminar la mascota')
      })
  }

return (
  <main className="mismasc-content">
    <section className="mismasc-cards">
      <article className="mismasc-card-large">
        <div className="mismasc-card-inner">
          <div className="mismasc-card-text">
            <h2>Mis Mascotas</h2>
            {loading && <p>Cargando mascotas...</p>}
            {error && <p className="mismasc-error-message">{error}</p>}
            {!loading && mascotas.length === 0 && !error && (
              <p>No tienes mascotas guardadas aún.</p>
            )}
          </div>
        </div>
      </article>

      <div className="mismasc-grid">
        {mascotas.map((pet) => (
          <article key={pet.id} className="mismasc-card">
            <h3>{pet.name}</h3>
            <p><strong>Raza:</strong> {pet.breed}</p>
            <p><strong>Descripción:</strong> {pet.description || 'Sin descripción'}</p>
            <button className="mismasc-danger-button" onClick={() => handleDelete(pet.id)}>
              Eliminar
            </button>
          </article>
        ))}
      </div>

      <div
        style={{
          width: '90%',
          maxWidth: 1100,
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '1rem',
        }}
      >
        <div
  style={{
    width: '90%',
    maxWidth: 1100,
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1rem',
  }}
>
  <button className="mismasc-primary-button" onClick={onGoToConsulta}>
    Ir a Consulta por Foto
  </button>
</div>

      </div>
    </section>
  </main>
)
}