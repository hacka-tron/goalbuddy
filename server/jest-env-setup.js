// Runs before any test module is imported — sets the test DB URL
// before db/index.ts creates its pool.
process.env.DATABASE_URL = 'postgresql://localhost:5432/goalbuddy_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';
