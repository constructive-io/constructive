import { Logger } from '@pgpmjs/logger';
import type { Pool } from 'pg';

import type { ApiStructure } from '../types';
import {
  collisionsFromRelations,
  computeBlueprintKey,
  fetchSchemaRelations,
  fingerprintFromRelations,
  stripSchemaHashPrefix
} from './blueprint';

// =============================================================================
// Blueprint Pooling: per-svc decision + decision cache
//
// Decides whether a service (svc_key) may attach to a SHARED, search_path-routed
// PostGraphile instance (blueprint pooling) or must keep a per-tenant instance.
// Kept in its own module — free of the heavy graphile.ts import chain — so the
// decision logic is unit-testable without loading PostGraphile.
// =============================================================================

const log = new Logger('graphile:pooling');

export interface PoolDecision {
  /** Effective graphileCache key: a `bp:` blueprint key when pooling, else the svc_key. */
  key: string;
  /** Whether this svc attaches to a shared, search_path-routed instance. */
  pooling: boolean;
  /**
   * True when the fallback came from a thrown catalog probe (a possibly
   * transient DB error) rather than a structural opt-out. Transient decisions
   * are NOT memoized, so the next request re-probes instead of permanently
   * pinning the svc to a per-tenant instance until the next flush.
   */
  transient?: boolean;
  /**
   * The tenant database this decision belongs to — lets flushService invalidate
   * ONLY the affected database's decisions/blueprint instead of a fleet-wide
   * flush on every schema:update.
   */
  databaseId?: string;
}

/**
 * Memoized pooling decision per svc_key. Computing a decision runs two catalog
 * probes (shape fingerprint + collision check), so the result is cached and
 * invalidated on flush (see clearPoolDecisions / flushService).
 */
const poolDecisions = new Map<string, PoolDecision>();

/**
 * Clear all cached pooling decisions (explicit /flush admin route).
 */
export function clearPoolDecisions(): void {
  poolDecisions.clear();
}

/**
 * Invalidate ONLY the decisions belonging to one tenant database and return the
 * `bp:` keys it was attached to (so flushService can rebuild exactly the
 * affected blueprint). A schema change in tenant X:
 *   - X's decisions must recompute (its fingerprint may have changed), and
 *   - the blueprint instance X was pooled into must rebuild (its shared schema
 *     was derived from a catalog that included X's old shape),
 * while every OTHER blueprint keeps serving untouched. A brand-new tenant has
 * no memoized decisions => provisioning events are a no-op here (new tenants
 * probe on first request; instances are shape-generic and need no rebuild to
 * accept another same-shape tenant).
 */
export function clearPoolDecisionsForDatabase(databaseId: string): string[] {
  const bpKeys = new Set<string>();
  for (const [svcKey, decision] of poolDecisions) {
    if (decision.databaseId === databaseId) {
      if (decision.pooling && decision.key.startsWith('bp:')) {
        bpKeys.add(decision.key);
      }
      poolDecisions.delete(svcKey);
    }
  }
  return [...bpKeys];
}

/**
 * Compute (WITHOUT caching) the blueprint-pooling decision for a service.
 *
 * Returns `{ pooling: false, key: svcKey }` — a per-tenant instance keyed by the
 * normal svc_key — when the API opts out of pooling: realtime is enabled, there
 * are no schemas, an unqualified relation-name collision would make search_path
 * routing ambiguous, or the catalog probes throw. Otherwise returns
 * `{ pooling: true, key: 'bp:...' }` so same-shape tenants share one instance.
 *
 * Exported for unit testing; the dispatcher uses the cached resolvePoolDecision.
 */
export const computePoolDecision = async (
  svcKey: string,
  api: ApiStructure,
  pool: Pool
): Promise<PoolDecision> => {
  // Realtime instances hold a LISTEN/NOTIFY connection + RealtimeManager per
  // instance and can't be safely shared across tenants — never pool them.
  if (api.databaseSettings?.enableRealtime === true) {
    return { key: svcKey, pooling: false };
  }
  if (!api.schema || api.schema.length === 0) {
    return { key: svcKey, pooling: false };
  }

  try {
    // One catalog scan feeds both the fingerprint and the collision check.
    const relations = await fetchSchemaRelations(pool, api.schema);
    const collisions = collisionsFromRelations(relations);
    if (collisions.length > 0) {
      log.warn(
        `svc=${svcKey} not poolable — unqualified relation collision(s): ${collisions.join(', ')}; using per-tenant instance`
      );
      return { key: svcKey, pooling: false };
    }

    const key = computeBlueprintKey({
      logicalSchemas: api.logicalSchemas ?? api.schema.map(stripSchemaHashPrefix),
      shapeFingerprint: fingerprintFromRelations(relations),
      flags: api.databaseSettings as Record<string, any> | undefined,
      apiName: (api as { apiName?: string | null }).apiName ?? null,
      mode: 'public',
      dbname: api.dbname
    });
    return { key, pooling: true };
  } catch (err) {
    log.warn(
      `svc=${svcKey} not poolable — shape/collision probe failed: ${err instanceof Error ? err.message : String(err)}; using per-tenant instance (not memoized)`
    );
    return { key: svcKey, pooling: false, transient: true };
  }
};

/**
 * Resolve the pooling decision for a service, memoized per svc_key. Exported for
 * unit testing of the memoization/invalidation behaviour.
 */
export const resolvePoolDecision = async (
  svcKey: string,
  api: ApiStructure,
  pool: Pool
): Promise<PoolDecision> => {
  const cached = poolDecisions.get(svcKey);
  if (cached) return cached;
  const decision = await computePoolDecision(svcKey, api, pool);
  if (!decision.transient) {
    // Stamp the owning database once, at the single memoization point, so
    // flushService can invalidate per-database instead of fleet-wide.
    const memoized: PoolDecision = { ...decision, databaseId: (api as any).databaseId ?? undefined };
    poolDecisions.set(svcKey, memoized);
    return memoized;
  }
  return decision;
};
