/**
 * @file lib/axios.ts
 * @version 2.0.2
 * @description Configuração do cliente HTTP Axios
 * @author DevEPS
 * @since 2025-10-21
 *
 * @changelog
 * - 2.0.2 (2025-10-22):
 * - CORRIGIDO: Importado 'useAuth' de '@/hooks/useAuth' (o store correto).
 * - CORRIGIDO: Interceptor de request agora lê 'useAuth.getState().token'.
 * - CORRIGIDO: Interceptor de erro 401 agora chama 'useAuth.getState().logout()'.
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ApiResponse } from '@/types'
import { useAuth } from '@/hooks/useAuth' // <-- CORREÇÃO: Importa o store correto

// Configuração base
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Cria instância do axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
})

// ==================== INTERCEPTORS ====================

/**
 * Interceptor para adicionar token de autenticação
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // CORREÇÃO: Buscar o token diretamente do store Zustand correto
    const token = useAuth.getState().token

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Log requests em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`🔄 ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      })
    }

    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

/**
 * Interceptor para tratar respostas e erros
 */
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Log responses em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`, response.data)
    }

    return response
  },
  (error: AxiosError<ApiResponse>) => {
    const { response, request } = error

    // Log errors em desenvolvimento
    if (import.meta.env.DEV) {
      console.error(`❌ ${response?.status || 'NETWORK'} ${error.config?.url}`, {
        error: response?.data,
        message: error.message,
      })
    }

    // Token expirado - redireciona para login
    if (response?.status === 401) {
      // CORREÇÃO: Chamar a ação de logout do store correto
      if (window.location.pathname !== '/login') {
        console.warn('Interceptor 401: Token inválido ou expirado. Deslogando...')
        
        useAuth.getState().logout() // Limpa o estado no Zustand
        
        window.location.href = '/login'
      }
    }

    // Server errors - mostra toast de erro
    if (response?.status && response.status >= 500) {
      console.error('Erro interno do servidor:', response.data?.message)
    }

    // Rate limiting
    if (response?.status === 429) {
      const retryAfter = response.headers['retry-after']
      console.warn(`Rate limit atingido. Tente novamente em ${retryAfter}s`)
    }

    // Network errors
    if (!response && request) {
      console.error('Erro de rede - verifique sua conexão')
    }

    return Promise.reject(error)
  }
)

// ==================== HELPERS ====================

/**
 * Helper para fazer requisições GET tipadas
 */
export const apiGet = async <T>(url: string, params?: any): Promise<T> => {
  const response = await api.get<ApiResponse<T>>(url, { params })
  return response.data.data!
}

/**
 * Helper para fazer requisições POST tipadas
 */
export const apiPost = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.post<ApiResponse<T>>(url, data)
  return response.data.data!
}

/**
 * Helper para fazer requisições PUT tipadas
 */
export const apiPut = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.put<ApiResponse<T>>(url, data)
  return response.data.data!
}

/**
 * Helper para fazer requisições DELETE tipadas
 */
export const apiDelete = async <T>(url: string): Promise<T> => {
  const response = await api.delete<ApiResponse<T>>(url)
  return response.data.data!
}

/**
 * Helper para requests paginadas
 */
export const apiGetPaginated = async <T>(
  url: string,
  params?: any
): Promise<{
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}> => {
  const response = await api.get<ApiResponse<T[]>>(url, { params })
  return {
    data: response.data.data || [],
    pagination: response.data.pagination!,
  }
}

/**
 * Helper para upload de arquivos
 */
export const apiUpload = async <T>(
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<T> => {
  const response = await api.post<ApiResponse<T>>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    },
  })
  return response.data.data!
}

/**
 * Helper para download de arquivos
 */
export const apiDownload = async (
  url: string,
  filename?: string
): Promise<void> => {
  const response = await api.get(url, {
    responseType: 'blob',
  })

  // Cria URL do blob e faz download
  const downloadUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

export default api