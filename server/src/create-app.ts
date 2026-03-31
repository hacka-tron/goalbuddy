import express from 'express';
import cors from 'cors';
import passport from 'passport';
import helmet from 'helmet';

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import goalsRouter from './routes/goals';
import finderRouter from './routes/finder';
import buddiesRouter from './routes/buddies';
import checkinsRouter from './routes/checkins';
import milestonesRouter from './routes/milestones';
import statsRouter from './routes/stats';
import { errorHandler } from './middleware/error';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(passport.initialize());

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/goals', goalsRouter);
  app.use('/finder', finderRouter);
  app.use('/buddies', buddiesRouter);
  app.use('/checkins', checkinsRouter);
  app.use('/milestones', milestonesRouter);
  app.use('/stats', statsRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use(errorHandler);

  return app;
}
