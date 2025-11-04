import { useEffect, useState } from 'react'
import './App.css'
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
      .then(res => res.json())
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
    <main className="content">
      <section className="cards">
        <article className="card-large">
          <div className="card-inner">
            <div className="card-text">
              <h2>Curiosidades</h2>
              <p>Aquí encontrarás curiosidades sobre mascotas, datos interesantes y artículos cortos.</p>
            </div>
          </div>
        </article>

        {loading && <p>Cargando curiosidades...</p>}
        {error && <p className="error">{error}</p>}

        {curiosidades.map(c => (
          <article key={c.id} className="card">
            <div className="card-inner">
              <img src={c.image_url} alt={c.title} className="card-image" />
              <div className="card-text">
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