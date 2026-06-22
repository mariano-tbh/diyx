import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: {
    target: 'esnext',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from '@diyx/lib'`,
  },
  optimizeDeps: {
    exclude: ['@diyx/lib'],
  },
})
