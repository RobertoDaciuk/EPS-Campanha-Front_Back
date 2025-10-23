/**
 * @file store/uiStore.ts
 * @version 2.0.0
 * @description Store Zustand para UI state
 * @author DevEPS
 * @since 2025-10-21
 */

import { create } from 'zustand'

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // Modals
  modals: Record<string, { open: boolean; data?: any }>
  
  // Loading states
  globalLoading: boolean
  loadingMessage: string
  
  // Notifications
  notifications: any[]
  
  // Theme
  theme: 'light' | 'dark'
  
  // Actions
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  openModal: (modalId: string, data?: any) => void
  closeModal: (modalId: string) => void
  toggleModal: (modalId: string, data?: any) => void
  setGlobalLoading: (loading: boolean, message?: string) => void
  addNotification: (notification: any) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  sidebarOpen: false,
  sidebarCollapsed: false,
  modals: {},
  globalLoading: false,
  loadingMessage: '',
  notifications: [],
  theme: 'light',

  // Sidebar actions
  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },

  // Modal actions
  openModal: (modalId, data) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [modalId]: { open: true, data }
      }
    }))
  },

  closeModal: (modalId) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [modalId]: { open: false, data: undefined }
      }
    }))
  },

  toggleModal: (modalId, data) => {
    const state = get()
    const currentModal = state.modals[modalId]
    
    if (currentModal?.open) {
      state.closeModal(modalId)
    } else {
      state.openModal(modalId, data)
    }
  },

  // Loading actions
  setGlobalLoading: (loading, message = '') => {
    set({ globalLoading: loading, loadingMessage: message })
  },

  // Notification actions
  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random()}`
    const newNotification = { ...notification, id }
    
    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }))

    // Auto remove after 5 seconds if not persistent
    if (!notification.persistent) {
      setTimeout(() => {
        get().removeNotification(id)
      }, 5000)
    }

    return id
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }))
  },

  clearNotifications: () => {
    set({ notifications: [] })
  },

  // Theme actions
  setTheme: (theme) => {
    set({ theme })
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Save to localStorage
    localStorage.setItem('eps_theme', theme)
  },

  toggleTheme: () => {
    const currentTheme = get().theme
    get().setTheme(currentTheme === 'light' ? 'dark' : 'light')
  },
}))

// Hook para modal específico
export const useModal = (modalId: string) => {
  const { modals, openModal, closeModal, toggleModal } = useUIStore()
  const modal = modals[modalId] || { open: false, data: undefined }

  return {
    isOpen: modal.open,
    data: modal.data,
    open: (data?: any) => openModal(modalId, data),
    close: () => closeModal(modalId),
    toggle: (data?: any) => toggleModal(modalId, data),
  }
}

// Hook para notificações
export const useUINotifications = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useUIStore()

  const notify = {
    success: (message: string, title?: string) =>
      addNotification({ type: 'success', message, title }),
    
    error: (message: string, title?: string) =>
      addNotification({ type: 'error', message, title }),
    
    warning: (message: string, title?: string) =>
      addNotification({ type: 'warning', message, title }),
    
    info: (message: string, title?: string) =>
      addNotification({ type: 'info', message, title }),
    
    custom: (notification: any) =>
      addNotification(notification),
  }

  return {
    notifications,
    notify,
    remove: removeNotification,
    clear: clearNotifications,
  }
}
