import { describe, expect, it } from 'vitest';
import { lastOrderMap, linesTotals, orderLines, orderProducts, stageAfterActivity, sumTotals, totalsOf } from '../../src/lib/commission';
import type { Order, Product } from '../../src/lib/types';

const products: Product[] = [
  { id: 'm', name: 'Margherita', price: 1600, commission: 160, active: true, sortOrder: 1 },
  { id: 's', name: 'Sonkás', price: 1890, commission: 189, active: true, sortOrder: 2 },
  { id: 'v', name: 'Vegán', price: 1750, commission: 175, active: false, sortOrder: 3 },
];
const order = (id: string, date: string, lines: Order['lines'], paid = false): Order => ({ id, clientId: 'c' + id, date, note: '', paid, createdAt: 0, lines });

describe('commission', () => {
  it('sums qty, net and commission per line', () => {
    const o = order('1', '2026-10-01', [
      { productId: 'm', name: 'Margherita', qty: 10, price: 1600, commission: 160 },
      { productId: 's', name: 'Sonkás', qty: 3, price: 1890, commission: 189 },
    ]);
    expect(totalsOf(o)).toEqual({ qty: 13, net: 16000 + 5670, commission: 1600 + 567 });
    expect(sumTotals([o, o]).commission).toBe(2 * 2167);
  });

  it('new orders use the catalog; hidden products are not offered', () => {
    const ps = orderProducts(products);
    expect(ps.map((p) => p.id)).toEqual(['m', 's']);
    expect(orderLines(ps, { m: 2, s: 0 })).toEqual([{ productId: 'm', name: 'Margherita', qty: 2, price: 1600, commission: 160 }]);
  });

  it('editing keeps the saved price and commission, and keeps hidden products already on the order', () => {
    const old = [
      { productId: 'm', name: 'Margherita', qty: 5, price: 1500, commission: 150 },
      { productId: 'v', name: 'Vegán', qty: 1, price: 1700, commission: 170 },
    ];
    const ps = orderProducts(products, old);
    expect(ps.find((p) => p.id === 'm')).toMatchObject({ price: 1500, commission: 150 });
    expect(ps.find((p) => p.id === 's')).toMatchObject({ price: 1890, commission: 189 });
    expect(ps.find((p) => p.id === 'v')).toMatchObject({ price: 1700, commission: 170 });
    expect(linesTotals(orderLines(ps, { m: 2, s: 1 })).commission).toBe(300 + 189);
  });

  it('finds the latest order per client', () => {
    const os = [order('1', '2026-01-05', []), { ...order('2', '2026-03-01', []), clientId: 'c1' }];
    expect(lastOrderMap(os)).toEqual({ c1: '2026-03-01' });
  });

  it('moves the stage like the original app', () => {
    expect(stageAfterActivity('lead', 'call')).toBe('contacted');
    expect(stageAfterActivity('lead', 'note')).toBe('lead');
    expect(stageAfterActivity('contacted', 'tasting')).toBe('tasting');
    expect(stageAfterActivity('customer', 'tasting')).toBe('customer');
    expect(stageAfterActivity('negotiating', 'visit')).toBe('negotiating');
  });
});
