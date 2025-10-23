/**
 * @file pages/premios/PremioDetailsPage.tsx
 * @version 2.0.0
 * @description Página de detalhes do prêmio
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
  GiftIcon, 
  TrophyIcon,
  PackageIcon,
  StarIcon,
  CheckIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PremioRedeemModal from '@/components/modals/PremioRedeemModal'
import { premioService } from '@/services/premioService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { UserRole } from '@/types'
import { formatNumber, getErrorMessage } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'

const PremioDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showRedeemModal, setShowRedeemModal] = useState(false)

  const { data: premio, isLoading } = useQuery({
    queryKey: ['premio', id],
    queryFn: () => premioService.getPremioById(id!),
    enabled: !!id,
  })

  const { data: canRedeemData } = useQuery({
    queryKey: ['can-redeem', id],
    queryFn: () => premioService.checkRedeem(id!),
    enabled: !!id && user?.role === UserRole.VENDEDOR,
  })

  const redeemMutation = useMutation({
    mutationFn: premioService.redeemPremio,
    onSuccess: () => {
      toast.success('Prêmio resgatado com sucesso!', 'Parabéns! 🎉')
      queryClient.invalidateQueries({ queryKey: ['premio', id] })
      queryClient.invalidateQueries({ queryKey: ['can-redeem', id] })
      queryClient.invalidateQueries({ queryKey: ['premios'] })
      setShowRedeemModal(false)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro no resgate')
    },
  })

  const handleRedeem = async (data: { premioId: string; notes?: string }) => {
    await redeemMutation.mutateAsync(data.premioId, { notes: data.notes })
  }

  if (isLoading) {
    return <LoadingScreen message="Carregando prêmio..." />
  }

  if (!premio) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Prêmio não encontrado</h2>
        <Button asChild className="mt-4">
          <Link to="/app/premios">Voltar para catálogo</Link>
        </Button>
      </div>
    )
  }

  const canRedeem = canRedeemData?.canRedeem && premio.isActive && premio.stock > 0

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
            <h1 className="text-2xl font-bold text-gray-900">{premio.title}</h1>
            <p className="text-gray-600">Detalhes do prêmio</p>
          </div>
        </div>

        <div className="flex space-x-2">
          {user?.role === UserRole.ADMIN && (
            <Button asChild variant="outline">
              <Link to={`/app/premios/${premio.id}/edit`}>
                <EditIcon className="w-4 h-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}

          {user?.role === UserRole.VENDEDOR && canRedeem && (
            <Button onClick={() => setShowRedeemModal(true)}>
              <GiftIcon className="w-4 h-4 mr-2" />
              Resgatar Prêmio
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prize Image and Basic Info */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={premio.imageUrl}
                    alt={premio.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{premio.title}</h2>
                    <Badge variant="secondary">{premio.category}</Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-2xl font-bold text-yellow-600">
                      <TrophyIcon className="w-6 h-6" />
                      <span>{formatNumber(premio.pointsRequired)} pontos</span>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Estoque disponível:</span>
                      <div className="flex items-center space-x-2">
                        <PackageIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{premio.stock}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge 
                        variant={
                          !premio.isActive ? 'error' :
                          premio.stock === 0 ? 'error' : 
                          premio.stock <= 5 ? 'warning' : 'success'
                        }
                      >
                        {!premio.isActive ? 'Inativo' :
                         premio.stock === 0 ? 'Esgotado' : 
                         premio.stock <= 5 ? 'Últimas unidades' : 'Disponível'}
                      </Badge>
                    </div>

                    {premio.priority && premio.priority > 50 && (
                      <div className="flex items-center space-x-2 text-yellow-600">
                        <StarIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Prêmio em destaque</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{premio.description}</p>
            </CardContent>
          </Card>

          {/* Redemption Status for Sellers */}
          {user?.role === UserRole.VENDEDOR && canRedeemData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckIcon className="w-5 h-5 mr-2" />
                  Status do Resgate
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canRedeemData.canRedeem ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-green-800">
                      <CheckIcon className="w-5 h-5" />
                      <span className="font-medium">Você pode resgatar este prêmio!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Você tem {formatNumber(canRedeemData.userPoints)} pontos e precisa de {formatNumber(canRedeemData.requiredPoints)}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-red-800 mb-2">
                      <XIcon className="w-5 h-5" />
                      <span className="font-medium">Você não pode resgatar este prêmio</span>
                    </div>
                    <p className="text-sm text-red-700">
                      {canRedeemData.reason}
                    </p>
                    {canRedeemData.userPoints < canRedeemData.requiredPoints && (
                      <p className="text-sm text-red-700 mt-1">
                        Você precisa de mais {formatNumber(canRedeemData.requiredPoints - canRedeemData.userPoints)} pontos.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user?.role === UserRole.VENDEDOR && canRedeem && (
                <Button 
                  className="w-full" 
                  onClick={() => setShowRedeemModal(true)}
                >
                  <GiftIcon className="w-4 h-4 mr-2" />
                  Resgatar Agora
                </Button>
              )}

              {user?.role === UserRole.ADMIN && (
                <>
                  <Button asChild className="w-full" variant="outline">
                    <Link to={`/app/premios/${premio.id}/edit`}>
                      <EditIcon className="w-4 h-4 mr-2" />
                      Editar Prêmio
                    </Link>
                  </Button>
                  
                  <Button className="w-full" variant="outline">
                    <PackageIcon className="w-4 h-4 mr-2" />
                    Gerenciar Estoque
                  </Button>
                </>
              )}

              <Button asChild className="w-full" variant="outline">
                <Link to="/app/premios">
                  Voltar ao Catálogo
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Prize Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total de resgates:</span>
                <span className="font-medium">42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Este mês:</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Disponível há:</span>
                <span className="font-medium">3 meses</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Popularidade:</span>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarIcon
                      key={i}
                      className={`w-3 h-3 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similar Prizes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prêmios Similares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Placeholder for similar prizes */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <div className="w-12 h-12 bg-gray-200 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Prêmio Similar {i}</p>
                      <p className="text-xs text-gray-500">1.500 pontos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Redeem Modal */}
      <PremioRedeemModal
        open={showRedeemModal}
        onOpenChange={setShowRedeemModal}
        premio={premio}
        userPoints={canRedeemData?.userPoints || 0}
        onRedeem={handleRedeem}
        loading={redeemMutation.isPending}
      />
    </motion.div>
  )
}

export default PremioDetailsPage
