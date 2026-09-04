import { GrafastPgClient, SYSTEM_LANE_ROLE, withSystemLaneClient } from '../system-lane';

interface Call {
  text: string;
  values?: unknown[];
}

const makeClient = (): { client: GrafastPgClient; calls: Call[] } => {
  const calls: Call[] = [];
  const client: GrafastPgClient = {
    query: async (opts) => {
      calls.push(opts);
      return { rows: [] };
    }
  };
  return { client, calls };
};

const makeWithPgClient = (client: GrafastPgClient, settings: Array<Record<string, string> | null>) =>
  (<T,>(pgSettings: Record<string, string> | null, cb: (c: GrafastPgClient) => Promise<T>) => {
    settings.push(pgSettings);
    return cb(client);
  }) as <T>(
    pgSettings: Record<string, string> | null,
    cb: (c: GrafastPgClient) => Promise<T>
  ) => Promise<T>;

describe('withSystemLaneClient', () => {
  it('runs the callback in one transaction under a transaction-local role', async () => {
    const { client, calls } = makeClient();
    const settings: Array<Record<string, string> | null> = [];

    const result = await withSystemLaneClient(makeWithPgClient(client, settings), async (tx) => {
      await tx.query({ text: 'SELECT 1' });
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(settings).toEqual([null]);
    expect(calls.map((c) => c.text)).toEqual([
      'BEGIN',
      'SELECT set_config($1, $2, true)',
      'SELECT 1',
      'COMMIT'
    ]);
    expect(calls[1].values).toEqual(['role', SYSTEM_LANE_ROLE]);
  });

  it('honours an explicit role', async () => {
    const { client, calls } = makeClient();

    await withSystemLaneClient(makeWithPgClient(client, []), async (): Promise<null> => null, {
      role: 'anonymous'
    });

    expect(calls[1].values).toEqual(['role', 'anonymous']);
  });

  it('rolls back and rethrows when the callback fails', async () => {
    const { client, calls } = makeClient();

    await expect(
      withSystemLaneClient(makeWithPgClient(client, []), async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(calls.map((c) => c.text)).toEqual([
      'BEGIN',
      'SELECT set_config($1, $2, true)',
      'ROLLBACK'
    ]);
  });

  it('rethrows the original failure when the rollback itself fails', async () => {
    const client: GrafastPgClient = {
      query: async (opts) => {
        if (opts.text === 'ROLLBACK') throw new Error('connection terminated');
        return { rows: [] };
      }
    };

    await expect(
      withSystemLaneClient(makeWithPgClient(client, []), async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
  });
});
