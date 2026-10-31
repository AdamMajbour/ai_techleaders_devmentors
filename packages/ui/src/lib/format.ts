// Formats for what the product shows. Content rules: a price is "25 EUR" in sentences and buttons (a whole
// amount has no decimals) and "25.00 EUR" in tables, where digits must line up. A time is 24-hour, "14:25".

/** `compact` drops ".00" from a whole amount ("25 EUR"). `exact` always shows two decimals ("25.00 EUR"). */
export function formatPrice(amountMinor: number, currency: string, style: 'compact' | 'exact' = 'compact'): string {
  const whole = amountMinor % 100 === 0;
  const text = style === 'compact' && whole ? String(amountMinor / 100) : (amountMinor / 100).toFixed(2);
  return `${text} ${currency}`;
}

/** A clock time such as "14:25". Pass `timeZone` (for example "Europe/Warsaw") to make it independent of the machine. */
export function formatClock(date: Date | string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(new Date(date));
}

/** A calendar date such as "3 Nov 2026". Pass `timeZone` to make it independent of the machine. */
export function formatDate(date: Date | string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(date));
}

/** A length of time in whole minutes as words: "45 min", "1 h", "1 h 20 min". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
