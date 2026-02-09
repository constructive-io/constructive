/**
 * GraphQL Schema Introspection Query
 *
 * Full introspection query that captures all queries, mutations, and types
 * from a GraphQL endpoint via the standard __schema query.
 */

import type { IntrospectionQueryResponse } from '../../types/introspection';

/**
 * Full schema introspection query
 *
 * Captures:
 * - All Query fields with args and return types
 * - All Mutation fields with args and return types
 * - All types (OBJECT, INPUT_OBJECT, ENUM, SCALAR) for resolution
 *
 * Uses a recursive TypeRef fragment to handle deeply nested type wrappers
 * (e.g., [String!]! = NON_NULL(LIST(NON_NULL(SCALAR))))
 */
export const SCHEMA_INTROSPECTION_QUERY = `
query IntrospectSchema {
  __schema {
    queryType {
      name
    }
    mutationType {
      name
    }
    subscriptionType {
      name
    }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          name
          description
          type {
            ...TypeRef
          }
          defaultValue
        }
        type {
          ...TypeRef
        }
        isDeprecated
        deprecationReason
      }
      inputFields {
        name
        description
        type {
          ...TypeRef
        }
        defaultValue
      }
      interfaces {
        name
      }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      possibleTypes {
        name
      }
    }
    directives {
      name
      description
      locations
      args {
        name
        description
        type {
          ...TypeRef
        }
        defaultValue
      }
    }
  }
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

// Re-export the response type for convenience
export type { IntrospectionQueryResponse };
