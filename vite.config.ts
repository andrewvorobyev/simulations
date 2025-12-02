import { defineConfig } from 'vite'

export default defineConfig({
  // Base path for both local dev and GitHub Pages
  base: '/simulations/',
  // Handle SPA routing - serve index.html for all routes
  appType: 'spa',
})
