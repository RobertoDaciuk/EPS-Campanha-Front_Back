/**
 * @file premio.schema.ts
 * @version 2.0.0
 * @description Schemas de validação Zod para operações com prêmios.
 * Define estruturas para CRUD de prêmios, catálogo e sistema de resgate.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos schemas de prêmio
 * - Validação para criação, atualização e filtros
 * - Sistema de resgate com validações
 * - Schemas para relatórios de prêmios
 * - Normalização automática de dados
 */

import { z } from 'zod';

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
 * Schema para validação de título do prêmio
 */
const premioTitleSchema = z
  .string({
    required_error: 'Título é obrigatório',
    invalid_type_error: 'Título deve ser um texto',
  })
  .min(3, 'Título deve ter pelo menos 3 caracteres')
  .max(100, 'Título deve ter no máximo 100 caracteres')
  .transform((title) => title.trim());

/**
 * Schema para validação de descrição do prêmio
 */
const premioDescriptionSchema = z
  .string({
    required_error: 'Descrição é obrigatória',
    invalid_type_error: 'Descrição deve ser um texto',
  })
  .min(10, 'Descrição deve ter pelo menos 10 caracteres')
  .max(500, 'Descrição deve ter no máximo 500 caracteres')
  .transform((desc) => desc.trim());

/**
 * Schema para validação de URL da imagem do prêmio
 */
const premioImageUrlSchema = z
  .string({
    required_error: 'URL da imagem é obrigatória',
    invalid_type_error: 'URL da imagem deve ser um texto',
  })
  .url('URL da imagem deve ser válida')
  .or(z.literal(''))
  .transform((url) => url || `https://picsum.photos/seed/premio${Date.now()}/400/300`);

/**
 * Schema para validação de pontos necessários
 */
const pointsRequiredSchema = z
  .number({
    required_error: 'Pontos necessários são obrigatórios',
    invalid_type_error: 'Pontos necessários devem ser um número',
  })
  .int('Pontos necessários devem ser um número inteiro')
  .min(1, 'Pontos necessários devem ser maior que zero')
  .max(1000000, 'Pontos necessários não podem exceder 1.000.000');

/**
 * Schema para validação de estoque
 */
const stockSchema = z
  .number({
    required_error: 'Estoque é obrigatório',
    invalid_type_error: 'Estoque deve ser um número',
  })
  .int('Estoque deve ser um número inteiro')
  .min(0, 'Estoque não pode ser negativo')
  .max(100000, 'Estoque não pode exceder 100.000');

/**
 * Schema para validação de categoria do prêmio
 */
const premioCategorySchema = z
  .string()
  .min(2, 'Categoria deve ter pelo menos 2 caracteres')
  .max(50, 'Categoria deve ter no máximo 50 caracteres')
  .optional()
  .default('Geral');

/**
 * Schema para validação de prioridade do prêmio
 */
const premioPrioritySchema = z
  .number()
  .int()
  .min(1, 'Prioridade deve ser maior que zero')
  .max(100, 'Prioridade máxima é 100')
  .optional()
  .default(50);

/**
 * Schema para validação de disponibilidade do prêmio
 */
const premioAvailabilitySchema = z.object({
  startDate: z
    .string()
    .datetime('Data de início deve estar no formato ISO 8601')
    .optional(),
  endDate: z
    .string()
    .datetime('Data de fim deve estar no formato ISO 8601')
    .optional(),
  limitPerUser: z
    .number()
    .int()
    .min(1, 'Limite por usuário deve ser maior que zero')
    .max(100, 'Limite por usuário não pode exceder 100')
    .optional(),
  requiresApproval: z
    .boolean()
    .optional()
    .default(false),
}).optional();

// ==================== SCHEMAS PRINCIPAIS ====================

/**
 * Schema para criação de prêmio
 */
