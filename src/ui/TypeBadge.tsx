import type { CSSProperties } from 'react';
import { garmentType, typeColor } from '../lib/measurements';

export const typeStyle = (id: string) => ({ '--t': typeColor(id) }) as CSSProperties;

export function TypeBadge({ type, count }: { type: string; count?: number }) {
  return (
    <span className="type-badge" style={typeStyle(type)}>
      {garmentType(type).label}
      {count != null && <span className="n">{count}</span>}
    </span>
  );
}
