/**
 * @file pages/errors/UnauthorizedPage.tsx
 * @version 2.0.0
 * @description Página de acesso negado
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldIcon, ArrowLeftIcon, HomeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Lock Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldIcon className="w-12 h-12 text-white" />
          </div>
          <div className="text-6xl mb-4">🔐</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h1 className="text-2xl font-bold text-gray-900">
            Acesso Negado
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
          
          {user && (
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <p className="text-sm text-gray-700">
                Seu perfil atual: <strong>{user.role}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Entre em contato com o administrador se precisar de acesso.
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <Button asChild>
              <Link to="/app/dashboard">
                <HomeIcon className="w-4 h-4 mr-2" />
                Ir para Dashboard
              </Link>
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default UnauthorizedPage
