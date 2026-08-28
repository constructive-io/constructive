import './types';

import { ConstructiveError } from '@constructive-io/errors';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { Pool } from 'pg';
import { getPgEnvOptions } from 'pg-env';

import { ApiError } from '../errors/api-errors';
import { respondWithGraphQLError } from '../errors/graphql-response';
import type { ApiOptions } from '../types';

const log = new Logger('database-access-policy');

const POLICY_FUNCTION_PATTERN = /^([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)$/;
const POLICY_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/;
const MAX_POLICY_MESSAGE_LENGTH = 512;
const POLICY_UNAVAILABLE_CODE = 'DATABASE_ACCESS_POLICY_UNAVAILABLE';
const POLICY_UNAVAILABLE_MESSAGE = 'Database access policy is temporarily unavailable.';
const DEFAULT_POLICY_POOL_MAX = 2;
const DEFAULT_POLICY_TIMEOUT_MS = 1500;
const MAX_POLICY_POOL_MAX = 8;
const MAX_POLICY_TIMEOUT_MS = 30_000;
const MIN_POLICY_TIMEOUT_MS = 100;

interface PolicyFunction {
  schema: string;
  name: string;
}

interface PolicyDecisionRow {
  allowed: unknown;
  code: unknown;
  message: unknown;
  http_status: unknown;
}

interface DeniedDecision {
  allowed: false;
  code: string;
  message: string;
  httpStatus: number;
}

type PolicyDecision = { allowed: true } | DeniedDecision;

interface PolicyPool {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>>;
  end(): Promise<void>;
  on?(event: 'error', listener: (error: Error & { code?: string }) => void): unknown;
}

interface DatabaseAccessPolicyDependencies {
  createPool?: (config: PoolConfig) => PolicyPool;
}

export type DatabaseAccessPolicyMiddleware = RequestHandler & {
  close: () => Promise<void>;
};

const parsePolicyFunction = (value: string): PolicyFunction | null => {
  const match = POLICY_FUNCTION_PATTERN.exec(value);
  if (!match) return null;
  return { schema: match[1], name: match[2] };
};

const policyQuery = ({ schema, name }: PolicyFunction): string =>
  `select allowed, code, message, http_status
from "${schema}"."${name}"($1::uuid)
limit 2`;

const parseDecision = (rows: PolicyDecisionRow[]): PolicyDecision => {
  if (rows.length !== 1) {
    throw new Error(`policy function returned ${rows.length} rows; expected exactly one`);
  }

  const row = rows[0];
  if (row.allowed === true) {
    if (row.code !== null || row.message !== null || row.http_status !== null) {
      throw new Error('allowed policy decision must not include denial fields');
    }
    return { allowed: true };
  }

  if (row.allowed !== false) {
    throw new Error('policy decision allowed must be a boolean');
  }

  if (typeof row.code !== 'string' || !POLICY_ERROR_CODE_PATTERN.test(row.code)) {
    throw new Error('denied policy decision has an invalid code');
  }

  if (typeof row.message !== 'string') {
    throw new Error('denied policy decision has an invalid message');
  }
  const message = row.message.trim();
  if (!message || message.length > MAX_POLICY_MESSAGE_LENGTH) {
    throw new Error('denied policy decision has an invalid message');
  }

  if (
    !Number.isInteger(row.http_status) ||
    (row.http_status as number) < 400 ||
    (row.http_status as number) > 599
  ) {
    throw new Error('denied policy decision has an invalid HTTP status');
  }

  return {
    allowed: false,
    code: row.code,
    message,
    httpStatus: row.http_status as number
  };
};

const isGraphQLRequest = (req: Request): boolean =>
  req.path === '/graphql' || req.path === '/graphql/';

const rejectRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
  decision: Omit<DeniedDecision, 'allowed'>,
  errorClass: 'public' | 'internal'
): void => {
  if (isGraphQLRequest(req)) {
    respondWithGraphQLError(
      res,
      new ConstructiveError({
        code: decision.code,
        message: decision.message,
        errorClass,
        http: decision.httpStatus
      }),
      decision.httpStatus
    );
    return;
  }

  next(new ApiError(decision.code, decision.httpStatus, decision.message));
};

