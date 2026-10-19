// "Find business": searches Google Places through our Vercel functions (the API
// key stays on the server) and hands the chosen place to the client form.
import { useEffect, useRef, useState } from 'react';
import { getLang, t } from '../i18n';
import { supabase } from '../lib/supabase';
import type { PlaceDetails, PlaceSuggestion } from '../lib/types';
import { uuid } from '../store';
import { Icon } from '../components/Icon';

async function callApi<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await fetch(path + '?' + new URLSearchParams(params), { headers: { Authorization: 'Bearer ' + (token ?? '') }, signal });
  if (!res.ok) throw new Error('places ' + res.status);
  return (await res.json()) as T;
}

type Status = 'idle' | 'loading' | 'none' | 'failed';

export function FindBusiness({ onPick }: { onPick: (p: PlaceDetails) => void }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<PlaceSuggestion[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  // One session token covers the typing and the final pick (billed as one session).
  const session = useRef(uuid());
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    abort.current?.abort();
    if (query.length < 3) { setList([]); setStatus('idle'); return; }
    const ctrl = new AbortController();
    abort.current = ctrl;
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const r = await callApi<{ suggestions: PlaceSuggestion[] }>('/api/places/autocomplete', { q: query, session: session.current, lang: getLang() }, ctrl.signal);
        setList(r.suggestions);
        setStatus(r.suggestions.length ? 'idle' : 'none');
      } catch (e) {
        if (!ctrl.signal.aborted) { setList([]); setStatus('failed'); console.error(e); }
      }
    }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [q]);

  const pick = async (s: PlaceSuggestion) => {
    setStatus('loading');
    try {
      const d = await callApi<PlaceDetails>('/api/places/details', { id: s.placeId, session: session.current, lang: getLang() });
      session.current = uuid();
      setQ('');
      setList([]);
      setStatus('idle');
      onPick(d);
    } catch (e) {
      console.error(e);
      setStatus('failed');
    }
  };

  return (
    <div className="field find">
      <span className="lbl">{t('find_business')}</span>
      <div className="search">
        <Icon name="search" />
        <input id="cf-find" type="search" value={q} placeholder={t('find_ph')} aria-label={t('find_business')} autoComplete="off" onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length ? (
        <div className="card find-list" role="listbox" aria-label={t('find_business')}>
          {list.map((s) => (
            <div className="row" key={s.placeId}>
              <button className="row-main tap" role="option" aria-selected={false} onClick={() => void pick(s)}>
                <span className="avatar"><Icon name="pin" /></span>
                <span className="rt"><b>{s.main}</b>{s.secondary ? <span>{s.secondary}</span> : null}</span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {status === 'loading' ? <p className="note" aria-live="polite">…</p> : null}
      {status === 'none' ? <p className="note">{t('find_none')}</p> : null}
      {status === 'failed' ? <p className="note" style={{ color: 'var(--bad)' }}>{t('find_failed')}</p> : null}
    </div>
  );
}
