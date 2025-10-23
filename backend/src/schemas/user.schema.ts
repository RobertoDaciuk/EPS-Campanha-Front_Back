/**
 * @file user.schema.ts
 * @version 2.0.0
 * @description Schemas de validação Zod para operações com usuários.
 * Define estruturas e regras para CRUD de usuários, filtros e consultas.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos schemas de usuário
 * - Validação para criação, atualização e filtros
 * - Schemas para consultas e relatórios
 * - Validação de hierarquia gerente-vendedor
 * - Normalização automática de dados
 */

import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';
import { 
  isValidCPF, 
  isValidCNPJ, 
  isValidPhone, 
  normalizeCPF, 
  normalizeCNPJ, 
  normalizePhone, 
  normalizeEmail,
  normalizeName 
} from '../utils/normalizers';

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
 * Schema para validação de nome de usuário
 */
const userNameSchema = z
  .string({
    required_error: 'Nome é obrigatório',
    invalid_type_error: 'Nome deve ser um texto',
  })
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .regex(
    /^[a-zA-ZÀ-ÿ\s]+$/,
    'Nome deve conter apenas letras e espaços'
  )
  .transform(normalizeName);

/**
 * Schema para validação de email
 */
const emailSchema = z
  .string({
    required_error: 'E-mail é obrigatório',
    invalid_type_error: 'E-mail deve ser um texto',
  })
  .min(1, 'E-mail é obrigatório')
  .max(255, 'E-mail deve ter no máximo 255 caracteres')
  .email('Formato de e-mail inválido')
  .transform(normalizeEmail);

/**
 * Schema para validação de CPF
 */
const cpfSchema = z
  .string({
    required_error: 'CPF é obrigatório',
    invalid_type_error: 'CPF deve ser um texto',
  })
  .min(1, 'CPF é obrigatório')
  .transform(normalizeCPF)
  .refine(
    (cpf) => isValidCPF(cpf),
    { message: 'CPF inválido' }
  );

/**
 * Schema para validação de telefone/WhatsApp
 */
const whatsappSchema = z
  .string({
    required_error: 'WhatsApp é obrigatório',
    invalid_type_error: 'WhatsApp deve ser um texto',
  })
  .min(1, 'WhatsApp é obrigatório')
  .transform(normalizePhone)
  .refine(
    (phone) => isValidPhone(phone),
    { message: 'Número de WhatsApp inválido. Use o formato: (11) 99999-9999' }
  );

/**
 * Schema para validação de URL de avatar
 */
const avatarUrlSchema = z
  .string()
  .url('URL do avatar deve ser válida')
  .or(z.literal(''))
  .transform((url) => url || `https://i.pravatar.cc/150?u=${Date.now()}`);

/**
 * Schema para validação de role de usuário
 */
const userRoleSchema = z.nativeEnum(UserRole, {
  required_error: 'Tipo de usuário é obrigatório',
  invalid_type_error: 'Tipo de usuário inválido',
});

/**
 * Schema para validação de status de usuário
 */
const userStatusSchema = z.nativeEnum(UserStatus, {
  required_error: 'Status do usuário é obrigatório',
  invalid_type_error: 'Status do usuário inválido',
});

/**
 * Schema para validação de nome da ótica
 */
const opticNameSchema = z
  .string({
    required_error: 'Nome da ótica é obrigatório',
    invalid_type_error: 'Nome da ótica deve ser um texto',
  })
  .min(2, 'Nome da ótica deve ter pelo menos 2 caracteres')
  .max(100, 'Nome da ótica deve ter no máximo 100 caracteres')
  .transform((name) => name.trim());

/**
 * Schema para validação de CNPJ da ótica
 */
const opticCNPJSchema = z
  .string({
    required_error: 'CNPJ da ótica é obrigatório',
    invalid_type_error: 'CNPJ da ótica deve ser um texto',
  })
  .min(1, 'CNPJ da ótica é obrigatório')
  .transform(normalizeCNPJ)
  .refine(
    (cnpj) => isValidCNPJ(cnpj),
    { message: 'CNPJ da ótica inválido' }
  );

