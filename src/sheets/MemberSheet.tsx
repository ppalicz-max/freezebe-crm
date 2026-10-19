import { useRef, useState } from 'react';
import { t } from '../i18n';
import { telHref } from '../lib/format';
import { TYPES, type Role } from '../lib/types';
import { useCrm } from '../store';
import { Chip, ConfirmButton, CopyButton, typeLabel } from '../components/ui';
import { Sheet } from './Sheet';

export function MemberSheet({ id, onClose }: { id?: string; onClose: () => void }) {
  const { members, saveMember, toast } = useCrm();
  const old = id ? members.find((m) => m.id === id) : undefined;
  const [f, setF] = useState({
    name: old?.name ?? '', email: old?.email ?? '', phone: old?.phone ?? '', position: old?.position ?? '', segment: old?.segment ?? '',
    role: (old?.role ?? 'rep') as Role,
  });
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const submit = async (active: boolean, done?: string) => {
    if (!f.name.trim()) { toast(t('m_name_required')); nameRef.current?.focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) { toast(t('m_email_required')); emailRef.current?.focus(); return; }
    setBusy(true);
    const err = await saveMember({ id: old?.id ?? null, ...f, active });
    setBusy(false);
    if (err) { toast(err); return; }
    if (done) toast(done);
    onClose();
  };

  const field = (key: keyof typeof f, label: string, opts: { id: string; type?: string; ph?: string; list?: string; ref?: React.Ref<HTMLInputElement> }) => (
    <label className="field">
      <span className="lbl">{label}</span>
      <input id={opts.id} ref={opts.ref} className="input" type={opts.type || 'text'} value={f[key]} placeholder={opts.ph} list={opts.list}
        autoComplete="off" onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );

  return (
    <Sheet title={t(old ? 'edit_member' : 'new_member')} onClose={onClose}
      foot={<button className="btn btn-ink tap" disabled={busy} onClick={() => void submit(old ? old.active : true)}>{t(old ? 'save_member' : 'add_member')}</button>}>
      {old && (old.phone || old.email) ? (
        <div className="contact-list" style={{ margin: '0 0 16px' }}>
          {old.phone ? (
            <div className="cline"><span className="val num">{old.phone}</span><CopyButton text={old.phone} /><a className="mini go tap" href={telHref(old.phone)}>{t('call')}</a></div>
          ) : null}
          {old.email ? (
            <div className="cline"><span className="val">{old.email}</span><CopyButton text={old.email} /><a className="mini tap" href={'mailto:' + old.email}>{t('email')}</a></div>
          ) : null}
        </div>
      ) : null}
      {field('name', t('m_name'), { id: 'mf-name', ph: t('m_name_ph'), ref: nameRef })}
      {field('email', t('email'), { id: 'mf-email', type: 'email', ph: t('login_email_ph'), ref: emailRef })}
      {field('phone', t('phone'), { id: 'mf-phone', type: 'tel' })}
      {field('position', t('position'), { id: 'mf-position', ph: t('position_ph') })}
      <label className="field">
        <span className="lbl">{t('segment')}</span>
        <input id="mf-segment" className="input" list="seg-list" value={f.segment} placeholder={t('segment_ph')} onChange={(e) => set({ segment: e.target.value })} />
        <datalist id="seg-list">{TYPES.map((ty) => <option key={ty} value={typeLabel(ty)} />)}</datalist>
      </label>
      <div className="field">
        <span className="lbl">{t('role')}</span>
        <div className="chips">
          <Chip pressed={f.role === 'rep'} onClick={() => set({ role: 'rep' })}>{t('role_rep')}</Chip>
          <Chip pressed={f.role === 'owner'} onClick={() => set({ role: 'owner' })}>{t('role_owner')}</Chip>
        </div>
        <span className="note" style={{ display: 'block', margin: '6px 2px 0' }}>{t('role_hint')}</span>
      </div>
      <div className="field">
        <span className="lbl">{t('m_account')}</span>
        <div className="panel" style={{ padding: '12px 16px' }}>
          {old ? (old.active ? t(old.userId ? 'linked' : 'not_using') : t('removed')) : t('m_not_linked')}
        </div>
        <span className="note" style={{ display: 'block', margin: '6px 2px 0' }}>{t('m_account_hint')}</span>
      </div>
      {old ? (
        old.active ? (
          <ConfirmButton label={t('delete_member')} confirm={t('delete_member_confirm')} onConfirm={() => void submit(false)} />
        ) : (
          <button className="btn btn-line tap" disabled={busy} onClick={() => void submit(true, t('member_restored'))}>{t('restore_member')}</button>
        )
      ) : null}
    </Sheet>
  );
}
