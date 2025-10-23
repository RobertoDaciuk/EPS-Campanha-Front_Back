/**
 * @file pages/users/UserDetailsPage.tsx
 * @version 2.0.0
 * @description Página de detalhes do usuário
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeftIcon, 
  EditIcon, 
  UserIcon, 
  MailIcon,
  PhoneIcon,
  BuildingIcon,
  CalendarIcon,
  TrophyIcon,
  BarChartIcon,
  BlockIcon,
  CheckIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import ConfirmDialog from '@/components/modals/ConfirmDialog'
import { userService } from '@/services/userService'
import { submissionService } from '@/services/submissionService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { UserRole, UserStatus } from '@/types'
import { formatDate, formatCPF, formatCNPJ, formatPhone, formatNumber, getErrorMessage } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import StatusBadge from '@/components/ui/StatusBadge'

const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean
    newStatus: UserStatus | null
  }>({ open: false, newStatus: null })

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUserById(id!),
    enabled: !!id,
  })

  const { data: userStats } = useQuery({
    queryKey: ['user-submissions', id],
    queryFn: () => submissionService.getUserSubmissionStats({ userId: id }),
    enabled: !!id,
  })

  const { data: userActivity } = useQuery({
    queryKey: ['user-activity', id],
    queryFn: () => submissionService.getMySubmissions({ userId: id, limit: 10 }),
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: UserStatus; reason: string }) =>
      userService.updateUserStatus(id!, { status, reason }),
    onSuccess: () => {
      toast.success('Status do usuário atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao atualizar status')
    },
  })

  const handleStatusChange = (newStatus: UserStatus) => {
    setStatusDialog({ open: true, newStatus })
  }

  const confirmStatusChange = async () => {
    if (!statusDialog.newStatus || !user) return

    const reason = statusDialog.newStatus === UserStatus.BLOCKED 
      ? 'Usuário bloqueado via interface administrativa'
      : 'Usuário reativado via interface administrativa'

    await updateStatusMutation.mutateAsync({
      status: statusDialog.newStatus,
      reason
    })

    setStatusDialog({ open: false, newStatus: null })
  }

  if (isLoading) {
    return <LoadingScreen message="Carregando usuário..." />
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Usuário não encontrado</h2>
        <Button asChild className="mt-4">
          <Link to="/app/users">Voltar para usuários</Link>
        </Button>
      </div>
    )
  }

  const canEdit = currentUser?.role === UserRole.ADMIN || 
    (currentUser?.role === UserRole.GERENTE && user.role === UserRole.VENDEDOR)

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
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">Detalhes do usuário</p>
          </div>
        </div>

        <div className="flex space-x-2">
          {canEdit && (
            <Button asChild variant="outline">
              <Link to={`/app/users/${user.id}/edit`}>
                <EditIcon className="w-4 h-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}

          {canEdit && user.role !== UserRole.ADMIN && (
            <Button
              variant={user.status === UserStatus.ACTIVE ? 'destructive' : 'success'}
              onClick={() => handleStatusChange(
                user.status === UserStatus.ACTIVE ? UserStatus.BLOCKED : UserStatus.ACTIVE
              )}
            >
              {user.status === UserStatus.ACTIVE ? (
                <>
                  <BlockIcon className="w-4 h-4 mr-2" />
                  Bloquear
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback name={user.name} />
                </Avatar>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">{user.name}</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <MailIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatPhone(user.whatsapp)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">CPF:</span>
                        <span className="text-sm font-mono">{formatCPF(user.cpf)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <BuildingIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{user.opticName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">CNPJ:</span>
                      <span className="text-sm font-mono">{formatCNPJ(user.opticCNPJ)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">Desde {formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Perfil</p>
                  <Badge variant="outline" className="mt-1">
                    {user.role === UserRole.ADMIN && '👑 Admin'}
                    {user.role === UserRole.GERENTE && '👔 Gerente'}
                    {user.role === UserRole.VENDEDOR && '👤 Vendedor'}
                  </Badge>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">Status</p>
                  <StatusBadge status={user.status} type="user" className="mt-1" />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">Nível</p>
                  <Badge variant={user.level?.toLowerCase() as any} className="mt-1">
                    {user.level}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="stats" className="space-y-4">
            <TabsList>
              <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              <TabsTrigger value="activity">Atividade Recente</TabsTrigger>
              {user.role === UserRole.GERENTE && (
                <TabsTrigger value="team">Equipe</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Geral</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Vendas validadas:</span>
                        <span className="font-bold">{userStats?.stats?.validatedSales || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Taxa de validação:</span>
                        <span className="font-bold text-green-600">
                          {userStats?.stats?.validationRate || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pontos acumulados:</span>
                        <span className="font-bold text-yellow-600">
                          {formatNumber(user.points)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Campanhas participadas:</span>
                        <span className="font-bold">{userStats?.stats?.campaignsCount || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Este Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Submissões:</span>
                        <span className="font-bold">{userStats?.stats?.thisMonth?.submissions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Validadas:</span>
                        <span className="font-bold text-green-600">
                          {userStats?.stats?.thisMonth?.validated || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pontos ganhos:</span>
                        <span className="font-bold text-yellow-600">
                          {formatNumber(userStats?.stats?.thisMonth?.points || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ranking:</span>
                        <span className="font-bold">
                          {userStats?.stats?.ranking?.position || '-'}º lugar
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  {userActivity?.data && userActivity.data.length > 0 ? (
                    <div className="space-y-4">
                      {userActivity.data.map((submission, index) => (
                        <motion.div
                          key={submission.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              Submissão #{submission.orderNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              {submission.campaign?.title} • {formatDate(submission.submissionDate)}
                            </p>
                          </div>
                          <StatusBadge status={submission.status} type="submission" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      Nenhuma atividade recente
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {user.role === UserRole.GERENTE && (
              <TabsContent value="team">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Equipe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500 text-center py-8">
                      Lista de vendedores da equipe será implementada aqui
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Progress (for sellers) */}
          {user.role === UserRole.VENDEDOR && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrophyIcon className="w-5 h-5 mr-2" />
                  Progresso do Nível
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-eps rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white text-xl font-bold">
                      {user.points >= 10000 ? '💎' : 
                       user.points >= 5000 ? '🏆' : 
                       user.points >= 2500 ? '🥇' : 
                       user.points >= 1000 ? '🥈' : '🥉'}
                    </span>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-lg">Nível {user.level}</p>
                    <p className="text-sm text-gray-600">{formatNumber(user.points)} pontos</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Para próximo nível</span>
                      <span>{formatNumber(user.pointsToNextLevel - user.points)} restantes</span>
                    </div>
                    <Progress 
                      value={(user.points / user.pointsToNextLevel) * 100}
                      variant="success"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canEdit && (
                <Button asChild className="w-full" variant="outline">
                  <Link to={`/app/users/${user.id}/edit`}>
                    <EditIcon className="w-4 h-4 mr-2" />
                    Editar Usuário
                  </Link>
                </Button>
              )}

              <Button asChild className="w-full" variant="outline">
                <Link to={`/app/submissions?userId=${user.id}`}>
                  <BarChartIcon className="w-4 h-4 mr-2" />
                  Ver Submissões
                </Link>
              </Button>

              {user.role === UserRole.VENDEDOR && (
                <Button asChild className="w-full" variant="outline">
                  <Link to={`/app/earnings?userId=${user.id}`}>
                    Ver Earnings
                  </Link>
                </Button>
              )}

              <Button asChild className="w-full" variant="outline">
                <Link to="/app/users">
                  Voltar para Lista
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conquistas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-lg">🎯</span>
                  <span>Primeira venda validada</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-lg">🏆</span>
                  <span>10 vendas validadas</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-lg">⭐</span>
                  <span>Nível Prata alcançado</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Confirmation */}
      <ConfirmDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog({ open, newStatus: null })}
        title={`${statusDialog.newStatus === UserStatus.BLOCKED ? 'Bloquear' : 'Ativar'} usuário`}
        description={`Tem certeza que deseja ${statusDialog.newStatus === UserStatus.BLOCKED ? 'bloquear' : 'ativar'} o usuário ${user.name}?`}
        confirmLabel={statusDialog.newStatus === UserStatus.BLOCKED ? 'Bloquear' : 'Ativar'}
        variant={statusDialog.newStatus === UserStatus.BLOCKED ? 'destructive' : 'success'}
        loading={updateStatusMutation.isPending}
        onConfirm={confirmStatusChange}
      />
    </motion.div>
  )
}

export default UserDetails
