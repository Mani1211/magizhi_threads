import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { errorMessage } from '../lib/errors';
import { ms } from '../lib/format';
import { RESERVED_SLUGS, slugify, uniqueSlug } from '../lib/slug';
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
  /** Readable address of a profile, e.g. "/priya-raman". */
  profilePath(profileId: string): string;
  /** Readable address of a garment, e.g. "/priya-raman/maroon-silk-wedding-blouse". */
  garmentPath(garment: Garment): string;
  /** Profile for a URL segment: its slug, or (for old links) its id. */
  findProfile(segment: string): Profile | undefined;
  /** Garment of a profile for a URL segment: its slug or its id. */
  findGarment(profileId: string, segment: string): Garment | undefined;
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

  const slugs = useMemo(() => buildSlugs(state.profiles, state.garments), [state.profiles, state.garments]);

  const value = useMemo<Store>(() => {
    const profilePath = (id: string) => `/${encodeURIComponent(slugs.profile.get(id) ?? id)}`;
    return {
      ...state,
      reload: load, saveProfile, deleteProfile, saveGarment, deleteGarment, addPhotos: uploadMany,
      profilePath,
      garmentPath: (g) => `${profilePath(g.profileId)}/${encodeURIComponent(slugs.garment.get(g.id) ?? g.id)}`,
      findProfile: (segment) => {
        const id = slugs.profileBySlug.get(segment) ?? segment;
        return state.profiles.find((p) => p.id === id);
      },
      findGarment: (profileId, segment) => {
        const id = slugs.garmentBySlug.get(`${profileId}/${segment}`) ?? segment;
        return state.garments.find((g) => g.id === id && g.profileId === profileId);
      },
    };
  }, [state, slugs, load, saveProfile, deleteProfile, saveGarment, deleteGarment, uploadMany]);

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

/**
 * Readable URL names from profile and garment names. Older records keep the plain name when two
 * share it ("priya", then "priya-2"); garment names only need to be unique within their profile.
 */
function buildSlugs(profiles: Profile[], garments: Garment[]) {
  const byAge = <T extends { createdAt: string; id: string }>(a: T, b: T) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1;

  const profile = new Map<string, string>();
  const profileBySlug = new Map<string, string>();
  const takenProfiles = new Set(RESERVED_SLUGS);
  for (const p of [...profiles].sort(byAge)) {
    const slug = uniqueSlug(slugify(p.name, 'profile'), takenProfiles);
    takenProfiles.add(slug);
    profile.set(p.id, slug);
    profileBySlug.set(slug, p.id);
  }

  const garment = new Map<string, string>();
  const garmentBySlug = new Map<string, string>();
  const takenGarments = new Map<string, Set<string>>();
  for (const g of [...garments].sort(byAge)) {
    const taken = takenGarments.get(g.profileId) ?? new Set<string>();
    const slug = uniqueSlug(slugify(g.name, 'garment'), taken);
    taken.add(slug);
    takenGarments.set(g.profileId, taken);
    garment.set(g.id, slug);
    garmentBySlug.set(`${g.profileId}/${slug}`, g.id);
  }
  return { profile, profileBySlug, garment, garmentBySlug };
}
