import React, { useRef, useState } from 'react'
import './App.css'

export default function ConsultaFoto() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function onPick() {
    inputRef.current?.click()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
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
                <button className="primary-button" onClick={onPick}>Subir</button>
              </div>
              {preview && (
                <div className="preview">
                  <h3>Vista previa</h3>
                  <img className="preview-image" src={preview} alt="Preview" />
                </div>
              )}
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}