export const createPremioSchema = z.object({
  title: premioTitleSchema,
  description: premioDescriptionSchema,
  imageUrl: premioImageUrlSchema.optional(),
  pointsRequired: pointsRequiredSchema,
  stock: stockSchema,
  category: premioCategorySchema.optional(),
  priority: premioPrioritySchema.optional(),
  availability: premioAvailabilitySchema,
  tags: z
    .array(z.string().min(1).max(30))
    .max(10, 'Máximo de 10 tags por prêmio')
    .optional(),
  isActive: z
    .boolean()
    .optional()
    .default(true),
  instructions: z
    .string()
    .max(1000, 'Instruções devem ter no máximo 1000 caracteres')
    .optional(),
}).refine(
  (data) => {
    // Valida se a data de início é anterior à data de fim
    if (data.availability?.startDate && data.availability?.endDate) {
      const startDate = new Date(data.availability.startDate);
      const endDate = new Date(data.availability.endDate);
      return startDate < endDate;
    }
    return true;
  },
  {
    message: 'Data de início deve ser anterior à data de término',
    path: ['availability', 'endDate'],
  }
);

/**
 * Schema para atualização de prêmio
 */
export const updatePremioSchema = z.object({
  title: premioTitleSchema.optional(),
  description: premioDescriptionSchema.optional(),
  imageUrl: premioImageUrlSchema.optional(),
  pointsRequired: pointsRequiredSchema.optional(),
  stock: stockSchema.optional(),
  category: premioCategorySchema.optional(),
  priority: premioPrioritySchema.optional(),
  availability: premioAvailabilitySchema,
  tags: z
    .array(z.string().min(1).max(30))
    .max(10, 'Máximo de 10 tags por prêmio')
    .optional(),
  isActive: z
    .boolean()
    .optional(),
  instructions: z
    .string()
    .max(1000, 'Instruções devem ter no máximo 1000 caracteres')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser fornecido para atualização' }
).refine(
  (data) => {
    // Valida datas se ambas estiverem presentes
    if (data.availability?.startDate && data.availability?.endDate) {
      const startDate = new Date(data.availability.startDate);
      const endDate = new Date(data.availability.endDate);
      return startDate < endDate;
    }
    return true;
  },
  {
    message: 'Data de início deve ser anterior à data de término',
    path: ['availability', 'endDate'],
  }
);

/**
 * Schema para parâmetros de rota de prêmio
 */
export const premioParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema para filtros de consulta de prêmios
 */
export const premioFiltersSchema = z.object({
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
    .enum(['title', 'pointsRequired', 'stock', 'priority', 'createdAt', 'category'])
    .optional()
    .default('priority'),
  
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),

  // Filtros de busca
  search: z
    .string()
    .min(1, 'Termo de busca deve ter pelo menos 1 caractere')
    .max(100, 'Termo de busca deve ter no máximo 100 caracteres')
    .optional(),

  // Filtros por categoria
  category: z
    .string()
    .min(1)
    .max(50)
    .optional(),

  // Filtros por pontos
  minPoints: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(0))
    .optional(),
  
  maxPoints: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(0))
    .optional(),

  // Filtros por disponibilidade
  availableOnly: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  inStock: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  isActive: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('true')
    .transform((val) => val === 'true'),

  // Filtro por usuário (prêmios que o usuário pode resgatar)
  userId: uuidSchema.optional(),

  // Filtros por tags
  tags: z
    .string()
    .transform((val) => val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0))
    .pipe(z.array(z.string().min(1).max(30)))
    .optional(),
}).refine(
  (data) => {
    // Se minPoints e maxPoints forem fornecidos, minPoints deve ser menor que maxPoints
    if (data.minPoints !== undefined && data.maxPoints !== undefined) {
      return data.minPoints <= data.maxPoints;
    }
    return true;
  },
  {
    message: 'Pontuação mínima deve ser menor ou igual à máxima',
    path: ['minPoints'],
  }
);

/**
 * Schema para resgate de prêmio
 */
