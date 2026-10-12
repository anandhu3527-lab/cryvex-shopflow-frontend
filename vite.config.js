import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BACKEND_TARGET = 'https://shopflowbackend-production.up.railway.app'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: true,
      },
      '/health': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: true,
      },
      '/health': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})