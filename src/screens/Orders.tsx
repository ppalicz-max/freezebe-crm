import { t, type StrKey } from '../i18n';
import { clientsCsv, downloadCsv, ordersCsv } from '../lib/csv';
import { sumTotals } from '../lib/commission';
import { monthKey, monthLabel, money, nf, shiftMonth } from '../lib/format';
import { useCrm, useLists, type Crm } from '../store';
import { Icon } from '../components/Icon';
import { Chip, Header, OrderRow } from '../components/ui';

export function ExportButtons({ className = 'grid2' }: { className?: string }) {
  const crm = useCrm();
  const { clientsArr, ordersArr } = useLists();
  const run = (kind: 'orders' | 'clients') => {
    try {
      downloadCsv(kind, kind === 'orders' ? ordersCsv(ordersArr, crm.clients, crm.catalog.products) : clientsCsv(clientsArr, ordersArr));
      crm.toast(t('exported'));
    } catch (e) {
      console.error(e);
      crm.toast(t('export_failed'));
    }
  };
  return (
    <div className={className}>
      <button className="btn btn-plain tap" onClick={() => run('orders')}><Icon name="download" />{t('export_orders')}</button>
      <button className="btn btn-plain tap" onClick={() => run('clients')}><Icon name="download" />{t('export_clients')}</button>
    </div>
  );
}

export function MonthNav({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="monthnav">
      <button className="tap" aria-label="‹" onClick={() => onChange(shiftMonth(value, -1))}><Icon name="left" /></button>
      <span>{monthLabel(value)}</span>
      <button className="tap" aria-label="›" onClick={() => onChange(shiftMonth(value, 1))}><Icon name="right" /></button>
    </div>
  );
}

export function Orders() {
  const { om, setOm, of, setOf, setPaid } = useCrm();
  const { ordersArr } = useLists();
  const mo = ordersArr.filter((o) => monthKey(o.date) === om).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const shown = mo.filter((o) => (of === 'all' ? true : of === 'unpaid' ? !o.paid : o.paid));
  const tt = sumTotals(mo);
  const up = mo.filter((o) => !o.paid);
  const upv = sumTotals(up).commission;

  return (
    <>
      <Header title={t('nav_orders')} sub={t('orders_sub')} />
      <MonthNav value={om} onChange={setOm} />
      <div className="tiles">
        <div className="tile"><b className="acc">{money(tt.commission)}</b><span>{t('commission')}</span></div>
        <div className="tile"><b className={upv > 0 ? 'warn' : ''}>{money(upv)}</b><span>{t('not_paid')}</span></div>
        <div className="tile"><b>{nf(tt.qty)}</b><span>{t('pizzas_sold')}</span></div>
        <div className="tile"><b>{money(tt.net)}</b><span>{t('net_sales')}</span></div>
      </div>
      {up.length ? (
        <button className="btn btn-line tap" style={{ marginTop: 10, color: 'var(--good)' }} onClick={() => setPaid(up.map((o) => o.id), true)}>
          <Icon name="check" />{t('mark_all_paid', { n: up.length })}
        </button>
      ) : null}
      <div className="chips" style={{ marginTop: 20 }}>
        {([['all', 'all'], ['unpaid', 'unpaid'], ['paid', 'paid_out']] as [Crm['of'], StrKey][]).map(([v, k]) => (
          <Chip key={v} pressed={of === v} onClick={() => setOf(v)}>{t(k)}</Chip>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        {!shown.length ? (
          <div className="empty">{mo.length ? t('orders_nomatch') : t('orders_empty_month', { m: monthLabel(om) })}</div>
        ) : (
          <>
            <div className="card">{shown.map((o) => <OrderRow key={o.id} o={o} showClient />)}</div>
            <p className="note">{t('paid_hint')}</p>
          </>
        )}
      </div>
      <ExportButtons className="grid2 sec" />
    </>
  );
}
