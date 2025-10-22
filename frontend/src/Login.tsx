import React, { useState } from 'react'
import './App.css'

type Props = {
  onClose: () => void
  onLogin: (user: { name: string }) => void
}

export default function Login({ onClose, onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!username) {
      setMessage('Introduce un nombre de usuario')
      return
    }
    // Simulate successful login
    onLogin({ name: username })
    onClose()
  }

  function submitRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      setMessage('Rellena usuario y contraseña')
      return
    }
    // Simulate registration success -> auto login
    onLogin({ name: username })
    onClose()
  }

  function submitRecover(e: React.FormEvent) {
    e.preventDefault()
    if (!username) {
      setMessage('Introduce tu nombre de usuario o email')
      return
    }
    // Simulate recovery
    setMessage('Si existe la cuenta, se ha enviado un correo de recuperación (simulado).')
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
              <button type="submit" className="primary-button">Entrar</button>
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
              <button type="submit" className="primary-button">Crear cuenta</button>
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
              <button type="submit" className="primary-button">Enviar</button>
              <button type="button" className="link-button" onClick={() => setMode('login')}>Volver</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
