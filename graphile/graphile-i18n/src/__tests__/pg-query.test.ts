import { buildPgSettings } from '@constructive-io/express-context';

import { queryI18nWithContext } from '../pg-query';

const pgSettings = buildPgSettings({
  api: {
    apiId: 'api-1',
    databaseId: 'database-1',
    dbname: 'testdb',
    anonRole: 'anonymous_runtime',
    roleName: 'authenticated_runtime',
    schema: ['i18n_test'],
  },
  token: { user_id: 'user-1' },
  requestId: 'request-1',
});

describe('queryI18nWithContext', () => {
  it('passes the complete settings unchanged and uses the native query contract', async () => {
    const original = { ...pgSettings };
    const query = jest.fn(async () => ({
      rows: [{ lang_code: 'en', title: 'Hello' }],
    }));
    const withPgClient = jest.fn(async (settings, callback) =>
      callback({ query })
    );

    await expect(
      queryI18nWithContext(
        withPgClient,
        pgSettings,
        1,
        'SELECT translation WHERE id = $1 AND lang = ANY($2)',
        [1, ['en']]
      )
    ).resolves.toEqual({ lang_code: 'en', title: 'Hello' });

    expect(withPgClient).toHaveBeenCalledWith(pgSettings, expect.any(Function));
    expect(withPgClient.mock.calls[0][0]).not.toBeNull();
    expect(query).toHaveBeenCalledWith({
      text: 'SELECT translation WHERE id = $1 AND lang = ANY($2)',
      values: [1, ['en']],
    });
    expect(pgSettings).toEqual(original);
  });

  it.each([
    [
      'missing withPgClient',
      undefined,
      pgSettings,
      1,
      'I18N_PG_CLIENT_CONTEXT_UNAVAILABLE',
    ],
    ['missing pgSettings', jest.fn(), undefined, 1, 'i18n pgSettings'],
    [
      'incomplete pgSettings',
      jest.fn(),
      { role: 'anonymous_runtime' },
      1,
      'i18n pgSettings',
    ],
  ])(
    'fails closed for %s',
    async (_label, withPgClient, settings, id, message) => {
      await expect(
        queryI18nWithContext(withPgClient, settings, id, 'SELECT 1', [])
      ).rejects.toThrow(message);
    }
  );

  it('preserves the base-row fallback when the parent id is unavailable', async () => {
    const withPgClient = jest.fn();
    await expect(
      queryI18nWithContext(withPgClient, pgSettings, null, 'SELECT 1', [])
    ).resolves.toBeNull();
    expect(withPgClient).not.toHaveBeenCalled();
  });
});
