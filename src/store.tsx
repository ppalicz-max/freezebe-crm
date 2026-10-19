// App state and actions. Changes show up immediately (optimistic), then save to
// Supabase one after another. If a save fails, the app reloads from the server
// so the screen never shows data that isn't stored.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { setLang, t, type Lang } from './i18n';
import * as db from './lib/db';
import { orderLines, orderProducts, stageAfterActivity } from './lib/commission';
import { monthKey, setCurrency, todayISO } from './lib/format';
import type { Activity, Catalog, Client, Member, Order, Stage, TeamRow, UserSettings } from './lib/types';

export type Tab = 'home' | 'clients' | 'orders' | 'team' | 'settings';
export type Sheet =
  | { kind: 'client'; id?: string }
  | { kind: 'order'; id?: string; clientId?: string }
  | { kind: 'activity'; clientId: string }
  | { kind: 'member'; id?: string };

export interface ProductDraft { id: string; name: string; price: string; commission: string; active: boolean; isNew?: boolean }
export interface SettingsDraft { target: string; reorderDays: string; vat: string; products: ProductDraft[] }

const DEFAULT_CATALOG: Catalog = { currency: 'Ft', vat: 27, products: [] };

export function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function useCrmState(uid: string, me: Member, onLangLoaded: (l: Lang) => void, onMeChanged: () => void) {
  const isOwner = me.role === 'owner';

  /* ---------- data ---------- */
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [catalog, setCatalog] = useState<Catalog>(DEFAULT_CATALOG);
  const [settings, setSettings] = useState<UserSettings>({ target: 150000, reorderDays: 21 });
  const [members, setMembers] = useState<Member[]>([]);
  const [team, setTeam] = useState<{ month: string; rows: TeamRow[] } | null>(null);

  /* ---------- UI ---------- */
  const [tab, setTab] = useState<Tab>('home');
  const [clientId, setClientId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [cf, setCf] = useState<{ q: string; type: string; stage: string }>({ q: '', type: 'All', stage: 'all' });
  const [om, setOm] = useState(monthKey(todayISO()));
  const [of, setOf] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [tm, setTm] = useState(monthKey(todayISO()));
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [touched, setTouched] = useState(false);

  /* ---------- save status & toast ---------- */
  const [pending, setPending] = useState(0);
  const [saveErr, setSaveErr] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const lastLoad = useRef(0);
  const reload = useCallback(async () => {
    try {
      const d = await db.loadMyData(uid);
      setClients(d.clients);
      setActivities(d.activities);
      setOrders(d.orders);
      setCatalog(d.catalog);
      setCurrency(d.catalog.currency);
      setSettings(d.settings);
      if (d.lang) onLangLoaded(d.lang);
      setLoaded(true);
      setLoadErr(false);
      lastLoad.current = Date.now();
    } catch (e) {
      console.error(e);
      setLoadErr(true);
    }
  }, [uid, onLangLoaded]);

  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const pendingRef = useRef(0);
  /** Run writes one after another; on failure tell the user and resync. */
  const persist = useCallback((fn: () => Promise<unknown>) => {
    pendingRef.current++;
    setPending((p) => p + 1);
    const run = chain.current.catch(() => {}).then(fn).then(
      () => setSaveErr(false),
      (e) => {
        console.error(e);
        setSaveErr(true);
        toast(t('save_failed'));
        void reload();
      },
    ).finally(() => {
      pendingRef.current--;
      setPending((p) => p - 1);
    });
    chain.current = run;
    return run;
  }, [toast, reload]);

  const loadOwnerMembers = useCallback(async () => {
    if (!isOwner) return;
    try { setMembers(await db.loadMembers()); } catch (e) { console.error(e); }
  }, [isOwner]);

  const loadTeam = useCallback(async (month: string) => {
    if (!isOwner) return;
    try { setTeam({ month, rows: await db.loadTeamMonth(month) }); } catch (e) { console.error(e); }
  }, [isOwner]);

  useEffect(() => { void reload(); void loadOwnerMembers(); }, [reload, loadOwnerMembers]);

  // Pick up changes made on another device when the app comes back to the foreground.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || pendingRef.current > 0) return;
      if (Date.now() - lastLoad.current < 60_000) return;
      void reload();
      if (isOwner) { void loadOwnerMembers(); if (tab === 'team') void loadTeam(tm); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reload, isOwner, loadOwnerMembers, loadTeam, tab, tm]);

  useEffect(() => { if (tab === 'team' && isOwner) void loadTeam(tm); }, [tab, tm, isOwner, loadTeam]);

  // Latest data for actions (avoids stale closures).
  const ref = useRef({ clients, orders, activities, catalog, settings });
  ref.current = { clients, orders, activities, catalog, settings };

  /* ---------- actions ---------- */
  const putClient = useCallback((c: Client, isNew: boolean) => {
    setClients((m) => ({ ...m, [c.id]: c }));
    return persist(() => (isNew ? db.insertClient(c) : db.updateClient(c)));
  }, [persist]);

  const patchClient = useCallback((id: string, patch: Partial<Client>) => {
    const old = ref.current.clients[id];
    if (!old) return;
    void putClient({ ...old, ...patch }, false);
  }, [putClient]);

  const deleteClient = useCallback((id: string) => {
    setClients((m) => { const n = { ...m }; delete n[id]; return n; });
    setOrders((m) => Object.fromEntries(Object.entries(m).filter(([, o]) => o.clientId !== id)));
    setActivities((a) => a.filter((x) => x.clientId !== id));
    void persist(() => db.deleteClient(id)); // orders and activities go with it (on delete cascade)
  }, [persist]);

  const addActivity = useCallback((clientId: string, a: { type: Activity['type']; date: string; text: string }, follow: string) => {
    const c = ref.current.clients[clientId];
    if (!c) return;
    const act: Activity = { id: uuid(), clientId, type: a.type, date: a.date || todayISO(), text: a.text.trim(), createdAt: Date.now() };
    setActivities((list) => [act, ...list]);
    void persist(() => db.insertActivity(act));
    patchClient(clientId, { stage: stageAfterActivity(c.stage, a.type) as Stage, nextFollowUp: follow });
  }, [persist, patchClient]);

  const deleteActivity = useCallback((id: string) => {
    setActivities((list) => list.filter((a) => a.id !== id));
    void persist(() => db.deleteActivity(id));
  }, [persist]);

  const saveOrder = useCallback((o: { id?: string; clientId: string; date: string; note: string; qty: Record<string, number> }) => {
    const { orders: os, catalog: cat, clients: cs } = ref.current;
    const old = o.id ? os[o.id] : undefined;
    const lines = orderLines(orderProducts(cat.products, old?.lines), o.qty);
    if (!o.clientId || !o.date || !lines.length) return;
    const id = o.id || uuid();
    const local: Order = { id, clientId: o.clientId, date: o.date, note: o.note.trim(), paid: old?.paid ?? false, createdAt: old?.createdAt ?? Date.now(), lines };
    setOrders((m) => ({ ...m, [id]: local }));
    const c = cs[o.clientId];
    if (c && c.stage !== 'customer') setClients((m) => ({ ...m, [c.id]: { ...c, stage: 'customer' } }));
    void persist(async () => {
      const saved = await db.saveOrder({ id, clientId: o.clientId, date: o.date, note: o.note, qty: o.qty });
      setOrders((m) => ({ ...m, [saved.id]: saved }));
    });
  }, [persist]);

  const deleteOrder = useCallback((id: string) => {
    setOrders((m) => { const n = { ...m }; delete n[id]; return n; });
    void persist(() => db.deleteOrder(id));
  }, [persist]);

  const setPaid = useCallback((ids: string[], paid: boolean) => {
    if (!ids.length) return;
    setOrders((m) => {
      const n = { ...m };
      ids.forEach((id) => { if (n[id]) n[id] = { ...n[id], paid }; });
      return n;
    });
    void persist(() => db.setPaid(ids, paid));
  }, [persist]);

  const changeLang = useCallback((l: Lang) => {
    setLang(l);
    onLangLoaded(l);
    void persist(() => db.saveUserSettings(uid, { lang: l }));
  }, [persist, uid, onLangLoaded]);

  const saveSettings = useCallback((next: UserSettings, nextCatalog: Catalog | null) => {
    const { settings: st, catalog: cat } = ref.current;
    if (next.target !== st.target || next.reorderDays !== st.reorderDays) {
      setSettings(next);
      void persist(() => db.saveUserSettings(uid, next));
    }
    if (nextCatalog && isOwner) {
      setCatalog(nextCatalog);
      void persist(() => db.saveCatalog(nextCatalog, cat));
    }
  }, [persist, uid, isOwner]);

  /** Team member changes wait for the server so errors (duplicate email, last owner) can be shown. */
  const saveMember = useCallback(async (m: Parameters<typeof db.saveMember>[0]): Promise<string | null> => {
    pendingRef.current++;
    setPending((p) => p + 1);
    try {
      await db.saveMember(m);
      if (m.id === me.id) onMeChanged(); // own role or access changed
      await loadOwnerMembers();
      if (tab === 'team') void loadTeam(tm);
      return null;
    } catch (e) {
      const code = db.errCode(e);
      return code === '23505' ? t('email_taken') : code === '23514' ? t('last_owner') : t('save_failed');
    } finally {
      pendingRef.current--;
      setPending((p) => p - 1);
    }
  }, [loadOwnerMembers, loadTeam, tab, tm, me.id, onMeChanged]);

  return {
    uid, me, isOwner,
    loaded, loadErr, reload,
    clients, activities, orders, catalog, settings, members, team,
    tab, setTab, clientId, setClientId, sheet, setSheet, cf, setCf, om, setOm, of, setOf, tm, setTm,
    draft, setDraft, touched, setTouched,
    pending, saveErr, toastMsg, toast,
    putClient, patchClient, deleteClient, addActivity, deleteActivity,
    saveOrder, deleteOrder, setPaid, changeLang, saveSettings, saveMember,
  };
}

export type Crm = ReturnType<typeof useCrmState>;
const Ctx = createContext<Crm | null>(null);

export function CrmProvider({ uid, me, onLangLoaded, onMeChanged, children }: {
  uid: string; me: Member; onLangLoaded: (l: Lang) => void; onMeChanged: () => void; children: ReactNode;
}) {
  const crm = useCrmState(uid, me, onLangLoaded, onMeChanged);
  return <Ctx.Provider value={crm}>{children}</Ctx.Provider>;
}

export function useCrm(): Crm {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCrm outside CrmProvider');
  return c;
}

/** Arrays derived from the maps, memoised. */
export function useLists() {
  const { clients, orders } = useCrm();
  return useMemo(() => ({ clientsArr: Object.values(clients), ordersArr: Object.values(orders) }), [clients, orders]);
}
