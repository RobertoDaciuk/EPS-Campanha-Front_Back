/**
 * @file fastify.d.ts
 * @version 2.0.0
 * @description Declarações de tipos TypeScript para estender interfaces do Fastify.
 * Define tipos personalizados, extensões de request/reply e configurações globais.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Declarações completas para extensões Fastify
 * - Tipos para autenticação e autorização
 * - Interfaces para responses padronizadas
 * - Tipos para validação de schemas
 */

import { FastifyRequest as OriginalFastifyRequest, FastifyReply as OriginalFastifyReply } from 'fastify';
import { UserRole, UserStatus } from '@prisma/client';

/**
 * Interface para usuário autenticado
 */
declare interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: UserRole;
  status: UserStatus;
  opticName: string;
  opticCNPJ: string;
  managerId?: string;
}

/**
 * Extensão da interface FastifyRequest
 */
declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Usuário autenticado (definido pelo middleware de auth)
     */
    user?: AuthenticatedUser;
    
    /**
     * Indica se a requisição está autenticada
     */
    isAuthenticated: boolean;
    
    /**
     * Metadata da requisição (para auditoria)
     */
    requestMetadata?: {
      startTime: number;
      requestId: string;
      userAgent?: string;
      realIp?: string;
    };
  }

  interface FastifyReply {
    /**
     * Resposta de sucesso padronizada
     */
    success<T = any>(data?: T, message?: string, statusCode?: number): FastifyReply;
    
    /**
     * Resposta de erro padronizada
     */
    error(message: string, statusCode?: number, details?: any): FastifyReply;
    
    /**
     * Resposta de validação com erros
     */
    validationError(errors: ValidationError[], message?: string): FastifyReply;
    
    /**
     * Resposta paginada
     */
    paginated<T = any>(data: T[], pagination: PaginationInfo, message?: string): FastifyReply;
  }
}

/**
 * Tipos para respostas da API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  pagination?: PaginationInfo;
  timestamp: string;
  requestId?: string;
}

/**
 * Interface para informações de paginação
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Interface para erros de validação
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

/**
 * Tipos para parâmetros de query comuns
 */
export interface CommonQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

/**
 * Interface para filtros de usuários
 */
export interface UserFilters extends CommonQueryParams {
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  managerId?: string;
  opticCNPJ?: string;
}

/**
 * Interface para filtros de campanhas
 */
export interface CampaignFilters extends CommonQueryParams {
  status?: 'ATIVA' | 'CONCLUIDA' | 'EXPIRADA' | 'all';
  startDate?: string;
  endDate?: string;
  managerId?: string;
}

/**
 * Interface para filtros de submissões
 */
