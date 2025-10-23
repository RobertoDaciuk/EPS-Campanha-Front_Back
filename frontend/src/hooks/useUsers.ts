/**
 * @file hooks/useUsers.ts
 * @version 2.0.0
 * @description Hook para gerenciar usuários
 * @author DevEPS
 * @since 2025-10-21
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/userService'
import { useToast } from '@/hooks/useToast'
import { User, UserFilters, UserForm, UserRole, UserStatus } from '@/types'
import { getErrorMessage } from '@/lib/utils'

export const useUsers = (filters?: UserFilters) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Query para listar usuários
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => userService.getUsers(filters || {}),
    keepPreviousData: true,
  })

  // Query para estatísticas de usuários
  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userService.getUserStats(),
  })

  // Query para gerentes disponíveis
  const { data: managers } = useQuery({
    queryKey: ['managers'],
    queryFn: () => userService.getUsers({ role: UserRole.GERENTE, limit: 100 }),
  })

  // Mutation para criar usuário
  const createUserMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar usuário')
    },
  })

  // Mutation para atualizar usuário
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserForm> }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao atualizar usuário')
    },
  })

  // Mutation para deletar usuário
  const deleteUserMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      toast.success('Usuário excluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao excluir usuário')
    },
  })

  // Mutation para alterar status
  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status, reason }: { 
      userId: string; 
      status: UserStatus; 
      reason: string 
    }) => userService.updateUserStatus(userId, { status, reason }),
    onSuccess: (_, { status }) => {
      toast.success(
        status === UserStatus.BLOCKED 
          ? 'Usuário bloqueado com sucesso!' 
          : 'Usuário ativado com sucesso!'
      )
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao alterar status')
    },
  })

  // Mutation para reset de senha
  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      userService.resetUserPassword(userId, newPassword),
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso!')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao redefinir senha')
    },
  })

  // Mutation para transferir usuário entre gerentes
  const transferUserMutation = useMutation({
    mutationFn: ({ userId, newManagerId, reason }: { 
      userId: string; 
      newManagerId: string; 
      reason?: string 
    }) => userService.transferUser(userId, newManagerId, reason),
    onSuccess: () => {
      toast.success('Usuário transferido com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro na transferência')
    },
  })

  // Mutation para importação em lote
  const bulkImportMutation = useMutation({
    mutationFn: userService.bulkImportUsers,
    onSuccess: (data) => {
      toast.success(`${data.summary.successful} usuários importados com sucesso!`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro na importação')
    },
  })

  return {
    // Data
    users: data?.data || [],
    pagination: data?.pagination,
    userStats,
    managers: managers?.data || [],
    isLoading,
    error,

    // Actions
    refetch,
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,
    transferUser: transferUserMutation.mutate,
    bulkImport: bulkImportMutation.mutate,

    // States
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    isTransferring: transferUserMutation.isPending,
    isBulkImporting: bulkImportMutation.isPending,
  }
}
