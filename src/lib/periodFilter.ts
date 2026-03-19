import type { Period } from '@/components/dashboard/PeriodFilter';

/**
 * Returns the date string (YYYY-MM-DD) for the start of the given period.
 * Uses plain date format so it works correctly with Supabase `date` columns.
 */
export function periodToDateFrom(period: Period): string {
  const now = new Date();
  let d: Date;

  switch (period) {
    case 'hoje':
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
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
    case 'vencidos':
      // For overdue, we return a very old date so all records are included
      d = new Date(2000, 0, 1);
      break;
    default:
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function periodToDateTo(period: Period): string | null {
  if (period === 'hoje') {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}
