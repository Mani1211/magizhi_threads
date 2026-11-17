import { useEffect, useRef, useState } from 'react';
import { photosOf, useData } from '../data/store';
import type { Garment, Photo, Profile } from '../data/types';
import { errorMessage } from '../lib/errors';
import { firstName, plural } from '../lib/format';
import { FIELD_BY_KEY, GARMENT_TYPES, LENGTH_KEYS, formatInch, garmentType, parseAll, parseInch, toRaw } from '../lib/measurements';
import { MeasurementEdit } from '../ui/MeasurementGrid';
import { PhotoPicker } from '../ui/PhotoPicker';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { typeStyle } from '../ui/TypeBadge';

interface Props {
  profile: Profile;
  garment?: Garment;
  onClose(): void;
  onSaved(garment: Garment): void;
}

export function GarmentSheet({ profile, garment, onClose, onSaved }: Props) {
  const data = useData();
  const toast = useToast();
  const [name, setName] = useState(garment?.name ?? '');
  const [type, setType] = useState(garment?.type ?? '');
  const [meas, setMeas] = useState(() => toRaw(garment?.measurements));
  const [remarks, setRemarks] = useState(garment?.remarks ?? '');
  const [errors, setErrors] = useState({ name: false, type: false });
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [pendingRef, setPendingRef] = useState<File[]>([]);
  const [pendingFin, setPendingFin] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const typeKeys = type ? garmentType(type).keys : [];
  // Keep values saved under fields that are no longer in this type's list, so editing never drops them.
  const savedExtra = type && garment && garment.type === type
    ? Object.keys(garment.measurements).filter((k) => !typeKeys.includes(k) && FIELD_BY_KEY[k])
    : [];
  const keys = [...typeKeys, ...savedExtra];
  const hasBody = Object.keys(profile.body).length > 0;
  const who = firstName(profile.name);
  const savedRef = garment ? photosOf(data, { garmentId: garment.id, kind: 'reference' }) : [];
  const savedFin = garment ? photosOf(data, { garmentId: garment.id, kind: 'finished' }) : [];

  useEffect(() => { if (!garment) nameRef.current?.focus(); }, [garment]);

  /** Copies body measurements into empty fields of the chosen type (never the lengths, which differ per garment). */
  function fill(typeId: string, overwrite: boolean) {
    setMeas((m) => {
      const next = { ...m };
      for (const k of garmentType(typeId).keys) {
        if (LENGTH_KEYS.has(k)) continue;
        if (overwrite || next[k] === undefined) next[k] = profile.body[k] != null ? String(profile.body[k]) : '';
      }
      return next;
    });
  }

  function hint(k: string): string {
    if (LENGTH_KEYS.has(k)) return '';
    const b = profile.body[k];
    const v = parseInch(meas[k]);
    if (b == null || v == null || Number.isNaN(v) || Math.abs(v - b) < 0.001) return '';
    return `Body ${formatInch(b)}`;
  }

  async function submit() {
    const trimmed = name.trim();
    const { values, bad } = parseAll(meas, keys);
    setErrors({ name: !trimmed, type: !type });
    setInvalid(new Set(bad));
    if (!trimmed || !type || bad.length) {
      const el = !trimmed ? nameRef.current : !type ? document.querySelector<HTMLInputElement>('input[name="g-type"]') : document.getElementById(`m-${bad[0]}`);
      el?.scrollIntoView({ block: 'center' });
      el?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    try {
      const removePhotos: Photo[] = [...savedRef, ...savedFin].filter((p) => removed.has(p.id));
      const res = await data.saveGarment({
        id: garment?.id,
        input: { profileId: profile.id, name: trimmed, type, measurements: values, remarks: remarks.trim() },
        addRef: pendingRef,
        addFinished: pendingFin,
        removePhotos,
      });
      if (res.failedUploads) toast(`Garment saved, but ${plural(res.failedUploads, 'photo')} didn’t upload. ${res.uploadError}`);
      onSaved(res.record);
    } catch (e) {
      toast(errorMessage(e));
      setBusy(false);
    }
  }

  const uploads = pendingRef.length + pendingFin.length;
  return (
    <Sheet
      title={garment ? 'Edit garment' : 'New garment'}
      subtitle={`For ${profile.name}`}
      formId="garment-form"
      submitLabel={garment ? 'Save garment' : 'Add garment'}
      busy={busy}
      busyLabel={uploads ? `Saving and uploading ${plural(uploads, 'photo')}…` : 'Saving…'}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <div className="field">
        <label htmlFor="g-name">Garment name <span className="req">Required</span></label>
        <input id="g-name" ref={nameRef} className="text-input" value={name} autoComplete="off" placeholder="e.g. Maroon silk wedding blouse"
          onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((x) => ({ ...x, name: false })); }} aria-invalid={errors.name || undefined} />
        {errors.name && <p className="err">Enter a name so you can find this garment later.</p>}
      </div>

      <div className="field">
        <span className="label" id="g-type-label">Garment type <span className="req">Required</span></span>
        <div className="type-picker" role="radiogroup" aria-labelledby="g-type-label">
          {GARMENT_TYPES.map((t) => (
            <label className="type-opt" style={typeStyle(t.id)} key={t.id}>
              <input type="radio" name="g-type" value={t.id} checked={type === t.id}
                onChange={() => { setType(t.id); fill(t.id, false); setErrors((x) => ({ ...x, type: false })); }} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
        {errors.type && <p className="err">Choose a garment type.</p>}
      </div>

      <div className="sec">
        {!type ? (
          <>
            <div className="sec-head"><span className="sec-title">Measurements</span></div>
            <div className="m-placeholder">Choose a garment type above. Its measurements appear here, filled in from {who}’s body measurements.</div>
          </>
        ) : (
          <>
            <div className="sec-head">
              <span className="sec-title">{garmentType(type).label} measurements</span>
              <span className="sec-tools">
                {hasBody && <button type="button" className="btn text" onClick={() => { fill(type, true); toast('Filled from body measurements'); }}>Refill from body</button>}
                <button type="button" className="btn text" onClick={() => setMeas((m) => { const n = { ...m }; keys.forEach((k) => { n[k] = ''; }); return n; })}>Clear all</button>
              </span>
            </div>
            <p className="hint">
              {hasBody
                ? `Filled in from ${who}’s body measurements; change any value for this garment. Full length and sleeve length start blank because they differ for every garment.`
                : 'This profile has no body measurements yet, so enter them here.'} Inches.
            </p>
            {invalid.size > 0 && <p className="form-error">Some values aren’t numbers. Use digits like 14.5 or 14 1/2.</p>}
            <MeasurementEdit
              keys={keys}
              values={meas}
              invalid={invalid}
              hint={hint}
              onChange={(k, v) => {
                setMeas((m) => ({ ...m, [k]: v }));
                if (invalid.has(k)) setInvalid((s) => { const n = new Set(s); n.delete(k); return n; });
              }}
            />
          </>
        )}
      </div>

      <div className="sec">
        <div className="field">
          <label htmlFor="g-remarks">Remarks</label>
          <textarea id="g-remarks" className="text-input" rows={4} value={remarks} placeholder="Lining, opening side, hooks or zip, piping, fabric given by customer" onChange={(e) => setRemarks(e.target.value)} />
        </div>
        <div className="field">
          <span className="label">Reference photos</span>
          <p className="hint">Design ideas, fabric, the customer’s sample.</p>
          <PhotoPicker
            id="g-ref-photos"
            existing={savedRef.filter((p) => !removed.has(p.id))}
            pending={pendingRef}
            onAdd={(files) => setPendingRef((p) => [...p, ...files])}
            onRemoveExisting={(p) => setRemoved((s) => new Set(s).add(p.id))}
            onRemovePending={(i) => setPendingRef((p) => p.filter((_, j) => j !== i))}
          />
        </div>
        {garment ? (
          <div className="field">
            <span className="label">Finished photos</span>
            <p className="hint">Photos of the stitched garment. These also appear in the Gallery.</p>
            <PhotoPicker
              id="g-fin-photos"
              existing={savedFin.filter((p) => !removed.has(p.id))}
              pending={pendingFin}
              onAdd={(files) => setPendingFin((p) => [...p, ...files])}
              onRemoveExisting={(p) => setRemoved((s) => new Set(s).add(p.id))}
              onRemovePending={(i) => setPendingFin((p) => p.filter((_, j) => j !== i))}
            />
          </div>
        ) : (
          <p className="hint">Finished photos are added from the garment page once it’s stitched.</p>
        )}
      </div>
    </Sheet>
  );
}
