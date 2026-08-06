import { lookup } from 'node:dns/promises';

import {
  assertSafeOAuthEndpoint,
  assertSafeOAuthFetchEndpoint,
} from '../src';

jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

const lookupMock = lookup as unknown as jest.Mock;

describe('OAuth provider endpoint policy', () => {
  afterEach(() => jest.resetAllMocks());

  it('rejects a custom hostname that resolves to a private address', async () => {
    lookupMock.mockResolvedValue([{ address: '10.0.0.8', family: 4 }]);

    await expect(
      assertSafeOAuthFetchEndpoint('https://provider.example/token')
    ).rejects.toMatchObject({ code: 'IDENTITY_PROVIDER_NOT_CONFIGURED' });
  });

  it('accepts a custom hostname only when every resolved address is public', async () => {
    lookupMock.mockResolvedValue([
      { address: '142.250.72.14', family: 4 },
      { address: '2607:f8b0:4007:80d::200e', family: 6 },
    ]);

    await expect(
      assertSafeOAuthFetchEndpoint('https://provider.example/token')
    ).resolves.toBeUndefined();
  });

  it('rejects URL credentials and fragments', () => {
    expect(() =>
      assertSafeOAuthEndpoint('https://user:password@provider.example/token')
    ).toThrow(
      expect.objectContaining({ code: 'IDENTITY_PROVIDER_NOT_CONFIGURED' })
    );
    expect(() =>
      assertSafeOAuthEndpoint('https://provider.example/token#secret')
    ).toThrow(
      expect.objectContaining({ code: 'IDENTITY_PROVIDER_NOT_CONFIGURED' })
    );
  });
});
