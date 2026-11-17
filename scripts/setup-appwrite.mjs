#!/usr/bin/env node
/**
 * Sets up the Appwrite project for Magizhi Threads. Safe to run again: it only creates what is missing
 * and refreshes permissions on what exists.
 *
 *   npm run setup:appwrite
 *       Creates the "staff" team, the database, the profiles / garments / photos tables and the photos bucket.
 *
 *   npm run setup:user -- --email someone@example.com --password "a-strong-password" --name "Full Name"
 *       Creates a login (or reuses the one with that email) and adds it to the "staff" team.
 *       Only members of "staff" can read or change any data.
 *
 * Needs APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY, read from the environment or from
 * a .env.setup file next to package.json (see .env.setup.example). Never commit the API key.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AppwriteException, Client, Compression, ID, Permission, Query, Role, Storage, TablesDB, TablesDBIndexType, Teams, Users,
} from 'node-appwrite';

/* Must match src/config.ts */
const DATABASE_ID = 'magizhi';
const BUCKET_ID = 'photos';
const TEAM_ID = 'staff';

const SCHEMA = {
  profiles: {
    name: 'Profiles',
    columns: [
      { key: 'name', type: 'varchar', size: 128, required: true },
      { key: 'phone', type: 'varchar', size: 32 },
      { key: 'remarks', type: 'text' },
      { key: 'body', type: 'text' }, // JSON: { measurementKey: inches }
    ],
    indexes: [],
  },
  garments: {
    name: 'Garments',
    columns: [
      { key: 'profileId', type: 'varchar', size: 36, required: true },
      { key: 'name', type: 'varchar', size: 160, required: true },
      { key: 'type', type: 'varchar', size: 32, required: true },
      { key: 'measurements', type: 'text' }, // JSON: { measurementKey: inches }
      { key: 'remarks', type: 'text' },
    ],
    indexes: [{ key: 'by_profile', columns: ['profileId'] }],
  },
  photos: {
    name: 'Photos',
    columns: [
      { key: 'fileId', type: 'varchar', size: 36, required: true },
      { key: 'thumbId', type: 'varchar', size: 36, required: true },
      { key: 'kind', type: 'varchar', size: 16, required: true }, // profile | reference | finished
      { key: 'profileId', type: 'varchar', size: 36, required: true },
      { key: 'garmentId', type: 'varchar', size: 36 },
    ],
    indexes: [
      { key: 'by_profile', columns: ['profileId'] },
      { key: 'by_garment', columns: ['garmentId'] },
      { key: 'by_kind', columns: ['kind'] },
    ],
  },
};

