import { getLang, t } from '../i18n';

export const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const todayISO = () => toISO(new Date());
export const parseISO = (s: string) => {
  const a = s.split('-').map(Number);
  return new Date(a[0], a[1] - 1, a[2]);
};
export const addDays = (s: string, n: number) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
export const monthKey = (s: string) => s.slice(0, 7);
export const shiftMonth = (k: string, n: number) => {
  const a = k.split('-').map(Number);
  const d = new Date(a[0], a[1] - 1 + n, 1);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
};

/** Parses "1 600", "1600,5" etc. Anything else becomes 0. */
export const num = (v: unknown) => {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const loc = () => (getLang() === 'hu' ? 'hu-HU' : 'en-GB');
export const monthLabel = (k: string) => {
  const a = k.split('-').map(Number);
  return new Date(a[0], a[1] - 1, 1).toLocaleDateString(loc(), { month: 'long', year: 'numeric' });
};
export const monthName = (k: string) => {
  const a = k.split('-').map(Number);
  return new Date(a[0], a[1] - 1, 1).toLocaleDateString(loc(), { month: 'long' });
};
export const fmtDate = (s: string, long?: boolean) =>
  s ? parseISO(s).toLocaleDateString(loc(), long ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' }) : '';

export function relDay(s: string) {
  const n = daysBetween(todayISO(), s);
  if (n === 0) return t('today');
  if (n === 1) return t('tomorrow');
  if (n === -1) return t('overdue1');
  if (n < 0) return t('overdueN', { n: -n });
  return t('inN', { n, d: fmtDate(s, true) });
}

let currency = 'Ft';
export const setCurrency = (c: string) => { currency = c || 'Ft'; };
export const cur = () => currency;
export const nf = (n: number) => Math.round(n || 0).toLocaleString(loc());
export const money = (n: number) => nf(n) + ' ' + currency;

export const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, loc());

/** Only http(s) links are rendered; a bare domain gets https://. */
export function safeUrl(u: string): string | null {
  const s = (u || '').trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export const telHref = (phone: string) => 'tel:' + phone.replace(/[^\d+]/g, '');
