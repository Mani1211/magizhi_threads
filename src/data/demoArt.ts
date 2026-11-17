/* Sample artwork for demo mode: fabric swatches (reference photos) and garments on a hanger (finished photos). */
type Kind = 'stripe' | 'dot' | 'check' | 'floral' | 'zari';

function pattern(c1: string, c2: string, kind: Kind, scale = 1): string {
  const s = (n: number) => +(n * scale).toFixed(2);
  switch (kind) {
    case 'stripe':
      return `<pattern id="p" width="${s(22)}" height="${s(22)}" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="${s(22)}" height="${s(22)}" fill="${c1}"/><rect width="${s(6)}" height="${s(22)}" fill="${c2}"/></pattern>`;
    case 'dot':
      return `<pattern id="p" width="${s(22)}" height="${s(22)}" patternUnits="userSpaceOnUse"><rect width="${s(22)}" height="${s(22)}" fill="${c1}"/><circle cx="${s(5.5)}" cy="${s(5.5)}" r="${s(2.4)}" fill="${c2}"/><circle cx="${s(16.5)}" cy="${s(16.5)}" r="${s(2.4)}" fill="${c2}"/></pattern>`;
    case 'check':
      return `<pattern id="p" width="${s(30)}" height="${s(30)}" patternUnits="userSpaceOnUse"><rect width="${s(30)}" height="${s(30)}" fill="${c1}"/><rect width="${s(30)}" height="${s(10)}" fill="${c2}" opacity=".55"/><rect width="${s(10)}" height="${s(30)}" fill="${c2}" opacity=".55"/></pattern>`;
    case 'floral':
      return `<pattern id="p" width="${s(48)}" height="${s(48)}" patternUnits="userSpaceOnUse"><rect width="${s(48)}" height="${s(48)}" fill="${c1}"/><g fill="${c2}"><circle cx="${s(12)}" cy="${s(12)}" r="${s(3.8)}"/><circle cx="${s(12)}" cy="${s(6)}" r="${s(2.6)}"/><circle cx="${s(12)}" cy="${s(18)}" r="${s(2.6)}"/><circle cx="${s(6)}" cy="${s(12)}" r="${s(2.6)}"/><circle cx="${s(18)}" cy="${s(12)}" r="${s(2.6)}"/></g><g fill="${c2}" opacity=".55"><circle cx="${s(36)}" cy="${s(36)}" r="${s(3)}"/><circle cx="${s(36)}" cy="${s(31)}" r="${s(2)}"/><circle cx="${s(36)}" cy="${s(41)}" r="${s(2)}"/><circle cx="${s(31)}" cy="${s(36)}" r="${s(2)}"/><circle cx="${s(41)}" cy="${s(36)}" r="${s(2)}"/></g></pattern>`;
    case 'zari':
      return `<pattern id="p" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${c1}"/><rect width="1.2" height="6" fill="#000" opacity=".1"/></pattern>`;
  }
}

const SHEEN = `<linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>`;

export function swatchSvg(c1: string, c2: string, kind: Kind): string {
  const band = kind === 'zari'
    ? `<rect y="200" width="300" height="7" fill="${c2}"/><rect y="214" width="300" height="60" fill="${c2}" opacity=".85"/><rect y="281" width="300" height="7" fill="${c2}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs>${pattern(c1, c2, kind, 1.3)}${SHEEN}</defs><rect width="300" height="300" fill="url(#p)"/>${band}<rect width="300" height="300" fill="url(#s)"/></svg>`;
}

const SILHOUETTE: Record<string, { d: string; neck: string; hem: number }> = {
  blouse: { d: 'M110 72 L190 72 L232 92 L246 140 L214 148 L204 120 L204 186 Q150 196 96 186 L96 120 L86 148 L54 140 L68 92 Z', neck: 'M128 72 Q150 112 172 72 Z', hem: 174 },
  kurti: { d: 'M112 72 L188 72 L228 90 L250 176 L222 182 L206 120 L210 278 L90 278 L94 120 L78 182 L50 176 L72 90 Z', neck: 'M132 72 Q150 100 168 72 Z', hem: 262 },
  maxi: { d: 'M114 72 L186 72 L222 88 L244 196 L218 200 L202 118 L198 150 L236 286 L64 286 L102 150 L98 118 L82 200 L56 196 L78 88 Z', neck: 'M132 72 Q150 102 168 72 Z', hem: 268 },
  anarkali: { d: 'M116 72 L184 72 L220 88 L240 186 L216 190 L200 116 L196 150 Q262 236 272 286 L28 286 Q38 236 104 150 L100 116 L84 190 L60 186 L80 88 Z', neck: 'M134 72 Q150 100 166 72 Z', hem: 264 },
  pant: { d: 'M100 74 L200 74 L214 286 L162 286 L150 142 L138 286 L86 286 Z', neck: '', hem: 0 },
};

export function garmentSvg(type: string, c1: string, c2: string, kind: Kind): string {
  const s = SILHOUETTE[type] ?? SILHOUETTE.kurti;
  const band = kind === 'zari' && s.hem ? `<rect y="${s.hem}" width="300" height="13" fill="${c2}"/><rect y="${s.hem + 17}" width="300" height="5" fill="${c2}"/>` : '';
  const waist = type === 'pant' ? `<rect x="90" y="74" width="120" height="14" fill="${c2}" opacity=".9"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360"><defs>${pattern(c1, c2, kind)}
    <linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="360"><stop offset="0" stop-color="#F1E8DA"/><stop offset="1" stop-color="#D8C9B2"/></linearGradient>
    <linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
    <clipPath id="c"><path d="${s.d}"/></clipPath></defs>
    <rect width="300" height="360" fill="url(#bg)"/>
    <g transform="translate(0,26)">
      <path d="M150 44 C150 33 163 30 164 38 C165 44 158 46 150 50 L86 76 L214 76 Z" fill="none" stroke="#6B5B45" stroke-width="3" stroke-linejoin="round"/>
      <g clip-path="url(#c)"><rect width="300" height="300" fill="url(#p)"/>${band}${waist}<rect width="300" height="300" fill="url(#sh)"/></g>
      ${s.neck ? `<path d="${s.neck}" fill="url(#bg)"/>` : ''}
      <path d="${s.d}" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="1.5"/>
    </g></svg>`;
}
