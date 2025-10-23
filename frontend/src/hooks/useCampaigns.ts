/**
 * @file hooks/useCampaigns.ts
 * @version 2.0.0
 * @description Hook para gerenciar campanhas
 * @author DevEPS
 * @since 2025-10-21
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignService } from '@/services/campaignService'
import { useToast } from '@/hooks/useToast'
import { Campaign, CampaignFilters, CampaignForm } from '@/types'
import { getErrorMessage } from '@/lib/utils'

export const useCampaigns = (filters?: CampaignFilters) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Query para listar campanhas
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => campaignService.getCampaigns(filters || {}),
    keepPreviousData: true,
  })

  // Mutation para criar campanha
  const createCampaignMutation = useMutation({
    mutationFn: campaignService.createCampaign,
    onSuccess: () => {
      toast.success('Campanha criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar campanha')
    },
  })

  // Mutation para atualizar campanha
  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CampaignForm> }) =>
      campaignService.updateCampaign(id, data),
    onSuccess: () => {
      toast.success('Campanha atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao atualizar campanha')
    },
  })

  // Mutation para deletar campanha
  const deleteCampaignMutation = useMutation({
    mutationFn: campaignService.deleteCampaign,
    onSuccess: () => {
      toast.success('Campanha excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao excluir campanha')
    },
  })

  // Mutation para duplicar campanha
  const duplicateCampaignMutation = useMutation({
    mutationFn: campaignService.duplicateCampaign,
    onSuccess: () => {
      toast.success('Campanha duplicada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao duplicar campanha')
    },
  })

  // Mutation para alterar status
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: any; reason?: string }) =>
      campaignService.toggleCampaignStatus(id, { status, reason }),
    onSuccess: () => {
      toast.success('Status da campanha alterado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao alterar status')
    },
  })

  return {
    // Data
    campaigns: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,

    // Actions
    refetch,
    createCampaign: createCampaignMutation.mutate,
    updateCampaign: updateCampaignMutation.mutate,
    deleteCampaign: deleteCampaignMutation.mutate,
    duplicateCampaign: duplicateCampaignMutation.mutate,
    toggleStatus: toggleStatusMutation.mutate,

    // States
    isCreating: createCampaignMutation.isPending,
    isUpdating: updateCampaignMutation.isPending,
    isDeleting: deleteCampaignMutation.isPending,
    isDuplicating: duplicateCampaignMutation.isPending,
    isTogglingStatus: toggleStatusMutation.isPending,
  }
}
