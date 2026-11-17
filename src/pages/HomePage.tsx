import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { coverPhoto, garmentsOf, lastTouch, photosOf, useData } from '../data/store';
import type { Photo, Profile } from '../data/types';
import { ProfileSheet } from '../forms/ProfileSheet';
import { ago, initials, plural } from '../lib/format';
import { PlusIcon, SearchIcon } from '../ui/Icons';
import { PhotoImage } from '../ui/PhotoImage';
import { useToast } from '../ui/Toast';
import { TypeBadge } from '../ui/TypeBadge';
import { HomeSwitch, typeCounts } from './shared';

export default function HomePage() {
  const data = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const digits = query.replace(/\D/g, '');
    return data.profiles
      .filter((p) => !query || p.name.toLowerCase().includes(query) || (digits && p.phone.replace(/\D/g, '').includes(digits)))
      .map((p) => ({ profile: p, touched: lastTouch(data, p) }))
      .sort((a, b) => (a.touched < b.touched ? 1 : -1));
  }, [data, q]);

  return (
    <div className="stack">
      <HomeSwitch />
      <section className="page-head">
        <div>
          <h1>Profiles</h1>
          <p className="sub">{plural(data.profiles.length, 'profile')} · {plural(data.garments.length, 'garment')} stitched</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setCreating(true)}><PlusIcon /> New profile</button>
      </section>

      {data.profiles.length > 0 && (
        <div className="search">
          <SearchIcon />
          <input type="search" className="text-input" placeholder="Search by name or phone" aria-label="Search profiles" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      <div className="folders">
        {!data.profiles.length ? (
          <div className="empty">
            <p className="empty-title">No profiles yet</p>
            <p>Add the first person you stitch for. You can enter their body measurements now or later.</p>
            <button type="button" className="btn primary" onClick={() => setCreating(true)}><PlusIcon /> New profile</button>
          </div>
        ) : !list.length ? (
          <div className="empty">
            <p className="empty-title">No profile matches “{q}”</p>
            <p>Check the spelling, or search by phone number.</p>
          </div>
        ) : (
          <>
            {list.map(({ profile, touched }) => <FolderCard key={profile.id} profile={profile} touched={touched} />)}
            {!q && (
              <button type="button" className="folder new" onClick={() => setCreating(true)}>
                <span className="folder-tab">New</span>
                <span className="folder-body new-body"><PlusIcon /><span>Add a profile</span></span>
              </button>
            )}
          </>
        )}
      </div>

      {creating && (
        <ProfileSheet
          onClose={() => setCreating(false)}
          onSaved={(p) => { setCreating(false); navigate(`/p/${p.id}`); toast('Profile created'); }}
        />
      )}
    </div>
  );
}

function FolderCard({ profile, touched }: { profile: Profile; touched: string }) {
  const data = useData();
  const garments = garmentsOf(data, profile.id);
  const counts = typeCounts(garments);
  const thumbs = [
    ...garments.map((g) => coverPhoto(data, g.id)).filter((p): p is Photo => !!p),
    ...photosOf(data, { profileId: profile.id, kind: 'profile' }),
  ].slice(0, 4);

  return (
    <Link to={`/p/${profile.id}`} className="folder">
      <span className="folder-tab"><span className="mono">{garments.length}</span> {garments.length === 1 ? 'garment' : 'garments'}</span>
      <span className="folder-body">
        <span className="folder-top">
          <span className="avatar" aria-hidden="true">{initials(profile.name)}</span>
          <span className="folder-id">
            <span className="folder-name">{profile.name}</span>
            {profile.phone && <span className="folder-phone">{profile.phone}</span>}
          </span>
        </span>
        <span className="type-row">
          {counts.length
            ? counts.map(([type, n]) => <TypeBadge key={type} type={type} count={n} />)
            : <span className="muted" style={{ fontSize: 13.5 }}>No garments yet</span>}
        </span>
        <span className="folder-foot">
          <span className="thumbs">{thumbs.map((p) => <PhotoImage key={p.id} fileId={p.thumbId} />)}</span>
          <span className="updated">Updated {ago(touched)}</span>
        </span>
      </span>
    </Link>
  );
}
