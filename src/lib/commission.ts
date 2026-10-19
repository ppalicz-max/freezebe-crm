import type { Order, OrderLine, Product } from './types';

export interface Totals { qty: number; net: number; commission: number }

const zero = (): Totals => ({ qty: 0, net: 0, commission: 0 });

export const linesTotals = (lines: OrderLine[]): Totals =>
  lines.reduce((a, l) => ({ qty: a.qty + l.qty, net: a.net + l.qty * l.price, commission: a.commission + l.qty * l.commission }), zero());

export const totalsOf = (o: Order): Totals => linesTotals(o.lines || []);

export const sumTotals = (os: Order[]): Totals =>
  os.reduce((a, o) => {
    const x = totalsOf(o);
    return { qty: a.qty + x.qty, net: a.net + x.net, commission: a.commission + x.commission };
  }, zero());

/** clientId -> date of the latest order */
export const lastOrderMap = (os: Order[]) => {
  const m: Record<string, string> = {};
  os.forEach((o) => { if (!m[o.clientId] || o.date > m[o.clientId]) m[o.clientId] = o.date; });
  return m;
};

export interface OrderProduct { id: string; name: string; price: number; commission: number }

/**
 * Products offered in the order sheet: active catalog products, plus products
 * already on the order being edited. Lines already on the order keep the
 * price and commission they were saved with.
 */
export function orderProducts(products: Product[], oldLines: OrderLine[] = []): OrderProduct[] {
  const list: OrderProduct[] = products.filter((p) => p.active).map((p) => {
    const old = oldLines.find((l) => l.productId === p.id);
    return { id: p.id, name: p.name, price: old ? old.price : p.price, commission: old ? old.commission : p.commission };
  });
  oldLines.forEach((l) => {
    if (l.productId && !list.some((p) => p.id === l.productId)) {
      const p = products.find((x) => x.id === l.productId);
      list.push({ id: l.productId, name: p ? p.name : l.name, price: l.price, commission: l.commission });
    }
  });
  return list;
}

export function orderLines(products: OrderProduct[], qty: Record<string, number>): OrderLine[] {
  return products
    .map((p) => ({ productId: p.id, name: p.name, qty: qty[p.id] || 0, price: p.price, commission: p.commission }))
    .filter((l) => l.qty > 0);
}

/** Stage change when an activity is logged (same rules as the original app). */
export function stageAfterActivity<S extends string>(stage: S, type: string): S | 'tasting' | 'contacted' {
  if (type === 'tasting' && (stage === 'lead' || stage === 'contacted')) return 'tasting';
  if (type !== 'note' && stage === 'lead') return 'contacted';
  return stage;
}
