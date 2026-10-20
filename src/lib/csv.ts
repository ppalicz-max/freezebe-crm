import { t } from '../i18n';
import { sumTotals } from './commission';
import { byName, todayISO } from './format';
import type { Client, Order, Product } from './types';

export const csvCell = (v: unknown) => {
  const s = String(v == null ? '' : v);
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const productName = (products: Product[], productId: string | null, fallback: string) =>
  products.find((p) => p.id === productId)?.name ?? fallback;

export function ordersCsv(orders: Order[], clients: Record<string, Client>, products: Product[]): string {
  const rows = [t('csv_orders')];
  orders.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((o) => {
    const c = clients[o.clientId];
    o.lines.forEach((l) =>
      rows.push([o.date, c?.name ?? '', c ? t(('type_' + c.type) as 'type_Hotel') : '', c?.city ?? '', productName(products, l.productId, l.name),
        l.qty, l.price, l.qty * l.price, l.commission, l.qty * l.commission, o.paid ? t('yes') : t('no'), o.note].map(csvCell).join(';')));
  });
  return rows.join('\r\n');
}

export function clientsCsv(clients: Client[], orders: Order[]): string {
  const rows = [t('csv_clients')];
  clients.slice().sort(byName).forEach((c) => {
    const os = orders.filter((o) => o.clientId === c.id);
    const tt = sumTotals(os);
    rows.push([c.name, t(('type_' + c.type) as 'type_Hotel'), t(('st_' + c.stage) as 'st_lead'), c.contact, c.phone, c.email, c.address, c.city,
      c.website, c.nextFollowUp, os.length, tt.qty, tt.net, tt.commission, c.notes].map(csvCell).join(';'));
  });
  return rows.join('\r\n');
}

/** Semicolon CSV with a BOM so Excel opens accents correctly. */
export function downloadCsv(kind: 'orders' | 'clients', body: string) {
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'freezbee-' + kind + '-' + todayISO() + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