/**
 * Schema para validação de nível do usuário
 */
const userLevelSchema = z
  .string({
    required_error: 'Nível do usuário é obrigatório',
    invalid_type_error: 'Nível deve ser um texto',
  })
  .min(1, 'Nível é obrigatório')
  .max(50, 'Nível deve ter no máximo 50 caracteres')
  .default('Bronze');

/**
 * Schema para validação de pontos
 */
const pointsSchema = z
  .number({
    required_error: 'Pontos são obrigatórios',
    invalid_type_error: 'Pontos devem ser um número',
  })
  .int('Pontos devem ser um número inteiro')
  .min(0, 'Pontos não podem ser negativos')
  .default(0);

// ==================== SCHEMAS PRINCIPAIS ====================

/**
 * Schema para criação de usuário
 */
export const createUserSchema = z.object({
  name: userNameSchema,
  email: emailSchema,
  cpf: cpfSchema,
  whatsapp: whatsappSchema,
  avatarUrl: avatarUrlSchema.optional(),
  role: userRoleSchema,
  status: userStatusSchema.default(UserStatus.ACTIVE),
  opticName: opticNameSchema,
  opticCNPJ: opticCNPJSchema,
  level: userLevelSchema.optional(),
  points: pointsSchema.optional(),
  pointsToNextLevel: pointsSchema.optional(),
  managerId: uuidSchema.optional(),
}).refine(
  (data) => {
    // Vendedores devem ter um gerente
    if (data.role === UserRole.VENDEDOR) {
      return !!data.managerId;
    }
    return true;
  },
  {
    message: 'Vendedores devem ter um gerente associado',
    path: ['managerId'],
  }
).refine(
  (data) => {
    // Gerentes e Admins não devem ter gerente
    if (data.role === UserRole.GERENTE || data.role === UserRole.ADMIN) {
      return !data.managerId;
    }
    return true;
  },
  {
    message: 'Gerentes e administradores não podem ter gerente associado',
    path: ['managerId'],
  }
);

/**
 * Schema para atualização de usuário
 */