/* ---------- helpers ---------- */

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const log = (message) => console.log(`• ${message}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function exists(fn) {
  try {
    await fn();
    return true;
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) return false;
    throw e;
  }
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const m = argv[i].match(/^--([a-z]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] ?? argv[++i];
  }
  return out;
}

/* ---------- client ---------- */

loadEnvFile(fileURLToPath(new URL('../.env.setup', import.meta.url)));
const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  fail('Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY (copy .env.setup.example to .env.setup and fill it in).');
}

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
const tables = new TablesDB(client);
const storage = new Storage(client);
const teams = new Teams(client);
const users = new Users(client);

const STAFF = Role.team(TEAM_ID);
const PERMISSIONS = [Permission.read(STAFF), Permission.create(STAFF), Permission.update(STAFF), Permission.delete(STAFF)];

/* ---------- commands ---------- */

async function setup() {
  console.log(`Setting up Appwrite project ${APPWRITE_PROJECT_ID} at ${APPWRITE_ENDPOINT}\n`);

  if (await exists(() => teams.get({ teamId: TEAM_ID }))) log('Team “staff” already exists');
  else { await teams.create({ teamId: TEAM_ID, name: 'Staff' }); log('Created team “staff”'); }

  if (await exists(() => tables.get({ databaseId: DATABASE_ID }))) log('Database “magizhi” already exists');
  else { await tables.create({ databaseId: DATABASE_ID, name: 'Magizhi Threads' }); log('Created database “magizhi”'); }

  for (const [tableId, def] of Object.entries(SCHEMA)) {
    const table = { databaseId: DATABASE_ID, tableId, name: def.name, permissions: PERMISSIONS, rowSecurity: false };
    if (await exists(() => tables.getTable({ databaseId: DATABASE_ID, tableId }))) {
      await tables.updateTable(table);
      log(`Table “${tableId}” already exists (permissions refreshed)`);
    } else {
      await tables.createTable(table);
      log(`Created table “${tableId}”`);
    }

    for (const col of def.columns) {
      const ref = { databaseId: DATABASE_ID, tableId, key: col.key };
      if (await exists(() => tables.getColumn(ref))) continue;
      if (col.type === 'varchar') await tables.createVarcharColumn({ ...ref, size: col.size, required: !!col.required });
      else await tables.createTextColumn({ ...ref, required: !!col.required });
      log(`  + column ${tableId}.${col.key}`);
    }

    // Columns are created in the background; indexes need them to be ready.
    for (let tries = 0; ; tries++) {
      const { columns } = await tables.listColumns({ databaseId: DATABASE_ID, tableId });
      const waiting = columns.filter((c) => c.status !== 'available');
      const broken = waiting.filter((c) => c.status === 'failed' || c.status === 'stuck');
      if (broken.length) fail(`Column ${tableId}.${broken[0].key} is “${broken[0].status}”. Delete it in the Appwrite console and run this again.`);
      if (!waiting.length) break;
      if (tries > 60) fail(`Columns of “${tableId}” are still processing. Wait a minute and run this again.`);
      await sleep(1000);
    }

    for (const idx of def.indexes) {
      const ref = { databaseId: DATABASE_ID, tableId, key: idx.key };
      if (await exists(() => tables.getIndex(ref))) continue;
      await tables.createIndex({ ...ref, type: TablesDBIndexType.Key, columns: idx.columns });
      log(`  + index ${tableId}.${idx.key}`);
    }
  }

  const bucket = {
    bucketId: BUCKET_ID,
    name: 'Photos',
    permissions: PERMISSIONS,
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 10 * 1024 * 1024,
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    compression: Compression.None, // photos are already JPEG-compressed by the app
  };
  if (await exists(() => storage.getBucket({ bucketId: BUCKET_ID }))) {
    await storage.updateBucket(bucket);
    log('Bucket “photos” already exists (settings refreshed)');
  } else {
    await storage.createBucket(bucket);
    log('Created bucket “photos”');
  }

  console.log('\n✔ Appwrite is ready. Next, create a login:\n  npm run setup:user -- --email someone@example.com --password "a-strong-password" --name "Full Name"\n');
}

async function addUser({ email, password, name }) {
  if (!email) fail('Pass --email.');
  if (!(await exists(() => teams.get({ teamId: TEAM_ID })))) fail('Run “npm run setup:appwrite” first.');

  const found = await users.list({ queries: [Query.equal('email', email)] });
  let user = found.users[0];
  if (user) {
    log(`Login for ${email} already exists`);
  } else {
    if (!password || password.length < 8) fail('Pass --password with at least 8 characters.');
    user = await users.create({ userId: ID.unique(), email, password, name: name || email.split('@')[0] });
    log(`Created login for ${email}`);
  }

  const memberships = await teams.listMemberships({ teamId: TEAM_ID, queries: [Query.equal('userId', user.$id)] });
  if (memberships.memberships.length) log('Already in team “staff”');
  else { await teams.createMembership({ teamId: TEAM_ID, roles: ['member'], userId: user.$id }); log('Added to team “staff”'); }

  console.log(`\n✔ ${email} can now sign in to Magizhi Threads.\n`);
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (!command) await setup();
  else if (command === 'add-user') await addUser(args(rest));
  else fail(`Unknown command “${command}”. Use no command to set up, or “add-user”.`);
} catch (e) {
  if (e instanceof AppwriteException) {
    if (e.code === 401) fail(`Appwrite refused the API key (${e.message}). Check that the key belongs to this project and has all scopes.`);
    fail(`Appwrite error ${e.code} (${e.type}): ${e.message}`);
  }
  throw e;
}
