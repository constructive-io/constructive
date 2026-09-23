/**
 * actor-entity — Resolve the entity pair an authenticated actor works on
 * behalf of.
 *
 * `entity_id` / `entity_type` are attribution, not authorization: they name
 * the user or org that owns (and is billed for) work created in the request.
 * The pair is resolved server-side through `app_scope.actor_entity`, which
 * maps a principal credential to its owner — a principal is never an entity
 * of its own. Callers cannot supply the pair on the public surface.
 *
 * `app_scope` ships with the Constructive platform modules; a tenant database
 * without it (a bare RLS module) has no entity model, so no pair is stamped.
 * Once the resolver is present, a session that cannot be attributed is a
 * hard failure — work is never created entityless.
 */

import type { Pool } from 'pg';

export interface ActorEntity {
  entityId: string;
  entityType: string;
}

export type ActorEntityQuery = (
  databaseId: string,
  actorId: string
) => Promise<{ entity_id: string; entity_type: string } | undefined>;

export interface ActorEntityResolverOptions {
  query: ActorEntityQuery;
  ttlMs?: number;
  now?: () => number;
}

const DEFAULT_TTL_MS = 60_000;

export class ActorEntityError extends Error {
  readonly code = 'ACTOR_ENTITY_UNRESOLVED';
}

export const createActorEntityResolver = (opts: ActorEntityResolverOptions) => {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const now = opts.now ?? Date.now;
  const cache = new Map<string, { value: ActorEntity; expiresAt: number }>();

  return async (databaseId: string, actorId: string): Promise<ActorEntity> => {
    const key = `${databaseId}:${actorId}`;
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now()) {
      return hit.value;
    }
    const row = await opts.query(databaseId, actorId);
    if (!row?.entity_id || !row?.entity_type) {
      throw new ActorEntityError(
        `actor ${actorId} in database ${databaseId} does not resolve to an entity`
      );
    }
    const value: ActorEntity = { entityId: row.entity_id, entityType: row.entity_type };
    cache.set(key, { value, expiresAt: now() + ttlMs });
    return value;
  };
};

/** Whether the tenant database exposes `app_scope.actor_entity`. */
export const hasActorEntityResolver = async (pool: Pool): Promise<boolean> => {
  const result = await pool.query<{ present: boolean }>(
    "SELECT to_regprocedure('app_scope.actor_entity(uuid, uuid)') IS NOT NULL AS present"
  );
  return result.rows[0]?.present === true;
};

export const pgActorEntityQuery = (pool: Pool): ActorEntityQuery =>
  async (databaseId, actorId) => {
    const result = await pool.query<{ entity_id: string; entity_type: string }>(
      'SELECT entity_id, entity_type FROM app_scope.actor_entity($1, $2)',
      [databaseId, actorId]
    );
    return result.rows[0];
  };
