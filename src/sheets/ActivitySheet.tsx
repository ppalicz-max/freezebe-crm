import { useState } from 'react';
import { t, type StrKey } from '../i18n';
import { addDays, todayISO } from '../lib/format';
import { ACTS, type ActivityType } from '../lib/types';
import { useCrm } from '../store';
import { Chip } from '../components/ui';
import { Sheet } from './Sheet';

export function ActivitySheet({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { clients, addActivity } = useCrm();
  const c = clients[clientId];
  const today = todayISO();
  const [type, setType] = useState<ActivityType>('call');
  const [date, setDate] = useState(today);
  const [text, setText] = useState('');
  const [follow, setFollow] = useState(c && c.nextFollowUp && c.nextFollowUp > today ? c.nextFollowUp : '');
  const quick: [StrKey, string][] = [['no_followup', ''], ['tomorrow', addDays(today, 1)], ['in3', addDays(today, 3)], ['next_week', addDays(today, 7)], ['in2w', addDays(today, 14)]];

  const save = () => {
    if (c) addActivity(c.id, { type, date: date || todayISO(), text }, follow);
    onClose();
  };

  return (
    <Sheet title={t('log_activity')} onClose={onClose} foot={<button className="btn btn-ink tap" onClick={save}>{t('log_activity')}</button>}>
      <p style={{ margin: '0 0 14px', fontWeight: 600 }}>{c ? c.name : ''}</p>
      <div className="field">
        <span className="lbl">{t('what_happened')}</span>
        <div className="chips">{ACTS.map((a) => <Chip key={a} pressed={type === a} onClick={() => setType(a)}>{t(('act_' + a) as StrKey)}</Chip>)}</div>
      </div>
      <label className="field">
        <span className="lbl">{t('date')}</span>
        <input id="a-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field">
        <span className="lbl">{t('notes')}</span>
        <textarea id="a-text" className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="field">
        <span className="lbl">{t('next_followup')}</span>
        <div className="chips">{quick.map(([k, v]) => <Chip key={k} pressed={follow === v} onClick={() => setFollow(v)}>{t(k)}</Chip>)}</div>
      </div>
      <label className="field">
        <span className="lbl">{t('pick_date')}</span>
        <input id="a-follow" className="input" type="date" value={follow} onChange={(e) => setFollow(e.target.value)} />
      </label>
    </Sheet>
  );
}
