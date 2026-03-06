/**
 * Simple GraphQL HTTP client with pagination and authentication support.
 * Used by the GraphQL export flow to fetch data from the Constructive GraphQL API.
 */

interface GraphQLClientOptions {
  endpoint: string;
  token?: string;
  headers?: Record<string, string>;
}

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }> }>;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface ConnectionResult<T = Record<string, unknown>> {
  nodes: T[];
  pageInfo: PageInfo;
  totalCount?: number;
}

export class GraphQLClient {
  private endpoint: string;
  private defaultHeaders: Record<string, string>;

  constructor({ endpoint, token, headers }: GraphQLClientOptions) {
    this.endpoint = endpoint;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    };
  }

  /**
   * Execute a single GraphQL query with retry for transient network errors.
   */
  async query<T = any>(
    queryString: string,
    variables?: Record<string, unknown>,
    retries = 3
  ): Promise<T> {
    const body: Record<string, unknown> = { query: queryString };
    if (variables) {
      body.variables = variables;
    }

    let lastError: Error | undefined;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: this.defaultHeaders,
          body: JSON.stringify(body)
        });

        // Try to parse JSON even on non-200 responses (GraphQL servers often
        // return 400 with a JSON body containing error details)
        let json: GraphQLResponse<T>;
        try {
          json = (await response.json()) as GraphQLResponse<T>;
        } catch {
          if (!response.ok) {
            throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
          }
          throw new Error('GraphQL response is not valid JSON');
        }

        if (json.errors?.length) {
          const messages = json.errors.map(e => e.message).join('; ');
          throw new Error(`GraphQL errors: ${messages}`);
        }

        if (!response.ok) {
          throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
        }

        if (!json.data) {
          throw new Error('GraphQL response missing data');
        }

        return json.data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const cause = (lastError as any).cause;
        const isTransient = cause?.code === 'ECONNRESET' ||
          cause?.code === 'ECONNREFUSED' ||
          cause?.code === 'UND_ERR_SOCKET' ||
          lastError.message.includes('fetch failed');

        if (isTransient && attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.warn(`  Retry ${attempt + 1}/${retries - 1}: ${cause?.code || lastError.message} — waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError;
  }

  /**
   * Fetch all rows from a paginated GraphQL connection, handling cursor-based pagination.
   * Returns all nodes across all pages.
   */
  async fetchAllNodes<T = Record<string, unknown>>(
    queryFieldName: string,
    fieldsFragment: string,
    condition?: Record<string, unknown>,
    pageSize = 100
  ): Promise<T[]> {
    const allNodes: T[] = [];
    let hasNextPage = true;
    let afterCursor: string | null = null;

    while (hasNextPage) {
      const args = this.buildConnectionArgs(condition, pageSize, afterCursor);
      const queryString = `{
  ${queryFieldName}${args} {
    nodes {
      ${fieldsFragment}
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

      const data = await this.query<Record<string, ConnectionResult<T>>>(queryString);
      const connection = data[queryFieldName];

      if (!connection?.nodes) {
        break;
      }

      allNodes.push(...connection.nodes);
      hasNextPage = connection.pageInfo?.hasNextPage ?? false;
      afterCursor = connection.pageInfo?.endCursor ?? null;
    }

    return allNodes;
  }

  private buildConnectionArgs(
    condition?: Record<string, unknown>,
    first?: number,
    after?: string | null
  ): string {
    const parts: string[] = [];

    if (first) {
      parts.push(`first: ${first}`);
    }
    if (after) {
      parts.push(`after: "${after}"`);
    }
    if (condition && Object.keys(condition).length > 0) {
      const condParts = Object.entries(condition)
        .map(([k, v]) => {
          if (typeof v === 'string') return `${k}: "${v}"`;
          if (typeof v === 'boolean') return `${k}: ${v}`;
          if (typeof v === 'number') return `${k}: ${v}`;
          return `${k}: "${v}"`;
        })
        .join(', ');
      parts.push(`condition: { ${condParts} }`);
    }

    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  }
}
