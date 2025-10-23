/**
 * @file components/layouts/Header.tsx
 * @version 2.0.0
 * @description Header principal para usuários autenticados
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { 
  MenuIcon, 
  BellIcon, 
  SearchIcon,
  LogOutIcon,
  UserIcon,
  SettingsIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { User, UserRole } from '@/types'
import { formatNumber } from '@/lib/utils'

interface HeaderProps {
  onMenuClick: () => void
  user: User | null
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, user }) => {
  const { logout } = useAuth()
  const { notifications, unreadCount } = useNotifications()

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Menu button (mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <MenuIcon className="w-5 h-5" />
          </Button>

          {/* Search bar */}
          <div className="hidden sm:block relative max-w-md w-full">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar campanhas, prêmios..."
              className="pl-10 pr-4 w-full"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Pontos do usuário (se não for admin) */}
          {user && user.role !== UserRole.ADMIN && (
            <div className="hidden sm:flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatNumber(user.points)} pontos
                </p>
                <p className="text-xs text-gray-500">
                  Nível {user.level}
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-eps rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {user.points >= 10000 ? '💎' : 
                   user.points >= 5000 ? '🏆' : 
                   user.points >= 2500 ? '🥇' : 
                   user.points >= 1000 ? '🥈' : '🥉'}
                </span>
              </div>
            </div>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="font-semibold">
                Notificações
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {notifications.length > 0 ? (
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex flex-col items-start space-y-1 p-3",
                        !notification.isRead && "bg-eps-50"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">{notification.title}</span>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-eps-600 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  Nenhuma notificação
                </div>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center font-medium text-eps-600">
                Ver todas as notificações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback name={user?.name} />
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link to="/app/profile" className="flex items-center">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleLogout}>
                <LogOutIcon className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Header
