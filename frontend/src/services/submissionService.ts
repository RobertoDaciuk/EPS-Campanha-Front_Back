/**
 * @file services/submissionService.ts
 * @version 2.0.0
 * @description Serviços para gestão de submissões
 * @author DevEPS
 * @since 2025-10-21
 */

import { apiGet, apiPost, apiPut, apiDelete, apiGetPaginated } from '@/lib/axios'
import { CampaignSubmission, SubmissionFilters, SubmissionForm, CampaignSubmissionStatus } from '@/types'

export const submissionService = {
  /**
   * Lista submissões com filtros
   */
  async getSubmissions(filters: SubmissionFilters) {
    return await apiGetPaginated<CampaignSubmission>('/submissions', filters)
  },

  /**
   * Busca submissão por ID
   */
  async getSubmissionById(id: string): Promise<CampaignSubmission> {
    return await apiGet<{ submission: CampaignSubmission }>(`/submissions/${id}`)
      .then(response => response.submission)
  },

  /**
   * Cria nova submissão
   */
  async createSubmission(data: SubmissionForm): Promise<CampaignSubmission> {
    return await apiPost<{ submission: CampaignSubmission }>('/submissions', data)
      .then(response => response.submission)
  },

  /**
   * Atualiza submissão
   */
  async updateSubmission(id: string, data: Partial<SubmissionForm>): Promise<CampaignSubmission> {
    return await apiPut<{ submission: CampaignSubmission }>(`/submissions/${id}`, data)
      .then(response => response.submission)
  },

  /**
   * Exclui submissão
   */
  async deleteSubmission(id: string): Promise<void> {
    await apiDelete(`/submissions/${id}`)
  },

  /**
   * Lista submissões do usuário autenticado
   */
  async getMySubmissions(options?: {
    page?: number
    limit?: number
    status?: CampaignSubmissionStatus | 'all'
    campaignId?: string
    sort?: string
    order?: 'asc' | 'desc'
  }) {
    return await apiGetPaginated<CampaignSubmission>('/submissions/my-submissions', options)
  },

  /**
   * Lista submissões pendentes de validação
   */
  async getPendingSubmissions(options?: {
    campaignId?: string
    page?: number
    limit?: number
  }) {
    return await apiGetPaginated<CampaignSubmission>('/submissions/pending', options)
  },

  /**
   * Valida submissão
   */
  async validateSubmission(id: string, data: {
    status: CampaignSubmissionStatus.VALIDATED | CampaignSubmissionStatus.REJECTED
    validationMessage?: string
    internalNotes?: string
  }): Promise<{
    submission: CampaignSubmission
    pointsAwarded?: { seller: number; manager?: number }
    earningsCreated?: string[]
    kitStatusChanged?: boolean
  }> {
    return await apiPost(`/submissions/${id}/validate`, data)
  },

  /**
   * Validação em lote
   */
  async bulkValidateSubmissions(data: {
    submissionIds: string[]
    action: 'validate' | 'reject' | 'pending'
    validationMessage?: string
    applyToAll: boolean
  }): Promise<{
    processed: number
    successful: number
    failed: number
    details: any[]
  }> {
    return await apiPost('/submissions/bulk-validate', data)
  },

  /**
   * Duplica submissão
   */
  async duplicateSubmission(data: {
    submissionId: string
    newOrderNumber: string
    newQuantity?: number
    newKitId?: string
  }): Promise<{
    originalSubmissionId: string
    duplicatedSubmission: CampaignSubmission
  }> {
    return await apiPost('/submissions/duplicate', data)
  },

  /**
   * Transfere submissão entre kits
   */
  async transferSubmission(data: {
    submissionId: string
    targetKitId: string
  }): Promise<{
    submission: CampaignSubmission
    originalKit: string
    newKit: string
  }> {
    return await apiPost('/submissions/transfer', data)
  },

  /**
   * Lista submissões por kit
   */
  async getSubmissionsByKit(kitId: string, options?: {
    page?: number
    limit?: number
  }): Promise<{
    submissions: CampaignSubmission[]
    kitId: string
    count: number
  }> {
    return await apiGet(`/submissions/by-kit/${kitId}`, options)
  },

  /**
   * Lista submissões por requisito
   */
  async getSubmissionsByRequirement(campaignId: string, requirementId: string, options?: {
    page?: number
    limit?: number
    status?: CampaignSubmissionStatus
  }): Promise<{
    submissions: CampaignSubmission[]
    campaignId: string
    requirementId: string
    count: number
  }> {
    return await apiGet(`/submissions/by-requirement/${campaignId}/${requirementId}`, options)
  },

  /**
   * Obtém estatísticas de submissões do usuário
   */
  async getUserSubmissionStats(options?: {
    period?: '7d' | '30d' | '90d'
    userId?: string
    campaignId?: string
  }): Promise<{
    stats: any
    userId?: string
    period: string
    generatedAt: string
  }> {
    return await apiGet('/submissions/stats', options)
  },

  /**
   * Gera relatório de submissões
   */
  async generateSubmissionReport(options: {
    startDate?: string
    endDate?: string
    campaignId?: string
    userId?: string
    status?: CampaignSubmissionStatus | 'all'
    groupBy?: 'day' | 'week' | 'month' | 'campaign' | 'user'
    includeDetails?: boolean
    format?: 'json' | 'csv' | 'excel'
  }): Promise<any> {
    return await apiGet('/submissions/report', options)
  },
}
