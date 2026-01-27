/**
 * Simple GraphQL executor for the CNC execution engine
 * Executes raw GraphQL queries against configured endpoints
 */

import { executeGraphQL, QueryResult } from './client';
import {
  getCurrentProject,
  loadProject,
  getProjectCredentials,
  hasValidCredentials,
} from '../config';
import type { ProjectConfig } from '../config';

/**
 * Execution context
 */
export interface ExecutionContext {
  project: ProjectConfig;
  token: string;
}

/**
 * Get execution context for the current or specified project
 */
export async function getExecutionContext(
  projectName?: string
): Promise<ExecutionContext> {
  let project: ProjectConfig | null;

  if (projectName) {
    project = loadProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found.`);
    }
  } else {
    project = getCurrentProject();
    if (!project) {
      throw new Error(
        'No active project. Run "cnc project init" or "cnc project use" first.'
      );
    }
  }

  if (!hasValidCredentials(project.name)) {
    throw new Error(
      `No valid credentials for project "${project.name}". Run "cnc auth set-token" first.`
    );
  }

  const creds = getProjectCredentials(project.name);
  if (!creds || !creds.token) {
    throw new Error(
      `No token found for project "${project.name}". Run "cnc auth set-token" first.`
    );
  }

  return {
    project,
    token: creds.token,
  };
}

/**
 * Execute a raw GraphQL query/mutation
 */
export async function execute<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  context?: ExecutionContext
): Promise<QueryResult<T>> {
  const ctx = context || (await getExecutionContext());

  return executeGraphQL<T>(ctx.project.endpoint, query, variables, {
    Authorization: `Bearer ${ctx.token}`,
  });
}
