import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CloseIcon, NextIcon, PrevIcon } from './Icons';
import { PhotoImage } from './PhotoImage';
import { useBodyLock } from './useBodyLock';

export interface LightboxItem {
  fileId: string;
  title?: string;
  sub?: string;
  /** Link shown under the photo, e.g. to the garment it belongs to. */
  href?: string;
}

export function Lightbox({ items, start, onClose }: { items: LightboxItem[]; start: number; onClose(): void }) {
  useBodyLock();
  const [i, setI] = useState(start);
  const n = items.length;
  const step = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  const item = items[i];
  if (!item) return null;
  return createPortal(
    <div className="lb" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button type="button" className="lb-btn lb-close" onClick={onClose} aria-label="Close photo"><CloseIcon /></button>
      <PhotoImage fileId={item.fileId} alt={item.title ? `Photo of ${item.title}` : `Photo ${i + 1} of ${n}`} />
      {item.title && (
        <div className="lb-cap">
          <span className="lb-title">{item.title}</span>
          {item.sub && <span className="lb-sub">{item.sub}</span>}
          {item.href && <Link className="lb-link" to={item.href} onClick={onClose}>Open garment</Link>}
        </div>
      )}
      {n > 1 && (
        <div className="lb-bar">
          <button type="button" className="lb-btn" onClick={() => step(-1)} aria-label="Previous photo"><PrevIcon /></button>
          <span>{i + 1} / {n}</span>
          <button type="button" className="lb-btn" onClick={() => step(1)} aria-label="Next photo"><NextIcon /></button>
        </div>
      )}
    </div>,
    document.body,
  );
}
