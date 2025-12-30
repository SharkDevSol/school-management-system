import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://excellence.oddag.et', 
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