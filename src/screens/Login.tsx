import { useState } from 'react';
import { getLang, t, type Lang } from '../i18n';
import { supabase } from '../lib/supabase';
import { Chip, Header } from '../components/ui';

export function LangChips({ onLang }: { onLang: (l: Lang) => void }) {
  return (
    <div className="chips" style={{ marginTop: 20 }}>
      {([['hu', 'Magyar'], ['en', 'English']] as [Lang, string][]).map(([l, label]) => (
        <Chip key={l} pressed={getLang() === l} onClick={() => onLang(l)}>{label}</Chip>
      ))}
    </div>
  );
}

/** Email + 6-digit code sign-in (the email also has a link that does the same). */
export function Login({ onLang }: { onLang: (l: Lang) => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const addr = email.trim().toLowerCase();

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(addr)) return;
    setBusy(true);
    setErr('');
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) {
      // The "before user created" hook answers 403 for emails not on the team list.
      setErr(error.status === 403 || /team list/i.test(error.message) ? t('not_on_team') : t('send_failed'));
      return;
    }
    setCode('');
    setStep('code');
  };

  const verify = async () => {
    setBusy(true);
    setErr('');
    const { error } = await supabase.auth.verifyOtp({ email: addr, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr(t('code_wrong'));
  };

  return (
    <main id="main">
      <Header title={t('login_title')} status={false} />
      <div className="gate">
        {step === 'email' ? (
          <form onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <p style={{ marginBottom: 16 }}>{t('login_body')}</p>
            <label className="field">
              <span className="lbl">{t('email')}</span>
              <input id="login-email" className="input" type="email" inputMode="email" autoComplete="email" autoFocus required
                value={email} placeholder={t('login_email_ph')} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button className="btn btn-ink tap" type="submit" disabled={busy || !/^\S+@\S+\.\S+$/.test(addr)}>{t(busy ? 'sending' : 'send_code')}</button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void verify(); }}>
            <p style={{ marginBottom: 16 }}>{t('code_sent', { e: addr })}</p>
            <label className="field">
              <span className="lbl">{t('code_label')}</span>
              <input id="login-code" className="input num" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={10}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ fontSize: 24, letterSpacing: 6 }} />
            </label>
            <button className="btn btn-ink tap" type="submit" disabled={busy || code.length < 6}>{t(busy ? 'verifying' : 'verify')}</button>
            <div className="grid2" style={{ marginTop: 10 }}>
              <button className="btn btn-plain tap" type="button" disabled={busy} onClick={() => { setStep('email'); setErr(''); }}>{t('other_email')}</button>
              <button className="btn btn-plain tap" type="button" disabled={busy} onClick={() => void send()}>{t('resend')}</button>
            </div>
          </form>
        )}
        {err ? <p className="login-err" role="alert">{err}</p> : null}
      </div>
      <LangChips onLang={onLang} />
    </main>
  );
}
