import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';
import { useBodyLock } from './useBodyLock';

interface Props {
  title: string;
  subtitle?: string;
  formId: string;
  submitLabel: string;
  busy: boolean;
  busyLabel: string;
  onSubmit(): void;
  onClose(): void;
  children: ReactNode;
}

/** A form that slides in from the right (full screen on phones). */
export function Sheet({ title, subtitle, formId, submitLabel, busy, busyLabel, onSubmit, onClose, children }: Props) {
  useBodyLock();
  return createPortal(
    <div className="overlay">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={`${formId}-title`}>
        <header className="sheet-head">
          <div className="sheet-title">
            <h2 id={`${formId}-title`}>{title}</h2>
            {subtitle && <p className="meta">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close"><CloseIcon /></button>
        </header>
        <form id={formId} className="sheet-body" noValidate onSubmit={(e) => { e.preventDefault(); if (!busy) onSubmit(); }}>
          {children}
        </form>
        <footer className="sheet-foot">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form={formId} className="btn primary" disabled={busy}>{busy ? busyLabel : submitLabel}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
