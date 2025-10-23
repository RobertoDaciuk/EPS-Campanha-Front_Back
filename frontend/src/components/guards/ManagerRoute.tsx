/**
 * @file components/guards/ManagerRoute.tsx
 * @version 2.0.0
 * @description Guard para rotas de gerente e admin
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import LoadingScreen from '@/components/ui/LoadingScreen'

interface ManagerRouteProps {
  children: React.ReactNode
}

const ManagerRoute: React.FC<ManagerRouteProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Verificando permissões..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role === UserRole.VENDEDOR) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default ManagerRoute
