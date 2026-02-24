import type { AgentRunEvent } from '../../types/events';
import type { EventStore } from '../interfaces';
import type { PgQueryable } from './pg-client';
import { getAgentStorageSchemaName } from './schema';

export interface PgEventStoreOptions {
  client: PgQueryable;
  schema?: string;
}

type EventRow = {
  run_id: string;
  seq: number;
  type: AgentRunEvent['type'];
  timestamp: string | number;
  payload: Record<string, unknown>;
};

const mapRow = (row: EventRow): AgentRunEvent => {
  return {
    runId: row.run_id,
    seq: Number(row.seq),
    type: row.type,
    timestamp: Number(row.timestamp),
    payload: row.payload,
  } as AgentRunEvent;
};

export class PgEventStore implements EventStore {
  private readonly table: string;

  constructor(private readonly options: PgEventStoreOptions) {
    const schema = getAgentStorageSchemaName({
      schema: options.schema,
    });
    this.table = `"${schema}"."agent_run_events"`;
  }

  async append(event: AgentRunEvent): Promise<void> {
    await this.options.client.query(
      `
        INSERT INTO ${this.table} (
          run_id,
          seq,
          type,
          timestamp,
          payload
        ) VALUES (
          $1,$2,$3,$4,$5
        )
      `,
      [
        event.runId,
        event.seq,
        event.type,
        event.timestamp,
        event.payload,
      ],
    );
  }

  async list(runId: string): Promise<AgentRunEvent[]> {
    const result = await this.options.client.query<EventRow>(
      `
        SELECT
          run_id,
          seq,
          type,
          timestamp,
          payload
        FROM ${this.table}
        WHERE run_id = $1
        ORDER BY seq ASC
      `,
      [runId],
    );

    return result.rows.map(mapRow);
  }

  async nextSeq(runId: string): Promise<number> {
    const result = await this.options.client.query<{
      next_seq: string | number;
    }>(
      `
        SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq
        FROM ${this.table}
        WHERE run_id = $1
      `,
      [runId],
    );

    return Number(result.rows[0]?.next_seq || 1);
  }
}
