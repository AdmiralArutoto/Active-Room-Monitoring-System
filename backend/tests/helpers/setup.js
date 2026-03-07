// Runs once before all test suites (configured via jest.config.js globalSetup)
// Redirects DATABASE_URL to the test DB and runs migrations.
const { execSync } = require('child_process');

module.exports = async function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
    cwd: require('path').resolve(__dirname, '../../'),
  });
};
