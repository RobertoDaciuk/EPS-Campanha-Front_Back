/**
 * @file validation.schema.ts
 * @version 2.0.0
 * @description Schemas de validação Zod para sistema de validação de planilhas.
 * Define estruturas para upload, processamento e validação de dados de vendas.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos schemas de validação
 * - Sistema de mapeamento de colunas
 * - Validação de regras de negócio
 * - Processamento em lote de dados
 * - Relatórios de validação detalhados
 */

import { z } from 'zod'

// ==================== DEFINIÇÃO DOS ENUMS LOCAIS ====================

/**
 * Status de validação
 */
const ValidationStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const

/**
 * Status de linha de resultado
 */
const ResultRowStatus = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  SKIPPED: 'SKIPPED'
} as const

/**
 * Estratégia de tratamento de duplicatas
 */
const DuplicateHandlingStrategy = {
  IGNORE: 'IGNORE',
  OVERWRITE: 'OVERWRITE',
  REJECT_ROW: 'REJECT_ROW',
  MERGE: 'MERGE'
} as const

/**
 * Campos alvo para mapeamento
 */
const TargetField = {
  IGNORE: 'IGNORE',
  ORDER_ID: 'ORDER_ID',
  ORDER_ID_2: 'ORDER_ID_2',
  ORDER_ID_3: 'ORDER_ID_3',
  SALE_DATE: 'SALE_DATE',
  SELLER_CPF: 'SELLER_CPF',
  OPTIC_CNPJ: 'OPTIC_CNPJ',
  PRODUCT_NAME: 'PRODUCT_NAME',
  SALE_VALUE: 'SALE_VALUE',
  QUANTITY: 'QUANTITY',
  CUSTOMER_NAME: 'CUSTOMER_NAME',
  CUSTOMER_CPF: 'CUSTOMER_CPF',
  NOTES: 'NOTES'
} as const

/**
 * Operadores de regra de validação
 */
const RuleOperator = {
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  GREATER_THAN: 'GREATER_THAN',
  LESS_THAN: 'LESS_THAN',
  GREATER_EQUAL: 'GREATER_EQUAL',
  LESS_EQUAL: 'LESS_EQUAL',
  CONTAINS: 'CONTAINS',
  NOT_CONTAINS: 'NOT_CONTAINS',
  STARTS_WITH: 'STARTS_WITH',
  ENDS_WITH: 'ENDS_WITH',
  REGEX: 'REGEX',
  IS_EMPTY: 'IS_EMPTY',
  IS_NOT_EMPTY: 'IS_NOT_EMPTY',
  IS_DATE: 'IS_DATE',
  IS_NUMBER: 'IS_NUMBER',
  IS_EMAIL: 'IS_EMAIL'
} as const

// ==================== SCHEMAS BÁSICOS ====================

/**
 * Schema para validação de UUID
 */
const uuidSchema = z
  .string({
    required_error: 'ID é obrigatório',
    invalid_type_error: 'ID deve ser um texto',
  })
  .uuid('ID deve ser um UUID válido')

/**
 * Schema para validação de nome de arquivo
 */
