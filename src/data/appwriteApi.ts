import { Account, AppwriteException, Client, ID, Query, Storage, TablesDB, type Models } from 'appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, BUCKET_ID, DATABASE_ID, TABLES } from '../config';
import { FULL, THUMB, resizeImage } from '../lib/images';
import type { Measurements } from '../lib/measurements';
import type { Api, Garment, GarmentInput, Photo, PhotoKind, PhotoMeta, Profile, ProfileInput, User } from './types';

type ProfileRow = Models.Row & { name: string; phone: string | null; remarks: string | null; body: string | null };
type GarmentRow = Models.Row & {
  profileId: string; name: string; type: string; measurements: string | null; remarks: string | null;
};
type PhotoRow = Models.Row & {
  fileId: string; thumbId: string; kind: string; profileId: string; garmentId: string | null;
};

function parseMeasurements(json: string | null): Measurements {
  if (!json) return {};
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    const out: Measurements = {};
    for (const [k, v] of Object.entries(obj)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

const toProfile = (r: ProfileRow): Profile => ({
  id: r.$id, name: r.name, phone: r.phone ?? '', remarks: r.remarks ?? '', body: parseMeasurements(r.body),
  createdAt: r.$createdAt, updatedAt: r.$updatedAt,
});
const toGarment = (r: GarmentRow): Garment => ({
  id: r.$id, profileId: r.profileId, name: r.name, type: r.type, measurements: parseMeasurements(r.measurements),
  remarks: r.remarks ?? '', createdAt: r.$createdAt, updatedAt: r.$updatedAt,
});
const toPhoto = (r: PhotoRow): Photo => ({
  id: r.$id, fileId: r.fileId, thumbId: r.thumbId, kind: r.kind as PhotoKind, profileId: r.profileId,
  garmentId: r.garmentId || null, createdAt: r.$createdAt,
});
const toUser = (u: Models.User<Models.Preferences>): User => ({ id: u.$id, name: u.name, email: u.email });

export function createAppwriteApi(): Api {
  const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
  const account = new Account(client);
  const db = new TablesDB(client);
  const storage = new Storage(client);

  async function listAll<T extends Models.Row>(tableId: string): Promise<T[]> {
    const out: T[] = [];
    let cursor: string | undefined;
    for (;;) {
      const queries = [Query.limit(500)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const page = await db.listRows<T>({ databaseId: DATABASE_ID, tableId, queries, total: false });
      out.push(...page.rows);
      if (page.rows.length < 500) return out;
      cursor = page.rows[page.rows.length - 1].$id;
    }
  }

  const deleteFileQuietly = (fileId: string) =>
    storage.deleteFile({ bucketId: BUCKET_ID, fileId }).catch((e: unknown) => {
      if (!(e instanceof AppwriteException && e.code === 404)) throw e;
    });

  async function uploadImage(blob: Blob, name: string): Promise<string> {
    const file = await storage.createFile({
      bucketId: BUCKET_ID,
      fileId: ID.unique(),
      file: new File([blob], name, { type: 'image/jpeg' }),
    });
    return file.$id;
  }

  return {
    mode: 'appwrite',

    async getUser() {
      try {
        return toUser(await account.get());
      } catch {
        return null;
      }
    },

    async login(email, password) {
      try {
        await account.createEmailPasswordSession({ email, password });
      } catch (e) {
        // Already signed in on this browser: carry on with that session.
        if (!(e instanceof AppwriteException && e.type === 'user_session_already_exists')) throw e;
      }
      return toUser(await account.get());
    },

    async logout() {
      await account.deleteSession({ sessionId: 'current' }).catch(() => undefined);
    },

    async loadAll() {
      const [profiles, garments, photos] = await Promise.all([
        listAll<ProfileRow>(TABLES.profiles),
        listAll<GarmentRow>(TABLES.garments),
        listAll<PhotoRow>(TABLES.photos),
      ]);
      return { profiles: profiles.map(toProfile), garments: garments.map(toGarment), photos: photos.map(toPhoto) };
    },

    async createProfile(input: ProfileInput) {
      const row = await db.createRow<ProfileRow>({
        databaseId: DATABASE_ID, tableId: TABLES.profiles, rowId: ID.unique(),
        data: { name: input.name, phone: input.phone || null, remarks: input.remarks || null, body: JSON.stringify(input.body) },
      });
      return toProfile(row);
    },

    async updateProfile(id, input) {
      const row = await db.updateRow<ProfileRow>({
        databaseId: DATABASE_ID, tableId: TABLES.profiles, rowId: id,
        data: { name: input.name, phone: input.phone || null, remarks: input.remarks || null, body: JSON.stringify(input.body) },
      });
      return toProfile(row);
    },

    async deleteProfile(id) {
      await db.deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.profiles, rowId: id });
    },

    async createGarment(input: GarmentInput) {
      const row = await db.createRow<GarmentRow>({
        databaseId: DATABASE_ID, tableId: TABLES.garments, rowId: ID.unique(),
        data: {
          profileId: input.profileId, name: input.name, type: input.type,
          measurements: JSON.stringify(input.measurements), remarks: input.remarks || null,
        },
      });
      return toGarment(row);
    },

    async updateGarment(id, input) {
      const row = await db.updateRow<GarmentRow>({
        databaseId: DATABASE_ID, tableId: TABLES.garments, rowId: id,
        data: {
          profileId: input.profileId, name: input.name, type: input.type,
          measurements: JSON.stringify(input.measurements), remarks: input.remarks || null,
        },
      });
      return toGarment(row);
    },

    async deleteGarment(id) {
      await db.deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.garments, rowId: id });
    },

    async uploadPhoto(file: File, meta: PhotoMeta) {
      // Resize one at a time to keep memory low on phones.
      const full = await resizeImage(file, FULL.maxSide, FULL.quality);
      const thumb = await resizeImage(file, THUMB.maxSide, THUMB.quality);
      const fileId = await uploadImage(full, 'photo.jpg');
      let thumbId: string | null = null;
      try {
        thumbId = await uploadImage(thumb, 'thumb.jpg');
        const row = await db.createRow<PhotoRow>({
          databaseId: DATABASE_ID, tableId: TABLES.photos, rowId: ID.unique(),
          data: { fileId, thumbId, kind: meta.kind, profileId: meta.profileId, garmentId: meta.garmentId ?? null },
        });
        return toPhoto(row);
      } catch (e) {
        await Promise.allSettled([deleteFileQuietly(fileId), thumbId ? deleteFileQuietly(thumbId) : Promise.resolve()]);
        throw e;
      }
    },

    async deletePhoto(photo) {
      await db.deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.photos, rowId: photo.id });
      await Promise.allSettled([deleteFileQuietly(photo.fileId), deleteFileQuietly(photo.thumbId)]);
    },

    async photoUrl(fileId) {
      // Fetch through the SDK so the session goes along with the request. A plain <img src>
      // to a private bucket fails on iPhones, where Safari blocks the cross-site session cookie.
      const url = new URL(storage.getFileView({ bucketId: BUCKET_ID, fileId }));
      const data = (await client.call('get', url, {}, {}, 'arrayBuffer')) as ArrayBuffer;
      return URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
    },
  };
}
