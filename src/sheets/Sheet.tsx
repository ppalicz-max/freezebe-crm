import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n';
import { Icon } from '../components/Icon';

/** Bottom sheet with the original markup: overlay > sheet > header / body / footer. */
export function Sheet({ title, onClose, children, foot }: { title: string; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sh-h">
          <h2>{title}</h2>
          <button className="sh-x tap" aria-label={t('close')} onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="sh-b">{children}</div>
        {foot ? <div className="sh-f">{foot}</div> : null}
      </div>
    </div>
  );
}
