/**
 * Simple GraphQL executor for the CNC execution engine
 * Executes raw GraphQL queries against configured endpoints
 */

import { executeGraphQL, QueryResult } from './client';
import {
  getCurrentContext,
  loadContext,
  getContextCredentials,
  hasValidCredentials,
} from '../config';
import type { ContextConfig } from '../config';

/**
 * Execution context - bundles context config with credentials
 */
export interface ExecutionContext {
  context: ContextConfig;
  token: string;
}

/**
 * Get execution context for the current or specified context
 */
export async function getExecutionContext(
  contextName?: string
): Promise<ExecutionContext> {
  let context: ContextConfig | null;

  if (contextName) {
    context = loadContext(contextName);
    if (!context) {
      throw new Error(`Context "${contextName}" not found.`);
    }
  } else {
    context = getCurrentContext();
    if (!context) {
      throw new Error(
        'No active context. Run "cnc context create" or "cnc context use" first.'
      );
    }
  }

  if (!hasValidCredentials(context.name)) {
    throw new Error(
      `No valid credentials for context "${context.name}". Run "cnc auth set-token" first.`
    );
  }

  const creds = getContextCredentials(context.name);
  if (!creds || !creds.token) {
    throw new Error(
      `No token found for context "${context.name}". Run "cnc auth set-token" first.`
    );
  }

  return {
    context,
    token: creds.token,
  };
}

/**
 * Execute a raw GraphQL query/mutation
 */
export async function execute<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  execContext?: ExecutionContext
): Promise<QueryResult<T>> {
  const ctx = execContext || (await getExecutionContext());

  return executeGraphQL<T>(ctx.context.endpoint, query, variables, {
    Authorization: `Bearer ${ctx.token}`,
  });
}
