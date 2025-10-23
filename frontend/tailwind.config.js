/**
 * @file tailwind.config.js
 * @version 2.0.0
 * @description Configuração do Tailwind CSS
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // EPS Brand Colors
        eps: {
          50: 'hsl(240, 100%, 99%)',
          100: 'hsl(225, 100%, 97%)',
          200: 'hsl(221, 91%, 91%)',
          300: 'hsl(216, 87%, 82%)',
          400: 'hsl(212, 83%, 70%)',
          500: 'hsl(199, 89%, 48%)',
          600: 'hsl(200, 98%, 39%)',
          700: 'hsl(201, 90%, 27%)',
          800: 'hsl(201, 83%, 14%)',
          900: 'hsl(202, 80%, 4%)',
        },
        // Success Colors
        success: {
          50: 'hsl(110, 54%, 96%)',
          500: 'hsl(110, 49%, 42%)',
          600: 'hsl(111, 45%, 34%)',
        },
        // Warning Colors
        warning: {
          50: 'hsl(54, 91%, 95%)',
          500: 'hsl(46, 91%, 58%)',
          600: 'hsl(43, 74%, 49%)',
        },
        // Error Colors
        error: {
          50: 'hsl(0, 86%, 97%)',
          500: 'hsl(0, 84%, 60%)',
          600: 'hsl(0, 72%, 51%)',
        },
      },
      // Adiciona utilitário customizado para a borda
      borderColor: {
        border: 'hsl(var(--border))',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
