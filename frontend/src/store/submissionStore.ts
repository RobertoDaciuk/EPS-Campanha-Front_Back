/**
 * @file store/submissionStore.ts
 * @version 2.0.0
 * @description Store Zustand para submissões
 * @author DevEPS
 * @since 2025-10-21
 */

import { create } from 'zustand'
import { CampaignSubmission, CampaignSubmissionStatus } from '@/types'

interface SubmissionState {
  // State
  pendingSubmissions: CampaignSubmission[]
  userSubmissions: CampaignSubmission[]
  selectedSubmissions: string[]
  submissionFilters: any
  
  // Actions
  setPendingSubmissions: (submissions: CampaignSubmission[]) => void
  setUserSubmissions: (submissions: CampaignSubmission[]) => void
  updateSubmissionStatus: (submissionId: string, status: CampaignSubmissionStatus) => void
  addSelectedSubmission: (submissionId: string) => void
  removeSelectedSubmission: (submissionId: string) => void
  clearSelectedSubmissions: () => void
  setSubmissionFilters: (filters: any) => void
  addNewSubmission: (submission: CampaignSubmission) => void
  removeSubmission: (submissionId: string) => void
}

export const useSubmissionStore = create<SubmissionState>((set, get) => ({
  // Initial state
  pendingSubmissions: [],
  userSubmissions: [],
  selectedSubmissions: [],
  submissionFilters: {},

  // Actions
  setPendingSubmissions: (submissions) => {
    set({ pendingSubmissions: submissions })
  },

  setUserSubmissions: (submissions) => {
    set({ userSubmissions: submissions })
  },

  updateSubmissionStatus: (submissionId, status) => {
    set((state) => ({
      pendingSubmissions: state.pendingSubmissions.map(sub =>
        sub.id === submissionId ? { ...sub, status } : sub
      ),
      userSubmissions: state.userSubmissions.map(sub =>
        sub.id === submissionId ? { ...sub, status } : sub
      ),
    }))
  },

  addSelectedSubmission: (submissionId) => {
    set((state) => ({
      selectedSubmissions: [...state.selectedSubmissions, submissionId],
    }))
  },

  removeSelectedSubmission: (submissionId) => {
    set((state) => ({
      selectedSubmissions: state.selectedSubmissions.filter(id => id !== submissionId),
    }))
  },

  clearSelectedSubmissions: () => {
    set({ selectedSubmissions: [] })
  },

  setSubmissionFilters: (filters) => {
    set({ submissionFilters: filters })
  },

  addNewSubmission: (submission) => {
    set((state) => ({
      userSubmissions: [submission, ...state.userSubmissions],
    }))
  },

  removeSubmission: (submissionId) => {
    set((state) => ({
      pendingSubmissions: state.pendingSubmissions.filter(sub => sub.id !== submissionId),
      userSubmissions: state.userSubmissions.filter(sub => sub.id !== submissionId),
      selectedSubmissions: state.selectedSubmissions.filter(id => id !== submissionId),
    }))
  },
}))
