/**
 * Runtime query builder for ORM client
 *
 * This module provides the runtime functionality that builds GraphQL
 * queries/mutations from the fluent API calls and executes them.
 *
 * This file will be copied to the generated output (not generated via AST)
 * since it's runtime code that doesn't change based on schema.
 */

import type { QueryResult, GraphQLError } from './select-types';

/**
 * ORM client configuration
 */
export interface OrmClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
}

/**
 * Internal client state
 */
export class OrmClient {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(config: OrmClientConfig) {
    this.endpoint = config.endpoint;
    this.headers = config.headers ?? {};
  }

  /**
   * Execute a GraphQL query/mutation
   */
  async execute<T>(
    document: string,
    variables?: Record<string, unknown>
  ): Promise<QueryResult<T>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        query: document,
        variables: variables ?? {},
      }),
    });

    if (!response.ok) {
      return {
        data: null,
        errors: [
          {
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        ],
      };
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: GraphQLError[];
    };

    return {
      data: json.data ?? null,
      errors: json.errors,
    };
  }

  /**
   * Update headers (e.g., for auth token refresh)
   */
  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  /**
   * Get current endpoint
   */
  getEndpoint(): string {
    return this.endpoint;
  }
}

/**
 * Configuration for building a query
 */
export interface QueryBuilderConfig {
  client: OrmClient;
  operation: 'query' | 'mutation';
  operationName: string;
  fieldName: string;
  document: string;
  variables?: Record<string, unknown>;
}

/**
 * Query builder that holds the query configuration and executes it
 *
 * Usage:
 * ```typescript
 * const result = await new QueryBuilder(config).execute();
 * ```
 */
export class QueryBuilder<TResult> {
  private config: QueryBuilderConfig;

  constructor(config: QueryBuilderConfig) {
    this.config = config;
  }

  /**
   * Execute the query and return the result
   */
  async execute(): Promise<QueryResult<TResult>> {
    return this.config.client.execute<TResult>(
      this.config.document,
      this.config.variables
    );
  }

  /**
   * Get the GraphQL document (useful for debugging)
   */
  toGraphQL(): string {
    return this.config.document;
  }

  /**
   * Get the variables (useful for debugging)
   */
  getVariables(): Record<string, unknown> | undefined {
    return this.config.variables;
  }
}

// ============================================================================
// GraphQL Document Builders (Runtime)
// ============================================================================

/**
 * Build field selections from a select object
 *
 * Converts:
 * { id: true, name: true, posts: { select: { title: true } } }
 *
 * To:
 * id
 * name
 * posts {
 *   nodes { title }
 *   totalCount
 *   pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
 * }
 */
export function buildSelections(
  select: Record<string, unknown> | undefined,
  fieldMeta?: Record<string, FieldMeta>
): string {
  if (!select) {
    return '';
  }

  const fields: string[] = [];

  for (const [key, value] of Object.entries(select)) {
    if (value === false || value === undefined) {
      continue;
    }

    if (value === true) {
      fields.push(key);
      continue;
    }

    // Nested select
    if (typeof value === 'object' && value !== null) {
      const nested = value as {
        select?: Record<string, unknown>;
        first?: number;
        filter?: Record<string, unknown>;
        orderBy?: string[];
      };

      const meta = fieldMeta?.[key];
      const isConnection = meta?.isConnection ?? true; // Default to connection for relations

      if (nested.select) {
        const nestedSelections = buildSelections(nested.select);

        // Build arguments for the relation field
        const args: string[] = [];
        if (nested.first !== undefined) {
          args.push(`first: ${nested.first}`);
        }
        if (nested.filter) {
          args.push(`filter: ${JSON.stringify(nested.filter)}`);
        }
        if (nested.orderBy && nested.orderBy.length > 0) {
          args.push(`orderBy: [${nested.orderBy.join(', ')}]`);
        }

        const argsStr = args.length > 0 ? `(${args.join(', ')})` : '';

        if (isConnection) {
          // Connection type - include nodes, totalCount, pageInfo
          fields.push(`${key}${argsStr} {
      nodes { ${nestedSelections} }
      totalCount
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    }`);
        } else {
          // Direct relation (not a connection)
          fields.push(`${key}${argsStr} { ${nestedSelections} }`);
        }
      }
    }
  }

  return fields.join('\n    ');
}

