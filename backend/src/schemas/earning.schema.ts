/**
 * @file earning.schema.ts
 * @version 2.0.0
 * @description Schemas de validação Zod para operações com ganhos/earnings.
 * Define estruturas para sistema financeiro, pagamentos e relatórios.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos schemas de earning
 * - Validação de valores monetários
 * - Sistema de pagamentos e aprovações
 * - Relatórios financeiros detalhados
 * - Auditoria de transações financeiras
 */

import { z } from 'zod';
import { EarningStatus, EarningType } from '@prisma/client';

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
 * Schema para validação de valores monetários
 */
const monetaryValueSchema = z
  .number({
    required_error: 'Valor é obrigatório',
    invalid_type_error: 'Valor deve ser um número',
  })
  .min(0.01, 'Valor deve ser maior que zero')
  .max(1000000, 'Valor não pode exceder R$ 1.000.000,00')
  .multipleOf(0.01, 'Valor deve ter no máximo 2 casas decimais');

/**
 * Schema para validação de tipo de earning
 */
const earningTypeSchema = z.nativeEnum(EarningType, {
  required_error: 'Tipo de ganho é obrigatório',
  invalid_type_error: 'Tipo de ganho inválido',
});

/**
 * Schema para validação de status de earning
 */
const earningStatusSchema = z.nativeEnum(EarningStatus, {
  required_error: 'Status do ganho é obrigatório',
  invalid_type_error: 'Status do ganho inválido',
});

/**
 * Schema para validação de data
 */
const dateTimeSchema = z
  .string()
  .datetime('Data deve estar no formato ISO 8601');

/**
 * Schema para validação de nome de usuário
 */
const userNameSchema = z
  .string({
    required_error: 'Nome do usuário é obrigatório',
    invalid_type_error: 'Nome do usuário deve ser um texto',
  })
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .transform((name) => name.trim());

/**
 * Schema para validação de título de campanha
 */
const campaignTitleSchema = z
  .string({
    required_error: 'Título da campanha é obrigatório',
    invalid_type_error: 'Título da campanha deve ser um texto',
  })
  .min(1, 'Título da campanha é obrigatório')
  .max(100, 'Título da campanha deve ter no máximo 100 caracteres')
  .transform((title) => title.trim());

/**
 * Schema para validação de URL de avatar
 */
const avatarUrlSchema = z
  .string()
  .url('URL do avatar deve ser válida')
  .or(z.literal(''))
  .transform((url) => url || 'https://i.pravatar.cc/150');

// ==================== SCHEMAS PRINCIPAIS ====================

/**
 * Schema para criação de earning
 */
export const createEarningSchema = z.object({
  type: earningTypeSchema,
  userId: uuidSchema,
  userName: userNameSchema,
  userAvatarUrl: avatarUrlSchema.optional(),
  campaignId: uuidSchema,
  campaignTitle: campaignTitleSchema,
  kitId: uuidSchema,
  sourceUserName: z
    .string()
    .min(2, 'Nome do vendedor deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do vendedor deve ter no máximo 100 caracteres')
    .optional(),
  amount: monetaryValueSchema,
  earningDate: dateTimeSchema.optional().default(() => new Date().toISOString()),
  status: earningStatusSchema.optional().default(EarningStatus.PENDENTE),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  metadata: z
    .record(z.any())
    .optional(),
}).refine(
  (data) => {
    // Ganhos de gerente devem ter sourceUserName
    if (data.type === EarningType.MANAGER) {
      return !!data.sourceUserName;
    }
    return true;
  },
  {
    message: 'Ganhos de gerente devem especificar o vendedor origem',
    path: ['sourceUserName'],
  }
);

/**
 * Schema para atualização de earning
 */
