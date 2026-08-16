import { queryPgClient } from '../utils/pg-client';

describe('queryPgClient', () => {
  it('uses the native @dataplan/pg query-config contract', async () => {
    const query = jest.fn(async () => ({ rows: [{ id: 1 }], rowCount: 1 }));
    const client = { query };

    await expect(
      queryPgClient<{ id: number }>(
        client as never,
        'UPDATE app.items SET name = $1 RETURNING id',
        ['updated']
      )
    ).resolves.toEqual({ rows: [{ id: 1 }], rowCount: 1 });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith({
      text: 'UPDATE app.items SET name = $1 RETURNING id',
      values: ['updated'],
    });
  });

  it('preserves query failures', async () => {
    const original = new Error('database rejected mutation');
    const client = {
      query: jest.fn(async () => {
        throw original;
      }),
    };

    await expect(
      queryPgClient(client as never, 'DELETE FROM app.items', [])
    ).rejects.toBe(original);
  });
});
