import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { coverPhoto, garmentsOf, photosOf, useData } from '../data/store';
import type { Garment, Profile } from '../data/types';
import { GarmentSheet } from '../forms/GarmentSheet';
import { ProfileSheet } from '../forms/ProfileSheet';
import { errorMessage } from '../lib/errors';
import { firstName, formatDate, formatMonth, initials, plural } from '../lib/format';
import { ALL_KEYS, FIELDS, SUMMARY, formatInch, garmentType } from '../lib/measurements';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BackIcon, EditIcon, PlusIcon, TrashIcon } from '../ui/Icons';
import { MeasurementView } from '../ui/MeasurementGrid';
import { PhotoGrid } from '../ui/PhotoGrid';
import { PhotoImage } from '../ui/PhotoImage';
import { useToast } from '../ui/Toast';
import { TypeBadge, typeStyle } from '../ui/TypeBadge';
import { UploadButton } from '../ui/UploadButton';
import { NotFound, typeCounts } from './shared';
import { useRouteRecords } from './useRouteRecords';

const TABS = ['measurements', 'garments', 'notes'] as const;
type Tab = (typeof TABS)[number];

export default function ProfilePage() {
  const data = useData();
  const { profile, redirect } = useRouteRecords();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<false | 'profile' | 'measurements'>(false);
  const [addingGarment, setAddingGarment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!profile) return <NotFound text="This profile doesn’t exist." />;
  if (redirect) return <Navigate to={redirect} replace />;

  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'measurements';
  const garments = garmentsOf(data, profile.id);
  const photos = photosOf(data, { profileId: profile.id, kind: 'profile' });
  const filledKeys = ALL_KEYS.filter((k) => profile.body[k] != null);
  const filled = filledKeys.length;

  async function remove() {
    setDeleting(true);
    try {
      await data.deleteProfile(profile!.id);
      navigate('/', { replace: true });
      toast('Profile deleted');
    } catch (e) {
      toast(errorMessage(e));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const tabs: [Tab, string, string | number][] = [
    ['measurements', 'Body measurements', `${filled}/${FIELDS.length}`],
    ['garments', 'Garments', garments.length],
    ['notes', 'Notes & photos', photos.length],
  ];

  return (
    <div className="stack">
      <Link className="crumb" to="/"><BackIcon /> All profiles</Link>
      <section className="p-head">
        <span className="avatar lg" aria-hidden="true">{initials(profile.name)}</span>
        <div className="p-id">
          <h1>{profile.name}</h1>
          <p className="meta">
            {profile.phone && <><a className="mono" href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`}>{profile.phone}</a> · </>}
            Customer since {formatMonth(profile.createdAt)}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => setEditing('profile')}><EditIcon /> Edit profile</button>
          <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}><TrashIcon /> Delete</button>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Profile sections">
        {tabs.map(([id, label, n]) => (
          <button key={id} type="button" role="tab" className="tab" aria-selected={tab === id}
            onClick={() => setParams(id === 'measurements' ? {} : { tab: id }, { replace: true })}>
            {label}<span className="count">{n}</span>
          </button>
        ))}
      </div>

      <section role="tabpanel">
        {tab === 'garments' && <GarmentsTab profile={profile} garments={garments} onAdd={() => setAddingGarment(true)} />}
        {tab === 'measurements' && (
          <div className="panel">
            <div className="panel-head">
              <div><h2>Full body measurements</h2><p className="hint">In inches · {filled} of {FIELDS.length} entered</p></div>
              <button type="button" className="btn" onClick={() => setEditing('measurements')}><EditIcon /> Edit measurements</button>
            </div>
            {filled ? (
              <MeasurementView keys={filledKeys} values={profile.body} />
            ) : (
              <div className="empty">
                <p className="empty-title">No body measurements yet</p>
                <button type="button" className="btn primary" onClick={() => setEditing('measurements')}><EditIcon /> Add measurements</button>
              </div>
            )}
          </div>
        )}
        {tab === 'notes' && (
          <div className="notes-layout">
            <section className="panel">
              <div className="panel-head"><h2>Remarks</h2><button type="button" className="btn text" onClick={() => setEditing('profile')}>Edit</button></div>
              <p className="remarks">{profile.remarks || <span className="muted">No remarks yet.</span>}</p>
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Photos</h2>
                <UploadButton id="profile-photos" label="Add photos" onFiles={async (files) => {
                  const r = await data.addPhotos(files, { kind: 'profile', profileId: profile.id });
                  toast(r.failed ? `${plural(r.added, 'photo')} added, ${r.failed} failed. ${r.error}` : `${plural(r.added, 'photo')} added`);
                }} />
              </div>
              <PhotoGrid photos={photos} />
            </section>
          </div>
        )}
      </section>

      {editing && (
        <ProfileSheet profile={profile} focusMeasurements={editing === 'measurements'} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); toast('Profile saved'); }} />
      )}
      {addingGarment && (
        <GarmentSheet profile={profile} onClose={() => setAddingGarment(false)}
          onSaved={() => { setAddingGarment(false); setParams({ tab: 'garments' }, { replace: true }); toast(`Garment added to ${firstName(profile.name)}’s profile`); }} />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${profile.name}?`}
          text={`This removes the profile, body measurements, photos${garments.length ? ` and all ${plural(garments.length, 'garment')}` : ''}. You can’t undo this.`}
          confirmLabel="Delete profile"
          busy={deleting}
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function GarmentsTab({ profile, garments, onAdd }: { profile: Profile; garments: Garment[]; onAdd(): void }) {
  const [filter, setFilter] = useState('all');
  const types = typeCounts(garments);
  const active = types.some(([t]) => t === filter) ? filter : 'all';
  const list = garments.filter((g) => active === 'all' || g.type === active);

  if (!garments.length) {
    return (
      <div className="empty">
        <p className="empty-title">No garments for {firstName(profile.name)} yet</p>
        <p>Add the first one. Measurements from this profile are filled in for you.</p>
        <button type="button" className="btn primary" onClick={onAdd}><PlusIcon /> Add garment</button>
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="panel-head">
        <div className="chips" role="group" aria-label="Filter by garment type">
          <button type="button" className="chip" aria-pressed={active === 'all'} onClick={() => setFilter('all')}>All <span className="mono">{garments.length}</span></button>
          {types.length > 1 && types.map(([t, n]) => (
            <button type="button" key={t} className="chip" aria-pressed={active === t} onClick={() => setFilter(t)}>
              {garmentType(t).label} <span className="mono">{n}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn primary" onClick={onAdd}><PlusIcon /> Add garment</button>
      </div>
      <div className="tags">{list.map((g) => <GarmentTag key={g.id} garment={g} />)}</div>
    </div>
  );
}

function GarmentTag({ garment: g }: { garment: Garment }) {
  const data = useData();
  const cover = coverPhoto(data, g.id);
  const summary = (SUMMARY[g.type] ?? []).filter(([k]) => g.measurements[k] != null);
  return (
    <Link className="tag" to={data.garmentPath(g)} style={typeStyle(g.type)}>
      <span className="tag-edge">
        <span className="tag-in">
          <span className="hole" />
          <span className="tag-thumb">{cover ? <PhotoImage fileId={cover.thumbId} /> : garmentType(g.type).label[0]}</span>
          <span className="tag-main">
            <span className="tag-top"><TypeBadge type={g.type} /><span className="tag-date">{formatDate(g.createdAt)}</span></span>
            <span className="tag-name">{g.name}</span>
            <span className="tag-meas">
              {summary.length
                ? summary.map(([k, label]) => <span key={k}><span className="k">{label}</span> {formatInch(g.measurements[k])}</span>)
                : <span className="k">No measurements yet</span>}
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}
