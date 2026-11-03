import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { aiRoutes, configFromEnv } from './server/ai.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // All of .env, not just VITE_* — these stay on the server, never in the bundle.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      aiRoutes(configFromEnv(env)),
    ],
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
