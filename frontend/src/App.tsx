import './App.css'
import { useState } from 'react'
import Home from './Home'
import Catalogo from './Catalogo'
import Curiosidades from './Curiosidades'
import MisMascotas from './MisMascotas'
import ConsultaFoto from './ConsultaFoto'
import Login from './Login'

function App() {
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [page, setPage] = useState<'home' | 'catalogo' | 'curiosidades' | 'mis-mascotas' | 'consulta-foto'>('home')
  const [showLogin, setShowLogin] = useState(false)
  return (
    <>
      <nav className="navbar">
        <div className="nav-section">
          <button className="nav-link" onClick={() => setPage('home')}>Home</button>
          <button className="nav-link" onClick={() => setPage('catalogo')}>Catálogo</button>
          <button className="nav-link" onClick={() => setPage('curiosidades')}>Curiosidades</button>
          <button className="nav-link" onClick={() => setPage('mis-mascotas')}>Mis Mascotas</button>
          <button className="nav-link" onClick={() => setPage('consulta-foto')}>Consulta por Foto</button>
        </div>
        <div className="nav-section">
          {/* Login: open modal */}
          <button
            className="login-button"
            aria-label="Iniciar sesión"
            onClick={() => setShowLogin(true)}
          >
            <span className="material-icons">person</span>
          </button>
          <button
            className="login-text"
            onClick={() => setShowLogin(true)}
            aria-pressed={!!user}
          >
            {user ? user.name : 'Iniciar sesión'}
          </button>
        </div>
      </nav>
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onLogin={(u) => setUser(u)}
        />
      )}
      {page === 'home' && <Home />}
      {page === 'catalogo' && <Catalogo />}
      {page === 'curiosidades' && <Curiosidades />}
  {page === 'mis-mascotas' && <MisMascotas onGoToConsulta={() => setPage('consulta-foto')} />}
      {page === 'consulta-foto' && <ConsultaFoto />}
    </>
  )
}

export default App
