import * as http from 'http';
import { AddressInfo } from 'net';

import { BackendConfig, backendFromEndpoints, contextNameFor } from '../src/backend-store';

export interface PrincipalCall {
  op: string;
  bearer?: string;
  input: any;
  query: string;
}

interface Key {
  id: string;
  secret: string;
  principalId: string;
  expiresAt: number;
  revoked: boolean;
}

interface Session {
  id: string;
  principalId: string;
  /** The key the token was minted with; revoking the key ends it. */
  keyId?: string;
  access: string;
  accessExpiresAt: number;
  refresh: string;
  revoked: boolean;
}

const DAY_MS = 24 * 3600 * 1000;
const intervalMs = (interval: any): number =>
  ((interval?.years ?? 0) * 365 + (interval?.days ?? 0)) * DAY_MS + (interval?.seconds ?? 0) * 1000;

/**
 * An auth plane that keeps the person's password sign-ins, principals, their
 * keys and their token sessions the way the backend does: a key needs a live
 * password sign-in (a fresh one) and is clamped to the principal's cap
 * (`updatePrincipal`'s `apiKeyMaxDuration`) and to 365 days; a mint with that
 * key gives a 15-minute access token and a refresh token, which it answers
 * whether asked for or not; revoking a key ends the tokens minted with it, and
 * deleting a principal ends its keys and tokens at once.
 */
export class FakePrincipals {
  calls: PrincipalCall[] = [];
  principals = new Map<string, { name: string; useAdminOwner: boolean; entityIds?: string[]; apiKeyMaxDurationMs?: number }>();
  scopes = new Map<string, any>();
  keys: Key[] = [];
  sessions: Session[] = [];
  /** Answer an op with a GraphQL error code (or an HTTP status) instead of its normal behavior. */
  fail: Record<string, { code: string; message?: string } | { status: number } | 'hang'> = {};
  /** Delay before each answer. */
  delayMs = 0;
  /** Hold every answer of `op` until `count` requests of it have arrived, so a test can prove they were in flight together. */
  barrier: { op: string; count: number } | null = null;
  /** What the api plane's `databases` query lists; `ownerId` is whatever the test sets. */
  databases: Array<{ id: string; name: string; ownerId: string; createdAt: string }> = [];
  /** The person's bearers the api plane accepts, beside every live agent access token. */
  personBearers = new Set(['person-access-token', 'person-api-key']);
  /** The person's password, and each sign-in token with whether its session is still live. */
  password = 'pw';
  signIns = new Map<string, boolean>();
  private n = 0;
  private waiting: Array<() => void> = [];

