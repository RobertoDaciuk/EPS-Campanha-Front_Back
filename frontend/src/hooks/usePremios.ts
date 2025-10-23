/**
 * @file hooks/usePremios.ts
 * @version 2.0.0
 * @description Hook para gerenciar prêmios
 * @author DevEPS
 * @since 2025-10-21
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { premioService } from '@/services/premioService'
import { useToast } from '@/hooks/useToast'
import { Premio, PremioForm } from '@/types'
import { getErrorMessage } from '@/lib/utils'

interface PremioFilters {
  search?: string
  category?: string
  maxPoints?: number
  minPoints?: number
  inStock?: boolean
  isActive?: boolean
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export const usePremios = (filters?: PremioFilters) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Query para listar prêmios
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['premios', filters],
    queryFn: () => premioService.getPremios(filters || {}),
    keepPreviousData: true,
  })

  // Query para prêmios populares
  const { data: popularPremios } = useQuery({
    queryKey: ['popular-premios'],
    queryFn: () => premioService.getPopularPremios(5),
  })

  // Query para prêmios disponíveis para o usuário
  const { data: availablePremios } = useQuery({
    queryKey: ['available-premios'],
    queryFn: () => premioService.getAvailablePremios(),
  })

  // Mutation para criar prêmio
  const createPremioMutation = useMutation({
    mutationFn: premioService.createPremio,
    onSuccess: () => {
      toast.success('Prêmio criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['premios'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar prêmio')
    },
  })

  // Mutation para atualizar prêmio
  const updatePremioMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PremioForm> }) =>
      premioService.updatePremio(id, data),
    onSuccess: () => {
      toast.success('Prêmio atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['premios'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao atualizar prêmio')
    },
  })

  // Mutation para deletar prêmio
  const deletePremioMutation = useMutation({
    mutationFn: premioService.deletePremio,
    onSuccess: () => {
      toast.success('Prêmio excluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['premios'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao excluir prêmio')
    },
  })

  // Mutation para resgatar prêmio
  const redeemPremioMutation = useMutation({
    mutationFn: ({ premioId, data }: { premioId: string; data?: any }) =>
      premioService.redeemPremio(premioId, data),
    onSuccess: () => {
      toast.success('Prêmio resgatado com sucesso! 🎉')
      queryClient.invalidateQueries({ queryKey: ['premios'] })
      queryClient.invalidateQueries({ queryKey: ['available-premios'] })
      queryClient.invalidateQueries({ queryKey: ['user'] }) // Update user points
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro no resgate')
    },
  })

  // Mutation para atualizar estoque
  const updateStockMutation = useMutation({
    mutationFn: ({ premioId, operation, quantity, reason }: {
      premioId: string
      operation: 'add' | 'subtract' | 'set'
      quantity: number
      reason: string
    }) => premioService.updateStock(premioId, { operation, quantity, reason }),
    onSuccess: () => {
      toast.success('Estoque atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['premios'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao atualizar estoque')
    },
  })

  // Mutation para reposição de estoque
  const restockMutation = useMutation({
    mutationFn: ({ premioId, quantity, reason }: {
      premioId: string
      quantity: number
      reason: string
    }) => premioService.restockPremio(premioId, { quantity, reason }),
    onSuccess: () => {
      toast.success('Estoque reposto com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['premios'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro na reposição')
    },
  })

  return {
    // Data
    premios: data?.data || [],
    pagination: data?.pagination,
    popularPremios: popularPremios?.premios || [],
    availablePremios: availablePremios?.premios || [],
    isLoading,
    error,

    // Actions
    refetch,
    createPremio: createPremioMutation.mutate,
    updatePremio: updatePremioMutation.mutate,
    deletePremio: deletePremioMutation.mutate,
    redeemPremio: redeemPremioMutation.mutate,
    updateStock: updateStockMutation.mutate,
    restockPremio: restockMutation.mutate,

    // States
    isCreating: createPremioMutation.isPending,
    isUpdating: updatePremioMutation.isPending,
    isDeleting: deletePremioMutation.isPending,
    isRedeeming: redeemPremioMutation.isPending,
    isUpdatingStock: updateStockMutation.isPending,
    isRestocking: restockMutation.isPending,
  }
}
