import { useRef, useState } from 'react';
import { t } from '../i18n';
import { STAGES, TYPES, type Client } from '../lib/types';
import { useCrm, uuid } from '../store';
import { Chip, stageLabel, typeLabel } from '../components/ui';
import { Sheet } from './Sheet';

const blank = (): Client => ({
  id: '', name: '', type: 'Restaurant', stage: 'lead', contact: '', phone: '', email: '', address: '', city: '', website: '',
  nextFollowUp: '', notes: '', createdAt: 0,
});

export function ClientSheet({ id, onClose }: { id?: string; onClose: () => void }) {
  const { clients, putClient, setClientId, toast } = useCrm();
  const old = id ? clients[id] : undefined;
  const [f, setF] = useState<Client>(() => (old ? { ...old } : blank()));
  const nameRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Client>) => setF((x) => ({ ...x, ...patch }));

  const save = () => {
    const name = f.name.trim();
    if (!name) { toast(t('name_required')); nameRef.current?.focus(); return; }
    const trimmed = (s: string) => s.trim();
    const body: Client = {
      ...f, name, contact: trimmed(f.contact), phone: trimmed(f.phone), email: trimmed(f.email), address: trimmed(f.address), city: trimmed(f.city),
      website: trimmed(f.website), notes: f.notes.trim(),
      id: old ? old.id : uuid(), createdAt: old ? old.createdAt : Date.now(),
    };
    void putClient(body, !old);
    onClose();
    if (!old) { setClientId(body.id); window.scrollTo(0, 0); }
  };

  const text = (key: keyof Client, label: string, opts: { type?: string; ph?: string; id: string }) => (
    <label className="field">
      <span className="lbl">{label}</span>
      <input id={opts.id} className="input" type={opts.type || 'text'} value={String(f[key] ?? '')} placeholder={opts.ph}
        onChange={(e) => set({ [key]: e.target.value } as Partial<Client>)} />
    </label>
  );

  return (
    <Sheet title={t(old ? 'edit_client' : 'new_client')} onClose={onClose}
      foot={<button className="btn btn-ink tap" onClick={save}>{t(old ? 'save_changes' : 'add_client')}</button>}>
      <label className="field">
        <span className="lbl">{t('biz_name')}</span>
        <input id="cf-name" ref={nameRef} className="input" value={f.name} placeholder={t('biz_ph')} autoComplete="off" onChange={(e) => set({ name: e.target.value })} />
      </label>
      <div className="field">
        <span className="lbl">{t('type')}</span>
        <div className="chips">{TYPES.map((ty) => <Chip key={ty} pressed={f.type === ty} onClick={() => set({ type: ty })}>{typeLabel(ty)}</Chip>)}</div>
      </div>
      {text('contact', t('contact'), { id: 'cf-contact', ph: t('contact_ph') })}
      {text('phone', t('phone'), { id: 'cf-phone', type: 'tel' })}
      {text('email', t('email'), { id: 'cf-email', type: 'email' })}
      {text('address', t('address'), { id: 'cf-address' })}
      {text('city', t('city'), { id: 'cf-city' })}
      {text('website', t('website'), { id: 'cf-website', type: 'url', ph: 'https://' })}
      <div className="field">
        <span className="lbl">{t('stage')}</span>
        <div className="chips">
          {STAGES.map((s) => <Chip key={s} pressed={f.stage === s} color={`var(--st-${s})`} onClick={() => set({ stage: s })}>{stageLabel(s)}</Chip>)}
        </div>
      </div>
      {text('nextFollowUp', t('next_followup'), { id: 'cf-fu', type: 'date' })}
      <label className="field">
        <span className="lbl">{t('notes')}</span>
        <textarea id="cf-notes" className="input" rows={3} placeholder={t('notes_ph')} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
    </Sheet>
  );
}
