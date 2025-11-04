import { useEffect, useState } from 'react'
import './App.css'
import './Catalogo.css'
import { API_URLS, fetchWithTimeout } from './config'

type Category = {
  id: string
  title: string
  img: string
}

type BreedRow = {
  id: number | string
  name: string
  scientific_name?: string
  description?: string
  default_image_url?: string
  category_name?: string
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'Cargando',
    title: '',
    img: 'https://static.vecteezy.com/system/resources/thumbnails/009/261/207/original/loading-circle-icon-loading-gif-loading-screen-gif-loading-spinner-gif-loading-animation-loading-free-video.jpg'
  }
]

export default function Catalogo() {
  const [selected, setSelected] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [breeds, setBreeds] = useState<Record<string, BreedRow[]>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    fetchWithTimeout<any[]>(API_URLS.categories)
      .then((data) => {
        if (!mounted) return
        const transformed: Category[] = data.map((row) => ({
          id: String(row.name).toLowerCase().replace(/\s+/g, '-'),
          title: row.name,
          img:
            row.name.toLowerCase() === 'perros'
              ? '/perrorandom.jpg'
              : row.name.toLowerCase() === 'gatos'
              ? '/gatorandom.jpg'
              : `https://via.placeholder.com/800x400?text=${encodeURIComponent(row.name)}`
        }))
        if (transformed.length > 0) setCategories(transformed)
        setError(null)
      })
      .catch((error) => {
        console.warn('Error fetching categories:', error)
        setError('No se pudieron cargar las categorías del servidor. Mostrando datos por defecto.')
      })

    fetchWithTimeout<BreedRow[]>(API_URLS.breeds)
      .then((rows) => {
        if (!mounted) return
        const map: Record<string, BreedRow[]> = {}
        for (const r of rows) {
          const cat = (r.category_name || 'unknown').toString().toLowerCase().replace(/\s+/g, '-')
          map[cat] = map[cat] || []
          map[cat].push(r)
        }
        setBreeds(map)
      })
      .catch((error) => {
        console.warn('Error fetching breeds:', error)
        if (!error) {
          setError('No se pudieron cargar las razas del servidor. Mostrando datos por defecto.')
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  if (selected) {
    const items = breeds[selected] || []
    return (
      <main className="catalogo-content">
        <section className="catalogo-cards">
          <div className="catalogo-header">
            <button className="catalogo-back-button" onClick={() => setSelected(null)}>← Volver</button>
            <h2>{selected.charAt(0).toUpperCase() + selected.slice(1)}</h2>
            <div />
          </div>

          <div className="catalogo-grid">
            {items.map((breed) => (
              <article key={breed.id} className="catalogo-item">
                <div className="catalogo-card-inner">
                  <div className="catalogo-image-wrapper">
                    <img
                      className="catalogo-image"
                      src={breed.default_image_url || `https://via.placeholder.com/600x300?text=${encodeURIComponent(breed.name)}`}
                      alt={breed.name}
                    />
                  </div>
                  <div className="catalogo-text">
                    <h3>{breed.name}</h3>
                    <p>{breed.description || 'Sin descripción disponible.'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="catalogo-content">
      <section className="catalogo-cards">
        <h2 className="catalogo-title">Catálogo</h2>
        {error && (
          <div className="catalogo-error">
            {error}
          </div>
        )}
        <div className="catalogo-grid">
          {categories.map((c) => (
            <article key={c.id} className="catalogo-card" onClick={() => setSelected(c.id)}>
              <img className="catalogo-hero" src={c.img} alt={c.title} />
              <div className="catalogo-body">
                <h3>{c.title}</h3>
                <p>Explora especies y razas que tenemos registradas en nuestra base de datos {c.title}.</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}