/**
 * @file utils/constants.ts
 * @version 2.0.0
 * @description Constantes da aplicação
 * @author DevEPS
 * @since 2025-10-21
 */

// ==================== API CONSTANTS ====================
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  CAMPAIGNS: '/campaigns',
  SUBMISSIONS: '/submissions',
  EARNINGS: '/earnings',
  PREMIOS: '/premios',
  DASHBOARD: '/dashboard',
  VALIDATION: '/validation',
} as const

// ==================== LOCAL STORAGE KEYS ====================
export const STORAGE_KEYS = {
  TOKEN: 'eps_token',
  REFRESH_TOKEN: 'eps_refresh_token',
  USER: 'eps_user',
  THEME: 'eps_theme',
  PREFERENCES: 'eps_preferences',
} as const

// ==================== PAGINATION ====================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  LIMITS: [10, 20, 50, 100] as const,
} as const

// ==================== USER LEVELS ====================
export const USER_LEVELS = {
  BRONZE: { name: 'Bronze', minPoints: 0, color: '#CD7F32' },
  PRATA: { name: 'Prata', minPoints: 1000, color: '#C0C0C0' },
  OURO: { name: 'Ouro', minPoints: 2500, color: '#FFD700' },
  PLATINA: { name: 'Platina', minPoints: 5000, color: '#E5E4E2' },
  DIAMANTE: { name: 'Diamante', minPoints: 10000, color: '#B9F2FF' },
} as const

// ==================== STATUS COLORS ====================
export const STATUS_COLORS = {
  // Campaign status
  ATIVA: '#22c55e',
  CONCLUIDA: '#3b82f6',
  EXPIRADA: '#6b7280',
  
  // Submission status
  PENDING: '#f59e0b',
  VALIDATED: '#22c55e',
  REJECTED: '#ef4444',
  
  // Earning status
  PENDENTE: '#f59e0b',
  PAGO: '#22c55e',
  
  // User status
  ACTIVE: '#22c55e',
  BLOCKED: '#ef4444',
} as const

// ==================== FORM LIMITS ====================
export const FORM_LIMITS = {
  NAME: { min: 2, max: 100 },
  EMAIL: { max: 255 },
  PASSWORD: { min: 6, max: 128 },
  CPF: { length: 11 },
  CNPJ: { length: 14 },
  PHONE: { min: 10, max: 15 },
  COMPANY_NAME: { min: 2, max: 100 },
  ORDER_NUMBER: { min: 3, max: 50 },
  QUANTITY: { min: 1, max: 1000 },
  POINTS: { min: 0, max: 1000000 },
  DESCRIPTION: { max: 500 },
  NOTES: { max: 1000 },
} as const

// ==================== FILE UPLOAD ====================
export const FILE_UPLOAD = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    SPREADSHEETS: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ],
    DOCUMENTS: ['application/pdf', 'application/msword'],
  },
  EXTENSIONS: {
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    SPREADSHEETS: ['.xlsx', '.xls', '.csv'],
    DOCUMENTS: ['.pdf', '.doc', '.docx'],
  },
} as const

// ==================== MESSAGES ====================
export const MESSAGES = {
  SUCCESS: {
    LOGIN: 'Login realizado com sucesso!',
    LOGOUT: 'Logout realizado com sucesso!',
    REGISTER: 'Conta criada com sucesso!',
    PROFILE_UPDATE: 'Perfil atualizado com sucesso!',
    CAMPAIGN_CREATE: 'Campanha criada com sucesso!',
    CAMPAIGN_UPDATE: 'Campanha atualizada com sucesso!',
    SUBMISSION_CREATE: 'Submissão criada com sucesso!',
    SUBMISSION_VALIDATE: 'Submissão validada com sucesso!',
    PREMIO_REDEEM: 'Prêmio resgatado com sucesso!',
  },
  ERROR: {
    GENERIC: 'Ocorreu um erro inesperado',
    NETWORK: 'Erro de conexão. Verifique sua internet.',
    UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
    FORBIDDEN: 'Você não tem permissão para esta ação.',
    NOT_FOUND: 'Recurso não encontrado.',
    VALIDATION: 'Dados inválidos. Verifique os campos.',
    SERVER: 'Erro interno do servidor. Tente novamente.',
  },
  LOADING: {
    LOGIN: 'Fazendo login...',
    REGISTER: 'Criando conta...',
    LOADING: 'Carregando...',
    SAVING: 'Salvando...',
    UPDATING: 'Atualizando...',
    DELETING: 'Excluindo...',
    UPLOADING: 'Enviando arquivo...',
  },
} as const

// ==================== QUERY KEYS ====================
export const QUERY_KEYS = {
  AUTH: ['auth'] as const,
  USER: ['user'] as const,
  USERS: ['users'] as const,
  CAMPAIGNS: ['campaigns'] as const,
  SUBMISSIONS: ['submissions'] as const,
  EARNINGS: ['earnings'] as const,
  PREMIOS: ['premios'] as const,
  DASHBOARD: ['dashboard'] as const,
  NOTIFICATIONS: ['notifications'] as const,
  RANKING: ['ranking'] as const,
  ACTIVITY: ['activity'] as const,
} as const

// ==================== ROUTES ====================
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/app/dashboard',
  CAMPAIGNS: '/app/campaigns',
  PREMIOS: '/app/premios',
  SUBMISSIONS: '/app/submissions',
  USERS: '/app/users',
  EARNINGS: '/app/earnings',
  PROFILE: '/app/profile',
  VALIDATION: '/app/validation',
  UNAUTHORIZED: '/unauthorized',
} as const

// ==================== DATE FORMATS ====================
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  BRAZIL: 'DD/MM/YYYY',
  BRAZIL_TIME: 'DD/MM/YYYY HH:mm',
  TIME: 'HH:mm',
  RELATIVE: 'relative', // "há 2 horas"
} as const

// ==================== THEME CONSTANTS ====================
export const THEME = {
  COLORS: {
    PRIMARY: '#0ea5e9',
    SUCCESS: '#22c55e',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
} as const

// ==================== ANIMATION DURATIONS ====================
export const ANIMATIONS = {
  FAST: 0.15,
  NORMAL: 0.3,
  SLOW: 0.5,
  VERY_SLOW: 0.8,
} as const

// ==================== VALIDATION PATTERNS ====================
export const PATTERNS = {
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  PHONE: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  ORDER_NUMBER: /^[A-Z0-9\-_]{3,50}$/i,
} as const

// ==================== CACHE TIMES ====================
export const CACHE_TIME = {
  SHORT: 1 * 60 * 1000, // 1 minuto
  MEDIUM: 5 * 60 * 1000, // 5 minutos
  LONG: 30 * 60 * 1000, // 30 minutos
  VERY_LONG: 60 * 60 * 1000, // 1 hora
} as const

// ==================== TOAST DURATIONS ====================
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
  PERMANENT: 0,
} as const
