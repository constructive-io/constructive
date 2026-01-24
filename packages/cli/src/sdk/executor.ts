/**
 * JSON Protocol Executor for the CNC execution engine
 * Executes JSON-formatted operations against Constructive APIs
 */

import { createClient, QueryResult } from './client';
import {
  buildFindManyQuery,
  buildFindFirstQuery,
  buildCreateMutation,
  buildUpdateMutation,
  buildDeleteMutation,
  toPascalCase,
  pluralize,
} from './operations';
import {
  getCurrentProject,
  loadProject,
  getProjectCredentials,
  hasValidCredentials,
} from '../config';
import type { ProjectConfig, ApiType } from '../config';

/**
 * JSON Protocol operation format
 */
export interface JsonOperation {
  /** Operation type: query or mutation */
  operation: 'query' | 'mutation';
  /** Model name (e.g., database, table, field) */
  model: string;
  /** Action to perform (e.g., findMany, findFirst, create, update, delete) */
  action: 'findMany' | 'findFirst' | 'create' | 'update' | 'delete';
  /** API to use (optional, auto-detected based on model) */
  api?: ApiType;
  /** Data for create/update operations */
  data?: Record<string, unknown>;
  /** Where clause for queries and updates */
  where?: Record<string, unknown>;
  /** Fields to select in response */
  select?: Record<string, unknown>;
  /** Pagination: first N records */
  first?: number;
  /** Pagination: last N records */
  last?: number;
  /** Pagination: cursor after */
  after?: string;
  /** Pagination: cursor before */
  before?: string;
  /** Pagination: offset */
  offset?: number;
  /** Order by fields */
  orderBy?: string[];
}

/**
 * Execution context
 */
export interface ExecutionContext {
  project: ProjectConfig;
  token: string;
  verbose?: boolean;
}

/**
 * Model to API mapping for auto-routing
 */
const MODEL_API_MAP: Record<string, ApiType> = {
  // Public API models (metaschema)
  database: 'public',
  schema: 'public',
  table: 'public',
  field: 'public',
  policy: 'public',
  checkConstraint: 'public',
  foreignKeyConstraint: 'public',
  primaryKeyConstraint: 'public',
  uniqueConstraint: 'public',
  index: 'public',
  trigger: 'public',
  procedure: 'public',
  triggerFunction: 'public',

  // Services models
  api: 'public',
  apiSchema: 'public',
  apiModule: 'public',
  apiExtension: 'public',
  domain: 'public',
  site: 'public',
  siteTheme: 'public',
  siteMetadatum: 'public',
  siteModule: 'public',

  // Admin API models
  membership: 'admin',
  permission: 'admin',
  limit: 'admin',
  invite: 'admin',
  profile: 'admin',
  auditLog: 'admin',

  // Auth API models
  user: 'auth',
  email: 'auth',
  phoneNumber: 'auth',
  cryptoAddress: 'auth',
  connectedAccount: 'auth',

  // Modules
  usersModule: 'public',
  userAuthModule: 'public',
  tokensModule: 'public',
  secretsModule: 'public',
  permissionsModule: 'public',
  membershipsModule: 'public',
  emailsModule: 'public',
  invitesModule: 'public',
  profilesModule: 'public',
  hierarchyModule: 'public',
  limitsModule: 'public',
  rlsModule: 'public',
  databaseProvisionModule: 'public',
};

/**
 * Determine which API to use for a model
 */
export function determineApi(model: string): ApiType {
  return MODEL_API_MAP[model] || 'public';
}

/**
 * Get execution context for the current or specified project
 */
export async function getExecutionContext(
  projectName?: string,
  verbose?: boolean
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
    verbose,
  };
}

/**
 * Execute a JSON protocol operation
 */
