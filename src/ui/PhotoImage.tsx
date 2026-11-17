import { useEffect, useState } from 'react';
import { api } from '../data/api';

const pending = new Map<string, Promise<string>>();
const ready = new Map<string, string>();

function load(fileId: string): Promise<string> {
  let p = pending.get(fileId);
  if (!p) {
    p = api.photoUrl(fileId).then((url) => { ready.set(fileId, url); return url; });
    p.catch(() => pending.delete(fileId));
    pending.set(fileId, p);
  }
  return p;
}

/** Forget downloaded photos, e.g. after signing out. */
export function clearPhotoCache() {
  for (const url of ready.values()) URL.revokeObjectURL(url);
  ready.clear();
  pending.clear();
}

/** Shows a stored photo, with a shimmer while it downloads. */
export function PhotoImage({ fileId, alt = '' }: { fileId: string; alt?: string }) {
  const [url, setUrl] = useState(() => ready.get(fileId));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    setUrl(ready.get(fileId));
    load(fileId).then(
      (u) => { if (alive) setUrl(u); },
      () => { if (alive) setFailed(true); },
    );
    return () => { alive = false; };
  }, [fileId]);

  if (url) return <img src={url} alt={alt} draggable={false} />;
  return <span className={`ph-img${failed ? ' failed' : ''}`} role="img" aria-label={failed ? 'Photo couldn’t load' : 'Loading photo'} />;
}
