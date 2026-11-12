import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 4179);
const basePath = process.env.PW_BASE_PATH ?? '/';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}${basePath}`,
    trace: 'retain-on-failure',
    colorScheme: 'light',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort --base ${basePath}`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: false,
  },
});
