/**
 * @file store/authStore.ts
 * @version 2.0.0
 * @description Store Zustand para autenticação
 * @author DevEPS
 * @since 2025-10-21
 *
 * @changelog
 * - 2.0.0 (2025-10-21): Implementação inicial.
 * - (DevEPS): Verificado, arquivo 100% funcional para persistência.
 * Nenhum ajuste necessário para a correção do bug de autenticação.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'

interface AuthState {
  // State
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User) => void
  setTokens: (token: string, refreshToken: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  updateUser: (userData: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setUser: (user) => {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      setTokens: (token, refreshToken) => {
        set({
          token,
          refreshToken,
          isAuthenticated: !!token,
        })
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      updateUser: (userData) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },
    }),
    {
      name: 'eps-auth-storage', // Chave usada no localStorage
      partialize: (state) => ({
        // Define quais partes do estado serão persistidas
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)