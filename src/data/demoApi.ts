import { FULL, THUMB, resizeImage } from '../lib/images';
import { GARMENT_TYPES, LENGTH_KEYS, type Measurements } from '../lib/measurements';
import { garmentSvg, swatchSvg } from './demoArt';
import type { Api, Garment, Photo, PhotoKind, Profile, Snapshot, User } from './types';

const DAY = 864e5;
const DEMO_USER: User = { id: 'demo', name: 'Demo', email: 'demo@example.com' };
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const iso = (t = Date.now()) => new Date(t).toISOString();
const wait = (msDelay = 120) => new Promise((r) => setTimeout(r, msDelay));
const clone = <T,>(v: T): T => structuredClone(v);

type Art = ['swatch' | 'garment', string, string, string, Parameters<typeof swatchSvg>[2]];

function seed(blobs: Map<string, Blob>): Snapshot {
  const now = Date.now();
  const base: Measurements = {
    full_length: 54, shoulder_full: 14.5, shoulder_front: 14, shoulder_back: 14.5, neck_round: 14, neck_front: 7, neck_back: 6, apex: 10, apex_to_apex: 7.5,
    chest_upper: 34, chest_mid: 36, chest_under: 30, waist: 30, bottom_length: 38, waist_mid: 32, seat: 38, thighs: 22, knees: 15, ankle: 10, armhole: 16, armhole_length: 8,
    elbow: 11, cuff: 9, sleeve_length: 22, sleeve_5: 12, sleeve_8: 11, sleeve_10: 10.5, sh_waist: 15, sh_seat: 23, sh_apex: 10,
  };
  const scale: Record<string, number> = { neck_round: .3, chest_upper: 1, chest_mid: 1, chest_under: .9, waist: 1, waist_mid: 1, seat: 1, thighs: .5,
    knees: .25, ankle: .15, armhole: .4, armhole_length: .15, elbow: .25, cuff: .2, sleeve_5: .35, sleeve_8: .3, sleeve_10: .3 };
  const body = (delta: number): Measurements =>
    Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round((v + (scale[k] ?? 0) * delta) * 4) / 4]));
  const lengths: Record<string, Measurements> = {
    blouse: { full_length: 14.5, sleeve_length: 6 }, kurti: { full_length: 42, sleeve_length: 16 },
    maxi: { full_length: 54, sleeve_length: 21 }, anarkali: { full_length: 50, sleeve_length: 18 }, pant: {},
  };
  const out: Snapshot = { profiles: [], garments: [], photos: [] };

  const addPhoto = (art: Art, kind: PhotoKind, profileId: string, garmentId: string | null, at: number) => {
    const svg = art[0] === 'swatch' ? swatchSvg(art[2], art[3], art[4]) : garmentSvg(art[1], art[2], art[3], art[4]);
    const id = rid();
    blobs.set(id, new Blob([svg], { type: 'image/svg+xml' }));
    out.photos.push({ id: rid(), fileId: id, thumbId: id, kind, profileId, garmentId, createdAt: iso(at) });
  };
  const P = (name: string, phone: string, delta: number, days: number, remarks: string) => {
    const p: Profile = { id: rid(), name, phone, remarks, body: body(delta), createdAt: iso(now - days * DAY), updatedAt: iso(now - days * DAY) };
    out.profiles.push(p);
    return p;
  };
  const G = (p: Profile, type: string, name: string, days: number, x: { remarks?: string; meas?: Measurements; ref?: Art[]; fin?: Art[] } = {}) => {
    const keys = GARMENT_TYPES.find((t) => t.id === type)!.keys;
    const m: Measurements = {};
    for (const k of keys) if (!LENGTH_KEYS.has(k) && p.body[k] != null) m[k] = p.body[k];
    Object.assign(m, lengths[type], x.meas);
    const created = now - days * DAY;
    const done = Math.min(now - 3600e3, created + 4 * DAY);
    const g: Garment = { id: rid(), profileId: p.id, name, type, measurements: m, remarks: x.remarks ?? '',
      createdAt: iso(created), updatedAt: iso(x.fin ? done : created) };
    out.garments.push(g);
    x.ref?.forEach((a) => addPhoto(a, 'reference', p.id, g.id, created));
    x.fin?.forEach((a) => addPhoto(a, 'finished', p.id, g.id, done));
  };

  const priya = P('Priya Raman', '98400 12345', 0, 240, 'Prefers a deep back neck and princess-cut blouses.\nUse cloth hooks only — reacts to metal hooks.');
  G(priya, 'blouse', 'Maroon silk wedding blouse', 3, { meas: { neck_front: 8.5, neck_back: 9 }, remarks: 'Deep back neck with tassel tie.\nLining given by customer.',
    ref: [['swatch', '', '#7A1631', '#D4A537', 'zari'], ['swatch', '', '#E9D3C0', '#7A1631', 'floral']] });
  G(priya, 'kurti', 'Navy cotton office kurti', 21, { remarks: 'Side slit 9″. Pockets on both sides.',
    ref: [['swatch', '', '#1F2F5C', '#E9EDF5', 'stripe']], fin: [['garment', 'kurti', '#1F2F5C', '#E9EDF5', 'stripe']] });
  G(priya, 'blouse', 'Mustard pattu blouse', 46, { meas: { sleeve_length: 9 },
    ref: [['swatch', '', '#D39B1C', '#7A1631', 'zari']], fin: [['garment', 'blouse', '#D39B1C', '#7A1631', 'zari']] });
  const divya = P('Divya Shankar', '99620 55871', 2, 120, 'Likes fitted sleeves. Usually brings her own fabric.');
  G(divya, 'anarkali', 'Teal reception anarkali', 8, { remarks: '24 kalis. Can-can attached separately.',
    ref: [['swatch', '', '#0F6E6A', '#E2C15B', 'floral']], fin: [['garment', 'anarkali', '#0F6E6A', '#E2C15B', 'floral']] });
  const anitha = P('Anitha Kumar', '90030 47712', 1, 75, 'Needs feeding zips in kurtis and maxis.');
  G(anitha, 'maxi', 'Printed rayon maxi', 5, { remarks: 'Feeding zips on both sides. Full sleeves.',
    ref: [['swatch', '', '#2E3F7A', '#F0B4A0', 'floral']], fin: [['garment', 'maxi', '#2E3F7A', '#F0B4A0', 'floral']] });
  G(anitha, 'pant', 'Black straight-cut pant', 40, { fin: [['garment', 'pant', '#26262A', '#4A4A50', 'check']] });
  P('Meera Iyer', '98841 66302', -1, 2, 'First order next week: two blouses for a family wedding in January.');
  return out;
}

