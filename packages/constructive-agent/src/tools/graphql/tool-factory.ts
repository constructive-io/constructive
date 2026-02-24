import type { AgentToolDefinition } from '../../types/tools';

import { createGraphQLHeaders } from './auth-context';
import {
  FetchGraphQLExecutor,
  type GraphQLExecutor,
} from './executor';
import { createGraphQLTool } from './graphql-tool';
import {
  GraphQLOperationRegistry,
  type GraphQLOperationDefinition,
} from './operation-registry';

export interface CreateToolsFromRegistryOptions {
  executor?: GraphQLExecutor;
  staticEndpoint?: string;
  staticHeaders?: Record<string, string>;
}

export function createGraphQLToolsFromRegistry(
  registry: GraphQLOperationRegistry,
  options: CreateToolsFromRegistryOptions = {},
): AgentToolDefinition<any, any>[] {
  const executor = options.executor || new FetchGraphQLExecutor();

  return registry.list().map((operation) =>
    createGraphQLTool(
      operation,
      executor,
      async (context) => {
        const endpoint =
          options.staticEndpoint || context.identity?.graphqlEndpoint;

        if (!endpoint) {
          throw new Error(
            `No GraphQL endpoint found for operation ${operation.toolName}.`,
          );
        }

        const headers =
          context.identity
            ? createGraphQLHeaders(context.identity, options.staticHeaders)
            : options.staticHeaders;

        return {
          endpoint,
          headers,
        };
      },
    ),
  );
}
