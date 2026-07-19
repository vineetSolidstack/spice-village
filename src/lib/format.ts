/** Prices are always shown in ₹ with no decimals, per the content fundamentals. */
export function money(value: number): string {
  return `₹${value}`;
}

/** "3 sessions left" — numerals for numbers, and a correctly pluralised noun. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** "Sat 2 Aug" — the short date form used in bulk quotes and workshop sessions. */
export function shortDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
