import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Allow self-signed or dev SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Determine report directory based on whether UI or API tests are running
const isUITest = process.argv.some(arg => arg.toLowerCase().includes('tests') || arg.includes('chromium') || arg.includes('firefox') || arg.includes('webkit'));
const htmlReportFolder = process.env.PLAYWRIGHT_HTML_REPORT || (isUITest ? 'playwright-report-ui' : 'playwright-report');

// Cross-platform case-resilient test directory resolver (prevents Linux CI/CD case-sensitivity failures)
const resolveTestDir = (preferredDir: string, fallbackDir: string): string => {
  const cwd = process.cwd();
  if (fs.existsSync(path.resolve(cwd, preferredDir))) return preferredDir;
  if (fs.existsSync(path.resolve(cwd, fallbackDir))) return fallbackDir;
  return preferredDir;
};

const uiTestsDir = resolveTestDir('./tests', './Tests');
const apiTestsDir = resolveTestDir('./APITests', './apitests');

export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: htmlReportFolder, open: process.env.CI ? 'never' : 'always' }],
  ],
  use: {
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'api',
      testDir: apiTestsDir,
      use: {
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },
    {
      name: 'chromium',
      testDir: uiTestsDir,
      use: {
        viewport: null,
        launchOptions: {
          args: [
            '--incognito',
            '--start-maximized',
            '--disable-cache',
            '--disable-application-cache',
            '--disk-cache-size=0',
          ],
        },
      },
    },
    {
      name: 'firefox',
      testDir: uiTestsDir,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testDir: uiTestsDir,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
