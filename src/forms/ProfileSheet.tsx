import { useEffect, useRef, useState } from 'react';
import { photosOf, useData } from '../data/store';
import type { Photo, Profile } from '../data/types';
import { errorMessage } from '../lib/errors';
import { plural } from '../lib/format';
import { ALL_KEYS, parseAll, toRaw } from '../lib/measurements';
import { MeasurementEdit } from '../ui/MeasurementGrid';
import { PhotoPicker } from '../ui/PhotoPicker';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';

interface Props {
  profile?: Profile;
  /** Open scrolled to the measurements (from "Edit measurements"). */
  focusMeasurements?: boolean;
  onClose(): void;
  onSaved(profile: Profile): void;
}

export function ProfileSheet({ profile, focusMeasurements, onClose, onSaved }: Props) {
  const data = useData();
  const toast = useToast();
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [remarks, setRemarks] = useState(profile?.remarks ?? '');
  const [body, setBody] = useState(() => toRaw(profile?.body));
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [nameError, setNameError] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const measRef = useRef<HTMLDivElement>(null);

  const existing = profile ? photosOf(data, { profileId: profile.id, kind: 'profile' }).filter((p) => !removed.has(p.id)) : [];

  useEffect(() => {
    if (focusMeasurements) {
      measRef.current?.scrollIntoView({ block: 'start' });
      measRef.current?.querySelector('input')?.focus({ preventScroll: true });
    } else if (!profile) {
      nameRef.current?.focus();
    }
  }, [focusMeasurements, profile]);

  async function submit() {
    const trimmed = name.trim();
    const { values, bad } = parseAll(body, ALL_KEYS);
    setNameError(!trimmed);
    setInvalid(new Set(bad));
    if (!trimmed || bad.length) {
      const el = !trimmed ? nameRef.current : document.getElementById(`m-${bad[0]}`);
      el?.scrollIntoView({ block: 'center' });
      el?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    try {
      const removePhotos: Photo[] = profile ? photosOf(data, { profileId: profile.id, kind: 'profile' }).filter((p) => removed.has(p.id)) : [];
      const res = await data.saveProfile({
        id: profile?.id,
        input: { name: trimmed, phone: phone.trim(), remarks: remarks.trim(), body: values },
        addFiles: pending,
        removePhotos,
      });
      if (res.failedUploads) toast(`Profile saved, but ${plural(res.failedUploads, 'photo')} didn’t upload. ${res.uploadError}`);
      onSaved(res.record);
    } catch (e) {
      toast(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={profile ? 'Edit profile' : 'New profile'}
      subtitle={profile?.name}
      formId="profile-form"
      submitLabel={profile ? 'Save profile' : 'Create profile'}
      busy={busy}
      busyLabel={pending.length ? `Saving and uploading ${plural(pending.length, 'photo')}…` : 'Saving…'}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <div className="field-row">
        <div className="field">
          <label htmlFor="f-name">Name <span className="req">Required</span></label>
          <input id="f-name" ref={nameRef} className="text-input" value={name} autoComplete="off" placeholder="e.g. Priya Raman"
            onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }} aria-invalid={nameError || undefined} />
          {nameError && <p className="err">Enter a name for this profile.</p>}
        </div>
        <div className="field">
          <label htmlFor="f-phone">Phone <span className="opt">Optional</span></label>
          <input id="f-phone" className="text-input" inputMode="tel" autoComplete="off" value={phone} placeholder="98400 12345" onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="sec" ref={measRef}>
        <div className="sec-head"><span className="sec-title">Full body measurements</span><span className="hint">Inches</span></div>
        <p className="hint">Leave anything blank that you haven’t measured yet. Both 14.5 and 14 1/2 work.</p>
        {invalid.size > 0 && <p className="form-error">Some values aren’t numbers. Use digits like 14.5 or 14 1/2.</p>}
        <MeasurementEdit
          keys={ALL_KEYS}
          values={body}
          invalid={invalid}
          onChange={(k, v) => {
            setBody((b) => ({ ...b, [k]: v }));
            if (invalid.has(k)) setInvalid((s) => { const n = new Set(s); n.delete(k); return n; });
          }}
        />
      </div>

      <div className="sec">
        <div className="field">
          <label htmlFor="f-remarks">Remarks</label>
          <textarea id="f-remarks" className="text-input" rows={4} value={remarks} placeholder="Fit preferences, posture, allergies, anything to remember" onChange={(e) => setRemarks(e.target.value)} />
        </div>
        <div className="field">
          <span className="label">Photos</span>
          <PhotoPicker
            id="f-photos"
            existing={existing}
            pending={pending}
            onAdd={(files) => setPending((p) => [...p, ...files])}
            onRemoveExisting={(p) => setRemoved((s) => new Set(s).add(p.id))}
            onRemovePending={(i) => setPending((p) => p.filter((_, j) => j !== i))}
          />
        </div>
      </div>
    </Sheet>
  );
}
