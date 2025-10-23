/**
 * @file vitest.config.ts
 * @version 2.0.0
 * @description Configuração do Vitest para testes
 * @author DevEPS
 * @since 2025-10-21
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Usar jsdom como environment para testes React
    environment: 'jsdom',
    
    // Arquivos de setup
    setupFiles: ['./src/test/setup.ts'],
    
    // Incluir CSS nos testes
    css: true,
    
    // Global test APIs
    globals: true,
    
    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'dist/',
        'build/',
        '.eslintrc.js',
        'vite.config.ts',
        'tailwind.config.js',
        'postcss.config.js'
      ],
      threshold: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    
    // Test timeout
    testTimeout: 10000,
    
    // Watch mode
    watch: false,
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:3001',
    }
  },
  
  // Resolve paths (same as main config)
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/pages': resolve(__dirname, 'src/pages'),
      '@/hooks': resolve(__dirname, 'src/hooks'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/store': resolve(__dirname, 'src/store'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/lib': resolve(__dirname, 'src/lib'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/assets': resolve(__dirname, 'src/assets'),
      '@/styles': resolve(__dirname, 'src/styles'),
    }
  }
})
