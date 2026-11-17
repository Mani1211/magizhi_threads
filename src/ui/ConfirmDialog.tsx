import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBodyLock } from './useBodyLock';

interface Props {
  title: string;
  text: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ title, text, confirmLabel, busy = false, onConfirm, onCancel }: Props) {
  useBodyLock();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return createPortal(
    <div className="dialog-wrap" onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-text">
        <h2 id="dlg-title">{title}</h2>
        <p id="dlg-text">{text}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn solid-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
