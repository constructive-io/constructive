/**
 * Who a metered request belongs to, and which task it is a cost of.
 *
 * These are exactly the headers `agentic-server` reads — identity
 * (`X-Database-Id`, `X-Entity-Id`, `X-Actor-Id`) plus task correlation
 * (`X-Invocation-Id`, `X-Job-Id`, `X-Attempt`, `X-Run-Id`) — the same lane the
 * platform's own clients use, so a pi session lands in `inference_log` beside
 * every other metered call rather than in a parallel accounting scheme, and its
 * tokens join the invocation the customer was actually charged for.
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
  /** Invocation the run is executing, when the platform dispatched it. */
  invocationId?: string;
  /** Queue job id for that invocation; decimal digits only. */
  jobId?: string;
  /** Attempt number of that job; a non-negative integer. */
  attempt?: number;
  /** The agent run itself. */
  runId?: string;
  /**
   * Bearer token for the gateway's ingress — run-scoped, not an account token.
   * Sent as `Authorization: Bearer <token>`.
   */
  runToken?: string;
}

export const DATABASE_ID_HEADER = 'X-Database-Id';
export const ENTITY_ID_HEADER = 'X-Entity-Id';
export const ACTOR_ID_HEADER = 'X-Actor-Id';
export const INVOCATION_ID_HEADER = 'X-Invocation-Id';
export const JOB_ID_HEADER = 'X-Job-Id';
export const ATTEMPT_HEADER = 'X-Attempt';
export const RUN_ID_HEADER = 'X-Run-Id';

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
  const invocationId = identity.invocationId?.trim();
  if (invocationId) headers[INVOCATION_ID_HEADER] = invocationId;
  const jobId = identity.jobId?.trim();
  if (jobId) {
    if (!/^\d+$/.test(jobId)) throw new Error(`metered model: identity.jobId must be decimal digits, got "${jobId}"`);
    headers[JOB_ID_HEADER] = jobId;
  }
  if (identity.attempt !== undefined) {
    if (!Number.isInteger(identity.attempt) || identity.attempt < 0) {
      throw new Error(`metered model: identity.attempt must be a non-negative integer, got ${identity.attempt}`);
    }
    headers[ATTEMPT_HEADER] = String(identity.attempt);
  }
  const runId = identity.runId?.trim();
  if (runId) headers[RUN_ID_HEADER] = runId;
  const runToken = identity.runToken?.trim();
  if (runToken) headers.Authorization = `Bearer ${runToken}`;
  return headers;
}
