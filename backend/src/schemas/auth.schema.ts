/**
 * @file auth.schema.ts
 * @version 2.0.0
 * @description Schemas de validação Zod para operações de autenticação.
 * Define estruturas e regras de validação para login, registro e recuperação de senha.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos schemas de autenticação
 * - Validação robusta de dados de entrada
 * - Normalização automática de dados
 * - Mensagens de erro em português
 * - Validação de CPF, CNPJ e telefone brasileiros
 */

import { z } from 'zod';
import { UserRole } from '@prisma/client';
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

/**
 * Schema base para validação de email
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
 * Schema base para validação de senha
 */
const passwordSchema = z
  .string({
    required_error: 'Senha é obrigatória',
    invalid_type_error: 'Senha deve ser um texto',
  })
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(100, 'Senha deve ter no máximo 100 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'
  );

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
    {
      message: 'CPF inválido',
    }
  );

/**
 * Schema para validação de CNPJ
 */
const cnpjSchema = z
  .string({
    required_error: 'CNPJ é obrigatório',
    invalid_type_error: 'CNPJ deve ser um texto',
  })
  .min(1, 'CNPJ é obrigatório')
  .transform(normalizeCNPJ)
  .refine(
    (cnpj) => isValidCNPJ(cnpj),
    {
      message: 'CNPJ inválido',
    }
  );

/**
 * Schema para validação de telefone
 */
const phoneSchema = z
  .string({
    required_error: 'Telefone é obrigatório',
    invalid_type_error: 'Telefone deve ser um texto',
  })
  .min(1, 'Telefone é obrigatório')
  .transform(normalizePhone)
  .refine(
    (phone) => isValidPhone(phone),
    {
      message: 'Telefone inválido. Use o formato: (11) 99999-9999',
    }
  );

/**
 * Schema para validação de nome
 */
const nameSchema = z
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
 * Schema para validação de role de usuário
 */
const userRoleSchema = z
  .nativeEnum(UserRole, {
    required_error: 'Tipo de usuário é obrigatório',
    invalid_type_error: 'Tipo de usuário inválido',
  });

/**
 * Schema para login de usuário
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({
      required_error: 'Senha é obrigatória',
      invalid_type_error: 'Senha deve ser um texto',
    })
    .min(1, 'Senha é obrigatória'),
});

/**
 * Schema para registro de usuário
 */
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z
    .string({
      required_error: 'Confirmação de senha é obrigatória',
      invalid_type_error: 'Confirmação de senha deve ser um texto',
    })
    .min(1, 'Confirmação de senha é obrigatória'),
  cpf: cpfSchema,
  whatsapp: phoneSchema,
  role: userRoleSchema,
  opticName: z
    .string({
      required_error: 'Nome da ótica é obrigatório',
      invalid_type_error: 'Nome da ótica deve ser um texto',
    })
    .min(2, 'Nome da ótica deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da ótica deve ter no máximo 100 caracteres')
    .transform((name) => name.trim()),
  opticCNPJ: cnpjSchema,
  managerId: z
    .string()
    .uuid('ID do gerente deve ser um UUID válido')
    .optional(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  }
).refine(
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
 * Schema para solicitação de recuperação de senha
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para redefinição de senha
 */
export const resetPasswordSchema = z.object({
  token: z
    .string({
      required_error: 'Token é obrigatório',
      invalid_type_error: 'Token deve ser um texto',
    })
    .min(1, 'Token é obrigatório'),
  password: passwordSchema,
  confirmPassword: z
    .string({
      required_error: 'Confirmação de senha é obrigatória',
      invalid_type_error: 'Confirmação de senha deve ser um texto',
    })
    .min(1, 'Confirmação de senha é obrigatória'),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  }
);

/**
 * Schema para alteração de senha
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: 'Senha atual é obrigatória',
      invalid_type_error: 'Senha atual deve ser um texto',
    })
    .min(1, 'Senha atual é obrigatória'),
  newPassword: passwordSchema,
  confirmPassword: z
    .string({
      required_error: 'Confirmação de senha é obrigatória',
      invalid_type_error: 'Confirmação de senha deve ser um texto',
    })
    .min(1, 'Confirmação de senha é obrigatória'),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'A nova senha deve ser diferente da senha atual',
    path: ['newPassword'],
  }
);

/**
 * Schema para validação de token JWT
 */
export const tokenSchema = z.object({
  token: z
    .string({
      required_error: 'Token é obrigatório',
      invalid_type_error: 'Token deve ser um texto',
    })
    .min(1, 'Token é obrigatório'),
});

/**
 * Schema para refresh token
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'Refresh token é obrigatório',
      invalid_type_error: 'Refresh token deve ser um texto',
    })
    .min(1, 'Refresh token é obrigatório'),
});

/**
 * Schema para verificação de CNPJ (usado no registro para validar ótica)
 */
export const validateCNPJSchema = z.object({
  cnpj: cnpjSchema,
});

/**
 * Schema para verificação de email disponível
 */
export const checkEmailSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para verificação de CPF disponível
 */
export const checkCPFSchema = z.object({
  cpf: cpfSchema,
});

/**
 * Schema para atualização de perfil (dados que podem ser alterados após registro)
 */
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  whatsapp: phoneSchema.optional(),
  opticName: z
    .string()
    .min(2, 'Nome da ótica deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da ótica deve ter no máximo 100 caracteres')
    .transform((name) => name.trim())
    .optional(),
  avatarUrl: z
    .string()
    .url('URL do avatar deve ser válida')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'Pelo menos um campo deve ser fornecido para atualização',
  }
);

