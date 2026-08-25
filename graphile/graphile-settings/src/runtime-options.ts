import { getEnvOptions } from '@constructive-io/graphql-env';

import {
  getGraphileSettingsRuntime,
  getGraphileSettingsRuntimeResource,
} from './runtime-environment';

const RESOLVED_OPTIONS = Symbol('constructive.resolved-options');

/** Resolve config files and environment exactly once per runtime scope. */
export const getGraphileSettingsRuntimeOptions = (): ReturnType<
  typeof getEnvOptions
> =>
  getGraphileSettingsRuntimeResource(RESOLVED_OPTIONS, () => {
    const runtime = getGraphileSettingsRuntime();
    return getEnvOptions({}, runtime.cwd, { ...runtime.env });
  });
