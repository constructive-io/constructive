import { AsyncLocalStorage } from 'node:async_hooks';
import {
  withGraphileSettingsRuntime,
  type GraphileSettingsRuntimeOptions,
} from 'graphile-settings';

export type ServerEnvironment = Readonly<Record<string, string | undefined>>;

const environmentStorage = new AsyncLocalStorage<ServerEnvironment>();

/**
 * Return the environment explicitly attached to the current server lifecycle.
 * Legacy programmatic consumers retain process.env as a compatibility fallback.
 */
export const getServerEnvironment = (): ServerEnvironment =>
  environmentStorage.getStore() ?? process.env;

/** Run a complete server lifecycle with an immutable environment snapshot. */
export const withServerEnvironment = async <T>(
  environment: ServerEnvironment,
  callback: () => Promise<T>,
  runtime: Pick<GraphileSettingsRuntimeOptions, 'cwd'> = {}
): Promise<T> => {
  const snapshot = Object.freeze({ ...environment });
  return withGraphileSettingsRuntime({ ...runtime, env: snapshot }, () =>
    environmentStorage.run(snapshot, callback)
  );
};
