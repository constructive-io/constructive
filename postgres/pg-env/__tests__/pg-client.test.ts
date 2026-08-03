import { getPgClientCommand } from '../src/pg-client';

describe('getPgClientCommand', () => {
  it('returns the bare tool name with no env set', () => {
    expect(getPgClientCommand('pg_dump', {})).toEqual(['pg_dump']);
    expect(getPgClientCommand('createdb', {})).toEqual(['createdb']);
    expect(getPgClientCommand('psql', {})).toEqual(['psql']);
  });

  it('prepends PGPM_PG_CLIENT_PREFIX to every tool', () => {
    const env = { PGPM_PG_CLIENT_PREFIX: 'docker exec -e PGUSER=postgres pg' };
    expect(getPgClientCommand('pg_dump', env)).toEqual([
      'docker', 'exec', '-e', 'PGUSER=postgres', 'pg', 'pg_dump'
    ]);
    expect(getPgClientCommand('createdb', env)).toEqual([
      'docker', 'exec', '-e', 'PGUSER=postgres', 'pg', 'createdb'
    ]);
  });

  it('uses a per-tool alias verbatim, ignoring the prefix', () => {
    const env = {
      PGPM_PG_CLIENT_PREFIX: 'docker exec pg',
      PGPM_PSQL: '/usr/local/bin/psql18'
    };
    expect(getPgClientCommand('psql', env)).toEqual(['/usr/local/bin/psql18']);
    // other tools still take the prefix
    expect(getPgClientCommand('pg_dump', env)).toEqual(['docker', 'exec', 'pg', 'pg_dump']);
  });

  it('tokenizes a multi-word alias', () => {
    const env = { PGPM_PG_DUMP: 'docker exec -e PGUSER=postgres pg pg_dump' };
    expect(getPgClientCommand('pg_dump', env)).toEqual([
      'docker', 'exec', '-e', 'PGUSER=postgres', 'pg', 'pg_dump'
    ]);
  });

  it('ignores blank/whitespace-only env values', () => {
    expect(getPgClientCommand('pg_dump', { PGPM_PG_DUMP: '   ', PGPM_PG_CLIENT_PREFIX: '' }))
      .toEqual(['pg_dump']);
  });
});
