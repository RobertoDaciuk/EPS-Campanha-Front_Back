/**
 * @file types/forms.ts
 * @version 2.0.0
 * @description Tipos de formulários
 * @author DevEPS
 * @since 2025-10-21
 */

import { UserRole, UserStatus, CampaignStatus, UnitType } from './index'

// ==================== AUTH FORMS ====================

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

export interface ForgotPasswordForm {
  email: string
}

export interface ResetPasswordForm {
  token: string
  password: string
  confirmPassword: string
}

// ==================== USER FORMS ====================

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

export interface UserUpdateForm {
  name?: string
  whatsapp?: string
  opticName?: string
  avatarUrl?: string
  managerId?: string
}

export interface UserStatusForm {
  status: UserStatus
  reason: string
}

export interface UserPasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// ==================== CAMPAIGN FORMS ====================

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

export interface CampaignUpdateForm {
  title?: string
  description?: string
  imageUrl?: string
  startDate?: string
  endDate?: string
  pointsOnCompletion?: number
  managerPointsPercentage?: number
  status?: CampaignStatus
}

export interface CampaignStatusForm {
  status: CampaignStatus
  reason?: string
}

// ==================== SUBMISSION FORMS ====================

export interface SubmissionForm {
  campaignId: string
  requirementId: string
  orderNumber: string
  quantity: number
  notes?: string
}

export interface SubmissionUpdateForm {
  orderNumber?: string
  quantity?: number
  notes?: string
}

export interface SubmissionValidationForm {
  status: 'VALIDATED' | 'REJECTED'
  validationMessage?: string
  internalNotes?: string
}

export interface BulkValidationForm {
  submissionIds: string[]
  action: 'validate' | 'reject' | 'pending'
  validationMessage?: string
  internalNotes?: string
  applyToAll: boolean
}

// ==================== PREMIO FORMS ====================

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

export interface PremioUpdateForm {
  title?: string
  description?: string
  imageUrl?: string
  pointsRequired?: number
  stock?: number
  category?: string
  priority?: number
  isActive?: boolean
}

export interface PremioRedeemForm {
  premioId: string
  deliveryAddress?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  notes?: string
}

export interface StockUpdateForm {
  operation: 'add' | 'subtract' | 'set'
  quantity: number
  reason: string
}

export interface RestockForm {
  quantity: number
  reason: string
}

// ==================== EARNING FORMS ====================

export interface EarningForm {
  type: 'SELLER' | 'MANAGER'
  userId: string
  campaignId: string
  amount: number
  description?: string
}

export interface MarkEarningPaidForm {
  paymentMethod: string
  paymentReference?: string
  notes?: string
}

export interface BulkEarningProcessForm {
  earningIds: string[]
  action: 'mark_as_paid' | 'cancel'
  paymentMethod?: string
  reason?: string
  applyToAll: boolean
}

// ==================== VALIDATION FORMS ====================

export interface ValidationConfigForm {
  campaignId: string
  isDryRun: boolean
  mapping: {
    orderNumberColumn: string
    quantityColumn: string
    dateColumn?: string
    hasHeaders: boolean
    startRow: number
  }
  validation: {
    allowDuplicates: boolean
    validateOrderFormat: boolean
    validateQuantity: boolean
    validateDates: boolean
  }
}

export interface ValidationUploadForm {
  file: File
  config: ValidationConfigForm
  previewOnly?: boolean
  maxRows?: number
}

// ==================== FILTER FORMS ====================

export interface DateRangeForm {
  startDate: string
  endDate: string
}

export interface ReportFiltersForm extends DateRangeForm {
  campaignId?: string
  userId?: string
  groupBy: 'day' | 'week' | 'month' | 'campaign' | 'user'
  includeDetails: boolean
  format: 'json' | 'csv' | 'excel'
}

export interface SearchForm {
  query: string
  filters?: Record<string, any>
}

// ==================== PROFILE FORMS ====================

export interface ProfileUpdateForm {
  name?: string
  whatsapp?: string
  opticName?: string
  avatarUrl?: string
}

export interface NotificationPreferencesForm {
  emailNotifications: boolean
  pushNotifications: boolean
  soundNotifications: boolean
  marketingEmails: boolean
  reportDigests: boolean
}

export interface SecuritySettingsForm {
  currentPassword: string
  newPassword?: string
  confirmPassword?: string
  twoFactorEnabled?: boolean
}

// ==================== FORM VALIDATION TYPES ====================

export interface FormError {
  field: string
  message: string
  code?: string
}

export interface FormState<T = any> {
  data: T
  errors: Record<string, string>
  isValid: boolean
  isSubmitting: boolean
  isDirty: boolean
  touched: Record<string, boolean>
}

// ==================== FORM FIELD TYPES ====================

export interface FormField {
  name: string
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'file'
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: Array<{ value: string; label: string }>
  validation?: {
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value: any) => string | true
  }
  helperText?: string
  className?: string
}

export interface FormSection {
  title: string
  description?: string
  fields: FormField[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export interface DynamicForm {
  sections: FormSection[]
  submitLabel?: string
  cancelLabel?: string
  onSubmit: (data: Record<string, any>) => Promise<void>
  onCancel?: () => void
  initialData?: Record<string, any>
  loading?: boolean
}
