import { useState } from 'react';
import type { Photo } from '../data/types';
import { Lightbox, type LightboxItem } from './Lightbox';
import { PhotoImage } from './PhotoImage';

/** Thumbnails that open full size in a lightbox. */
export function PhotoGrid({ photos, emptyText = 'No photos yet.', caption }: {
  photos: Photo[];
  emptyText?: string;
  caption?: (p: Photo) => Omit<LightboxItem, 'fileId'>;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return <p className="muted">{emptyText}</p>;
  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <div className="photo" key={p.id}>
            <button type="button" className="photo-btn" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
              <PhotoImage fileId={p.thumbId} />
            </button>
          </div>
        ))}
      </div>
      {open !== null && (
        <Lightbox items={photos.map((p) => ({ fileId: p.fileId, ...caption?.(p) }))} start={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
