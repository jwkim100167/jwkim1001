import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/jwkim1001/' : '/'

  return {
    plugins: [react()],
    base: base,
  }
})
