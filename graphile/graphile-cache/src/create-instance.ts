import { createServer } from 'node:http';

import { Logger } from '@pgpmjs/logger';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { grafserv } from 'grafserv/express/v4';
import { postgraphile } from 'postgraphile';

import { awaitGraphileBuildReadiness } from './build-readiness';
import {
  trackGraphileBuild,
  type GraphileCacheEntry,
} from './graphile-cache';
import { createPresetServicesReleaser } from './preset-services';
import { withGraphileEntryUsage } from './runtime-entry-usage';

const log = new Logger('graphile-cache:create');

interface GraphileInstanceOptions {
  preset: any;
  cacheKey: string;
  runtimePoolIdentity?: string;
  logicalServiceKey?: string;
  releaseRuntimePool?: () => void | Promise<void>;
  /**
   * When true, a RealtimeManager is created and started alongside the
   * PostGraphile instance.  The pool is extracted from the preset's
   * pgServices (managed by pg-cache) rather than passed separately.
   */
  enableRealtime?: boolean;
}

/**
 * Create a PostGraphile v5 instance backed by grafserv/express.
 *
 * This is the shared factory used by both graphql/server and graphql/explorer
 * to spin up a fully-initialised PostGraphile handler that fits into the
 * graphile-cache LRU cache.
 *
 * Callers are responsible for building the `GraphileConfig.Preset` (including
 * pgServices, grafserv options, grafast context, etc.) before passing it here.
 *
 * When `enableRealtime` is true, a RealtimeManager is created that bridges
 * cursor-tracked events from `drain_changes()` into the PostGraphile
 * instance's PgSubscriber EventEmitter.  Both `pgSubscriber` and the pg
 * pool are extracted from the resolved preset's pgServices — no separate
 * pool parameter is needed.
 */
const createGraphileInstanceInternal = async (
  opts: GraphileInstanceOptions
): Promise<GraphileCacheEntry> => {
  const {
    preset,
    cacheKey,
    enableRealtime = false,
    runtimePoolIdentity,
    logicalServiceKey,
    releaseRuntimePool,
  } = opts;

  const pgl = postgraphile(preset);
  const resolvedPreset = pgl.getResolvedPreset();
  const releasePresetServices = createPresetServicesReleaser(resolvedPreset);
  const serv = pgl.createServ(grafserv);

  const app = express();
  const httpServer = createServer(app);
  const directHandler = serv.createHandler() as unknown as (
    req: Request,
    res: Response,
    next?: NextFunction
  ) => unknown;
  let failedBuildReleasePromise: Promise<void> | null = null;
  const releaseFailedBuild = (): Promise<void> => {
    if (failedBuildReleasePromise) return failedBuildReleasePromise;
    failedBuildReleasePromise = (async () => {
      let firstError: unknown;
      let failed = false;
      try {
        await pgl.release();
      } catch (error) {
        firstError = error;
        failed = true;
      }
      try {
        await releasePresetServices();
      } catch (error) {
        if (!failed) firstError = error;
        failed = true;
      }
      try {
        await releaseRuntimePool?.();
      } catch (error) {
        if (!failed) firstError = error;
        failed = true;
      }
      if (failed) throw firstError;
    })();
    return failedBuildReleasePromise;
  };

  let entry!: GraphileCacheEntry;
  entry = {
    pgl,
    serv,
    handler: app,
    httpServer,
    cacheKey,
    createdAt: Date.now(),
    releasePresetServices,
    runtimePoolIdentity,
    logicalServiceKey,
    releaseRuntimePool,
  };

  app.use((req, res, next) => {
    void withGraphileEntryUsage(
      entry,
      req,
      res,
      (request, response): Promise<unknown> =>
        Promise.resolve(directHandler(request, response, next))
    ).catch(next);
  });

  await awaitGraphileBuildReadiness({
    schemaResult: pgl.getSchemaResult(),
    addTo: () => serv.addTo(app, httpServer),
    ready: () => serv.ready(),
    release: releaseFailedBuild,
    onReleaseError: (releaseError) => {
      log.error(
        `Failed to release PostGraphile[${cacheKey}] after build failure:`,
        releaseError
      );
    }
  });

  if (enableRealtime) {
    try {
      const { RealtimeManager } = await import('graphile-realtime-subscriptions');

      // Extract PgSubscriber and pool from the resolved preset's pgServices.
      // The pool is the same instance managed by pg-cache (via getPgPool)
      // and threaded into the preset by makePgService({ pool, schemas }).
      const pgService = (resolvedPreset as any).pgServices?.[0];
      const pgSubscriber = pgService?.pgSubscriber ?? null;
      const pool = pgService?.adaptorSettings?.pool ?? null;

      if (!pgSubscriber) {
        log.warn(`PostGraphile[${cacheKey}] has no pgSubscriber — RealtimeManager will not be started`);
      } else if (!pool) {
        log.warn(`PostGraphile[${cacheKey}] has no pool in pgService — RealtimeManager will not be started`);
      } else {
        const manager = new RealtimeManager({
          pgSubscriber,
          pool,
          nodeId: `graphile-cache:${cacheKey}`,
          schema: 'realtime_public',
        });

        await manager.start();
        entry.realtimeManager = manager;
        log.info(`RealtimeManager started for PostGraphile[${cacheKey}]`);
      }
    } catch (err) {
      log.error(`Failed to start RealtimeManager for PostGraphile[${cacheKey}]:`, err);
    }
  }

  return entry;
};

export const createGraphileInstance = (
  opts: GraphileInstanceOptions
): Promise<GraphileCacheEntry> =>
  trackGraphileBuild(() => createGraphileInstanceInternal(opts));
