/**
 * Watch mode types
 */

import type { IntrospectionQueryResponse } from '../../types/introspection';

/**
 * Result of a schema poll operation
 */
export interface PollResult {
  success: boolean;
  /** Whether the schema changed since last poll */
  changed: boolean;
  /** Error message if poll failed */
  error?: string;
  /** The new hash if successful */
  hash?: string;
  /** Schema response if successful */
  schema?: IntrospectionQueryResponse;
}

/**
 * Watch mode options passed to the watch orchestrator
 */
export interface WatchOptions {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Authorization header value */
  authorization?: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Polling interval in ms */
  pollInterval: number;
  /** Debounce delay in ms */
  debounce: number;
  /** File to touch on schema change (optional) */
  touchFile: string | null;
  /** Clear terminal on regeneration */
  clearScreen: boolean;
  /** Verbose output */
  verbose: boolean;
}

/**
 * Events emitted by the SchemaPoller
 */
export type PollEventType =
  | 'poll-start'
  | 'poll-success'
  | 'poll-error'
  | 'schema-changed'
  | 'schema-unchanged';

/**
 * Event handler signature for poll events
 */
export type PollEventHandler = (event: PollEvent) => void;

/**
 * Poll event payload
 */
export interface PollEvent {
  type: PollEventType;
  timestamp: number;
  /** Error message if type is 'poll-error' */
  error?: string;
  /** New hash if schema changed */
  hash?: string;
  /** Duration of the poll in ms */
  duration?: number;
}

/**
 * Generator type for watch mode
 */
export type GeneratorType = 'generate' | 'generate-orm';
