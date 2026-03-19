import type { Period } from '@/components/dashboard/PeriodFilter';

/**
 * Returns the ISO date string for the start of the given period.
 */
export function periodToDateFrom(period: Period): string {
  const now = new Date();
  let d: Date;

  switch (period) {
    case '7d':
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case '15d':
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15);
      break;
    case '30d':
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      break;
    case '90d':
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
      break;
    case 'year':
      d = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  }

  return d.toISOString();
}
