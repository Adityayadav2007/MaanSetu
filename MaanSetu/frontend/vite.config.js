import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration.
 *
 * The dev server binds to 0.0.0.0 so the app is reachable from outside the
 * container (preview environments, another machine on the network). It also
 * proxies /api to the backend, which is what lets the frontend use relative
 * URLs: the browser talks only to this origin, and the proxy forwards to the
 * API server-side. Pointing the browser at the API host directly would fail on
 * CORS and, more importantly, would break the session cookie.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    /**
     * Hosts the dev server will answer for.
     *
     * Vite rejects requests whose Host header is not recognised, which blocks
     * tunneled preview URLs. Only local development hosts are listed — this
     * setting is a dev-server guard, not an authentication mechanism.
     */
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
