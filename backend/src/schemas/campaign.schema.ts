/**
 * @file campaign.schema.ts
 * @version 2.0.0
 * @description Schemas de validação Zod para operações com campanhas.
 * Define estruturas complexas para campanhas, metas, regras e gamificação.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos schemas de campanha
 * - Validação de estruturas complexas (GoalRequirements, RuleConditions)
 * - Schemas para sistema de kits e cartelas
 * - Validação de datas e períodos
 * - Normalização de dados automática
 */

import { z } from 'zod';
import { CampaignStatus, GoalUnitType, RuleOperator, TargetField } from '@prisma/client';

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
 * Schema para validação de título de campanha
 */
const campaignTitleSchema = z
  .string({
    required_error: 'Título é obrigatório',
    invalid_type_error: 'Título deve ser um texto',
  })
  .min(3, 'Título deve ter pelo menos 3 caracteres')
  .max(100, 'Título deve ter no máximo 100 caracteres')
  .transform((title) => title.trim());

/**
 * Schema para validação de descrição
 */
const descriptionSchema = z
  .string({
    required_error: 'Descrição é obrigatória',
    invalid_type_error: 'Descrição deve ser um texto',
  })
  .min(10, 'Descrição deve ter pelo menos 10 caracteres')
  .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
  .transform((desc) => desc.trim());

/**
 * Schema para validação de URL de imagem
 */
const imageUrlSchema = z
  .string({
    required_error: 'URL da imagem é obrigatória',
    invalid_type_error: 'URL da imagem deve ser um texto',
  })
  .url('URL da imagem deve ser válida')
  .or(z.literal(''))
  .transform((url) => url || `https://picsum.photos/seed/campaign${Date.now()}/400/300`);

/**
 * Schema para validação de data
 */
const dateTimeSchema = z
  .string({
    required_error: 'Data é obrigatória',
    invalid_type_error: 'Data deve ser um texto',
  })
  .datetime('Data deve estar no formato ISO 8601');

/**
 * Schema para validação de status da campanha
 */
const campaignStatusSchema = z.nativeEnum(CampaignStatus, {
  required_error: 'Status da campanha é obrigatório',
  invalid_type_error: 'Status da campanha inválido',
});

/**
 * Schema para validação de pontos
 */
const pointsSchema = z
  .number({
    required_error: 'Pontos são obrigatórios',
    invalid_type_error: 'Pontos devem ser um número',
  })
  .int('Pontos devem ser um número inteiro')
  .min(1, 'Pontos devem ser maior que zero')
  .max(100000, 'Pontos não podem exceder 100.000');

/**
 * Schema para validação de percentual
 */
const percentageSchema = z
  .number({
    required_error: 'Percentual é obrigatório',
    invalid_type_error: 'Percentual deve ser um número',
  })
  .min(0, 'Percentual não pode ser negativo')
  .max(100, 'Percentual não pode ser maior que 100');

// ==================== SCHEMAS DE REGRAS ====================

/**
 * Schema para operadores de regra
 */
const ruleOperatorSchema = z.nativeEnum(RuleOperator, {
  required_error: 'Operador da regra é obrigatório',
  invalid_type_error: 'Operador da regra inválido',
});

/**
 * Schema para campos alvo das regras
 */
const targetFieldSchema = z.nativeEnum(TargetField, {
  required_error: 'Campo alvo é obrigatório',
  invalid_type_error: 'Campo alvo inválido',
});

/**
 * Schema para tipo de unidade das metas
 */
const goalUnitTypeSchema = z.nativeEnum(GoalUnitType, {
  required_error: 'Tipo de unidade é obrigatório',
  invalid_type_error: 'Tipo de unidade inválido',
});

/**
 * Schema para condição de regra
 */
