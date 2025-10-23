/**
 * @file hooks/useNotifications.ts
 * @version 2.0.0
 * @description Hook para gerenciar notificações do usuário
 * @author DevEPS
 * @since 2025-10-21
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Notification } from '@/types'
import { notificationService } from '@/services/notificationService'
import { useAuth } from '@/hooks/useAuth'

export const useNotifications = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Query para buscar notificações
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationService.getUserNotifications(),
    enabled: !!user,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })

  // Mutation para marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Mutation para marcar todas como lida
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Mutation para deletar notificação
  const deleteNotificationMutation = useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
  }
}
