import type { Measurements } from '../lib/measurements';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Profile {
  id: string;
  name: string;
  phone: string;
  remarks: string;
  body: Measurements;
  createdAt: string;
  updatedAt: string;
}

export interface Garment {
  id: string;
  profileId: string;
  name: string;
  type: string;
  measurements: Measurements;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

/** profile: photos on a customer's profile; reference: design/fabric for a garment; finished: the stitched garment (shown in the Gallery). */
export type PhotoKind = 'profile' | 'reference' | 'finished';

export interface Photo {
  id: string;
  /** Full-size image (max 1600px). */
  fileId: string;
  /** Small image for grids (max 480px). */
  thumbId: string;
  kind: PhotoKind;
  profileId: string;
  garmentId: string | null;
  createdAt: string;
}

export type ProfileInput = Pick<Profile, 'name' | 'phone' | 'remarks' | 'body'>;
export type GarmentInput = Pick<Garment, 'profileId' | 'name' | 'type' | 'measurements' | 'remarks'>;
export interface PhotoMeta { kind: PhotoKind; profileId: string; garmentId?: string | null }

export interface Snapshot {
  profiles: Profile[];
  garments: Garment[];
  photos: Photo[];
}

/** Everything the app needs from a backend. Implemented by Appwrite and by the in-browser demo. */
export interface Api {
  mode: 'appwrite' | 'demo';
  getUser(): Promise<User | null>;
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  loadAll(): Promise<Snapshot>;
  createProfile(input: ProfileInput): Promise<Profile>;
  updateProfile(id: string, input: ProfileInput): Promise<Profile>;
  deleteProfile(id: string): Promise<void>;
  createGarment(input: GarmentInput): Promise<Garment>;
  updateGarment(id: string, input: GarmentInput): Promise<Garment>;
  deleteGarment(id: string): Promise<void>;
  uploadPhoto(file: File, meta: PhotoMeta): Promise<Photo>;
  deletePhoto(photo: Photo): Promise<void>;
  /** Returns a URL the page can put in <img src> (an object URL holding the image). */
  photoUrl(fileId: string): Promise<string>;
}
