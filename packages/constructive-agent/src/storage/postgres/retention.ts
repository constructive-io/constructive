import type { RunStatus } from '../../types/run-state';
import type { PgQueryable } from './pg-client';
import { getAgentStorageSchemaName } from './schema';

export interface PruneTerminalRunsOptions {
  schema?: string;
  terminalStatuses?: RunStatus[];
}

export interface PruneTerminalRunsResult {
  runsDeleted: number;
  eventsDeleted: number;
  approvalsDeleted: number;
}

const DEFAULT_TERMINAL_STATUSES: RunStatus[] = [
  'completed',
  'failed',
  'aborted',
];

export const pruneTerminalRuns = async (
  client: PgQueryable,
  olderThanEpochMs: number,
  options: PruneTerminalRunsOptions = {},
): Promise<PruneTerminalRunsResult> => {
  const schema = getAgentStorageSchemaName({
    schema: options.schema,
  });
  const runsTable = `"${schema}"."agent_runs"`;
  const eventsTable = `"${schema}"."agent_run_events"`;
  const approvalsTable = `"${schema}"."agent_approvals"`;
  const terminalStatuses = options.terminalStatuses || DEFAULT_TERMINAL_STATUSES;

  const deletedEvents = await client.query<{ count: string | number }>(
    `
      WITH target_runs AS (
        SELECT id
        FROM ${runsTable}
        WHERE status = ANY($1::text[])
          AND ended_at IS NOT NULL
          AND ended_at < $2
      ),
      deleted AS (
        DELETE FROM ${eventsTable}
        WHERE run_id IN (SELECT id FROM target_runs)
        RETURNING run_id
      )
      SELECT COUNT(*) AS count FROM deleted
    `,
    [terminalStatuses, olderThanEpochMs],
  );

  const deletedApprovals = await client.query<{ count: string | number }>(
    `
      WITH target_runs AS (
        SELECT id
        FROM ${runsTable}
        WHERE status = ANY($1::text[])
          AND ended_at IS NOT NULL
          AND ended_at < $2
      ),
      deleted AS (
        DELETE FROM ${approvalsTable}
        WHERE run_id IN (SELECT id FROM target_runs)
        RETURNING run_id
      )
      SELECT COUNT(*) AS count FROM deleted
    `,
    [terminalStatuses, olderThanEpochMs],
  );

  const deletedRuns = await client.query<{ count: string | number }>(
    `
      WITH deleted AS (
        DELETE FROM ${runsTable}
        WHERE status = ANY($1::text[])
          AND ended_at IS NOT NULL
          AND ended_at < $2
        RETURNING id
      )
      SELECT COUNT(*) AS count FROM deleted
    `,
    [terminalStatuses, olderThanEpochMs],
  );

  return {
    runsDeleted: Number(deletedRuns.rows[0]?.count || 0),
    eventsDeleted: Number(deletedEvents.rows[0]?.count || 0),
    approvalsDeleted: Number(deletedApprovals.rows[0]?.count || 0),
  };
};

