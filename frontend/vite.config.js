import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://vintagefashion.site',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
