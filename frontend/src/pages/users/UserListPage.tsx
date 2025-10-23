/**
 * @file pages/users/UserListPage.tsx
 * @version 2.0.0
 * @description Página de listagem de usuários
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  FilterIcon, 
  UsersIcon, 
  EyeIcon,
  EditIcon,
  BlockIcon,
  CheckIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/ui/DataTable'
import { userService } from '@/services/userService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { User, UserFilters, UserRole, UserStatus, TableColumn } from '@/types'
import { formatDate, formatCPF, getErrorMessage } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import StatusBadge from '@/components/ui/StatusBadge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const UserListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20,
    sort: 'createdAt',
    order: 'desc',
  })

  // Query para listar usuários
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => userService.getUsers(filters),
  })

  // Stats query
  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userService.getUserStats(),
    enabled: user?.role === UserRole.ADMIN,
  })

  // Mutation para alterar status
  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) => 
      userService.updateUserStatus(userId, { status, reason: 'Alterado via interface' }),
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort: column, order: direction }))
  }

  const handleToggleStatus = (userId: string, currentStatus: UserStatus) => {
    const newStatus = currentStatus === UserStatus.ACTIVE ? UserStatus.BLOCKED : UserStatus.ACTIVE
    updateStatusMutation.mutate({ userId, status: newStatus })
  }

  // Definição das colunas
  const columns: TableColumn<User>[] = [
    {
      key: 'user',
      label: 'Usuário',
      render: (user) => (
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback name={user.name} />
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Perfil',
      sortable: true,
      render: (user) => (
        <Badge variant="outline">
          {user.role === UserRole.ADMIN && '👑 Admin'}
          {user.role === UserRole.GERENTE && '👔 Gerente'}
          {user.role === UserRole.VENDEDOR && '👤 Vendedor'}
        </Badge>
      ),
    },
    {
      key: 'opticName',
      label: 'Ótica',
      render: (user) => (
        <div>
          <p className="text-sm font-medium">{user.opticName}</p>
          <p className="text-xs text-gray-500 font-mono">{formatCPF(user.cpf)}</p>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Nível',
      render: (user) => (
        <div className="text-center">
          <Badge variant={user.level.toLowerCase() as any}>{user.level}</Badge>
          <p className="text-xs text-gray-500 mt-1">{user.points} pts</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user) => (
        <StatusBadge status={user.status} type="user" />
      ),
    },
    {
      key: 'createdAt',
      label: 'Cadastro',
      sortable: true,
      render: (user) => (
        <span className="text-sm">{formatDate(user.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (user) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/app/users/${user.id}`)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          
          {user.role !== UserRole.ADMIN && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(user.id, user.status)}
              disabled={updateStatusMutation.isPending}
            >
              {user.status === UserStatus.ACTIVE ? (
                <BlockIcon className="w-4 h-4" />
              ) : (
                <CheckIcon className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      ),
    },
  ]

  const users = usersResponse?.data || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">
            {user?.role === UserRole.ADMIN 
              ? 'Gerencie todos os usuários do sistema'
              : 'Gerencie sua equipe de vendedores'
            }
          </p>
        </div>

        {user?.role === UserRole.ADMIN && (
          <Button asChild>
            <Link to="/app/users/create">
              <PlusIcon className="w-4 h-4 mr-2" />
              Novo Usuário
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {userStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-xl font-bold text-blue-600">
                    {userStats.stats.total || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Ativos</p>
                  <p className="text-xl font-bold text-green-600">
                    {userStats.stats.active || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Vendedores</p>
                  <p className="text-xl font-bold text-purple-600">
                    {userStats.stats.sellers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Gerentes</p>
                  <p className="text-xl font-bold text-orange-600">
                    {userStats.stats.managers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou email..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.role || 'all'}
                onChange={(e) => handleFilterChange('role', e.target.value === 'all' ? undefined : e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-eps-500"
              >
                <option value="all">Todos os perfis</option>
                <option value="VENDEDOR">Vendedores</option>
                <option value="GERENTE">Gerentes</option>
                {user?.role === UserRole.ADMIN && (
                  <option value="ADMIN">Administradores</option>
                )}
              </select>

              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-eps-500"
              >
                <option value="all">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="BLOCKED">Bloqueados</option>
              </select>

              <Button variant="outline" size="sm">
                <FilterIcon className="w-4 h-4 mr-2" />
                Mais Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={users}
            columns={columns}
            loading={isLoading}
            pagination={usersResponse?.pagination}
            onPageChange={handlePageChange}
            onSort={handleSort}
            currentSort={{ column: filters.sort!, direction: filters.order! }}
            emptyMessage="Nenhum usuário encontrado"
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default UserListPage
