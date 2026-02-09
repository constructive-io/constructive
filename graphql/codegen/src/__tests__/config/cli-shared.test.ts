import {
  buildGenerateOptions,
  seedArgvFromConfig,
} from '../../cli/shared';

describe('CLI shared utilities', () => {
  it('preserves explicit false booleans from argv when merging with file config', () => {
    const fileConfig = {
      reactQuery: true,
      orm: true,
      dryRun: true,
    };

    const seeded = seedArgvFromConfig(
      { reactQuery: false, orm: false },
      fileConfig,
    );

    expect(seeded).toMatchObject({
      reactQuery: false,
      orm: false,
    });
  });

  it('normalizes list options through buildGenerateOptions in non-interactive flows', () => {
    const options = buildGenerateOptions(
      {
        schemas: 'public, app',
        apiNames: 'core, admin',
      },
      {},
    );

    expect(options.db).toEqual({
      schemas: ['public', 'app'],
      apiNames: ['core', 'admin'],
    });
  });
});