export const ruleConditionSchema = z.object({
  id: uuidSchema.optional(),
  field: targetFieldSchema,
  operator: ruleOperatorSchema,
  value: z
    .string({
      required_error: 'Valor da condição é obrigatório',
      invalid_type_error: 'Valor da condição deve ser um texto',
    })
    .min(1, 'Valor da condição não pode estar vazio')
    .max(255, 'Valor da condição deve ter no máximo 255 caracteres'),
}).refine(
  (data) => {
    // Validação específica baseada no campo e operador
    if (data.field === TargetField.SALE_VALUE && 
        ['GREATER_THAN', 'LESS_THAN'].includes(data.operator)) {
      const numValue = parseFloat(data.value);
      return !isNaN(numValue) && numValue >= 0;
    }
    return true;
  },
  {
    message: 'Valor deve ser um número válido para campos numéricos',
    path: ['value'],
  }
);

/**
 * Schema para meta de campanha (GoalRequirement)
 */
export const goalRequirementSchema = z.object({
  id: uuidSchema.optional(),
  description: z
    .string({
      required_error: 'Descrição da meta é obrigatória',
      invalid_type_error: 'Descrição da meta deve ser um texto',
    })
    .min(3, 'Descrição da meta deve ter pelo menos 3 caracteres')
    .max(200, 'Descrição da meta deve ter no máximo 200 caracteres')
    .transform((desc) => desc.trim()),
  quantity: z
    .number({
      required_error: 'Quantidade é obrigatória',
      invalid_type_error: 'Quantidade deve ser um número',
    })
    .int('Quantidade deve ser um número inteiro')
    .min(1, 'Quantidade deve ser maior que zero')
    .max(1000, 'Quantidade não pode exceder 1000'),
  unitType: goalUnitTypeSchema,
  conditions: z
    .array(ruleConditionSchema)
    .min(1, 'Pelo menos uma condição deve ser definida')
    .max(10, 'Máximo de 10 condições por meta'),
});

// ==================== SCHEMAS PRINCIPAIS ====================

/**
 * Schema para criação de campanha
 */
export const createCampaignSchema = z.object({
  title: campaignTitleSchema,
  description: descriptionSchema,
  imageUrl: imageUrlSchema.optional(),
  startDate: dateTimeSchema,
  endDate: dateTimeSchema,
  pointsOnCompletion: pointsSchema.optional(),
  managerPointsPercentage: percentageSchema.optional(),
  goalRequirements: z
    .array(goalRequirementSchema)
    .min(1, 'Pelo menos uma meta deve ser definida')
    .max(20, 'Máximo de 20 metas por campanha')
    .optional(),
  
  // Campos legados para compatibilidade
  points: pointsSchema.optional(),
  goal: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional(),
}).refine(
  (data) => {
    // Valida se a data de início é anterior à data de fim
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return startDate < endDate;
  },
  {
    message: 'Data de início deve ser anterior à data de término',
    path: ['endDate'],
  }
).refine(
  (data) => {
    // Valida se a data de início não é no passado (com margem de 1 hora)
    const startDate = new Date(data.startDate);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return startDate >= oneHourAgo;
  },
  {
    message: 'Data de início não pode ser no passado',
    path: ['startDate'],
  }
).refine(
  (data) => {
    // Valida se pelo menos um sistema de pontuação está definido
    const hasComplexGoals = data.goalRequirements && data.goalRequirements.length > 0;
    const hasSimpleGoals = data.points && data.goal;
    return hasComplexGoals || hasSimpleGoals;
  },
  {
    message: 'Defina metas complexas ou sistema simples de pontuação',
    path: ['goalRequirements'],
  }
).refine(
  (data) => {
    // Se tiver metas complexas, deve ter pointsOnCompletion
    if (data.goalRequirements && data.goalRequirements.length > 0) {
      return !!data.pointsOnCompletion;
    }
    return true;
  },
  {
    message: 'Campanhas com metas complexas devem definir pontos de conclusão',
    path: ['pointsOnCompletion'],
  }
);

/**
 * Schema para atualização de campanha
 */
