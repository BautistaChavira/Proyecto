import './App.css'
import { useState } from 'react'
import Home from './Home'
import Catalogo from './Catalogo'
import Curiosidades from './Curiosidades'
import MisMascotas from './MisMascotas'
import ConsultaFoto from './ConsultaFoto'
import Login from './Login'


function App() {
  const [user, setUser] = useState<{ id: number; name: string } | null>(null)
  const [page, setPage] = useState<'home' | 'catalogo' | 'curiosidades' | 'mis-mascotas' | 'consulta-foto'>('home')
  const [showLogin, setShowLogin] = useState(false)

return (
  <>
  <img src="/huella-left.png" className="huella izquierda" alt="Huella izquierda" />
  <img src="/huella-right.png" className="huella derecha" alt="Huella derecha" />

  <nav className="navbar">
    {/* ... */}
  </nav>

  <div className="app-body">
    {/* ... */}
  </div>
    <nav className="navbar">
      <div className="nav-section">
        <button className="nav-link" onClick={() => setPage('home')}>Home</button>
        <button className="nav-link" onClick={() => setPage('catalogo')}>Catálogo</button>
        <button className="nav-link" onClick={() => setPage('curiosidades')}>Curiosidades</button>
        <button className="nav-link" onClick={() => setPage('mis-mascotas')}>Mis Mascotas</button>
        <button className="nav-link" onClick={() => setPage('consulta-foto')}>Consulta por Foto</button>
      </div>
      <div className="nav-section">
        <button
          className="login-button"
          aria-label="Iniciar sesión"
          onClick={() => setShowLogin(true)}
        >
          <img src="/loginicon.jpg" alt="Usuario" className="user-icon" />
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

    <div className="app-body">
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onLogin={(u) => setUser(u)}
        />
      )}
      {page === 'home' && <Home onNavigate={(target) => setPage(target)} />}
      {page === 'catalogo' && <Catalogo />}
      {page === 'curiosidades' && <Curiosidades />}
      {page === 'mis-mascotas' && (
        <MisMascotas
          user={user}
          onGoToConsulta={() => setPage('consulta-foto')}
        />
      )}
      {page === 'consulta-foto' && <ConsultaFoto user={user} />}
    </div>
  </>
)
}
export default App
