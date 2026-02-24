import type { PgQueryable } from './pg-client';

export interface AgentStorageSchemaOptions {
  schema?: string;
}

const DEFAULT_SCHEMA = 'constructive_agent';

const assertSchemaName = (schema: string): void => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid PostgreSQL schema name: ${schema}`);
  }
};

const ident = (value: string): string => {
  return `"${value.replace(/"/g, '""')}"`;
};

const table = (schema: string, name: string): string => {
  return `${ident(schema)}.${ident(name)}`;
};

export const getAgentStorageSchemaName = (
  options: AgentStorageSchemaOptions = {},
): string => {
  const schema = options.schema || DEFAULT_SCHEMA;
  assertSchemaName(schema);
  return schema;
};

export const ensureAgentStorageSchema = async (
  client: PgQueryable,
  options: AgentStorageSchemaOptions = {},
): Promise<void> => {
  const schema = getAgentStorageSchemaName(options);

  await client.query(`CREATE SCHEMA IF NOT EXISTS ${ident(schema)}`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${table(schema, 'agent_runs')} (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      tenant_id TEXT,
      model_provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      started_at BIGINT NOT NULL,
      ended_at BIGINT,
      error_code TEXT,
      error_message TEXT,
      metadata JSONB
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${table(schema, 'agent_run_events')} (
      run_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      type TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      payload JSONB NOT NULL,
      PRIMARY KEY (run_id, seq)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS ${ident('agent_run_events_run_id_seq_idx')}
      ON ${table(schema, 'agent_run_events')} (run_id, seq)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${table(schema, 'agent_approvals')} (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      capability TEXT NOT NULL,
      risk_class TEXT NOT NULL,
      args_hash TEXT NOT NULL,
      args_redacted JSONB NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_at BIGINT NOT NULL,
      decided_at BIGINT,
      decided_by TEXT,
      decision_reason TEXT,
      applied_at BIGINT
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS ${ident('agent_approvals_run_id_requested_at_idx')}
      ON ${table(schema, 'agent_approvals')} (run_id, requested_at DESC)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS ${ident('agent_approvals_invocation_idx')}
      ON ${table(schema, 'agent_approvals')} (run_id, tool_name, args_hash)
  `);
};

