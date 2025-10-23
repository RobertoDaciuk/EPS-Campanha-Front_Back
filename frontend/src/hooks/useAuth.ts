/**
 * @file hooks/useAuth.ts
 * @version 2.0.3
 * @description Hook para autenticação
 * @author DevEPS
 * @since 2025-10-21
 *
 * @changelog
 * - 2.0.3 (2025-10-22):
 * - CORREÇÃO LOOP INFINITO: Removido o middleware 'persist'.
 * O 'authService' já gerencia o localStorage, e o 'persist'
 * estava causando um loop de hidratação/atualização.
 * - CORREÇÃO RACE CONDITION: 'isLoading' agora inicia 'true'.
 * - 'hydrateFromStorage' agora define 'isLoading: false' no 'finally'
 * para desbloquear o 'ProtectedRoute' após a hidratação.
 */

import { create } from 'zustand'
// import { persist } from 'zustand/middleware' // <-- REMOVIDO
import { User, LoginForm, RegisterForm } from '@/types'
import { authService } from '@/services/authService'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (data: LoginForm) => Promise<void>
  register: (data: RegisterForm) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshAuth: () => Promise<void>
  setUser: (user: User) => void
  hydrateFromStorage: () => void
}

// O 'persist' foi removido do wrapper
export const useAuth = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true, // <-- Inicia como true para esperar a hidratação
  isAuthenticated: false,

  login: async (data: LoginForm) => {
    try {
      set({ isLoading: true })
      // authService.login() já salva no localStorage
      const response = await authService.login(data)
      set({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (data: RegisterForm) => {
    try {
      set({ isLoading: true })
      await authService.register(data)
      set({ isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    // authService.logout() já limpa o localStorage
    authService.logout()
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  updateProfile: async (data: Partial<User>) => {
    try {
      set({ isLoading: true })
      // authService.updateProfile() já salva o usuário no localStorage
      const updatedUser = await authService.updateProfile(data)
      set((state) => ({
        user: state.user ? { ...state.user, ...updatedUser } : updatedUser,
        isLoading: false,
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  refreshAuth: async () => {
    try {
      const { refreshToken } = get()
      if (!refreshToken) {
        get().logout()
        return
      }
      // authService.refreshToken() já salva o novo token no localStorage
      const response = await authService.refreshToken(refreshToken)
      set({
        token: response.token,
        isAuthenticated: true,
      })
    } catch (error) {
      console.error('Erro ao renovar token:', error)
      get().logout()
    }
  },

  setUser: (user: User) => {
    set({ user })
  },

  // Hidrata o estado lendo do localStorage (via authService)
  hydrateFromStorage: () => {
    try {
      const token = authService.getStoredToken()
      const user = authService.getStoredUser()
      const refreshToken = authService.getStoredRefreshToken()

      if (token && user) {
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        })
      }
    } catch (error) {
      console.error('Falha ao hidratar o auth state:', error)
    } finally {
      // MUDANÇA CRÍTICA: Define isLoading como false
      // após a tentativa de hidratação.
      set({ isLoading: false })
    }
  },
}))