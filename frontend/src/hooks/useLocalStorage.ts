/**
 * @file hooks/useLocalStorage.ts
 * @version 2.0.0
 * @description Hook para localStorage
 * @author DevEPS
 * @since 2025-10-21
 */

import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State para armazenar nosso valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Erro ao ler localStorage ${key}:`, error)
      return initialValue
    }
  })

  // Função para setar o valor
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
      
      // Dispatcha evento personalizado para sincronizar entre abas
      window.dispatchEvent(
        new CustomEvent('localStorage-change', {
          detail: { key, value: valueToStore }
        })
      )
    } catch (error) {
      console.error(`Erro ao salvar localStorage ${key}:`, error)
    }
  }, [key, storedValue])

  // Função para remover o valor
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      window.localStorage.removeItem(key)
      
      window.dispatchEvent(
        new CustomEvent('localStorage-change', {
          detail: { key, value: null }
        })
      )
    } catch (error) {
      console.error(`Erro ao remover localStorage ${key}:`, error)
    }
  }, [key, initialValue])

  // Escuta mudanças no localStorage de outras abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(`Erro ao sincronizar localStorage ${key}:`, error)
        }
      }
    }

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        if (e.detail.value === null) {
          setStoredValue(initialValue)
        } else {
          setStoredValue(e.detail.value)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorage-change', handleCustomStorageChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorage-change', handleCustomStorageChange as EventListener)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

// Hook especializado para preferências do usuário
export function useUserPreferences() {
  return useLocalStorage('eps_user_preferences', {
    theme: 'light' as 'light' | 'dark',
    sidebarCollapsed: false,
    tablePageSize: 20,
    language: 'pt-BR',
    notifications: {
      email: true,
      push: true,
      sound: true,
    },
  })
}

// Hook para cache de filtros de listagem
export function useListFilters<T>(key: string, initialFilters: T) {
  return useLocalStorage(`eps_filters_${key}`, initialFilters)
}

// Hook para dados temporários de formulário
export function useFormDraft<T>(key: string, initialData: T) {
  const [draft, setDraft, removeDraft] = useLocalStorage(`eps_draft_${key}`, initialData)

  const saveDraft = useCallback((data: Partial<T>) => {
    setDraft(prev => ({ ...prev, ...data }))
  }, [setDraft])

  const clearDraft = useCallback(() => {
    removeDraft()
  }, [removeDraft])

  return { draft, saveDraft, clearDraft }
}

// Hook para histórico de navegação
export function useNavigationHistory() {
  const [history, setHistory] = useLocalStorage<string[]>('eps_nav_history', [])

  const addToHistory = useCallback((path: string) => {
    setHistory(prev => {
      const newHistory = [path, ...prev.filter(p => p !== path)]
      return newHistory.slice(0, 10) // Manter apenas os 10 mais recentes
    })
  }, [setHistory])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [setHistory])

  return { history, addToHistory, clearHistory }
}

// Hook para estado de collapse/expand de seções
export function useCollapsibleState(sectionKey: string, initialState: boolean = false) {
  const [isCollapsed, setIsCollapsed] = useLocalStorage(
    `eps_collapsed_${sectionKey}`, 
    initialState
  )

  const toggle = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [setIsCollapsed])

  return { isCollapsed, toggle, setIsCollapsed }
}

// Hook para cache de dados com expiração
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  expirationMinutes: number = 5
) {
  const [cachedData, setCachedData] = useLocalStorage<{
    data: T | null
    timestamp: number
  }>(`eps_cache_${key}`, {
    data: null,
    timestamp: 0
  })

  const isExpired = Date.now() - cachedData.timestamp > expirationMinutes * 60 * 1000

  const { data, isLoading, error } = useQuery({
    queryKey: [key],
    queryFn: fetcher,
    enabled: !cachedData.data || isExpired,
    onSuccess: (data) => {
      setCachedData({
        data,
        timestamp: Date.now()
      })
    }
  })

  const clearCache = useCallback(() => {
    setCachedData({ data: null, timestamp: 0 })
  }, [setCachedData])

  return {
    data: cachedData.data || data,
    isLoading: isLoading && !cachedData.data,
    error,
    clearCache,
    isFromCache: !!cachedData.data && !isExpired
  }
}
