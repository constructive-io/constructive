import type {
  AgentToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../types/tools';

export function createEchoTool(name: string = 'echo_tool'): AgentToolDefinition {
  return {
    name,
    label: 'Echo Tool',
    description: 'Returns the provided args and context for testing.',
    capability: 'read',
    riskClass: 'read_only',
    execute: async (
      args: unknown,
      context: ToolExecutionContext,
    ): Promise<ToolExecutionResult> => {
      return {
        content: {
          args,
          context,
        },
      };
    },
  };
}
