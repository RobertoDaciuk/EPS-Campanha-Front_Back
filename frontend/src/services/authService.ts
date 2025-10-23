/**
 * @file services/authService.ts
 * @version 2.0.1
 * @description Serviços de autenticação
 * @author DevEPS
 * @since 2025-10-21
 *
 * @changelog
 * - 2.0.1 (2025-10-22): Adicionada função getStoredRefreshToken
 * para suportar a hidratação do useAuth.
 */

import { apiPost, apiPut, apiGet } from '@/lib/axios'
import { User, LoginForm, RegisterForm } from '@/types'
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '@/lib/utils'

interface LoginResponse {
  user: User
  token: string
  refreshToken: string
  expiresAt: string
}

interface RefreshResponse {
  token: string
  expiresAt: string
}

export const authService = {
  
  async login(data: LoginForm): Promise<LoginResponse> {
    const response = await apiPost<LoginResponse>('/auth/login', data)
    setLocalStorage('eps_token', response.token)
    setLocalStorage('eps_refresh_token', response.refreshToken)
    setLocalStorage('eps_user', response.user)
    return response
  },

  /**
   * Registra novo usuário
   */
  async register(data: RegisterForm): Promise<void> {
    await apiPost('/auth/register', data)
  },

  /**
   * Faz logout do usuário
   */
  logout(): void {
    removeLocalStorage('eps_token')
    removeLocalStorage('eps_refresh_token')
    removeLocalStorage('eps_user')
  },

  /**
   * Renova token usando refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await apiPost<RefreshResponse>('/auth/refresh', {
      refreshToken,
    })

    setLocalStorage('eps_token', response.token)

    return response
  },

  /**
   * Verifica se token é válido
   */
  async verifyAuth(): Promise<{ user: User; authenticated: boolean }> {
    const response = await apiGet<{
      user: User
      authenticated: boolean
    }>('/auth/verify')

    if (response.user) {
      setLocalStorage('eps_user', response.user)
    }

    return response
  },

  /**
   * Obtém dados completos do usuário
   */
  async getMe(): Promise<User> {
    const response = await apiGet<{ user: User }>('/auth/me')
    
    setLocalStorage('eps_user', response.user)
    
    return response.user
  },

  /**
   * Atualiza perfil do usuário
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiPut<{ user: User }>('/auth/profile', data)
    
    setLocalStorage('eps_user', response.user)
    
    return response.user
  },

  /**
   * Altera senha
   */
  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<void> {
    await apiPost('/auth/change-password', data)
  },

  /**
   * Verifica disponibilidade de email
   */
  async checkEmailAvailability(email: string, excludeUserId?: string): Promise<{
    email: string
    available: boolean
    message: string
  }> {
    return await apiPost('/auth/check-email', { email, excludeUserId })
  },

  /**
   * Verifica disponibilidade de CPF
   */
  async checkCPFAvailability(cpf: string, excludeUserId?: string): Promise<{
    cpf: string
    available: boolean
    message: string
  }> {
    return await apiPost('/auth/check-cpf', { cpf, excludeUserId })
  },

  /**
   * Valida CNPJ da ótica
   */
  async validateCNPJ(cnpj: string): Promise<{
    cnpj: string
    valid: boolean
    opticName?: string
    message: string
  }> {
    return await apiPost('/auth/validate-cnpj', { cnpj })
  },

  /**
   * Recupera token salvo
   */
  getStoredToken(): string | null {
    return getLocalStorage('eps_token')
  },

  /**
   * Recupera usuário salvo
   */
  getStoredUser(): User | null {
    return getLocalStorage('eps_user')
  },

  /**
   * Recupera refresh token salvo
   */
  getStoredRefreshToken(): string | null {
    return getLocalStorage('eps_refresh_token')
  },

  /**
   * Verifica se está autenticado baseado no localStorage
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken()
    const user = this.getStoredUser()
    return !!(token && user)
  },
}