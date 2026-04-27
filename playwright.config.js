module.exports = {
  testDir: './tests/e2e',
  use: {
    headless: true,
    baseURL: 'https://dashboard-gamification.vercel.app',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ],
  timeout: 90000,
  retries: 0,
};