const filenameSchema = z
  .string({
    required_error: 'Nome do arquivo é obrigatório',
    invalid_type_error: 'Nome do arquivo deve ser um texto',
  })
  .min(1, 'Nome do arquivo é obrigatório')
  .max(255, 'Nome do arquivo deve ter no máximo 255 caracteres')
  .regex(
    /^[^<>:"/\\|?*]+\.(xlsx?|csv)$/i,
    'Nome do arquivo deve ter extensão válida (.xlsx, .xls, .csv)'
  )

/**
 * Schema para validação de status de validação
 */
const validationStatusSchema = z.nativeEnum(ValidationStatus, {
  required_error: 'Status de validação é obrigatório',
  invalid_type_error: 'Status de validação inválido',
})

/**
 * Schema para validação de status de linha de resultado
 */
const resultRowStatusSchema = z.nativeEnum(ResultRowStatus, {
  required_error: 'Status da linha é obrigatório',
  invalid_type_error: 'Status da linha inválido',
})

/**
 * Schema para estratégia de tratamento de duplicatas
 */
const duplicateHandlingStrategySchema = z.nativeEnum(DuplicateHandlingStrategy, {
  required_error: 'Estratégia de duplicatas é obrigatória',
  invalid_type_error: 'Estratégia de duplicatas inválida',
})

/**
 * Schema para campos alvo
 */
const targetFieldSchema = z.nativeEnum(TargetField, {
  required_error: 'Campo alvo é obrigatório',
  invalid_type_error: 'Campo alvo inválido',
})

/**
 * Schema para operadores de regra
 */
const ruleOperatorSchema = z.nativeEnum(RuleOperator, {
  required_error: 'Operador da regra é obrigatório',
  invalid_type_error: 'Operador da regra inválido',
})

// ==================== SCHEMAS DE MAPEAMENTO ====================

/**
 * Schema para mapeamento de colunas
 */
export const columnMappingSchema = z.object({
  sourceColumn: z
    .string({
      required_error: 'Coluna de origem é obrigatória',
      invalid_type_error: 'Coluna de origem deve ser um texto',
    })
    .min(1, 'Coluna de origem não pode estar vazia')
    .max(100, 'Coluna de origem deve ter no máximo 100 caracteres'),
  
  targetField: targetFieldSchema,
  
  // Configurações opcionais de transformação
  transformation: z
    .object({
      type: z.enum(['none', 'uppercase', 'lowercase', 'trim', 'normalize_cpf', 'normalize_cnpj']).optional().default('none'),
      customRegex: z.string().optional(),
      defaultValue: z.string().optional(),
    })
    .optional(),
})

/**
 * Schema para regra de validação customizada
 */
export const validationRuleSchema = z.object({
  id: uuidSchema.optional(),
  name: z
    .string({
      required_error: 'Nome da regra é obrigatório',
      invalid_type_error: 'Nome da regra deve ser um texto',
    })
    .min(3, 'Nome da regra deve ter pelo menos 3 caracteres')
    .max(100, 'Nome da regra deve ter no máximo 100 caracteres'),
  
  field: targetFieldSchema,
  operator: ruleOperatorSchema,
  value: z
    .string({
      required_error: 'Valor da regra é obrigatório',
      invalid_type_error: 'Valor da regra deve ser um texto',
    })
    .min(1, 'Valor da regra não pode estar vazio')
    .max(255, 'Valor da regra deve ter no máximo 255 caracteres'),
  
  points: z
    .number({
      required_error: 'Pontos são obrigatórios',
      invalid_type_error: 'Pontos devem ser um número',
    })
    .int('Pontos devem ser um número inteiro')
    .min(0, 'Pontos não podem ser negativos')
    .max(10000, 'Pontos não podem exceder 10.000'),
  
  isActive: z
    .boolean()
    .optional()
    .default(true),
  
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
})

/**
 * Schema para configuração de validação
 */
export const validationConfigSchema = z.object({
  campaignId: uuidSchema.nullable(),
  isDryRun: z
    .boolean({
      required_error: 'Modo de teste é obrigatório',
      invalid_type_error: 'Modo de teste deve ser um booleano',
    })
    .default(true),
  
  duplicateHandling: duplicateHandlingStrategySchema.default(DuplicateHandlingStrategy.IGNORE),
  
  gracePeriodDays: z
    .number({
      required_error: 'Período de carência é obrigatório',
      invalid_type_error: 'Período de carência deve ser um número',
    })
    .int('Período de carência deve ser um número inteiro')
    .min(0, 'Período de carência não pode ser negativo')
    .max(365, 'Período de carência não pode exceder 365 dias')
    .default(30),
  
  mappings: z
    .array(columnMappingSchema)
    .min(1, 'Pelo menos um mapeamento deve ser definido')
    .max(20, 'Máximo de 20 mapeamentos por validação'),
  
  campaignRules: z
    .array(validationRuleSchema)
    .max(50, 'Máximo de 50 regras de campanha')
    .optional()
    .default([]),
  
  customRules: z
    .array(validationRuleSchema)
    .max(20, 'Máximo de 20 regras customizadas')
    .optional()
    .default([]),
  
  // Configurações adicionais
  validateCPF: z
    .boolean()
    .optional()
    .default(true),
  
  validateCNPJ: z
    .boolean()
    .optional()
    .default(true),
  
  validateDates: z
    .boolean()
    .optional()
    .default(true),
  
  minSaleValue: z
    .number()
    .min(0, 'Valor mínimo de venda não pode ser negativo')
    .optional(),
  
  maxSaleValue: z
    .number()
    .min(0, 'Valor máximo de venda não pode ser negativo')
    .optional(),
  
  allowPartialMatches: z
    .boolean()
    .optional()
    .default(false),
  
  strictMode: z
    .boolean()
    .optional()
    .default(false),
}).refine(
  (data) => {
    // Valida se pelo menos um campo obrigatório está mapeado
    const requiredFields = [TargetField.ORDER_ID, TargetField.SELLER_CPF]
    const mappedFields = data.mappings.map(m => m.targetField)
    return requiredFields.some(field => mappedFields.includes(field))
  },
  {
    message: 'Pelo menos ORDER_ID e SELLER_CPF devem estar mapeados',
    path: ['mappings'],
  }
).refine(
  (data) => {
    // Se minSaleValue e maxSaleValue forem definidos, min deve ser menor que max
    if (data.minSaleValue !== undefined && data.maxSaleValue !== undefined) {
      return data.minSaleValue <= data.maxSaleValue
    }
    return true
  },
  {
    message: 'Valor mínimo deve ser menor ou igual ao máximo',
    path: ['maxSaleValue'],
  }
)

/**
 * Schema para linha de resultado de validação
 */
export const validationResultRowSchema = z.object({
  lineNumber: z
    .number({
      required_error: 'Número da linha é obrigatório',
      invalid_type_error: 'Número da linha deve ser um número',
    })
    .int('Número da linha deve ser um número inteiro')
    .min(1, 'Número da linha deve ser maior que zero'),
  
  status: resultRowStatusSchema,
  
  data: z
    .record(z.any())
    .refine(
      (data) => Object.keys(data).length > 0,
      { message: 'Dados da linha não podem estar vazios' }
    ),
  
  message: z
    .string({
      required_error: 'Mensagem é obrigatória',
      invalid_type_error: 'Mensagem deve ser um texto',
    })
    .min(1, 'Mensagem não pode estar vazia')
    .max(1000, 'Mensagem deve ter no máximo 1000 caracteres'),
  
  points: z
    .number()
    .int()
    .min(0)
    .optional(),
  
  ruleTriggered: z
    .string()
    .max(100, 'Nome da regra deve ter no máximo 100 caracteres')
    .optional(),
  
  warnings: z
    .array(z.string().max(500))
    .max(10, 'Máximo de 10 avisos por linha')
    .optional(),
  
  metadata: z
    .record(z.any())
    .optional(),
})

/**
 * Schema para job de validação
 */
export const validationJobSchema = z.object({
  fileName: filenameSchema,
  uploadDate: z
    .string()
    .datetime('Data de upload deve estar no formato ISO 8601')
    .optional()
    .default(() => new Date().toISOString()),
  
  status: validationStatusSchema.default(ValidationStatus.PROCESSING),
  
  campaignTitle: z
    .string({
      required_error: 'Título da campanha é obrigatório',
      invalid_type_error: 'Título da campanha deve ser um texto',
    })
    .min(1, 'Título da campanha não pode estar vazio')
    .max(100, 'Título da campanha deve ter no máximo 100 caracteres'),
  
  isDryRun: z
    .boolean()
    .default(true),
  
  config: validationConfigSchema,
  
  summary: z.object({
    totalRows: z.number().int().min(0),
    validatedSales: z.number().int().min(0),
    errors: z.number().int().min(0),
    warnings: z.number().int().min(0),
    pointsDistributed: z.number().min(0),
  }),
  
  details: z
    .array(validationResultRowSchema)
    .optional(),
  
  campaignId: uuidSchema.nullable(),
  adminId: uuidSchema,
  
  // Metadados do processamento
  processingStarted: z
    .string()
    .datetime()
    .optional(),
  
  processingCompleted: z
    .string()
    .datetime()
    .optional(),
  
  processingDuration: z
    .number()
    .min(0)
    .optional(),
  
  fileSize: z
    .number()
    .int()
    .min(0)
    .optional(),
  
  rowsProcessed: z
    .number()
    .int()
    .min(0)
    .optional(),
})

/**
 * Schema para upload de arquivo de validação
 */
export const uploadValidationFileSchema = z.object({
  campaignId: uuidSchema.nullable(),
  
  isDryRun: z
    .boolean()
    .optional()
    .default(false),
  
  previewOnly: z
    .boolean()
    .optional()
    .default(false),
  
  maxRows: z
    .number()
    .int()
    .min(1, 'Máximo de linhas deve ser maior que zero')
    .max(100000, 'Máximo de 100.000 linhas por arquivo')
    .optional()
    .default(10000),

  // Mapeamento de colunas
  mapping: z.object({
    orderNumberColumn: z.string().min(1, 'Coluna do número do pedido é obrigatória'),
    quantityColumn: z.string().optional(),
    dateColumn: z.string().optional(),
    sellerCpfColumn: z.string().optional(),
    opticCnpjColumn: z.string().optional(),
    productNameColumn: z.string().optional(),
    saleValueColumn: z.string().optional(),
    customerNameColumn: z.string().optional(),
    notesColumn: z.string().optional(),
    hasHeaders: z.boolean().default(true),
    startRow: z.number().int().min(1).default(2),
  }),

  // Configurações de validação
  validation: z.object({
    duplicateHandling: duplicateHandlingStrategySchema.default(DuplicateHandlingStrategy.IGNORE),
    gracePeriodDays: z.number().int().min(0).max(365).default(30),
    validateCPF: z.boolean().default(true),
    validateCNPJ: z.boolean().default(true),
    validateDates: z.boolean().default(true),
    allowPartialMatches: z.boolean().default(false),
    strictMode: z.boolean().default(false),
    minSaleValue: z.number().min(0).optional(),
    maxSaleValue: z.number().min(0).optional(),
  }).optional().default({}),
})

/**
 * Schema para filtros de histórico de validação
 */
export const validationHistoryFiltersSchema = z.object({
  // Paginação
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .pipe(z.number().int().min(1, 'Página deve ser maior que 0'))
    .optional()
    .default('1')
    .transform((val) => typeof val === 'string' ? parseInt(val) : val),
  
  limit: z
    .string()
    .transform((val) => parseInt(val) || 10)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default('10')
    .transform((val) => typeof val === 'string' ? parseInt(val) : val),

  // Ordenação
  sort: z
    .enum(['uploadDate', 'fileName', 'status', 'campaignTitle'])
    .optional()
    .default('uploadDate'),
  
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),

  // Filtros
  search: z
    .string()
    .min(1, 'Termo de busca deve ter pelo menos 1 caractere')
    .max(100, 'Termo de busca deve ter no máximo 100 caracteres')
    .optional(),

  status: z
    .enum([...Object.values(ValidationStatus), 'all'] as const)
    .optional()
    .default('all'),

  campaignId: uuidSchema.optional(),

  adminId: uuidSchema.optional(),

  isDryRun: z
    .string()
    .transform((val) => val === 'true' ? true : val === 'false' ? false : undefined)
    .pipe(z.boolean().optional())
    .optional(),

  // Filtros por data
  uploadedAfter: z
    .string()
    .datetime('Data deve estar no formato ISO 8601')
    .optional(),
  
  uploadedBefore: z
    .string()
    .datetime('Data deve estar no formato ISO 8601')
    .optional(),

  // Filtros por resultados
  hasErrors: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),

  hasWarnings: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
})