export async function executeOperation<T = unknown>(
  operation: JsonOperation,
  context: ExecutionContext
): Promise<QueryResult<T>> {
  const api = operation.api || determineApi(operation.model);
  const endpoint = context.project.endpoints[api];

  if (!endpoint) {
    return {
      ok: false,
      data: null,
      errors: [{ message: `No endpoint configured for API: ${api}` }],
    };
  }

  const client = createClient({
    endpoint,
    headers: {
      Authorization: `Bearer ${context.token}`,
    },
  });

  const modelName = toPascalCase(operation.model);
  const pluralName = pluralize(operation.model);

  let document: string;
  let variables: Record<string, unknown>;

  switch (operation.action) {
    case 'findMany': {
      const result = buildFindManyQuery(
        modelName,
        pluralName,
        operation.select || { id: true },
        {
          where: operation.where,
          orderBy: operation.orderBy,
          first: operation.first,
          last: operation.last,
          after: operation.after,
          before: operation.before,
          offset: operation.offset,
        }
      );
      document = result.document;
      variables = result.variables;
      break;
    }

    case 'findFirst': {
      const result = buildFindFirstQuery(
        modelName,
        pluralName,
        operation.select || { id: true },
        { where: operation.where }
      );
      document = result.document;
      variables = result.variables;
      break;
    }

    case 'create': {
      if (!operation.data) {
        return {
          ok: false,
          data: null,
          errors: [{ message: 'Create operation requires data' }],
        };
      }
      const mutationName = `create${modelName}`;
      const inputType = `Create${modelName}Input`;
      const result = buildCreateMutation(
        modelName,
        mutationName,
        operation.model,
        operation.select || { id: true },
        operation.data,
        inputType
      );
      document = result.document;
      variables = result.variables;
      break;
    }

    case 'update': {
      if (!operation.data) {
        return {
          ok: false,
          data: null,
          errors: [{ message: 'Update operation requires data' }],
        };
      }
      if (!operation.where || !('id' in operation.where)) {
        return {
          ok: false,
          data: null,
          errors: [{ message: 'Update operation requires where.id' }],
        };
      }
      const mutationName = `update${modelName}`;
      const inputType = `Update${modelName}Input`;
      const result = buildUpdateMutation(
        modelName,
        mutationName,
        operation.model,
        operation.select || { id: true },
        operation.where as { id: string },
        operation.data,
        inputType
      );
      document = result.document;
      variables = result.variables;
      break;
    }

    case 'delete': {
      if (!operation.where || !('id' in operation.where)) {
        return {
          ok: false,
          data: null,
          errors: [{ message: 'Delete operation requires where.id' }],
        };
      }
      const mutationName = `delete${modelName}`;
      const inputType = `Delete${modelName}Input`;
      const result = buildDeleteMutation(
        modelName,
        mutationName,
        operation.model,
        operation.where as { id: string },
        inputType
      );
      document = result.document;
      variables = result.variables;
      break;
    }

    default:
      return {
        ok: false,
        data: null,
        errors: [{ message: `Unknown action: ${operation.action}` }],
      };
  }

  if (context.verbose) {
    console.log('\n--- GraphQL Document ---');
    console.log(document);
    console.log('\n--- Variables ---');
    console.log(JSON.stringify(variables, null, 2));
    console.log('------------------------\n');
  }

  return client.execute<T>(document, variables);
}

/**
 * Parse a JSON operation from string
 */
export function parseOperation(json: string): JsonOperation {
  try {
    const parsed = JSON.parse(json);

    // Validate required fields
    if (!parsed.model) {
      throw new Error('Missing required field: model');
    }
    if (!parsed.action) {
      throw new Error('Missing required field: action');
    }

    // Set defaults
    return {
      operation: parsed.operation || (parsed.action === 'findMany' || parsed.action === 'findFirst' ? 'query' : 'mutation'),
      model: parsed.model,
      action: parsed.action,
      api: parsed.api,
      data: parsed.data,
      where: parsed.where,
      select: parsed.select,
      first: parsed.first,
      last: parsed.last,
      after: parsed.after,
      before: parsed.before,
      offset: parsed.offset,
      orderBy: parsed.orderBy,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}
