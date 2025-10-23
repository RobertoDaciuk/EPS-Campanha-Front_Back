/**
 * @file utils/helpers.ts
 * @version 2.0.0
 * @description Funções auxiliares gerais
 * @author DevEPS
 * @since 2025-10-21
 */

import { USER_LEVELS } from './constants'

// ==================== HELPERS DE ARRAY ====================

/**
 * Remove duplicatas de array
 */
export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array))
}

/**
 * Remove duplicatas por propriedade
 */
export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

/**
 * Agrupa array por chave
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    groups[groupKey] = groups[groupKey] || []
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

/**
 * Ordena array por propriedade
 */
export const sortBy = <T>(
  array: T[], 
  key: keyof T, 
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aValue = a[key]
    const bValue = b[key]
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1
    if (aValue > bValue) return direction === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Encontra item por propriedade
 */
export const findBy = <T>(
  array: T[], 
  key: keyof T, 
  value: any
): T | undefined => {
  return array.find(item => item[key] === value)
}

/**
 * Paginação manual de array
 */
export const paginate = <T>(
  array: T[], 
  page: number, 
  limit: number
): { data: T[]; pagination: any } => {
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const data = array.slice(startIndex, endIndex)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total: array.length,
      totalPages: Math.ceil(array.length / limit),
      hasNext: endIndex < array.length,
      hasPrev: page > 1,
    }
  }
}

// ==================== HELPERS DE OBJETO ====================

/**
 * Remove propriedades undefined/null/empty de objeto
 */
export const cleanObject = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.entries(obj).reduce((clean, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      clean[key as keyof T] = value
    }
    return clean
  }, {} as Partial<T>)
}

/**
 * Faz deep copy de objeto
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Compara objetos superficialmente
 */
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  
  if (keys1.length !== keys2.length) return false
  
  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) return false
  }
  
  return true
}

/**
 * Seleciona propriedades específicas de objeto
 */
export const pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

/**
 * Omite propriedades específicas de objeto
 */
export const omit = <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj }
  keys.forEach(key => {
    delete result[key]
  })
  return result
}

// ==================== HELPERS DE STRING ====================

/**
 * Gera string aleatória
 */
export const randomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Gera ID único
 */
export const generateId = (): string => {
  return `${Date.now()}-${randomString(6)}`
}

/**
 * Normaliza string para busca
 */
export const normalizeForSearch = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim()
}

/**
 * Realiza busca fuzzy simples
 */
export const fuzzySearch = (query: string, text: string): boolean => {
  const normalizedQuery = normalizeForSearch(query)
  const normalizedText = normalizeForSearch(text)
  
  return normalizedText.includes(normalizedQuery)
}

// ==================== HELPERS DE COR ====================

/**
 * Gera cor baseada em string (para avatares)
 */
export const getColorFromString = (str: string): string => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Converte hex para rgba
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Determina se cor é clara ou escura
 */
export const isLightColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  // Fórmula de luminância
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5
}

// ==================== HELPERS DE NÍVEL ====================

/**
 * Determina nível do usuário baseado nos pontos
 */
export const getUserLevel = (points: number): string => {
  if (points >= USER_LEVELS.DIAMANTE.minPoints) return 'Diamante'
  if (points >= USER_LEVELS.PLATINA.minPoints) return 'Platina'
  if (points >= USER_LEVELS.OURO.minPoints) return 'Ouro'
  if (points >= USER_LEVELS.PRATA.minPoints) return 'Prata'
  return 'Bronze'
}

/**
 * Calcula pontos para próximo nível
 */
export const getPointsToNextLevel = (points: number): number => {
  if (points >= USER_LEVELS.DIAMANTE.minPoints) return USER_LEVELS.DIAMANTE.minPoints // Max level
  if (points >= USER_LEVELS.PLATINA.minPoints) return USER_LEVELS.DIAMANTE.minPoints - points
  if (points >= USER_LEVELS.OURO.minPoints) return USER_LEVELS.PLATINA.minPoints - points
  if (points >= USER_LEVELS.PRATA.minPoints) return USER_LEVELS.OURO.minPoints - points
  return USER_LEVELS.PRATA.minPoints - points
}

/**
 * Calcula progresso até próximo nível
 */
