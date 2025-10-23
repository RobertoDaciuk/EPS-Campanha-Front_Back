/**
 * @file services/dashboardService.ts
 * @version 2.0.0
 * @description Serviços para dados do dashboard
 * @author DevEPS
 * @since 2025-10-21
 */

import { apiGet } from '@/lib/axios'
import { DashboardStats, RankingItem, ActivityItem } from '@/types'

export const dashboardService = {
  /**
   * Obtém dados do dashboard principal
   */
  async getDashboardData(options?: {
    period?: '7d' | '30d' | '90d'
    includeDetails?: boolean
  }): Promise<DashboardStats> {
    return await apiGet('/dashboard', options)
  },

  /**
   * Obtém estatísticas rápidas
   */
  async getQuickStats(): Promise<DashboardStats> {
    return await apiGet('/dashboard/quick-stats')
  },

  /**
   * Obtém ranking de usuários
   */
  async getRanking(options?: {
    filter?: 'Geral' | 'Mensal' | 'Semanal'
    limit?: number
    page?: number
  }): Promise<{
    ranking: RankingItem[]
    currentUserPosition?: RankingItem
    pagination: any
    filter: string
    generatedAt: string
  }> {
    return await apiGet('/dashboard/ranking', options)
  },

  /**
   * Obtém histórico de atividades
   */
  async getActivityHistory(options?: {
    page?: number
    limit?: number
    type?: string
    dateFrom?: string
    dateTo?: string
    userId?: string
  }): Promise<{
    activities: ActivityItem[]
    hasMore: boolean
    userId?: string
    filters: any
    generatedAt: string
  }> {
    return await apiGet('/dashboard/activity-history', options)
  },

  /**
   * Obtém performance da equipe (gerentes)
   */
  async getTeamPerformance(options?: {
    period?: '7d' | '30d' | '90d'
    sellerId?: string
  }): Promise<{
    performance: any[]
    sellerDetails?: any
    period: string
    managerId: string
    generatedAt: string
  }> {
    return await apiGet('/dashboard/team-performance', options)
  },

  /**
   * Obtém detalhes de um vendedor específico (gerentes)
   */
  async getSellerDetails(sellerId: string, options?: {
    period?: '7d' | '30d' | '90d'
    includeActivity?: boolean
  }): Promise<any> {
    return await apiGet(`/dashboard/seller-details/${sellerId}`, options)
  },

  /**
   * Obtém métricas de crescimento
   */
  async getGrowthMetrics(options?: {
    period?: '7d' | '30d' | '90d'
    compareWith?: '7d' | '30d' | '90d'
  }): Promise<{
    metrics: any
    comparison: any
    period: string
    generatedAt: string
  }> {
    return await apiGet('/dashboard/growth-metrics', options)
  },

  /**
   * Obtém top performers
   */
  async getTopPerformers(options?: {
    period?: '7d' | '30d' | '90d'
    limit?: number
  }): Promise<{
    topPerformers: any[]
    period: string
    scope: string
    generatedAt: string
  }> {
    return await apiGet('/dashboard/top-performers', options)
  },

  /**
   * Atualiza cache do dashboard
   */
  async refreshDashboardCache(): Promise<{
    updatedAt: string
    updatedBy: string
  }> {
    return await apiGet('/dashboard/refresh-cache')
  },

  /**
   * Health check do dashboard
   */
  async dashboardHealthCheck(): Promise<{
    status: string
    timestamp: string
    checks: any
    failedChecks: number
    totalChecks: number
  }> {
    return await apiGet('/dashboard/health')
  },
}
