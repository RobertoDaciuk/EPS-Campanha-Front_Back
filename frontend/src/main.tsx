/**
 * @file main.tsx
 * @version 2.0.1
 * @description Ponto de entrada da aplicação
 * @author DevEPS
 * @since 2025-10-21
 *
 * @changelog
 * - 2.0.1 (2025-10-22): Removido <AuthInitializer />.
 * O 'persist' middleware do useAuth agora cuida da hidratação
 * automaticamente, e o AuthInitializer estava causando um loop infinito.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import App from '@/App'
import { Toaster } from '@/components/ui/toaster'
// import AuthInitializer from '@/components/AuthInitializer' // <-- REMOVIDO
import '@/styles/globals.css'

// ==================== CONFIGURAÇÃO DE ERROS GLOBAIS ====================

/**
 * Log de erros não capturados
 */
window.addEventListener('error', (event) => {
  console.error('❌ Erro global capturado:', event.error || event.message)
  // Futuramente: enviar para serviço de Sentry/LogRocket
})

/**
 * Log de Rejeições de Promises não tratadas
 */
window.addEventListener('unhandledrejection', (event) => {
  console.warn('⚠️ Rejeição de promise não tratada:', event.reason)
})

// ==================== INICIALIZAÇÃO DA APLICAÇÃO ====================

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    "Elemento root não encontrado. Verifique se existe <div id='root'></div> no index.html"
  )
}

// Logs de ambiente
console.log('🚀 EPS Campanhas Frontend iniciado')
console.log(`📊 Modo: ${import.meta.env.MODE}`)
console.log(`🔗 API URL: ${import.meta.env.VITE_API_URL}`)

const root = ReactDOM.createRoot(rootElement)

/**
 * Renderização principal da aplicação
 */
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {/* <AuthInitializer /> */} {/* <-- REMOVIDO */}
        <App />
        <Toaster />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)