export const redeemPremioSchema = z.object({
  premioId: uuidSchema,
  userId: uuidSchema,
  deliveryAddress: z.object({
    street: z
      .string()
      .min(5, 'Endereço deve ter pelo menos 5 caracteres')
      .max(200, 'Endereço deve ter no máximo 200 caracteres')
      .optional(),
    city: z
      .string()
      .min(2, 'Cidade deve ter pelo menos 2 caracteres')
      .max(100, 'Cidade deve ter no máximo 100 caracteres')
      .optional(),
    state: z
      .string()
      .length(2, 'Estado deve ter exatamente 2 caracteres')
      .optional(),
    zipCode: z
      .string()
      .regex(/^\d{5}-?\d{3}$/, 'CEP deve estar no formato 00000-000')
      .optional(),
    country: z
      .string()
      .min(2, 'País deve ter pelo menos 2 caracteres')
      .max(50, 'País deve ter no máximo 50 caracteres')
      .optional()
      .default('Brasil'),
  }).optional(),
  notes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

/**
 * Schema para atualização de estoque
 */
export const updateStockSchema = z.object({
  operation: z.enum(['set', 'add', 'subtract']),
  quantity: z
    .number()
    .int()
    .min(0, 'Quantidade deve ser maior ou igual a zero'),
  reason: z
    .string()
    .min(5, 'Motivo deve ter pelo menos 5 caracteres')
    .max(200, 'Motivo deve ter no máximo 200 caracteres'),
});

/**
 * Schema para estatísticas de prêmio
 */
export const premioStatsSchema = z.object({
  premioId: uuidSchema.optional(),
  period: z
    .enum(['day', 'week', 'month', 'quarter', 'year', 'all'])
    .optional()
    .default('month'),
  includeUserStats: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Schema para relatório de resgates
 */
export const redemptionReportSchema = z.object({
  startDate: z
    .string()
    .datetime('Data de início deve estar no formato ISO 8601')
    .optional(),
  endDate: z
    .string()
    .datetime('Data de fim deve estar no formato ISO 8601')
    .optional(),
  premioId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  status: z
    .enum(['pending', 'approved', 'delivered', 'cancelled', 'all'])
    .optional()
    .default('all'),
  format: z
    .enum(['json', 'csv', 'excel'])
    .optional()
    .default('json'),
});

/**
 * Schema para importação em lote de prêmios
 */
export const bulkPremioImportSchema = z.object({
  premios: z
    .array(createPremioSchema)
    .min(1, 'Pelo menos um prêmio deve ser fornecido')
    .max(100, 'Máximo de 100 prêmios por importação'),
  
  validateOnly: z
    .boolean()
    .optional()
    .default(false),
  
  skipDuplicates: z
    .boolean()
    .optional()
    .default(true),
});

/**
 * Schema para configuração de prêmio sazonal
 */
export const seasonalPremioSchema = z.object({
  premioId: uuidSchema,
  season: z.enum(['spring', 'summer', 'autumn', 'winter', 'christmas', 'easter', 'mothers_day', 'fathers_day']),
  multiplier: z
    .number()
    .min(0.1, 'Multiplicador deve ser pelo menos 0.1')
    .max(10, 'Multiplicador não pode exceder 10')
    .default(1),
  startDate: z
    .string()
    .datetime('Data de início deve estar no formato ISO 8601'),
  endDate: z
    .string()
    .datetime('Data de fim deve estar no formato ISO 8601'),
}).refine(
  (data) => {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return startDate < endDate;
  },
  {
    message: 'Data de início deve ser anterior à data de término',
    path: ['endDate'],
  }
);

// ==================== TIPOS INFERIDOS ====================

export type CreatePremioData = z.infer<typeof createPremioSchema>;
export type UpdatePremioData = z.infer<typeof updatePremioSchema>;
export type PremioParams = z.infer<typeof premioParamsSchema>;
export type PremioFilters = z.infer<typeof premioFiltersSchema>;
export type RedeemPremioData = z.infer<typeof redeemPremioSchema>;
export type UpdateStockData = z.infer<typeof updateStockSchema>;
export type PremioStatsQuery = z.infer<typeof premioStatsSchema>;
export type RedemptionReportQuery = z.infer<typeof redemptionReportSchema>;
export type BulkPremioImportData = z.infer<typeof bulkPremioImportSchema>;
export type SeasonalPremioData = z.infer<typeof seasonalPremioSchema>;

// ==================== UTILITÁRIOS DE VALIDAÇÃO ====================

/**
 * Valida dados de criação de prêmio
 */
export const validateCreatePremio = (data: unknown) => {
  return createPremioSchema.safeParse(data);
};

/**
 * Valida dados de atualização de prêmio
 */
export const validateUpdatePremio = (data: unknown) => {
  return updatePremioSchema.safeParse(data);
};

/**
 * Valida filtros de consulta
 */
export const validatePremioFilters = (data: unknown) => {
  return premioFiltersSchema.safeParse(data);
};

/**
 * Valida dados de resgate
 */
export const validateRedeemPremio = (data: unknown) => {
  return redeemPremioSchema.safeParse(data);
};

// ==================== SCHEMAS DE RESPOSTA ====================

/**
 * Schema para resposta de prêmio
 */
export const premioResponseSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().url(),
  pointsRequired: z.number().int().min(1),
  stock: z.number().int().min(0),
  category: z.string().optional(),
  priority: z.number().int().min(1).max(100).optional(),
  availability: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limitPerUser: z.number().int().min(1).optional(),
    requiresApproval: z.boolean().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean(),
  instructions: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  
  // Campos calculados
  isAvailable: z.boolean().optional(),
  canUserRedeem: z.boolean().optional(),
  userRedemptions: z.number().int().min(0).optional(),
});

/**
 * Schema para resposta paginada de prêmios
 */
export const paginatedPremiosResponseSchema = z.object({
  data: z.array(premioResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  summary: z.object({
    totalPremios: z.number().int().min(0),
    availablePremios: z.number().int().min(0),
    totalStock: z.number().int().min(0),
    categories: z.array(z.string()),
  }).optional(),
});

/**
 * Schema para resposta de resgate
 */
export const redemptionResponseSchema = z.object({
  id: uuidSchema,
  premioId: uuidSchema,
  userId: uuidSchema,
  status: z.enum(['pending', 'approved', 'delivered', 'cancelled']),
  redemptionDate: z.string().datetime(),
  deliveryAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  approvedBy: uuidSchema.optional(),
  approvedAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
  trackingCode: z.string().optional(),
});

// ==================== CONSTANTES ====================

/**
 * Categorias padrão de prêmios
 */
export const PREMIO_CATEGORIES = [
  'Eletrônicos',
  'Vale-presente',
  'Experiências',
  'Casa e Decoração',
  'Esporte e Lazer',
  'Livros e Cursos',
  'Viagem',
  'Alimentação',
  'Moda e Acessórios',
  'Serviços',
  'Geral',
] as const;

/**
 * Status de resgate disponíveis
 */
export const REDEMPTION_STATUSES = [
  'pending',
  'approved', 
  'delivered',
  'cancelled',
] as const;

/**
 * Tags sugeridas para prêmios
 */
export const PREMIO_SUGGESTED_TAGS = [
  'popular',
  'limitado',
  'novo',
  'desconto',
  'premium',
  'digital',
  'físico',
  'entrega-rápida',
  'exclusivo',
  'sazonal',
] as const;

/**
 * Mensagens de erro específicas para prêmios
 */
export const PREMIO_ERROR_MESSAGES = {
  NOT_FOUND: 'Prêmio não encontrado',
  OUT_OF_STOCK: 'Prêmio fora de estoque',
  INSUFFICIENT_POINTS: 'Pontos insuficientes para resgatar este prêmio',
  ALREADY_REDEEMED_MAX: 'Limite de resgates por usuário atingido',
  NOT_AVAILABLE: 'Prêmio não está disponível no momento',
  REQUIRES_APPROVAL: 'Este resgate requer aprovação do administrador',
  INVALID_DELIVERY_ADDRESS: 'Endereço de entrega inválido',
  REDEMPTION_NOT_FOUND: 'Resgate não encontrado',
  CANNOT_CANCEL: 'Não é possível cancelar este resgate',
  ALREADY_DELIVERED: 'Este prêmio já foi entregue',
} as const;

/**
 * Labels para status de resgate
 */
export const REDEMPTION_STATUS_LABELS = {
  pending: 'Pendente',
  approved: 'Aprovado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
} as const;

/**
 * Configurações padrão de prêmios
 */
export const PREMIO_DEFAULTS = {
  PRIORITY: 50,
  CATEGORY: 'Geral',
  LIMIT_PER_USER: 1,
  REQUIRES_APPROVAL: false,
  IS_ACTIVE: true,
} as const;

/**
 * Limites de sistema para prêmios
 */
export const PREMIO_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_INSTRUCTIONS_LENGTH: 1000,
  MAX_TAGS_PER_PREMIO: 10,
  MAX_TAG_LENGTH: 30,
  MAX_POINTS_REQUIRED: 1000000,
  MAX_STOCK: 100000,
  MAX_BULK_IMPORT: 100,
} as const;
