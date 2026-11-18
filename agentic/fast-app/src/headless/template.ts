// The app template of a run with no UI (FastAppHost services' template). The
// app is in the clone already: desktop puts the template in packages/app and
// commits it before a cloud run (brief 4.6). So `materialize` never composes
// or copies a template; it installs the app's packages, which the clone
// doesn't carry, and fails with what to do when the app isn't there.

import { existsSync } from 'node:fs';
import path from 'node:path';

import { APP_SPEC_SCHEMA_FILE } from '../app-spec';
import type { AppTemplate } from '../pipeline/host';
import { appDirOf, COMPOSE_MARKER, installApp, isComposed } from '../pipeline/snapshot-clone';

const FROM_DESKTOP =
  'A cloud run never composes the app template: open the project in Constructive Desktop, which puts the app in packages/app and commits it, then push and send the message again.';

/** Why the app in `projectDir` can't be built in a cloud run; null when it can. */
export function missingAppReason(projectDir: string): string | null {
  const appDir = appDirOf(projectDir);
  if (!existsSync(appDir)) return `${appDir} is missing. ${FROM_DESKTOP}`;
  if (!isComposed(appDir)) {
    return `${appDir} is not a composed app: it has no ${COMPOSE_MARKER}. ${FROM_DESKTOP}`;
  }
  return null;
}

export function cloneTemplate(cwd: string): AppTemplate {
  const tree = path.resolve(cwd);
  return {
    available: () => true,
    materialize: async (projectDir, signal) => {
      if (path.resolve(projectDir) !== tree) {
        throw new Error(`This cloud run builds the app in ${tree} only, not in ${projectDir}.`);
      }
      const missing = missingAppReason(projectDir);
      if (missing) throw new Error(missing);
      // The desktop's install of a copied template, with the same environment and limits.
      await installApp(projectDir, signal ?? new AbortController().signal);
    },
    // The app's own copy, which the clone has with the app.
    schemaFile: async () => {
      const own = path.join(appDirOf(tree), APP_SPEC_SCHEMA_FILE);
      return existsSync(own) ? own : null;
    }
  };
}