/**
 * Schema para parâmetros de job de validação
 */
export const validationJobParamsSchema = z.object({
  id: uuidSchema,
})

/**
 * Schema para reprocessar job de validação
 */
export const reprocessValidationJobSchema = z.object({
  jobId: uuidSchema,
  newConfig: validationConfigSchema.optional(),
  forceReprocess: z
    .boolean()
    .optional()
    .default(false),
})

/**
 * Schema para relatório de validação
 */
export const validationReportSchema = z.object({
  startDate: z
    .string()
    .datetime('Data de início deve estar no formato ISO 8601')
    .optional(),
  
  endDate: z
    .string()
    .datetime('Data de fim deve estar no formato ISO 8601')
    .optional(),

  campaignId: uuidSchema.optional(),
  
  adminId: uuidSchema.optional(),
  
  groupBy: z
    .enum(['day', 'week', 'month', 'campaign', 'admin', 'status'])
    .optional()
    .default('day'),
  
  includeDetails: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => typeof val === 'string' ? val === 'true' : val),
  
  format: z
    .enum(['json', 'csv', 'excel'])
    .optional()
    .default('json'),

  includeErrorDetails: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => typeof val === 'string' ? val === 'true' : val),
})

/**
 * Schema para validação de submissão individual
 */
export const validateSubmissionSchema = z.object({
  submissionId: uuidSchema,
  status: z.enum(['VALIDATED', 'REJECTED']),
  validationMessage: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
  pointsAwarded: z.number().int().min(0).optional(),
})

