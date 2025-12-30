import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://school-management-system-daul.onrender.com', 
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  // Production build settings
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});