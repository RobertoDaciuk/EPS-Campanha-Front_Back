/**
 * @file submission.schema.ts
 * @version 2.0.0
 * @description Schemas de validação Zod para submissões de vendas em campanhas.
 * Define estruturas para submissão, validação e gerenciamento de vendas.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos schemas de submissão
 * - Validação de números de pedido únicos
 * - Sistema de kits e cartelas
 * - Validação automática de regras de campanha
 * - Schemas para relatórios de submissões
 */

import { z } from 'zod';
import { CampaignSubmissionStatus } from '@prisma/client';

// ==================== SCHEMAS BÁSICOS ====================

/**
 * Schema para validação de UUID
 */
const uuidSchema = z
  .string({
    required_error: 'ID é obrigatório',
    invalid_type_error: 'ID deve ser um texto',
  })
  .uuid('ID deve ser um UUID válido');

/**
 * Schema para validação de número de pedido
 */
const orderNumberSchema = z
  .string({
    required_error: 'Número do pedido é obrigatório',
    invalid_type_error: 'Número do pedido deve ser um texto',
  })
  .min(1, 'Número do pedido é obrigatório')
  .max(50, 'Número do pedido deve ter no máximo 50 caracteres')
  .regex(
    /^[A-Za-z0-9\-_]+$/,
    'Número do pedido deve conter apenas letras, números, hífens e underscores'
  )
  .transform((orderNum) => orderNum.trim().toUpperCase());

/**
 * Schema para validação de quantidade
 */
const quantitySchema = z
  .number({
    required_error: 'Quantidade é obrigatória',
    invalid_type_error: 'Quantidade deve ser um número',
  })
  .int('Quantidade deve ser um número inteiro')
  .min(1, 'Quantidade deve ser maior que zero')
  .max(1000, 'Quantidade não pode exceder 1000');

/**
 * Schema para validação de status de submissão
 */
const submissionStatusSchema = z.nativeEnum(CampaignSubmissionStatus, {
  required_error: 'Status da submissão é obrigatório',
  invalid_type_error: 'Status da submissão inválido',
});

/**
 * Schema para validação de mensagem de validação
 */
const validationMessageSchema = z
  .string()
  .max(500, 'Mensagem de validação deve ter no máximo 500 caracteres')
  .optional();

/**
 * Schema para validação de data de submissão
 */
const submissionDateSchema = z
  .string()
  .datetime('Data de submissão deve estar no formato ISO 8601')
  .optional()
  .default(() => new Date().toISOString())
  .transform((date) => date || new Date().toISOString());

// ==================== SCHEMAS PRINCIPAIS ====================

/**
 * Schema para criação de submissão de venda
 */
export const createSubmissionSchema = z.object({
  campaignId: uuidSchema,
  requirementId: uuidSchema,
  kitId: uuidSchema.optional(), // Se não fornecido, será criado automaticamente
  orderNumber: orderNumberSchema,
  quantity: quantitySchema.optional().default(1),
  notes: z
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional(),
  attachments: z
    .array(z.object({
      filename: z.string().min(1, 'Nome do arquivo é obrigatório'),
      url: z.string().url('URL do anexo deve ser válida'),
      type: z.enum(['image', 'document', 'other']).default('other'),
    }))
    .max(10, 'Máximo de 10 anexos por submissão')
    .optional(),
});

/**
 * Schema para atualização de submissão
 */
