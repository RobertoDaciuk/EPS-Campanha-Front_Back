/**
 * @file components/layouts/PublicLayout.tsx
 * @version 2.0.0
 * @description Layout para páginas públicas (login, registro)
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-eps-50 to-eps-100">
      {/* Header simples */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-eps-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-eps-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <h1 className="text-xl font-bold text-eps-900">EPS Campanhas</h1>
            </div>

            {/* Versão */}
            <div className="text-sm text-eps-600">v2.0.0</div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-eps-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-eps-600">
            © 2025 EPS Campanhas. Sistema de incentivo para vendedores.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
