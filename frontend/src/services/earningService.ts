/**
 * @file services/earningService.ts
 * @version 2.0.0
 * @description Serviços para gestão de earnings
 * @author DevEPS
 * @since 2025-10-21
 */

import { apiGet, apiPost, apiPut, apiDelete, apiGetPaginated } from '@/lib/axios'
import { Earning, EarningStatus, EarningType } from '@/types'

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

export const earningService = {
  /**
   * Lista earnings com filtros
   */
  async getEarnings(filters: EarningFilters) {
    return await apiGetPaginated<Earning>('/earnings', filters)
  },

  /**
   * Busca earning por ID
   */
  async getEarningById(id: string): Promise<Earning> {
    return await apiGet<{ earning: Earning }>(`/earnings/${id}`)
      .then(response => response.earning)
  },

  /**
   * Cria earning manualmente
   */
  async createEarning(data: {
    type: EarningType
    userId: string
    campaignId: string
    amount: number
    description?: string
  }): Promise<Earning> {
    return await apiPost<{ earning: Earning }>('/earnings', data)
      .then(response => response.earning)
  },

  /**
   * Atualiza earning
   */
  async updateEarning(id: string, data: {
    amount?: number
    description?: string
    status?: EarningStatus
  }): Promise<Earning> {
    return await apiPut<{ earning: Earning }>(`/earnings/${id}`, data)
      .then(response => response.earning)
  },

  /**
   * Lista earnings do usuário autenticado
   */
  async getMyEarnings(options?: {
    page?: number
    limit?: number
    status?: EarningStatus | 'all'
    type?: EarningType | 'all'
    campaignId?: string
  }) {
    return await apiGetPaginated<Earning>('/earnings/my-earnings', options)
  },

  /**
   * Lista earnings pendentes
   */
  async getPendingEarnings(userId?: string) {
    return await apiGetPaginated<Earning>('/earnings/pending', { userId })
  },

  /**
   * Obtém estatísticas de earnings
   */
  async getEarningStats(options?: {
    period?: '7d' | '30d' | '90d'
    userId?: string
  }): Promise<{
    stats: any
    period: string
    userId?: string
    generatedAt: string
  }> {
    return await apiGet('/earnings/stats', options)
  },

  /**
   * Marca earning como pago
   */
  async markEarningAsPaid(id: string, data: {
    paymentMethod: string
    paymentReference?: string
    notes?: string
  }): Promise<{
    earningId: string
    paidAt: string
    paidBy: string
  }> {
    return await apiPost(`/earnings/${id}/mark-as-paid`, data)
  },

  /**
   * Cancela earning
   */
  async cancelEarning(id: string, reason: string): Promise<{
    earningId: string
    cancelledAt: string
    cancelledBy: string
    reason: string
  }> {
    return await apiPost(`/earnings/${id}/cancel`, { reason })
  },

  /**
   * Processa earnings em lote
   */
  async bulkProcessEarnings(data: {
    earningIds: string[]
    action: 'mark_as_paid' | 'cancel'
    paymentMethod?: string
    reason?: string
    applyToAll: boolean
  }): Promise<{
    processed: number
    successful: number
    failed: number
    details: any[]
  }> {
    return await apiPost('/earnings/bulk-process', data)
  },

  /**
   * Gera relatório financeiro
   */
  async generateFinancialReport(options: {
    startDate?: string
    endDate?: string
    campaignId?: string
    userId?: string
    groupBy?: 'day' | 'week' | 'month' | 'campaign' | 'user'
    includeDetails?: boolean
    format?: 'json' | 'csv' | 'excel'
  }): Promise<any> {
    return await apiGet('/earnings/financial-report', options)
  },

  /**
   * Obtém projeções de earnings
   */
  async getEarningProjection(options: {
    period?: '7d' | '30d' | '90d'
    campaignId?: string
    includeTrends?: boolean
  }): Promise<any> {
    return await apiGet('/earnings/projection', options)
  },

  /**
   * Obtém resumo financeiro
   */
  async getFinancialSummary(period?: '7d' | '30d' | '90d'): Promise<{
    summary: any
    period: string
    generatedAt: string
    scope: string
  }> {
    return await apiGet('/earnings/financial-summary', { period })
  },
}
