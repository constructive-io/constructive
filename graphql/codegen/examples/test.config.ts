/**
 * Shared test configuration for example scripts.
 *
 * Endpoints should point to a seeded database created via:
 *   pnpm --filter admin seed:schema-builder --email=<email> --password=<pass>
 *
 * After seeding, update DB_GRAPHQL_ENDPOINT with the output endpoint URL.
 */

// ============================================================================
// Endpoint Configuration
// ============================================================================

/**
 * GraphQL endpoint for the seeded application database.
 * Update this after running the seed script.
 */
export const DB_GRAPHQL_ENDPOINT =
  'http://public-8d3a1ec3.localhost:3000/graphql';

// ============================================================================
// Seed User Credentials
// ============================================================================

/**
 * Credentials for the seeded admin user.
 * These match SEED_USER_EMAIL and SEED_USER_PASSWORD in seed-schema-builder.ts
 */
export const SEED_USER = {
  email: 'seeder@gmail.com',
  password: 'password1111!@#$',
} as const;

/**
 * Alternative seed user for direct endpoint seeding.
 */
export const SEED_USER_ALT = {
  email: 'seederalt@gmail.com',
  password: 'password1111!@#$',
} as const;

// ============================================================================
// File Paths
// ============================================================================

/**
 * Path for downloaded schema file (relative to examples/).
 */
export const SCHEMA_FILE = 'test.graphql';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Login mutation document for obtaining auth token.
 */
export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      apiToken {
        accessToken
        accessTokenExpiresAt
      }
    }
  }
`;

/**
 * Execute a GraphQL request against an endpoint.
 */
export async function executeGraphQL<T = unknown, V = Record<string, unknown>>(
  endpoint: string,
  query: string,
  variables?: V,
  headers?: Record<string, string>
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  });

  return response.json() as Promise<{
    data?: T;
    errors?: Array<{ message: string }>;
  }>;
}

/**
 * Login and return the access token.
 */
export async function login(
  endpoint: string = DB_GRAPHQL_ENDPOINT,
  credentials: { email: string; password: string } = SEED_USER
): Promise<string> {
  const result = await executeGraphQL<{
    login: {
      apiToken: { accessToken: string; accessTokenExpiresAt: string } | null;
    };
  }>(endpoint, LOGIN_MUTATION, { input: credentials });

  if (result.errors?.length) {
    throw new Error(`Login failed: ${result.errors[0].message}`);
  }

  const token = result.data?.login?.apiToken?.accessToken;
  if (!token) {
    throw new Error('Login failed: No access token returned');
  }

  return token;
}

/**
 * Introspection query for schema download.
 */
export const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;
