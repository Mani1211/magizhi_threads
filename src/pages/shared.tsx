import { Link, NavLink } from 'react-router-dom';
import { useData } from '../data/store';
import { GARMENT_TYPES } from '../lib/measurements';

/** Types present in a list, in catalogue order, with counts. */
export function typeCounts(items: { type: string }[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.type, (counts.get(it.type) ?? 0) + 1);
  const order = [...GARMENT_TYPES.map((t) => t.id), ...[...counts.keys()].filter((k) => !GARMENT_TYPES.some((t) => t.id === k))];
  return order.filter((id) => counts.has(id)).map((id) => [id, counts.get(id)!]);
}

export function HomeSwitch() {
  const data = useData();
  const finished = data.photos.filter((p) => p.kind === 'finished').length;
  return (
    <nav className="switch" aria-label="Home">
      <NavLink to="/" end>Profiles <span className="count">{data.profiles.length}</span></NavLink>
      <NavLink to="/gallery">Gallery <span className="count">{finished}</span></NavLink>
    </nav>
  );
}

export function NotFound({ text = 'This page doesn’t exist.' }: { text?: string }) {
  return (
    <div className="empty">
      <p className="empty-title">{text}</p>
      <p>It may have been deleted.</p>
      <Link className="btn primary" to="/">Go to all profiles</Link>
    </div>
  );
}
