import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { isAdminSite } from '../utils/siteMode'
import ForcePasswordChange from './ForcePasswordChange'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading, user } = useAuth()

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to={isAdminSite ? '/login' : '/dashboard'} replace />
  }

  return (
    <>
      {isAdmin && user?.must_change_password && <ForcePasswordChange />}
      {children}
    </>
  )
}
