import { t } from '../i18n';
import { lastOrderMap, sumTotals, totalsOf } from '../lib/commission';
import { addDays, daysBetween, loc, money, monthKey, monthName, nf, relDay, todayISO } from '../lib/format';
import { STAGES } from '../lib/types';
import { useCrm, useLists } from '../store';
import { Icon } from '../components/Icon';
import { CallLink, ClientRow, Header, Section, stageLabel, typeLabel } from '../components/ui';

const MIX_OP = [1, 0.72, 0.52, 0.36, 0.24, 0.16, 0.1];

export function Home() {
  const { loaded, settings, catalog, clients: clientMap, setSheet, setCf, setTab } = useCrm();
  const { clientsArr: clients, ordersArr: orders } = useLists();
  const today = todayISO();
  const mk = monthKey(today);
  const mo = orders.filter((o) => monthKey(o.date) === mk);
  const tt = sumTotals(mo);
  const target = settings.target;
  const pct = target > 0 ? Math.min(100, Math.round((tt.commission / target) * 100)) : 0;
  const unpaid = sumTotals(orders.filter((o) => !o.paid)).commission;

  // product mix this month
  const mixMap: Record<string, number> = {};
  const lineName: Record<string, string> = {};
  mo.forEach((o) => o.lines.forEach((l) => {
    const k = l.productId || 'name:' + l.name;
    mixMap[k] = (mixMap[k] || 0) + l.qty;
    lineName[k] = l.name;
  }));
  const mix = catalog.products.filter((p) => p.active || mixMap[p.id]).map((p) => ({ name: p.name, qty: mixMap[p.id] || 0 }));
  Object.keys(mixMap).forEach((k) => { if (!catalog.products.some((p) => p.id === k)) mix.push({ name: lineName[k], qty: mixMap[k] }); });

  const fus = clients
    .filter((c) => c.stage !== 'lost' && c.nextFollowUp && c.nextFollowUp <= addDays(today, 7))
    .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp))
    .slice(0, 10);

  const lo = lastOrderMap(orders);
  const re = clients
    .filter((c) => c.stage === 'customer' && lo[c.id] && daysBetween(lo[c.id], today) >= (settings.reorderDays || 21))
    .map((c) => ({ c, d: daysBetween(lo[c.id], today) }))
    .sort((a, b) => b.d - a.d)
    .slice(0, 8);

  const bc: Record<string, number> = {};
  mo.forEach((o) => { bc[o.clientId] = (bc[o.clientId] || 0) + totalsOf(o).commission; });
  const top = Object.keys(bc).map((id) => ({ c: clientMap[id], v: bc[id] })).filter((x) => x.c).sort((a, b) => b.v - a.v).slice(0, 5);

  const label = t('commission_in', { m: monthName(mk) });
  return (
    <>
      <Header title={t('nav_home')} sub={new Date().toLocaleDateString(loc(), { weekday: 'long', month: 'long', day: 'numeric' })} />
      {!loaded ? (
        <p className="note" style={{ margin: '0 4px 12px' }}>{t('loading')}</p>
      ) : clients.length === 0 ? (
        <div className="start">
          <h2>{t('start_title')}</h2>
          <p>{t('start_body')}</p>
          <button className="btn btn-ink tap" onClick={() => setSheet({ kind: 'client' })}><Icon name="plus" />{t('add_client')}</button>
        </div>
      ) : null}

      <section className="ticket" aria-label={label}>
        <div className="t-top">
          <p className="t-lbl">{label}</p>
          <p className="t-big">{money(tt.commission)}</p>
          {target > 0 ? (
            <>
              <div className="bar"><i style={{ width: pct + '%' }} /></div>
              <div className="bar-txt">
                <span>{t('goal_pct', { p: pct, g: money(target) })}</span>
                <span>{tt.commission >= target ? t('goal_reached') : t('to_go', { v: money(target - tt.commission) })}</span>
              </div>
            </>
          ) : null}
        </div>
        <div className="perf" />
        <div className="t-bot">
          <div className="t-stats">
            <div className="t-stat"><b>{nf(tt.qty)}</b><span>{t('pizzas_sold')}</span></div>
            <div className="t-stat"><b>{money(tt.net)}</b><span>{t('net_sales')}</span></div>
            <div className="t-stat"><b>{money(unpaid)}</b><span>{t('not_paid')}</span></div>
          </div>
          <div className="mix">
            {tt.qty > 0 ? mix.map((p, i) => (p.qty > 0 ? <i key={i} style={{ width: (p.qty / tt.qty) * 100 + '%', opacity: MIX_OP[i % MIX_OP.length] }} /> : null)) : null}
          </div>
          <div className="legend">
            {mix.map((p, i) => (
              <div key={i}><span className="dot" style={{ opacity: MIX_OP[i % MIX_OP.length] }} /><span className="nm">{p.name}</span><b>{nf(p.qty)}</b></div>
            ))}
          </div>
        </div>
      </section>

      <Section title={t('followups')}>
        {fus.length ? (
          <div className="card">
            {fus.map((c) => (
              <ClientRow key={c.id} c={c} sub={relDay(c.nextFollowUp)} subCls={c.nextFollowUp < today ? 'late' : c.nextFollowUp === today ? 'soon' : ''} right={<CallLink c={c} />} />
            ))}
          </div>
        ) : <div className="empty">{t('followups_empty')}</div>}
      </Section>

      {re.length ? (
        <Section title={t('reorder_due')}>
          <div className="card">{re.map((x) => <ClientRow key={x.c.id} c={x.c} sub={t('last_order_ago', { n: x.d })} right={<CallLink c={x.c} />} />)}</div>
        </Section>
      ) : null}

      {top.length ? (
        <Section title={t('best_clients')}>
          <div className="card">
            {top.map((x) => <ClientRow key={x.c.id} c={x.c} sub={x.c.city || typeLabel(x.c.type)} right={<span className="earn">+{money(x.v)}</span>} />)}
          </div>
        </Section>
      ) : null}

      {clients.length ? (
        <Section title={t('pipeline')}>
          <div className="pipe">
            {STAGES.map((s) => (
              <button key={s} className="tap" style={{ '--c': `var(--st-${s})` } as React.CSSProperties}
                onClick={() => { setCf({ q: '', type: 'All', stage: s }); setTab('clients'); window.scrollTo(0, 0); }}>
                <b>{clients.filter((c) => c.stage === s).length}</b><span>{stageLabel(s)}</span>
              </button>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
