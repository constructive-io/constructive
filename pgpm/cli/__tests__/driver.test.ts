import {
  activateDriver,
  driverOverrideFromArgv,
  PGLITE_DRIVER_PLUGIN,
  resolveDriverConfig,
} from '../src/utils/driver';

describe('driverOverrideFromArgv', () => {
  it('returns undefined with no flags (built-in pg path)', () => {
    expect(driverOverrideFromArgv({})).toBeUndefined();
  });

  it('maps bare --pglite to the pglite plugin, in-memory', () => {
    expect(driverOverrideFromArgv({ pglite: true })).toEqual({
      plugin: PGLITE_DRIVER_PLUGIN,
      options: undefined,
    });
  });

  it('maps --pglite=<dataDir> to a persisted dataDir', () => {
    expect(driverOverrideFromArgv({ pglite: './local.db' })).toEqual({
      plugin: PGLITE_DRIVER_PLUGIN,
      options: { dataDir: './local.db' },
    });
  });

  it('ignores --pglite=false', () => {
    expect(driverOverrideFromArgv({ pglite: false })).toBeUndefined();
  });

  it('maps --driver <pkg> to an arbitrary plugin', () => {
    expect(driverOverrideFromArgv({ driver: '@acme/turso-adapter' })).toEqual({
      plugin: '@acme/turso-adapter',
    });
  });

  it('prefers --pglite over --driver when both are present', () => {
    expect(driverOverrideFromArgv({ pglite: true, driver: '@acme/turso-adapter' })).toEqual({
      plugin: PGLITE_DRIVER_PLUGIN,
      options: undefined,
    });
  });
});

describe('resolveDriverConfig', () => {
  it('returns undefined when nothing is configured or overridden', () => {
    expect(resolveDriverConfig(undefined, undefined)).toBeUndefined();
  });

  it('returns the configured driver when there is no override', () => {
    const configured = { plugin: PGLITE_DRIVER_PLUGIN, options: { dataDir: './a' } };
    expect(resolveDriverConfig(configured, undefined)).toBe(configured);
  });

  it('lets an override win over config', () => {
    const configured = { plugin: '@acme/turso-adapter' };
    expect(resolveDriverConfig(configured, { plugin: PGLITE_DRIVER_PLUGIN })).toEqual({
      plugin: PGLITE_DRIVER_PLUGIN,
      options: {},
    });
  });

  it('merges override options over configured options for the same plugin', () => {
    const configured = {
      plugin: PGLITE_DRIVER_PLUGIN,
      options: { dataDir: './cfg', extensions: ['vector'] },
    };
    expect(
      resolveDriverConfig(configured, { plugin: PGLITE_DRIVER_PLUGIN, options: { dataDir: './override' } })
    ).toEqual({
      plugin: PGLITE_DRIVER_PLUGIN,
      options: { dataDir: './override', extensions: ['vector'] },
    });
  });
});

describe('activateDriver', () => {
  it('returns undefined on the built-in server path (no driver)', async () => {
    await expect(activateDriver(undefined, undefined, process.cwd())).resolves.toBeUndefined();
  });

  it('throws a clear install hint when the plugin cannot be resolved', async () => {
    await expect(
      activateDriver({ plugin: '@pgpmjs/pglite-adapter' }, undefined, '/nonexistent-project-root')
    ).rejects.toThrow(/is not installed in this project[\s\S]*@electric-sql\/pglite/);
  });

  it('throws when the resolved module is not a driver plugin', async () => {
    // `pg-env` resolves from the monorepo but does not export createPgpmDriver.
    await expect(
      activateDriver({ plugin: 'pg-env' }, undefined, __dirname)
    ).rejects.toThrow(/does not export createPgpmDriver/);
  });
});
