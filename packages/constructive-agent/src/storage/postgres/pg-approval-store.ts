import type {
  ApprovalDecisionInput,
  ApprovalRequestRecord,
  ApprovalStatus,
} from '../../types/approval';
import type { ApprovalStore } from '../interfaces';
import type { PgQueryable } from './pg-client';
import { getAgentStorageSchemaName } from './schema';

export interface PgApprovalStoreOptions {
  client: PgQueryable;
  schema?: string;
}

type ApprovalRow = {
  id: string;
  run_id: string;
  tool_name: string;
  capability: ApprovalRequestRecord['capability'];
  risk_class: ApprovalRequestRecord['riskClass'];
  args_hash: string;
  args_redacted: Record<string, unknown>;
  reason: string;
  status: ApprovalStatus;
  requested_at: string | number;
  decided_at: string | number | null;
  decided_by: string | null;
  decision_reason: string | null;
  applied_at: string | number | null;
};

const toNumber = (value: string | number | null): number | undefined => {
  if (value === null) return undefined;
  return Number(value);
};

const mapRow = (row: ApprovalRow): ApprovalRequestRecord => {
  return {
    id: row.id,
    runId: row.run_id,
    toolName: row.tool_name,
    capability: row.capability,
    riskClass: row.risk_class,
    argsHash: row.args_hash,
    argsRedacted: row.args_redacted || {},
    reason: row.reason,
    status: row.status,
    requestedAt: Number(row.requested_at),
    decidedAt: toNumber(row.decided_at),
    decidedBy: row.decided_by || undefined,
    decisionReason: row.decision_reason || undefined,
    appliedAt: toNumber(row.applied_at),
  };
};

export class PgApprovalStore implements ApprovalStore {
  private readonly table: string;

  constructor(private readonly options: PgApprovalStoreOptions) {
    const schema = getAgentStorageSchemaName({
      schema: options.schema,
    });
    this.table = `"${schema}"."agent_approvals"`;
  }

  async create(request: ApprovalRequestRecord): Promise<void> {
    await this.options.client.query(
      `
        INSERT INTO ${this.table} (
          id,
          run_id,
          tool_name,
          capability,
          risk_class,
          args_hash,
          args_redacted,
          reason,
          status,
          requested_at,
          decided_at,
          decided_by,
          decision_reason,
          applied_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        )
      `,
      [
        request.id,
        request.runId,
        request.toolName,
        request.capability,
        request.riskClass,
        request.argsHash,
        request.argsRedacted,
        request.reason,
        request.status,
        request.requestedAt,
        request.decidedAt || null,
        request.decidedBy || null,
        request.decisionReason || null,
        request.appliedAt || null,
      ],
    );
  }

  async get(requestId: string): Promise<ApprovalRequestRecord | null> {
    const result = await this.options.client.query<ApprovalRow>(
      `
        SELECT
          id,
          run_id,
          tool_name,
          capability,
          risk_class,
          args_hash,
          args_redacted,
          reason,
          status,
          requested_at,
          decided_at,
          decided_by,
          decision_reason,
          applied_at
        FROM ${this.table}
        WHERE id = $1
      `,
      [requestId],
    );

    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async listByRun(runId: string): Promise<ApprovalRequestRecord[]> {
    const result = await this.options.client.query<ApprovalRow>(
      `
        SELECT
          id,
          run_id,
          tool_name,
          capability,
          risk_class,
          args_hash,
          args_redacted,
          reason,
          status,
          requested_at,
          decided_at,
          decided_by,
          decision_reason,
          applied_at
        FROM ${this.table}
        WHERE run_id = $1
        ORDER BY requested_at ASC
      `,
      [runId],
    );

    return result.rows.map(mapRow);
  }

  async getPendingByRun(runId: string): Promise<ApprovalRequestRecord | null> {
    const result = await this.options.client.query<ApprovalRow>(
      `
        SELECT
          id,
          run_id,
          tool_name,
          capability,
          risk_class,
          args_hash,
          args_redacted,
          reason,
          status,
          requested_at,
          decided_at,
          decided_by,
          decision_reason,
          applied_at
        FROM ${this.table}
        WHERE run_id = $1
          AND status = 'pending'
        ORDER BY requested_at ASC
        LIMIT 1
      `,
      [runId],
    );

    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async findByInvocation(
    runId: string,
    toolName: string,
    argsHash: string,
  ): Promise<ApprovalRequestRecord | null> {
    const result = await this.options.client.query<ApprovalRow>(
      `
        SELECT
          id,
          run_id,
          tool_name,
          capability,
          risk_class,
          args_hash,
          args_redacted,
          reason,
          status,
          requested_at,
          decided_at,
          decided_by,
          decision_reason,
          applied_at
        FROM ${this.table}
        WHERE run_id = $1
          AND tool_name = $2
          AND args_hash = $3
        ORDER BY requested_at DESC
        LIMIT 1
      `,
      [runId, toolName, argsHash],
    );

    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async decide(input: ApprovalDecisionInput): Promise<ApprovalRequestRecord> {
    const decidedAt = Date.now();

    const result = await this.options.client.query<ApprovalRow>(
      `
        UPDATE ${this.table}
        SET
          status = $1,
          decided_at = $2,
          decided_by = $3,
          decision_reason = $4
        WHERE id = $5
        RETURNING
          id,
          run_id,
          tool_name,
          capability,
          risk_class,
          args_hash,
          args_redacted,
          reason,
          status,
          requested_at,
          decided_at,
          decided_by,
          decision_reason,
          applied_at
      `,
      [
        input.decision,
        decidedAt,
        input.decidedBy,
        input.reason || null,
        input.requestId,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Approval ${input.requestId} not found`);
    }

    return mapRow(row);
  }

  async markApplied(requestId: string): Promise<ApprovalRequestRecord> {
    const result = await this.options.client.query<ApprovalRow>(
      `
        UPDATE ${this.table}
        SET
          status = 'applied',
          applied_at = $1
        WHERE id = $2
        RETURNING
          id,
          run_id,
          tool_name,
          capability,
          risk_class,
          args_hash,
          args_redacted,
          reason,
          status,
          requested_at,
          decided_at,
          decided_by,
          decision_reason,
          applied_at
      `,
      [Date.now(), requestId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Approval ${requestId} not found`);
    }

    return mapRow(row);
  }
}

