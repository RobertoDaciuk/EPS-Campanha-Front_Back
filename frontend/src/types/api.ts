/**
 * @file types/api.ts
 * @version 2.0.0
 * @description Tipos de API e responses
 * @author DevEPS
 * @since 2025-10-21
 */

// ==================== BASE API TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters?: any
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

// ==================== AUTH API TYPES ====================

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken: string
  expiresIn: number
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  cpf: string
  whatsapp: string
  opticName: string
  opticCNPJ: string
  terms: boolean
}

export interface RegisterResponse {
  user: User
  token: string
  refreshToken: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  token: string
  refreshToken: string
  expiresIn: number
}

// ==================== USER API TYPES ====================

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  cpf: string
  whatsapp: string
  opticName: string
  opticCNPJ: string
  role: UserRole
  managerId?: string
  avatarUrl?: string
}

export interface CreateUserResponse {
  user: User
}

export interface UpdateUserRequest {
  name?: string
  whatsapp?: string
  opticName?: string
  avatarUrl?: string
  managerId?: string
}

export interface UpdateUserResponse {
  user: User
}

export interface UserStatsResponse {
  stats: {
    total: number
    active: number
    blocked: number
    sellers: number
    managers: number
    admins: number
    newThisMonth: number
    byLevel: Record<string, number>
  }
  generatedAt: string
}

// ==================== CAMPAIGN API TYPES ====================

export interface CreateCampaignRequest {
  title: string
  description: string
  imageUrl?: string
  startDate: string
  endDate: string
  pointsOnCompletion: number
  managerPointsPercentage: number
  goalRequirements: Array<{
    description: string
    quantity: number
    unitType: 'UNIT' | 'PAIR'
  }>
}

export interface CreateCampaignResponse {
  campaign: Campaign
}

export interface CampaignStatsResponse {
  stats: {
    totalCampaigns: number
    activeCampaigns: number
    completedCampaigns: number
    expiredCampaigns: number
    totalParticipants: number
    completionRate: number
    averagePointsAwarded: number
  }
  generatedAt: string
}

// ==================== SUBMISSION API TYPES ====================

export interface CreateSubmissionRequest {
  campaignId: string
  requirementId: string
  orderNumber: string
  quantity: number
  notes?: string
}

export interface CreateSubmissionResponse {
  submission: CampaignSubmission
}

export interface ValidateSubmissionRequest {
  status: 'VALIDATED' | 'REJECTED'
  validationMessage?: string
  internalNotes?: string
}

export interface ValidateSubmissionResponse {
  submission: CampaignSubmission
  pointsAwarded?: {
    seller: number
    manager?: number
  }
  earningsCreated?: string[]
  kitStatusChanged?: boolean
}

export interface BulkValidateRequest {
  submissionIds: string[]
  action: 'validate' | 'reject' | 'pending'
  validationMessage?: string
  applyToAll: boolean
}

export interface BulkValidateResponse {
  processed: number
  successful: number
  failed: number
  details: Array<{
    submissionId: string
    success: boolean
    error?: string
  }>
}

// ==================== EARNING API TYPES ====================

export interface CreateEarningRequest {
  type: EarningType
  userId: string
  campaignId: string
  amount: number
  description?: string
}

export interface CreateEarningResponse {
  earning: Earning
}

export interface MarkEarningPaidRequest {
  paymentMethod: string
  paymentReference?: string
  notes?: string
}

export interface MarkEarningPaidResponse {
  earningId: string
  paidAt: string
  paidBy: string
}

export interface FinancialSummaryResponse {
  summary: {
    totalAccumulated: number
    totalPaid: number
    totalPending: number
    thisMonth: number
    lastMonth: number
    monthlyAverage: number
    paymentsMade: number
    pendingPayments: number
  }
  period: string
  scope: string
  generatedAt: string
}

// ==================== PREMIO API TYPES ====================

