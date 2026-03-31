import { Pool } from 'pg';

export default async function globalTeardown() {
  const pool = new Pool({ connectionString: 'postgresql://localhost:5432/goalbuddy_test' });
  await pool.end();
}
