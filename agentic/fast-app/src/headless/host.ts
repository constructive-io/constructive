import path from 'node:path';

import { DevServerManager, type EnsureOptions } from '../pipeline/dev-server';
import type { FastAppHost, FastAppProject, FastAppServices } from '../pipeline/host';
import { ProjectLocks } from '../pipeline/project-lock';
import { checkRunDatabase } from './database';
import type { RunIdentity } from './launch';
import type { CheckedOptions } from './options';
import { ownerKeySessions } from './owner';
import { runLogPlanCards } from './plan-card';
import { runLogProgress } from './progress-watch';
import { chromiumRenderCheck } from './render-check';
import { laneFlusher } from './run-log';
import { cloneTemplate, type HeadlessTemplate } from './template';

export type HeadlessHost = {
  host: FastAppHost;
  /** The app's install, which the tools that run its packages wait for. */
  installed: HeadlessTemplate['installed'];
  dispose(): Promise<void>;
};

// verify_app starts the dev server first, and in a fresh clone the app's
// packages are still installing.
class InstalledDevServers extends DevServerManager {
  private readonly installed: HeadlessTemplate['installed'];

  constructor(pidFile: string, installed: HeadlessTemplate['installed']) {
    super(pidFile);
    this.installed = installed;
  }

  async ensure(appDir: string, options: EnsureOptions = {}) {
    await this.installed(options.signal);
    return super.ensure(appDir, options);
  }
}

export function headlessHost(run: RunIdentity, options: CheckedOptions): HeadlessHost {
  const { runLog } = options;
  const flush = laneFlusher(runLog.flush);
  const tree = path.resolve(run.cwd);
  const inTree = (cwd: string) => path.resolve(cwd) === tree;
  // Only where its dev server answers changes, in memory: a restart keeps the port.
  const project: FastAppProject = {
    id: run.databaseId,
    name: path.basename(tree),
    cwd: tree,
    databaseId: run.databaseId
  };
  const template = cloneTemplate(tree);
  const devServers = new InstalledDevServers(path.join(options.stateDir, 'dev-servers.json'), template.installed);
  // A server an earlier start in the same state folder left running.
  devServers.reapOrphans();
  const services: FastAppServices = { template, devServers, locks: new ProjectLocks() };
  const render = options.chromiumPath
    ? chromiumRenderCheck({ chromiumPath: options.chromiumPath, stateDir: options.stateDir })
    : null;

  const host: FastAppHost = {
    account: () => ({ userId: run.userId, email: run.email }),
    // One pi session per Job: the run is the chat.
    chatId: () => runLog.runId,
    services: () => services,
    projects: {
      get: (projectId) => (projectId === project.id ? project : undefined),
      at: (cwd) => (inTree(cwd) ? project : undefined),
      binding: async (cwd) =>
        inTree(cwd)
          ? {
            databaseId: run.databaseId,
            ownerId: run.userId,
            ...(run.databaseName ? { databaseName: run.databaseName } : {})
          }
          : null,
      saveDevServer: async (projectId, url) => {
        if (projectId !== project.id) return undefined;
        project.devServerUrl = url;
        return project;
      }
    },
    ensureDatabase: (request) => checkRunDatabase(run, request),
    owner: ownerKeySessions(run),
    card: runLogPlanCards({
      store: runLog.store,
      runId: runLog.runId,
      flush,
      timeoutMs: options.approvalTimeoutMs
    }),
    ...(render ? { renderCheck: render.renderCheck } : {}),
    progress: runLogProgress(flush),
    // Nobody can open a pod's dev server: no card or result names its address.
    preview: false
  };

  // In the background: the start must not wait for it.
  template.start();

  let disposed: Promise<void> | null = null;
  return {
    host,
    installed: template.installed,
    dispose: () => {
      disposed ??= (async () => {
        template.stop();
        devServers.killAll();
        await render?.dispose();
      })();
      return disposed;
    }
  };
}
