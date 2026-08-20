import { CliError } from '@constructive-io/cli-runtime';

import { importOptionalCapability } from '../src/runtime/optional-capability';

describe('optional capability imports', () => {
  it.each(['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'])(
    'maps %s for the optional package to a stable capability error',
    async (code) => {
      const cause = Object.assign(
        new Error("Cannot find package '@constructive-io/optional-feature'"),
        { code }
      );

      await expect(
        importOptionalCapability(
          'optional feature',
          '@constructive-io/optional-feature',
          async () => {
            throw cause;
          }
        )
      ).rejects.toMatchObject<Partial<CliError>>({
        code: 'CAPABILITY_UNAVAILABLE',
        category: 'configuration',
        retryable: false,
        details: {
          capability: 'optional feature',
          packageName: '@constructive-io/optional-feature',
        },
        cause,
      });
    }
  );

  it('does not mask failures from an installed capability', async () => {
    const cause = Object.assign(new Error('missing transitive dependency'), {
      code: 'MODULE_NOT_FOUND',
    });

    await expect(
      importOptionalCapability(
        'optional feature',
        '@constructive-io/optional-feature',
        async () => {
          throw cause;
        }
      )
    ).rejects.toBe(cause);
  });
});
