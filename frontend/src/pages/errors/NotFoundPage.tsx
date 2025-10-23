/**
 * @file pages/errors/NotFoundPage.tsx
 * @version 2.0.0
 * @description Página 404 - Não encontrada
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HomeIcon, ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-eps-50 to-eps-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* 404 Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="text-9xl font-bold text-eps-600 mb-4">404</div>
          <div className="text-6xl mb-4">🤔</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h1 className="text-2xl font-bold text-gray-900">
            Página não encontrada
          </h1>
          <p className="text-gray-600">
            A página que você está procurando não existe ou foi movida.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Voltar
              </Link>
            </Button>
            
            <Button asChild>
              <Link to="/app/dashboard">
                <HomeIcon className="w-4 h-4 mr-2" />
                Ir para Dashboard
              </Link>
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            Se você acredita que isso é um erro, entre em contato conosco.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default NotFoundPage
