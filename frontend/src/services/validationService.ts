/**
 * @file services/validationService.ts
 * @version 2.0.0
 * @description Serviços para validação de planilhas
 * @author DevEPS
 * @since 2025-10-21
 */

import { apiGet, apiPost, apiDelete, apiUpload, apiDownload, apiGetPaginated } from '@/lib/axios'

interface ValidationFilters {
  search?: string
  status?: 'PROCESSANDO' | 'CONCLUIDO' | 'FALHOU' | 'all'
  campaignId?: string
  adminId?: string
  isDryRun?: boolean
  uploadedAfter?: string
  uploadedBefore?: string
  hasErrors?: boolean
  hasWarnings?: boolean
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

interface ValidationJob {
  id: string
  fileName: string
  uploadDate: string
  status: 'PROCESSANDO' | 'CONCLUIDO' | 'FALHOU'
  campaignTitle: string
  isDryRun: boolean
  totalRows: number
  validatedSales: number
  errors: number
  warnings: number
  pointsDistributed: number
  details?: any[]
  campaignId?: string
  adminId: string
  processingStarted?: string
  processingCompleted?: string
  processingDuration?: number
  fileSize?: number
  rowsProcessed?: number
  createdAt: string
  updatedAt: string
}

export const validationService = {
  /**
   * Upload de arquivo para validação
   */
  async uploadValidationFile(
    file: File,
    config: any,
    options?: {
      previewOnly?: boolean
      maxRows?: number
      onProgress?: (progress: number) => void
    }
  ): Promise<{
    validationJob: ValidationJob
    preview?: any
  }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('config', JSON.stringify(config))
    
    if (options?.previewOnly) {
      formData.append('previewOnly', 'true')
    }
    
    if (options?.maxRows) {
      formData.append('maxRows', options.maxRows.toString())
    }

    return await apiUpload('/validation/upload', formData, options?.onProgress)
  },

  /**
   * Pré-visualização de arquivo
   */
  async previewValidationFile(
    file: File,
    sampleSize?: number
  ): Promise<{
    preview: any
    fileName: string
    fileSize: number
    sampleSize: number
    previewedAt: string
  }> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (sampleSize) {
      formData.append('sampleSize', sampleSize.toString())
    }

    return await apiUpload('/validation/preview', formData)
  },

  /**
   * Lista jobs de validação
   */
  async getValidationJobs(filters: ValidationFilters) {
    return await apiGetPaginated<ValidationJob>('/validation/jobs', filters)
  },

  /**
   * Busca job por ID
   */
  async getValidationJobById(id: string): Promise<ValidationJob> {
    return await apiGet<{ validationJob: ValidationJob }>(`/validation/jobs/${id}`)
      .then(response => response.validationJob)
  },

  /**
   * Obtém detalhes completos do job
   */
  async getValidationJobDetails(id: string): Promise<ValidationJob> {
    return await apiGet<{ validationJob: ValidationJob }>(`/validation/jobs/${id}/details`)
      .then(response => response.validationJob)
  },

  /**
   * Download dos resultados
   */
  async downloadValidationResults(
    jobId: string,
    format: 'csv' | 'excel' | 'json' = 'csv'
  ): Promise<void> {
    await apiDownload(`/validation/jobs/${jobId}/download?format=${format}`)
  },

  /**
   * Reprocessa job
   */
  async reprocessValidationJob(id: string, data: {
    newConfig?: any
    forceReprocess?: boolean
  }): Promise<ValidationJob> {
    return await apiPost<{ validationJob: ValidationJob }>(`/validation/jobs/${id}/reprocess`, data)
      .then(response => response.validationJob)
  },

  /**
   * Cancela job em processamento
   */
  async cancelValidationJob(id: string, reason: string): Promise<{
    jobId: string
    cancelledBy: string
    cancelledAt: string
    reason: string
  }> {
    return await apiPost(`/validation/jobs/${id}/cancel`, { reason })
  },

  /**
   * Exclui job
   */
  async deleteValidationJob(id: string): Promise<{
    deletedJobId: string
    deletedBy: string
    deletedAt: string
  }> {
    return await apiDelete(`/validation/jobs/${id}`)
  },

  /**
   * Valida configuração de mapeamento
   */
  async validateMappingConfig(config: any): Promise<{
    valid: boolean
    issues: any[]
    mappings: number
    rules: number
    validatedAt: string
  }> {
    return await apiPost('/validation/validate-config', config)
  },

  /**
   * Obtém templates de mapeamento
   */
  async getMappingTemplates(): Promise<{
    templates: any[]
    availableFields: any[]
    count: number
  }> {
    return await apiGet('/validation/templates')
  },

  /**
   * Obtém estatísticas de validação
   */
  async getValidationStats(period?: '7d' | '30d' | '90d' | 'all'): Promise<{
    stats: any
    period: string
    scope: string
    generatedAt: string
  }> {
    return await apiGet('/validation/stats', { period })
  },

  /**
   * Gera relatório de validações
   */
  async generateValidationReport(options: {
    startDate?: string
    endDate?: string
    campaignId?: string
    adminId?: string
    groupBy?: 'day' | 'week' | 'month' | 'admin'
    includeDetails?: boolean
    format?: 'json' | 'csv' | 'excel'
    includeErrorDetails?: boolean
  }): Promise<any> {
    return await apiGet('/validation/report', options)
  },
}
