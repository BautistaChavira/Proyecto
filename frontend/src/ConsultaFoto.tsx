import React, { useRef, useState } from 'react'
import './App.css'
import { API_URLS, fetchWithTimeout } from './config'

export default function ConsultaFoto() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onPick() {
    inputRef.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setAnalysis(null)
    setLoading(true)

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        setPreview(base64)

        // Enviar imagen al backend para análisis
        const res = await fetchWithTimeout(API_URLS.analyzePhoto, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64 }),
        })

        const { result, confidence } = res as { result: string; confidence?: number }
        setAnalysis(`${result}${confidence ? ` (confianza: ${(confidence * 100).toFixed(1)}%)` : ''}`)
      }

      reader.readAsDataURL(file)
    } catch (err) {
      setError('Error al analizar la imagen')
      console.error(err)
    } finally {
      setLoading(false)
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
                  <h3>Vista previa</h3>
                  <img className="preview-image" src={preview} alt="Preview" />
                </div>
              )}

              {analysis && (
                <div className="analysis-result">
                  <h3>Resultado de la IA</h3>
                  <p>{analysis}</p>
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
