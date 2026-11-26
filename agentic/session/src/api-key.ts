export const API_KEY_NAME = 'agentic-cli';
export const API_KEY_ACCESS_LEVEL = 'full_access';
export const API_KEY_MFA_LEVEL = 'none';
export const API_KEY_DAYS = 30;

/**
 * Ask the person to sign in again once their key is within a week of its end.
 * A new key needs a fresh password sign-in, which mints one, so nothing renews
 * a key on its own.
 */
export const SIGN_IN_AGAIN_WITHIN_MS = 1000 * 60 * 60 * 24 * 7;

export interface MintedApiKey {
  apiKey: string;
  keyId: string;
  apiKeyExpiresAt?: string;
}

export interface CreateApiKeyInputShape {
  keyName: string;
  accessLevel: string;
  mfaLevel: string;
  expiresIn: { days: number };
}

export function buildCreateApiKeyInput({ days }: { days: number }): CreateApiKeyInputShape {
  return {
    keyName: API_KEY_NAME,
    accessLevel: API_KEY_ACCESS_LEVEL,
    mfaLevel: API_KEY_MFA_LEVEL,
    expiresIn: { days }
  };
}

interface RawApiKeyRecord {
  apiKey?: string | null;
  keyId?: string | null;
  expiresAt?: string | null;
}

export function parseMintedKey(record: RawApiKeyRecord | null | undefined): MintedApiKey {
  if (!record?.apiKey || !record.keyId) {
    throw new Error('createApiKey returned no API key.');
  }
  return {
    apiKey: record.apiKey,
    keyId: record.keyId,
    ...(record.expiresAt ? { apiKeyExpiresAt: record.expiresAt } : {})
  };
}

export type ApiKeyErrorKind =
  | 'step-up-required'
  | 'disabled'
  | 'limit-reached'
  | 'not-authenticated'
  | 'invalid-access-level'
  | 'unknown';

const ERROR_CODE_MAP: Record<string, ApiKeyErrorKind> = {
  STEP_UP_REQUIRED: 'step-up-required',
  API_KEYS_DISABLED: 'disabled',
  API_KEY_LIMIT_REACHED: 'limit-reached',
  NOT_AUTHENTICATED: 'not-authenticated',
  INVALID_ACCESS_LEVEL: 'invalid-access-level'
};

export function classifyApiKeyError(err: unknown): ApiKeyErrorKind {
  const errors = (err as { errors?: Array<{ message?: string; extensions?: { code?: string } }> })?.errors;
  if (Array.isArray(errors)) {
    for (const e of errors) {
      const code = e.extensions?.code;
      if (code && ERROR_CODE_MAP[code]) return ERROR_CODE_MAP[code];
    }
  }
  return 'unknown';
}

/** Whether a key that ends at `expiresAt` has ended or ends within `withinMs`, so the person should sign in again. */
export function keyEndsSoon({
  expiresAt,
  now = Date.now(),
  withinMs = SIGN_IN_AGAIN_WITHIN_MS
}: {
  expiresAt: string | undefined;
  now?: number;
  withinMs?: number;
}): boolean {
  if (!expiresAt) return false;
  const expires = Date.parse(expiresAt);
  if (Number.isNaN(expires)) return false;
  return expires - now <= withinMs;
}

/** What happened to the key a new one replaces. */
export type KeyRevocation =
  | { kind: 'absent' }
  | { kind: 'revoked'; keyId: string }
  | { kind: 'failed'; keyId: string; reason: string };

/** The replaced key after a remint; `kept` means it is still valid because no new key was minted. */
export type PreviousKey = KeyRevocation | { kind: 'kept'; keyId: string };

export type RemintResult =
  | { kind: 'minted'; minted: MintedApiKey; previousKey: KeyRevocation }
  | { kind: 'failed'; error: unknown; previousKey: PreviousKey };

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Revoke `keyId`; never throws. */
export async function revokeKey(keyId: string | undefined, revoke: (keyId: string) => Promise<void>): Promise<KeyRevocation> {
  if (!keyId) return { kind: 'absent' };
  try {
    await revoke(keyId);
    return { kind: 'revoked', keyId };
  } catch (err) {
    return { kind: 'failed', keyId, reason: errorText(err) };
  }
}

/**
 * Mint-first, revoke-on-success: revoking before minting would destroy a
 * still-valid key whenever the mint then fails, leaving no credential at all.
 * The one case that needs the old key gone first is the live-key cap
 * (API_KEY_LIMIT_REACHED): there we revoke, then retry the mint once.
 */
export async function remintApiKey({
  currentKeyId,
  revoke,
  mint
}: {
  currentKeyId: string | undefined;
  revoke: (keyId: string) => Promise<void>;
  mint: () => Promise<MintedApiKey>;
}): Promise<RemintResult> {
  try {
    const minted = await mint();
    return { kind: 'minted', minted, previousKey: await revokeKey(currentKeyId, revoke) };
  } catch (err) {
    const kept: PreviousKey = currentKeyId ? { kind: 'kept', keyId: currentKeyId } : { kind: 'absent' };
    if (classifyApiKeyError(err) !== 'limit-reached' || !currentKeyId) return { kind: 'failed', error: err, previousKey: kept };
    const previousKey = await revokeKey(currentKeyId, revoke);
    try {
      return { kind: 'minted', minted: await mint(), previousKey };
    } catch (retryErr) {
      return { kind: 'failed', error: retryErr, previousKey };
    }
  }
}
