import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });
  process.env.DATABASE_URL = 'postgresql://localhost:5432/goalbuddy_test';
  process.env.JWT_SECRET = 'test-secret-key';
}
