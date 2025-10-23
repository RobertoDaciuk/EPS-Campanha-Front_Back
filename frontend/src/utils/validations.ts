/**
 * @file utils/validations.ts
 * @version 2.0.0
 * @description Utilitários de validação
 * @author DevEPS
 * @since 2025-10-21
 */

import { z } from 'zod'

// ==================== SCHEMAS DE VALIDAÇÃO ====================

export const emailSchema = z.string().email('Email inválido')

export const passwordSchema = z.string()
  .min(6, 'Senha deve ter pelo menos 6 caracteres')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter ao menos uma letra maiúscula, uma minúscula e um número')

export const cpfSchema = z.string()
  .min(11, 'CPF deve ter 11 dígitos')
  .refine(isValidCPF, 'CPF inválido')

export const cnpjSchema = z.string()
  .min(14, 'CNPJ deve ter 14 dígitos')
  .refine(isValidCNPJ, 'CNPJ inválido')

export const phoneSchema = z.string()
  .min(10, 'Telefone deve ter pelo menos 10 dígitos')
  .regex(/^[\d\s\(\)\-\+]+$/, 'Formato de telefone inválido')

export const urlSchema = z.string().url('URL inválida').optional().or(z.literal(''))

// ==================== FUNÇÕES DE VALIDAÇÃO ====================

/**
 * Valida CPF
 */
export function isValidCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '')
  
  if (numbers.length !== 11) return false
  if (/^(\d)\1+$/.test(numbers)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(numbers[9])) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  
  return digit === parseInt(numbers[10])
}

/**
 * Valida CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '')
  
  if (numbers.length !== 14) return false
  if (/^(\d)\1+$/.test(numbers)) return false
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i]
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(numbers[12])) return false
  
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i]
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  
  return digit === parseInt(numbers[13])
}

/**
 * Valida força da senha
 */
export function getPasswordStrength(password: string): {
  score: number
  label: 'Fraca' | 'Regular' | 'Boa' | 'Forte'
  suggestions: string[]
} {
  let score = 0
  const suggestions: string[] = []
  
  if (password.length >= 8) score += 1
  else suggestions.push('Use pelo menos 8 caracteres')
  
  if (/[a-z]/.test(password)) score += 1
  else suggestions.push('Adicione letras minúsculas')
  
  if (/[A-Z]/.test(password)) score += 1
  else suggestions.push('Adicione letras maiúsculas')
  
  if (/\d/.test(password)) score += 1
  else suggestions.push('Adicione números')
  
  if (/[^a-zA-Z\d]/.test(password)) score += 1
  else suggestions.push('Adicione caracteres especiais')

  const labels = ['Fraca', 'Regular', 'Boa', 'Forte'] as const
  const label = labels[Math.min(score - 1, 3)] || 'Fraca'

  return { score, label, suggestions }
}

/**
 * Valida formato de data
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(date)
}

/**
 * Valida se data é futura
 */
export function isFutureDate(date: string): boolean {
  return new Date(date) > new Date()
}

/**
 * Valida período de datas
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  return new Date(startDate) < new Date(endDate)
}

/**
 * Valida número do pedido
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  // Aceita formatos: PED-001-2025, 12345, ORD_123, etc.
  const orderRegex = /^[A-Z0-9\-_]{3,50}$/i
  return orderRegex.test(orderNumber)
}

/**
 * Valida quantidade
 */
export function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 1000
}

/**
 * Valida pontos
 */
export function isValidPoints(points: number): boolean {
  return Number.isInteger(points) && points >= 0 && points <= 1000000
}

// ==================== SCHEMAS COMPOSTOS ====================

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
  rememberMe: z.boolean().optional(),
})

export const registerFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  cpf: cpfSchema,
  whatsapp: phoneSchema,
  opticName: z.string().min(2, 'Nome da ótica é obrigatório'),
  opticCNPJ: cnpjSchema,
  terms: z.boolean().refine(val => val, 'Você deve aceitar os termos'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
})

export const submissionFormSchema = z.object({
  campaignId: z.string().min(1, 'Selecione uma campanha'),
  requirementId: z.string().min(1, 'Selecione um requisito'),
  orderNumber: z.string().min(3, 'Número do pedido deve ter pelo menos 3 caracteres')
    .refine(isValidOrderNumber, 'Formato do número do pedido inválido'),
  quantity: z.number().refine(isValidQuantity, 'Quantidade deve ser entre 1 e 1000'),
  notes: z.string().max(500, 'Observações não podem exceder 500 caracteres').optional(),
})

export const campaignFormSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  imageUrl: urlSchema,
  startDate: z.string().refine(isValidDateFormat, 'Formato de data inválido'),
  endDate: z.string().refine(isValidDateFormat, 'Formato de data inválido'),
  pointsOnCompletion: z.number().refine(isValidPoints, 'Pontos devem ser entre 0 e 1.000.000'),
  managerPointsPercentage: z.number().min(0).max(100, 'Percentual deve ser entre 0 e 100'),
  goalRequirements: z.array(z.object({
    description: z.string().min(3, 'Descrição do requisito é obrigatória'),
    quantity: z.number().min(1, 'Quantidade deve ser maior que zero'),
    unitType: z.enum(['UNIT', 'PAIR']),
  })).min(1, 'Pelo menos um requisito é obrigatório'),
}).refine(data => isValidDateRange(data.startDate, data.endDate), {
  message: 'Data de término deve ser posterior à data de início',
  path: ['endDate'],
})
