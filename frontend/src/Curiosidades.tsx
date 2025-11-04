import { useEffect, useState } from 'react'
import './App.css'
import './Curiosidades.css'
import { API_URLS } from './config'

type Curiosidad = {
  id: number
  title: string
  content: string
  image_url: string
  visible: boolean
  created_at: string
}

export default function Curiosidades() {
  const [curiosidades, setCuriosidades] = useState<Curiosidad[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(API_URLS.curiosidades)
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar curiosidades')
        return res.json()
      })
      .then(data => {
        setCuriosidades(Array.isArray(data) ? data : [])
        setError(null)
      })
      .catch(err => {
        console.error('[Curiosidades] Error al cargar curiosidades:', err)
        setError('No se pudieron cargar las curiosidades.')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="curio-content">
      <section className="curio-cards">
        <article className="curio-card-large">
          <div className="curio-card-inner">
            <div className="curio-card-text">
              <h2>Curiosidades</h2>
              <p>Aquí encontrarás curiosidades sobre mascotas, datos interesantes y artículos cortos.</p>
            </div>
          </div>
        </article>

        {loading && <p className="curio-loading">Cargando curiosidades...</p>}
        {error && <p className="curio-error">{error}</p>}

        {!loading && !error && curiosidades.map(c => (
          <article key={c.id} className="curio-card">
            <div className="curio-card-inner">
              <img src={c.image_url} alt={c.title} className="curio-card-image" />
              <div className="curio-card-text">
                <h3>{c.title}</h3>
                <p>{c.content}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}