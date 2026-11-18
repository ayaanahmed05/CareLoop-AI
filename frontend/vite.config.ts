import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const localRequire = createRequire(import.meta.url)
function chartAliases() {
  try {
    localRequire.resolve('recharts')
    return []
  } catch {
    return [{
      find: './charts/Renderers',
      replacement: fileURLToPath(new URL('./src/charts/NativeRenderers.tsx', import.meta.url)),
    }]
  }
}

export default defineConfig({
  resolve: { alias: chartAliases() },
  server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:8000' } },
})
