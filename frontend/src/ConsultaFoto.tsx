import React, { useRef, useState } from 'react'
import './App.css'
import { API_URLS, fetchWithTimeout } from './config'
import './ConsultaFoto.css'


export default function ConsultaFoto({ user }: { user: { id: number; name: string } | null }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [breed, setBreed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [guardado, setGuardado] = useState(false)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [species, setSpecies] = useState<'dog' | 'cat' | null>(null)
  const [petStatusFront, setPetStatus] = useState<'ok' | 'no_aplica' | null>(null)

  function onPick() {
    if (!user) {
      setError('Debes iniciar sesión para subir una foto.')
      return
    }
    inputRef.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setError(null)
    setAnalysis(null)
    setBreed(null)
    setGuardado(false)
    setLoading(true)

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        setPreview(base64)

        const res = await fetchWithTimeout(API_URLS.analyzePhoto, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64 }),
        })

        const {
          result: raza,
          confidence: conf,
          isPet,
          petStatus: petS,
          species: tipo
        } = res as {
          result: string
          confidence?: number
          isPet: boolean
          petStatus: 'ok' | 'no_aplica'
          species?: 'dog' | 'cat' | null
        }


        setBreed(raza)
        setConfidence(conf ?? null)
        setSpecies(tipo ?? null)
        setPetStatus(petS ?? null)

        if (isPet) {
          setAnalysis(`Tu mascota es: ${raza}`)
        } else {
          setAnalysis(`No aplica como mascota (detectado: ${raza})`)
        }
        console.log('[IA] Respuesta completa:', res)


        if (isPet) {
          setAnalysis(`Tu mascota es: ${raza}`)
        } else {
          setAnalysis(`No aplica como mascota (detectado: ${raza})`)
        }
      }

      reader.readAsDataURL(file)
    } catch (err) {
      setError('Error al analizar la imagen')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function guardarMascota() {
    if (!user || !breed || !nombre) {
      setError('Faltan datos para guardar la mascota.')
      return
    }

    try {
      const res = await fetch(API_URLS.savepet, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nombre,
          breed,
          description: descripcion,
          user_id: user.id
        })
      })

      if (res.ok) {
        setGuardado(true)
      } else {
        setError('Error al guardar la mascota.')
      }
    } catch (err) {
      setError('Error de conexión al guardar.')
    }
  }

  return (
    <main className="content">
      <section className="cards">
        <article className="card-large">
          <div className="card-inner">
            <div className="card-text">
              <h2>Consulta por Foto</h2>
              <p>Sube una foto para consultar sobre la especie o raza.</p>
              <div className="upload-area">
                <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
                <button className="primary-button" onClick={onPick} disabled={loading}>
                  {loading ? 'Analizando...' : 'Subir'}
                </button>
              </div>

              {preview && (
  <div className="preview">
    <h3 style={{ color: '#000' }}>Vista previa</h3>
    <img className="preview-image" src={preview} alt="Preview" />
  </div>
)}

{analysis && (
  <div className="analysis-result">
    <h3 style={{ color: '#000' }}>Resultado de la IA</h3>
    <p>{analysis}</p>
    {petStatusFront === 'ok' ? (
      <p><strong>Clasificación:</strong> Sí es una mascota</p>
    ) : petStatusFront === 'no_aplica' ? (
      <p><strong>Clasificación:</strong> No aplica como mascota</p>
    ) : null}

    {confidence !== null && (
      <p><strong>Confianza:</strong> {(confidence * 100).toFixed(1)}%</p>
    )}
    {species && (
      <p><strong>Especie detectada:</strong> {species === 'dog' ? 'Perro' : 'Gato'}</p>
    )}
  </div>
)}

{breed && user && (
  <div className="save-form">
    <h3 style={{ color: '#000' }}>Guardar en Mis Mascotas</h3>
    <input
      type="text"
      placeholder="Nombre de la mascota"
      value={nombre}
      onChange={(e) => setNombre(e.target.value)}
    />
    <textarea
      placeholder="Descripción"
      value={descripcion}
      onChange={(e) => setDescripcion(e.target.value)}
    />
    <button className="primary-button" onClick={guardarMascota}>
      Guardar mascota
    </button>
    {guardado && <p className="success-message">Mascota guardada correctamente</p>}
  </div>
)}


              {error && <div className="error-message">{error}</div>}
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}