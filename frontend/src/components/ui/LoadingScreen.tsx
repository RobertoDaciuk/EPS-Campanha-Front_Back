/**
 * @file components/ui/LoadingScreen.tsx
 * @version 2.0.0
 * @description Tela de carregamento principal
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { motion } from 'framer-motion'

interface LoadingScreenProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Carregando...',
  size = 'md',
  fullScreen = true,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10', 
    lg: 'w-16 h-16',
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex items-center justify-center p-8'

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        {/* Logo/Spinner animado */}
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className={`${sizeClasses[size]} relative`}>
            {/* Círculo externo */}
            <motion.div
              className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full absolute`}
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Círculo interno com gradiente */}
            <motion.div
              className={`${sizeClasses[size]} border-4 border-transparent border-t-primary rounded-full`}
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Logo EPS no centro */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">E</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Texto de carregamento */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-sm font-medium text-foreground">{message}</p>
          
          {/* Pontos animados */}
          <div className="flex justify-center space-x-1 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-primary rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default LoadingScreen
