import type { AgentToolDefinition } from '../../types/tools';

import { createGraphQLHeaders } from './auth-context';
import {
  FetchGraphQLExecutor,
  type GraphQLExecutor,
} from './executor';

const HEALTH_CHECK_QUERY = `
  query ConstructiveAgentHealthCheck {
    __typename
  }
`;

export interface GraphQLHealthCheckToolOptions {
  executor?: GraphQLExecutor;
}

export function createGraphQLHealthCheckTool(
  options: GraphQLHealthCheckToolOptions = {},
): AgentToolDefinition<Record<string, never>, unknown> {
  const executor = options.executor || new FetchGraphQLExecutor();

  return {
    name: 'graphql_health_check',
    label: 'GraphQL Health Check',
    description: 'Checks GraphQL endpoint availability by querying __typename.',
    capability: 'read',
    riskClass: 'read_only',
    execute: async (_args, context, signal) => {
      const identity = context.identity;

      if (!identity?.graphqlEndpoint) {
        throw new Error(
          'Missing identity.graphqlEndpoint in tool execution context.',
        );
      }

      const result = await executor.execute({
        endpoint: identity.graphqlEndpoint,
        document: HEALTH_CHECK_QUERY,
        variables: {},
        headers: createGraphQLHeaders(identity),
        signal,
      });

      if (!result.ok) {
        const message =
          result.errors?.map((error) => error.message).join('; ') ||
          'GraphQL health check failed';
        throw new Error(message);
      }

      return {
        content: result.data,
        summary: 'GraphQL health check succeeded',
      };
    },
  };
}
