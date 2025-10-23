/**
 * @file pages/earnings/EarningListPage.tsx
 * @version 2.0.0
 * @description Página de listagem de earnings
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  DollarSignIcon, 
  FilterIcon, 
  TrendingUpIcon, 
  CalendarIcon,
  UserIcon,
  CreditCardIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/ui/DataTable'
import { earningService } from '@/services/earningService'
import { useAuth } from '@/hooks/useAuth'
import { Earning, EarningType, UserRole, TableColumn } from '@/types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import StatusBadge from '@/components/ui/StatusBadge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const EarningListPage: React.FC = () => {
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    sort: 'earningDate',
    order: 'desc' as 'asc' | 'desc',
    status: 'all',
    type: 'all',
  })

  // Query baseado no perfil
  const { data: earningsResponse, isLoading } = useQuery({
    queryKey: ['earnings', filters, user?.role],
    queryFn: () => {
      if (user?.role === UserRole.VENDEDOR) {
        return earningService.getMyEarnings(filters)
      }
      return earningService.getEarnings(filters)
    },
  })

  // Summary stats
  const { data: summaryStats } = useQuery({
    queryKey: ['earning-stats', '30d'],
    queryFn: () => earningService.getEarningStats({ period: '30d' }),
  })

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort: column, order: direction }))
  }

  // Definição das colunas
  const columns: TableColumn<Earning>[] = [
    {
      key: 'earningDate',
      label: 'Data',
      sortable: true,
      render: (earning) => (
        <div>
          <p className="text-sm font-medium">{formatDate(earning.earningDate)}</p>
          <p className="text-xs text-gray-500">{formatDateTime(earning.earningDate).split(' ')[1]}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (earning) => (
        <Badge variant={earning.type === EarningType.SELLER ? 'success' : 'default'}>
          {earning.type === EarningType.SELLER ? '👤 Vendedor' : '👔 Gerente'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      label: 'Valor',
      sortable: true,
      render: (earning) => (
        <span className="font-bold text-green-600">
          {formatCurrency(earning.amount)}
        </span>
      ),
    },
    {
      key: 'campaignTitle',
      label: 'Campanha',
      render: (earning) => (
        <div>
          <p className="font-medium text-sm">{earning.campaignTitle}</p>
          {earning.sourceUserName && (
            <p className="text-xs text-gray-500">Vendedor: {earning.sourceUserName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (earning) => (
        <StatusBadge status={earning.status} type="earning" />
      ),
    },
    ...(user?.role !== UserRole.VENDEDOR ? [{
      key: 'userName',
      label: 'Usuário',
      render: (earning: Earning) => (
        <div className="flex items-center space-x-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={earning.userAvatarUrl} />
            <AvatarFallback name={earning.userName} />
          </Avatar>
          <span className="text-sm">{earning.userName}</span>
        </div>
      ),
    }] : []),
    {
      key: 'description',
      label: 'Descrição',
      render: (earning) => (
        <p className="text-sm text-gray-600 line-clamp-2">
          {earning.description || 'Sem descrição'}
        </p>
      ),
    },
  ]

  if (isLoading) {
    return <LoadingScreen message="Carregando earnings..." />
  }

  const earnings = earningsResponse?.data || []
  const pagination = earningsResponse?.pagination

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === UserRole.VENDEDOR ? 'Meus Ganhos' : 'Earnings'}
          </h1>
          <p className="text-gray-600">
            {user?.role === UserRole.VENDEDOR
              ? 'Acompanhe seus ganhos e pagamentos'
              : 'Gerencie ganhos e pagamentos do sistema'
            }
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSignIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pendente</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(summaryStats?.stats?.totalPending || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCardIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pago</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(summaryStats?.stats?.totalPaid || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUpIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Este Mês</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(summaryStats?.stats?.thisMonth || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Último Pagamento</p>
                <p className="text-sm font-bold text-purple-600">
                  {summaryStats?.stats?.lastPayment ? 
                    formatDate(summaryStats.stats.lastPayment) : 
                    'Nenhum'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por campanha ou descrição..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-eps-500"
              >
                <option value="all">Todos os status</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-eps-500"
              >
                <option value="all">Todos os tipos</option>
                <option value="SELLER">Vendedor</option>
                <option value="MANAGER">Gerente</option>
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
            data={earnings}
            columns={columns}
            loading={isLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onSort={handleSort}
            currentSort={{ column: filters.sort, direction: filters.order }}
            emptyMessage="Nenhum earning encontrado"
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default EarningListPage
