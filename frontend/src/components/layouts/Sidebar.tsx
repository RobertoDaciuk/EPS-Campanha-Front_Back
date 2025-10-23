/**
 * @file components/layouts/Sidebar.tsx
 * @version 2.0.0
 * @description Componente Sidebar de navegação
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  HomeIcon, 
  TargetIcon, 
  GiftIcon, 
  ClipboardListIcon, 
  UsersIcon,
  DollarSignIcon,
  FileSpreadsheetIcon,
  UserIcon,
  XIcon
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface SidebarProps {
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const location = useLocation()
  const { user } = useAuth()

  // Configuração de navegação baseada no perfil
  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: '/app/dashboard',
        icon: HomeIcon,
        roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.VENDEDOR],
      },
      {
        name: 'Campanhas',
        href: '/app/campaigns',
        icon: TargetIcon,
        roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.VENDEDOR],
      },
      {
        name: 'Prêmios',
        href: '/app/premios',
        icon: GiftIcon,
        roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.VENDEDOR],
      },
      {
        name: 'Minhas Vendas',
        href: '/app/submissions',
        icon: ClipboardListIcon,
        roles: [UserRole.VENDEDOR],
      },
      {
        name: 'Submissões',
        href: '/app/submissions',
        icon: ClipboardListIcon,
        roles: [UserRole.ADMIN, UserRole.GERENTE],
      },
      {
        name: 'Earnings',
        href: '/app/earnings',
        icon: DollarSignIcon,
        roles: [UserRole.ADMIN, UserRole.GERENTE, UserRole.VENDEDOR],
      },
      {
        name: 'Usuários',
        href: '/app/users',
        icon: UsersIcon,
        roles: [UserRole.ADMIN, UserRole.GERENTE],
      },
      {
        name: 'Validação',
        href: '/app/validation',
        icon: FileSpreadsheetIcon,
        roles: [UserRole.ADMIN, UserRole.GERENTE],
      },
    ]

    return baseItems.filter(item => user && item.roles.includes(user.role))
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-sm">
      {/* Header do sidebar */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-eps-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">EPS Campanhas</h1>
        </div>
        
        {/* Botão de fechar (mobile) */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Perfil do usuário */}
      {user && (
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback name={user.name} />
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.role === UserRole.ADMIN && 'Administrador'}
                {user.role === UserRole.GERENTE && 'Gerente'}
                {user.role === UserRole.VENDEDOR && 'Vendedor'}
              </p>
            </div>
          </div>
          
          {/* Pontos e nível (se não for admin) */}
          {user.role !== UserRole.ADMIN && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Nível {user.level}</span>
                <span className="font-medium text-eps-600">{user.points} pts</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className="bg-eps-600 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(user.points / user.pointsToNextLevel) * 100}%` 
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navegação principal */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navigationItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href)
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 relative",
                isActive
                  ? "bg-eps-100 text-eps-900 border-r-2 border-eps-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {/* Indicador ativo */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-eps-600 rounded-r-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              <item.icon
                className={cn(
                  "flex-shrink-0 w-5 h-5 mr-3 transition-colors",
                  isActive 
                    ? "text-eps-600" 
                    : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              
              <span className="truncate">{item.name}</span>
              
              {/* Contador de notificações (exemplo para futuro) */}
              {item.name === 'Dashboard' && (
                <span className="ml-auto bg-eps-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer do sidebar */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>v2.0.0</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
