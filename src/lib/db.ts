// All reads and writes to Supabase. Row-level security in the database decides
// what each user may see; the queries still filter by rep_id because owners can
// read every rep's rows and the app should only show their own here.
import { supabase } from './supabase';
import type {
  Activity, ActivityType, Catalog, Client, ClientType, Member, Order, OrderLine, Product, Role, Stage, TeamRow, UserSettings,
} from './types';

/* ---------- row types ---------- */
interface ClientRow {
  id: string; rep_id: string; name: string; type: ClientType; stage: Stage; contact: string; phone: string; email: string;
  address: string; city: string; website: string;
  next_follow_up: string | null; notes: string; created_at: string;
}
interface ActivityRow { id: string; client_id: string; type: ActivityType; happened_on: string; text: string; created_at: string }
interface LineRow { product_id: string | null; product_name: string; qty: number; unit_price: number | string; unit_commission: number | string }
interface OrderRow { id: string; client_id: string; order_date: string; note: string; paid: boolean; created_at: string; order_lines: LineRow[] }
interface ProductRow { id: string; name: string; net_price: number | string; commission: number | string; active: boolean; sort_order: number }
interface MemberRow {
  id: string; user_id: string | null; email: string; full_name: string; phone: string; position: string; segment: string; role: Role; active: boolean;
}

const n = (v: number | string | null | undefined) => Number(v ?? 0);
const time = (s: string) => Date.parse(s) || 0;

export const toClient = (r: ClientRow): Client => ({
  id: r.id, name: r.name, type: r.type, stage: r.stage, contact: r.contact, phone: r.phone, email: r.email,
  address: r.address, city: r.city, website: r.website,
  nextFollowUp: r.next_follow_up ?? '', notes: r.notes, createdAt: time(r.created_at),
});

const fromClient = (c: Client) => ({
  id: c.id, name: c.name.trim(), type: c.type, stage: c.stage, contact: c.contact, phone: c.phone, email: c.email,
  address: c.address, city: c.city, website: c.website,
  next_follow_up: c.nextFollowUp || null, notes: c.notes,
});

const toActivity = (r: ActivityRow): Activity => ({
  id: r.id, clientId: r.client_id, type: r.type, date: r.happened_on, text: r.text, createdAt: time(r.created_at),
});

const toLine = (l: LineRow): OrderLine => ({
  productId: l.product_id, name: l.product_name, qty: l.qty, price: n(l.unit_price), commission: n(l.unit_commission),
});

export const toOrder = (r: OrderRow): Order => ({
  id: r.id, clientId: r.client_id, date: r.order_date, note: r.note, paid: r.paid, createdAt: time(r.created_at),
  lines: (r.order_lines || []).map(toLine),
});

const toProduct = (r: ProductRow): Product => ({
  id: r.id, name: r.name, price: n(r.net_price), commission: n(r.commission), active: r.active, sortOrder: r.sort_order,
});

export const toMember = (r: MemberRow): Member => ({
  id: r.id, userId: r.user_id, email: r.email, name: r.full_name, phone: r.phone, position: r.position, segment: r.segment,
  role: r.role, active: r.active,
});

/* ---------- helpers ---------- */
function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

/** PostgREST returns at most 1000 rows per request (Supabase default), so page through. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const rows = check(await page(from, from + size - 1)) ?? [];
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

/* ---------- loading ---------- */
export async function loadMe(uid: string): Promise<Member | null> {
  const row = check(await supabase.from('team_members').select('*').eq('user_id', uid).maybeSingle());
  return row ? toMember(row as MemberRow) : null;
}

export interface MyData {
  clients: Record<string, Client>;
  activities: Activity[];
  orders: Record<string, Order>;
  catalog: Catalog;
  settings: UserSettings;
  lang: 'hu' | 'en' | null;
}

export async function loadMyData(uid: string): Promise<MyData> {
  const [clients, activities, orders, products, app, settings] = await Promise.all([
    fetchAll<ClientRow>((a, b) => supabase.from('clients').select('*').eq('rep_id', uid).order('id').range(a, b)),
    fetchAll<ActivityRow>((a, b) => supabase.from('activities').select('*').eq('rep_id', uid).order('id').range(a, b)),
    fetchAll<OrderRow>((a, b) => supabase.from('orders').select('*, order_lines(*)').eq('rep_id', uid).order('id').range(a, b)),
    supabase.from('products').select('*').order('sort_order').order('created_at'),
    supabase.from('app_settings').select('*').maybeSingle(),
    supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
  ]);
  const prods = check(products) as ProductRow[];
  const appRow = check(app) as { currency: string; vat_pct: number | string } | null;
  const st = check(settings) as { monthly_target: number | string; reorder_days: number; lang: 'hu' | 'en' | null } | null;
  return {
    clients: Object.fromEntries(clients.map((r) => [r.id, toClient(r)])),
    activities: activities.map(toActivity),
    orders: Object.fromEntries(orders.map((r) => [r.id, toOrder(r)])),
    catalog: { currency: appRow?.currency || 'Ft', vat: appRow ? n(appRow.vat_pct) : 27, products: prods.map(toProduct) },
    settings: { target: st ? n(st.monthly_target) : 150000, reorderDays: st?.reorder_days ?? 21 },
    lang: st?.lang ?? null,
  };
}

