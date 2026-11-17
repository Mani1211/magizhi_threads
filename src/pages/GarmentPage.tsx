import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { photosOf, useData } from '../data/store';
import { GarmentSheet } from '../forms/GarmentSheet';
import { errorMessage } from '../lib/errors';
import { ago, firstName, formatDate, plural } from '../lib/format';
import { LENGTH_KEYS, garmentType } from '../lib/measurements';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BackIcon, EditIcon, TrashIcon } from '../ui/Icons';
import { MeasurementView } from '../ui/MeasurementGrid';
import { PhotoGrid } from '../ui/PhotoGrid';
import { useToast } from '../ui/Toast';
import { TypeBadge, typeStyle } from '../ui/TypeBadge';
import { UploadButton } from '../ui/UploadButton';
import { NotFound } from './shared';

export default function GarmentPage() {
  const { profileId = '', garmentId = '' } = useParams();
  const data = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profile = data.profiles.find((p) => p.id === profileId);
  const garment = data.garments.find((g) => g.id === garmentId && g.profileId === profileId);
  if (!profile || !garment) return <NotFound text="This garment doesn’t exist." />;

  const t = garmentType(garment.type);
  const refPhotos = photosOf(data, { garmentId: garment.id, kind: 'reference' });
  const finPhotos = photosOf(data, { garmentId: garment.id, kind: 'finished' });
  const anyDiff = t.keys.some((k) => {
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
      await data.deleteGarment(garmentId);
      navigate(`/p/${profileId}`, { replace: true });
      toast('Garment deleted');
    } catch (e) {
      toast(errorMessage(e));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="stack">
      <Link className="crumb" to={`/p/${profile.id}`}><BackIcon /> {profile.name}</Link>
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

      <div className="g-layout">
        <section className="panel">
          <div>
            <h2>{t.label} measurements</h2>
            <p className="hint">
              In inches.{anyDiff && <> <span className="legend-key"><i />Changed from {firstName(profile.name)}’s body measurements</span></>}
            </p>
          </div>
          {t.keys.length
            ? <MeasurementView keys={t.keys} values={garment.measurements} body={profile.body} />
            : <p className="muted">No measurement list is set for this garment type.</p>}
        </section>
        <div className="g-side">
          <section className="panel">
            <h2>Remarks</h2>
            <p className="remarks">{garment.remarks || <span className="muted">No remarks.</span>}</p>
          </section>
          <section className="panel">
            <div className="panel-head">
              <div><h2>Reference photos</h2><p className="hint">Design ideas, fabric, the customer’s sample</p></div>
              <UploadButton id="ref-photos" label="Add" onFiles={upload('reference')} />
            </div>
            <PhotoGrid photos={refPhotos} emptyText="No reference photos." />
          </section>
          <section className="panel fin">
            <div className="panel-head">
              <div><h2>Finished photos</h2><p className="hint">The stitched garment. These also show in the Gallery.</p></div>
              <UploadButton id="fin-photos" label="Add" primary onFiles={upload('finished')} />
            </div>
            <PhotoGrid photos={finPhotos} emptyText="No finished photos yet. Add them once the garment is stitched." />
          </section>
        </div>
      </div>

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
