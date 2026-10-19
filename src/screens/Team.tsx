import { t } from '../i18n';
import { loc, money, nf } from '../lib/format';
import { useCrm } from '../store';
import { Icon } from '../components/Icon';
import { Header, Section } from '../components/ui';
import { MonthNav } from './Orders';

function Members() {
  const { members, setSheet } = useCrm();
  const list = members.slice().sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, loc()));
  return (
    <Section title={t('members')}>
      {!list.length ? <div className="empty">{t('members_empty')}</div> : (
        <div className="card">
          {list.map((m) => {
            const sub = [m.role === 'owner' ? t('role_owner') : '', m.position, m.segment].filter(Boolean).join(', ')
              || [m.email, m.phone].filter(Boolean).join(', ');
            const [label, color] = !m.active ? [t('removed'), 'var(--bad)'] : m.userId ? [t('linked'), 'var(--good)'] : [t('not_using'), 'var(--st-lost)'];
            return (
              <div className="row" key={m.id}>
                <button className="row-main tap" onClick={() => setSheet({ kind: 'member', id: m.id })}>
                  <span className="avatar"><Icon name="users" /></span>
                  <span className="rt"><b>{m.name}</b>{sub ? <span>{sub}</span> : null}</span>
                </button>
                <span className="badge" style={{ '--c': color } as React.CSSProperties}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
      <button className="btn btn-ink tap" style={{ marginTop: 10 }} onClick={() => setSheet({ kind: 'member' })}><Icon name="plus" />{t('add_member')}</button>
      <p className="note">{t('members_note')}</p>
    </Section>
  );
}

export function Team() {
  const { tm, setTm, team, uid } = useCrm();
  const rows = (team && team.month === tm ? team.rows : [])
    .slice()
    .sort((a, b) => b.commission - a.commission || a.name.localeCompare(b.name, loc()));
  const tot = rows.reduce((a, r) => ({ clients: a.clients + r.clients, qty: a.qty + r.qty, net: a.net + r.net, com: a.com + r.commission, up: a.up + r.unpaid }),
    { clients: 0, qty: 0, net: 0, com: 0, up: 0 });
  const loading = !team || team.month !== tm;

  return (
    <>
      <Header title={t('nav_team')} sub={t('team_sub')} />
      <MonthNav value={tm} onChange={setTm} />
      {loading ? null : !rows.length ? (
        <div className="empty" style={{ marginTop: 12 }}>{t('team_empty')}</div>
      ) : (
        <div className="team-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>{t('rep')}</th><th>{t('clients_lbl')}</th><th>{t('pizzas_sold')}</th><th>{t('net_sales')}</th><th>{t('commission')}</th><th>{t('not_paid')}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.memberId}>
                  <td>{r.name}{r.repId === uid ? <> <span className="me">{t('you')}</span></> : null}{!r.active ? <> <span className="me">({t('removed')})</span></> : null}</td>
                  <td>{nf(r.clients)}</td><td>{nf(r.qty)}</td><td>{money(r.net)}</td><td className="acc">{money(r.commission)}</td><td>{money(r.unpaid)}</td>
                </tr>
              ))}
              <tr className="tot">
                <td>{t('total')}</td><td>{nf(tot.clients)}</td><td>{nf(tot.qty)}</td><td>{money(tot.net)}</td><td className="acc">{money(tot.com)}</td><td>{money(tot.up)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <Members />
    </>
  );
}
