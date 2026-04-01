import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/**
 * Configuração do Vitest para testes de integração.
 *
 * Os testes de integração ficam em `src/tests/integration/` e testam
 * fluxos de negócio completos com Supabase mockado.
 * Execute com: `npm run test:integration`
 */
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'integration',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/tests/integration/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 15_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
