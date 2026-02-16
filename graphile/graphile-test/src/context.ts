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
import { makePgService } from 'postgraphile/adaptors/pg';
import type { Client, Pool, QueryConfig } from 'pg';
import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';

import type { GetConnectionsInput } from './types';

const EMPTY_ARRAY: readonly PgNotice[] = Object.freeze([]);
const $$queue = Symbol('withPgClientQueue');

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

interface PgNotice {
  severity: string;
  message: string;
  code?: string;
  detail?: string;
  hint?: string;
  position?: number;
  internalPosition?: number;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: number;
  routine?: string;
}

interface PgQueryResult {
  rows: unknown[];
  rowCount: number | null;
  notices: readonly PgNotice[];
}

interface AdaptedPgClient {
  rawClient: Client;
  withTransaction(callback: (client: AdaptedPgClient) => Promise<unknown>): Promise<unknown>;
  query(opts: { text: string; values?: unknown[]; arrayMode?: boolean }): Promise<PgQueryResult>;
}

function convertNotice(n: Record<string, unknown>): PgNotice {
  return {
    severity: (n.severity as string) ?? 'NOTICE',
    message: (n.message as string) ?? '',
    code: n.code as string | undefined,
    detail: n.detail as string | undefined,
    hint: n.hint as string | undefined,
    position: n.position != null ? parseInt(String(n.position), 10) : undefined,
    internalPosition: n.internalPosition != null ? parseInt(String(n.internalPosition), 10) : undefined,
    internalQuery: n.internalQuery as string | undefined,
    where: n.where as string | undefined,
    schema: n.schema as string | undefined,
    table: n.table as string | undefined,
    column: n.column as string | undefined,
    dataType: n.dataType as string | undefined,
    constraint: n.constraint as string | undefined,
    file: n.file as string | undefined,
    line: n.line != null ? parseInt(String(n.line), 10) : undefined,
    routine: n.routine as string | undefined,
  };
}

async function pgClientQuery(pgClient: Client, queryObj: QueryConfig): Promise<PgQueryResult> {
  let notices: PgNotice[] | null = null;
  const addNotice = (n: Record<string, unknown>) => {
    const converted = convertNotice(n);
    if (notices === null) {
      notices = [converted];
    } else {
      notices.push(converted);
    }
  };
  pgClient.addListener('notice', addNotice);
  try {
    const { rows, rowCount } = await pgClient.query(queryObj);
    return { rows, rowCount, notices: notices ?? EMPTY_ARRAY };
  } finally {
    pgClient.removeListener('notice', addNotice);
  }
}

function newNodePostgresPgClient(
  pgClient: Client,
  txLevel: number,
  alwaysQueue: boolean,
  alreadyInTransaction: boolean
): AdaptedPgClient {
  let queue: Promise<unknown> | null = null;
  const addToQueue = <T>(callback: () => Promise<T>): Promise<T> => {
    const result = queue ? queue.then(callback) : callback();
    const clearIfSame = () => {
      if (queue === newQueue) {
        queue = null;
      }
    };
    const newQueue = result.then(clearIfSame, clearIfSame);
    queue = newQueue;
    return result;
  };
  return {
    rawClient: pgClient,
    withTransaction(callback) {
      return addToQueue(async () => {
        if (txLevel === 0 && !alreadyInTransaction) {
          await pgClient.query({ text: 'begin' });
        } else {
          await pgClient.query({
            text: `savepoint tx${txLevel === 0 ? '' : txLevel}`,
          });
        }
        try {
          const newClient = newNodePostgresPgClient(pgClient, txLevel + 1, alwaysQueue, alreadyInTransaction);
          const innerResult = await callback(newClient);
          if (txLevel === 0 && !alreadyInTransaction) {
            await pgClient.query({ text: 'commit' });
          } else {
            await pgClient.query({
              text: `release savepoint tx${txLevel === 0 ? '' : txLevel}`,
            });
          }
          return innerResult;
        } catch (e) {
          try {
            if (txLevel === 0 && !alreadyInTransaction) {
              await pgClient.query({ text: 'rollback' });
            } else {
              await pgClient.query({
                text: `rollback to savepoint tx${txLevel === 0 ? '' : txLevel}`,
              });
            }
          } catch (_e2) {
            console.error(`Error occurred whilst rolling back: ${e}`);
          }
          throw e;
        }
      });
    },
    query(opts) {
      if (queue || alwaysQueue) {
        return addToQueue(doIt);
      } else {
        return doIt();
      }
      function doIt() {
        const { text, values, arrayMode } = opts;
        const queryObj: QueryConfig = arrayMode
          ? { text, values, rowMode: 'array' as const } as QueryConfig
          : { text, values };
        return pgClientQuery(pgClient, queryObj);
      }
    },
  };
}

async function makeNodePostgresWithPgClient_inner<T>(
  pgClient: Client & { [key: symbol]: Promise<unknown> | null },
  pgSettings: Record<string, string> | null,
  callback: (client: AdaptedPgClient) => T | Promise<T>,
  alwaysQueue: boolean,
  alreadyInTransaction: boolean
): Promise<T> {
  const pgSettingsEntries: [string, string][] = [];
  if (pgSettings != null) {
    for (const [key, value] of Object.entries(pgSettings)) {
      if (value == null) continue;
      pgSettingsEntries.push([key, '' + value]);
    }
  }
  while (pgClient[$$queue]) {
    await pgClient[$$queue];
  }
  return (pgClient[$$queue] = (async () => {
    try {
      if (pgSettingsEntries.length > 0) {
        await pgClient.query({
          text: alreadyInTransaction ? 'savepoint tx' : 'begin',
        });
        try {
          await pgClient.query({
            text: 'select set_config(el->>0, el->>1, true) from json_array_elements($1::json) el',
            values: [JSON.stringify(pgSettingsEntries)],
          });
          const client = newNodePostgresPgClient(pgClient, 1, alwaysQueue, alreadyInTransaction);
          const result = await callback(client);
          await pgClient.query({
            text: alreadyInTransaction ? 'release savepoint tx' : 'commit',
          });
          return result;
        } catch (e) {
          await pgClient.query({
            text: alreadyInTransaction
              ? 'rollback to savepoint tx'
              : 'rollback',
          });
          throw e;
        }
      } else {
        const client = newNodePostgresPgClient(pgClient, 0, alwaysQueue, alreadyInTransaction);
        return await callback(client);
      }
    } finally {
      pgClient[$$queue] = null;
    }
  })()) as Promise<T>;
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

  // Provide a custom withPgClient function that uses the test client.
  // This ensures GraphQL operations run within the test transaction
  // instead of getting a new connection from the pool.
  //
  // Uses the full adapted client from @dataplan/pg with:
  // - Query queuing to serialize concurrent calls
  // - Proper pgSettings handling with savepoint wrapping
  // - arrayMode → rowMode translation for pg client compatibility
  const isInTransaction = !input.useRoot;
  const withPgClientKey = pgService.withPgClientKey ?? 'withPgClient';
  const adaptedWithPgClient = async (
    callerPgSettings: Record<string, string> | null,
    callback: (client: AdaptedPgClient) => unknown
  ) => {
    return makeNodePostgresWithPgClient_inner(
      pgClient as Client & { [key: symbol]: Promise<unknown> | null },
      callerPgSettings,
      callback,
      true,
      isInTransaction
    );
  };
  let released = false;
  (adaptedWithPgClient as unknown as { release: () => void }).release = () => {
    if (released) return;
    released = true;
  };
  contextValue[withPgClientKey] = adaptedWithPgClient;

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
      middleware: null,
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
