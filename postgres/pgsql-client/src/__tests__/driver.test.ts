import {
  defaultPgClientFactory,
  getActivePgClientFactory,
  hasPgClientFactory,
  PgClient,
  registerPgClientFactory
} from '../index';

const config = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'x'
} as any;

describe('pgsql-client client-factory seam', () => {
  afterEach(() => registerPgClientFactory(undefined));

  it('defaults to no registered factory', () => {
    expect(hasPgClientFactory()).toBe(false);
    expect(getActivePgClientFactory()).toBeUndefined();
  });

  it('registers and clears a factory', () => {
    const factory = () => ({ connect: async () => {}, query: async () => ({}), end: async () => {} });
    registerPgClientFactory(factory);
    expect(hasPgClientFactory()).toBe(true);
    expect(getActivePgClientFactory()).toBe(factory);
    registerPgClientFactory(undefined);
    expect(hasPgClientFactory()).toBe(false);
  });

  it('default factory builds a pg.Client (without connecting)', () => {
    const client = defaultPgClientFactory(config);
    expect(typeof client.connect).toBe('function');
    expect(typeof client.query).toBe('function');
    expect(typeof client.end).toBe('function');
  });

  it('PgClient uses the registered factory for its underlying client', () => {
    const fake: any = {
      connect: async () => {},
      query: async () => ({ rows: [] as any[], rowCount: 0, fields: [] as any[] }),
      end: async () => {}
    };
    registerPgClientFactory(() => fake);

    const pgc = new PgClient(config, { deferConnect: true });
    expect(pgc.client as unknown).toBe(fake);
  });
});
