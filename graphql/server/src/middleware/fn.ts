/**
 * fn — REST function invocation routes
 *
 *   POST /fn/:alias           → invoke a function bound to this API (202 { invocationId })
 *   GET  /fn/invocations/:id  → read invocation status/result
 *
 * Routing is per-API: bindings are looked up in the function_api_bindings
 * table by (api_id, alias), where api_id comes from the server-side domain
 * resolution (req.constructive.api.apiId) — never from client input.
 *
 * Per-protocol enablement lives in the binding's `config` jsonb:
 *   { "graphql": true, "rest": { "path": "/...", "methods": ["POST"] } }
 * An absent `rest` key means REST is disabled for the binding.
 *
 * All queries run through req.constructive.withPgClient, which applies the
 * request's pgSettings (role + jwt.claims.* incl. jwt.claims.api_id) in a
 * transaction — RLS is fully enforced; no superuser or bypass path is used.
 */

import { Logger } from '@pgpmjs/logger';
import express, { Request, Response, Router } from 'express';
import { escapeIdentifier } from 'pg';

const log = new Logger('fn');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BindingRow {
  config: RestBindingConfig | null;
  task_identifier: string;
  database_id: string;
}

interface RestBindingConfig {
  graphql?: boolean;
  rest?: {
    path?: string;
    methods?: string[];
  };
}

interface InvocationRow {
  id: string;
  status: string;
  payload: unknown;
  result: unknown;
  error: unknown;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
}

const notFound = (res: Response): void => {
  res.status(404).json({ error: 'Not found' });
};

async function handleInvoke(req: Request, res: Response): Promise<void> {
  const ctx = req.constructive;
  if (!ctx?.api?.apiId) {
    notFound(res);
    return;
  }

  const compute = await ctx.useModule('compute');
  if (!compute) {
    notFound(res);
    return;
  }

  const { schemaName, bindingsTableName, definitionsTableName } = compute;
  const alias = req.params.alias;

  try {
    const binding = await ctx.withPgClient(async (client) => {
      const { rows } = await client.query<BindingRow>(
        `SELECT b.config, d.task_identifier, d.database_id
         FROM ${escapeIdentifier(schemaName)}.${escapeIdentifier(bindingsTableName)} b
         JOIN ${escapeIdentifier(schemaName)}.${escapeIdentifier(definitionsTableName)} d ON d.id = b.function_definition_id
         WHERE b.api_id = $1 AND b.alias = $2`,
        [ctx.api.apiId, alias]
      );
      return rows[0];
    });

    // 404 when the binding doesn't exist, REST is disabled for the binding
    // (absent `rest` config), or the HTTP method isn't allowed.
    const rest = binding?.config?.rest;
    if (!binding || !rest) {
      notFound(res);
      return;
    }
    const methods = (rest.methods ?? ['POST']).map((m) => m.toUpperCase());
    if (!methods.includes(req.method)) {
      notFound(res);
      return;
    }

    // TODO: JSON-Schema (ajv) payload validation hook — intentionally deferred.
    // When enabled it should validate req.body against the binding/function
    // input schema here, before the invocation row is inserted.
    const payload = req.body ?? {};

    const invocationId = await ctx.withPgClient(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO ${escapeIdentifier(compute.invocationsSchemaName)}.${escapeIdentifier(compute.invocationsTableName)}
         (database_id, task_identifier, payload)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id`,
        [binding.database_id, binding.task_identifier, JSON.stringify(payload)]
      );
      return rows[0].id;
    });

    res.status(202).json({ invocationId });
  } catch (err: any) {
    if (err?.code === '42501') {
      // insufficient_privilege — RLS rejected the insert for this caller
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    log.error({ event: 'fn_invoke_failed', alias, requestId: req.requestId, error: err?.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetInvocation(req: Request, res: Response): Promise<void> {
  const ctx = req.constructive;
  if (!ctx?.api?.apiId) {
    notFound(res);
    return;
  }

  const id = req.params.id;
  if (!UUID_RE.test(id)) {
    notFound(res);
    return;
  }

  const compute = await ctx.useModule('compute');
  if (!compute) {
    notFound(res);
    return;
  }

  try {
    const invocation = await ctx.withPgClient(async (client) => {
      const { rows } = await client.query<InvocationRow>(
        `SELECT id, status, result, error, created_at, started_at, completed_at, duration_ms
         FROM ${escapeIdentifier(compute.invocationsSchemaName)}.${escapeIdentifier(compute.invocationsTableName)}
         WHERE id = $1`,
        [id]
      );
      return rows[0];
    });

    // RLS-filtered read: rows not visible to the caller simply aren't returned
    if (!invocation) {
      notFound(res);
      return;
    }

    res.status(200).json({
      id: invocation.id,
      status: invocation.status,
      result: invocation.result,
      error: invocation.error,
      createdAt: invocation.created_at,
      startedAt: invocation.started_at,
      completedAt: invocation.completed_at,
      durationMs: invocation.duration_ms
    });
  } catch (err: any) {
    log.error({ event: 'fn_get_invocation_failed', id, requestId: req.requestId, error: err?.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function createFnRouter(): Router {
  const router = Router();

  router.use('/fn', express.json());
  router.get('/fn/invocations/:id', handleGetInvocation);
  router.all('/fn/:alias', handleInvoke);

  return router;
}