  private server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      const { query = '', variables } = JSON.parse(body || '{}');
      const op = (query.match(/\b(signIn|signOut|createPrincipal|setPrincipalScope|updatePrincipal|createApiKey|revokeApiKey|mintAccessToken|deletePrincipal|currentUser|databases)\b/) ?? [])[1] ?? 'other';
      const bearer = req.headers.authorization?.replace(/^Bearer /, '');
      const input = variables?.input ?? {};
      this.calls.push({ op, bearer, input, query });
      if (this.delayMs) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      if (this.barrier?.op === op) await this.arrive(this.barrier.count);
      const failure = this.fail[op];
      if (failure === 'hang') return;
      if (failure && 'status' in failure) {
        res.statusCode = failure.status;
        res.end('upstream failed');
        return;
      }
      const refused = this.refuses(op, bearer, input);
      const code = failure && 'code' in failure ? failure.code : refused;
      const message = failure && 'code' in failure ? (failure.message ?? code) : code;
      const answer = code ? { errors: [{ message, extensions: { code } }] } : { data: this.handle(op, input, bearer) };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(answer));
    });
  });

  endpoint = '';

  private arrive(count: number): Promise<void> {
    return new Promise((resolve) => {
      this.waiting.push(resolve);
      if (this.waiting.length >= count) for (const release of this.waiting.splice(0)) release();
    });
  }

  private id(prefix: string): string {
    this.n += 1;
    return `${prefix}-${this.n}`;
  }

  private liveKey(secret: string | undefined): Key | undefined {
    const key = this.keys.find((k) => k.secret === secret);
    return key && !key.revoked && key.expiresAt > Date.now() && this.principals.has(key.principalId) ? key : undefined;
  }

  /** The error code the backend answers for a credential it does not accept here, if any. */
  private refuses(op: string, bearer: string | undefined, input: any): string | undefined {
    const fresh = !!bearer && this.signIns.get(bearer) === true;
    const person = fresh || (!!bearer && this.personBearers.has(bearer));
    if (op === 'databases') return person || (bearer && this.live(bearer)) ? undefined : 'UNAUTHENTICATED';
    if (op === 'signOut') return fresh ? undefined : 'UNAUTHENTICATED';
    if (op === 'createApiKey') return fresh ? undefined : person ? 'STEP_UP_REQUIRED_FRESH_AUTH' : 'UNAUTHENTICATED';
    if (['createPrincipal', 'setPrincipalScope', 'updatePrincipal', 'deletePrincipal', 'revokeApiKey'].includes(op)) return person ? undefined : 'UNAUTHENTICATED';
    if (op === 'mintAccessToken') {
      if (person) return undefined;
      const key = this.liveKey(bearer);
      if (!key) return 'UNAUTHENTICATED';
      return key.principalId === input.principalId ? undefined : 'PRINCIPAL_NOT_FOUND';
    }
    return undefined;
  }

  private handle(op: string, input: any, bearer?: string): unknown {
    switch (op) {
    case 'signIn': {
      if (input.password !== this.password) return { signIn: { result: null } };
      const token = this.id('person-signin');
      this.signIns.set(token, true);
      return { signIn: { result: { userId: 'person-1', accessToken: token, accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(), mfaRequired: false } } };
    }
    case 'signOut':
      this.signIns.set(bearer, false);
      return { signOut: { clientMutationId: null } };
    case 'revokeApiKey': {
      const key = this.keys.find((k) => k.id === input.keyId);
      if (key) key.revoked = true;
      for (const s of this.sessions) if (key && s.keyId === key.id) s.revoked = true;
      return { revokeApiKey: { result: !!key } };
    }
    case 'createPrincipal': {
      const id = this.id('principal-user');
      this.principals.set(id, { name: input.name, useAdminOwner: input.useAdminOwner, entityIds: input.entityIds });
      return { createPrincipal: { result: id } };
    }
    case 'setPrincipalScope':
      this.scopes.set(`${input.principalId}:${input.membershipType}`, input);
      return { setPrincipalScope: { result: true } };
    case 'updatePrincipal': {
      const principal = this.principals.get(input.principalId);
      if (!principal) return { updatePrincipal: { result: false } };
      if (input.apiKeyMaxDuration) principal.apiKeyMaxDurationMs = intervalMs(input.apiKeyMaxDuration);
      return { updatePrincipal: { result: true } };
    }
    case 'createApiKey': {
      const cap = this.principals.get(input.principalId)?.apiKeyMaxDurationMs ?? Infinity;
      const ms = Math.min(input.expiresIn ? intervalMs(input.expiresIn) : 90 * DAY_MS, 365 * DAY_MS, cap);
      const key: Key = { id: this.id('key'), secret: this.id('cnc_live_sk_fake'), principalId: input.principalId, expiresAt: Date.now() + ms, revoked: false };
      this.keys.push(key);
      return { createApiKey: { result: { apiKey: key.secret, keyId: key.id, expiresAt: new Date(key.expiresAt).toISOString() } } };
    }
    case 'mintAccessToken': {
      const ttl = input.accessTtl?.seconds ?? 900;
      const session: Session = {
        id: this.id('session'),
        principalId: input.principalId,
        keyId: this.liveKey(bearer)?.id,
        access: this.id('cnc_live_at_fake'),
        accessExpiresAt: Date.now() + ttl * 1000,
        refresh: this.id('cnc_live_rt_fake'),
        revoked: false
      };
      this.sessions.push(session);
      return {
        mintAccessToken: {
          result: {
            accessToken: session.access,
            refreshToken: session.refresh,
            sessionId: session.id,
            principalUserId: session.principalId,
            accessExpiresAt: new Date(session.accessExpiresAt).toISOString(),
            refreshExpiresAt: new Date(Date.now() + 30 * DAY_MS).toISOString()
          }
        }
      };
    }
    case 'deletePrincipal':
      if (!this.principals.delete(input.principalId)) return null;
      for (const s of this.sessions) if (s.principalId === input.principalId) s.revoked = true;
      for (const k of this.keys) if (k.principalId === input.principalId) k.revoked = true;
      return { deletePrincipal: { result: true } };
    case 'databases':
      return { databases: { nodes: this.databases } };
    case 'currentUser':
      return { currentUser: bearer && this.live(bearer) ? { id: 'person-1' } : null };
    default:
      return {};
    }
  }

  /** Whether an access token would be accepted now. */
  live(access: string): boolean {
    const s = this.sessions.find((x) => x.access === access);
    return !!s && !s.revoked && s.accessExpiresAt > Date.now() && this.principals.has(s.principalId);
  }

  /** How many password sign-in sessions are still live. */
  liveSignIns(): number {
    return [...this.signIns.values()].filter(Boolean).length;
  }

  /** Whether a principal's key would be accepted now. */
  keyLive(secret: string): boolean {
    return !!this.liveKey(secret);
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.endpoint = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/graphql`;
  }

  async stop(): Promise<void> {
    for (const release of this.waiting.splice(0)) release();
    this.server.closeAllConnections();
    await new Promise((resolve) => this.server.close(resolve));
  }

  backend(): BackendConfig {
    const ep = this.endpoint;
    return backendFromEndpoints({ api: ep, auth: ep, modules: ep, agent: ep, compute: ep });
  }

  context(): string {
    return contextNameFor(this.backend());
  }

  ops(): string[] {
    return this.calls.map((call) => call.op);
  }
}
