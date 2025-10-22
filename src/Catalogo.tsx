import React, { useEffect, useState } from 'react'
import './App.css'

type Category = {
  id: string
  title: string
  img: string
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

function fetchWithTimeout(url: string, ms = 3000) {
  return Promise.race([
    fetch(url).then((r) => {
      if (!r.ok) throw new Error('bad response')
      return r.json()
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ])
}

export default function Catalogo() {
  const [selected, setSelected] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [breeds, setBreeds] = useState<Record<string, string[]>>(DEFAULT_BREEDS)

  useEffect(() => {
    let mounted = true
    // Imaginary API endpoints
    const categoriesUrl = 'http://localhost:4000/api/categories'
    const breedsUrl = 'http://localhost:4000/api/breeds'

    // Try fetch categories
    fetchWithTimeout(categoriesUrl, 3000)
      .then((data: any) => {
        if (!mounted) return
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => {
        // keep defaults on error
      })

    // Try fetch breeds mapping
    fetchWithTimeout(breedsUrl, 3000)
      .then((data: any) => {
        if (!mounted) return
        if (data && typeof data === 'object') setBreeds(data)
      })
      .catch(() => {
        // keep defaults on error
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
