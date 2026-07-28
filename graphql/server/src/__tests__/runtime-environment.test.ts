import { getGraphileSettingsRuntime } from 'graphile-settings';

import {
  getServerEnvironment,
  withServerEnvironment,
} from '../runtime-environment';

describe('server runtime environment isolation', () => {
  it('uses the injected immutable snapshot instead of ambient process state', async () => {
    const previous = process.env.CNC_SERVER_ENV_TEST;
    process.env.CNC_SERVER_ENV_TEST = 'ambient-secret';

    try {
      await withServerEnvironment(
        { CNC_SERVER_ENV_TEST: 'operation-value' },
        async () => {
          expect(getServerEnvironment().CNC_SERVER_ENV_TEST).toBe(
            'operation-value'
          );
          expect(() => {
            (getServerEnvironment() as NodeJS.ProcessEnv).CNC_SERVER_ENV_TEST =
              'mutated';
          }).toThrow();
          await Promise.resolve();
          expect(getServerEnvironment().CNC_SERVER_ENV_TEST).toBe(
            'operation-value'
          );
        }
      );
    } finally {
      if (previous === undefined) delete process.env.CNC_SERVER_ENV_TEST;
      else process.env.CNC_SERVER_ENV_TEST = previous;
    }
  });

  it('keeps concurrent service environments isolated', async () => {
    const values = await Promise.all([
      withServerEnvironment({ SERVICE_ID: 'first' }, async () => {
        await new Promise((resolve) => setImmediate(resolve));
        return [
          getServerEnvironment().SERVICE_ID,
          getGraphileSettingsRuntime().env.SERVICE_ID,
        ];
      }),
      withServerEnvironment({ SERVICE_ID: 'second' }, async () => {
        await Promise.resolve();
        return [
          getServerEnvironment().SERVICE_ID,
          getGraphileSettingsRuntime().env.SERVICE_ID,
        ];
      }),
    ]);

    expect(values).toEqual([
      ['first', 'first'],
      ['second', 'second'],
    ]);
  });
});