export const updateSubmissionSchema = z.object({
  orderNumber: orderNumberSchema.optional(),
  quantity: quantitySchema.optional(),
  status: submissionStatusSchema.optional(),
  validationMessage: validationMessageSchema,
  notes: z
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional(),
  attachments: z
    .array(z.object({
      filename: z.string().min(1, 'Nome do arquivo é obrigatório'),
      url: z.string().url('URL do anexo deve ser válida'),
      type: z.enum(['image', 'document', 'other']).default('other'),
    }))
    .max(10, 'Máximo de 10 anexos por submissão')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser fornecido para atualização' }
);

/**
 * Schema para parâmetros de rota de submissão
 */
export const submissionParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema para filtros de consulta de submissões
 */
export const submissionFiltersSchema = z.object({
  // Paginação
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .pipe(z.number().int().min(1, 'Página deve ser maior que 0'))
    .optional()
    .default('1')
    .transform((val) => parseInt(val)),
  
  limit: z
    .string()
    .transform((val) => parseInt(val) || 10)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default('10')
    .transform((val) => parseInt(val)),

  // Ordenação
  sort: z
    .enum(['submissionDate', 'orderNumber', 'quantity', 'status', 'createdAt'])
    .optional()
    .default('submissionDate'),
  
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),

  // Filtros básicos
  search: z
    .string()
    .min(1, 'Termo de busca deve ter pelo menos 1 caractere')
    .max(100, 'Termo de busca deve ter no máximo 100 caracteres')
    .optional(),

  status: z
    .enum([...Object.values(CampaignSubmissionStatus), 'all'])
    .optional()
    .default('all'),

  // Filtros por relacionamentos
  campaignId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  requirementId: uuidSchema.optional(),
  kitId: uuidSchema.optional(),

  // Filtros por data
  submittedAfter: z
    .string()
    .datetime('Data deve estar no formato ISO 8601')
    .optional(),
  
  submittedBefore: z
    .string()
    .datetime('Data deve estar no formato ISO 8601')
    .optional(),

  // Filtros por quantidade
  minQuantity: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(1))
    .optional(),
  
  maxQuantity: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(1))
    .optional(),

  // Filtro para submissões com anexos
  hasAttachments: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),

  // Filtro para submissões com observações
  hasNotes: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),

  // Filtro para ótica (via CNPJ)
  opticCNPJ: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter exatamente 14 dígitos')
    .optional(),
}).refine(
  (data) => {
    // Se minQuantity e maxQuantity forem fornecidos, minQuantity deve ser menor que maxQuantity
    if (data.minQuantity !== undefined && data.maxQuantity !== undefined) {
      return data.minQuantity <= data.maxQuantity;
    }
    return true;
  },
  {
    message: 'Quantidade mínima deve ser menor ou igual à máxima',
    path: ['minQuantity'],
  }
).refine(
  (data) => {
    // Se submittedAfter e submittedBefore forem fornecidos, submittedAfter deve ser anterior a submittedBefore
    if (data.submittedAfter && data.submittedBefore) {
      return new Date(data.submittedAfter) <= new Date(data.submittedBefore);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior à data final',
    path: ['submittedAfter'],
  }
);

/**
 * Schema para validação de submissão (admin/gerente)
 */
export const validateSubmissionSchema = z.object({
  status: z.enum([CampaignSubmissionStatus.VALIDATED, CampaignSubmissionStatus.REJECTED]),
  validationMessage: z
    .string()
    .min(5, 'Mensagem de validação deve ter pelo menos 5 caracteres')
    .max(500, 'Mensagem de validação deve ter no máximo 500 caracteres'),
  validatedQuantity: quantitySchema.optional(),
  internalNotes: z
    .string()
    .max(1000, 'Observações internas devem ter no máximo 1000 caracteres')
    .optional(),
});

/**
 * Schema para validação em lote de submissões
 */
export const bulkValidateSubmissionsSchema = z.object({
  submissionIds: z
    .array(uuidSchema)
    .min(1, 'Pelo menos uma submissão deve ser selecionada')
    .max(100, 'Máximo de 100 submissões por lote'),
  
  action: z.enum(['validate', 'reject', 'pending']),
  
  validationMessage: z
    .string()
    .min(5, 'Mensagem de validação deve ter pelo menos 5 caracteres')
    .max(500, 'Mensagem de validação deve ter no máximo 500 caracteres'),
  
  applyToAll: z
    .boolean()
    .optional()
    .default(true),
});

/**
 * Schema para relatório de submissões
 */
export const submissionReportSchema = z.object({
  startDate: z
    .string()
    .datetime('Data de início deve estar no formato ISO 8601')
    .optional(),
  
  endDate: z
    .string()
    .datetime('Data de fim deve estar no formato ISO 8601')
    .optional(),

  campaignId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  
  groupBy: z
    .enum(['day', 'week', 'month', 'campaign', 'user', 'requirement'])
    .optional()
    .default('day'),
  
  includeDetails: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  
  format: z
    .enum(['json', 'csv', 'excel'])
    .optional()
    .default('json'),

  status: z
    .enum([...Object.values(CampaignSubmissionStatus), 'all'])
    .optional()
    .default('all'),
});

/**
 * Schema para duplicação de submissão
 */
export const duplicateSubmissionSchema = z.object({
  submissionId: uuidSchema,
  newOrderNumber: orderNumberSchema,
  newQuantity: quantitySchema.optional(),
  newKitId: uuidSchema.optional(),
});

/**
 * Schema para transferência de submissão entre kits
 */
export const transferSubmissionSchema = z.object({
  submissionId: uuidSchema,
  targetKitId: uuidSchema,
  reason: z
    .string()
    .min(5, 'Motivo deve ter pelo menos 5 caracteres')
    .max(200, 'Motivo deve ter no máximo 200 caracteres'),
});

/**
 * Schema para estatísticas de submissão por usuário
 */
export const userSubmissionStatsSchema = z.object({
  userId: uuidSchema,
  period: z
    .enum(['day', 'week', 'month', 'quarter', 'year', 'all'])
    .optional()
    .default('month'),
  
  campaignId: uuidSchema.optional(),
  
  includeBreakdown: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

// ==================== TIPOS INFERIDOS ====================

export type CreateSubmissionData = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionData = z.infer<typeof updateSubmissionSchema>;
export type SubmissionParams = z.infer<typeof submissionParamsSchema>;
export type SubmissionFilters = z.infer<typeof submissionFiltersSchema>;
export type ValidateSubmissionData = z.infer<typeof validateSubmissionSchema>;
export type BulkValidateSubmissionsData = z.infer<typeof bulkValidateSubmissionsSchema>;
export type SubmissionReportQuery = z.infer<typeof submissionReportSchema>;
export type DuplicateSubmissionData = z.infer<typeof duplicateSubmissionSchema>;
export type TransferSubmissionData = z.infer<typeof transferSubmissionSchema>;
export type UserSubmissionStatsQuery = z.infer<typeof userSubmissionStatsSchema>;

// ==================== UTILITÁRIOS DE VALIDAÇÃO ====================

/**
 * Valida dados de criação de submissão
 */
export const validateCreateSubmission = (data: unknown) => {
  return createSubmissionSchema.safeParse(data);
};

/**
 * Valida dados de atualização de submissão
 */
export const validateUpdateSubmission = (data: unknown) => {
  return updateSubmissionSchema.safeParse(data);
};

/**
 * Valida filtros de consulta
 */
export const validateSubmissionFilters = (data: unknown) => {
  return submissionFiltersSchema.safeParse(data);
};

/**
 * Valida dados de validação de submissão
 */
export const validateSubmissionValidation = (data: unknown) => {
  return validateSubmissionSchema.safeParse(data);
};

// ==================== SCHEMAS DE RESPOSTA ====================

/**
 * Schema para resposta de submissão
 */
export const submissionResponseSchema = z.object({
  id: uuidSchema,
  orderNumber: z.string(),
  quantity: z.number().int().min(1),
  status: submissionStatusSchema,
  submissionDate: z.string().datetime(),
  validationMessage: z.string().optional(),
  notes: z.string().optional(),
  
  // Relacionamentos
  campaignId: uuidSchema,
  userId: uuidSchema,
  requirementId: uuidSchema,
  kitId: uuidSchema,
  
  // Dados do usuário
  user: z.object({
    id: uuidSchema,
    name: z.string(),
    email: z.string().email(),
    opticName: z.string(),
  }),
  
  // Dados da campanha
  campaign: z.object({
    id: uuidSchema,
    title: z.string(),
    status: z.enum(['ATIVA', 'CONCLUIDA', 'EXPIRADA']),
  }),
  
  // Dados da meta
  requirement: z.object({
    id: uuidSchema,
    description: z.string(),
    quantity: z.number().int().min(1),
    unitType: z.enum(['UNIT', 'PAIR']),
  }),
  
  // Anexos
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    type: z.enum(['image', 'document', 'other']),
  })).optional(),
  
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema para resposta paginada de submissões
 */
export const paginatedSubmissionsResponseSchema = z.object({
  data: z.array(submissionResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  summary: z.object({
    totalSubmissions: z.number().int().min(0),
    pendingSubmissions: z.number().int().min(0),
    validatedSubmissions: z.number().int().min(0),
    rejectedSubmissions: z.number().int().min(0),
    totalQuantity: z.number().int().min(0),
  }).optional(),
});

/**
 * Schema para resposta de validação em lote
 */
export const bulkValidationResponseSchema = z.object({
  processed: z.number().int().min(0),
  successful: z.number().int().min(0),
  failed: z.number().int().min(0),
  details: z.array(z.object({
    submissionId: uuidSchema,
    success: z.boolean(),
    message: z.string(),
  })),
});

// ==================== CONSTANTES ====================

/**
 * Status disponíveis para submissões
 */
export const SUBMISSION_STATUSES = Object.values(CampaignSubmissionStatus);

/**
 * Tipos de anexo suportados
 */
export const ATTACHMENT_TYPES = [
  'image',
  'document',
  'other',
] as const;

/**
 * Formatos de arquivo suportados para anexos
 */
export const SUPPORTED_FILE_FORMATS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
  other: ['zip', 'rar', '7z'],
} as const;

/**
 * Mensagens de erro específicas para submissões
 */
export const SUBMISSION_ERROR_MESSAGES = {
  NOT_FOUND: 'Submissão não encontrada',
  ORDER_NUMBER_EXISTS: 'Número de pedido já foi utilizado',
  CAMPAIGN_NOT_ACTIVE: 'Campanha não está ativa',
  REQUIREMENT_NOT_FOUND: 'Meta da campanha não encontrada',
  KIT_NOT_FOUND: 'Kit não encontrado',
  INVALID_QUANTITY: 'Quantidade inválida',
  CANNOT_UPDATE_VALIDATED: 'Não é possível alterar submissão já validada',
  CANNOT_DELETE_VALIDATED: 'Não é possível excluir submissão já validada',
  INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes para esta operação',
  ATTACHMENT_TOO_LARGE: 'Arquivo muito grande',
  INVALID_FILE_FORMAT: 'Formato de arquivo não suportado',
  MAX_ATTACHMENTS_EXCEEDED: 'Número máximo de anexos excedido',
} as const;

/**
 * Labels para status de submissão
 */
export const SUBMISSION_STATUS_LABELS = {
  [CampaignSubmissionStatus.PENDING]: 'Pendente',
  [CampaignSubmissionStatus.VALIDATED]: 'Validada',
  [CampaignSubmissionStatus.REJECTED]: 'Rejeitada',
} as const;

/**
 * Configurações padrão de submissões
 */
export const SUBMISSION_DEFAULTS = {
  QUANTITY: 1,
  STATUS: CampaignSubmissionStatus.PENDING,
  MAX_ATTACHMENTS: 10,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BULK_VALIDATION: 100,
} as const;

/**
 * Regras de negócio para submissões
 */
export const SUBMISSION_RULES = {
  ORDER_NUMBER_MIN_LENGTH: 1,
  ORDER_NUMBER_MAX_LENGTH: 50,
  QUANTITY_MIN: 1,
  QUANTITY_MAX: 1000,
  NOTES_MAX_LENGTH: 1000,
  VALIDATION_MESSAGE_MIN_LENGTH: 5,
  VALIDATION_MESSAGE_MAX_LENGTH: 500,
  INTERNAL_NOTES_MAX_LENGTH: 1000,
} as const;

/**
 * Períodos disponíveis para relatórios
 */
export const REPORT_PERIODS = [
  'day',
  'week', 
  'month',
  'quarter',
  'year',
  'all',
] as const;

/**
 * Opções de agrupamento para relatórios
 */
export const REPORT_GROUP_BY_OPTIONS = [
  'day',
  'week',
  'month',
  'campaign',
  'user',
  'requirement',
] as const;

/**
 * Formatos de exportação disponíveis
 */
export const EXPORT_FORMATS = [
  'json',
  'csv',
  'excel',
] as const;
