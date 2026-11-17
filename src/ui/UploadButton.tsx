import { useState } from 'react';
import { plural } from '../lib/format';
import { ImageIcon } from './Icons';

/** "Add photos" button that uploads straight away (used on detail pages). */
export function UploadButton({ id, label, primary, onFiles }: {
  id: string;
  label: string;
  primary?: boolean;
  onFiles(files: File[]): Promise<void>;
}) {
  const [busy, setBusy] = useState(0);
  return (
    <label className={`btn${primary ? ' primary' : ''}`} htmlFor={id} aria-disabled={busy > 0 || undefined}>
      <ImageIcon />
      {busy ? `Uploading ${plural(busy, 'photo')}…` : label}
      <input
        id={id}
        type="file"
        className="vh"
        accept="image/*"
        multiple
        disabled={busy > 0}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!files.length) return;
          setBusy(files.length);
          try { await onFiles(files); } finally { setBusy(0); }
        }}
      />
    </label>
  );
}
