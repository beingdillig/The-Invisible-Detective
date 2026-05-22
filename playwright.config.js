/**
 * playwright.config.js
 * E2E test config for The Invisible Detective.
 *
 * Tests run against a real Chromium browser with a mobile viewport
 * (Pixel 5) that matches the game's phone-sized layout.
 *
 * Static server: `serve` hosts the root directory (index.html, script.js, style.css).
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 20000,
  expect: { timeout: 8000 },
  fullyParallel: false,   // Tests share localStorage state — run serially per file
  retries: 1,             // One retry on flaky timing
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3737',
    ...devices['Pixel 5'],          // 393×851 mobile viewport
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'npx serve . -l 3737 --no-clipboard',
    port: 3737,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
