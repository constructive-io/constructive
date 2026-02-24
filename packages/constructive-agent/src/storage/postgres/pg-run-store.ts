import type { AgentRunRecord } from '../../types/run-state';
import type { RunStore } from '../interfaces';
import type { PgQueryable } from './pg-client';
import { getAgentStorageSchemaName } from './schema';

export interface PgRunStoreOptions {
  client: PgQueryable;
  schema?: string;
}

type RunRow = {
  id: string;
  status: AgentRunRecord['status'];
  actor_id: string;
  tenant_id: string | null;
  model_provider: string;
  model_name: string;
  started_at: string | number;
  ended_at: string | number | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

const toNumber = (value: string | number | null): number | undefined => {
  if (value === null) return undefined;
  return typeof value === 'number' ? value : Number(value);
};

const mapRow = (row: RunRow): AgentRunRecord => {
  return {
    id: row.id,
    status: row.status,
    actorId: row.actor_id,
    tenantId: row.tenant_id || undefined,
    modelProvider: row.model_provider,
    modelName: row.model_name,
    startedAt: toNumber(row.started_at) as number,
    endedAt: toNumber(row.ended_at),
    errorCode: row.error_code || undefined,
    errorMessage: row.error_message || undefined,
    metadata: row.metadata || undefined,
  };
};

export class PgRunStore implements RunStore {
  private readonly table: string;

  constructor(private readonly options: PgRunStoreOptions) {
    const schema = getAgentStorageSchemaName({
      schema: options.schema,
    });
    this.table = `"${schema}"."agent_runs"`;
  }

  async create(run: AgentRunRecord): Promise<void> {
    await this.options.client.query(
      `
        INSERT INTO ${this.table} (
          id,
          status,
          actor_id,
          tenant_id,
          model_provider,
          model_name,
          started_at,
          ended_at,
          error_code,
          error_message,
          metadata
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
      `,
      [
        run.id,
        run.status,
        run.actorId,
        run.tenantId || null,
        run.modelProvider,
        run.modelName,
        run.startedAt,
        run.endedAt || null,
        run.errorCode || null,
        run.errorMessage || null,
        run.metadata || null,
      ],
    );
  }

  async get(runId: string): Promise<AgentRunRecord | null> {
    const result = await this.options.client.query<RunRow>(
      `
        SELECT
          id,
          status,
          actor_id,
          tenant_id,
          model_provider,
          model_name,
          started_at,
          ended_at,
          error_code,
          error_message,
          metadata
        FROM ${this.table}
        WHERE id = $1
      `,
      [runId],
    );

    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async update(
    runId: string,
    patch: Partial<AgentRunRecord>,
  ): Promise<AgentRunRecord> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    const push = (column: string, value: unknown) => {
      fields.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    };

    if (patch.status !== undefined) push('status', patch.status);
    if (patch.actorId !== undefined) push('actor_id', patch.actorId);
    if (patch.tenantId !== undefined) push('tenant_id', patch.tenantId || null);
    if (patch.modelProvider !== undefined) {
      push('model_provider', patch.modelProvider);
    }
    if (patch.modelName !== undefined) push('model_name', patch.modelName);
    if (patch.startedAt !== undefined) push('started_at', patch.startedAt);
    if (patch.endedAt !== undefined) push('ended_at', patch.endedAt || null);
    if (patch.errorCode !== undefined) push('error_code', patch.errorCode || null);
    if (patch.errorMessage !== undefined) {
      push('error_message', patch.errorMessage || null);
    }
    if (patch.metadata !== undefined) push('metadata', patch.metadata || null);

    if (fields.length === 0) {
      const current = await this.get(runId);
      if (!current) {
        throw new Error(`Run ${runId} not found`);
      }
      return current;
    }

    values.push(runId);

    const result = await this.options.client.query<RunRow>(
      `
        UPDATE ${this.table}
        SET ${fields.join(', ')}
        WHERE id = $${index}
        RETURNING
          id,
          status,
          actor_id,
          tenant_id,
          model_provider,
          model_name,
          started_at,
          ended_at,
          error_code,
          error_message,
          metadata
      `,
      values,
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Run ${runId} not found`);
    }

    return mapRow(row);
  }
}