export const updateUserSchema = z.object({
  name: userNameSchema.optional(),
  email: emailSchema.optional(),
  cpf: cpfSchema.optional(),
  whatsapp: whatsappSchema.optional(),
  avatarUrl: avatarUrlSchema.optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  opticName: opticNameSchema.optional(),
  opticCNPJ: opticCNPJSchema.optional(),
  level: userLevelSchema.optional(),
  points: pointsSchema.optional(),
  pointsToNextLevel: pointsSchema.optional(),
  managerId: uuidSchema.optional().nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser fornecido para atualização' }
);

/**
 * Schema para parâmetros de rota de usuário
 */
export const userParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema para filtros de consulta de usuários
 */
export const userFiltersSchema = z.object({
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
    .pipe(z.number().int().min(1, 'Limite deve ser maior que 0').max(100, 'Limite máximo é 100'))
    .optional()
    .default('10')
    .transform((val) => parseInt(val)),

  // Ordenação
  sort: z
    .enum(['name', 'email', 'createdAt', 'updatedAt', 'points', 'level'])
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
  
  role: z
    .enum([...Object.values(UserRole), 'all'])
    .optional()
    .default('all'),
  
  status: z
    .enum([...Object.values(UserStatus), 'all'])
    .optional()
    .default('all'),
  
  managerId: uuidSchema.optional(),
  
  opticCNPJ: z
    .string()
    .transform(normalizeCNPJ)
    .refine((cnpj) => !cnpj || isValidCNPJ(cnpj), { message: 'CNPJ inválido' })
    .optional(),

  // Filtros por data
  createdAfter: z
    .string()
    .datetime('Data de criação deve estar no formato ISO 8601')
    .optional(),
  
  createdBefore: z
    .string()
    .datetime('Data de criação deve estar no formato ISO 8601')
    .optional(),

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

  // Filtros por nível
  level: z
    .string()
    .max(50, 'Nível deve ter no máximo 50 caracteres')
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
).refine(
  (data) => {
    // Se createdAfter e createdBefore forem fornecidos, createdAfter deve ser anterior a createdBefore
    if (data.createdAfter && data.createdBefore) {
      return new Date(data.createdAfter) <= new Date(data.createdBefore);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior à data final',
    path: ['createdAfter'],
  }
);

/**
 * Schema para atualização de status do usuário
 */
export const updateUserStatusSchema = z.object({
  status: userStatusSchema,
  reason: z
    .string({
      required_error: 'Motivo da alteração é obrigatório',
      invalid_type_error: 'Motivo deve ser um texto',
    })
    .min(5, 'Motivo deve ter pelo menos 5 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
});

/**
 * Schema para redefinição de senha de usuário (admin)
 */
export const resetUserPasswordSchema = z.object({
  newPassword: z
    .string({
      required_error: 'Nova senha é obrigatória',
      invalid_type_error: 'Nova senha deve ser um texto',
    })
    .min(8, 'Nova senha deve ter no mínimo 8 caracteres')
    .max(100, 'Nova senha deve ter no máximo 100 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'
    ),
  reason: z
    .string({
      required_error: 'Motivo da redefinição é obrigatório',
      invalid_type_error: 'Motivo deve ser um texto',
    })
    .min(10, 'Motivo deve ter pelo menos 10 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
});

/**
 * Schema para associação de vendedor a gerente
 */
export const associateSellerToManagerSchema = z.object({
  sellerId: uuidSchema,
  managerId: uuidSchema,
});

/**
 * Schema para consulta de vendedores de um gerente
 */
export const managerSellersSchema = z.object({
  managerId: uuidSchema,
  includeInactive: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Schema para atualização de pontos do usuário
 */
export const updateUserPointsSchema = z.object({
  points: pointsSchema,
  reason: z
    .string({
      required_error: 'Motivo da alteração é obrigatório',
      invalid_type_error: 'Motivo deve ser um texto',
    })
    .min(5, 'Motivo deve ter pelo menos 5 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
  operation: z
    .enum(['set', 'add', 'subtract'])
    .default('set'),
});

/**
 * Schema para consulta de estatísticas de usuário
 */
export const userStatsSchema = z.object({
  userId: uuidSchema,
  period: z
    .enum(['day', 'week', 'month', 'quarter', 'year', 'all'])
    .optional()
    .default('month'),
  includeDetails: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Schema para verificação de disponibilidade de dados
 */
export const checkAvailabilitySchema = z.object({
  field: z.enum(['email', 'cpf', 'cnpj']),
  value: z
    .string({
      required_error: 'Valor é obrigatório',
      invalid_type_error: 'Valor deve ser um texto',
    })
    .min(1, 'Valor é obrigatório'),
  excludeUserId: uuidSchema.optional(),
}).refine(
  (data) => {
    if (data.field === 'email') {
      return z.string().email().safeParse(data.value).success;
    }
    if (data.field === 'cpf') {
      return isValidCPF(data.value);
    }
    if (data.field === 'cnpj') {
      return isValidCNPJ(data.value);
    }
    return true;
  },
  {
    message: 'Formato do campo inválido',
    path: ['value'],
  }
);

/**
 * Schema para importação em lote de usuários
 */
export const bulkUserImportSchema = z.object({
  users: z
    .array(createUserSchema.partial({ managerId: true }).extend({
      managerEmail: z
        .string()
        .email('E-mail do gerente deve ser válido')
        .optional(),
    }))
    .min(1, 'Pelo menos um usuário deve ser fornecido')
    .max(1000, 'Máximo de 1000 usuários por importação'),
  
  validateOnly: z
    .boolean()
    .optional()
    .default(false),
  
  skipDuplicates: z
    .boolean()
    .optional()
    .default(true),
});

// ==================== TIPOS INFERIDOS ====================

export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type UserParams = z.infer<typeof userParamsSchema>;
export type UserFilters = z.infer<typeof userFiltersSchema>;
export type UpdateUserStatusData = z.infer<typeof updateUserStatusSchema>;
export type ResetUserPasswordData = z.infer<typeof resetUserPasswordSchema>;
export type AssociateSellerToManagerData = z.infer<typeof associateSellerToManagerSchema>;
export type ManagerSellersQuery = z.infer<typeof managerSellersSchema>;
export type UpdateUserPointsData = z.infer<typeof updateUserPointsSchema>;
export type UserStatsQuery = z.infer<typeof userStatsSchema>;
export type CheckAvailabilityData = z.infer<typeof checkAvailabilitySchema>;
export type BulkUserImportData = z.infer<typeof bulkUserImportSchema>;

// ==================== UTILITÁRIOS DE VALIDAÇÃO ====================

/**
 * Valida dados de criação de usuário
 */
export const validateCreateUser = (data: unknown) => {
  return createUserSchema.safeParse(data);
};

/**
 * Valida dados de atualização de usuário
 */
export const validateUpdateUser = (data: unknown) => {
  return updateUserSchema.safeParse(data);
};

/**
 * Valida filtros de consulta
 */
export const validateUserFilters = (data: unknown) => {
  return userFiltersSchema.safeParse(data);
};

/**
 * Valida disponibilidade de campo
 */
export const validateAvailability = (data: unknown) => {
  return checkAvailabilitySchema.safeParse(data);
};

// ==================== SCHEMAS DE RESPOSTA ====================

/**
 * Schema para resposta de usuário
 */
export const userResponseSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.string().email(),
  cpf: z.string(),
  whatsapp: z.string(),
  avatarUrl: z.string().url(),
  role: userRoleSchema,
  status: userStatusSchema,
  opticName: z.string(),
  opticCNPJ: z.string(),
  level: z.string(),
  points: z.number().int().min(0),
  pointsToNextLevel: z.number().int().min(0),
  managerId: uuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema para resposta paginada de usuários
 */
export const paginatedUsersResponseSchema = z.object({
  data: z.array(userResponseSchema),
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
 * Níveis disponíveis para usuários
 */
export const USER_LEVELS = [
  'Bronze',
  'Prata',
  'Ouro',
  'Platina',
  'Diamante',
] as const;

/**
 * Pontos necessários para cada nível
 */
export const LEVEL_POINTS = {
  Bronze: 0,
  Prata: 1000,
  Ouro: 2500,
  Platina: 5000,
  Diamante: 10000,
} as const;

/**
 * Mensagens de erro específicas para usuários
 */
export const USER_ERROR_MESSAGES = {
  NOT_FOUND: 'Usuário não encontrado',
  EMAIL_EXISTS: 'Este e-mail já está em uso',
  CPF_EXISTS: 'Este CPF já está cadastrado',
  CNPJ_INVALID: 'CNPJ inválido ou não encontrado',
  CANNOT_DELETE_MANAGER_WITH_SELLERS: 'Não é possível excluir gerente que possui vendedores',
  SELLER_NEEDS_MANAGER: 'Vendedores devem ter um gerente associado',
  INVALID_HIERARCHY: 'Hierarquia de usuários inválida',
} as const;

/**
 * Tipos de usuário para exibição
 */
export const USER_ROLE_LABELS = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.GERENTE]: 'Gerente',
  [UserRole.VENDEDOR]: 'Vendedor',
} as const;

/**
 * Status de usuário para exibição
 */
export const USER_STATUS_LABELS = {
  [UserStatus.ACTIVE]: 'Ativo',
  [UserStatus.BLOCKED]: 'Bloqueado',
} as const;
