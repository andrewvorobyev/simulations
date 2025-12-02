import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // Base path: /simulations/ for production (GitHub Pages), / for local dev
  base: command === 'build' ? '/simulations/' : '/',
  // Handle SPA routing - serve index.html for all routes
  appType: 'spa',
}))
