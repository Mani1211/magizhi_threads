/** Words that are already pages of the app, so no profile may use them as its address. */
export const RESERVED_SLUGS = new Set(['gallery', 'login', 'p']);

/**
 * "Priya Raman" → "priya-raman". Keeps letters in any script (Tamil included) and digits;
 * everything else becomes a single dash.
 */
export function slugify(name: string, fallback: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // accents on Latin letters
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return s || fallback;
}

/** Adds -2, -3… until the slug is free. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}
