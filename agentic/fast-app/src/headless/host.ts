import path from 'node:path';

import { DevServerManager } from '../pipeline/dev-server';
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
import { cloneTemplate } from './template';

export type HeadlessHost = {
  host: FastAppHost;
  dispose(): Promise<void>;
};

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
  const devServers = new DevServerManager(path.join(options.stateDir, 'dev-servers.json'));
  // A server an earlier start in the same state folder left running.
  devServers.reapOrphans();
  const services: FastAppServices = {
    template: cloneTemplate(tree),
    devServers,
    locks: new ProjectLocks()
  };
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

  let disposed: Promise<void> | null = null;
  return {
    host,
    dispose: () => {
      disposed ??= (async () => {
        devServers.killAll();
        await render?.dispose();
      })();
      return disposed;
    }
  };
}
