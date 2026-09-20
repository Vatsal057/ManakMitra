import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyWithSpaBypass = {
  target: 'http://localhost:8000',
  bypass: (req) => {
    if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
      return '/index.html';
    }
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/recommend': proxyWithSpaBypass,
      '/translate': 'http://localhost:8000',
      '/allied': 'http://localhost:8000',
      '/audit': 'http://localhost:8000',
      '/i18n': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
  preview: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/recommend': proxyWithSpaBypass,
      '/translate': 'http://localhost:8000',
      '/allied': 'http://localhost:8000',
      '/audit': 'http://localhost:8000',
      '/i18n': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
});