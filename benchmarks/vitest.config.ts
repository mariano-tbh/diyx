import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'happy-dom',
    benchmark: {
      outputJson: resolve(__dirname, '../benchmark-results.json'),
    },
  },
  resolve: {
    alias: {
      '@diyx/lib': resolve(__dirname, '../packages/lib/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@diyx/lib'],
  },
})
