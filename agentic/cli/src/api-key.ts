export const API_KEY_NAME = 'agentic-cli';
export const API_KEY_ACCESS_LEVEL = 'full_access';
export const API_KEY_MFA_LEVEL = 'none';
export const API_KEY_YEARS = 5;

/**
 * Re-mint once the key is within a week of expiry. The mint needs a
 * fresh-password step-up window, so in practice the refresh succeeds only right
 * after a sign-in; otherwise it surfaces as a re-auth prompt.
 */
export const REMINT_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7;

export interface MintedApiKey {
  apiKey: string;
  keyId: string;
  apiKeyExpiresAt?: string;
}

export interface CreateApiKeyInputShape {
  keyName: string;
  accessLevel: string;
  mfaLevel: string;
  expiresIn: { years: number };
}

export function buildCreateApiKeyInput({ years }: { years: number }): CreateApiKeyInputShape {
  return {
    keyName: API_KEY_NAME,
    accessLevel: API_KEY_ACCESS_LEVEL,
    mfaLevel: API_KEY_MFA_LEVEL,
    expiresIn: { years }
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
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  for (const code of Object.keys(ERROR_CODE_MAP)) {
    if (message.includes(code)) return ERROR_CODE_MAP[code];
  }
  return 'unknown';
}

export function needsRemint({
  apiKeyExpiresAt,
  now,
  thresholdMs = REMINT_THRESHOLD_MS
}: {
  apiKeyExpiresAt: string | undefined;
  now: number;
  thresholdMs?: number;
}): boolean {
  if (!apiKeyExpiresAt) return false;
  const expires = Date.parse(apiKeyExpiresAt);
  if (Number.isNaN(expires)) return false;
  return expires - now <= thresholdMs;
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
}): Promise<MintedApiKey> {
  const revokeOld = async () => {
    if (!currentKeyId) return;
    try {
      await revoke(currentKeyId);
    } catch (err) {
      console.warn(
        `[agent] failed to revoke superseded API key ${currentKeyId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  try {
    const minted = await mint();
    await revokeOld();
    return minted;
  } catch (err) {
    if (classifyApiKeyError(err) !== 'limit-reached') throw err;
    await revokeOld();
    return mint();
  }
}
