import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { useAuth } from './auth/AuthContext'
import { DashboardLayout } from './components/DashboardLayout'
import { placeholderPaths } from './navigation'
import { ApiDocsPage } from './pages/ApiDocsPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { RolesPage } from './pages/RolesPage'
import { StaffPage } from './pages/StaffPage'

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page">
        <p className="font-sans text-body text-muted">Loading…</p>
      </main>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings/profile" element={<ProfilePage />} />
          <Route path="/settings/staff" element={<StaffPage />} />
          <Route path="/settings/roles" element={<RolesPage />} />
          <Route path="/sales/companies" element={<CompaniesPage />} />
          {placeholderPaths().map((path) => (
            <Route key={path} path={path} element={<PlaceholderPage />} />
          ))}
          <Route path="*" element={<PlaceholderPage />} />
        </Route>
        <Route path="/docs" element={<ApiDocsPage />} />
      </Route>
    </Routes>
  )
}
