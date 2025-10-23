/**
 * @file types/index.ts
 * @version 2.0.0
 * @description Tipos principais da aplicação
 * @author DevEPS
 * @since 2025-10-21
 */

// ==================== ENUMS ====================
export enum UserRole {
  ADMIN = 'ADMIN',
  GERENTE = 'GERENTE', 
  VENDEDOR = 'VENDEDOR'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED'
}

export enum CampaignStatus {
  ATIVA = 'ATIVA',
  CONCLUIDA = 'CONCLUIDA',
  EXPIRADA = 'EXPIRADA'
}

export enum CampaignSubmissionStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED'
}

export enum EarningStatus {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO'
}

export enum EarningType {
  SELLER = 'SELLER',
  MANAGER = 'MANAGER'
}

export enum UnitType {
  UNIT = 'UNIT',
  PAIR = 'PAIR'
}

// ==================== USER TYPES ====================
export interface User {
  id: string
  name: string
  email: string
  cpf: string
  whatsapp: string
  opticName: string
  opticCNPJ: string
  role: UserRole
  status: UserStatus
  level: string
  points: number
  pointsToNextLevel: number
  avatarUrl?: string
  managerId?: string
  manager?: Partial<User>
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

// ==================== CAMPAIGN TYPES ====================
export interface Campaign {
  id: string
  title: string
  description: string
  imageUrl: string
  startDate: string
  endDate: string
  status: CampaignStatus
  pointsOnCompletion: number
  managerPointsPercentage: number
  goalRequirements: GoalRequirement[]
  userProgress?: number
  createdAt: string
  updatedAt: string
}

export interface GoalRequirement {
  id: string
  description: string
  quantity: number
  unitType: UnitType
  campaignId: string
  createdAt: string
  updatedAt: string
}

// ==================== SUBMISSION TYPES ====================
export interface CampaignSubmission {
  id: string
  orderNumber: string
  quantity: number
  submissionDate: string
  status: CampaignSubmissionStatus
  validationMessage?: string
  validatedBy?: string
  validatedAt?: string
  notes?: string
  internalNotes?: string
  user?: User
  campaign?: Campaign
  requirement?: GoalRequirement
  createdAt: string
  updatedAt: string
}

// ==================== EARNING TYPES ====================
export interface Earning {
  id: string
  type: EarningType
  amount: number
  status: EarningStatus
  description?: string
  campaignId: string
  campaign?: Campaign
  userId: string
  user?: User
  submissionId?: string
  paidAt?: string
  paidBy?: string
  paymentMethod?: string
  paymentReference?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// ==================== PREMIO TYPES ====================
export interface Premio {
  id: string
  title: string
  description: string
  imageUrl: string
  pointsRequired: number
  stock: number
  category: string
  priority?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ==================== FORM TYPES ====================
export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  cpf: string
  whatsapp: string
  opticName: string
  opticCNPJ: string
  terms: boolean
}

export interface CampaignForm {
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
    unitType: UnitType
  }>
}

export interface SubmissionForm {
  campaignId: string
  requirementId: string
  orderNumber: string
  quantity: number
  notes?: string
}

export interface UserForm {
  name: string
  email: string
  password?: string
  cpf: string
  whatsapp: string
  opticName: string
  opticCNPJ: string
  role: UserRole
  status?: UserStatus
  avatarUrl?: string
  managerId?: string
}

export interface PremioForm {
  title: string
  description: string
  imageUrl?: string
  pointsRequired: number
  stock: number
  category: string
  priority?: number
  isActive?: boolean
}

// ==================== FILTER TYPES ====================
export interface BaseFilters {
  search?: string
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface UserFilters extends BaseFilters {
  role?: UserRole | 'all'
  status?: UserStatus | 'all'
  level?: string
  managerId?: string
}

export interface CampaignFilters extends BaseFilters {
  status?: CampaignStatus | 'all'
  hasUserProgress?: boolean
}

export interface SubmissionFilters extends BaseFilters {
  status?: CampaignSubmissionStatus | 'all'
  campaignId?: string
  userId?: string
  validated?: boolean
}

// ==================== TABLE TYPES ====================
export interface TableColumn<T = any> {
  key: string
  label: string | React.ReactNode
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (item: T, index: number) => React.ReactNode
  className?: string
}

// ==================== CHART TYPES ====================
export interface ChartDataPoint {
  name: string
  value: number
  label?: string
  color?: string
  metadata?: Record<string, any>
}

// ==================== API RESPONSE TYPES ====================
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
}

// ==================== EXPORT ALL ====================
export * from './api'
export * from './forms'
export * from './charts'
