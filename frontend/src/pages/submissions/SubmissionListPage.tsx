/**
 * @file pages/submissions/SubmissionListPage.tsx
 * @version 2.0.0
 * @description Página de listagem de submissões
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  PlusIcon, 
  FilterIcon, 
  ClipboardListIcon, 
  CheckIcon,
  XIcon,
  ClockIcon,
  EyeIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/ui/DataTable'
import { submissionService } from '@/services/submissionService'
import { useAuth } from '@/hooks/useAuth'
import { CampaignSubmission, SubmissionFilters, UserRole, TableColumn } from '@/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import StatusBadge from '@/components/ui/StatusBadge'

const SubmissionListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filters, setFilters] = useState<SubmissionFilters>({
    page: 1,
    limit: 20,
    sort: 'submissionDate',
    order: 'desc',
  })

  // Query baseado no perfil do usuário
  const { data: submissionsResponse, isLoading } = useQuery({
    queryKey: ['submissions', filters, user?.role],
    queryFn: () => {
      if (user?.role === UserRole.VENDEDOR) {
        return submissionService.getMySubmissions(filters)
      }
      return submissionService.getSubmissions(filters)
    },
  })

  const handleFilterChange = (key: keyof SubmissionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort: column, order: direction }))
  }

  // Definição das colunas da tabela
  const columns: TableColumn<CampaignSubmission>[] = [
    {
      key: 'orderNumber',
      label: 'Nº Pedido',
      sortable: true,
      render: (submission) => (
        <div className="font-mono text-sm">
          {submission.orderNumber}
        </div>
      ),
    },
    {
      key: 'campaign',
      label: 'Campanha',
      render: (submission) => (
        <div>
          <p className="font-medium">{submission.campaign?.title || 'N/A'}</p>
          <p className="text-sm text-gray-500">{submission.requirement?.description}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Qtd',
      sortable: true,
      render: (submission) => (
        <span className="font-medium">{submission.quantity}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (submission) => (
        <StatusBadge status={submission.status} type="submission" />
      ),
    },
    {
      key: 'submissionDate',
      label: 'Data',
      sortable: true,
      render: (submission) => (
        <div>
          <p className="text-sm">{formatDate(submission.submissionDate)}</p>
          <p className="text-xs text-gray-500">{formatDateTime(submission.submissionDate).split(' ')[1]}</p>
        </div>
      ),
    },
    ...(user?.role !== UserRole.VENDEDOR ? [{
      key: 'user',
      label: 'Vendedor',
      render: (submission: CampaignSubmission) => (
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium">
              {submission.user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <span className="text-sm">{submission.user?.name || 'N/A'}</span>
        </div>
      ),
    }] : []),
    {
      key: 'actions',
      label: 'Ações',
      render: (submission) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/app/submissions/${submission.id}`)
            }}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) {
    return <LoadingScreen message="Carregando submissões..." />
  }

  const submissions = submissionsResponse?.data || []

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
            {user?.role === UserRole.VENDEDOR ? 'Minhas Vendas' : 'Submissões'}
          </h1>
          <p className="text-gray-600">
            {user?.role === UserRole.VENDEDOR
              ? 'Gerencie suas submissões de vendas'
              : 'Validar e gerenciar submissões de vendas'
            }
          </p>
        </div>

        <Button asChild>
          <Link to="/app/submissions/create">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Submissão
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total"
          value={submissions.length}
          icon={<ClipboardListIcon className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Validadas"
          value={submissions.filter(s => s.status === 'VALIDATED').length}
          icon={<CheckIcon className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Pendentes"
          value={submissions.filter(s => s.status === 'PENDING').length}
          icon={<ClockIcon className="w-5 h-5" />}
          color="yellow"
        />
        <StatsCard
          title="Rejeitadas"
          value={submissions.filter(s => s.status === 'REJECTED').length}
          icon={<XIcon className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nº do pedido..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-eps-500"
              >
                <option value="all">Todos os status</option>
                <option value="PENDING">Pendentes</option>
                <option value="VALIDATED">Validadas</option>
                <option value="REJECTED">Rejeitadas</option>
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
            data={submissions}
            columns={columns}
            loading={isLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onSort={handleSort}
            currentSort={{ column: filters.sort!, direction: filters.order! }}
            emptyMessage="Nenhuma submissão encontrada"
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Componente auxiliar para cards de estatísticas
interface StatsCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red'
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SubmissionListPage
