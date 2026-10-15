import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { aiRoutes } from './server/ai.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // All of .env, not just VITE_* — these stay on the server, never in the bundle.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      aiRoutes({
        anthropicApiKey: env.ANTHROPIC_API_KEY,
        jevApiKey: env.JEV_API_KEY,
        jevBaseUrl: env.JEV_BASE_URL || 'https://api.typesafe.ai',
        openaiApiKey: env.OPENAI_API_KEY,
      }),
    ],
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
