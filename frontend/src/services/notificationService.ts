/**
 * @file services/notificationService.ts
 * @version 2.0.0
 * @description Serviços para notificações
 * @author DevEPS
 * @since 2025-10-21
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/axios'
import { Notification } from '@/types'

export const notificationService = {
  /**
   * Obtém notificações do usuário
   */
  async getUserNotifications(): Promise<Notification[]> {
    // Simulação - em implementação real viria da API
    return [
      {
        id: '1',
        userId: 'user1',
        title: 'Venda Validada! 🎉',
        message: 'Sua venda PED-001-2025 foi validada e você ganhou 50 pontos!',
        isRead: false,
        type: 'success',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'user1', 
        title: 'Nova Campanha Disponível',
        message: 'A campanha "Especial Armações Premium" está ativa. Participe!',
        isRead: true,
        type: 'info',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '3',
        userId: 'user1',
        title: 'Prêmio Disponível',
        message: 'Você tem pontos suficientes para resgatar a Caixa de Som!',
        isRead: false,
        type: 'premio',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ]
  },

  /**
   * Marca notificação como lida
   */
  async markAsRead(id: string): Promise<void> {
    // await apiPut(`/notifications/${id}/read`)
    console.log('Marcando notificação como lida:', id)
  },

  /**
   * Marca todas as notificações como lidas
   */
  async markAllAsRead(): Promise<void> {
    // await apiPost('/notifications/mark-all-read')
    console.log('Marcando todas as notificações como lidas')
  },

  /**
   * Deleta notificação
   */
  async deleteNotification(id: string): Promise<void> {
    // await apiDelete(`/notifications/${id}`)
    console.log('Deletando notificação:', id)
  },
}
