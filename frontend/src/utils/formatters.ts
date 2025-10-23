/**
 * @file utils/formatters.ts
 * @version 2.0.0
 * @description Utilitários de formatação
 * @author DevEPS
 * @since 2025-10-21
 */

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ==================== FORMATAÇÃO DE DOCUMENTOS ====================

/**
 * Formata CPF
 */
export const formatCPF = (cpf: string): string => {
  const numbers = cpf.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return cpf
}

/**
 * Formata CNPJ
 */
export const formatCNPJ = (cnpj: string): string => {
  const numbers = cnpj.replace(/\D/g, '')
  if (numbers.length <= 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return cnpj
}

/**
 * Remove formatação de CPF/CNPJ
 */
export const unformatDocument = (document: string): string => {
  return document.replace(/\D/g, '')
}

// ==================== FORMATAÇÃO DE TELEFONE ====================

/**
 * Formata telefone/WhatsApp
 */
export const formatPhone = (phone: string): string => {
  const numbers = phone.replace(/\D/g, '')
  
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}

/**
 * Remove formatação de telefone
 */
export const unformatPhone = (phone: string): string => {
  return phone.replace(/\D/g, '')
}

// ==================== FORMATAÇÃO MONETÁRIA ====================

/**
 * Formata valor monetário brasileiro
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata número com separadores brasileiros
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value)
}

/**
 * Formata percentual
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Converte string monetária para número
 */
export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0
}

// ==================== FORMATAÇÃO DE DATAS ====================

/**
 * Formata data no padrão brasileiro
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return '-'
  
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Formata data e hora
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return '-'
  
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

/**
 * Formata apenas a hora
 */
export const formatTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return '-'
  
  return format(dateObj, 'HH:mm', { locale: ptBR })
}

/**
 * Formata distância até agora (ex: "há 2 horas")
 */
export const formatTimeAgo = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return '-'
  
  return formatDistanceToNow(dateObj, { locale: ptBR, addSuffix: true })
}

/**
 * Formata data para input HTML
 */
export const formatDateForInput = (date: string | Date | null | undefined): string => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return ''
  
  return format(dateObj, 'yyyy-MM-dd')
}

/**
 * Formata datetime para input HTML
 */
export const formatDateTimeForInput = (date: string | Date | null | undefined): string => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return ''
  
  return format(dateObj, 'yyyy-MM-dd\'T\'HH:mm')
}

// ==================== FORMATAÇÃO DE TEXTO ====================

/**
 * Capitaliza primeira letra
 */
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Converte para title case
 */
export const toTitleCase = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

/**
 * Trunca texto com reticências
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Gera iniciais do nome
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Converte para slug URL
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplos
}

/**
 * Conta palavras em um texto
 */
export const wordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Conta caracteres sem espaços
 */
export const charCount = (text: string, includeSpaces: boolean = true): number => {
  return includeSpaces ? text.length : text.replace(/\s/g, '').length
}

// ==================== FORMATAÇÃO DE TAMANHOS ====================

/**
 * Formata tamanho de arquivo
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Formata duração em segundos
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  
  return `${secs}s`
}

// ==================== FORMATAÇÃO DE STATUS ====================

/**
 * Formata status para exibição
 */
export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    ACTIVE: 'Ativo',
    BLOCKED: 'Bloqueado',
    PENDING: 'Pendente',
    VALIDATED: 'Validado',
    REJECTED: 'Rejeitado',
    ATIVA: 'Ativa',
    CONCLUIDA: 'Concluída',
    EXPIRADA: 'Expirada',
    PENDENTE: 'Pendente',
    PAGO: 'Pago',
  }
  
  return statusMap[status] || status
}

/**
 * Formata role de usuário
 */
export const formatUserRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    ADMIN: 'Administrador',
    GERENTE: 'Gerente',
    VENDEDOR: 'Vendedor',
  }
  
  return roleMap[role] || role
}

// ==================== FORMATAÇÃO DE LISTAS ====================

/**
 * Junta array em string com "e" no final
 */
export const joinWithAnd = (items: string[]): string => {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} e ${items[1]}`
  
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

/**
 * Pluraliza palavra baseado na quantidade
 */
export const pluralize = (count: number, singular: string, plural?: string): string => {
  if (count === 1) return `${count} ${singular}`
  return `${count} ${plural || singular + 's'}`
}
