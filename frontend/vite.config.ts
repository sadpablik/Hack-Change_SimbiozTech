import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Proxy не нужен, так как используем прямой URL в API клиенте
    // Но оставляем для возможности использования в будущем
  },
})
