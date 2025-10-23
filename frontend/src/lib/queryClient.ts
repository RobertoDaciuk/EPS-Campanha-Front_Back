/**
 * @file lib/queryClient.ts
 * @version 2.0.0
 * @description Configuração do React Query Client
 * @author DevEPS
 * @since 2025-10-21
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { toast } from 'sonner'

// Configuração do Query Client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos
      staleTime: 5 * 60 * 1000,
      // Manter cache por 10 minutos quando não usado
      gcTime: 10 * 60 * 1000,
      // Retry em caso de erro
      retry: (failureCount, error: any) => {
        // Não retry em erros 4xx (cliente)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        // Retry até 3 vezes para outros erros
        return failureCount < 3
      },
      // Não refetch automaticamente ao focar na aba
      refetchOnWindowFocus: false,
      // Não refetch automaticamente ao reconectar
      refetchOnReconnect: true,
      // Não refetch automaticamente ao montar componente se dados ainda são válidos
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations em caso de erro de rede
      retry: (failureCount, error: any) => {
        // Não retry em erros 4xx
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        // Retry apenas uma vez para mutations
        return failureCount < 1
      },
      // Handler global para erros de mutation
      onError: (error: any) => {
        const message = error?.response?.data?.message || 
                        error?.message || 
                        'Ocorreu um erro inesperado'
        
        // Log do erro
        console.error('Mutation error:', error)
        
        // Toast de erro (opcional, pode ser sobrescrito)
        if (!error?.skipGlobalError) {
          toast.error(message)
        }
      },
    },
  },
})

// Configurações específicas por query key
queryClient.setDefaultOptions({
  queries: {
    // Dados de usuário - cache mais longo
    ...queryClient.getDefaultOptions().queries,
    // Override para queries específicas
    queryKeyHashFn: (queryKey) => {
      if (queryKey.includes('user-profile')) {
        return { staleTime: 10 * 60 * 1000 } // 10 minutos
      }
      if (queryKey.includes('dashboard')) {
        return { staleTime: 2 * 60 * 1000 } // 2 minutos
      }
      if (queryKey.includes('notifications')) {
        return { staleTime: 30 * 1000 } // 30 segundos
      }
      return {}
    },
  },
})

// Invalidação automática de queries relacionadas
export const invalidateRelatedQueries = (entityType: string, entityId?: string) => {
  switch (entityType) {
    case 'campaign':
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['active-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (entityId) {
        queryClient.invalidateQueries({ queryKey: ['campaign', entityId] })
      }
      break
      
    case 'submission':
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['pending-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      break
      
    case 'user':
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      queryClient.invalidateQueries({ queryKey: ['ranking'] })
      if (entityId) {
        queryClient.invalidateQueries({ queryKey: ['user', entityId] })
      }
      break
      
    case 'premio':
      queryClient.invalidateQueries({ queryKey: ['premios'] })
      queryClient.invalidateQueries({ queryKey: ['popular-premios'] })
      queryClient.invalidateQueries({ queryKey: ['available-premios'] })
      break
      
    case 'earning':
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      queryClient.invalidateQueries({ queryKey: ['pending-earnings'] })
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
      break
  }
}

// Prefetch de dados importantes
export const prefetchEssentialData = async (userId: string, userRole: string) => {
  const prefetchPromises: Promise<any>[] = []

  // Prefetch dashboard data
  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ['dashboard', '30d'],
      queryFn: () => import('@/services/dashboardService').then(s => 
        s.dashboardService.getDashboardData({ period: '30d' })
      ),
    })
  )

  // Prefetch active campaigns
  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ['active-campaigns'],
      queryFn: () => import('@/services/campaignService').then(s => 
        s.campaignService.getActiveCampaigns()
      ),
    })
  )

  // Prefetch based on role
  if (userRole === 'VENDEDOR') {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['available-premios'],
        queryFn: () => import('@/services/premioService').then(s => 
          s.premioService.getAvailablePremios()
        ),
      })
    )
  }

  if (userRole === 'GERENTE' || userRole === 'ADMIN') {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['pending-submissions'],
        queryFn: () => import('@/services/submissionService').then(s => 
          s.submissionService.getPendingSubmissions()
        ),
      })
    )
  }

  try {
    await Promise.all(prefetchPromises)
  } catch (error) {
    console.error('Error prefetching data:', error)
  }
}

// Limpar cache ao fazer logout
export const clearQueryCache = () => {
  queryClient.clear()
}

// Provider customizado
export { QueryClientProvider, ReactQueryDevtools }
