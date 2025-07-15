import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Point to the production Railway server
        target: 'https://pleasantcovedesign-production.up.railway.app',
        changeOrigin: true,
        secure: false, // No need for SSL verification in proxy
        ws: true, // Enable WebSocket proxying
      },
      '/socket.io': {
        // Also proxy socket.io to the Railway server
        target: 'https://pleasantcovedesign-production.up.railway.app',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: [
      'react-big-calendar',
      'react-big-calendar/lib/addons/dragAndDrop',
      'date-fns/format',
      'date-fns/parse',
      'date-fns/startOfWeek',
      'date-fns/getDay',
      'date-fns/locale/en-US'
    ]
  }
}) 