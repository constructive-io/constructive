import { createJobApp } from '@constructive-io/knative-job-fn';
import { createLogger } from '@pgpmjs/logger';
import { Pool } from 'pg';

import { resolveModuleForInvocation } from './schema-resolver';
import { dispatchFunction } from './dispatcher';
import type { FunctionDefinition, FunctionInvocation } from './types';

const logger = createLogger('invoke-function');
const app = createJobApp();

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'password',
      database: process.env.PGDATABASE || 'postgres',
      max: 5
    });
  }
  return pool;
}

/**
 * POST / — Invoke-function job handler
 *
 * Receives a job payload when a row is inserted into a function_invocations
 * table. Resolves the correct schema (public or private) from the module
 * configuration, validates the function definition, dispatches execution
 * to the underlying Knative function, and updates the invocation row
 * with status/result/duration.
 *
 * Payload shape (from the job trigger):
 *   { id: "invocation-uuid", schema: "...", table: "..." }
 *
 * Or the richer payload (from blueprint-aware triggers):
 *   { invocation_id: "...", schema: "...", invocations_table: "...", definitions_table: "..." }
 */
app.post('/', async (req: any, res: any) => {
  const startTime = Date.now();

  try {
    const body = req.body || {};
    const databaseId = req.get('X-Database-Id') || '';

    // Parse invocation reference from payload
    const invocationId = body.invocation_id || body.id;
    const schemaHint = body.schema;
    const tableHint = body.invocations_table || body.table;

    if (!invocationId) {
      throw new Error('Missing invocation_id or id in payload');
    }

    if (!databaseId) {
      throw new Error('Missing X-Database-Id header');
    }

    const pg = getPool();

    // 1. Resolve the schema where invocations/definitions live
    const moduleInfo = await resolveModuleForInvocation(
      pg,
      databaseId,
      schemaHint,
      tableHint
    );

    if (!moduleInfo) {
      throw new Error(
        `No function_module found for database ${databaseId}`
      );
    }

    const { schema_name, definitions_table_name, invocations_table_name } =
      moduleInfo;

    logger.info('Resolved module schema', {
      schema_name,
      definitions_table_name,
      invocations_table_name,
      invocationId
    });

    // 2. Read the invocation row
    const invocationQuery = `
      SELECT *
      FROM "${schema_name}"."${invocations_table_name}"
      WHERE id = $1
    `;
    const invocationResult = await pg.query(invocationQuery, [invocationId]);

    if (invocationResult.rows.length === 0) {
      throw new Error(
        `Invocation ${invocationId} not found in ${schema_name}.${invocations_table_name}`
      );
    }

    const invocation: FunctionInvocation = invocationResult.rows[0];

    if (invocation.status !== 'pending') {
      logger.info('Invocation already processed, skipping', {
        invocationId,
        status: invocation.status
      });
      res
        .status(200)
        .json({ skipped: true, reason: 'already_processed', status: invocation.status });
      return;
    }

    // 3. Resolve the function definition (if function_id is set)
    let definition: FunctionDefinition | null = null;
    let taskIdentifier = invocation.task_identifier;

    if (invocation.function_id) {
      const defQuery = `
        SELECT *
        FROM "${schema_name}"."${definitions_table_name}"
        WHERE id = $1
      `;
      const defResult = await pg.query(defQuery, [invocation.function_id]);

      if (defResult.rows.length > 0) {
        definition = defResult.rows[0];

        if (!definition.is_invocable) {
          throw new Error(
            `Function ${definition.task_identifier} is not invocable (is_invocable = false)`
          );
        }

        taskIdentifier = definition.task_identifier;
      } else {
        logger.warn('Function definition not found, using task_identifier from invocation', {
          functionId: invocation.function_id
        });
      }
    }

    if (!taskIdentifier) {
      throw new Error('No task_identifier on invocation and no function_id to resolve');
    }

    // 4. Mark invocation as running
    const updateRunningQuery = `
      UPDATE "${schema_name}"."${invocations_table_name}"
      SET status = 'running', started_at = now()
      WHERE id = $1
    `;
    await pg.query(updateRunningQuery, [invocationId]);

    // 5. Dispatch to the actual function
    const dispatchResult = await dispatchFunction(
      taskIdentifier,
      invocation.payload || {},
      databaseId
    );

    const durationMs = Date.now() - startTime;

    // 6. Update invocation with result
    const updateCompleteQuery = `
      UPDATE "${schema_name}"."${invocations_table_name}"
      SET
        status = $2,
        result = $3::jsonb,
        error = $4,
        duration_ms = $5,
        completed_at = now()
      WHERE id = $1
    `;
    await pg.query(updateCompleteQuery, [
      invocationId,
      dispatchResult.status,
      dispatchResult.result ? JSON.stringify(dispatchResult.result) : null,
      dispatchResult.error,
      durationMs
    ]);

    logger.info('Invocation complete', {
      invocationId,
      taskIdentifier,
      status: dispatchResult.status,
      durationMs
    });

    res.status(200).json({
      invocation_id: invocationId,
      status: dispatchResult.status,
      duration_ms: durationMs
    });
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    logger.error('Invoke-function handler error', { error: message });

    // Try to mark invocation as failed if we have the info
    try {
      const body = req.body || {};
      const invocationId = body.invocation_id || body.id;
      const databaseId = req.get('X-Database-Id') || '';
      const schemaHint = body.schema;
      const tableHint = body.invocations_table || body.table;

      if (invocationId && databaseId) {
        const pg = getPool();
        const moduleInfo = await resolveModuleForInvocation(
          pg,
          databaseId,
          schemaHint,
          tableHint
        );

        if (moduleInfo) {
          const durationMs = Date.now() - startTime;
          const updateQuery = `
            UPDATE "${moduleInfo.schema_name}"."${moduleInfo.invocations_table_name}"
            SET status = 'failed', error = $2, duration_ms = $3, completed_at = now()
            WHERE id = $1 AND status IN ('pending', 'running')
          `;
          await pg.query(updateQuery, [invocationId, message, durationMs]);
        }
      }
    } catch (updateErr) {
      logger.error('Failed to update invocation status on error', {
        error: (updateErr as Error).message
      });
    }

    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`invoke-function listening on port ${PORT}`);
});

export default app;
