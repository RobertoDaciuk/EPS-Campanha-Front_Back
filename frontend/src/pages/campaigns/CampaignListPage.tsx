/**
 * @file pages/campaigns/CampaignListPage.tsx
 * @version 2.0.0
 * @description Página de listagem de campanhas
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
  TargetIcon, 
  CalendarIcon, 
  TrophyIcon,
  EditIcon,
  EyeIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { campaignService } from '@/services/campaignService'
import { useAuth } from '@/hooks/useAuth'
import { Campaign, CampaignFilters, UserRole } from '@/types'
import { formatDate, formatNumber } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/ui/StatusBadge'

const CampaignListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filters, setFilters] = useState<CampaignFilters>({
    page: 1,
    limit: 12,
    sort: 'createdAt',
    order: 'desc',
  })

  const { data: campaignsResponse, isLoading } = useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => campaignService.getCampaigns(filters),
  })

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }))
  }

  const handleFilterChange = (key: keyof CampaignFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  if (isLoading) {
    return <LoadingScreen message="Carregando campanhas..." />
  }

  const campaigns = campaignsResponse?.data || []
  const pagination = campaignsResponse?.pagination

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-gray-600">
            Gerencie e acompanhe suas campanhas de incentivo
          </p>
        </div>

        {user?.role === UserRole.ADMIN && (
          <Button asChild>
            <Link to="/app/campaigns/create">
              <PlusIcon className="w-4 h-4 mr-2" />
              Nova Campanha
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar campanhas..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-eps-500"
              >
                <option value="all">Todos os status</option>
                <option value="ATIVA">Ativas</option>
                <option value="CONCLUIDA">Concluídas</option>
                <option value="EXPIRADA">Expiradas</option>
              </select>

              <Button variant="outline" size="sm">
                <FilterIcon className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Grid */}
      {campaigns.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CampaignCard 
                  campaign={campaign} 
                  userRole={user?.role}
                  onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
                />
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', filters.page! - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Anterior
                </Button>
                
                <span className="text-sm text-gray-600">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', filters.page! + 1)}
                  disabled={!pagination.hasNext}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<TargetIcon className="w-16 h-16" />}
          title="Nenhuma campanha encontrada"
          description="Não foram encontradas campanhas com os filtros aplicados"
          action={user?.role === UserRole.ADMIN ? {
            label: 'Criar primeira campanha',
            onClick: () => navigate('/app/campaigns/create')
          } : undefined}
        />
      )}
    </motion.div>
  )
}

// Componente de card de campanha
interface CampaignCardProps {
  campaign: Campaign
  userRole?: UserRole
  onClick: () => void
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, userRole, onClick }) => {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <div className="relative">
        <img
          src={campaign.imageUrl}
          alt={campaign.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <div className="absolute top-3 right-3">
          <StatusBadge status={campaign.status} type="campaign" />
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{campaign.title}</CardTitle>
          {userRole === UserRole.ADMIN && (
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <EditIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 line-clamp-3">
          {campaign.description}
        </p>

        {/* Datas */}
        <div className="flex items-center text-xs text-gray-500">
          <CalendarIcon className="w-4 h-4 mr-1" />
          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
        </div>

        {/* Pontos */}
        {campaign.pointsOnCompletion && (
          <div className="flex items-center text-sm">
            <TrophyIcon className="w-4 h-4 mr-2 text-yellow-500" />
            <span className="font-medium text-yellow-700">
              {formatNumber(campaign.pointsOnCompletion)} pontos
            </span>
          </div>
        )}

        {/* Progress (se disponível) */}
        {campaign.userProgress !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progresso</span>
              <span>{campaign.userProgress}%</span>
            </div>
            <Progress value={campaign.userProgress} variant="success" />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-gray-500">
            {campaign.goalRequirements?.length || 0} requisitos
          </div>
          <Button variant="ghost" size="sm">
            <EyeIcon className="w-4 h-4 mr-1" />
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default CampaignListPage
