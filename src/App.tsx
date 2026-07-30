import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SetupPage } from './pages/SetupPage'
import { LoadsPage } from './pages/LoadsPage'
import { NewLoadPage } from './pages/NewLoadPage'
import { LoadDetailPage } from './pages/LoadDetailPage'
import { CustomersPage } from './pages/CustomersPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { QuotesPage } from './pages/QuotesPage'
import { PublicLoadRequestPage } from './pages/PublicLoadRequestPage'

function LoadingScreen() {
  return <div className="loading-screen"><div className="loading-mark">L</div><span>Loading Command Center...</span></div>
}

function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!user.setupComplete) return <Navigate to="/setup" replace />
  return <AppShell><Outlet /></AppShell>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/request-load" element={<PublicLoadRequestPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="loads" element={<LoadsPage />} />
        <Route path="loads/new" element={<NewLoadPage />} />
        <Route path="loads/:id" element={<LoadDetailPage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="drivers" element={<PlaceholderPage />} />
        <Route path="vehicles" element={<PlaceholderPage />} />
        <Route path="communications" element={<PlaceholderPage />} />
        <Route path="expenses" element={<PlaceholderPage />} />
        <Route path="invoices" element={<PlaceholderPage />} />
        <Route path="reports" element={<PlaceholderPage />} />
        <Route path="settings" element={<PlaceholderPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
