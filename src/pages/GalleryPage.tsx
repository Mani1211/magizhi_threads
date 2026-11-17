import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../data/store';
import { formatDate, plural } from '../lib/format';
import { garmentType } from '../lib/measurements';
import { Lightbox } from '../ui/Lightbox';
import { PhotoImage } from '../ui/PhotoImage';
import { TypeBadge, typeStyle } from '../ui/TypeBadge';
import { HomeSwitch, typeCounts } from './shared';

export default function GalleryPage() {
  const data = useData();
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState<number | null>(null);

  const all = useMemo(() => {
    const garments = new Map(data.garments.map((g) => [g.id, g]));
    const profiles = new Map(data.profiles.map((p) => [p.id, p]));
    return data.photos
      .filter((p) => p.kind === 'finished')
      .flatMap((photo) => {
        const garment = photo.garmentId ? garments.get(photo.garmentId) : undefined;
        const profile = profiles.get(photo.profileId);
        return garment && profile ? [{ photo, garment, profile, type: garment.type }] : [];
      })
      .sort((a, b) => (a.photo.createdAt < b.photo.createdAt ? 1 : -1));
  }, [data]);

  const types = typeCounts(all);
  const active = types.some(([t]) => t === filter) ? filter : 'all';
  const list = all.filter((x) => active === 'all' || x.type === active);
  const garmentCount = new Set(all.map((x) => x.garment.id)).size;

  return (
    <div className="stack">
      <HomeSwitch />
      <section className="page-head">
        <div>
          <h1>Gallery</h1>
          <p className="sub">{plural(all.length, 'finished photo')} from {plural(garmentCount, 'garment')}</p>
        </div>
      </section>

      {!all.length ? (
        <div className="empty">
          <p className="empty-title">No finished photos yet</p>
          <p>Open a garment and add photos under “Finished photos”. They appear here automatically.</p>
        </div>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter by garment type">
            <button type="button" className="chip" aria-pressed={active === 'all'} onClick={() => setFilter('all')}>All <span className="mono">{all.length}</span></button>
            {types.map(([t, n]) => (
              <button type="button" key={t} className="chip" aria-pressed={active === t} onClick={() => setFilter(t)}>
                {garmentType(t).label} <span className="mono">{n}</span>
              </button>
            ))}
          </div>
          <div className="gallery">
            {list.map((x, i) => (
              <figure className="gal-item" key={x.photo.id} style={typeStyle(x.type)}>
                <button type="button" className="gal-img" onClick={() => setOpen(i)} aria-label={`Enlarge photo of ${x.garment.name}`}>
                  <PhotoImage fileId={x.photo.thumbId} />
                </button>
                <figcaption>
                  <TypeBadge type={x.type} />
                  <Link className="gal-name" to={data.garmentPath(x.garment)}>{x.garment.name}</Link>
                  <span className="gal-who">{x.profile.name} · {formatDate(x.photo.createdAt)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}

      {open !== null && (
        <Lightbox
          start={open}
          onClose={() => setOpen(null)}
          items={list.map((x) => ({
            fileId: x.photo.fileId,
            title: x.garment.name,
            sub: `${x.profile.name} · ${formatDate(x.photo.createdAt)}`,
            href: data.garmentPath(x.garment),
          }))}
        />
      )}
    </div>
  );
}