/**
 * Schema para validação em lote
 */
export const bulkValidationSchema = z.object({
  submissionIds: z.array(uuidSchema).min(1, 'Pelo menos uma submissão deve ser selecionada'),
  action: z.enum(['validate', 'reject', 'pending']),
  validationMessage: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
  applyToAll: z.boolean().default(false),
})

// ==================== SCHEMAS DE RESPOSTA ====================

/**
 * Schema para resposta de job de validação
 */
export const validationJobResponseSchema = z.object({
  id: uuidSchema,
  fileName: z.string(),
  uploadDate: z.string().datetime(),
  status: validationStatusSchema,
  campaignTitle: z.string(),
  isDryRun: z.boolean(),
  
  config: z.object({
    campaignId: uuidSchema.nullable(),
    isDryRun: z.boolean(),
    duplicateHandling: duplicateHandlingStrategySchema,
    gracePeriodDays: z.number().int().min(0),
    mappings: z.array(columnMappingSchema),
  }),
  
  summary: z.object({
    totalRows: z.number().int().min(0),
    validatedSales: z.number().int().min(0),
    errors: z.number().int().min(0),
    warnings: z.number().int().min(0),
    pointsDistributed: z.number().min(0),
  }),
  
  // Dados do admin
  admin: z.object({
    id: uuidSchema,
    name: z.string(),
    email: z.string().email(),
  }),
  
  // Dados da campanha (se aplicável)
  campaign: z.object({
    id: uuidSchema,
    title: z.string(),
    status: z.enum(['ATIVA', 'CONCLUIDA', 'EXPIRADA']),
  }).nullable(),
  
  // Metadados de processamento
  processingStarted: z.string().datetime().optional(),
  processingCompleted: z.string().datetime().optional(),
  processingDuration: z.number().min(0).optional(),
  fileSize: z.number().int().min(0).optional(),
  rowsProcessed: z.number().int().min(0).optional(),
  
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

/**
 * Schema para resposta paginada de jobs de validação
 */
export const paginatedValidationJobsResponseSchema = z.object({
  data: z.array(validationJobResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  summary: z.object({
    totalJobs: z.number().int().min(0),
    processingJobs: z.number().int().min(0),
    completedJobs: z.number().int().min(0),
    failedJobs: z.number().int().min(0),
    totalRowsProcessed: z.number().int().min(0),
    totalPointsDistributed: z.number().min(0),
  }).optional(),
})

// ==================== SCHEMAS DE TEMPLATE ====================

/**
 * Schema para template de mapeamento
 */
export const mappingTemplateSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  mappings: z.array(columnMappingSchema),
  isDefault: z.boolean().default(false),
  createdBy: uuidSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

/**
 * Schema para salvar template
 */
export const saveMappingTemplateSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  mappings: z.array(columnMappingSchema),
  isDefault: z.boolean().default(false),
})

// ==================== TIPOS INFERIDOS ====================

export type ColumnMappingData = z.infer<typeof columnMappingSchema>
export type ValidationRuleData = z.infer<typeof validationRuleSchema>
export type ValidationConfigData = z.infer<typeof validationConfigSchema>
export type ValidationResultRowData = z.infer<typeof validationResultRowSchema>
export type ValidationJobData = z.infer<typeof validationJobSchema>
export type UploadValidationFileData = z.infer<typeof uploadValidationFileSchema>
export type ValidationHistoryFilters = z.infer<typeof validationHistoryFiltersSchema>
export type ValidationJobParams = z.infer<typeof validationJobParamsSchema>
export type ReprocessValidationJobData = z.infer<typeof reprocessValidationJobSchema>
export type ValidationReportQuery = z.infer<typeof validationReportSchema>
export type ValidateSubmissionData = z.infer<typeof validateSubmissionSchema>
export type BulkValidationData = z.infer<typeof bulkValidationSchema>
export type MappingTemplateData = z.infer<typeof mappingTemplateSchema>
export type SaveMappingTemplateData = z.infer<typeof saveMappingTemplateSchema>

// ==================== UTILITÁRIOS DE VALIDAÇÃO ====================

/**
 * Valida configuração de validação
 */
export const validateValidationConfig = (data: unknown) => {
  return validationConfigSchema.safeParse(data)
}

/**
 * Valida dados de upload
 */
export const validateUploadFile = (data: unknown) => {
  return uploadValidationFileSchema.safeParse(data)
}

/**
 * Valida filtros de histórico
 */
export const validateHistoryFilters = (data: unknown) => {
  return validationHistoryFiltersSchema.safeParse(data)
}

/**
 * Valida mapeamento de colunas
 */
export const validateColumnMapping = (data: unknown) => {
  return columnMappingSchema.safeParse(data)
}

/**
 * Valida job de validação
 */
export const validateValidationJob = (data: unknown) => {
  return validationJobSchema.safeParse(data)
}

/**
 * Valida template de mapeamento
 */
export const validateMappingTemplate = (data: unknown) => {
  return mappingTemplateSchema.safeParse(data)
}

// ==================== CONSTANTES ====================

/**
 * Status de validação disponíveis
 */
export const VALIDATION_STATUSES = Object.values(ValidationStatus)

/**
 * Status de linha de resultado disponíveis
 */
export const RESULT_ROW_STATUSES = Object.values(ResultRowStatus)

/**
 * Estratégias de tratamento de duplicatas
 */
export const DUPLICATE_HANDLING_STRATEGIES = Object.values(DuplicateHandlingStrategy)

/**
 * Campos alvo disponíveis
 */
export const TARGET_FIELDS = Object.values(TargetField)

/**
 * Operadores de regra disponíveis
 */
export const RULE_OPERATORS = Object.values(RuleOperator)

/**
 * Tipos de arquivo suportados
 */
export const SUPPORTED_FILE_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
] as const

