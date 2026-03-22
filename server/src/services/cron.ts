import cron from 'node-cron';
import { query } from '../db';

export const startCronJobs = () => {
  // Refresh activity levels every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await query('SELECT refresh_activity_levels()');
      console.log('Activity levels refreshed');
    } catch (err) {
      console.error('Cron error (refresh_activity_levels):', err);
    }
  });

  console.log('Cron jobs started');
};
