// Runs once before all test suites (configured via jest.config.js globalSetup)
// Loads .env, redirects DATABASE_URL to the test DB, and runs migrations.
const { execSync } = require('child_process');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

module.exports = async function globalSetup() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is not set — check your .env file');
  }

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
    cwd: require('path').resolve(__dirname, '../../'),
  });
};
