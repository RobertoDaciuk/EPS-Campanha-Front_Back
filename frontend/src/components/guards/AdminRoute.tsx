/**
 * @file components/guards/AdminRoute.tsx
 * @version 2.0.0
 * @description Guard para rotas de administrador
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import LoadingScreen from '@/components/ui/LoadingScreen'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Verificando permissões..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== UserRole.ADMIN) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default AdminRoute
