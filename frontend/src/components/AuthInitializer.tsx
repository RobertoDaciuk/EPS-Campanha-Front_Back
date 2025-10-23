/**
 * @file components/AuthInitializer.tsx
 * @version 2.0.1
 * @description Sincroniza Zustand com session/localStorage na montagem.
 *
 * @changelog
 * - 2.0.1 (2025-10-22):
 * - CORRIGIDO: Loop infinito de renderização.
 * - Alterado useEffect para chamar 'useAuth.getState().hydrateFromStorage()'
 * com um array de dependências vazio '[]'.
 * - Isso garante que a hidratação ocorra apenas uma vez na montagem
 * e não dependa da referência da função 'hydrateFromStorage'
 * que muda a cada renderização.
 */

import React, { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

const AuthInitializer: React.FC = () => {
  // Não precisamos mais selecionar a função aqui,
  // pois isso causa o loop.
  // const hydrateFromStorage = useAuth((s) => s.hydrateFromStorage)

  useEffect(() => {
    // CORREÇÃO:
    // Chamamos a função diretamente do 'getState' do store.
    // O array de dependências vazio '[]' garante que
    // isso rode *apenas uma vez* quando o componente é montado.
    useAuth.getState().hydrateFromStorage()
  }, []) // <-- Array de dependências vazio é a correção.

  return null
}

export default AuthInitializer