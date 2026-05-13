import { useIntl } from 'react-intl'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Board } from './components/Board'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

function AppContent() {
  const { loading, isAuthenticated } = useAuth()
  const intl = useIntl()

  if (loading) {
    return <div className="app-loading">{intl.formatMessage({ id: 'app.loading' })}</div>
  }

  return (
    <div className="app-layout">
      {isAuthenticated && <Header />}
      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Board />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {isAuthenticated && <Footer />}
    </div>
  )
}

export function App() {
  const intl = useIntl()
  return (
    <ErrorBoundary intl={intl}>
      <AppContent />
    </ErrorBoundary>
  )
}
