const DAY = 864e5;
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

export const ms = (iso: string) => new Date(iso).getTime();
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatMonth = (iso: string) => monthFmt.format(new Date(iso));
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();

/** "today", "yesterday", "3 days ago", or "on 12 Nov 2026". */
export function ago(iso: string): string {
  const days = Math.floor((Date.now() - ms(iso)) / DAY);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return `on ${formatDate(iso)}`;
}
