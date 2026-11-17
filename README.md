# Magizhi Threads

The measurement book for Magizhi Threads: customer profiles with full-body measurements, the garments stitched for each customer, reference and finished photos, and a gallery of finished work.

- **Profiles:** name, phone, 29 full-body measurements in the shop's sections, remarks and photos.
- **Garments** (Blouse, Kurti, Maxi, Anarkali, Pant): the form shows only the measurements for the chosen type and fills them in from the customer's body measurements. Each garment has remarks, **reference photos** (design, fabric, the customer's sample) and **finished photos** (the stitched garment).
- **Gallery:** every finished photo, newest first, filterable by garment type.
- Measurements are in inches; `14.5`, `14 1/2` and `14½` all work and display as `14½″`.
- Works on phones and can be added to the home screen.
- Readable addresses built from names, e.g. `/priya-raman/maroon-silk-wedding-blouse` (duplicates get `-2`, `-3`; old id links redirect). The host must serve `index.html` for these paths (see Deploy).

Built with React, TypeScript and Vite. [Appwrite](https://appwrite.io) provides sign-in, the database and photo storage.

## Run it locally

Needs Node 20.19 or newer (`nvm install` picks the version in `.nvmrc`). Works on macOS 11 (Big Sur) and later: esbuild is pinned to 0.26.0 in `package.json` because newer esbuild builds need macOS 12.

```bash
nvm install
npm install
npm run dev
```

With no Appwrite settings, `npm run dev` starts in **demo mode**: sample customers, nothing saved, any email and password signs in. To develop against the real Appwrite project, copy `.env.example` to `.env.local` and set `VITE_DEMO=false`.

## One-time Appwrite setup

The app uses the Appwrite project `6afc0780000eec81a7d6` in Singapore (`https://sgp.cloud.appwrite.io/v1`). These two values are public and already in `.env.production`.

1. **Create an API key.** In the Appwrite console, open the project, go to **Overview → Integrations → API keys → Create API key**, select **all scopes**, and copy the secret.
2. **Save it locally.** Copy `.env.setup.example` to `.env.setup` and paste the key after `APPWRITE_API_KEY=`. `.env.setup` is git-ignored; never commit it.
3. **Create the database, tables and photo storage:**
   ```bash
   npm install
   npm run setup:appwrite
   ```
4. **Create a login** (repeat for each person who should have access):
   ```bash
   npm run setup:user -- --email someone@example.com --password "a-strong-password" --name "Full Name"
   ```
   Only members of the `staff` team can see or change data, so an account created any other way has no access.
5. **Allow the website to talk to Appwrite.** In the console, **Overview → Add platform → Web**, add `localhost` (for development) and the website's domain once it is deployed.
6. Optional: delete the API key when you're done; create a new one when you need to add another login.

Running `npm run setup:appwrite` again is safe: it only adds what's missing and refreshes permissions.

## Deploy

Recommended: **Appwrite Sites** in the same Appwrite account.

1. **Sites → Create site → Connect a repository**, pick `Mani1211/magizhi_threads`, branch `main`.
2. Framework **React** (Vite). Install command `npm ci`, build command `npm run build`, output directory `./dist`.
3. Turn on the single-page app fallback so that links like `/p/…` load: set the **fallback file** to `index.html`.
4. Add the site's domain as a Web platform (step 5 above).

Any static host works the same way (build with `npm run build`, serve `dist/`, rewrite unknown paths to `index.html`). The production build reads `.env.production`.

## Changing measurements or garment types

Everything lives in [`src/lib/measurements.ts`](src/lib/measurements.ts):

- `FIELDS` is the full-body list (key, label, group).
- `GARMENT_TYPES` lists each garment type and the measurement keys its form asks for. Maxi, Anarkali and Pant are provisional.
- `SUMMARY` picks the three values shown on a garment's card.

Measurements are stored as JSON keyed by these keys, so adding a field or type needs no database change. In the garment form, "Add another measurement" adds any catalogue field missing from the type's list, or a custom one with its own name (stored as `custom:<name>` and shown under "Other measurements"). Give a new type a colour in `src/styles.css` (`--t-<id>`, in both the light and dark blocks).

## Data model

| Table | Columns |
| --- | --- |
| `profiles` | `name`, `phone`, `remarks`, `body` (JSON measurements) |
| `garments` | `profileId`, `name`, `type`, `measurements` (JSON), `remarks` |
| `photos` | `fileId`, `thumbId`, `kind` (`profile` / `reference` / `finished`), `profileId`, `garmentId` |

Photos are resized in the browser before upload (1600 px full size, 480 px thumbnail, JPEG) and stored in the `photos` bucket. Everything is readable and writable only by the `staff` team. Database `magizhi`, bucket `photos`, team `staff`; see `scripts/setup-appwrite.mjs`.

## Project layout

```
src/
  lib/measurements.ts   measurement catalogue, garment types, inch parsing/formatting
  data/                 Appwrite and demo backends, app state (store.tsx)
  pages/                Profiles, Gallery, profile, garment, sign-in
  forms/                profile and garment forms
  ui/                   shared components
scripts/setup-appwrite.mjs   creates the Appwrite database, tables, bucket, team and logins
```
