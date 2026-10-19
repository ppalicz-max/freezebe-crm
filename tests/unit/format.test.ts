import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, num, safeUrl, shiftMonth, telHref } from '../../src/lib/format';
import { csvCell } from '../../src/lib/csv';
import { STRINGS } from '../../src/i18n';

describe('helpers', () => {
  it('parses Hungarian-style numbers', () => {
    expect(num('150 000')).toBe(150000);
    expect(num('27,5')).toBe(27.5);
    expect(num('abc')).toBe(0);
  });
  it('does date maths in local days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-10-01', '2026-10-22')).toBe(21);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
  it('only allows http(s) links', () => {
    expect(safeUrl('freezbee.hu')).toBe('https://freezbee.hu/');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('')).toBeNull();
    expect(safeUrl('http://x.hu/a?b=1')).toBe('http://x.hu/a?b=1');
  });
  it('builds tel: links', () => expect(telHref('+36 1 234-5678')).toBe('tel:+3612345678'));
  it('quotes CSV cells that need it', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(12)).toBe('12');
  });
  it('has every string in both languages', () => {
    expect(Object.keys(STRINGS.hu).sort()).toEqual(Object.keys(STRINGS.en).sort());
    for (const [k, v] of Object.entries(STRINGS.hu)) expect(v, k).not.toBe('');
  });
  it('keeps the CSV header column count the same in both languages', () => {
    expect(STRINGS.hu.csv_clients.split(';').length).toBe(STRINGS.en.csv_clients.split(';').length);
    expect(STRINGS.hu.csv_orders.split(';').length).toBe(STRINGS.en.csv_orders.split(';').length);
  });
});
