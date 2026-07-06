import { parseArgv } from '../args';
import { assertPortAllowed, HUB_PORTS, pgConfigFromArgv, resolveCreds } from '../config';

const ORIGINAL_ENV = process.env;
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});
afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('hub guardrail', () => {
  test('HUB_PORTS is the exact reserved set', () => {
    expect(HUB_PORTS).toEqual([5432, 3000, 3001, 3002, 9000]);
  });

  test('reserved hub port 5432 throws and names --allow-hub', () => {
    expect(() => assertPortAllowed(5432, false)).toThrow(/--allow-hub/);
  });

  test('every reserved port throws', () => {
    for (const p of HUB_PORTS) expect(() => assertPortAllowed(p, false)).toThrow();
  });

  test('isolated port 5433 passes', () => {
    expect(() => assertPortAllowed(5433, false)).not.toThrow();
  });

  test('--allow-hub overrides the guardrail', () => {
    expect(() => assertPortAllowed(5432, true)).not.toThrow();
  });
});

describe('pgConfigFromArgv precedence', () => {
  test('defaults to 5433 (never 5432) / localhost / postgres / constructive', () => {
    for (const k of ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']) delete process.env[k];
    const cfg = pgConfigFromArgv(parseArgv([]));
    expect(cfg).toEqual({
      host: 'localhost',
      port: 5433,
      user: 'postgres',
      password: 'password',
      database: 'constructive'
    });
  });

  test('flags beat env beat defaults', () => {
    process.env.PGHOST = 'envhost';
    process.env.PGPORT = '5999';
    process.env.PGUSER = 'envuser';
    const cfg = pgConfigFromArgv(parseArgv(['--pg-host', 'flaghost', '--pg-database', 'mydb']));
    expect(cfg.host).toBe('flaghost'); // flag wins
    expect(cfg.port).toBe(5999); // env beats default
    expect(cfg.user).toBe('envuser'); // env beats default
    expect(cfg.database).toBe('mydb'); // flag
    expect(cfg.password).toBe('password'); // default
  });

  test('rejects hub port 5432 unless --allow-hub', () => {
    expect(() => pgConfigFromArgv(parseArgv(['--pg-port', '5432']))).toThrow(/--allow-hub/);
    const cfg = pgConfigFromArgv(parseArgv(['--pg-port', '5432', '--allow-hub']));
    expect(cfg.port).toBe(5432);
  });
});

describe('resolveCreds', () => {
  test('email defaults to seeder@gmail.com; password never has a literal default', () => {
    delete process.env.PERF_PASSWORD;
    expect(resolveCreds(parseArgv([]))).toEqual({ email: 'seeder@gmail.com', password: null });
  });

  test('password resolution: flag > PERF_PASSWORD env > null', () => {
    delete process.env.PERF_PASSWORD;
    expect(resolveCreds(parseArgv(['--password', 'p1'])).password).toBe('p1');
    process.env.PERF_PASSWORD = 'envpw';
    expect(resolveCreds(parseArgv([])).password).toBe('envpw');
    expect(resolveCreds(parseArgv(['--password', 'flagpw'])).password).toBe('flagpw');
  });

  test('custom email flag is honored', () => {
    expect(resolveCreds(parseArgv(['--email', 'x@y.com'])).email).toBe('x@y.com');
  });
});
