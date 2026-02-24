import type {
  AgentToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/tools';

import type { GraphQLExecutor } from './executor';
import type { GraphQLOperationDefinition } from './operation-registry';

export interface GraphQLToolContext {
  endpoint: string;
  headers?: Record<string, string>;
}

export type ResolveGraphQLToolContext = (
  context: ToolExecutionContext,
) => Promise<GraphQLToolContext>;

export function createGraphQLTool<TArgs = Record<string, unknown>>(
  operation: GraphQLOperationDefinition<TArgs>,
  executor: GraphQLExecutor,
  resolveContext: ResolveGraphQLToolContext,
): AgentToolDefinition<TArgs, unknown> {
  return {
    name: operation.toolName,
    label: operation.label,
    description: operation.description,
    capability: operation.capability,
    riskClass: operation.riskClass,
    execute: async (
      args: TArgs,
      context: ToolExecutionContext,
      signal?: AbortSignal,
    ): Promise<ToolExecutionResult<unknown>> => {
      const requestContext = await resolveContext(context);
      const variables = operation.mapVariables ? operation.mapVariables(args) : (args as Record<string, unknown>);

      const result = await executor.execute({
        endpoint: requestContext.endpoint,
        document: operation.document,
        variables,
        headers: requestContext.headers,
        signal,
      });

      if (!result.ok) {
        const message = result.errors?.map((error) => error.message).join('; ') || 'GraphQL execution failed';
        throw new Error(message);
      }

      return {
        content: result.data,
      };
    },
  };
}
