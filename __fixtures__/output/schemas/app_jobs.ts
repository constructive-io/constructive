import { Timestamp, UUID } from './_common';
export interface JobQueues {
  queue_name: string;
  job_count: number;
  locked_at: Timestamp | null;
  locked_by: string | null;
}
export class JobQueues implements JobQueues {
  queue_name: string;
  job_count: number;
  locked_at: Timestamp | null;
  locked_by: string | null;
  constructor(data: JobQueues) {
    this.queue_name = data.queue_name;
    this.job_count = data.job_count;
    this.locked_at = data.locked_at;
    this.locked_by = data.locked_by;
  }
}
export interface Jobs {
  id: number;
  database_id: UUID | null;
  actor_id: UUID | null;
  principal_id: UUID | null;
  entity_id: UUID | null;
  organization_id: UUID | null;
  entity_type: string | null;
  function_definition_id: UUID | null;
  definition_scope: string | null;
  queue_name: string | null;
  task_identifier: string;
  payload: any;
  priority: number;
  run_at: Timestamp;
  attempts: number;
  max_attempts: number;
  key: string | null;
  last_error: string | null;
  locked_at: Timestamp | null;
  locked_by: string | null;
  is_available: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}
export class Jobs implements Jobs {
  id: number;
  database_id: UUID | null;
  actor_id: UUID | null;
  principal_id: UUID | null;
  entity_id: UUID | null;
  organization_id: UUID | null;
  entity_type: string | null;
  function_definition_id: UUID | null;
  definition_scope: string | null;
  queue_name: string | null;
  task_identifier: string;
  payload: any;
  priority: number;
  run_at: Timestamp;
  attempts: number;
  max_attempts: number;
  key: string | null;
  last_error: string | null;
  locked_at: Timestamp | null;
  locked_by: string | null;
  is_available: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  constructor(data: Jobs) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.actor_id = data.actor_id;
    this.principal_id = data.principal_id;
    this.entity_id = data.entity_id;
    this.organization_id = data.organization_id;
    this.entity_type = data.entity_type;
    this.function_definition_id = data.function_definition_id;
    this.definition_scope = data.definition_scope;
    this.queue_name = data.queue_name;
    this.task_identifier = data.task_identifier;
    this.payload = data.payload;
    this.priority = data.priority;
    this.run_at = data.run_at;
    this.attempts = data.attempts;
    this.max_attempts = data.max_attempts;
    this.key = data.key;
    this.last_error = data.last_error;
    this.locked_at = data.locked_at;
    this.locked_by = data.locked_by;
    this.is_available = data.is_available;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}
export interface ScheduledJobs {
  id: number;
  database_id: UUID | null;
  actor_id: UUID | null;
  entity_id: UUID | null;
  queue_name: string | null;
  task_identifier: string;
  payload: any;
  priority: number;
  max_attempts: number;
  key: string | null;
  locked_at: Timestamp | null;
  locked_by: string | null;
  schedule_info: any;
  last_scheduled: Timestamp | null;
  last_scheduled_id: number | null;
}
export class ScheduledJobs implements ScheduledJobs {
  id: number;
  database_id: UUID | null;
  actor_id: UUID | null;
  entity_id: UUID | null;
  queue_name: string | null;
  task_identifier: string;
  payload: any;
  priority: number;
  max_attempts: number;
  key: string | null;
  locked_at: Timestamp | null;
  locked_by: string | null;
  schedule_info: any;
  last_scheduled: Timestamp | null;
  last_scheduled_id: number | null;
  constructor(data: ScheduledJobs) {
    this.id = data.id;
    this.database_id = data.database_id;
    this.actor_id = data.actor_id;
    this.entity_id = data.entity_id;
    this.queue_name = data.queue_name;
    this.task_identifier = data.task_identifier;
    this.payload = data.payload;
    this.priority = data.priority;
    this.max_attempts = data.max_attempts;
    this.key = data.key;
    this.locked_at = data.locked_at;
    this.locked_by = data.locked_by;
    this.schedule_info = data.schedule_info;
    this.last_scheduled = data.last_scheduled;
    this.last_scheduled_id = data.last_scheduled_id;
  }
}