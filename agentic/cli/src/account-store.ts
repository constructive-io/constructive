import * as fs from 'fs';
import * as path from 'path';

/** On-disk shape, kept identical to airpage's StoredSession for parity. */
export interface StoredSession {
  userId: string;
  email: string;
  token: string;
  /** Always false in the CLI: the token is stored plaintext, protected by file mode 0600. */
  encrypted: boolean;
  accessTokenExpiresAt?: string;
  apiKey?: string;
  keyId?: string;
  apiKeyExpiresAt?: string;
  signedInAt: number;
}

export interface AccountSession {
  userId: string;
  email: string;
  accessToken: string;
  accessTokenExpiresAt?: string;
  apiKey?: string;
  keyId?: string;
  apiKeyExpiresAt?: string;
  signedInAt: number;
}

function toSession(stored: StoredSession): AccountSession {
  return {
    userId: stored.userId,
    email: stored.email,
    accessToken: stored.token,
    accessTokenExpiresAt: stored.accessTokenExpiresAt,
    apiKey: stored.apiKey,
    keyId: stored.keyId,
    apiKeyExpiresAt: stored.apiKeyExpiresAt,
    signedInAt: stored.signedInAt
  };
}

function toStored(session: AccountSession): StoredSession {
  return {
    userId: session.userId,
    email: session.email,
    token: session.accessToken,
    encrypted: false,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    apiKey: session.apiKey,
    keyId: session.keyId,
    apiKeyExpiresAt: session.apiKeyExpiresAt,
    signedInAt: session.signedInAt
  };
}

export function loadSession(file: string): AccountSession | null {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
  let stored: StoredSession;
  try {
    stored = JSON.parse(raw) as StoredSession;
  } catch {
    try {
      fs.renameSync(file, `${file}.bak`);
    } catch {
      /* best effort */
    }
    return null;
  }
  if (!stored || typeof stored.token !== 'string' || typeof stored.userId !== 'string') {
    return null;
  }
  return toSession(stored);
}

export function saveSession(file: string, session: AccountSession): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(toStored(session), null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, file);
  fs.chmodSync(file, 0o600);
}

export function clearSession(file: string): void {
  try {
    fs.unlinkSync(file);
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
  }
}
