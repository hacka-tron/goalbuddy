const MS_PER_DAY = 86_400_000;

export function computeExpectedSessions(
  frequency: string,
  daysPerWeek: number | null,
  customDays: string | null,
  startDate: Date,
  endDate: Date,
): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;

  switch (frequency) {
    case 'daily':
      return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;

    case 'weekly': {
      const startMon = mondayOf(start);
      const endMon = mondayOf(end);
      return Math.floor((endMon.getTime() - startMon.getTime()) / (7 * MS_PER_DAY)) + 1;
    }

    case 'x_weekly': {
      const dpw = daysPerWeek ?? 1;
      const startMon = mondayOf(start);
      const endMon = mondayOf(end);
      const weeks = Math.floor((endMon.getTime() - startMon.getTime()) / (7 * MS_PER_DAY)) + 1;
      return weeks * dpw;
    }

    case 'monthly':
      return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

    case 'custom_days': {
      const days = (customDays ?? '')
        .split(',')
        .map(Number)
        .filter(Boolean);
      let count = 0;
      const current = new Date(start);
      while (current <= end) {
        const dow = current.getDay() === 0 ? 7 : current.getDay();
        if (days.includes(dow)) count++;
        current.setDate(current.getDate() + 1);
      }
      return count;
    }

    case 'once':
      return 1;

    default:
      return 0;
  }
}

function mondayOf(d: Date): Date {
  const current = new Date(d);
  current.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  current.setHours(0, 0, 0, 0);
  return current;
}
