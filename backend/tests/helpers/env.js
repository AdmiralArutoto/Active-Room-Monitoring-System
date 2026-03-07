// Runs in each worker before modules are required.
// Overrides DATABASE_URL so all PrismaClient instances hit the test DB.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set — check your .env file');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
