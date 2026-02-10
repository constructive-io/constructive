import type {
  DocumentNode,
  ExecutionResult,
  GraphQLSchema,
  GraphQLError,
  FieldNode,
  OperationDefinitionNode,
  SelectionNode,
} from 'graphql';
import { parse, print, Kind } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { execute } from 'grafast';
import { withPgClientFromPgService } from 'graphile-build-pg';
import { makePgService } from 'postgraphile/adaptors/pg';
import type { Client, Pool } from 'pg';
import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';

import type { GetConnectionsInput } from './types';

/**
 * V4-compatible error format (plain object, not GraphQLError class)
 */
interface V4FormattedError {
  message: string;
  locations?: readonly { line: number; column: number }[];
  path?: readonly (string | number)[];
  extensions?: Record<string, unknown>;
}

/**
 * Find a field node in the document by following the path.
 * This is used to derive locations when grafast doesn't provide them.
 */
function findFieldNodeByPath(
  document: DocumentNode,
  path: readonly (string | number)[]
): FieldNode | null {
  if (!path || path.length === 0) return null;

  // Find the operation definition
  const operation = document.definitions.find(
    (def): def is OperationDefinitionNode => def.kind === Kind.OPERATION_DEFINITION
  );
  if (!operation) return null;

  // Navigate through the path to find the field
  let selections: readonly SelectionNode[] = operation.selectionSet.selections;
  let fieldNode: FieldNode | null = null;

  for (const segment of path) {
    if (typeof segment === 'number') {
      // Array index - skip, the field is still the same
      continue;
    }

    // Find the field with this name
    fieldNode = selections.find(
      (sel): sel is FieldNode =>
        sel.kind === Kind.FIELD && (sel.alias?.value ?? sel.name.value) === segment
    ) ?? null;

    if (!fieldNode) return null;

    // Move to nested selections if they exist
    if (fieldNode.selectionSet) {
      selections = fieldNode.selectionSet.selections;
    }
  }

  return fieldNode;
}

/**
 * V4-compatible result format
 */
interface V4Result<TData = unknown> {
  data?: TData | null;
  errors?: V4FormattedError[];
  extensions?: Record<string, unknown>;
}

/**
 * Format a GraphQL error to match the v4 PostGraphile format.
 *
 * v5 grafast errors have different formatting:
 * - They include `extensions: {}` even when empty
 * - They may have `locations: undefined` instead of omitting the field
 * - They don't always include locations even when nodes are available
 *
 * This normalizes errors to match v4 format for backward compatibility.
 *
 * @param error - The GraphQL error to format
 * @param document - The original document (used to derive locations from path)
 */
function formatErrorToV4(error: GraphQLError, document?: DocumentNode): V4FormattedError {
  const formatted: V4FormattedError = {
    message: error.message,
  };

  // Try to get locations from the error directly first
  let locations = error.locations;

  // If no locations but nodes are available, try to extract from nodes
  if ((!locations || locations.length === 0) && error.nodes && error.nodes.length > 0) {
    const extractedLocations = error.nodes
      .filter(node => node.loc)
      .map(node => {
        const loc = node.loc;
        if (loc && loc.source) {
          // Calculate line and column from the source
          const { startToken } = loc;
          if (startToken) {
            return { line: startToken.line, column: startToken.column };
          }
        }
        return null;
      })
      .filter((loc): loc is { line: number; column: number } => loc !== null);

    if (extractedLocations.length > 0) {
      locations = extractedLocations;
    }
  }

  // If still no locations and we have a path and document, try to derive from path
  if ((!locations || locations.length === 0) && error.path && document) {
    const fieldNode = findFieldNodeByPath(document, error.path);
    if (fieldNode?.loc) {
      const { startToken } = fieldNode.loc;
      if (startToken) {
        locations = [{ line: startToken.line, column: startToken.column }];
      }
    }
  }

  // Only include locations if it's a non-empty array
  if (locations && Array.isArray(locations) && locations.length > 0) {
    formatted.locations = locations;
  }

  // Only include path if it exists
  if (error.path && error.path.length > 0) {
    formatted.path = error.path;
  }

  // Only include extensions if it has non-empty content
  if (error.extensions && Object.keys(error.extensions).length > 0) {
    formatted.extensions = error.extensions;
  }

  return formatted;
}

/**
 * Normalize an ExecutionResult to match v4 PostGraphile output format.
 * This ensures backward compatibility with existing tests and consumers.
 *
 * @param result - The execution result from grafast
 * @param document - The original document (used to derive locations from path)
 */
function normalizeResult<T>(result: ExecutionResult, document?: DocumentNode): T {
  const normalized: V4Result = {
    data: result.data,
  };

  // Format errors to match v4 style
  if (result.errors && result.errors.length > 0) {
    normalized.errors = result.errors.map(err => formatErrorToV4(err, document));
  }

  // Only include extensions if present and non-empty
  if (result.extensions && Object.keys(result.extensions).length > 0) {
    normalized.extensions = result.extensions;
  }

  return normalized as T;
}

interface PgSettings {
  [key: string]: string;
}

interface RunGraphQLOptions {
  input: GetConnectionsInput & GetConnectionOpts;
  conn: GetConnectionResult;
  pgPool: Pool;
  pgService: ReturnType<typeof makePgService>;
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  authRole: string;
  query: string | DocumentNode;
  // Use Record<string, any> to be compatible with grafast while allowing typed interfaces
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables?: Record<string, any>;
  reqOptions?: Record<string, unknown>;
}

