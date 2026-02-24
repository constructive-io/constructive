import type { CapabilityTag, ToolRiskClass } from '../../types/tools';

export interface GraphQLOperationDefinition<TArgs = Record<string, unknown>> {
  toolName: string;
  label: string;
  description: string;
  capability: CapabilityTag;
  riskClass: ToolRiskClass;
  document: string;
  mapVariables?: (args: TArgs) => Record<string, unknown>;
}

export class GraphQLOperationRegistry {
  private readonly operations = new Map<
    string,
    GraphQLOperationDefinition<any>
  >();

  register<TArgs = Record<string, unknown>>(
    definition: GraphQLOperationDefinition<TArgs>,
  ): void {
    if (this.operations.has(definition.toolName)) {
      throw new Error(
        `GraphQL operation ${definition.toolName} is already registered`,
      );
    }

    this.operations.set(definition.toolName, definition);
  }

  get<TArgs = Record<string, unknown>>(
    toolName: string,
  ): GraphQLOperationDefinition<TArgs> | undefined {
    return this.operations.get(toolName) as
      | GraphQLOperationDefinition<TArgs>
      | undefined;
  }

  list(): GraphQLOperationDefinition<any>[] {
    return [...this.operations.values()] as GraphQLOperationDefinition<any>[];
  }
}
