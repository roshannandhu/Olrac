import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { isAdminSite } from '../utils/siteMode'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to={isAdminSite ? '/login' : '/dashboard'} replace />
  }

  return children
}
