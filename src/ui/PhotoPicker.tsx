import { useEffect, useMemo } from 'react';
import type { Photo } from '../data/types';
import { CloseIcon, ImageIcon } from './Icons';
import { PhotoImage } from './PhotoImage';

interface Props {
  id: string;
  existing: Photo[];
  pending: File[];
  onAdd(files: File[]): void;
  onRemoveExisting(photo: Photo): void;
  onRemovePending(index: number): void;
}

/** Photo field for forms: saved photos, photos waiting to upload, and an "Add photos" tile. */
export function PhotoPicker({ id, existing, pending, onAdd, onRemoveExisting, onRemovePending }: Props) {
  const previews = useMemo(() => pending.map((f) => URL.createObjectURL(f)), [pending]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  return (
    <div className="photo-grid">
      {existing.map((p, i) => (
        <div className="photo" key={p.id}>
          <PhotoImage fileId={p.thumbId} alt={`Photo ${i + 1}`} />
          <button type="button" className="rm" onClick={() => onRemoveExisting(p)} aria-label={`Remove photo ${i + 1}`}><CloseIcon /></button>
        </div>
      ))}
      {previews.map((url, i) => (
        <div className="photo" key={url}>
          <img src={url} alt={`New photo ${i + 1}`} />
          <span className="new-dot">New</span>
          <button type="button" className="rm" onClick={() => onRemovePending(i)} aria-label={`Remove new photo ${i + 1}`}><CloseIcon /></button>
        </div>
      ))}
      <label className="photo add" htmlFor={id}>
        <ImageIcon />
        <span>Add photos</span>
        <input
          id={id}
          type="file"
          className="vh"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/') || f.type === '');
            if (files.length) onAdd(files);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
