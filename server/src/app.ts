import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { createApp } from './create-app';
import { initSocket } from './socket';
import { startCronJobs } from './services/cron';
import { pool } from './db';

const app = createApp();
const httpServer = http.createServer(app);

// Socket.io
initSocket(httpServer);

// Cron
startCronJobs();

const PORT = process.env.PORT || 3000;
const server = httpServer.listen(PORT, () => {
  console.log(`GoalBuddy server running on port ${PORT}`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    console.log('HTTP server closed.');
    await pool.end();
    console.log('Database pool closed.');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
