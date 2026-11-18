// Desktop commits the app template in packages/app before a cloud run, so
// `materialize` only installs: it never composes or copies a template.

import { existsSync } from 'node:fs';
import path from 'node:path';

import { APP_SPEC_SCHEMA_FILE } from '../app-spec';
import type { AppTemplate } from '../pipeline/host';
import { errorMessage } from '../pipeline/progress';
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

export type HeadlessTemplate = AppTemplate & {
  /** Starts the install in the background when the tree holds a composed app. */
  start(): void;
  /** Rejects with why the install failed; the next call installs again. */
  installed(signal?: AbortSignal): Promise<void>;
  stop(): void;
};

/** `work`, or a rejection as soon as `signal` aborts; `work` goes on either way. */
function untilAborted<T>(work: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return work;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new Error('stopped'));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

// A cloud turn runs in a fresh clone with no node_modules, so the install
// starts with the run, and plan_app, verify_app and run_codegen join it: two
// pnpm installs in one folder at once break each other.
export function cloneTemplate(cwd: string): HeadlessTemplate {
  const tree = path.resolve(cwd);
  const stopping = new AbortController();
  let install: Promise<void> | null = null;

  const begin = (): Promise<void> => {
    if (install) return install;
    const current = installApp(tree, stopping.signal).catch((err: unknown) => {
      install = null;
      throw new Error(
        `The app's packages could not be installed in ${appDirOf(tree)}. ${errorMessage(err)}\nFix what the install output names (packages/app's package.json or lockfile, or the registry it reaches), then call the tool again: it runs the install again.`
      );
    });
    // A failure no tool waits for is not lost: the next tool installs again.
    current.catch(() => {});
    install = current;
    return current;
  };

  const installed = (signal?: AbortSignal): Promise<void> =>
    missingAppReason(tree) ? Promise.resolve() : untilAborted(begin(), signal);

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
      await installed(signal);
    },
    schemaFile: async () => {
      const own = path.join(appDirOf(tree), APP_SPEC_SCHEMA_FILE);
      return existsSync(own) ? own : null;
    },
    start: () => void installed().catch(() => {}),
    installed,
    stop: () => stopping.abort()
  };
}