export const getLevelProgress = (points: number): number => {
  const currentLevel = getUserLevel(points)
  const levels = Object.values(USER_LEVELS)
  const currentLevelIndex = levels.findIndex(level => level.name === currentLevel)
  
  if (currentLevelIndex === levels.length - 1) return 100 // Max level
  
  const currentLevelMin = levels[currentLevelIndex].minPoints
  const nextLevelMin = levels[currentLevelIndex + 1].minPoints
  
  return Math.round(((points - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100)
}

// ==================== HELPERS DE URL ====================

/**
 * Constrói query string de objeto
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const cleanParams = cleanObject(params)
  const searchParams = new URLSearchParams()
  
  Object.entries(cleanParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, String(v)))
    } else {
      searchParams.set(key, String(value))
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * Extrai parâmetros da URL atual
 */
export const getUrlParams = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search)
  const result: Record<string, string> = {}
  
  params.forEach((value, key) => {
    result[key] = value
  })
  
  return result
}

// ==================== HELPERS DE PERFORMANCE ====================

/**
 * Debounce - atrasa execução da função
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle - limita execução da função
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Retry com backoff exponencial
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let attempt = 1
  
  while (attempt <= maxAttempts) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await sleep(delay)
      attempt++
    }
  }
  
  throw new Error('Max attempts reached')
}

/**
 * Sleep assíncrono
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==================== HELPERS DE LOCAL STORAGE ====================

/**
 * Safe localStorage get com fallback
 */
export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Erro ao ler localStorage ${key}:`, error)
    return defaultValue
  }
}

/**
 * Safe localStorage set
 */
export const setLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Erro ao salvar localStorage ${key}:`, error)
  }
}

/**
 * Safe localStorage remove
 */
export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Erro ao remover localStorage ${key}:`, error)
  }
}

// ==================== HELPERS DE ERRO ====================

/**
 * Extrai mensagem de erro de diferentes fontes
 */
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error
  
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.response?.data?.error) return error.response.data.error
  if (error?.message) return error.message
  
  return 'Ocorreu um erro inesperado'
}

/**
 * Verifica tipo de erro
 */
export const getErrorType = (error: any): 'network' | 'auth' | 'validation' | 'server' | 'unknown' => {
  if (!error?.response && error?.request) return 'network'
  
  const status = error?.response?.status
  if (status === 401) return 'auth'
  if (status >= 400 && status < 500) return 'validation'
  if (status >= 500) return 'server'
  
  return 'unknown'
}

// ==================== HELPERS DE DEVICE ====================

/**
 * Detecta se é dispositivo móvel
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Detecta se é touch device
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Obtém informações do dispositivo
 */
export const getDeviceInfo = () => {
  return {
    isMobile: isMobile(),
    isTouch: isTouchDevice(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
  }
}

// ==================== HELPERS DE CLIPBOARD ====================

/**
 * Copia texto para clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback para browsers antigos
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    }
  } catch (error) {
    console.error('Erro ao copiar para clipboard:', error)
    return false
  }
}

// ==================== HELPERS DE DOWNLOAD ====================

/**
 * Faz download de dados como arquivo
 */
export const downloadAsFile = (
  data: string, 
  filename: string, 
  type: string = 'text/plain'
): void => {
  const blob = new Blob([data], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Faz download de JSON como arquivo
 */
export const downloadAsJson = (data: any, filename: string): void => {
  const json = JSON.stringify(data, null, 2)
  downloadAsFile(json, `${filename}.json`, 'application/json')
}

/**
 * Faz download de CSV
 */
export const downloadAsCsv = (data: any[], filename: string): void => {
  if (data.length === 0) return
  
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(item => 
    Object.values(item).map(value => 
      typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value
    ).join(',')
  )
  
  const csv = [headers, ...rows].join('\n')
  downloadAsFile(csv, `${filename}.csv`, 'text/csv')
}

// ==================== HELPERS DE VALIDAÇÃO ====================

/**
 * Valida se valor está em range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max
}

/**
 * Valida se string não está vazia
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0
}

/**
 * Valida se array não está vazio
 */
export const isArrayNotEmpty = <T>(array: T[]): boolean => {
  return Array.isArray(array) && array.length > 0
}

// ==================== HELPERS DE MATH ====================

/**
 * Arredonda para casas decimais específicas
 */
export const roundTo = (num: number, decimals: number = 2): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Calcula percentual
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0
  return roundTo((value / total) * 100)
}

/**
 * Clamps valor entre min e max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max)
}

/**
 * Gera número aleatório em range
 */
export const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
