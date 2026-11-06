import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Exposes server on local network for mobile phone access
    port: 5173,
    cors: true,
    allowedHosts: true, // Allow all hosts (mobile IPs, ngrok, localtunnel, etc.)
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    allowedHosts: true,
  }
})

