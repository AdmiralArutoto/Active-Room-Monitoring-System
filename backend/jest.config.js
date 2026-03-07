module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  globalSetup: './tests/helpers/setup.js',
  setupFiles: ['./tests/helpers/env.js'],
};