export interface CreatePremioRequest {
  title: string
  description: string
  imageUrl: string
  pointsRequired: number
  stock: number
  category?: string
  priority?: number
}

export interface CreatePremioResponse {
  premio: Premio
}

export interface RedeemPremioRequest {
  deliveryAddress?: any
  notes?: string
}

export interface RedeemPremioResponse {
  premioId: string
  userId: string
  redeemedAt: string
  pointsDeducted: number
  newUserPoints: number
}

export interface UpdateStockRequest {
  operation: 'add' | 'subtract' | 'set'
  quantity: number
  reason: string
}

export interface UpdateStockResponse {
  premioId: string
  newStock: number
  operation: string
  quantity: number
  updatedBy: string
  updatedAt: string
}

// ==================== DASHBOARD API TYPES ====================

export interface DashboardStatsResponse {
  campaignsActive: number
  submissionsMonth: number
  pointsMonth: number
  totalUsers?: number
  activeCampaigns?: number
  validatedSalesMonth?: number
  pointsDistributedMonth?: number
  teamSize?: number
  teamPointsMonth?: number
  teamValidatedMonth?: number
  topSeller?: {
    name: string
    points: number
    userId: string
  }
  ranking?: {
    position: number
    total: number
  }
  generatedAt: string
}

export interface RankingResponse {
  ranking: Array<{
    position: number
    userId: string
    userName: string
    userAvatar?: string
    points: number
    level: string
    isCurrentUser?: boolean
  }>
  currentUserPosition?: {
    position: number
    userId: string
    userName: string
    points: number
    level: string
  }
  pagination: any
  filter: string
  generatedAt: string
}

// ==================== VALIDATION API TYPES ====================

export interface ValidationJobResponse {
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
  details?: Array<{
    row: number
    orderNumber: string
    status: 'success' | 'error' | 'warning'
    message?: string
  }>
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

export interface UploadValidationRequest {
  file: File
  campaignId: string
  isDryRun: boolean
  mapping: {
    orderNumberColumn: string
    quantityColumn: string
    dateColumn: string
    hasHeaders: boolean
    startRow: number
  }
}

export interface UploadValidationResponse {
  validationJob: ValidationJobResponse
  preview?: any
}

// ==================== HTTP CLIENT TYPES ====================

export interface RequestConfig {
  timeout?: number
  retries?: number
  headers?: Record<string, string>
  params?: Record<string, any>
}

export interface UploadConfig extends RequestConfig {
  onProgress?: (progress: number) => void
  maxSize?: number
}

// ==================== WEBSOCKET TYPES ====================

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
  userId?: string
}

export interface WebSocketNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  data?: any
  userId: string
  createdAt: string
}

// ==================== SEARCH & FILTER TYPES ====================

export interface SearchFilters {
  search?: string
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

export interface CampaignFilters extends SearchFilters {
  status?: CampaignStatus | 'all'
  hasUserProgress?: boolean
}

export interface SubmissionFilters extends SearchFilters {
  status?: CampaignSubmissionStatus | 'all'
  campaignId?: string
  userId?: string
  validated?: boolean
}

export interface UserFilters extends SearchFilters {
  role?: UserRole | 'all'
  status?: UserStatus | 'all'
  level?: string
  managerId?: string
}

export interface EarningFilters extends SearchFilters {
  status?: EarningStatus | 'all'
  type?: EarningType | 'all'
  campaignId?: string
  userId?: string
}

export interface PremioFilters extends SearchFilters {
  category?: string
  maxPoints?: number
  minPoints?: number
  inStock?: boolean
  isActive?: boolean
}

// ==================== EXPORT/IMPORT TYPES ====================

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json'
  includeHeaders: boolean
  dateFormat: 'iso' | 'br'
  fields?: string[]
}

export interface ImportResult {
  summary: {
    total: number
    successful: number
    failed: number
    skipped: number
  }
  details: Array<{
    row: number
    success: boolean
    data?: any
    error?: string
  }>
}
