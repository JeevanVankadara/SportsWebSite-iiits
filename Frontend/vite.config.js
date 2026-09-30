import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { securityHeaders } from './security-policy.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const headers = securityHeaders(loadEnv(mode, '.', 'VITE_').VITE_API_URL ?? '')
  return {
  plugins: [react(), {
    name: 'production-security-policy',
    apply: 'build',
    transformIndexHtml() {
      // Embedding protection requires a response header; other CSP rules also work in HTML.
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: headers['Content-Security-Policy'].replace("; frame-ancestors 'none'", '') }, injectTo: 'head-prepend' }]
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: `/*\n${Object.entries(headers).map(([key, value]) => `  ${key}: ${value}`).join('\n')}\n` })
    },
  }],
  build: { sourcemap: false },
  preview: { headers },
  server: {
    // In development the page calls /api on its own address and Vite forwards it to the
    // backend, so the site also works from a phone on the same Wi-Fi (npm run dev -- --host).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  }
})