const rejectUnavailable = (
  req: Request,
  res: Response,
  next: NextFunction
): void => rejectRequest(
  req,
  res,
  next,
  {
    code: POLICY_UNAVAILABLE_CODE,
    message: POLICY_UNAVAILABLE_MESSAGE,
    httpStatus: 503
  },
  'internal'
);

const withClose = (
  middleware: RequestHandler,
  pool?: PolicyPool
): DatabaseAccessPolicyMiddleware => {
  let closePromise: Promise<void> | null = null;
  return Object.assign(middleware, {
    close: (): Promise<void> => {
      if (!pool) return Promise.resolve();
      closePromise ??= pool.end();
      return closePromise;
    }
  });
};

const validPoolMax = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= MAX_POLICY_POOL_MAX;

const validTimeout = (value: number): boolean =>
  Number.isInteger(value) &&
  value >= MIN_POLICY_TIMEOUT_MS &&
  value <= MAX_POLICY_TIMEOUT_MS;

const createPolicyPool = (
  opts: ApiOptions,
  poolMax: number,
  timeoutMs: number,
  dependencies: DatabaseAccessPolicyDependencies
): PolicyPool => {
  const pg = getPgEnvOptions(opts.pg);
  const config: PoolConfig = {
    ...pg,
    max: poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: timeoutMs,
    statement_timeout: timeoutMs,
    query_timeout: timeoutMs,
    allowExitOnIdle: true,
    application_name: 'constructive_database_access_policy'
  };
  const pool = dependencies.createPool?.(config) ?? new Pool(config);
  pool.on?.('error', (error: Error & { code?: string }) => {
    log.error('[database-access-policy] idle policy connection failed', {
      code: error.code,
      error: error.message
    });
  });
  return pool;
};

/**
 * Check a resolved database against an optional control-plane access policy.
 *
 * API resolution runs first and supplies `req.databaseId`. The policy query
 * deliberately uses the server's configured routing/platform pool rather than
 * the resolved tenant database, and it runs on every request so a cached API
 * route cannot cache an access decision.
 */
export const createDatabaseAccessPolicyMiddleware = (
  opts: ApiOptions,
  dependencies: DatabaseAccessPolicyDependencies = {}
): DatabaseAccessPolicyMiddleware => {
  const configuredFunction = opts.api?.databaseAccessPolicyFunction?.trim();
  if (!configuredFunction) {
    return withClose((_req, _res, next): void => next());
  }

  const fn = parsePolicyFunction(configuredFunction);
  if (!fn) {
    log.error(
      '[database-access-policy] API_DATABASE_ACCESS_POLICY_FUNCTION must be two lowercase identifiers separated by a dot'
    );
    return withClose((req, res, next): void => rejectUnavailable(req, res, next));
  }

  const poolMax = opts.api?.databaseAccessPolicyPoolMax ?? DEFAULT_POLICY_POOL_MAX;
  const timeoutMs = opts.api?.databaseAccessPolicyTimeoutMs ?? DEFAULT_POLICY_TIMEOUT_MS;
  if (!validPoolMax(poolMax) || !validTimeout(timeoutMs)) {
    log.error(
      '[database-access-policy] policy pool bounds are invalid',
      { poolMax, timeoutMs }
    );
    return withClose((req, res, next): void => rejectUnavailable(req, res, next));
  }

  const pool = createPolicyPool(opts, poolMax, timeoutMs, dependencies);
  const query = policyQuery(fn);

  const middleware: RequestHandler = async (req, res, next): Promise<void> => {
    if (!req.databaseId) {
      log.error('[database-access-policy] API resolution did not provide a database id');
      rejectUnavailable(req, res, next);
      return;
    }

    let decision: PolicyDecision;
    try {
      const result = await pool.query<PolicyDecisionRow>(query, [req.databaseId]);
      decision = parseDecision(result.rows);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      log.error('[database-access-policy] policy evaluation failed', {
        databaseId: req.databaseId,
        error: detail
      });
      rejectUnavailable(req, res, next);
      return;
    }

    if (decision.allowed === true) {
      next();
      return;
    }

    rejectRequest(req, res, next, decision, 'public');
  };
  return withClose(middleware, pool);
};
