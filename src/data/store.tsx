import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { errorMessage } from '../lib/errors';
import { ms } from '../lib/format';
import { api } from './api';
import type { Garment, GarmentInput, Photo, PhotoKind, PhotoMeta, Profile, ProfileInput, Snapshot } from './types';

interface State extends Snapshot {
  status: 'loading' | 'ready' | 'error';
  error: string;
}

/** Result of a save that also uploads photos: the record is saved even if some photos fail. */
export interface SaveResult<T> {
  record: T;
  failedUploads: number;
  uploadError: string;
}

interface Store extends State {
  reload(): void;
  saveProfile(args: { id?: string; input: ProfileInput; addFiles: File[]; removePhotos: Photo[] }): Promise<SaveResult<Profile>>;
  deleteProfile(id: string): Promise<void>;
  saveGarment(args: {
    id?: string; input: GarmentInput; addRef: File[]; addFinished: File[]; removePhotos: Photo[];
  }): Promise<SaveResult<Garment>>;
  deleteGarment(id: string): Promise<void>;
  addPhotos(files: File[], meta: PhotoMeta): Promise<{ added: number; failed: number; error: string }>;
}

const Ctx = createContext<Store | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading', error: '', profiles: [], garments: [], photos: [] });
  /** Latest state for async actions that need to read it after awaiting. */
  const latest = useRef(state);
  latest.current = state;

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    api.loadAll().then(
      (snap) => setState({ ...snap, status: 'ready', error: '' }),
      (e) => setState((s) => ({ ...s, status: 'error', error: errorMessage(e) })),
    );
  }, []);

  useEffect(load, [load]);

  /** Uploads one by one so each finished photo appears right away; stops counting on failures but keeps going. */
  const uploadMany = useCallback(async (files: File[], meta: PhotoMeta) => {
    let added = 0, failed = 0, error = '';
    for (const file of files) {
      try {
        const photo = await api.uploadPhoto(file, meta);
        added++;
        setState((s) => ({ ...s, photos: [...s.photos, photo] }));
      } catch (e) {
        failed++;
        error = errorMessage(e);
      }
    }
    return { added, failed, error };
  }, []);

  const removePhotos = useCallback(async (photos: Photo[]) => {
    for (const p of photos) {
      await api.deletePhoto(p);
      setState((s) => ({ ...s, photos: s.photos.filter((x) => x.id !== p.id) }));
    }
  }, []);

  const saveProfile = useCallback<Store['saveProfile']>(async ({ id, input, addFiles, removePhotos: remove }) => {
    const record = id ? await api.updateProfile(id, input) : await api.createProfile(input);
    setState((s) => ({
      ...s,
      profiles: id ? s.profiles.map((p) => (p.id === id ? record : p)) : [...s.profiles, record],
    }));
    await removePhotos(remove);
    const up = await uploadMany(addFiles, { kind: 'profile', profileId: record.id });
    return { record, failedUploads: up.failed, uploadError: up.error };
  }, [removePhotos, uploadMany]);

  const saveGarment = useCallback<Store['saveGarment']>(async ({ id, input, addRef, addFinished, removePhotos: remove }) => {
    const record = id ? await api.updateGarment(id, input) : await api.createGarment(input);
    setState((s) => ({
      ...s,
      garments: id ? s.garments.map((g) => (g.id === id ? record : g)) : [...s.garments, record],
    }));
    await removePhotos(remove);
    const meta = { profileId: record.profileId, garmentId: record.id };
    const a = await uploadMany(addRef, { ...meta, kind: 'reference' });
    const b = await uploadMany(addFinished, { ...meta, kind: 'finished' });
    return { record, failedUploads: a.failed + b.failed, uploadError: b.error || a.error };
  }, [removePhotos, uploadMany]);

  const deleteGarment = useCallback(async (id: string) => {
    await removePhotos(latest.current.photos.filter((p) => p.garmentId === id));
    await api.deleteGarment(id);
    setState((s) => ({ ...s, garments: s.garments.filter((g) => g.id !== id) }));
  }, [removePhotos]);

  const deleteProfile = useCallback(async (id: string) => {
    const { photos, garments } = latest.current;
    await removePhotos(photos.filter((p) => p.profileId === id));
    for (const g of garments.filter((x) => x.profileId === id)) {
      await api.deleteGarment(g.id);
      setState((s) => ({ ...s, garments: s.garments.filter((x) => x.id !== g.id) }));
    }
    await api.deleteProfile(id);
    setState((s) => ({ ...s, profiles: s.profiles.filter((p) => p.id !== id) }));
  }, [removePhotos]);

  const value = useMemo<Store>(() => ({
    ...state, reload: load, saveProfile, deleteProfile, saveGarment, deleteGarment, addPhotos: uploadMany,
  }), [state, load, saveProfile, deleteProfile, saveGarment, deleteGarment, uploadMany]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useData must be used inside <DataProvider>');
  return s;
}

/* ---------- selectors ---------- */

export const garmentsOf = (s: Snapshot, profileId: string) =>
  s.garments.filter((g) => g.profileId === profileId).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));

export const photosOf = (s: Snapshot, f: { profileId?: string; garmentId?: string; kind: PhotoKind }) =>
  s.photos
    .filter((p) => p.kind === f.kind && (!f.profileId || p.profileId === f.profileId) && (!f.garmentId || p.garmentId === f.garmentId))
    .sort((a, b) => ms(a.createdAt) - ms(b.createdAt));

/** Most recent change to a profile, its garments or its photos. */
export function lastTouch(s: Snapshot, p: Profile): string {
  let best = p.updatedAt;
  for (const g of s.garments) if (g.profileId === p.id && g.updatedAt > best) best = g.updatedAt;
  for (const ph of s.photos) if (ph.profileId === p.id && ph.createdAt > best) best = ph.createdAt;
  return best;
}

/** First photo to represent a garment: its newest finished photo, else its first reference photo. */
export function coverPhoto(s: Snapshot, garmentId: string): Photo | undefined {
  const fin = photosOf(s, { garmentId, kind: 'finished' });
  return fin[fin.length - 1] ?? photosOf(s, { garmentId, kind: 'reference' })[0];
}
