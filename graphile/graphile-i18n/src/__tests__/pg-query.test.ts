import type { PgClient } from '@dataplan/pg';

import { queryI18nRow } from '../pg-query';

describe('queryI18nRow', () => {
  it('passes one query configuration object to the @dataplan/pg client', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ lang_code: 'es', title: 'Hola' }],
      rowCount: 1,
      notices: [],
    });
    const client = { query } as unknown as Pick<PgClient, 'query'>;
    const values = [1, ['es', 'en']];

    await expect(queryI18nRow(client, 'SELECT $1, $2', values)).resolves.toEqual({
      lang_code: 'es',
      title: 'Hola',
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]).toHaveLength(1);
    expect(query).toHaveBeenCalledWith({
      text: 'SELECT $1, $2',
      values,
    });
  });

  it('returns null when the translation query has no rows', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0, notices: [] });
    const client = { query } as unknown as Pick<PgClient, 'query'>;

    await expect(queryI18nRow(client, 'SELECT 1', [])).resolves.toBeNull();
  });
});
