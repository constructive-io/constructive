/**
 * Whether an error means PostgreSQL could not be reached, or ended the
 * connection, rather than rejecting the work itself. Such a failure clears
 * without any change to the request (a restart, a failover, a saturated pool),
 * so it is reported as retryable instead of as an internal error.
 *
 * @module errors/database-availability
 */

/** SQLSTATEs outside class 08 (connection exception) that mean the same. */
const UNAVAILABLE_SQLSTATES = new Set([
  '53300', // too_many_connections
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03' // cannot_connect_now
]);

/** Socket-level failures reported by Node. */
const UNAVAILABLE_SOCKET_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH'
]);

/** node-postgres reports these without a SQLSTATE or socket code. */
const UNAVAILABLE_MESSAGES = [
  // pg-pool: no connection became free within connectionTimeoutMillis
  'timeout exceeded when trying to connect',
  // pg: the socket closed under an open connection
  'Connection terminated unexpectedly',
  // pg: connecting took longer than connectionTimeoutMillis
  'Connection terminated due to connection timeout',
  // pg: a query on a client whose connection already failed
  'Client has encountered a connection error and is not queryable'
];

/** How far to follow `cause` and `AggregateError` members. */
const MAX_DEPTH = 5;

export const isDatabaseUnavailableError = (error: unknown, depth = 0): boolean => {
  if (depth > MAX_DEPTH || !(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') {
    if (code.startsWith('08') && code.length === 5) return true;
    if (UNAVAILABLE_SQLSTATES.has(code) || UNAVAILABLE_SOCKET_CODES.has(code)) return true;
  }
  if (UNAVAILABLE_MESSAGES.some((message) => error.message.includes(message))) return true;
  if (
    error instanceof AggregateError &&
    error.errors.some((member) => isDatabaseUnavailableError(member, depth + 1))
  ) {
    return true;
  }
  return isDatabaseUnavailableError(error.cause, depth + 1);
};
