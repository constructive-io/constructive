import { existsSync } from 'node:fs';
import path from 'node:path';

import { cleanEnv, str, withDefault } from '12factor-env';

const runtimeEnv = (): { applicationPath: string } => {
  const parsed = cleanEnv(process.env, {
    CONSTRUCTIVE_DB_APPLICATION_PATH: withDefault(str, '')
  });
  return { applicationPath: parsed.CONSTRUCTIVE_DB_APPLICATION_PATH.trim() };
};

/**
 * Resolve an explicitly pinned generated Constructive DB application checkout.
 * Empty means the cross-repository suite is not part of the current test run.
 */
export const getConstructiveDbApplicationPath = (): string | null => {
  const configured = runtimeEnv().applicationPath;
  if (!configured) return null;
  const resolved = path.resolve(configured);
  if (!existsSync(path.join(resolved, 'pgpm.plan'))) {
    throw new Error(
      `CONSTRUCTIVE_DB_APPLICATION_PATH does not contain a generated pgpm application: ${resolved}`
    );
  }
  return resolved;
};
