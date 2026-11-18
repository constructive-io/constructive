// The project's database as its .env names it. The plan card and the
// provision step both read it here, so the card names the database that
// provision asks for. The pipeline reads the db-tools project context only
// through this file too (`projectContext`), apart from the db-tools calls it
// makes, which read it themselves.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { readEnv } from '@agentic-kit/db-tools';
import { fromEnvFile, resolveProjectContext } from '@agentic-kit/db-tools/context';
import { recordedTicket } from '@agentic-kit/db-tools/provision-database/pending-ticket';

/** The project's db-tools context, read from its .env (`resolveProjectContext`). */
export const projectContext: typeof resolveProjectContext = (cwd, options) =>
  resolveProjectContext(cwd, options);

/** The project's db-tools context; throws db-tools' reason, else `missing`, when it has none. */
export async function requireProjectContext(cwd: string, missing = '') {
  const { context, reason } = await projectContext(cwd);
  if (!context) throw new Error(reason || missing);
  return context;
}

/** A database name from a folder or app name: lowercase, dashes, a letter first. */
export function databaseNameFor(seed: string): string {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, '');
  return (slug || 'app').slice(0, 40).replace(/-+$/, '');
}

/** The database the project's .env is bound to, read without a request, or null. */
export async function boundDatabaseName(cwd: string): Promise<string | null> {
  const source = await fromEnvFile(cwd);
  if (!source) return null;
  const read = (name: string) => (typeof source === 'function' ? source(name) : source[name]);
  return read('CONSTRUCTIVE_DATABASE_NAME') || read('DATABASE_NAME') || null;
}

/** The bound database, else the name provision gives a new one: the project folder's. */
export async function projectDatabaseName(cwd: string): Promise<{ name: string; bound: boolean }> {
  const bound = await boundDatabaseName(cwd).catch((): null => null);
  return bound
    ? { name: bound, bound: true }
    : { name: databaseNameFor(path.basename(cwd)), bound: false };
}

// A .env key whose value is a credential: a token, a key, a password.
const SECRET_KEY = /TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|BEARER|CREDENTIAL|PRIVATE/i;

/** The project's .env values that are credentials, for the build details' redaction; none when it can't be read. */
export async function envSecrets(cwd: string): Promise<string[]> {
  const source = await fromEnvFile(cwd).catch((): null => null);
  if (!source || typeof source === 'function') return [];
  return Object.entries(source)
    .filter(
      ([key, value]) => SECRET_KEY.test(key) && typeof value === 'string' && value.length >= 4,
    )
    .map(([, value]) => value as string);
}

/** The name of a database whose creation .env still records as pending; null when there is none. */
export async function pendingDatabaseName(cwd: string): Promise<string | null> {
  const env = readEnv(await readFile(path.join(cwd, '.env'), 'utf8').catch(() => ''));
  return recordedTicket(env)?.databaseName ?? null;
}
