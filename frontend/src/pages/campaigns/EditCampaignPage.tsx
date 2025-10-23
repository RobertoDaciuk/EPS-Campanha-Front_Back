/**
 * @file pages/campaigns/EditCampaignPage.tsx
 * @version 2.0.0
 * @description Página para editar campanha
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CampaignForm from '@/components/forms/CampaignForm'
import { campaignService } from '@/services/campaignService'
import { useToast } from '@/hooks/useToast'
import { CampaignForm as CampaignFormType } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'

const EditCampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getCampaignDetails(id!),
    enabled: !!id,
  })

  const updateCampaignMutation = useMutation({
    mutationFn: (data: Partial<CampaignFormType>) =>
      campaignService.updateCampaign(id!, data),
    onSuccess: () => {
      toast.success('Campanha atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaign', id] })
      navigate(`/app/campaigns/${id}`)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao atualizar campanha')
    },
  })

  const handleSubmit = async (data: CampaignFormType) => {
    await updateCampaignMutation.mutateAsync(data)
  }

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
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Campanha</h1>
          <p className="text-gray-600">{campaign.title}</p>
        </div>
      </div>

      {/* Form */}
      <CampaignForm
        mode="edit"
        initialData={campaign}
        onSubmit={handleSubmit}
        loading={updateCampaignMutation.isPending}
      />
    </motion.div>
  )
}

export default EditCampaignPage
