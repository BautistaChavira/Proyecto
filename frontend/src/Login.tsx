import React, { useState } from 'react'
import './App.css'
import { API_URLS, fetchWithTimeout } from './config'

type Props = {
  onClose: () => void
  onLogin: (user: { name: string }) => void
}

export default function Login({ onClose, onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function sha256Hex(str: string): Promise<string> {
    const enc = new TextEncoder()
    const data = enc.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!username || !password) {
      setMessage('Introduce usuario y contraseña')
      return
    }

    setLoading(true)
    try {
      const clientHash = await sha256Hex(password)

      const res = await fetchWithTimeout(API_URLS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password_hash_client: clientHash }),
      })

      const user = (res as unknown) as { name: string }
      if (!user || !user.name) throw new Error('Respuesta inválida del servidor')

      onLogin(user)
      onClose()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!username || !password) {
      setMessage('Rellena usuario y contraseña')
      return
    }

    setLoading(true)
    try {
      const clientHash = await sha256Hex(password)

      const res = await fetchWithTimeout(API_URLS.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password_hash_client: clientHash }),
      })

      const user = (res as unknown) as { name: string }
      if (!user || !user.name) throw new Error('Respuesta inválida del servidor')

      onLogin(user)
      onClose()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al registrar usuario')
    } finally {
      setLoading(false)
    }
  }

  async function submitRecover(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!username) {
      setMessage('Introduce tu nombre de usuario o email')
      return
    }

    setLoading(true)
    try {
      await fetchWithTimeout(API_URLS.recover, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      setMessage('Si existe la cuenta, recibirás un email con instrucciones.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al procesar la recuperación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>{mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Registro' : 'Recuperar contraseña'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {message && <div className="modal-message">{message}</div>}

        {mode === 'login' && (
          <form onSubmit={submitLogin} className="modal-form">
            <label className="form-row">Nombre de usuario
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="form-row">Contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <div className="modal-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <button type="button" className="link-button" onClick={() => setMode('recover')}>¿Olvidaste la contraseña?</button>
            </div>
            <div style={{ marginTop: 8 }}>
              ¿No tienes cuenta? <button className="link-button" type="button" onClick={() => setMode('register')}>Regístrate</button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={submitRegister} className="modal-form">
            <label className="form-row">Nombre de usuario
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="form-row">Contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <div className="modal-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Creando...' : 'Crear cuenta'}
              </button>
              <button type="button" className="link-button" onClick={() => setMode('login')}>Volver a entrar</button>
            </div>
          </form>
        )}

        {mode === 'recover' && (
          <form onSubmit={submitRecover} className="modal-form">
            <label className="form-row">Usuario o email
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <div className="modal-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
              <button type="button" className="link-button" onClick={() => setMode('login')}>Volver</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}