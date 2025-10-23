/**
 * @file services/premioService.ts
 * @version 2.0.0
 * @description Serviços para gestão de prêmios
 * @author DevEPS
 * @since 2025-10-21
 */

import { apiGet, apiPost, apiPut, apiDelete, apiGetPaginated } from '@/lib/axios'
import { Premio } from '@/types'

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

export const premioService = {
  /**
   * Obtém catálogo público de prêmios
   */
  async getPublicCatalog(filters?: PremioFilters) {
    return await apiGetPaginated<Premio>('/premios/catalog', filters)
  },

  /**
   * Lista prêmios com dados personalizados para o usuário
   */
  async getPremios(filters?: PremioFilters) {
    return await apiGetPaginated<Premio>('/premios', filters)
  },

  /**
   * Busca prêmio por ID
   */
  async getPremioById(id: string): Promise<Premio> {
    return await apiGet<{ premio: Premio }>(`/premios/${id}`)
      .then(response => response.premio)
  },

  /**
   * Cria novo prêmio
   */
  async createPremio(data: {
    title: string
    description: string
    imageUrl: string
    pointsRequired: number
    stock: number
    category?: string
    priority?: number
  }): Promise<Premio> {
    return await apiPost<{ premio: Premio }>('/premios', data)
      .then(response => response.premio)
  },

  /**
   * Atualiza prêmio
   */
  async updatePremio(id: string, data: Partial<{
    title: string
    description: string
    imageUrl: string
    pointsRequired: number
    stock: number
    category: string
    isActive: boolean
    priority: number
  }>): Promise<Premio> {
    return await apiPut<{ premio: Premio }>(`/premios/${id}`, data)
      .then(response => response.premio)
  },

  /**
   * Exclui prêmio
   */
  async deletePremio(id: string): Promise<void> {
    await apiDelete(`/premios/${id}`)
  },

  /**
   * Lista prêmios disponíveis para o usuário
   */
  async getAvailablePremios(): Promise<{
    premios: Premio[]
    user: { points: number; level: string }
  }> {
    return await apiGet('/premios/available')
  },

  /**
   * Lista prêmios populares
   */
  async getPopularPremios(limit?: number): Promise<{
    premios: Premio[]
    limit: number
    generatedAt: string
  }> {
    return await apiGet('/premios/popular', { limit })
  },

  /**
   * Verifica se usuário pode resgatar prêmio
   */
  async checkRedeem(premioId: string): Promise<{
    canRedeem: boolean
    reason?: string
    userPoints: number
    requiredPoints: number
  }> {
    return await apiGet(`/premios/${premioId}/check-redeem`)
  },

  /**
   * Resgata prêmio
   */
  async redeemPremio(premioId: string, data?: {
    deliveryAddress?: any
    notes?: string
  }): Promise<{
    premioId: string
    userId: string
    redeemedAt: string
    pointsDeducted: number
    newUserPoints: number
  }> {
    return await apiPost(`/premios/${premioId}/redeem`, data)
  },

  /**
   * Atualiza estoque do prêmio
   */
  async updateStock(premioId: string, data: {
    operation: 'add' | 'subtract' | 'set'
    quantity: number
    reason: string
  }): Promise<{
    premioId: string
    newStock: number
    operation: string
    quantity: number
    updatedBy: string
    updatedAt: string
  }> {
    return await apiPost(`/premios/${premioId}/stock`, data)
  },

  /**
   * Repõe estoque
   */
  async restockPremio(premioId: string, data: {
    quantity: number
    reason: string
  }): Promise<{
    premioId: string
    quantityAdded: number
    newStock: number
    reason: string
    restockedBy: string
    restockedAt: string
  }> {
    return await apiPost(`/premios/${premioId}/restock`, data)
  },

  /**
   * Obtém estatísticas de prêmios
   */
  async getPremioStats(): Promise<{
    stats: any
    generatedAt: string
    generatedBy: string
  }> {
    return await apiGet('/premios/stats')
  },

  /**
   * Lista prêmios com baixo estoque
   */
  async getLowStock(threshold?: number): Promise<{
    premios: Premio[]
    threshold: number
    count: number
    generatedAt: string
  }> {
    return await apiGet('/premios/low-stock', { threshold })
  },

  /**
   * Lista prêmios esgotados
   */
  async getOutOfStock(): Promise<{
    premios: Premio[]
    count: number
    generatedAt: string
  }> {
    return await apiGet('/premios/out-of-stock')
  },

  /**
   * Obtém histórico de resgates do usuário
   */
  async getMyRedemptions(options?: {
    page?: number
    limit?: number
  }): Promise<{
    redemptions: any[]
    pagination: any
    userId: string
  }> {
    return await apiGet('/premios/my-redemptions', options)
  },

  /**
   * Importação em lote de prêmios
   */
  async bulkImportPremios(data: {
    premios: Array<{
      title: string
      description: string
      imageUrl: string
      pointsRequired: number
      stock: number
      category?: string
      priority?: number
    }>
    validateOnly: boolean
    skipDuplicates: boolean
  }): Promise<{
    summary: {
      total: number
      successful: number
      failed: number
      validateOnly: boolean
      skipDuplicates: boolean
    }
    results: any[]
  }> {
    return await apiPost('/premios/bulk-import', data)
  },
}
