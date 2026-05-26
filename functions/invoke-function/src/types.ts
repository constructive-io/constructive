export interface InvocationJobPayload {
  invocation_id: string;
  schema: string;
  invocations_table: string;
  definitions_table: string;
}

export interface FunctionDefinition {
  id: string;
  scope: string;
  name: string;
  task_identifier: string;
  is_invocable: boolean;
  max_attempts: number;
  priority: number;
  queue_name: string;
}

export interface FunctionInvocation {
  id: string;
  created_at: string;
  function_id: string | null;
  actor_id: string | null;
  owner_id: string | null;
  task_identifier: string;
  payload: Record<string, unknown> | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result: Record<string, unknown> | null;
  error: string | null;
  duration_ms: number | null;
  job_id: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface ModuleInfo {
  schema_name: string;
  definitions_table_name: string;
  invocations_table_name: string;
}
