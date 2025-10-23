/**
 * @file hooks/useEarnings.ts
 * @version 2.0.0
 * @description Hook para gerenciar earnings
 * @author DevEPS
 * @since 2025-10-21
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { earningService } from '@/services/earningService'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { Earning, EarningStatus, EarningType, UserRole } from '@/types'
import { getErrorMessage } from '@/lib/utils'

interface EarningFilters {
  status?: EarningStatus | 'all'
  type?: EarningType | 'all'
  campaignId?: string
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export const useEarnings = (filters?: EarningFilters) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  // Query baseado no perfil
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['earnings', filters, user?.role],
    queryFn: () => {
      if (user?.role === UserRole.VENDEDOR) {
        return earningService.getMyEarnings(filters)
      }
      return earningService.getEarnings(filters || {})
    },
    keepPreviousData: true,
  })

  // Query para earnings pendentes
  const { data: pendingEarnings, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-earnings', filters?.userId],
    queryFn: () => earningService.getPendingEarnings(filters?.userId),
    enabled: user?.role === UserRole.ADMIN || user?.role === UserRole.GERENTE,
  })

  // Query para estatísticas
  const { data: earningStats } = useQuery({
    queryKey: ['earning-stats', filters?.userId],
    queryFn: () => earningService.getEarningStats({ 
      period: '30d',
      userId: filters?.userId 
    }),
  })

  // Mutation para criar earning manual
  const createEarningMutation = useMutation({
    mutationFn: earningService.createEarning,
    onSuccess: () => {
      toast.success('Earning criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar earning')
    },
  })

  // Mutation para marcar como pago
  const markAsPaidMutation = useMutation({
    mutationFn: ({ id, data }: { 
      id: string; 
      data: { paymentMethod: string; paymentReference?: string; notes?: string } 
    }) => earningService.markEarningAsPaid(id, data),
    onSuccess: () => {
      toast.success('Earning marcado como pago!')
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      queryClient.invalidateQueries({ queryKey: ['pending-earnings'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao marcar como pago')
    },
  })

  // Mutation para cancelar earning
  const cancelEarningMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      earningService.cancelEarning(id, reason),
    onSuccess: () => {
      toast.success('Earning cancelado!')
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao cancelar earning')
    },
  })

  // Mutation para processamento em lote
  const bulkProcessMutation = useMutation({
    mutationFn: earningService.bulkProcessEarnings,
    onSuccess: (data) => {
      toast.success(`${data.successful} earnings processados com sucesso!`)
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      queryClient.invalidateQueries({ queryKey: ['pending-earnings'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro no processamento em lote')
    },
  })

  return {
    // Data
    earnings: data?.data || [],
    pagination: data?.pagination,
    pendingEarnings: pendingEarnings?.data || [],
    earningStats,
    isLoading: isLoading || loadingPending,
    error,

    // Actions
    refetch,
    createEarning: createEarningMutation.mutate,
    markAsPaid: markAsPaidMutation.mutate,
    cancelEarning: cancelEarningMutation.mutate,
    bulkProcess: bulkProcessMutation.mutate,

    // States
    isCreating: createEarningMutation.isPending,
    isMarkingPaid: markAsPaidMutation.isPending,
    isCanceling: cancelEarningMutation.isPending,
    isBulkProcessing: bulkProcessMutation.isPending,
  }
}
