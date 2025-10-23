/**
 * @file services/campaignService.ts
 * @version 2.0.0
 * @description Serviços para gestão de campanhas
 * @author DevEPS
 * @since 2025-10-21
 */

import { apiGet, apiPost, apiPut, apiDelete, apiGetPaginated } from '@/lib/axios'
import { Campaign, CampaignFilters, CampaignForm, PaginatedResponse } from '@/types'

export const campaignService = {
  /**
   * Lista campanhas com filtros
   */
  async getCampaigns(filters: CampaignFilters) {
    return await apiGetPaginated<Campaign>('/campaigns', filters)
  },

  /**
   * Busca campanha por ID
   */
  async getCampaignById(id: string): Promise<Campaign> {
    return await apiGet<{ campaign: Campaign }>(`/campaigns/${id}`)
      .then(response => response.campaign)
  },

  /**
   * Obtém detalhes da campanha com progresso do usuário
   */
  async getCampaignDetails(id: string, options?: {
    includeTeamData?: boolean
    includeStats?: boolean
  }): Promise<Campaign> {
    return await apiGet<{ campaign: Campaign }>(`/campaigns/${id}/details`, options)
      .then(response => response.campaign)
  },

  /**
   * Lista campanhas ativas
   */
  async getActiveCampaigns(): Promise<Campaign[]> {
    return await apiGet<{ campaigns: Campaign[] }>('/campaigns/active')
      .then(response => response.campaigns)
  },

  /**
   * Cria nova campanha
   */
  async createCampaign(data: CampaignForm): Promise<Campaign> {
    return await apiPost<{ campaign: Campaign }>('/campaigns', data)
      .then(response => response.campaign)
  },

  /**
   * Atualiza campanha
   */
  async updateCampaign(id: string, data: Partial<CampaignForm>): Promise<Campaign> {
    return await apiPut<{ campaign: Campaign }>(`/campaigns/${id}`, data)
      .then(response => response.campaign)
  },

  /**
   * Exclui campanha
   */
  async deleteCampaign(id: string): Promise<void> {
    await apiDelete(`/campaigns/${id}`)
  },

  /**
   * Duplica campanha
   */
  async duplicateCampaign(data: {
    campaignId: string
    newTitle: string
    newStartDate: string
    newEndDate: string
  }): Promise<Campaign> {
    return await apiPost<{ campaign: Campaign }>('/campaigns/duplicate', data)
      .then(response => response.campaign)
  },

  /**
   * Altera status da campanha
   */
  async toggleCampaignStatus(id: string, data: {
    status: 'ATIVA' | 'CONCLUIDA' | 'EXPIRADA'
    reason?: string
  }): Promise<void> {
    await apiPost(`/campaigns/${id}/status`, data)
  },

  /**
   * Verifica se usuário pode participar da campanha
   */
  async checkParticipation(campaignId: string): Promise<{
    campaignId: string
    userId: string
    canParticipate: boolean
    reason?: string
  }> {
    return await apiPost(`/campaigns/${campaignId}/check-participation`)
  },

  /**
   * Obtém estatísticas da campanha
   */
  async getCampaignStats(id: string): Promise<any> {
    return await apiGet<{ stats: any }>(`/campaigns/${id}/stats`)
      .then(response => response.stats)
  },

  /**
   * Obtém performance da campanha
   */
  async getCampaignPerformance(id: string, options?: {
    groupBy?: 'day' | 'week' | 'month' | 'user'
    includeDetails?: boolean
    format?: 'json' | 'csv' | 'excel'
  }): Promise<any> {
    return await apiGet(`/campaigns/${id}/performance`, options)
  },
}
