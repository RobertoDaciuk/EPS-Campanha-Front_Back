/**
 * @file pages/campaigns/CampaignDetailsPage.tsx
 * @version 2.0.0
 * @description Página de detalhes da campanha
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeftIcon, 
  EditIcon, 
  CalendarIcon, 
  TrophyIcon, 
  TargetIcon,
  UsersIcon,
  CheckCircleIcon,
  PlayCircleIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { campaignService } from '@/services/campaignService'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { formatDate, formatNumber } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import StatusBadge from '@/components/ui/StatusBadge'

const CampaignDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getCampaignDetails(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return <LoadingScreen message="Carregando campanha..." />
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Campanha não encontrada</h2>
        <Button asChild className="mt-4">
          <Link to="/app/campaigns">Voltar para campanhas</Link>
        </Button>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
            <p className="text-gray-600">Detalhes da campanha</p>
          </div>
        </div>

        {user?.role === UserRole.ADMIN && (
          <Button asChild>
            <Link to={`/app/campaigns/${campaign.id}/edit`}>
              <EditIcon className="w-4 h-4 mr-2" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      {/* Campaign Header */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Imagem */}
            <div>
              <img
                src={campaign.imageUrl}
                alt={campaign.title}
                className="w-full h-48 lg:h-full object-cover rounded-lg"
              />
            </div>

            {/* Informações principais */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-semibold">{campaign.title}</h2>
                <StatusBadge status={campaign.status} type="campaign" />
              </div>

              <p className="text-gray-600">{campaign.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Data de Início</h4>
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {formatDate(campaign.startDate)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Data de Término</h4>
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {formatDate(campaign.endDate)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Pontos na Conclusão</h4>
                  <div className="flex items-center text-sm font-medium text-yellow-700">
                    <TrophyIcon className="w-4 h-4 mr-1" />
                    {formatNumber(campaign.pointsOnCompletion || 0)} pontos
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Percentual do Gerente</h4>
                  <div className="flex items-center text-sm">
                    <UsersIcon className="w-4 h-4 mr-1" />
                    {campaign.managerPointsPercentage || 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="requirements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requirements">Requisitos</TabsTrigger>
          <TabsTrigger value="progress">Meu Progresso</TabsTrigger>
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.GERENTE) && (
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          )}
        </TabsList>

        {/* Requisitos */}
        <TabsContent value="requirements">
          <div className="grid gap-4">
            {campaign.goalRequirements?.map((requirement, index) => (
              <motion.div
                key={requirement.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-eps-100 rounded-full flex items-center justify-center">
                          <span className="text-eps-600 font-bold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-medium">{requirement.description}</h3>
                          <p className="text-sm text-gray-600">
                            Meta: {requirement.quantity} {requirement.unitType === 'PAIR' ? 'pares' : 'unidades'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        {requirement.completed ? (
                          <Badge variant="success">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Concluído
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <PlayCircleIcon className="w-3 h-3 mr-1" />
                            Em andamento
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {requirement.userProgress !== undefined && (
                      <div className="mt-3">
                        <Progress 
                          value={(requirement.userProgress / requirement.quantity) * 100}
                          variant={requirement.completed ? 'success' : 'default'}
                          showValue
                          max={requirement.quantity}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Progresso */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Seu Progresso na Campanha</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.userProgress ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Progresso Geral</h3>
                    <Progress 
                      value={campaign.userProgress.totalProgress}
                      variant="success"
                      size="lg"
                      showValue
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      {campaign.userProgress.isCompleted ? 
                        'Parabéns! Você completou esta campanha!' :
                        `${campaign.userProgress.totalProgress}% concluído`
                      }
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Progresso por Requisito</h3>
                    <div className="space-y-4">
                      {campaign.userProgress.requirements?.map((req, index) => (
                        <div key={req.requirementId} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Requisito {index + 1}</span>
                            <span className="text-sm text-gray-600">
                              {req.completed}/{req.target}
                            </span>
                          </div>
                          <Progress value={req.percentage} variant="success" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Você ainda não iniciou esta campanha</p>
                  <Button className="mt-4">
                    <PlayCircleIcon className="w-4 h-4 mr-2" />
                    Iniciar Campanha
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estatísticas */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participantes:</span>
                    <span className="font-medium">45 usuários</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Concluídas:</span>
                    <span className="font-medium">12 usuários</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxa de Conclusão:</span>
                    <span className="font-medium">26.7%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['João Silva', 'Maria Santos', 'Carlos Oliveira'].map((name, index) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <span>{name}</span>
                      </div>
                      <Badge variant="outline">{100 - (index * 5)}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

export default CampaignDetailsPage