/**
 * Field metadata for determining connection vs direct relation
 */
export interface FieldMeta {
  isConnection: boolean;
  isNullable: boolean;
  typeName: string;
}

/**
 * Build a findMany query document
 */
export function buildFindManyDocument(
  operationName: string,
  queryField: string,
  select: Record<string, unknown> | undefined,
  args: {
    where?: Record<string, unknown>;
    orderBy?: string[];
    first?: number;
    last?: number;
    after?: string;
    before?: string;
    offset?: number;
  },
  filterTypeName: string
): { document: string; variables: Record<string, unknown> } {
  const selections = select ? buildSelections(select) : 'id';

  // Build variable definitions and query arguments
  const varDefs: string[] = [];
  const queryArgs: string[] = [];
  const variables: Record<string, unknown> = {};

  if (args.where) {
    varDefs.push(`$where: ${filterTypeName}`);
    queryArgs.push('filter: $where');
    variables.where = args.where;
  }
  if (args.orderBy && args.orderBy.length > 0) {
    varDefs.push(`$orderBy: [${operationName}OrderBy!]`);
    queryArgs.push('orderBy: $orderBy');
    variables.orderBy = args.orderBy;
  }
  if (args.first !== undefined) {
    varDefs.push('$first: Int');
    queryArgs.push('first: $first');
    variables.first = args.first;
  }
  if (args.last !== undefined) {
    varDefs.push('$last: Int');
    queryArgs.push('last: $last');
    variables.last = args.last;
  }
  if (args.after) {
    varDefs.push('$after: Cursor');
    queryArgs.push('after: $after');
    variables.after = args.after;
  }
  if (args.before) {
    varDefs.push('$before: Cursor');
    queryArgs.push('before: $before');
    variables.before = args.before;
  }
  if (args.offset !== undefined) {
    varDefs.push('$offset: Int');
    queryArgs.push('offset: $offset');
    variables.offset = args.offset;
  }

  const varDefsStr = varDefs.length > 0 ? `(${varDefs.join(', ')})` : '';
  const queryArgsStr = queryArgs.length > 0 ? `(${queryArgs.join(', ')})` : '';

  const document = `query ${operationName}Query${varDefsStr} {
  ${queryField}${queryArgsStr} {
    nodes {
      ${selections}
    }
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}`;

  return { document, variables };
}

/**
 * Build a findFirst query document
 */
export function buildFindFirstDocument(
  operationName: string,
  queryField: string,
  select: Record<string, unknown> | undefined,
  args: {
    where?: Record<string, unknown>;
  },
  filterTypeName: string
): { document: string; variables: Record<string, unknown> } {
  const selections = select ? buildSelections(select) : 'id';

  const varDefs: string[] = [];
  const queryArgs: string[] = [];
  const variables: Record<string, unknown> = {};

  if (args.where) {
    varDefs.push(`$where: ${filterTypeName}`);
    queryArgs.push('filter: $where');
    variables.where = args.where;
  }

  // findFirst uses the list query with first: 1
  varDefs.push('$first: Int');
  queryArgs.push('first: $first');
  variables.first = 1;

  const varDefsStr = varDefs.length > 0 ? `(${varDefs.join(', ')})` : '';
  const queryArgsStr = queryArgs.length > 0 ? `(${queryArgs.join(', ')})` : '';

  const document = `query ${operationName}Query${varDefsStr} {
  ${queryField}${queryArgsStr} {
    nodes {
      ${selections}
    }
  }
}`;

  return { document, variables };
}

/**
 * Build a create mutation document
 */
