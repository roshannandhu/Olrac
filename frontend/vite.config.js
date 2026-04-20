import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_API_TARGET || 'http://localhost:8000'
  const siteMode = env.VITE_SITE_MODE || env.VITE_SITE || (mode === 'admin' ? 'admin' : 'client')
  const isAdminSite = siteMode === 'admin'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: isAdminSite ? 5174 : 5173,
      strictPort: true,
      allowedHosts: ['.trycloudflare.com', '.loca.lt'],
      hmr: {
        protocol: 'wss',
        clientPort: 443,
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: isAdminSite ? 'dist/admin' : 'dist/client',
      emptyOutDir: true,
    },
    define: {
      'import.meta.env.VITE_SITE_MODE': JSON.stringify(siteMode),
    },
  }
})
