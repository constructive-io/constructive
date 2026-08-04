import { Logger } from '@pgpmjs/logger';
import { grafserv } from 'grafserv/express/v4';
import {
  ActivatableGenerationScopedRealtimeSubscriber,
  type RealtimeTopicCollector
} from 'graphile-realtime-subscriptions';
import type { PgNotificationListenerConfig, PgPoolLease } from 'pg-cache';
import { postgraphile } from 'postgraphile';

import { awaitGraphileBuildReadiness } from './build-readiness';
import type {
  GraphileCacheEntry,
  GraphileUpgradeHandler
} from './graphile-cache';
import { retireGraphileCacheEntry } from './graphile-cache';
import {
  attachGraphileHttpHandler,
  createGraphileHttpHandler
} from './http-adapter';
import { createPresetServicesReleaser } from './preset-services';
import {
  createGraphileRealtimeHealth,
  GraphileRealtimeStartupError,
  startConfiguredRealtime
} from './realtime-readiness';
import {
  activateGraphileSharedRealtime,
  type GraphileRealtimeRoleAttestation
} from './shared-realtime';

const log = new Logger('graphile-cache:create');

export interface GraphileInstanceOptions {
  preset: any;
  cacheKey: string;
  poolIdentity?: string;
  /**
   * Lease protecting the runtime pool for the lifetime of this instance.
   *
   * The caller owns the lease until `createGraphileInstance()` resolves. Once
   * it resolves, ownership transfers to the returned cache entry and its
   * disposal lifecycle releases the lease after PostGraphile teardown.
   */
  poolLease?: PgPoolLease;
  serviceKey?: string;
  databaseId?: string | null;
  /**
   * When true, a RealtimeManager is created and started alongside the
   * PostGraphile instance.  The pool is extracted from the preset's
   * pgServices (managed by pg-cache) rather than passed separately.
   */
  enableRealtime?: boolean;
  /**
   * Build a no-server Grafserv upgrade handler for an outer tenant-aware
   * router. The preset must explicitly enable `grafserv.websockets`; the
   * cached instance still never attaches its own upgrade listener.
   */
  enableWebsockets?: boolean;
  /**
   * Physical schema containing this instance's realtime cursor functions.
   * Omit to use the compatibility default `realtime_public`.
   */
  realtimeSchema?: string;
  /** Exact physical source schemas allowed to produce realtime events. */
  realtimeSourceSchemas?: readonly string[];
  /** Cursor recovery polling interval; defaults to RealtimeManager's 5s. */
  realtimeCursorPollIntervalMs?: number;
  /** Cursor listener heartbeat interval; defaults to RealtimeManager's 30s. */
  realtimeCursorHeartbeatIntervalMs?: number;
  /** Opt-in exact-topic shared notification transport. */
  sharedRealtime?: {
    subscriber: ActivatableGenerationScopedRealtimeSubscriber;
    topicCollector: RealtimeTopicCollector;
    listenerPgConfig: PgNotificationListenerConfig;
    listenerIdentity: string;
    roleRevalidationMs: number;
  };
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
 * When `poolLease` is supplied, ownership transfers only when this promise
 * resolves. If instance creation rejects, the caller must release the lease.
 *
 * When `enableRealtime` is true, a RealtimeManager is created that bridges
 * cursor-tracked events from `drain_changes()` into the PostGraphile
 * instance's PgSubscriber EventEmitter.  Both `pgSubscriber` and the pg
 * pool are extracted from the resolved preset's pgServices — no separate
 * pool parameter is needed.
 */
export const createGraphileInstance = async (
  opts: GraphileInstanceOptions
): Promise<GraphileCacheEntry> => {
  const {
    preset,
    cacheKey,
    poolIdentity,
    poolLease,
    serviceKey,
    databaseId,
    enableRealtime = false,
    enableWebsockets = false,
    realtimeSchema,
    realtimeSourceSchemas,
    realtimeCursorPollIntervalMs,
    realtimeCursorHeartbeatIntervalMs,
    sharedRealtime
  } = opts;

  if (poolLease && poolIdentity && poolLease.identity !== poolIdentity) {
    throw new Error(
      `PostGraphile[${cacheKey}] pool identity does not match its retained lease`
    );
  }

  const pgl = postgraphile(preset);
  const resolvedPreset = pgl.getResolvedPreset();
  const releasePresetServices = createPresetServicesReleaser(resolvedPreset);
  const serv = pgl.createServ(grafserv);
  const handler = createGraphileHttpHandler();
  let upgradeHandler: GraphileUpgradeHandler | null = null;
  let startupAttestation: GraphileRealtimeRoleAttestation | undefined;
  let startupReleasePromise: Promise<void> | null = null;
  const releaseFailedGeneration = (): Promise<void> => {
    if (startupReleasePromise) return startupReleasePromise;
    startupReleasePromise = (async () => {
      let firstError: unknown;
      try {
        await pgl.release();
      } catch (error) {
        firstError = error;
      }
      try {
        await releasePresetServices();
      } catch (error) {
        firstError ??= error;
      }
      try {
        startupAttestation?.release();
      } catch (error) {
        firstError ??= error;
      }
      try {
        await sharedRealtime?.subscriber.release();
      } catch (error) {
        firstError ??= error;
      }
      if (firstError) throw firstError;
    })();
    return startupReleasePromise;
  };

  // Start the schema build before wiring grafserv, but do not let this
  // factory resolve until both are ready. `serv.ready()` alone does not
  // guarantee that PostGraphile's gather/build phase has completed.
  await awaitGraphileBuildReadiness({
    schemaResult: pgl.getSchemaResult(),
    addTo: async () => {
      const presetWebsockets = resolvedPreset.grafserv?.websockets === true;
      if (presetWebsockets !== enableWebsockets) {
        throw new Error(
          `PostGraphile[${cacheKey}] websocket preset and shared routing must agree`
        );
      }
      await attachGraphileHttpHandler(serv, handler, resolvedPreset, {
        sharedWebsocketRouting: enableWebsockets
      });
      if (enableWebsockets) {
        upgradeHandler = await serv.getUpgradeHandler();
        if (!upgradeHandler) {
          throw new Error(
            `PostGraphile[${cacheKey}] websocket upgrade handler is unavailable`
          );
        }
      }
    },
    ready: () => serv.ready(),
    release: releaseFailedGeneration,
    onReleaseError: (releaseError) => {
      log.error(`Failed to release PostGraphile[${cacheKey}] after build failure:`, releaseError);
    }
  });

  const entry: GraphileCacheEntry = {
    pgl,
    serv,
    handler,
    upgradeHandler,
    httpServer: null,
    cacheKey,
    poolIdentity: poolLease?.identity ?? poolIdentity,
    poolLease,
    releasePresetServices,
    serviceKey,
    databaseId,
    createdAt: Date.now(),
    ...(sharedRealtime ? { realtimeSubscriber: sharedRealtime.subscriber } : {})
  };

  if (enableRealtime) {
    const realtimeHealth = createGraphileRealtimeHealth();
    entry.realtimeHealth = realtimeHealth;
    const onFatalError = (error: Error): void => {
      const alreadyFailed = entry.realtimeHealth?.status === 'failed';
      retireGraphileCacheEntry(entry, error);
      if (!alreadyFailed) {
        log.error(
          `PostGraphile[${cacheKey}] realtime delivery became unavailable:`,
          error
        );
      }
    };
    if (sharedRealtime) {
      const pgService = (resolvedPreset as any)?.pgServices?.[0];
      if (pgService?.pgSubscriber !== sharedRealtime.subscriber) {
        await releaseFailedGeneration();
        throw new GraphileRealtimeStartupError(
          cacheKey,
          new Error('Resolved pgService did not retain the provided generation subscriber')
        );
      }
      try {
        startupAttestation = await activateGraphileSharedRealtime({
          ...sharedRealtime,
          allowedSourceSchemas: realtimeSourceSchemas ?? [],
          onFatalError
        });
        entry.realtimeRoleAttestation = startupAttestation;
      } catch (error) {
        try {
          await releaseFailedGeneration();
        } catch (releaseError) {
          log.error(
            `Failed to release PostGraphile[${cacheKey}] after shared realtime activation failure:`,
            releaseError
          );
        }
        throw error instanceof GraphileRealtimeStartupError
          ? error
          : new GraphileRealtimeStartupError(cacheKey, error);
      }
    }
    entry.realtimeManager = await startConfiguredRealtime({
      cacheKey,
      resolvedPreset,
      realtimeSchema,
      allowedSourceSchemas: realtimeSourceSchemas ?? [],
      ...(sharedRealtime ? { publisher: sharedRealtime.subscriber } : {}),
      ...(realtimeCursorPollIntervalMs === undefined
        ? {}
        : { pollIntervalMs: realtimeCursorPollIntervalMs }),
      ...(realtimeCursorHeartbeatIntervalMs === undefined
        ? {}
        : { heartbeatIntervalMs: realtimeCursorHeartbeatIntervalMs }),
      onFatalError,
      releasePostGraphile: releaseFailedGeneration
    });
    if (entry.realtimeHealth.status === 'failed') {
      try {
        await entry.realtimeManager.stop();
      } finally {
        await releaseFailedGeneration();
      }
      throw new GraphileRealtimeStartupError(
        cacheKey,
        new Error('Realtime delivery failed during generation activation')
      );
    }
    log.info(`RealtimeManager started for PostGraphile[${cacheKey}]`);
  }

  return entry;
};
