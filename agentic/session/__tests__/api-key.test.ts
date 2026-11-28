import {
  API_KEY_NAME,
  buildCreateApiKeyInput,
  classifyApiKeyError,
  keyEndsSoon,
  MintedApiKey,
  parseMintedKey,
  remintApiKey,
  SIGN_IN_AGAIN_WITHIN_MS
} from '../src/api-key';

describe('buildCreateApiKeyInput', () => {
  it('names the key agentic-cli with full access and no MFA', () => {
    expect(buildCreateApiKeyInput({ days: 30 })).toEqual({
      keyName: API_KEY_NAME,
      accessLevel: 'full_access',
      mfaLevel: 'none',
      expiresIn: { days: 30 }
    });
    expect(API_KEY_NAME).toBe('agentic-cli');
  });
});

describe('parseMintedKey', () => {
  it('returns the minted key and maps expiresAt', () => {
    expect(parseMintedKey({ apiKey: 'k', keyId: 'id', expiresAt: '2031-01-01' })).toEqual({
      apiKey: 'k',
      keyId: 'id',
      apiKeyExpiresAt: '2031-01-01'
    });
    expect(parseMintedKey({ apiKey: 'k', keyId: 'id' })).toEqual({ apiKey: 'k', keyId: 'id' });
  });

  it('throws when the backend returns no secret', () => {
    expect(() => parseMintedKey(undefined)).toThrow('createApiKey returned no API key.');
    expect(() => parseMintedKey({ keyId: 'id' })).toThrow('createApiKey returned no API key.');
  });
});

describe('classifyApiKeyError', () => {
  it('maps extension codes', () => {
    const err = { errors: [{ extensions: { code: 'STEP_UP_REQUIRED' } }] };
    expect(classifyApiKeyError(err)).toBe('step-up-required');
  });

  it('never reads a code out of message text', () => {
    expect(classifyApiKeyError(new Error('boom: API_KEY_LIMIT_REACHED'))).toBe('unknown');
    expect(classifyApiKeyError(new Error('NOT_AUTHENTICATED'))).toBe('unknown');
    expect(classifyApiKeyError(new Error('nope'))).toBe('unknown');
    expect(classifyApiKeyError(undefined)).toBe('unknown');
  });
});

describe('keyEndsSoon', () => {
  const now = Date.parse('2026-08-03T00:00:00Z');

  it('is false without an expiry or with an unparsable one', () => {
    expect(keyEndsSoon({ expiresAt: undefined, now })).toBe(false);
    expect(keyEndsSoon({ expiresAt: 'garbage', now })).toBe(false);
  });

  it('is true at or inside the 7-day window, false outside', () => {
    const at = (deltaMs: number) => new Date(now + deltaMs).toISOString();
    expect(keyEndsSoon({ expiresAt: at(SIGN_IN_AGAIN_WITHIN_MS), now })).toBe(true);
    expect(keyEndsSoon({ expiresAt: at(SIGN_IN_AGAIN_WITHIN_MS + 1000), now })).toBe(false);
    expect(keyEndsSoon({ expiresAt: at(-1000), now })).toBe(true);
  });
});

describe('remintApiKey', () => {
  const minted: MintedApiKey = { apiKey: 'new', keyId: 'new-id' };

  it('mints first, then revokes the old key', async () => {
    const calls: string[] = [];
    const result = await remintApiKey({
      currentKeyId: 'old-id',
      revoke: async keyId => {
        calls.push(`revoke:${keyId}`);
      },
      mint: async () => {
        calls.push('mint');
        return minted;
      }
    });
    expect(result).toEqual({ kind: 'minted', minted, previousKey: { kind: 'revoked', keyId: 'old-id' } });
    expect(calls).toEqual(['mint', 'revoke:old-id']);
  });

  it('on limit-reached, revokes first and retries the mint once', async () => {
    const calls: string[] = [];
    let attempts = 0;
    const result = await remintApiKey({
      currentKeyId: 'old-id',
      revoke: async keyId => {
        calls.push(`revoke:${keyId}`);
      },
      mint: async () => {
        calls.push('mint');
        attempts += 1;
        if (attempts === 1) throw { errors: [{ extensions: { code: 'API_KEY_LIMIT_REACHED' } }] };
        return minted;
      }
    });
    expect(result).toEqual({ kind: 'minted', minted, previousKey: { kind: 'revoked', keyId: 'old-id' } });
    expect(calls).toEqual(['mint', 'revoke:old-id', 'mint']);
  });

  it('keeps the old key on a non-limit error without revoking', async () => {
    const revoke = jest.fn();
    const result = await remintApiKey({
      currentKeyId: 'old-id',
      revoke,
      mint: async () => {
        throw { errors: [{ extensions: { code: 'STEP_UP_REQUIRED' } }] };
      }
    });
    expect(result).toMatchObject({ kind: 'failed', previousKey: { kind: 'kept', keyId: 'old-id' } });
    expect(revoke).not.toHaveBeenCalled();
  });

  it('reports a failing revoke instead of printing it', async () => {
    const result = await remintApiKey({
      currentKeyId: 'old-id',
      revoke: async () => {
        throw new Error('offline');
      },
      mint: async () => minted
    });
    expect(result).toEqual({ kind: 'minted', minted, previousKey: { kind: 'failed', keyId: 'old-id', reason: 'offline' } });
  });
});