/**
 * Execute a GraphQL query in the v5 context using grafast's execute function.
 *
 * This replaces the v4 withPostGraphileContext pattern with grafast execution.
 * Uses execute() with withPgClient to ensure proper connection handling and pgSettings.
 */
export const runGraphQLInContext = async <T = ExecutionResult>({
  input,
  conn,
  schema,
  resolvedPreset,
  pgService,
  authRole,
  query,
  variables,
  reqOptions = {},
}: RunGraphQLOptions): Promise<T> => {
  if (!conn.pg.client) {
    throw new Error('pgClient is required and must be provided externally.');
  }

  // Get the appropriate connection (root or database-specific)
  const pgConn = input.useRoot ? conn.pg : conn.db;
  const pgClient = pgConn.client;

  // Build pgSettings by merging:
  // 1. Context from db.setContext() (e.g., role, myapp.user_id)
  // 2. Settings from reqOptions.pgSettings (explicit overrides)
  // The role from getContext() takes precedence over authRole default
  const dbContext = pgConn.getContext();
  const reqPgSettings = (reqOptions.pgSettings as PgSettings) ?? {};

  // Start with authRole as default, then apply db context, then request overrides
  const pgSettings: PgSettings = {
    role: authRole,
    ...Object.fromEntries(
      Object.entries(dbContext).filter(([, v]) => v !== null) as [string, string][]
    ),
    ...reqPgSettings,
  };

  // Set role and context on the client for direct queries
  await setContextOnClient(pgClient, pgSettings, pgSettings.role);
  await pgConn.ctxQuery();

  // Convert query to DocumentNode if it's a string
  // Also ensure we have location information for error reporting
  let document: DocumentNode;
  if (typeof query === 'string') {
    document = parse(query);
  } else {
    // For DocumentNode (from graphql-tag), re-parse from source to get locations
    // graphql-tag doesn't preserve location info by default
    const source = print(query);
    document = parse(source);
  }

  // Build context with pgSettings and withPgClient
  // This is the v5 pattern used by executor.ts and api.ts
  const contextValue: Record<string, unknown> = {
    pgSettings,
    // Include additional request options (excluding pgSettings to avoid duplication)
    ...Object.fromEntries(
      Object.entries(reqOptions).filter(([key]) => key !== 'pgSettings')
    ),
  };

  // Provide a custom withPgClient function that uses the test client
  // This ensures GraphQL operations run within the test transaction
  // instead of getting a new connection from the pool
  const withPgClientKey = pgService.withPgClientKey ?? 'withPgClient';
  contextValue[withPgClientKey] = async <T>(
    _pgSettings: Record<string, string> | null,
    callback: (client: Client) => T | Promise<T>
  ): Promise<T> => {
    // Simply use the test client - it's already in a transaction
    // The pgSettings have already been applied above via setContextOnClient
    return callback(pgClient);
  };

  // Check if we're in a transaction by looking at the test client's transaction state
  // When useRoot is true, we might not be in a transaction
  // pgsql-test's `db` client is in a transaction, but `pg` (root) client may not be
  const isInTransaction = !input.useRoot;

  // Wrap the entire query execution in a savepoint if we're in a transaction
  // This matches v4 PostGraphile behavior where each mutation is wrapped in a savepoint
  // allowing the transaction to continue after a database error
  const executionSavepoint = isInTransaction
    ? `graphile_exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    : null;

  if (executionSavepoint) {
    await pgClient.query(`SAVEPOINT ${executionSavepoint}`);
  }

  let rawResult;
  try {
    // Execute using grafast's execute function - the v5 execution engine
    rawResult = await execute({
      schema,
      document,
      variableValues: variables ?? undefined,
      contextValue,
      resolvedPreset,
    });
  } catch (error) {
    // Rollback to savepoint on execution error
    if (executionSavepoint) {
      await pgClient.query(`ROLLBACK TO SAVEPOINT ${executionSavepoint}`);
    }
    throw error;
  }

  // Handle streaming results (subscriptions return AsyncGenerator)
  // For normal queries, we get ExecutionResult directly
  if (Symbol.asyncIterator in rawResult) {
    // This is a subscription/streaming result - not supported in test context
    throw new Error('Streaming results (subscriptions) are not supported in test context');
  }

  const result = rawResult as ExecutionResult;

  // If there were errors, rollback to savepoint to keep transaction usable
  // This matches v4 behavior where database errors don't abort the transaction
  if (executionSavepoint) {
    if (result.errors && result.errors.length > 0) {
      try {
        await pgClient.query(`ROLLBACK TO SAVEPOINT ${executionSavepoint}`);
      } catch {
        // Ignore if savepoint doesn't exist
      }
    } else {
      // Release the savepoint on success
      await pgClient.query(`RELEASE SAVEPOINT ${executionSavepoint}`);
    }
  }

  // Normalize the result to match v4 PostGraphile format for backward compatibility
  return normalizeResult<T>(result, document);
};

/**
 * Set the PostgreSQL role and session settings on a client connection.
 */
export async function setContextOnClient(
  pgClient: Client,
  pgSettings: Record<string, string>,
  role: string
): Promise<void> {
  await pgClient.query('SELECT set_config($1, $2, true)', ['role', role]);

  for (const [key, value] of Object.entries(pgSettings)) {
    await pgClient.query('SELECT set_config($1, $2, true)', [key, String(value)]);
  }
}
