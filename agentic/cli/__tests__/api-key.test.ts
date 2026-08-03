import {
  API_KEY_NAME,
  buildCreateApiKeyInput,
  classifyApiKeyError,
  MintedApiKey,
  needsRemint,
  parseMintedKey,
  remintApiKey,
  REMINT_THRESHOLD_MS
} from '../src/api-key';

describe('buildCreateApiKeyInput', () => {
  it('names the key agentic-cli with full access and no MFA', () => {
    expect(buildCreateApiKeyInput({ years: 5 })).toEqual({
      keyName: API_KEY_NAME,
      accessLevel: 'full_access',
      mfaLevel: 'none',
      expiresIn: { years: 5 }
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

  it('falls back to message text and then unknown', () => {
    expect(classifyApiKeyError(new Error('boom: API_KEY_LIMIT_REACHED'))).toBe('limit-reached');
    expect(classifyApiKeyError(new Error('NOT_AUTHENTICATED'))).toBe('not-authenticated');
    expect(classifyApiKeyError(new Error('nope'))).toBe('unknown');
    expect(classifyApiKeyError(undefined)).toBe('unknown');
  });
});

describe('needsRemint', () => {
  const now = Date.parse('2026-08-03T00:00:00Z');

  it('is false without an expiry or with an unparsable one', () => {
    expect(needsRemint({ apiKeyExpiresAt: undefined, now })).toBe(false);
    expect(needsRemint({ apiKeyExpiresAt: 'garbage', now })).toBe(false);
  });

  it('is true at or inside the 7-day threshold, false outside', () => {
    const at = (deltaMs: number) => new Date(now + deltaMs).toISOString();
    expect(needsRemint({ apiKeyExpiresAt: at(REMINT_THRESHOLD_MS), now })).toBe(true);
    expect(needsRemint({ apiKeyExpiresAt: at(REMINT_THRESHOLD_MS + 1000), now })).toBe(false);
    expect(needsRemint({ apiKeyExpiresAt: at(-1000), now })).toBe(true);
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
    expect(result).toEqual(minted);
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
    expect(result).toEqual(minted);
    expect(calls).toEqual(['mint', 'revoke:old-id', 'mint']);
  });

  it('rethrows non-limit errors without revoking', async () => {
    const revoke = jest.fn();
    await expect(
      remintApiKey({
        currentKeyId: 'old-id',
        revoke,
        mint: async () => {
          throw { errors: [{ extensions: { code: 'STEP_UP_REQUIRED' } }] };
        }
      })
    ).rejects.toBeDefined();
    expect(revoke).not.toHaveBeenCalled();
  });

  it('tolerates a failing revoke', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await remintApiKey({
      currentKeyId: 'old-id',
      revoke: async () => {
        throw new Error('offline');
      },
      mint: async () => minted
    });
    expect(result).toEqual(minted);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
