import { useMemo, useState } from 'react';
import { t } from '../i18n';
import { linesTotals, orderLines, orderProducts } from '../lib/commission';
import { byName, money, nf, todayISO } from '../lib/format';
import { useCrm, useLists } from '../store';
import { Icon } from '../components/Icon';
import { ConfirmButton } from '../components/ui';
import { Sheet } from './Sheet';

export function OrderSheet({ id, clientId, onClose }: { id?: string; clientId?: string; onClose: () => void }) {
  const { orders, catalog, saveOrder, deleteOrder, setSheet } = useCrm();
  const { clientsArr } = useLists();
  const old = id ? orders[id] : undefined;
  const [cid, setCid] = useState(old?.clientId ?? clientId ?? '');
  const [date, setDate] = useState(old?.date ?? todayISO());
  const [note, setNote] = useState(old?.note ?? '');
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const q: Record<string, number> = {};
    old?.lines.forEach((l) => { if (l.productId) q[l.productId] = l.qty; });
    return q;
  });
  // Keep the lines the order was opened with, so their saved prices stay put.
  const [oldLines] = useState(() => old?.lines ?? []);
  const products = useMemo(() => orderProducts(catalog.products, oldLines), [catalog.products, oldLines]);
  const clients = clientsArr.slice().sort(byName);
  const tt = linesTotals(orderLines(products, qty));
  const ok = Boolean(cid && date && tt.qty > 0);
  const setOne = (p: string, v: number) => setQty((q) => ({ ...q, [p]: Math.max(0, Math.min(99999, v)) }));

  const title = t(old ? 'edit_order' : 'log_order');
  if (!clients.length) {
    return (
      <Sheet title={title} onClose={onClose}>
        <div className="empty">{t('order_needs_client')}</div>
        <button className="btn btn-ink tap" style={{ marginTop: 12 }} onClick={() => setSheet({ kind: 'client' })}><Icon name="plus" />{t('add_client')}</button>
      </Sheet>
    );
  }

  const foot = (
    <div className="ofoot" id="ofoot">
      <div className="sum">
        <b>+{money(tt.commission)}</b>
        <span>{t('foot_line', { n: nf(tt.qty), net: money(tt.net), gross: money(tt.net * (1 + catalog.vat / 100)) })}</span>
      </div>
      <button className="btn btn-ink tap" disabled={!ok}
        onClick={() => { saveOrder({ id: old?.id, clientId: cid, date, note, qty }); onClose(); }}>
        {t('save_order')}
      </button>
    </div>
  );

  return (
    <Sheet title={title} onClose={onClose} foot={foot}>
      <label className="field">
        <span className="lbl">{t('client')}</span>
        <select id="o-client" className="sel" value={cid} onChange={(e) => setCid(e.target.value)}>
          <option value="">{t('choose_client')}</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name + (c.city ? ', ' + c.city : '')}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="lbl">{t('date')}</span>
        <input id="o-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="field">
        {products.map((p) => (
          <div className="prow" key={p.id}>
            <div className="rt"><b>{p.name}</b><span>{t('unit_line', { p: money(p.price), c: money(p.commission) })}</span></div>
            <div className="step">
              <button className="tap" aria-label={t('less', { n: p.name })} onClick={() => setOne(p.id, (qty[p.id] || 0) - 1)}><Icon name="minus" /></button>
              <input className={qty[p.id] ? 'on' : ''} inputMode="numeric" value={qty[p.id] || ''} placeholder="0" aria-label={p.name}
                onChange={(e) => setOne(p.id, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} />
              <button className="tap" aria-label={t('more', { n: p.name })} onClick={() => setOne(p.id, (qty[p.id] || 0) + 1)}><Icon name="plus" /></button>
            </div>
          </div>
        ))}
      </div>
      <label className="field">
        <span className="lbl">{t('note_opt')}</span>
        <input id="o-note" className="input" value={note} placeholder={t('note_ph')} onChange={(e) => setNote(e.target.value)} />
      </label>
      {old ? <ConfirmButton label={t('delete_order')} confirm={t('delete_order_confirm')} onConfirm={() => { deleteOrder(old.id); onClose(); }} /> : null}
    </Sheet>
  );
}
