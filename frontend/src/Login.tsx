import React, { useState } from 'react'
import './App.css'
import { API_URLS, fetchWithTimeout } from './config'

type Props = {
  onClose: () => void
  onLogin: (user: { id: number; name: string }) => void
}

export default function Login({ onClose, onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
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

  try {
    setLoading(true)
    const password_hash_client = await sha256Hex(password)

    const response = await fetch(API_URLS.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password_hash_client })
    })

    const data = await response.json()

    if (!response.ok) {
      switch (data.error) {
        case 'missing_fields':
          setMessage('Debes ingresar usuario y contraseña.')
          break
        case 'invalid_username':
          setMessage('El nombre de usuario debe tener entre 3 y 255 caracteres.')
          break
        case 'invalid_password_hash':
          setMessage('La contraseña no tiene el formato esperado.')
          break
        case 'invalid_credentials':
          setMessage('Usuario o contraseña incorrectos.')
          break
        case 'login_failed':
        default:
          setMessage('Error inesperado al iniciar sesión. Intenta de nuevo más tarde.')
          break
      }
      return
    }

    if (!data.id || !data.name) {
      setMessage(data.message || 'Error al iniciar sesión')
      return
    }

    onLogin({ id: data.id, name: data.name })
    onClose()
  } catch (err) {
    console.error('Login error:', err)
    setMessage(err instanceof Error ? err.message : 'Error de red o servidor')
  } finally {
    setLoading(false)
  }
}


  async function submitRegister(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!username || !email || !password) {
      setMessage('Rellena usuario, correo y contraseña')
      return
    }

    try {
      setLoading(true)
      const password_hash_client = await sha256Hex(password)

      const data = await fetchWithTimeout<{ id?: number; name?: string; error?: string }>(API_URLS.register, {
        method: 'POST',
        body: JSON.stringify({ email, password_hash_client, username }),
      })

      if (!data.name) throw new Error('Respuesta inválida del servidor')

      if (!data.id || !data.name) throw new Error('Respuesta inválida del servidor')

      onLogin({ id: data.id, name: data.name })
      onClose()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al registrar usuario')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>
            {mode === 'login'
              ? 'Iniciar sesión'
              : mode === 'register'
                ? 'Registro'
                : ''}
          </h3>
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
            <label className="form-row">Correo electrónico
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
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
      </div>
    </div>
  )

}