/**
 * Extensões de arquivo suportadas
 */
export const SUPPORTED_FILE_EXTENSIONS = [
  '.xlsx',
  '.xls',
  '.csv',
] as const

/**
 * Mensagens de erro específicas para validação
 */
export const VALIDATION_ERROR_MESSAGES = {
  JOB_NOT_FOUND: 'Job de validação não encontrado',
  FILE_TOO_LARGE: 'Arquivo muito grande (máximo 50MB)',
  INVALID_FILE_TYPE: 'Tipo de arquivo não suportado',
  PROCESSING_FAILED: 'Falha no processamento do arquivo',
  INVALID_MAPPING: 'Mapeamento de colunas inválido',
  REQUIRED_FIELDS_MISSING: 'Campos obrigatórios não mapeados',
  DUPLICATE_MAPPING: 'Campo alvo mapeado mais de uma vez',
  CAMPAIGN_NOT_ACTIVE: 'Campanha não está ativa',
  INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes para esta operação',
  MAX_ROWS_EXCEEDED: 'Número máximo de linhas excedido',
  INVALID_CPF: 'CPF inválido',
  INVALID_CNPJ: 'CNPJ inválido',
  INVALID_DATE: 'Data inválida',
  DUPLICATE_ORDER: 'Número de pedido duplicado',
  SELLER_NOT_FOUND: 'Vendedor não encontrado',
  OPTIC_NOT_FOUND: 'Ótica não encontrada',
  SALE_VALUE_TOO_LOW: 'Valor de venda abaixo do mínimo',
  SALE_VALUE_TOO_HIGH: 'Valor de venda acima do máximo',
  GRACE_PERIOD_EXCEEDED: 'Período de carência excedido',
} as const

