/**
 * Safely format a number for display. Handles undefined, null, and string
 * values that come from PostgreSQL BIGINT columns.
 */
export function formatNumber(n: unknown): string {
  if (n === null || n === undefined) return '0';
  const num = typeof n === 'string' ? parseFloat(n) : Number(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
