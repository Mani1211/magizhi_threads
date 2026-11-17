type Source = ImageBitmap | HTMLImageElement;

async function decode(file: Blob): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall back to <img> below */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file isn’t a photo the browser can read.')); };
    img.src = url;
  });
}

/** Shrinks a photo so its longest side is at most `maxSide` px and re-encodes it as JPEG. */
export async function resizeImage(file: Blob, maxSide: number, quality: number): Promise<Blob> {
  const src = await decode(file);
  const w0 = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h0 = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser can’t process photos.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  if ('close' in src) src.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t process this photo.'))), 'image/jpeg', quality),
  );
}

/** Full-size and thumbnail versions used for every upload. */
export const FULL = { maxSide: 1600, quality: 0.82 };
export const THUMB = { maxSide: 480, quality: 0.78 };
