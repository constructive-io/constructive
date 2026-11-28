import { EventEmitter } from 'events';

import { PgClient, registerPgClientFactory } from '../index';

const config = {
  host: 'localhost',
  port: 5432,
  database: 'app',
  user: 'app',
  password: 'x'
} as any;

/** A client that emits events the way node-postgres does, with no server behind it. */
const eventingClient = () =>
  Object.assign(new EventEmitter(), {
    connect: async (): Promise<void> => undefined,
    query: async (): Promise<{ rows: unknown[] }> => ({ rows: [] }),
    end: async (): Promise<void> => undefined
  });

describe('PgClient connection loss', () => {
  afterEach(() => registerPgClientFactory(undefined));

  it('keeps a connection the server ends from throwing out of the client', async () => {
    const raw = eventingClient();
    registerPgClientFactory(() => raw as any);
    const client = new PgClient(config);
    const lost = Object.assign(new Error('terminating connection due to administrator command'), {
      code: '57P01'
    });

    // An EventEmitter throws an 'error' it emits with no listener. node-postgres
    // emits it from a socket callback, where that throw ends the process.
    expect(() => raw.emit('error', lost)).not.toThrow();
    await client.close();
  });

  it('accepts factory clients that do not emit events', async () => {
    registerPgClientFactory(() => ({
      connect: async (): Promise<void> => undefined,
      query: async (): Promise<{ rows: unknown[] }> => ({ rows: [] }),
      end: async (): Promise<void> => undefined
    }));
    const client = new PgClient(config);

    await expect(client.query('SELECT 1')).resolves.toEqual({ rows: [] });
    await client.close();
  });
});
