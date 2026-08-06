import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      babel: {
        presets: ['@babel/preset-typescript'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.opencode/**', '**/.claude/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // The unit-test gate covers the business-logic core: entity schemas,
      // pure utilities and non-UI shared helpers. DB repository modules are
      // thin Supabase glue exercised by the integration suite (api-routes),
      // and UI is covered by component + e2e suites — neither belongs in this
      // gate, which would otherwise be dragged below a meaningful threshold
      // without adding signal.
      include: [
        'src/entities/**/schema.ts',
        'src/entities/**/utils.ts',
        'src/entities/**/totals.ts',
        'src/entities/**/catalog.ts',
        'src/entities/**/service.ts',
        'src/entities/exchange-rate/base-rates.ts',
        'src/shared/lib/{audit-logger,billing/stripe-status,cache,category-icons,csrf,currency,datetime,effective-settings,like-escape,password,rate-limit,security-headers,utils,vat,csv-export,pdf-export}.ts',
      ],
      exclude: [
        'node_modules/',
        'tests/setup.ts',
        '**/*.config.*',
        '**/*.d.ts',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
