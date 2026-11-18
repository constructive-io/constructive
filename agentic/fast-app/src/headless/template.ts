// Desktop commits the app template in packages/app before a cloud run, so
// `materialize` only installs: it never composes or copies a template.

import { existsSync } from 'node:fs';
import path from 'node:path';

import { APP_SPEC_SCHEMA_FILE } from '../app-spec';
import type { AppTemplate } from '../pipeline/host';
import { appDirOf, COMPOSE_MARKER, installApp, isComposed } from '../pipeline/snapshot-clone';

const FROM_DESKTOP =
  'A cloud run never composes the app template: open the project in Constructive Desktop, which puts the app in packages/app and commits it, then push and send the message again.';

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
        throw new Error(
          `The app in ${projectDir} can't be installed: this cloud run builds the app in ${tree} only. Call the tool from that folder.`
        );
      }
      const missing = missingAppReason(projectDir);
      if (missing) throw new Error(missing);
      await installApp(projectDir, signal ?? new AbortController().signal);
    },
    schemaFile: async () => {
      const own = path.join(appDirOf(tree), APP_SPEC_SCHEMA_FILE);
      return existsSync(own) ? own : null;
    }
  };
}
