import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import passport from 'passport';

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import goalsRouter from './routes/goals';
import finderRouter from './routes/finder';
import buddiesRouter from './routes/buddies';
import checkinsRouter from './routes/checkins';
import milestonesRouter from './routes/milestones';
import statsRouter from './routes/stats';

import { initSocket } from './socket';
import { startCronJobs } from './services/cron';

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/goals', goalsRouter);
app.use('/finder', finderRouter);
app.use('/buddies', buddiesRouter);
app.use('/checkins', checkinsRouter);
app.use('/milestones', milestonesRouter);
app.use('/stats', statsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Socket.io
initSocket(httpServer);

// Cron
startCronJobs();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`GoalBuddy server running on port ${PORT}`);
});

export default app;