export async function loadMembers(): Promise<Member[]> {
  return (check(await supabase.from('team_members').select('*').order('full_name')) as MemberRow[]).map(toMember);
}

export async function loadTeamMonth(monthKey: string): Promise<TeamRow[]> {
  const rows = check(await supabase.rpc('team_month_summary', { p_month: monthKey + '-01' })) as {
    member_id: string; rep_id: string; full_name: string; active: boolean; clients: number; pieces: number;
    net: number | string; commission: number | string; unpaid_commission: number | string;
  }[];
  return rows.map((r) => ({
    memberId: r.member_id, repId: r.rep_id, name: r.full_name, active: r.active, clients: n(r.clients), qty: n(r.pieces),
    net: n(r.net), commission: n(r.commission), unpaid: n(r.unpaid_commission),
  }));
}

/* ---------- clients & activities ---------- */
export async function insertClient(c: Client) {
  check(await supabase.from('clients').insert(fromClient(c)));
}
export async function updateClient(c: Client) {
  const { id, ...rest } = fromClient(c);
  check(await supabase.from('clients').update(rest).eq('id', id));
}
export async function deleteClient(id: string) {
  check(await supabase.from('clients').delete().eq('id', id));
}
export async function insertActivity(a: Activity) {
  check(await supabase.from('activities').insert({ id: a.id, client_id: a.clientId, type: a.type, happened_on: a.date, text: a.text }));
}
export async function deleteActivity(id: string) {
  check(await supabase.from('activities').delete().eq('id', id));
}

/* ---------- orders ---------- */
export async function saveOrder(o: { id: string | null; clientId: string; date: string; note: string; qty: Record<string, number> }): Promise<Order> {
  const lines = Object.entries(o.qty).filter(([, q]) => q > 0).map(([product_id, qty]) => ({ product_id, qty }));
  const id = check(await supabase.rpc('save_order', {
    p_client_id: o.clientId, p_order_date: o.date, p_lines: lines, p_note: o.note, p_order_id: o.id,
  })) as string;
  const row = check(await supabase.from('orders').select('*, order_lines(*)').eq('id', id).single());
  return toOrder(row as OrderRow);
}
export async function setPaid(ids: string[], paid: boolean) {
  check(await supabase.from('orders').update({ paid }).in('id', ids));
}
export async function deleteOrder(id: string) {
  check(await supabase.from('orders').delete().eq('id', id));
}

/* ---------- settings & catalog ---------- */
export async function saveUserSettings(uid: string, s: Partial<UserSettings> & { lang?: 'hu' | 'en' }) {
  const row: Record<string, unknown> = { user_id: uid };
  if (s.target != null) row.monthly_target = s.target;
  if (s.reorderDays != null) row.reorder_days = s.reorderDays;
  if (s.lang) row.lang = s.lang;
  check(await supabase.from('user_settings').upsert(row));
}

export async function saveCatalog(next: Catalog, prev: Catalog) {
  if (next.vat !== prev.vat) check(await supabase.from('app_settings').update({ vat_pct: next.vat }).eq('id', true));
  const rows = next.products
    .filter((p) => {
      const old = prev.products.find((x) => x.id === p.id);
      return !old || old.name !== p.name || old.price !== p.price || old.commission !== p.commission || old.active !== p.active || old.sortOrder !== p.sortOrder;
    })
    .map((p) => ({ id: p.id, name: p.name, net_price: p.price, commission: p.commission, active: p.active, sort_order: p.sortOrder }));
  if (rows.length) check(await supabase.from('products').upsert(rows));
}

/* ---------- team members (owner) ---------- */
export async function saveMember(m: Omit<Member, 'id' | 'userId'> & { id: string | null }) {
  const body = {
    email: m.email.trim().toLowerCase(), full_name: m.name.trim(), phone: m.phone, position: m.position, segment: m.segment,
    role: m.role, active: m.active,
  };
  if (m.id) check(await supabase.from('team_members').update(body).eq('id', m.id));
  else check(await supabase.from('team_members').insert(body));
}

/** Postgres error code from a Supabase error, if any. */
export const errCode = (e: unknown) => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '');
