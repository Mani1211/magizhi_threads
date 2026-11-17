const env = import.meta.env;

export const APPWRITE_ENDPOINT = env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = env.VITE_APPWRITE_PROJECT_ID || '';

/** Demo mode runs entirely in the browser with sample data and no backend. */
export const DEMO = env.VITE_DEMO === 'true' || !APPWRITE_PROJECT_ID;

/* Appwrite resource IDs. They must match scripts/setup-appwrite.mjs. */
export const DATABASE_ID = 'magizhi';
export const TABLES = { profiles: 'profiles', garments: 'garments', photos: 'photos' } as const;
export const BUCKET_ID = 'photos';
