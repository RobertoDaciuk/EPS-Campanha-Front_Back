/**
 * @file hooks/useSubmissions.ts
 * @version 2.0.0
 * @description Hook para gerenciar submissões
 * @author DevEPS
 * @since 2025-10-21
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionService } from '@/services/submissionService'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { CampaignSubmission, SubmissionFilters, SubmissionForm, UserRole, CampaignSubmissionStatus } from '@/types'
import { getErrorMessage } from '@/lib/utils'

export const useSubmissions = (filters?: SubmissionFilters) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  // Query baseado no perfil do usuário
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['submissions', filters, user?.role],
    queryFn: () => {
      if (user?.role === UserRole.VENDEDOR) {
        return submissionService.getMySubmissions(filters)
      }
      return submissionService.getSubmissions(filters || {})
    },
    keepPreviousData: true,
  })

  // Query para submissões pendentes (gerentes/admins)
  const { data: pendingSubmissions, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-submissions'],
    queryFn: () => submissionService.getPendingSubmissions(),
    enabled: user?.role === UserRole.GERENTE || user?.role === UserRole.ADMIN,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })

  // Mutation para criar submissão
  const createSubmissionMutation = useMutation({
    mutationFn: submissionService.createSubmission,
    onSuccess: () => {
      toast.success('Submissão criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar submissão')
    },
  })

  // Mutation para atualizar submissão
  const updateSubmissionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubmissionForm> }) =>
      submissionService.updateSubmission(id, data),
    onSuccess: () => {
      toast.success('Submissão atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao atualizar submissão')
    },
  })

  // Mutation para deletar submissão
  const deleteSubmissionMutation = useMutation({
    mutationFn: submissionService.deleteSubmission,
    onSuccess: () => {
      toast.success('Submissão excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao excluir submissão')
    },
  })

  // Mutation para validar submissão
  const validateSubmissionMutation = useMutation({
    mutationFn: ({ id, status, message }: { 
      id: string; 
      status: CampaignSubmissionStatus.VALIDATED | CampaignSubmissionStatus.REJECTED;
      message?: string;
    }) => submissionService.validateSubmission(id, { status, validationMessage: message }),
    onSuccess: (data) => {
      toast.success(
        data.submission.status === 'VALIDATED' 
          ? 'Submissão validada com sucesso!' 
          : 'Submissão rejeitada com sucesso!'
      )
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['pending-submissions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao validar submissão')
    },
  })

  // Mutation para validação em lote
  const bulkValidateMutation = useMutation({
    mutationFn: submissionService.bulkValidateSubmissions,
    onSuccess: (data) => {
      toast.success(`${data.successful} submissões processadas com sucesso!`)
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['pending-submissions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro na validação em lote')
    },
  })

  return {
    // Data
    submissions: data?.data || [],
    pagination: data?.pagination,
    pendingSubmissions: pendingSubmissions?.data || [],
    isLoading: isLoading || loadingPending,
    error,

    // Actions
    refetch,
    createSubmission: createSubmissionMutation.mutate,
    updateSubmission: updateSubmissionMutation.mutate,
    deleteSubmission: deleteSubmissionMutation.mutate,
    validateSubmission: validateSubmissionMutation.mutate,
    bulkValidate: bulkValidateMutation.mutate,

    // States
    isCreating: createSubmissionMutation.isPending,
    isUpdating: updateSubmissionMutation.isPending,
    isDeleting: deleteSubmissionMutation.isPending,
    isValidating: validateSubmissionMutation.isPending,
    isBulkValidating: bulkValidateMutation.isPending,
  }
}
