import { AsyncLocalStorage } from 'node:async_hooks';
import { resolve } from 'node:path';

export type GraphileSettingsEnvironment = Readonly<
  Record<string, string | undefined>
>;

export interface GraphileSettingsRuntimeOptions {
  cwd?: string;
  env?: GraphileSettingsEnvironment;
}

interface RuntimeResource {
  value: unknown;
  dispose?: (value: unknown) => void | Promise<void>;
}

interface GraphileSettingsRuntimeState {
  cwd: string;
  env: GraphileSettingsEnvironment;
  resources: Map<symbol, RuntimeResource>;
}

const runtimeStorage = new AsyncLocalStorage<GraphileSettingsRuntimeState>();

const ambientRuntime = (): GraphileSettingsRuntimeState => ({
  cwd: process.cwd(),
  env: process.env,
  resources: new Map(),
});

/**
 * Read the runtime attached to the current server/request lifecycle.
 * Ambient process state remains a compatibility fallback for consumers which
 * have not adopted an explicit runtime scope.
 */
export const getGraphileSettingsRuntime = (): Readonly<
  Pick<GraphileSettingsRuntimeState, 'cwd' | 'env'>
> => runtimeStorage.getStore() ?? ambientRuntime();

export const hasGraphileSettingsRuntime = (): boolean =>
  runtimeStorage.getStore() !== undefined;

/**
 * Return one lazily-created resource per runtime scope. Credential-bearing
 * resources require an explicit scope: creating them from ambient process
 * state would either leak a client per call or recreate the original
 * first-operation-wins credential singleton.
 */
export const getGraphileSettingsRuntimeResource = <T>(
  key: symbol,
  create: () => T,
  dispose?: (value: T) => void | Promise<void>
): T => {
  const runtime = runtimeStorage.getStore();
  if (!runtime) {
    throw new Error(
      'GRAPHILE_SETTINGS_RUNTIME_REQUIRED: run the server or operation with ' +
        'withGraphileSettingsRuntime().'
    );
  }

  const cached = runtime.resources.get(key);
  if (cached) return cached.value as T;

  const value = create();
  runtime.resources.set(key, {
    value,
    ...(dispose === undefined
      ? {}
      : {
          dispose: (resource) => dispose(resource as T),
        }),
  });
  return value;
};

const disposeRuntimeResources = async (
  runtime: GraphileSettingsRuntimeState
): Promise<void> => {
  const resources = [...runtime.resources.values()].reverse();
  runtime.resources.clear();
  const failures: unknown[] = [];

  for (const resource of resources) {
    if (!resource.dispose) continue;
    try {
      await resource.dispose(resource.value);
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      'Failed to dispose graphile-settings runtime resources.'
    );
  }
};

/**
 * Run a complete server lifecycle with an immutable environment snapshot and
 * isolated credential-bearing resources. Resources are disposed after the
 * lifecycle settles, including on cancellation and startup failure.
 */
export const withGraphileSettingsRuntime = async <T>(
  options: GraphileSettingsRuntimeOptions,
  callback: () => Promise<T>
): Promise<T> => {
  const parent = runtimeStorage.getStore();
  const runtime: GraphileSettingsRuntimeState = {
    cwd: resolve(options.cwd ?? parent?.cwd ?? process.cwd()),
    env: Object.freeze({ ...(options.env ?? parent?.env ?? process.env) }),
    resources: new Map(),
  };

  let result: T | undefined;
  let primaryError: unknown;
  try {
    result = await runtimeStorage.run(runtime, callback);
  } catch (error) {
    primaryError = error;
  }

  try {
    await disposeRuntimeResources(runtime);
  } catch (cleanupError) {
    if (primaryError === undefined) throw cleanupError;
  }

  if (primaryError !== undefined) throw primaryError;
  return result as T;
};