export const updateCampaignSchema = z.object({
  title: campaignTitleSchema.optional(),
  description: descriptionSchema.optional(),
  imageUrl: imageUrlSchema.optional(),
  startDate: dateTimeSchema.optional(),
  endDate: dateTimeSchema.optional(),
  status: campaignStatusSchema.optional(),
  pointsOnCompletion: pointsSchema.optional(),
  managerPointsPercentage: percentageSchema.optional(),
  goalRequirements: z
    .array(goalRequirementSchema)
    .min(1, 'Pelo menos uma meta deve ser definida')
    .max(20, 'Máximo de 20 metas por campanha')
    .optional(),
  
  // Campos legados
  points: pointsSchema.optional(),
  goal: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional(),
  progress: z
    .number()
    .int()
    .min(0)
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser fornecido para atualização' }
).refine(
  (data) => {
    // Valida datas se ambas estiverem presentes
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return startDate < endDate;
    }
    return true;
  },
  {
    message: 'Data de início deve ser anterior à data de término',
    path: ['endDate'],
  }
);

/**
 * Schema para parâmetros de rota de campanha
 */
export const campaignParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema para filtros de consulta de campanhas
 */
export const campaignFiltersSchema = z.object({
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
    .enum(['title', 'startDate', 'endDate', 'createdAt', 'status'])
    .optional()
    .default('createdAt'),
  
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
    .enum([...Object.values(CampaignStatus), 'all'])
    .optional()
    .default('all'),

  // Filtros por data
  startAfter: dateTimeSchema.optional(),
  startBefore: dateTimeSchema.optional(),
  endAfter: dateTimeSchema.optional(),
  endBefore: dateTimeSchema.optional(),

  // Filtros por pontuação
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

  // Filtro por usuário (para campanhas que o usuário participa)
  userId: uuidSchema.optional(),

  // Filtro para campanhas ativas apenas
  activeOnly: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Schema para consulta de detalhes da campanha com progresso do usuário
 */
export const campaignDetailsSchema = z.object({
  campaignId: uuidSchema,
  userId: uuidSchema.optional(),
  includeKits: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('true')
    .transform((val) => val === 'true'),
  includeSubmissions: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Schema para estatísticas de campanha
 */
export const campaignStatsSchema = z.object({
  campaignId: uuidSchema,
  period: z
    .enum(['day', 'week', 'month', 'all'])
    .optional()
    .default('all'),
  includeUserStats: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Schema para duplicação de campanha
 */
export const duplicateCampaignSchema = z.object({
  campaignId: uuidSchema,
  newTitle: campaignTitleSchema,
  startDate: dateTimeSchema,
  endDate: dateTimeSchema,
  adjustPoints: z
    .number()
    .min(-50)
    .max(50)
    .optional()
    .default(0),
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

/**
 * Schema para ativação/desativação de campanha
 */
export const toggleCampaignStatusSchema = z.object({
  status: z.enum([CampaignStatus.ATIVA, CampaignStatus.CONCLUIDA, CampaignStatus.EXPIRADA]),
  reason: z
    .string({
      required_error: 'Motivo é obrigatório',
      invalid_type_error: 'Motivo deve ser um texto',
    })
    .min(5, 'Motivo deve ter pelo menos 5 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
});

/**
 * Schema para relatório de performance da campanha
 */
export const campaignPerformanceSchema = z.object({
  campaignId: uuidSchema,
  groupBy: z
    .enum(['day', 'week', 'month', 'user', 'optic'])
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
});

// ==================== TIPOS INFERIDOS ====================

export type CreateCampaignData = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignData = z.infer<typeof updateCampaignSchema>;
export type CampaignParams = z.infer<typeof campaignParamsSchema>;
export type CampaignFilters = z.infer<typeof campaignFiltersSchema>;
export type CampaignDetailsQuery = z.infer<typeof campaignDetailsSchema>;
export type CampaignStatsQuery = z.infer<typeof campaignStatsSchema>;
export type DuplicateCampaignData = z.infer<typeof duplicateCampaignSchema>;
export type ToggleCampaignStatusData = z.infer<typeof toggleCampaignStatusSchema>;
export type CampaignPerformanceQuery = z.infer<typeof campaignPerformanceSchema>;
export type RuleConditionData = z.infer<typeof ruleConditionSchema>;
export type GoalRequirementData = z.infer<typeof goalRequirementSchema>;

// ==================== UTILITÁRIOS DE VALIDAÇÃO ====================

/**
 * Valida dados de criação de campanha
 */
export const validateCreateCampaign = (data: unknown) => {
  return createCampaignSchema.safeParse(data);
};

/**
 * Valida dados de atualização de campanha
 */
export const validateUpdateCampaign = (data: unknown) => {
  return updateCampaignSchema.safeParse(data);
};

/**
 * Valida filtros de consulta
 */
export const validateCampaignFilters = (data: unknown) => {
  return campaignFiltersSchema.safeParse(data);
};

/**
 * Valida regra de condição
 */
export const validateRuleCondition = (data: unknown) => {
  return ruleConditionSchema.safeParse(data);
};

/**
 * Valida meta da campanha
 */
export const validateGoalRequirement = (data: unknown) => {
  return goalRequirementSchema.safeParse(data);
};

// ==================== SCHEMAS DE RESPOSTA ====================

/**
 * Schema para resposta de campanha
 */
export const campaignResponseSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().url(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: campaignStatusSchema,
  pointsOnCompletion: z.number().int().min(0).nullable(),
  managerPointsPercentage: z.number().min(0).max(100).nullable(),
  
  // Campos legados
  points: z.number().int().min(0).nullable(),
  goal: z.number().int().min(0).nullable(),
  progress: z.number().int().min(0).nullable(),
  
  goalRequirements: z.array(z.object({
    id: uuidSchema,
    description: z.string(),
    quantity: z.number().int().min(1),
    unitType: goalUnitTypeSchema,
    conditions: z.array(z.object({
      id: uuidSchema,
      field: targetFieldSchema,
      operator: ruleOperatorSchema,
      value: z.string(),
    })),
  })).optional(),
  
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema para resposta paginada de campanhas
 */
export const paginatedCampaignsResponseSchema = z.object({
  data: z.array(campaignResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// ==================== CONSTANTES ====================

/**
 * Status disponíveis para campanhas
 */
export const CAMPAIGN_STATUSES = Object.values(CampaignStatus);

/**
 * Operadores de regra disponíveis
 */
export const RULE_OPERATORS = Object.values(RuleOperator);

/**
 * Campos alvo disponíveis
 */
export const TARGET_FIELDS = Object.values(TargetField);

/**
 * Tipos de unidade disponíveis
 */
export const GOAL_UNIT_TYPES = Object.values(GoalUnitType);

/**
 * Mensagens de erro específicas para campanhas
 */
export const CAMPAIGN_ERROR_MESSAGES = {
  NOT_FOUND: 'Campanha não encontrada',
  ALREADY_STARTED: 'Campanha já foi iniciada e não pode ser modificada',
  ALREADY_ENDED: 'Campanha já terminou',
  INVALID_DATES: 'Datas da campanha são inválidas',
  NO_GOALS_DEFINED: 'Nenhuma meta foi definida para a campanha',
  INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes para esta operação',
  CANNOT_DELETE_WITH_PARTICIPANTS: 'Não é possível excluir campanha com participantes',
} as const;

/**
 * Labels para status de campanha
 */
export const CAMPAIGN_STATUS_LABELS = {
  [CampaignStatus.ATIVA]: 'Ativa',
  [CampaignStatus.CONCLUIDA]: 'Concluída',
  [CampaignStatus.EXPIRADA]: 'Expirada',
} as const;

/**
 * Labels para operadores de regra
 */
export const RULE_OPERATOR_LABELS = {
  [RuleOperator.CONTAINS]: 'Contém',
  [RuleOperator.NOT_CONTAINS]: 'Não contém',
  [RuleOperator.EQUALS]: 'Igual a',
  [RuleOperator.NOT_EQUALS]: 'Diferente de',
  [RuleOperator.GREATER_THAN]: 'Maior que',
  [RuleOperator.LESS_THAN]: 'Menor que',
} as const;

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
} as const;

/**
 * Labels para tipos de unidade
 */
export const GOAL_UNIT_TYPE_LABELS = {
  [GoalUnitType.UNIT]: 'Unidade',
  [GoalUnitType.PAIR]: 'Par',
} as const;