export function buildCreateDocument(
  operationName: string,
  mutationField: string,
  entityField: string,
  select: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
  inputTypeName: string
): { document: string; variables: Record<string, unknown> } {
  const selections = select ? buildSelections(select) : 'id';

  const document = `mutation ${operationName}Mutation($input: ${inputTypeName}!) {
  ${mutationField}(input: $input) {
    ${entityField} {
      ${selections}
    }
  }
}`;

  return {
    document,
    variables: {
      input: {
        [entityField]: data,
      },
    },
  };
}

/**
 * Build an update mutation document
 */
export function buildUpdateDocument(
  operationName: string,
  mutationField: string,
  entityField: string,
  select: Record<string, unknown> | undefined,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  inputTypeName: string
): { document: string; variables: Record<string, unknown> } {
  const selections = select ? buildSelections(select) : 'id';

  // PostGraphile update uses nodeId or primary key in input
  const document = `mutation ${operationName}Mutation($input: ${inputTypeName}!) {
  ${mutationField}(input: $input) {
    ${entityField} {
      ${selections}
    }
  }
}`;

  return {
    document,
    variables: {
      input: {
        id: where.id, // Assumes id-based where clause
        patch: data,
      },
    },
  };
}

/**
 * Build a delete mutation document
 */
export function buildDeleteDocument(
  operationName: string,
  mutationField: string,
  entityField: string,
  where: Record<string, unknown>,
  inputTypeName: string
): { document: string; variables: Record<string, unknown> } {
  const document = `mutation ${operationName}Mutation($input: ${inputTypeName}!) {
  ${mutationField}(input: $input) {
    ${entityField} {
      id
    }
  }
}`;

  return {
    document,
    variables: {
      input: {
        id: where.id,
      },
    },
  };
}

/**
 * Build a custom query document
 */
export function buildCustomQueryDocument(
  operationName: string,
  queryField: string,
  select: Record<string, unknown> | undefined,
  args: Record<string, unknown> | undefined,
  variableDefinitions: Array<{ name: string; type: string }>
): { document: string; variables: Record<string, unknown> } {
  const selections = select ? buildSelections(select) : '';

  const varDefs = variableDefinitions.map((v) => `$${v.name}: ${v.type}`);
  const queryArgs = variableDefinitions.map((v) => `${v.name}: $${v.name}`);

  const varDefsStr = varDefs.length > 0 ? `(${varDefs.join(', ')})` : '';
  const queryArgsStr = queryArgs.length > 0 ? `(${queryArgs.join(', ')})` : '';

  const selectionsBlock = selections ? ` {\n      ${selections}\n    }` : '';

  const document = `query ${operationName}Query${varDefsStr} {
  ${queryField}${queryArgsStr}${selectionsBlock}
}`;

  return {
    document,
    variables: args ?? {},
  };
}

/**
 * Build a custom mutation document
 */
export function buildCustomMutationDocument(
  operationName: string,
  mutationField: string,
  select: Record<string, unknown> | undefined,
  args: Record<string, unknown> | undefined,
  variableDefinitions: Array<{ name: string; type: string }>
): { document: string; variables: Record<string, unknown> } {
  const selections = select ? buildSelections(select) : '';

  const varDefs = variableDefinitions.map((v) => `$${v.name}: ${v.type}`);
  const mutationArgs = variableDefinitions.map((v) => `${v.name}: $${v.name}`);

  const varDefsStr = varDefs.length > 0 ? `(${varDefs.join(', ')})` : '';
  const mutationArgsStr =
    mutationArgs.length > 0 ? `(${mutationArgs.join(', ')})` : '';

  const selectionsBlock = selections ? ` {\n      ${selections}\n    }` : '';

  const document = `mutation ${operationName}Mutation${varDefsStr} {
  ${mutationField}${mutationArgsStr}${selectionsBlock}
}`;

  return {
    document,
    variables: args ?? {},
  };
}
