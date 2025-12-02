import { defineConfig } from 'vite'

export default defineConfig({
  // Base path for GitHub Pages deployment
  base: '/simulations/',
  // Handle SPA routing - serve index.html for all routes
  appType: 'spa',
})
