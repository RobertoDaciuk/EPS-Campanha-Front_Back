/**
 * @file store/campaignStore.ts
 * @version 2.0.0
 * @description Store Zustand para campanhas
 * @author DevEPS
 * @since 2025-10-21
 */

import { create } from 'zustand'
import { Campaign, CampaignStatus } from '@/types'

interface CampaignState {
  // State
  selectedCampaign: Campaign | null
  activeCampaigns: Campaign[]
  campaignProgress: Record<string, any>
  
  // Actions
  setSelectedCampaign: (campaign: Campaign | null) => void
  setActiveCampaigns: (campaigns: Campaign[]) => void
  updateCampaignProgress: (campaignId: string, progress: any) => void
  updateCampaignStatus: (campaignId: string, status: CampaignStatus) => void
  clearCampaignData: () => void
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  // Initial state
  selectedCampaign: null,
  activeCampaigns: [],
  campaignProgress: {},

  // Actions
  setSelectedCampaign: (campaign) => {
    set({ selectedCampaign: campaign })
  },

  setActiveCampaigns: (campaigns) => {
    set({ activeCampaigns: campaigns })
  },

  updateCampaignProgress: (campaignId, progress) => {
    set((state) => ({
      campaignProgress: {
        ...state.campaignProgress,
        [campaignId]: progress,
      },
    }))
  },

  updateCampaignStatus: (campaignId, status) => {
    set((state) => ({
      activeCampaigns: state.activeCampaigns.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, status }
          : campaign
      ),
      selectedCampaign: state.selectedCampaign?.id === campaignId
        ? { ...state.selectedCampaign, status }
        : state.selectedCampaign,
    }))
  },

  clearCampaignData: () => {
    set({
      selectedCampaign: null,
      activeCampaigns: [],
      campaignProgress: {},
    })
  },
}))
