/**
 * @file pages/dashboard/DashboardPage.tsx
 * @version 2.0.0
 * @description Página principal do dashboard
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  TrophyIcon, 
  TargetIcon, 
  DollarSignIcon, 
  TrendingUpIcon,
  UsersIcon,
  CalendarIcon,
  AwardIcon,
  GiftIcon
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { dashboardService } from '@/services/dashboardService'
import { campaignService } from '@/services/campaignService'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  // Queries
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard', selectedPeriod],
    queryFn: () => dashboardService.getDashboardData({ period: selectedPeriod }),
  })

  const { data: activeCampaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['active-campaigns'],
    queryFn: () => campaignService.getActiveCampaigns(),
  })

  const { data: ranking, isLoading: loadingRanking } = useQuery({
    queryKey: ['ranking'],
    queryFn: () => dashboardService.getRanking({ limit: 10 }),
  })

  if (loadingDashboard) {
    return <LoadingScreen message="Carregando dashboard..." />
  }

  // Componente para stats cards baseado no perfil
  const renderStatsCards = () => {
    if (!dashboardData) return null

    if (user?.role === UserRole.VENDEDOR) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Campanhas Ativas"
            value={dashboardData.campaignsActive || 0}
            icon={<TargetIcon className="w-6 h-6" />}
            color="blue"
          />
          <StatsCard
            title="Vendas do Mês"
            value={dashboardData.submissionsMonth || 0}
            icon={<TrendingUpIcon className="w-6 h-6" />}
            color="green"
          />
          <StatsCard
            title="Pontos do Mês"
            value={formatNumber(dashboardData.pointsMonth || 0)}
            icon={<TrophyIcon className="w-6 h-6" />}
            color="yellow"
          />
          <StatsCard
            title="Posição no Ranking"
            value={`${dashboardData.ranking?.position || '-'}º lugar`}
            subtitle={`de ${dashboardData.ranking?.total || 0}`}
            icon={<AwardIcon className="w-6 h-6" />}
            color="purple"
          />
        </div>
      )
    }

    if (user?.role === UserRole.GERENTE) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Vendedores"
            value={dashboardData.teamSize || 0}
            icon={<UsersIcon className="w-6 h-6" />}
            color="blue"
          />
          <StatsCard
            title="Pontos da Equipe"
            value={formatNumber(dashboardData.teamPointsMonth || 0)}
            subtitle="Este mês"
            icon={<TrophyIcon className="w-6 h-6" />}
            color="green"
          />
          <StatsCard
            title="Vendas Validadas"
            value={dashboardData.teamValidatedMonth || 0}
            subtitle="Este mês"
            icon={<TrendingUpIcon className="w-6 h-6" />}
            color="yellow"
          />
          <StatsCard
            title="Top Vendedor"
            value={dashboardData.topSeller?.name || 'N/A'}
            subtitle={dashboardData.topSeller ? `${dashboardData.topSeller.points} pts` : 'Sem dados'}
            icon={<AwardIcon className="w-6 h-6" />}
            color="purple"
          />
        </div>
      )
    }

    // Admin
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Usuários"
          value={dashboardData.totalUsers || 0}
          icon={<UsersIcon className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Campanhas Ativas"
          value={dashboardData.activeCampaigns || 0}
          icon={<TargetIcon className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Vendas Validadas"
          value={dashboardData.validatedSalesMonth || 0}
          subtitle="Este mês"
          icon={<TrendingUpIcon className="w-6 h-6" />}
          color="yellow"
        />
        <StatsCard
          title="Pontos Distribuídos"
          value={formatNumber(dashboardData.pointsDistributedMonth || 0)}
          subtitle="Este mês"
          icon={<DollarSignIcon className="w-6 h-6" />}
          color="purple"
        />
      </div>
    )
  }

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
            Olá, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">
            {user?.role === UserRole.VENDEDOR && 'Aqui está um resumo do seu desempenho'}
            {user?.role === UserRole.GERENTE && 'Veja como sua equipe está performando'}
            {user?.role === UserRole.ADMIN && 'Visão geral do sistema'}
          </p>
        </div>

        {/* Seletor de período */}
        <Tabs value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Content based on role */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campanhas Ativas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TargetIcon className="w-5 h-5 mr-2" />
                Campanhas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCampaigns ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeCampaigns && activeCampaigns.length > 0 ? (
                <div className="space-y-4">
                  {activeCampaigns.slice(0, 3).map((campaign) => (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={campaign.imageUrl}
                        alt={campaign.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{campaign.title}</h3>
                        <p className="text-sm text-gray-600">
                          Termina em {formatDate(campaign.endDate)}
                        </p>
                        {campaign.progress !== undefined && (
                          <Progress value={campaign.progress} className="mt-2" />
                        )}
                      </div>
                      <Badge variant="success">Ativa</Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<TargetIcon className="w-12 h-12" />}
                  title="Nenhuma campanha ativa"
                  description="Não há campanhas ativas no momento"
                />
              )}
            </CardContent>
          </Card>

          {/* Performance Chart (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Performance {selectedPeriod}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Gráfico de performance será implementado aqui</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrophyIcon className="w-5 h-5 mr-2" />
                Top 5 Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRanking ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : ranking && ranking.ranking.length > 0 ? (
                <div className="space-y-3">
                  {ranking.ranking.slice(0, 5).map((item, index) => (
                    <motion.div
                      key={item.userId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center space-x-3 p-2 rounded-lg ${
                        item.isCurrentUser ? 'bg-eps-50 border border-eps-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                        <span className="text-sm font-bold text-gray-700">
                          {item.position}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.userName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(item.points)} pontos
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.level}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<TrophyIcon className="w-8 h-8" />}
                  title="Sem ranking"
                  description="Dados de ranking não disponíveis"
                />
              )}
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user?.role === UserRole.VENDEDOR && (
                <>
                  <Button className="w-full justify-start" variant="outline">
                    <TargetIcon className="w-4 h-4 mr-2" />
                    Nova Submissão
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <GiftIcon className="w-4 h-4 mr-2" />
                    Ver Prêmios
                  </Button>
                </>
              )}

              {user?.role === UserRole.GERENTE && (
                <>
                  <Button className="w-full justify-start" variant="outline">
                    <UsersIcon className="w-4 h-4 mr-2" />
                    Gerenciar Equipe
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUpIcon className="w-4 h-4 mr-2" />
                    Relatório Mensal
                  </Button>
                </>
              )}

              {user?.role === UserRole.ADMIN && (
                <>
                  <Button className="w-full justify-start" variant="outline">
                    <TargetIcon className="w-4 h-4 mr-2" />
                    Nova Campanha
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <UsersIcon className="w-4 h-4 mr-2" />
                    Gerenciar Usuários
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Progresso do Usuário (para vendedores) */}
          {user?.role === UserRole.VENDEDOR && (
            <Card>
              <CardHeader>
                <CardTitle>Seu Progresso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Nível {user.level}</span>
                      <span>{formatNumber(user.points)} / {formatNumber(user.pointsToNextLevel)} pts</span>
                    </div>
                    <Progress 
                      value={(user.points / user.pointsToNextLevel) * 100}
                      variant="success"
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-2">Próximo nível</p>
                    <p className="font-medium text-gray-900">
                      {user.pointsToNextLevel - user.points} pontos restantes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Componente auxiliar para cards de estatísticas
interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'purple'
  trend?: { value: number; isPositive: boolean }
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    purple: 'text-purple-600 bg-purple-100',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </div>
          </div>
          
          {trend && (
            <div className="flex items-center mt-4 pt-4 border-t">
              <div className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
              <span className="text-sm text-gray-500 ml-2">vs período anterior</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default DashboardPage
