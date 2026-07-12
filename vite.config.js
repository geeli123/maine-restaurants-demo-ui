import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        step1: resolve(__dirname, 'step1.html'),
        step2: resolve(__dirname, 'step2.html'),
        step3: resolve(__dirname, 'step3.html'),
        step4: resolve(__dirname, 'step4.html'),
        results: resolve(__dirname, 'results.html'),
        result: resolve(__dirname, 'result.html'),
        admin: resolve(__dirname, 'admin.html'),
        demo_iframe: resolve(__dirname, 'demo_iframe.html')
      }
    }
  }
})
