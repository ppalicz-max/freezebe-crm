import { defineConfig, devices } from '@playwright/test';
// @ts-expect-error plain JS helper
import { ANON_KEY } from './tests/e2e/jwt.mjs';

// Browser tests against a local stack (see tests/e2e/start-stack.sh).
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:5173',
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: [
    { command: 'bash tests/e2e/start-stack.sh', url: 'http://127.0.0.1:54321/rest/v1/', timeout: 60_000, reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 } },
    {
      command: 'npx vite --port 5173 --strictPort',
      url: 'http://localhost:5173',
      timeout: 60_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
      env: {
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: ANON_KEY,
        GOOGLE_PLACES_API_KEY: 'test-key',
        PLACES_API_BASE: 'http://127.0.0.1:54321/google/v1',
      },
    },
  ],
});