/**
 * Labels para status de validação
 */
export const VALIDATION_STATUS_LABELS = {
  [ValidationStatus.PENDING]: 'Pendente',
  [ValidationStatus.PROCESSING]: 'Processando',
  [ValidationStatus.COMPLETED]: 'Concluído',
  [ValidationStatus.FAILED]: 'Falhou',
  [ValidationStatus.CANCELLED]: 'Cancelado',
} as const

/**
 * Labels para estratégias de duplicatas
 */
export const DUPLICATE_HANDLING_LABELS = {
  [DuplicateHandlingStrategy.IGNORE]: 'Ignorar duplicadas',
  [DuplicateHandlingStrategy.OVERWRITE]: 'Sobrescrever com novos dados',
  [DuplicateHandlingStrategy.REJECT_ROW]: 'Rejeitar linha duplicada',
  [DuplicateHandlingStrategy.MERGE]: 'Mesclar dados',
} as const

/**
 * Labels para campos alvo
 */
export const TARGET_FIELD_LABELS = {
  [TargetField.IGNORE]: 'Ignorar esta coluna',
  [TargetField.ORDER_ID]: 'Nº Pedido (Principal)',
  [TargetField.ORDER_ID_2]: 'Nº Pedido (Alternativo 1)',
  [TargetField.ORDER_ID_3]: 'Nº Pedido (Alternativo 2)',
  [TargetField.SALE_DATE]: 'Data da Venda',
  [TargetField.SELLER_CPF]: 'CPF do Vendedor',
  [TargetField.OPTIC_CNPJ]: 'CNPJ da Ótica',
  [TargetField.PRODUCT_NAME]: 'Nome do Produto',
  [TargetField.SALE_VALUE]: 'Valor da Venda',
  [TargetField.QUANTITY]: 'Quantidade',
  [TargetField.CUSTOMER_NAME]: 'Nome do Cliente',
  [TargetField.CUSTOMER_CPF]: 'CPF do Cliente',
  [TargetField.NOTES]: 'Observações',
} as const

