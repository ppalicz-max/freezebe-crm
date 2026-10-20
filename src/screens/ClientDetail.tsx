import { t, type StrKey } from '../i18n';
import { sumTotals } from '../lib/commission';
import { addDays, fmtDate, money, nf, relDay, safeUrl, telHref, todayISO } from '../lib/format';
import { STAGES, type Client } from '../lib/types';
import { useCrm, useLists } from '../store';
import { Icon, TypeIcon } from '../components/Icon';
import { Chip, ConfirmButton, CopyButton, OrderRow, SaveStatus, Section, stageLabel, typeLabel } from '../components/ui';

const mapsHref = (place: string) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place);

export function ClientDetail({ c }: { c: Client }) {
  const { activities, setClientId, setSheet, patchClient, deleteActivity, deleteClient } = useCrm();
  const { ordersArr } = useLists();
  const today = todayISO();
  const orders = ordersArr.filter((o) => o.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const tt = sumTotals(orders);
  const place = [c.address, c.city].filter(Boolean).join(', ');
  const web = safeUrl(c.website);
  const back = () => { setClientId(null); window.scrollTo(0, 0); };
  const fu = c.nextFollowUp;
  const late = Boolean(fu && fu < today);
  const acts = activities.filter((a) => a.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  return (
    <>
      <div className="back-row">
        <button className="back tap" onClick={back}><Icon name="left" />{t('back')}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SaveStatus />
          <button className="pill tap" onClick={() => setSheet({ kind: 'client', id: c.id })}><Icon name="pencil" />{t('edit')}</button>
        </div>
      </div>
      <div className="cd-meta"><TypeIcon type={c.type} /><span>{[typeLabel(c.type), c.city].filter(Boolean).join(', ')}</span></div>
      <h1 className="cd-name">{c.name}</h1>
      {c.contact ? <div className="cd-contact">{c.contact}</div> : null}

      {c.phone || c.email || place || web ? (
        <div className="contact-list">
          {c.phone ? (
            <div className="cline"><span className="val num">{c.phone}</span><CopyButton text={c.phone} /><a className="mini go tap" href={telHref(c.phone)}>{t('call')}</a></div>
          ) : null}
          {c.email ? (
            <div className="cline"><span className="val">{c.email}</span><CopyButton text={c.email} /><a className="mini tap" href={'mailto:' + c.email}>{t('email')}</a></div>
          ) : null}
          {place ? (
            <div className="cline">
              <span className="val">{place}</span>
              <a className="mini tap" target="_blank" rel="noopener noreferrer" href={mapsHref(place)}>{t('directions')}</a>
            </div>
          ) : null}
          {web ? (
            <div className="cline">
              <span className="val">{c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              <a className="mini tap" target="_blank" rel="noopener noreferrer" href={web}>{t('website')}</a>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 18 }} className="stats3">
        <div><b>{nf(tt.qty)}</b><span>{t('pieces_bought')}</span></div>
        <div><b>{money(tt.net)}</b><span>{t('net_sales')}</span></div>
        <div><b className="acc">{money(tt.commission)}</b><span>{t('your_commission')}</span></div>
      </div>
      <div className="grid2" style={{ marginTop: 10 }}>
        <button className="btn btn-ink tap" onClick={() => setSheet({ kind: 'order', clientId: c.id })}><Icon name="plus" />{t('log_order')}</button>
        <button className="btn btn-plain tap" onClick={() => setSheet({ kind: 'activity', clientId: c.id })}><Icon name="plus" />{t('log_activity')}</button>
      </div>

      <Section title={t('stage')}>
        <div className="chips scroll">
          {STAGES.map((s) => (
            <Chip key={s} pressed={c.stage === s} color={`var(--st-${s})`} onClick={() => patchClient(c.id, { stage: s })}>{stageLabel(s)}</Chip>
          ))}
        </div>
      </Section>

      <Section title={t('next_followup')}>
        <div className="fu">
          <div className="fu-top">
            <Icon name="cal" />
            <div className="rt">
              <b>{fu ? fmtDate(fu, true) : t('not_set')}</b>
              {fu ? <span className={late ? 'late' : ''}>{relDay(fu)}</span> : null}
            </div>
            {fu ? <button className="mini-btn tap" onClick={() => patchClient(c.id, { nextFollowUp: '' })}>{t('clear')}</button> : null}
          </div>
          <div className="chips" style={{ marginTop: 12 }}>
            {([['tomorrow', 1], ['in3', 3], ['next_week', 7], ['in2w', 14]] as [StrKey, number][]).map(([k, d]) => (
              <button key={k} className="chip tap" onClick={() => patchClient(c.id, { nextFollowUp: addDays(todayISO(), d) })}>{t(k)}</button>
            ))}
          </div>
          <input id="fu-date" className="input" type="date" style={{ marginTop: 12 }} value={fu || ''} aria-label={t('pick_date')}
            onChange={(e) => patchClient(c.id, { nextFollowUp: e.target.value || '' })} />
        </div>
      </Section>

      <Section title={t('orders')} aside={orders.length ? t('last_on', { d: fmtDate(orders[0].date) }) : undefined}>
        {orders.length ? (
          <div className="card">{orders.map((o) => <OrderRow key={o.id} o={o} showClient={false} />)}</div>
        ) : <div className="empty">{t('orders_empty_client', { n: c.name })}</div>}
      </Section>

      <Section title={t('activity')}>
        {acts.length ? (
          <div className="card">
            {acts.map((a) => (
              <div className="act" key={a.id}>
                <div className="rt">
                  <b>{t(('act_' + a.type) as StrKey)} <span style={{ display: 'inline', color: 'var(--soft)', fontWeight: 400, fontSize: 14 }}>{fmtDate(a.date)}</span></b>
                  {a.text ? <div className="txt">{a.text}</div> : null}
                </div>
                <button className="x tap" aria-label={t('clear')} onClick={() => deleteActivity(a.id)}><Icon name="x" /></button>
              </div>
            ))}
          </div>
        ) : <div className="empty">{t('activity_empty')}</div>}
      </Section>

      {c.notes ? (
        <Section title={t('notes')}><div className="panel" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.notes}</div></Section>
      ) : null}

      <div className="sec">
        <ConfirmButton label={t('delete_client')} confirm={t('delete_client_confirm')} onConfirm={() => { back(); deleteClient(c.id); }} />
      </div>
    </>
  );
}
