/**
 * Who a metered request belongs to.
 *
 * These are exactly the headers `agentic-server` reads (`X-Database-Id`,
 * `X-Entity-Id`, `X-Actor-Id`) — the same identity lane the platform's own
 * clients use — so a pi session lands in `inference_log` beside every other
 * metered call rather than in a parallel accounting scheme.
 *
 * Headers are only trustworthy where the gateway is not reachable by the
 * untrusted party: in-cluster, or behind an authenticated ingress that pins the
 * identity from the bearer. Off-cluster hosts must send `runToken` and let the
 * ingress do the pinning.
 */

export interface MeteredIdentity {
  /** Tenant database the usage is billed to. Required by the gateway. */
  databaseId: string;
  /** Owning entity (organization/user) when the platform tracks one. */
  entityId?: string;
  /** The actor on whose behalf the run executes. */
  actorId?: string;
  /**
   * Bearer token for the gateway's ingress — run-scoped, not an account token.
   * Sent as `Authorization: Bearer <token>`.
   */
  runToken?: string;
}

export const DATABASE_ID_HEADER = 'X-Database-Id';
export const ENTITY_ID_HEADER = 'X-Entity-Id';
export const ACTOR_ID_HEADER = 'X-Actor-Id';

/**
 * Build the identity headers for a metered request.
 *
 * Throws on a missing/blank `databaseId`: the gateway would reject the call with
 * a 400 at the first model turn, which surfaces as an opaque agent failure much
 * later than the misconfiguration.
 */
export function buildIdentityHeaders(identity: MeteredIdentity): Record<string, string> {
  const databaseId = identity.databaseId?.trim();
  if (!databaseId) throw new Error('metered model: identity.databaseId is required');

  const headers: Record<string, string> = { [DATABASE_ID_HEADER]: databaseId };
  const entityId = identity.entityId?.trim();
  if (entityId) headers[ENTITY_ID_HEADER] = entityId;
  const actorId = identity.actorId?.trim();
  if (actorId) headers[ACTOR_ID_HEADER] = actorId;
  const runToken = identity.runToken?.trim();
  if (runToken) headers.Authorization = `Bearer ${runToken}`;
  return headers;
}
