import { useEffect, useState } from 'react'
import './App.css'

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
  { id: 'perros', title: 'Perros', img: 'https://via.placeholder.com/800x400?text=Perros' },
  { id: 'gatos', title: 'Gatos', img: 'https://via.placeholder.com/800x400?text=Gatos' },
  { id: 'aves', title: 'Aves', img: 'https://via.placeholder.com/800x400?text=Aves' },
]

const DEFAULT_BREEDS: Record<string, string[]> = {
  perros: ['Labrador', 'Pastor Alemán', 'Bulldog', 'Beagle'],
  gatos: ['Siamés', 'Persa', 'Maine Coon', 'Bengala'],
  aves: ['Canario', 'Periquito', 'Cacatúa'],
}

import { API_URLS, fetchWithTimeout } from './config'

export default function Catalogo() {
  const [selected, setSelected] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [breeds, setBreeds] = useState<Record<string, string[]>>(DEFAULT_BREEDS)

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true

    // Fetch categories (transform DB rows into Category[] expected by UI)
    fetchWithTimeout<any[]>(API_URLS.categories)
      .then((data) => {
        if (!mounted) return
        // transform: use category name as id (slugified) and create a placeholder image
        const transformed: Category[] = data.map((row) => ({
          id: String(row.name).toLowerCase().replace(/\s+/g, '-'),
          title: row.name,
          img: `https://via.placeholder.com/800x400?text=${encodeURIComponent(row.name)}`,
        }))
        if (transformed.length > 0) setCategories(transformed)
        setError(null) // Limpiar error si existe
      })
      .catch((error) => {
        console.warn('Error fetching categories:', error)
        setError('No se pudieron cargar las categorías del servidor. Mostrando datos por defecto.')
        // keep defaults on error
      })

    // Fetch breeds list from backend and convert to mapping { categoryId: [breedNames] }
    fetchWithTimeout<BreedRow[]>(API_URLS.breeds)
      .then((rows) => {
        if (!mounted) return
        const map: Record<string, string[]> = {}
        for (const r of rows) {
          const cat = (r.category_name || 'unknown').toString().toLowerCase().replace(/\s+/g, '-')
          map[cat] = map[cat] || []
          map[cat].push(r.name)
        }
        // merge with defaults to ensure keys exist for known categories
        const merged = { ...DEFAULT_BREEDS, ...map }
        setBreeds(merged)
      })
      .catch((error) => {
        console.warn('Error fetching breeds:', error)
        // Si ya hay un error de categorías, no sobreescribimos el mensaje
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
      <main className="content">
        <section className="cards">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button className="back-button" onClick={() => setSelected(null)}>← Volver</button>
            <h2 style={{ margin: 0 }}>{selected.charAt(0).toUpperCase() + selected.slice(1)}</h2>
            <div />
          </div>

          <div className="catalog-grid">
            {items.map((breed) => (
              <article key={breed} className="catalog-item">
                <div className="card-inner">
                  <img className="card-image" src={`https://via.placeholder.com/600x300?text=${encodeURIComponent(breed)}`} alt={breed} />
                  <div className="card-text">
                    <h3>{breed}</h3>
                    <p>Breve descripción de la raza {breed}.</p>
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
    <main className="content">
      <section className="cards">
        <h2 style={{ width: '100%', margin: '0 0 1rem 0' }}>Catálogo</h2>
        {error && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            backgroundColor: '#fff3cd', 
            color: '#856404', 
            borderRadius: '4px',
            width: '100%'
          }}>
            {error}
          </div>
        )}
        <div className="catalog-grid">
          {categories.map((c) => (
            <article key={c.id} className="catalog-card" onClick={() => setSelected(c.id)}>
              <img className="catalog-hero" src={c.img} alt={c.title} />
              <div className="catalog-body">
                <h3>{c.title}</h3>
                <p>Explora especies y razas dentro de {c.title}.</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
