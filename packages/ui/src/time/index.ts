export function formatInstant(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return 'Date not available';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Date not available';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
