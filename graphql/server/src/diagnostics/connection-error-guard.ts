import { Logger } from '@pgpmjs/logger';

const log = new Logger('connection-guard');

/**
 * Process-level guard for connection-class failures.
 *
 * A multi-tenant server holds many long-lived PostgreSQL connections (service
 * pools, LISTEN/NOTIFY, introspection checkouts). When PostgreSQL restarts or
 * crash-recovers (failover, OOM-killed backend, admin restart), every one of
 * those sockets dies at once. Most owners handle their own errors (pg-cache
 * pools, the schema listener), but a checkout that is mid-query when the
 * server goes away can surface as an unhandled 'error' event on a raw pg
 * Client — which kills the WHOLE process, turning a ~15s PostgreSQL recovery
 * into a full outage for every tenant (observed live during scale validation:
 * an introspection backend was OOM-killed, PG crash-recovered, and the node
 * process exited on the orphaned client error).
 *
 * This guard absorbs ONLY connection-class errors (logged, counted); anything
 * else preserves fatal semantics via process.exit(1). Pools reconnect on the
 * next checkout, so the correct behavior after PG recovery is a brief burst
 * of 5xx followed by self-healing — not process death.
 *
 * Disable with GRAPHILE_CONNECTION_GUARD=0.
 */
const CONN_ERROR_CODES = new Set([
  '57P01', // admin_shutdown (pg_terminate_backend / restart)
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now (recovery in progress)
  '08006', // connection_failure
  '08003', // connection_does_not_exist
  '53300', // too_many_connections
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE'
]);

const CONN_ERROR_RE =
  /connection terminated|terminating connection|server closed the connection|connection ended|client has encountered a connection error/i;

export const isConnectionClassError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const code = (err as Error & { code?: string }).code;
  if (code && CONN_ERROR_CODES.has(code)) return true;
  return CONN_ERROR_RE.test(err.message || '');
};

export interface ConnectionErrorGuardCounters {
  absorbedExceptions: number;
  absorbedRejections: number;
}

const counters: ConnectionErrorGuardCounters = {
  absorbedExceptions: 0,
  absorbedRejections: 0
};

export const getConnectionErrorGuardCounters = (): ConnectionErrorGuardCounters => ({ ...counters });

let installed = false;

export function installConnectionErrorGuard(): void {
  if (installed) return;
  if (process.env.GRAPHILE_CONNECTION_GUARD === '0') return;
  installed = true;

  process.on('uncaughtException', (err) => {
    if (isConnectionClassError(err)) {
      counters.absorbedExceptions++;
      log.error(
        `Absorbed connection-class exception (PG restart/failover?): ${(err as Error).message} ` +
          `[absorbed=${counters.absorbedExceptions}] — pools reconnect on next checkout`
      );
      return;
    }
    // Preserve fatal semantics for everything else.
    // eslint-disable-next-line no-console
    console.error('Uncaught exception (fatal):', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    if (isConnectionClassError(reason)) {
      counters.absorbedRejections++;
      log.error(
        `Absorbed connection-class rejection (PG restart/failover?): ${(reason as Error).message} ` +
          `[absorbed=${counters.absorbedRejections}]`
      );
      return;
    }
    // eslint-disable-next-line no-console
    console.error('Unhandled rejection (fatal):', reason);
    process.exit(1);
  });

  log.info('connection-error guard installed (disable with GRAPHILE_CONNECTION_GUARD=0)');
}
