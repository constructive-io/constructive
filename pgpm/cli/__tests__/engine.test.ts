import { PgpmOptions } from '@pgpmjs/types';

import { PGLITE_DRIVER_PLUGIN } from '../src/utils/driver';
import { engineDefinitions, resolveEngine, SERVER_CAPABILITIES } from '../src/utils/engine';
import { engineCommandBlocker } from '../src/utils/engine-gating';

const PGLITE_CAPABILITIES = {
  createdb: false,
  dump: false,
  serverLifecycle: false,
  multiConnection: false,
};

describe('resolveEngine', () => {
  it('defaults to the built-in pg engine with no driver', () => {
    expect(resolveEngine({}, {})).toEqual({ name: 'pg', driver: undefined });
  });

  it('resolves the built-in pglite engine to its plugin', () => {
    expect(resolveEngine({ engine: 'pglite' }, {})).toEqual({
      name: 'pglite',
      driver: { plugin: PGLITE_DRIVER_PLUGIN, options: {} },
    });
  });

  it('treats --pglite as sugar for the pglite engine', () => {
    expect(resolveEngine({ pglite: true }, {})).toEqual({
      name: 'pglite',
      driver: { plugin: PGLITE_DRIVER_PLUGIN, options: {} },
    });
  });

  it('maps --pglite=<dataDir> to the engine dataDir option', () => {
    expect(resolveEngine({ pglite: './local.db' }, {})).toEqual({
      name: 'pglite',
      driver: { plugin: PGLITE_DRIVER_PLUGIN, options: { dataDir: './local.db' } },
    });
  });

  it('merges configured engine options under the CLI dataDir', () => {
    const config: PgpmOptions = {
      engines: { pglite: { plugin: PGLITE_DRIVER_PLUGIN, options: { dataDir: './cfg', roles: false } } },
    };
    expect(resolveEngine({ pglite: './cli' }, config)).toEqual({
      name: 'pglite',
      driver: { plugin: PGLITE_DRIVER_PLUGIN, options: { dataDir: './cli', roles: false } },
    });
  });

  it('reads the configured engine name from pgpm.json', () => {
    expect(resolveEngine({}, { engine: 'pglite' })).toEqual({
      name: 'pglite',
      driver: { plugin: PGLITE_DRIVER_PLUGIN, options: {} },
    });
  });

  it('honors the low-level driver block when no engine is selected', () => {
    const driver = { plugin: '@acme/turso-adapter', options: { url: 'libsql://x' } };
    expect(resolveEngine({}, { driver })).toEqual({ name: '@acme/turso-adapter', driver });
  });

  it('lets --engine win over the configured driver block', () => {
    const config: PgpmOptions = { driver: { plugin: '@acme/turso-adapter' } };
    expect(resolveEngine({ engine: 'pg' }, config)).toEqual({ name: 'pg', driver: undefined });
  });

  it('lets --driver name a plugin directly, bypassing the engine registry', () => {
    expect(resolveEngine({ driver: '@acme/turso-adapter' }, { engine: 'pglite' })).toEqual({
      name: '@acme/turso-adapter',
      driver: { plugin: '@acme/turso-adapter', options: undefined },
    });
  });

  it('resolves an engine declared only in pgpm.json', () => {
    const config: PgpmOptions = { engines: { turso: { plugin: '@acme/turso-adapter' } } };
    expect(resolveEngine({ engine: 'turso' }, config)).toEqual({
      name: 'turso',
      driver: { plugin: '@acme/turso-adapter', options: {} },
    });
  });

  it('rejects an unknown engine name and lists the known ones', () => {
    expect(() => resolveEngine({ engine: 'mysql' }, {})).toThrow(
      /Unknown pgpm engine "mysql"\. Known engines: pg, pglite\./
    );
  });

  it('lets pgpm.json redefine a built-in engine', () => {
    const config: PgpmOptions = { engines: { pglite: { plugin: '@acme/pglite-fork' } } };
    expect(engineDefinitions(config).pglite).toEqual({ plugin: '@acme/pglite-fork' });
    expect(resolveEngine({ engine: 'pglite' }, config).driver?.plugin).toBe('@acme/pglite-fork');
  });

  it('keeps the built-in plugin when pgpm.json configures only its options', () => {
    const config: PgpmOptions = { engines: { pglite: { options: { dataDir: './.pglite' } } } };
    expect(resolveEngine({ engine: 'pglite' }, config)).toEqual({
      name: 'pglite',
      driver: { plugin: PGLITE_DRIVER_PLUGIN, options: { dataDir: './.pglite' } },
    });
  });
});

describe('engineCommandBlocker', () => {
  it('allows every command on the built-in server engine', () => {
    for (const command of ['deploy', 'dump', 'docker', 'kill', 'tune', 'admin-users']) {
      expect(engineCommandBlocker(command, { name: 'pg' }, SERVER_CAPABILITIES)).toBeUndefined();
    }
  });

  it('allows migration commands on a single-session backend', () => {
    for (const command of ['deploy', 'revert', 'verify', 'plan']) {
      expect(engineCommandBlocker(command, { name: 'pglite' }, PGLITE_CAPABILITIES)).toBeUndefined();
    }
  });

  it('blocks server-lifecycle commands with the reason', () => {
    expect(engineCommandBlocker('docker', { name: 'pglite' }, PGLITE_CAPABILITIES)).toBe(
      'pgpm docker is not supported by the "pglite" engine — it has no server to manage.'
    );
  });

  it('blocks dump and the two-connection admin bootstrap', () => {
    expect(engineCommandBlocker('dump', { name: 'pglite' }, PGLITE_CAPABILITIES)).toMatch(
      /no pg_dump/
    );
    expect(engineCommandBlocker('admin-users', { name: 'pglite' }, PGLITE_CAPABILITIES)).toMatch(
      /single-session backend/
    );
  });
});