export interface SubmissionFilters extends CommonQueryParams {
  status?: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'all';
  campaignId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Interface para filtros de earnings
 */
export interface EarningFilters extends CommonQueryParams {
  status?: 'PENDENTE' | 'PAGO' | 'all';
  type?: 'SELLER' | 'MANAGER' | 'all';
  userId?: string;
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Tipos para parâmetros de rota
 */
export interface RouteParams {
  id?: string;
  userId?: string;
  campaignId?: string;
  submissionId?: string;
  earningId?: string;
  premioId?: string;
  kitId?: string;
  requirementId?: string;
}

/**
 * Interface para contexto de transação
 */
export interface TransactionContext {
  userId: string;
  operation: string;
  metadata?: Record<string, any>;
}

/**
 * Tipos para configuração de rate limiting
 */
export interface RateLimitConfig {
  max: number;
  timeWindow: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: FastifyRequest) => string;
}

/**
 * Interface para logs estruturados
 */
export interface StructuredLog {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

/**
 * Tipos para configuração de cache
 */
export interface CacheConfig {
  ttl: number; // Time to live em segundos
  key: string;
  tags?: string[];
  invalidateOn?: string[];
}

/**
 * Interface para estatísticas do dashboard
 */
export interface DashboardStats {
  totalUsers?: number;
  activeUsers?: number;
  activeCampaigns?: number;
  totalSales?: number;
  totalPoints?: number;
  pendingEarnings?: number;
  [key: string]: number | undefined;
}

/**
 * Tipos para eventos do sistema
 */
export type SystemEvent = 
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_BLOCKED'
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_UPDATED'
  | 'CAMPAIGN_COMPLETED'
  | 'SUBMISSION_CREATED'
  | 'SUBMISSION_VALIDATED'
  | 'SUBMISSION_REJECTED'
  | 'EARNING_CREATED'
  | 'EARNING_PAID'
  | 'PREMIO_REDEEMED'
  | 'VALIDATION_PROCESSED';

/**
 * Interface para eventos do sistema
 */
export interface SystemEventData {
  event: SystemEvent;
  userId?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Tipos para configuração de upload
 */
export interface UploadConfig {
  allowedMimeTypes: string[];
  maxFileSize: number;
  destination: string;
  generateFilename?: (originalName: string) => string;
}

/**
 * Interface para arquivos uploadados
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
}

/**
 * Tipos para configuração de notificações
 */
export interface NotificationConfig {
  type: 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
  template: string;
  recipients: string[];
  data?: Record<string, any>;
  scheduledFor?: string;
}

/**
 * Interface para batch operations
 */
export interface BatchOperation<T = any> {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: T;
  id?: string;
}

/**
 * Interface para resultado de batch operations
 */
export interface BatchResult<T = any> {
  success: T[];
  failed: Array<{
    data: T;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Tipos para métricas de performance
 */
export interface PerformanceMetrics {
  requestDuration: number;
  dbQueryTime?: number;
  cacheHits?: number;
  cacheMisses?: number;
  memoryUsage?: number;
}

/**
 * Interface para configuração de webhook
 */
export interface WebhookConfig {
  url: string;
  events: SystemEvent[];
  secret?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

/**
 * Tipos utilitários para Prisma
 */
export type PrismaModel = 
  | 'user'
  | 'campaign'
  | 'goalRequirement'
  | 'ruleCondition'
  | 'campaignKit'
  | 'campaignSubmission'
  | 'earning'
  | 'activityItem'
  | 'notification'
  | 'premio'
  | 'validationJob';

/**
 * Interface para auditoria
 */
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: PrismaModel;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * Tipos para configuração do ambiente
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Interface para health check
 */
export interface HealthCheckResult {
  status: 'OK' | 'ERROR' | 'DEGRADED';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: 'OK' | 'ERROR';
    cache?: 'OK' | 'ERROR';
    external?: 'OK' | 'ERROR';
  };
  metadata?: Record<string, any>;
}

/**
 * Tipos para relatórios
 */
export interface ReportConfig {
  type: 'SALES' | 'PERFORMANCE' | 'FINANCIAL' | 'USER_ACTIVITY';
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  includeCharts?: boolean;
}

/**
 * Interface para dados de relatório
 */
export interface ReportData {
  title: string;
  description: string;
  generatedAt: string;
  generatedBy: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: Record<string, number>;
  data: Array<Record<string, any>>;
  charts?: Array<{
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: Array<Record<string, any>>;
  }>;
}

/**
 * Export de tipos globais para uso em outros módulos
 */
export type {
  AuthenticatedUser,
  ApiResponse,
  PaginationInfo,
  ValidationError,
  CommonQueryParams,
  RouteParams,
  TransactionContext,
  RateLimitConfig,
  StructuredLog,
  CacheConfig,
  DashboardStats,
  SystemEvent,
  SystemEventData,
  UploadConfig,
  UploadedFile,
  NotificationConfig,
  BatchOperation,
  BatchResult,
  PerformanceMetrics,
  WebhookConfig,
  PrismaModel,
  AuditLog,
  EnvironmentConfig,
  HealthCheckResult,
  ReportConfig,
  ReportData,
};
