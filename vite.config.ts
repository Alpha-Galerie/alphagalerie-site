import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

// O rodapé precisa dizer qual versão está publicada. Sem isso não dá para
// distinguir "a correção não funcionou" de "a publicação ainda não saiu" —
// dúvida que já custou várias rodadas de investigação.
//
// A Vercel expõe o commit publicado em VERCEL_GIT_COMMIT_SHA. Fora dela,
// cai na data, que pelo menos muda a cada build.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.VITE_APP_VERSION ||
  new Date().toISOString().slice(0, 10);

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
  server: {
    allowedHosts: ['palaeanthropic-mycelial-eugena.ngrok-free.dev'],
  }
})