/** In-browser backend with sample data. Nothing is saved: a reload starts fresh. */
export function createDemoApi(): Api {
  const blobs = new Map<string, Blob>();
  const db = seed(blobs);
  let signedIn = true;
  const touch = <T extends { updatedAt: string }>(o: T) => ({ ...o, updatedAt: iso() });

  return {
    mode: 'demo',
    async getUser() { await wait(60); return signedIn ? DEMO_USER : null; },
    async login(email) { await wait(300); signedIn = true; return { ...DEMO_USER, email }; },
    async logout() { signedIn = false; },
    async loadAll() { await wait(300); return clone(db); },

    async createProfile(input) {
      await wait();
      const p: Profile = { id: rid(), ...clone(input), createdAt: iso(), updatedAt: iso() };
      db.profiles.push(p);
      return clone(p);
    },
    async updateProfile(id, input) {
      await wait();
      const i = db.profiles.findIndex((p) => p.id === id);
      db.profiles[i] = touch({ ...db.profiles[i], ...clone(input) });
      return clone(db.profiles[i]);
    },
    async deleteProfile(id) { await wait(); db.profiles = db.profiles.filter((p) => p.id !== id); },

    async createGarment(input) {
      await wait();
      const g: Garment = { id: rid(), ...clone(input), createdAt: iso(), updatedAt: iso() };
      db.garments.push(g);
      return clone(g);
    },
    async updateGarment(id, input) {
      await wait();
      const i = db.garments.findIndex((g) => g.id === id);
      db.garments[i] = touch({ ...db.garments[i], ...clone(input) });
      return clone(db.garments[i]);
    },
    async deleteGarment(id) { await wait(); db.garments = db.garments.filter((g) => g.id !== id); },

    async uploadPhoto(file, meta) {
      const fileId = rid(), thumbId = rid();
      blobs.set(fileId, await resizeImage(file, FULL.maxSide, FULL.quality));
      blobs.set(thumbId, await resizeImage(file, THUMB.maxSide, THUMB.quality));
      await wait(200);
      const photo: Photo = { id: rid(), fileId, thumbId, kind: meta.kind, profileId: meta.profileId, garmentId: meta.garmentId ?? null, createdAt: iso() };
      db.photos.push(photo);
      return clone(photo);
    },
    async deletePhoto(photo) {
      await wait();
      db.photos = db.photos.filter((p) => p.id !== photo.id);
      blobs.delete(photo.fileId);
      blobs.delete(photo.thumbId);
    },
    async photoUrl(fileId) {
      const b = blobs.get(fileId);
      if (!b) throw new Error('Photo not found');
      return URL.createObjectURL(b);
    },
  };
}
