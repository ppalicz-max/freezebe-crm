import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getLang, setLang, t, type Lang } from './i18n';
import * as db from './lib/db';
import { configured, supabase } from './lib/supabase';
import type { Member } from './lib/types';
import { CrmProvider, useCrm, type Sheet, type Tab } from './store';
import { Icon } from './components/Icon';
import { Header } from './components/ui';
import { ClientDetail } from './screens/ClientDetail';
import { Clients } from './screens/Clients';
import { Home } from './screens/Home';
import { LangChips, Login } from './screens/Login';
import { Orders } from './screens/Orders';
import { Settings } from './screens/Settings';
import { Team } from './screens/Team';
import { ActivitySheet } from './sheets/ActivitySheet';
import { ClientSheet } from './sheets/ClientSheet';
import { MemberSheet } from './sheets/MemberSheet';
import { OrderSheet } from './sheets/OrderSheet';

function Gate({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <main id="main">
      <Header title="Freezbee" status={false} />
      <div className="gate"><h2>{title}</h2><p>{body}</p>{children}</div>
    </main>
  );
}

function SheetHost() {
  const { sheet, setSheet } = useCrm();
  if (!sheet) return null;
  const close = () => setSheet(null);
  const key = JSON.stringify(sheet);
  const s: Sheet = sheet;
  switch (s.kind) {
    case 'client': return <ClientSheet key={key} id={s.id} onClose={close} />;
    case 'order': return <OrderSheet key={key} id={s.id} clientId={s.clientId} onClose={close} />;
    case 'activity': return <ActivitySheet key={key} clientId={s.clientId} onClose={close} />;
    case 'member': return <MemberSheet key={key} id={s.id} onClose={close} />;
  }
}

function Shell({ email }: { email: string }) {
  const crm = useCrm();
  const { tab, setTab, clientId, setClientId, isOwner, loaded, loadErr, reload } = crm;
  const client = clientId ? crm.clients[clientId] : undefined;

  useEffect(() => { if (clientId && !client && loaded) setClientId(null); }, [clientId, client, loaded, setClientId]);
  useEffect(() => { if (tab === 'team' && !isOwner) setTab('home'); }, [tab, isOwner, setTab]);

  const view = client ? <ClientDetail c={client} />
    : tab === 'clients' ? <Clients />
    : tab === 'orders' ? <Orders />
    : tab === 'team' && isOwner ? <Team />
    : tab === 'settings' ? <Settings email={email} />
    : <Home />;

  const items: [Tab, string][] = [['home', 'home'], ['clients', 'users'], ['orders', 'orders']];
  if (isOwner) items.push(['team', 'team']);
  items.push(['settings', 'settings']);
  const current = clientId ? 'clients' : tab;
  const showFab = loaded && !clientId && (tab === 'home' || tab === 'clients' || tab === 'orders');

  return (
    <>
      <main id="main">
        {loadErr ? (
          <div className="banner"><b>{t('load_failed')}</b><button className="mini-btn tap" onClick={() => void reload()}>{t('retry')}</button></div>
        ) : null}
        {view}
      </main>
      <div id="fab">
        {showFab ? <button className="fab tap" onClick={() => crm.setSheet({ kind: 'order' })}><Icon name="plus" />{t('log_order')}</button> : null}
      </div>
      <nav id="nav" aria-label="Sections">
        <div className="nav-in">
          {items.map(([k, icon]) => (
            <button key={k} className="tap" aria-current={current === k ? 'page' : undefined}
              onClick={() => { setClientId(null); setTab(k); window.scrollTo(0, 0); }}>
              <Icon name={icon} /><span>{t(('nav_' + k) as 'nav_home')}</span><i />
            </button>
          ))}
        </div>
      </nav>
      <SheetHost />
      <div id="toast" role="status" hidden={!crm.toastMsg}>{crm.toastMsg}</div>
    </>
  );
}

export function App() {
  const [, setLangState] = useState<Lang>(getLang());
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [me, setMe] = useState<Member | null | undefined>(undefined);
  const [meErr, setMeErr] = useState(false);
  const uid = session?.user.id;

  const onLang = useCallback((l: Lang) => { setLang(l); setLangState(l); }, []);
  useEffect(() => { document.documentElement.lang = getLang(); }, []);

  useEffect(() => {
    if (!configured) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const loadMe = useCallback(async () => {
    if (!uid) return;
    try {
      setMe(await db.loadMe(uid));
      setMeErr(false);
    } catch (e) {
      console.error(e);
      setMeErr(true);
    }
  }, [uid]);
  useEffect(() => { setMe(undefined); void loadMe(); }, [loadMe]);

  if (!configured) {
    return <Gate title="Setup needed" body="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example and README)." />;
  }
  if (session === undefined) return <main id="main" />;
  if (!session) return <Login onLang={onLang} />;
  if (meErr) {
    return <Gate title={t('nav_home')} body={t('load_failed')}><button className="btn btn-ink tap" style={{ marginTop: 16 }} onClick={() => void loadMe()}>{t('retry')}</button></Gate>;
  }
  if (me === undefined) return <main id="main"><Header title={t('nav_home')} status={false} /><p className="note">{t('loading')}</p></main>;
  if (!me || !me.active) {
    return (
      <>
        <Gate title={t('noaccess_title')} body={t('noaccess_body', { e: session.user.email ?? '' })}>
          <button className="btn btn-ink tap" style={{ marginTop: 16 }} onClick={() => void supabase.auth.signOut()}>{t('sign_out')}</button>
          <LangChips onLang={onLang} />
        </Gate>
      </>
    );
  }
  return (
    <CrmProvider key={uid} uid={uid!} me={me} onLangLoaded={onLang} onMeChanged={loadMe}>
      <Shell email={session.user.email ?? ''} />
    </CrmProvider>
  );
}
