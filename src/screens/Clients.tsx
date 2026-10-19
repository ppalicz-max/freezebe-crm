import { t } from '../i18n';
import { byName, relDay, todayISO } from '../lib/format';
import { STAGES, TYPES } from '../lib/types';
import { useCrm, useLists } from '../store';
import { Icon } from '../components/Icon';
import { Chip, ClientRow, Header, StageBadge, stageLabel, typeLabel } from '../components/ui';

export function Clients() {
  const { cf, setCf, setSheet } = useCrm();
  const { clientsArr: all } = useLists();
  const buying = all.filter((c) => c.stage === 'customer').length;
  const q = cf.q.trim().toLowerCase();
  const list = all
    .filter((c) => cf.type === 'All' || c.type === cf.type)
    .filter((c) => cf.stage === 'all' || c.stage === cf.stage)
    .filter((c) => !q || [c.name, c.city, c.contact, c.phone].filter(Boolean).join(' ').toLowerCase().includes(q))
    .sort(byName);
  const today = todayISO();

  return (
    <>
      <Header
        title={t('nav_clients')}
        sub={all.length ? t('clients_sub', { n: all.length, b: buying }) : t('no_clients_yet')}
        right={<button className="pill pill-ink tap" onClick={() => setSheet({ kind: 'client' })}><Icon name="plus" />{t('add_client')}</button>}
      />
      <div className="search">
        <Icon name="search" />
        <input id="q" type="search" value={cf.q} placeholder={t('search_ph')} aria-label={t('search_ph')} autoComplete="off"
          onChange={(e) => setCf({ ...cf, q: e.target.value })} />
      </div>
      <div className="chips scroll" style={{ marginTop: 12 }}>
        {(['All', ...TYPES] as string[]).map((ty) => (
          <Chip key={ty} pressed={cf.type === ty} onClick={() => setCf({ ...cf, type: ty })}>{ty === 'All' ? t('all_types') : typeLabel(ty)}</Chip>
        ))}
      </div>
      <div className="chips scroll" style={{ marginTop: 8 }}>
        {(['all', ...STAGES] as string[]).map((s) => (
          <Chip key={s} pressed={cf.stage === s} onClick={() => setCf({ ...cf, stage: s })} color={s !== 'all' ? `var(--st-${s})` : undefined}>
            {s === 'all' ? t('all_stages') : stageLabel(s)}
          </Chip>
        ))}
      </div>
      <div id="clist" style={{ marginTop: 16 }}>
        {!list.length ? (
          <div className="empty">{t(all.length ? 'clients_nomatch' : 'clients_empty')}</div>
        ) : (
          <div className="card">
            {list.map((c) => {
              const due = Boolean(c.nextFollowUp && c.nextFollowUp <= today && c.stage !== 'lost');
              const sub = due ? t('followup_prefix', { r: relDay(c.nextFollowUp) }) : [c.city, c.contact].filter(Boolean).join(', ') || typeLabel(c.type);
              return <ClientRow key={c.id} c={c} sub={sub} subCls={due ? 'late' : ''} right={<StageBadge stage={c.stage} />} />;
            })}
          </div>
        )}
      </div>
    </>
  );
}
