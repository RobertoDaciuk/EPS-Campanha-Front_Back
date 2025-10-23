/**
 * @file store/premioStore.ts
 * @version 2.0.0
 * @description Store Zustand para prêmios
 * @author DevEPS
 * @since 2025-10-21
 */

import { create } from 'zustand'
import { Premio } from '@/types'

interface PremioState {
  // State
  selectedPremio: Premio | null
  availablePremios: Premio[]
  redeemHistory: any[]
  premioFilters: any
  
  // Actions
  setSelectedPremio: (premio: Premio | null) => void
  setAvailablePremios: (premios: Premio[]) => void
  addRedeemToHistory: (redemption: any) => void
  setPremioFilters: (filters: any) => void
  updatePremioStock: (premioId: string, newStock: number) => void
  togglePremioActive: (premioId: string) => void
  clearPremioData: () => void
}

export const usePremioStore = create<PremioState>((set, get) => ({
  // Initial state
  selectedPremio: null,
  availablePremios: [],
  redeemHistory: [],
  premioFilters: {},

  // Actions
  setSelectedPremio: (premio) => {
    set({ selectedPremio: premio })
  },

  setAvailablePremios: (premios) => {
    set({ availablePremios: premios })
  },

  addRedeemToHistory: (redemption) => {
    set((state) => ({
      redeemHistory: [redemption, ...state.redeemHistory],
    }))
  },

  setPremioFilters: (filters) => {
    set({ premioFilters: filters })
  },

  updatePremioStock: (premioId, newStock) => {
    set((state) => ({
      availablePremios: state.availablePremios.map(premio =>
        premio.id === premioId
          ? { ...premio, stock: newStock }
          : premio
      ),
      selectedPremio: state.selectedPremio?.id === premioId
        ? { ...state.selectedPremio, stock: newStock }
        : state.selectedPremio,
    }))
  },

  togglePremioActive: (premioId) => {
    set((state) => ({
      availablePremios: state.availablePremios.map(premio =>
        premio.id === premioId
          ? { ...premio, isActive: !premio.isActive }
          : premio
      ),
      selectedPremio: state.selectedPremio?.id === premioId
        ? { ...state.selectedPremio, isActive: !state.selectedPremio.isActive }
        : state.selectedPremio,
    }))
  },

  clearPremioData: () => {
    set({
      selectedPremio: null,
      availablePremios: [],
      redeemHistory: [],
      premioFilters: {},
    })
  },
}))
