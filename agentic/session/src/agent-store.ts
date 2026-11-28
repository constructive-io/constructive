import type { ConfigStore } from 'appstash';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { checkContextName, ContextNameError, issuedForOf, storeDirs } from './account-store';
import type { BackendConfig } from './backend-store';

/**
 * The stored credential of one agent: a principal of the person, filed under
 * the person's context, bound to the five endpoints it was issued for, and the
 * principal's own API key, which this package uses only to mint access tokens.
 * The backend accepts the key itself on requests too, so it is kept in one 0600
 * file per agent.
 */
export interface AgentRecord {
  name: string;
  context: string;
  /** The principal's user id, which every principal call takes. */
  principalId: string;
  /** The person's user id: the account id every request names. */
  ownerId: string;
  organization?: string;
  schemaChanges: boolean;
  createdAt: string;
  issuedFor: BackendConfig;
  apiKey: string;
  keyId: string;
  keyExpiresAt: string;
}

/** An access token minted with the agent's key, cached beside it. `keyId` names the key that minted it. */
export interface CachedToken {
  keyId: string;
  accessToken: string;
  accessExpiresAt: string;
}

export class AgentNameError extends Error {
  constructor(
    readonly value: string,
    reason = 'An agent name has 1 to 100 characters: lower-case letters, digits, ".", "-" and "_", starting with a letter or a digit, with no "..".'
  ) {
    super(`"${value.length > 120 ? `${value.slice(0, 120)}…` : value}" is not a valid agent name. ${reason}`);
    this.name = 'AgentNameError';
  }
}

/**
 * An agent name is the stem of a file in the store, so it follows the
 * context-name rule, and it may not end like the store's own files.
 */
export function checkAgentName(name: string): string {
  try {
    checkContextName(name);
  } catch (err) {
    if (err instanceof ContextNameError) throw new AgentNameError(err.value);
    throw err;
  }
  if (name.endsWith('.json')) {
    throw new AgentNameError(name, 'It ends in ".json", so it reads like a file of the store (an agent record). Leave out the ending.');
  }
  return name;
}

const agentDir = (store: ConfigStore, context: string) => path.join(storeDirs(store).config, 'agents', checkContextName(context));
const tokenDir = (store: ConfigStore, context: string) => path.join(storeDirs(store).cache, 'agents', checkContextName(context));

export const agentFile = (store: ConfigStore, context: string, name: string) => path.join(agentDir(store, context), `${checkAgentName(name)}.json`);
const tokenFile = (store: ConfigStore, context: string, name: string) => path.join(tokenDir(store, context), `${checkAgentName(name)}.json`);

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  fs.chmodSync(path.dirname(dir), 0o700);
}

/**
 * Write `content` with mode 0600 through a temporary file, so a reader sees the
 * old file or the new one, never half of one. `create` fails with EEXIST when
 * the file exists (a hard link never replaces), so of two creates one wins.
 */
function writeAtomic(file: string, content: string, mode: 'create' | 'replace'): void {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try {
    fs.writeSync(fd, content);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    if (mode === 'create') fs.linkSync(tmp, file);
    else fs.renameSync(tmp, file);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** Whether a record file exists under the name, readable or not. */
export function agentEntryExists(store: ConfigStore, context: string, name: string): boolean {
  return fs.existsSync(agentFile(store, context, name));
}

/** A record file that does not parse, or lacks what an agent record holds: an edit by hand, since the store writes it atomically. */
export class AgentRecordUnreadable extends Error {
  constructor(
    readonly file: string,
    problem: string
  ) {
    super(`The stored record of the agent (${file}) ${problem}, so its credential cannot be used.`);
    this.name = 'AgentRecordUnreadable';
  }
}

const RECORD_TEXT = ['name', 'context', 'principalId', 'ownerId', 'createdAt', 'apiKey', 'keyId', 'keyExpiresAt'] as const;

function isRecord(value: unknown): value is AgentRecord {
  const r = value as Record<string, unknown> | null;
  return (
    !!r &&
    typeof r === 'object' &&
    RECORD_TEXT.every((key) => typeof r[key] === 'string' && r[key] !== '') &&
    typeof r.schemaChanges === 'boolean' &&
    !!issuedForOf(r.issuedFor)
  );
}

export function readAgent(store: ConfigStore, context: string, name: string): AgentRecord | null {
  const file = agentFile(store, context, name);
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (err) {
    throw new AgentRecordUnreadable(file, `is not valid JSON (${(err as Error).message})`);
  }
  if (!isRecord(value)) throw new AgentRecordUnreadable(file, 'lacks the principal, the key or the backend of an agent');
  return value;
}

/** Store a new agent; throws an error with code EEXIST when an agent of that name is stored already. */
export function createAgentEntry(store: ConfigStore, record: AgentRecord): void {
  writeAtomic(agentFile(store, record.context, record.name), JSON.stringify(record, null, 2), 'create');
}

export function writeAgent(store: ConfigStore, record: AgentRecord): void {
  writeAtomic(agentFile(store, record.context, record.name), JSON.stringify(record, null, 2), 'replace');
}

/** Delete the agent's cached token. */
export function dropCachedToken(store: ConfigStore, context: string, name: string): void {
  fs.rmSync(tokenFile(store, context, name), { force: true });
}

/** Delete the agent's record and its cached token. */
export function deleteAgent(store: ConfigStore, context: string, name: string): void {
  fs.rmSync(agentFile(store, context, name), { force: true });
  dropCachedToken(store, context, name);
}

/** The names of the agents stored under `context`, valid names only, sorted. */
export function listAgentNames(store: ConfigStore, context: string): string[] {
  let files: string[];
  try {
    files = fs.readdirSync(agentDir(store, context));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  return files
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -'.json'.length))
    .filter((name) => {
      try {
        checkAgentName(name);
        return true;
      } catch {
        return false;
      }
    })
    .sort();
}

/** The cached token, or null when there is none or it does not parse: a missing cache only costs one more mint. */
export function readCachedToken(store: ConfigStore, context: string, name: string): CachedToken | null {
  let value: Partial<CachedToken>;
  try {
    value = JSON.parse(fs.readFileSync(tokenFile(store, context, name), 'utf8'));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT' || err instanceof SyntaxError) return null;
    throw err;
  }
  return typeof value?.keyId === 'string' && typeof value.accessToken === 'string' && typeof value.accessExpiresAt === 'string' ? (value as CachedToken) : null;
}

/**
 * Cache a minted token. Processes write it without a lock: a token may be used
 * many times, so when two write at once, the one renamed last stays, and the
 * other process's token still works until it ends.
 */
export function writeCachedToken(store: ConfigStore, context: string, name: string, token: CachedToken): void {
  writeAtomic(tokenFile(store, context, name), JSON.stringify(token), 'replace');
}