/**
 * Schema para login administrativo (com campos extras para auditoria)
 */
export const adminLoginSchema = loginSchema.extend({
  auditInfo: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema para impersonação de usuário (admin pode logar como outro usuário)
 */
export const impersonateUserSchema = z.object({
  targetUserId: z
    .string({
      required_error: 'ID do usuário alvo é obrigatório',
      invalid_type_error: 'ID do usuário alvo deve ser um texto',
    })
    .uuid('ID do usuário deve ser um UUID válido'),
  reason: z
    .string({
      required_error: 'Motivo da impersonação é obrigatório',
      invalid_type_error: 'Motivo deve ser um texto',
    })
    .min(10, 'Motivo deve ter pelo menos 10 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
});

// ==================== TIPOS INFERIDOS ====================

/**
 * Tipos TypeScript inferidos dos schemas Zod
 */
export type LoginData = z.infer<typeof loginSchema>;
export type UserRegistrationData = z.infer<typeof registerSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type TokenData = z.infer<typeof tokenSchema>;
export type RefreshTokenData = z.infer<typeof refreshTokenSchema>;
export type ValidateCNPJData = z.infer<typeof validateCNPJSchema>;
export type CheckEmailData = z.infer<typeof checkEmailSchema>;
export type CheckCPFData = z.infer<typeof checkCPFSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type AdminLoginData = z.infer<typeof adminLoginSchema>;
export type ImpersonateUserData = z.infer<typeof impersonateUserSchema>;

// ==================== UTILITÁRIOS DE VALIDAÇÃO ====================

/**
 * Utilitário para validar dados de login
 */
export const validateLogin = (data: unknown) => {
  return loginSchema.safeParse(data);
};

/**
 * Utilitário para validar dados de registro
 */
export const validateRegistration = (data: unknown) => {
  return registerSchema.safeParse(data);
};

/**
 * Utilitário para validar email
 */
export const validateEmail = (email: string) => {
  return emailSchema.safeParse(email);
};

/**
 * Utilitário para validar senha
 */
export const validatePassword = (password: string) => {
  return passwordSchema.safeParse(password);
};

/**
 * Utilitário para validar CPF
 */
export const validateCPF = (cpf: string) => {
  return cpfSchema.safeParse(cpf);
};

/**
 * Utilitário para validar CNPJ
 */
export const validateCNPJ = (cnpj: string) => {
  return cnpjSchema.safeParse(cnpj);
};

/**
 * Utilitário para validar telefone
 */
export const validatePhone = (phone: string) => {
  return phoneSchema.safeParse(phone);
};

// ==================== SCHEMAS DE RESPOSTA ====================

/**
 * Schema para resposta de login bem-sucedido
 */
export const loginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      role: userRoleSchema,
      status: z.enum(['ACTIVE', 'BLOCKED']),
      opticName: z.string(),
      avatarUrl: z.string().url().optional(),
    }),
    token: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.string().datetime(),
  }),
});

/**
 * Schema para resposta de registro bem-sucedido
 */
export const registerResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      role: userRoleSchema,
      opticName: z.string(),
    }),
  }),
});

/**
 * Tipos para as respostas
 */
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

// ==================== CONSTANTES ====================

/**
 * Constantes para validação de senha
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 100,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_DIGITS: true,
  REQUIRE_SPECIAL_CHARS: false,
} as const;

/**
 * Mensagens de erro padrão
 */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos',
  EMAIL_ALREADY_EXISTS: 'Este e-mail já está cadastrado',
  CPF_ALREADY_EXISTS: 'Este CPF já está cadastrado',
  CNPJ_NOT_FOUND: 'CNPJ não encontrado ou inválido',
  WEAK_PASSWORD: 'Senha não atende aos requisitos de segurança',
  TOKEN_EXPIRED: 'Token expirado',
  TOKEN_INVALID: 'Token inválido',
  USER_BLOCKED: 'Usuário bloqueado',
  USER_NOT_FOUND: 'Usuário não encontrado',
} as const;