export const updateEarningSchema = z.object({
  userName: userNameSchema.optional(),
  userAvatarUrl: avatarUrlSchema.optional(),
  campaignTitle: campaignTitleSchema.optional(),
  sourceUserName: z
    .string()
    .min(2, 'Nome do vendedor deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do vendedor deve ter no máximo 100 caracteres')
    .optional(),
  amount: monetaryValueSchema.optional(),
  status: earningStatusSchema.optional(),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  metadata: z
    .record(z.any())
    .optional(),
  
  // Campos para pagamento
  paymentDate: dateTimeSchema.optional(),
  paymentMethod: z
    .enum(['bank_transfer', 'pix', 'check', 'cash', 'other'])
    .optional(),
  paymentReference: z
    .string()
    .max(100, 'Referência de pagamento deve ter no máximo 100 caracteres')
    .optional(),
  paymentNotes: z
    .string()
    .max(1000, 'Observações de pagamento devem ter no máximo 1000 caracteres')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser fornecido para atualização' }
);

/**
 * Schema para parâmetros de rota de earning
 */
export const earningParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema para filtros de consulta de earnings
 */
export const earningFiltersSchema = z.object({
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
    .enum(['earningDate', 'amount', 'userName', 'campaignTitle', 'status', 'createdAt'])
    .optional()
    .default('earningDate'),
  
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

  type: z
    .enum([...Object.values(EarningType), 'all'])
    .optional()
    .default('all'),

  status: z
    .enum([...Object.values(EarningStatus), 'all'])
    .optional()
    .default('all'),

  // Filtros por relacionamentos
  userId: uuidSchema.optional(),
  campaignId: uuidSchema.optional(),
  kitId: uuidSchema.optional(),

  // Filtros por data
  earningAfter: dateTimeSchema.optional(),
  earningBefore: dateTimeSchema.optional(),

  // Filtros por valor
  minAmount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0))
    .optional(),
  
  maxAmount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0))
    .optional(),

  // Filtro por método de pagamento
  paymentMethod: z
    .enum(['bank_transfer', 'pix', 'check', 'cash', 'other', 'all'])
    .optional()
    .default('all'),

  // Filtros por ótica
  opticCNPJ: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter exatamente 14 dígitos')
    .optional(),

  // Filtro para earnings pendentes há mais de X dias
  pendingDaysThreshold: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(1).max(365))
    .optional(),
}).refine(
  (data) => {
    // Se minAmount e maxAmount forem fornecidos, minAmount deve ser menor que maxAmount
    if (data.minAmount !== undefined && data.maxAmount !== undefined) {
      return data.minAmount <= data.maxAmount;
    }
    return true;
  },
  {
    message: 'Valor mínimo deve ser menor ou igual ao máximo',
    path: ['minAmount'],
  }
).refine(
  (data) => {
    // Se earningAfter e earningBefore forem fornecidos, earningAfter deve ser anterior a earningBefore
    if (data.earningAfter && data.earningBefore) {
      return new Date(data.earningAfter) <= new Date(data.earningBefore);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior à data final',
    path: ['earningAfter'],
  }
);

/**
 * Schema para marcar earning como pago
 */
export const markEarningAsPaidSchema = z.object({
  paymentDate: dateTimeSchema.optional().default(() => new Date().toISOString()),
  paymentMethod: z.enum(['bank_transfer', 'pix', 'check', 'cash', 'other']),
  paymentReference: z
    .string()
    .min(1, 'Referência de pagamento é obrigatória')
    .max(100, 'Referência de pagamento deve ter no máximo 100 caracteres'),
  paymentNotes: z
    .string()
    .max(1000, 'Observações de pagamento devem ter no máximo 1000 caracteres')
    .optional(),
  attachments: z
    .array(z.object({
      filename: z.string().min(1, 'Nome do arquivo é obrigatório'),
      url: z.string().url('URL do anexo deve ser válida'),
      type: z.enum(['receipt', 'transfer_proof', 'other']).default('other'),
    }))
    .max(5, 'Máximo de 5 anexos por pagamento')
    .optional(),
});

/**
 * Schema para processamento em lote de earnings
 */
export const bulkProcessEarningsSchema = z.object({
  earningIds: z
    .array(uuidSchema)
    .min(1, 'Pelo menos um earning deve ser selecionado')
    .max(100, 'Máximo de 100 earnings por lote'),
  
  action: z.enum(['mark_as_paid', 'cancel', 'approve']),
  
  paymentData: z.object({
    paymentMethod: z.enum(['bank_transfer', 'pix', 'check', 'cash', 'other']),
    paymentReference: z
      .string()
      .min(1, 'Referência de pagamento é obrigatória')
      .max(100, 'Referência de pagamento deve ter no máximo 100 caracteres'),
    paymentNotes: z
      .string()
      .max(1000, 'Observações de pagamento devem ter no máximo 1000 caracteres')
      .optional(),
  }).optional(),
  
  reason: z
    .string()
    .min(5, 'Motivo deve ter pelo menos 5 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
}).refine(
  (data) => {
    // Se action for mark_as_paid, paymentData é obrigatório
    if (data.action === 'mark_as_paid') {
      return !!data.paymentData;
    }
    return true;
  },
  {
    message: 'Dados de pagamento são obrigatórios para marcar como pago',
    path: ['paymentData'],
  }
);

/**
 * Schema para relatório financeiro
 */
export const financialReportSchema = z.object({
  startDate: dateTimeSchema.optional(),
  endDate: dateTimeSchema.optional(),
  
  groupBy: z
    .enum(['day', 'week', 'month', 'quarter', 'year', 'user', 'campaign', 'type'])
    .optional()
    .default('month'),
  
  includeDetails: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  
  format: z
    .enum(['json', 'csv', 'excel', 'pdf'])
    .optional()
    .default('json'),

  type: z
    .enum([...Object.values(EarningType), 'all'])
    .optional()
    .default('all'),

  status: z
    .enum([...Object.values(EarningStatus), 'all'])
    .optional()
    .default('all'),

  userId: uuidSchema.optional(),
  campaignId: uuidSchema.optional(),

  includeSummary: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('true')
    .transform((val) => val === 'true'),

  includeCharts: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Schema para projeção de earnings
 */
export const earningProjectionSchema = z.object({
  userId: uuidSchema.optional(),
  campaignId: uuidSchema.optional(),
  
  projectionPeriod: z
    .enum(['week', 'month', 'quarter', 'year'])
    .optional()
    .default('month'),
  
  basePeriod: z
    .enum(['last_week', 'last_month', 'last_quarter', 'last_year', 'ytd'])
    .optional()
    .default('last_month'),

  includeProjectedCampaigns: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('true')
    .transform((val) => val === 'true'),
});

/**
 * Schema para auditoria de earnings
 */
export const earningAuditSchema = z.object({
  earningId: uuidSchema,
  action: z.enum(['view', 'update', 'payment', 'cancel']),
  reason: z
    .string()
    .min(5, 'Motivo deve ter pelo menos 5 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
  metadata: z
    .record(z.any())
    .optional(),
});

// ==================== TIPOS INFERIDOS ====================

export type CreateEarningData = z.infer<typeof createEarningSchema>;
export type UpdateEarningData = z.infer<typeof updateEarningSchema>;
export type EarningParams = z.infer<typeof earningParamsSchema>;
export type EarningFilters = z.infer<typeof earningFiltersSchema>;
export type MarkEarningAsPaidData = z.infer<typeof markEarningAsPaidSchema>;
export type BulkProcessEarningsData = z.infer<typeof bulkProcessEarningsSchema>;
export type FinancialReportQuery = z.infer<typeof financialReportSchema>;
export type EarningProjectionQuery = z.infer<typeof earningProjectionSchema>;
export type EarningAuditData = z.infer<typeof earningAuditSchema>;

// ==================== UTILITÁRIOS DE VALIDAÇÃO ====================

/**
 * Valida dados de criação de earning
 */
export const validateCreateEarning = (data: unknown) => {
  return createEarningSchema.safeParse(data);
};

/**
 * Valida dados de atualização de earning
 */
export const validateUpdateEarning = (data: unknown) => {
  return updateEarningSchema.safeParse(data);
};

/**
 * Valida filtros de consulta
 */
export const validateEarningFilters = (data: unknown) => {
  return earningFiltersSchema.safeParse(data);
};

/**
 * Valida dados de pagamento
 */
export const validateMarkAsPaid = (data: unknown) => {
  return markEarningAsPaidSchema.safeParse(data);
};

// ==================== SCHEMAS DE RESPOSTA ====================

/**
 * Schema para resposta de earning
 */
export const earningResponseSchema = z.object({
  id: uuidSchema,
  type: earningTypeSchema,
  userId: uuidSchema,
  userName: z.string(),
  userAvatarUrl: z.string().url(),
  campaignId: uuidSchema,
  campaignTitle: z.string(),
  kitId: uuidSchema,
  sourceUserName: z.string().optional(),
  amount: z.number().min(0),
  earningDate: z.string().datetime(),
  status: earningStatusSchema,
  description: z.string().optional(),
  
  // Dados de pagamento
  paymentDate: z.string().datetime().optional(),
  paymentMethod: z.enum(['bank_transfer', 'pix', 'check', 'cash', 'other']).optional(),
  paymentReference: z.string().optional(),
  paymentNotes: z.string().optional(),
  
  // Dados do usuário
  user: z.object({
    id: uuidSchema,
    name: z.string(),
    email: z.string().email(),
    cpf: z.string(),
    opticName: z.string(),
    opticCNPJ: z.string(),
  }),
  
  // Dados da campanha
  campaign: z.object({
    id: uuidSchema,
    title: z.string(),
    status: z.enum(['ATIVA', 'CONCLUIDA', 'EXPIRADA']),
  }),
  
  // Anexos de pagamento
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    type: z.enum(['receipt', 'transfer_proof', 'other']),
  })).optional(),
  
  metadata: z.record(z.any()).optional(),
  
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema para resposta paginada de earnings
 */
export const paginatedEarningsResponseSchema = z.object({
  data: z.array(earningResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  summary: z.object({
    totalEarnings: z.number().int().min(0),
    totalAmount: z.number().min(0),
    pendingAmount: z.number().min(0),
    paidAmount: z.number().min(0),
    byType: z.object({
      SELLER: z.number().min(0),
      MANAGER: z.number().min(0),
    }),
    byStatus: z.object({
      PENDENTE: z.number().min(0),
      PAGO: z.number().min(0),
    }),
  }).optional(),
});

/**
 * Schema para resposta de relatório financeiro
 */
export const financialReportResponseSchema = z.object({
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    groupBy: z.string(),
  }),
  
  summary: z.object({
    totalEarnings: z.number().int().min(0),
    totalAmount: z.number().min(0),
    pendingAmount: z.number().min(0),
    paidAmount: z.number().min(0),
    averageEarning: z.number().min(0),
    byType: z.record(z.number().min(0)),
    byStatus: z.record(z.number().min(0)),
    byPeriod: z.array(z.object({
      period: z.string(),
      amount: z.number().min(0),
      count: z.number().int().min(0),
    })),
  }),
  
  details: z.array(earningResponseSchema).optional(),
  
  charts: z.array(z.object({
    type: z.enum(['line', 'bar', 'pie']),
    title: z.string(),
    data: z.array(z.record(z.any())),
  })).optional(),
  
  generatedAt: z.string().datetime(),
});

// ==================== CONSTANTES ====================

/**
 * Tipos de earning disponíveis
 */
export const EARNING_TYPES = Object.values(EarningType);

/**
 * Status de earning disponíveis
 */
export const EARNING_STATUSES = Object.values(EarningStatus);

/**
 * Métodos de pagamento suportados
 */
export const PAYMENT_METHODS = [
  'bank_transfer',
  'pix',
  'check',
  'cash',
  'other',
] as const;

/**
 * Tipos de anexo para pagamentos
 */
export const PAYMENT_ATTACHMENT_TYPES = [
  'receipt',
  'transfer_proof',
  'other',
] as const;

/**
 * Mensagens de erro específicas para earnings
 */
export const EARNING_ERROR_MESSAGES = {
  NOT_FOUND: 'Ganho não encontrado',
  ALREADY_PAID: 'Ganho já foi pago',
  CANNOT_UPDATE_PAID: 'Não é possível alterar ganho já pago',
  INVALID_AMOUNT: 'Valor inválido',
  INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes para esta operação',
  PAYMENT_REQUIRED: 'Dados de pagamento são obrigatórios',
  INVALID_PAYMENT_METHOD: 'Método de pagamento inválido',
  BULK_LIMIT_EXCEEDED: 'Limite de processamento em lote excedido',
  CANNOT_CANCEL_PAID: 'Não é possível cancelar ganho já pago',
} as const;

/**
 * Labels para tipos de earning
 */
export const EARNING_TYPE_LABELS = {
  [EarningType.SELLER]: 'Vendedor',
  [EarningType.MANAGER]: 'Gerente',
} as const;

/**
 * Labels para status de earning
 */
export const EARNING_STATUS_LABELS = {
  [EarningStatus.PENDENTE]: 'Pendente',
  [EarningStatus.PAGO]: 'Pago',
} as const;

/**
 * Labels para métodos de pagamento
 */
export const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'Transferência Bancária',
  pix: 'PIX',
  check: 'Cheque',
  cash: 'Dinheiro',
  other: 'Outro',
} as const;

/**
 * Configurações padrão de earnings
 */
export const EARNING_DEFAULTS = {
  STATUS: EarningStatus.PENDENTE,
  MAX_BULK_PROCESS: 100,
  MAX_ATTACHMENTS: 5,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Limites de valores monetários
 */
export const EARNING_LIMITS = {
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 1000000,
  DECIMAL_PLACES: 2,
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
  'quarter',
  'year',
  'user',
  'campaign',
  'type',
] as const;

/**
 * Formatos de exportação disponíveis
 */
export const EXPORT_FORMATS = [
  'json',
  'csv',
  'excel',
  'pdf',
] as const;
