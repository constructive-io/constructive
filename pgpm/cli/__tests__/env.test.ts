import { PgConfig } from 'pg-env';

import { resolveEnvVars } from '../src/commands/env';

const profile: PgConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'postgres'
};

describe('resolveEnvVars', () => {
  it('emits the full profile when nothing is set', () => {
    const { vars, kept } = resolveEnvVars(profile, {});
    expect(vars).toEqual({
      PGHOST: 'localhost',
      PGPORT: '5432',
      PGUSER: 'postgres',
      PGPASSWORD: 'password',
      PGDATABASE: 'postgres'
    });
    expect(kept).toEqual([]);
  });

  it('keeps PG* variables the shell already set and fills in the rest', () => {
    const { vars, kept } = resolveEnvVars(profile, {
      PGUSER: 'dan',
      PGPASSWORD: 'secret',
      PGPORT: '5433',
      PGDATABASE: ''
    });
    expect(vars).toEqual({ PGHOST: 'localhost', PGDATABASE: 'postgres' });
    expect(kept).toEqual(['PGPORT', 'PGUSER', 'PGPASSWORD']);
  });

  it('overwrites everything with --reset', () => {
    const { vars, kept } = resolveEnvVars(profile, { PGUSER: 'dan' }, { reset: true });
    expect(vars.PGUSER).toBe('postgres');
    expect(kept).toEqual([]);
  });

  it('never keeps object-store variables', () => {
    const objectStore = {
      endpoint: 'http://localhost:9000',
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      region: 'us-east-1'
    };
    const { vars } = resolveEnvVars(profile, { AWS_REGION: 'eu-west-1' }, { objectStore });
    expect(vars.AWS_REGION).toBe('us-east-1');
    expect(vars.CDN_ENDPOINT).toBe('http://localhost:9000');
  });
});
