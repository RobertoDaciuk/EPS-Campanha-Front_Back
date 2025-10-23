/**
 * @file services/userService.ts
 * @version 2.0.0
 * @description Serviços para gestão de usuários
 * @author DevEPS
 * @since 2025-10-21
 */

import { apiGet, apiPost, apiPut, apiDelete, apiGetPaginated } from '@/lib/axios'
import { User, UserFilters, UserRole, UserStatus } from '@/types'

export const userService = {
  /**
   * Lista usuários com filtros
   */
  async getUsers(filters: UserFilters) {
    return await apiGetPaginated<User>('/users', filters)
  },

  /**
   * Busca usuário por ID
   */
  async getUserById(id: string): Promise<User> {
    return await apiGet<{ user: User }>(`/users/${id}`)
      .then(response => response.user)
  },

  /**
   * Cria novo usuário
   */
  async createUser(data: {
    name: string
    email: string
    cpf: string
    whatsapp: string
    role: UserRole
    opticName: string
    opticCNPJ: string
    managerId?: string
  }): Promise<User> {
    return await apiPost<{ user: User }>('/users', data)
      .then(response => response.user)
  },

  /**
   * Atualiza usuário
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return await apiPut<{ user: User }>(`/users/${id}`, data)
      .then(response => response.user)
  },

  /**
   * Exclui usuário
   */
  async deleteUser(id: string): Promise<void> {
    await apiDelete(`/users/${id}`)
  },

  /**
   * Atualiza status do usuário
   */
  async updateUserStatus(id: string, data: {
    status: UserStatus
    reason: string
  }): Promise<void> {
    await apiPost(`/users/${id}/status`, data)
  },

  /**
   * Redefine senha do usuário
   */
  async resetUserPassword(id: string, data: {
    generatePassword: boolean
    customPassword?: string
    notifyUser: boolean
  }): Promise<{
    userId: string
    newPassword: string
    resetBy: string
    resetAt: string
  }> {
    return await apiPost(`/users/${id}/reset-password`, data)
  },

  /**
   * Associa vendedor a gerente
   */
  async associateSellerToManager(data: {
    sellerId: string
    managerId: string
  }): Promise<{
    seller: User
    associatedBy: string
    associatedAt: string
  }> {
    return await apiPost('/users/associate-seller', data)
  },

  /**
   * Lista vendedores de um gerente
   */
  async getManagerSellers(managerId: string, includeInactive: boolean = false): Promise<{
    sellers: User[]
    managerId: string
    includeInactive: boolean
    count: number
  }> {
    return await apiGet(`/users/${managerId}/sellers`, { includeInactive })
  },

  /**
   * Obtém vendedores do gerente autenticado
   */
  async getMySellers(includeInactive: boolean = false): Promise<{
    sellers: User[]
    managerId: string
    totalSellers: number
    activeSellers: number
  }> {
    return await apiGet('/users/my-sellers', { includeInactive })
  },

  /**
   * Atualiza pontos do usuário
   */
  async updateUserPoints(id: string, data: {
    operation: 'add' | 'subtract' | 'set'
    amount: number
    reason: string
  }): Promise<{
    userId: string
    newPoints: number
    newLevel: string
    operation: string
  }> {
    return await apiPost(`/users/${id}/points`, data)
  },

  /**
   * Obtém estatísticas de usuários
   */
  async getUserStats(): Promise<{
    stats: any
    generatedAt: string
    generatedBy: string
  }> {
    return await apiGet('/users/stats')
  },

  /**
   * Lista usuários por CNPJ da ótica
   */
  async getUsersByOptic(cnpj: string): Promise<{
    users: User[]
    opticCNPJ: string
    count: number
  }> {
    return await apiGet(`/users/by-optic/${cnpj}`)
  },

  /**
   * Verifica disponibilidade de campo
   */
  async checkFieldAvailability(data: {
    field: 'email' | 'cpf' | 'cnpj'
    value: string
    excludeUserId?: string
  }): Promise<{
    field: string
    value: string
    available: boolean
    message: string
  }> {
    return await apiPost('/users/check-availability', data)
  },

  /**
   * Importação em lote de usuários
   */
  async bulkImportUsers(data: {
    users: Array<{
      name: string
      email: string
      cpf: string
      whatsapp: string
      role: UserRole
      opticName: string
      opticCNPJ: string
      managerId?: string
    }>
    validateOnly: boolean
    skipDuplicates: boolean
  }): Promise<{
    summary: {
      total: number
      successful: number
      failed: number
      validateOnly: boolean
      skipDuplicates: boolean
    }
    results: any[]
  }> {
    return await apiPost('/users/bulk-import', data)
  },
}
