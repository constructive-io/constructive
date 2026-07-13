/**
 * fn — REST function invocation routes
 *
 *   POST /fn/:alias           → invoke a function bound to this API (202 { invocationId })
 *   GET  /fn/invocations/:id  → read invocation status/result
 *
 * Routing is per-API: bindings are looked up by (api_id, alias) across the
 * bindings tables of every provisioned function-module scope, where api_id
 * comes from the server-side domain resolution (req.constructive.api.apiId)
 * — never from client input. RLS on the underlying tables governs access.
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
import { QueryBuilder, type SqlValue } from '@constructive-io/query-builder';
import express, { Request, Response, Router } from 'express';

const log = new Logger('fn');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BindingRow {
  id: string;
  function_definition_id: string;
  config: RestBindingConfig | null;
  task_identifier: string;
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
  if (!compute?.modules.length) {
    notFound(res);
    return;
  }

  const alias = req.params.alias;

  try {
    // Resolve the alias across every function-module scope's bindings table.
    const resolved = await ctx.withPgClient(async (client) => {
      const matches: Array<{ binding: BindingRow; module: (typeof compute.modules)[number] }> = [];
      for (const module of compute.modules) {
        // Binding lookup carries everything the invocation insert needs:
        // the binding id (api_binding_id), the definition it points at
        // (function_definition_id), the resolved task_identifier, and config.
        const { text, values } = new QueryBuilder()
          .schema(module.schemaName)
          .table(module.bindingsTableName, 'b')
          .select(['b.id', 'b.function_definition_id', 'b.config', 'd.task_identifier'])
          .innerJoin(module.definitionsTableName, 'b.function_definition_id', '=', 'd.id', {
            schema: module.schemaName,
            alias: 'd',
          })
          .where('b.api_id', '=', ctx.api.apiId)
          .where('b.alias', '=', alias)
          .build();
        const { rows } = await client.query<BindingRow>(text, values);
        for (const row of rows) {
          matches.push({ binding: row, module });
        }
      }
      return matches;
    });

    if (resolved.length > 1) {
      // Same alias bound to this API from more than one scope — ambiguous.
      res.status(409).json({ error: `Alias "${alias}" is ambiguous for this API` });
      return;
    }

    const binding = resolved[0]?.binding;

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

    const { invocationsSchemaName, invocationsTableName, invocationsEntityField } = resolved[0].module;

    // API-channel provenance: set both the definition and the binding the
    // invocation came through, at status 'pending'. The database's AFTER
    // INSERT enqueue trigger schedules the job — the server never enqueues.
    const insertData: Record<string, SqlValue> = {
      task_identifier: binding.task_identifier,
      function_definition_id: binding.function_definition_id,
      api_binding_id: binding.id,
      status: 'pending',
      payload: JSON.stringify(payload),
    };
    // Scope-key column driven by the module's recorded entity_field: set for
    // the database scope (database_id), absent for global scopes. Never a
    // switch on scope name.
    if (invocationsEntityField) {
      insertData[invocationsEntityField] = ctx.api.databaseId ?? ctx.databaseId;
    }

    const { text, values } = new QueryBuilder()
      .schema(invocationsSchemaName)
      .table(invocationsTableName)
      .insert(insertData)
      .returning(['id'])
      .build();

    const invocationId = await ctx.withPgClient(async (client) => {
      const { rows } = await client.query<{ id: string }>(text, values);
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
  if (!compute?.modules.length) {
    notFound(res);
    return;
  }

  try {
    const invocation = await ctx.withPgClient(async (client) => {
      // Invocation tables are per-scope; search each distinct one.
      const seen = new Set<string>();
      for (const module of compute.modules) {
        const key = `${module.invocationsSchemaName}.${module.invocationsTableName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const { text, values } = new QueryBuilder()
          .schema(module.invocationsSchemaName)
          .table(module.invocationsTableName)
          .select(['id', 'status', 'result', 'error', 'created_at', 'started_at', 'completed_at', 'duration_ms'])
          .where('id', '=', id)
          .build();
        const { rows } = await client.query<InvocationRow>(text, values);
        if (rows[0]) return rows[0];
      }
      return undefined;
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