/**
 * Configurações padrão de validação
 */
export const VALIDATION_DEFAULTS = {
  IS_DRY_RUN: true,
  DUPLICATE_HANDLING: DuplicateHandlingStrategy.IGNORE,
  GRACE_PERIOD_DAYS: 30,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_ROWS: 10000,
  VALIDATE_CPF: true,
  VALIDATE_CNPJ: true,
  VALIDATE_DATES: true,
  ALLOW_PARTIAL_MATCHES: false,
  STRICT_MODE: false,
} as const

/**
 * Limites do sistema de validação
 */
export const VALIDATION_LIMITS = {
  MAX_MAPPINGS: 20,
  MAX_CAMPAIGN_RULES: 50,
  MAX_CUSTOM_RULES: 20,
  MAX_WARNINGS_PER_ROW: 10,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_RULE_NAME_LENGTH: 100,
  MAX_RULE_VALUE_LENGTH: 255,
  MAX_POINTS_PER_RULE: 10000,
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  MAX_ROWS_PER_FILE: 100000,
  MAX_TEMPLATES: 100,
} as const

// ==================== EXPORTS DOS ENUMS ====================

export {
  ValidationStatus,
  ResultRowStatus,
  DuplicateHandlingStrategy,
  TargetField,
  RuleOperator,
  validationStatusSchema,
  resultRowStatusSchema,
  duplicateHandlingStrategySchema,
  targetFieldSchema,
  ruleOperatorSchema,
}
