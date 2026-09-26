import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the page calls /api on its own address and Vite forwards it to the
    // backend, so the site also works from a phone on the same Wi-Fi (npm run dev -- --host).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
