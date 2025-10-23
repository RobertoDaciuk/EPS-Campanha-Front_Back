/**
 * @file pages/campaigns/CreateCampaignPage.tsx
 * @version 2.0.0
 * @description Página para criar campanha
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CampaignForm from '@/components/forms/CampaignForm'
import { campaignService } from '@/services/campaignService'
import { useToast } from '@/hooks/useToast'
import { CampaignForm as CampaignFormType } from '@/types'
import { getErrorMessage } from '@/lib/utils'

const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createCampaignMutation = useMutation({
    mutationFn: campaignService.createCampaign,
    onSuccess: (data) => {
      toast.success('Campanha criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate(`/app/campaigns/${data.campaign.id}`)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar campanha')
    },
  })

  const handleSubmit = async (data: CampaignFormType) => {
    await createCampaignMutation.mutateAsync(data)
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
          <h1 className="text-2xl font-bold text-gray-900">Nova Campanha</h1>
          <p className="text-gray-600">Crie uma nova campanha de incentivo</p>
        </div>
      </div>

      {/* Form */}
      <CampaignForm
        mode="create"
        onSubmit={handleSubmit}
        loading={createCampaignMutation.isPending}
      />
    </motion.div>
  )
}

export default CreateCampaignPage
