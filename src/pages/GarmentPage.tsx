import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { photosOf, useData } from '../data/store';
import type { Garment } from '../data/types';
import { GarmentSheet } from '../forms/GarmentSheet';
import { errorMessage } from '../lib/errors';
import { ago, firstName, formatDate, plural } from '../lib/format';
import { FIELD_BY_KEY, LENGTH_KEYS, garmentType } from '../lib/measurements';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BackIcon, EditIcon, TrashIcon } from '../ui/Icons';
import { MeasurementView } from '../ui/MeasurementGrid';
import { PhotoGrid } from '../ui/PhotoGrid';
import { useToast } from '../ui/Toast';
import { TypeBadge, typeStyle } from '../ui/TypeBadge';
import { UploadButton } from '../ui/UploadButton';
import { NotFound } from './shared';
import { useRouteRecords } from './useRouteRecords';

const TABS = ['measurements', 'notes'] as const;
type Tab = (typeof TABS)[number];

export default function GarmentPage() {
  const data = useData();
  const { profile, garment, redirect } = useRouteRecords();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!profile || !garment) return <NotFound text="This garment doesn’t exist." />;
  if (redirect) return <Navigate to={redirect} replace />;

  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'measurements';
  const t = garmentType(garment.type);
  // Only the measurements that were entered, in catalogue order.
  const filledKeys = t.keys.filter((k) => garment.measurements[k] != null);
  // Values saved under fields that have since left this type's list still show.
  const extraKeys = Object.keys(garment.measurements).filter((k) => !t.keys.includes(k) && FIELD_BY_KEY[k]);
  const shownKeys = [...filledKeys, ...extraKeys];
  const refPhotos = photosOf(data, { garmentId: garment.id, kind: 'reference' });
  const finPhotos = photosOf(data, { garmentId: garment.id, kind: 'finished' });
  const anyDiff = shownKeys.some((k) => {
    const v = garment.measurements[k], b = profile.body[k];
    return !LENGTH_KEYS.has(k) && v != null && b != null && Math.abs(v - b) > 0.001;
  });
  const edited = new Date(garment.updatedAt).getTime() - new Date(garment.createdAt).getTime() > 60_000;

  const upload = (kind: 'reference' | 'finished') => async (files: File[]) => {
    const r = await data.addPhotos(files, { kind, profileId: profile.id, garmentId: garment.id });
    const what = kind === 'finished' ? 'finished photo' : 'reference photo';
    if (r.failed) toast(`${plural(r.added, what)} added, ${r.failed} failed. ${r.error}`);
    else toast(kind === 'finished' ? `${plural(r.added, what)} added. They also show in the Gallery.` : `${plural(r.added, what)} added`);
  };

  async function remove() {
    setDeleting(true);
    try {
      const back = data.profilePath(profile!.id);
      await data.deleteGarment(garment!.id);
      navigate(back, { replace: true });
      toast('Garment deleted');
    } catch (e) {
      toast(errorMessage(e));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const tabs: [Tab, string, number][] = [
    ['measurements', 'Measurements', shownKeys.length],
    ['notes', 'Remarks & photos', refPhotos.length],
  ];

  return (
    <div className="stack">
      <Link className="crumb" to={data.profilePath(profile.id)}><BackIcon /> {profile.name}</Link>
      <section className="g-head" style={typeStyle(garment.type)}>
        <div className="g-title">
          <TypeBadge type={garment.type} />
          <h1>{garment.name}</h1>
          <p className="meta">For {profile.name} · Added {formatDate(garment.createdAt)}{edited ? ` · Edited ${ago(garment.updatedAt)}` : ''}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => setEditing(true)}><EditIcon /> Edit garment</button>
          <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}><TrashIcon /> Delete</button>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Garment sections">
        {tabs.map(([id, label, n]) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} className="tab" aria-selected={tab === id}
            onClick={() => setParams(id === 'measurements' ? {} : { tab: id }, { replace: true })}>
            {label}<span className="count">{n}</span>
          </button>
        ))}
      </div>

      {/* Both panels stay mounted so unsaved remarks survive a tab switch. */}
      <section role="tabpanel" id="panel-measurements" aria-labelledby="tab-measurements" hidden={tab !== 'measurements'}>
        <div className="g-layout">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>{t.label} measurements</h2>
                <p className="hint">
                  In inches · {filledKeys.length} of {t.keys.length} entered
                  {anyDiff && <> · <span className="legend-key"><i />Changed from {firstName(profile.name)}’s body measurements</span></>}
                </p>
              </div>
            </div>
            {shownKeys.length ? (
              <MeasurementView keys={shownKeys} values={garment.measurements} body={profile.body} />
            ) : (
              <div className="empty">
                <p className="empty-title">No measurements entered yet</p>
                <button type="button" className="btn primary" onClick={() => setEditing(true)}><EditIcon /> Add measurements</button>
              </div>
            )}
          </section>
          <section className="panel fin">
            <div className="panel-head">
              <div><h2>Finished photos</h2><p className="hint">The stitched garment. These also show in the Gallery.</p></div>
              <UploadButton id="fin-photos" label="Add" primary onFiles={upload('finished')} />
            </div>
            <PhotoGrid photos={finPhotos} emptyText="No finished photos yet. Add them once the garment is stitched." />
          </section>
        </div>
      </section>

      <section role="tabpanel" id="panel-notes" aria-labelledby="tab-notes" hidden={tab !== 'notes'}>
        <div className="notes-layout">
          <RemarksEditor garment={garment} />
          <section className="panel">
            <div className="panel-head">
              <div><h2>Reference photos</h2><p className="hint">Design ideas, fabric, the customer’s sample</p></div>
              <UploadButton id="ref-photos" label="Add" onFiles={upload('reference')} />
            </div>
            <PhotoGrid photos={refPhotos} emptyText="No reference photos." />
          </section>
        </div>
      </section>

      {editing && (
        <GarmentSheet profile={profile} garment={garment} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); toast('Garment saved'); }} />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${garment.name}?`}
          text={`Its measurements, remarks and photos are removed from ${profile.name}’s profile. You can’t undo this.`}
          confirmLabel="Delete garment"
          busy={deleting}
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

/** Remarks typed and saved right on the page, without opening the edit form. */
function RemarksEditor({ garment }: { garment: Garment }) {
  const data = useData();
  const toast = useToast();
  const [text, setText] = useState(garment.remarks);
  const [saving, setSaving] = useState(false);

  // Pick up changes saved elsewhere (e.g. from the Edit garment form).
  useEffect(() => { setText(garment.remarks); }, [garment.remarks]);

  const dirty = text.trim() !== garment.remarks;

  async function save() {
    setSaving(true);
    try {
      await data.saveGarment({
        id: garment.id,
        input: { profileId: garment.profileId, name: garment.name, type: garment.type, measurements: garment.measurements, remarks: text.trim() },
        addRef: [], addFinished: [], removePhotos: [],
      });
      toast('Remarks saved');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <label htmlFor="garment-remarks"><h2>Remarks</h2></label>
      <textarea
        id="garment-remarks"
        className="text-input"
        rows={6}
        value={text}
        placeholder="Lining, opening side, hooks or zip, piping, fabric given by customer"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="panel-actions">
        {dirty && <button type="button" className="btn" onClick={() => setText(garment.remarks)} disabled={saving}>Cancel</button>}
        <button type="button" className="btn primary" onClick={() => void save()} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save remarks'}</button>
      </div>
    </section>
  );
}
