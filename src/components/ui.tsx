import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t, type StrKey } from '../i18n';
import { totalsOf } from '../lib/commission';
import { fmtDate, money, nf, telHref } from '../lib/format';
import type { Client, Order, Stage } from '../lib/types';
import { useCrm } from '../store';
import { Icon, TypeIcon } from './Icon';

export const typeLabel = (type: string) => t(('type_' + type) as StrKey);
export const stageLabel = (s: string) => t(('st_' + s) as StrKey);

export function SaveStatus() {
  const { pending, saveErr } = useCrm();
  const err = saveErr && !pending;
  return (
    <span className={'status' + (err ? ' err' : '')}>
      {pending > 0 ? t('saving') : saveErr ? t('not_saved') : <><Icon name="check" />{t('saved')}</>}
    </span>
  );
}

export function Header({ title, sub, right, status = true }: { title: string; sub?: string; right?: ReactNode; status?: boolean }) {
  return (
    <header className="hdr">
      <div className="hdr-txt">
        <div className="brand">FREEZBEE</div>
        <h1>{title}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      <div className="hdr-r">{status ? <SaveStatus /> : null}{right}</div>
    </header>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="sec">
      <div className="sec-h"><h2>{title}</h2>{aside ? <span className="aside">{aside}</span> : null}</div>
      {children}
    </section>
  );
}

export const StageBadge = ({ stage }: { stage: Stage }) => (
  <span className="badge" style={{ '--c': `var(--st-${stage})` } as React.CSSProperties}>{stageLabel(stage)}</span>
);

export function CallLink({ c }: { c: Client }) {
  if (!c.phone) return null;
  return <a className="callbtn tap" href={telHref(c.phone)} aria-label={t('call') + ' ' + c.name}><Icon name="phone" /></a>;
}

export function ClientRow({ c, sub, subCls, right }: { c: Client; sub?: string; subCls?: string; right?: ReactNode }) {
  const { setClientId } = useCrm();
  return (
    <div className="row">
      <button className="row-main tap" onClick={() => { setClientId(c.id); window.scrollTo(0, 0); }}>
        <span className="avatar"><TypeIcon type={c.type} /></span>
        <span className="rt"><b>{c.name}</b>{sub ? <span className={subCls || ''}>{sub}</span> : null}</span>
      </button>
      {right}
    </div>
  );
}

export function OrderRow({ o, showClient }: { o: Order; showClient: boolean }) {
  const { clients, catalog, setSheet, setPaid } = useCrm();
  const tt = totalsOf(o);
  const c = clients[o.clientId];
  const name = (productId: string | null, fallback: string) => catalog.products.find((p) => p.id === productId)?.name ?? fallback;
  const breakdown = o.lines.filter((l) => l.qty > 0).map((l) => l.qty + ' ' + name(l.productId, l.name)).join(', ');
  const title = showClient ? (c ? c.name : '—') : fmtDate(o.date, true);
  const sub1 = showClient ? fmtDate(o.date) + ': ' + breakdown : breakdown;
  return (
    <div className="orow">
      <button className="orow-main tap" onClick={() => setSheet({ kind: 'order', id: o.id })}>
        <b>{title}</b><span>{sub1}</span><span>{t('pieces_net', { n: nf(tt.qty), v: money(tt.net) })}</span>
      </button>
      <div className="orow-r">
        <span className="earn">+{money(tt.commission)}</span>
        <button className={'paid tap ' + (o.paid ? 'yes' : 'no')} aria-pressed={o.paid} onClick={() => setPaid([o.id], !o.paid)}>
          {t(o.paid ? 'paid_out' : 'unpaid')}
        </button>
      </div>
    </div>
  );
}

/** Tap once to arm ("Tap again to…"), tap again within 4 s to run. */
export function ConfirmButton({ label, confirm, onConfirm, className = 'btn btn-danger tap' }: { label: string; confirm: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      className={className + (armed ? ' armed' : '')}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          timer.current = setTimeout(() => setArmed(false), 4000);
          return;
        }
        clearTimeout(timer.current);
        onConfirm();
      }}
    >
      {armed ? confirm : label}
    </button>
  );
}

export function Chip({ pressed, onClick, color, children }: { pressed: boolean; onClick: () => void; color?: string; children: ReactNode }) {
  return (
    <button className="chip tap" aria-pressed={pressed} onClick={onClick} style={color ? ({ '--c': color } as React.CSSProperties) : undefined}>
      {children}
    </button>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const selectSibling = () => {
    const v = ref.current?.parentElement?.querySelector('.val');
    if (!v) return;
    const r = document.createRange();
    r.selectNodeContents(v);
    const s = getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  };
  return (
    <button
      ref={ref}
      className="mini tap"
      onClick={() => {
        try {
          navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }, selectSibling);
        } catch { selectSibling(); }
      }}
    >
      {t(done ? 'copied' : 'copy')}
    </button>
  );
}
