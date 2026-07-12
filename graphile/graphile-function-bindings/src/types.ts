/**
 * A single ordered payload argument declaration from
 * function_definitions.payload_args ([{name, type}]).
 */
export interface PayloadArg {
  name: string;
  type: string;
}

/**
 * Minimal JSON Schema subset used for GraphQL input type derivation.
 * Runtime validation is intentionally NOT performed against this schema —
 * it is only used to shape the generated input types.
 */
export interface JsonSchemaNode {
  type?: string | string[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  enum?: unknown[];
  items?: JsonSchemaNode;
  description?: string;
}

/**
 * A graphql-enabled function_api_bindings row joined to its
 * function_definitions row, loaded at gather time.
 */
export interface FunctionBindingRow {
  bindingId: string;
  alias: string;
  config: Record<string, unknown> | null;
  functionDefinitionId: string;
  taskIdentifier: string;
  databaseId: string | null;
  description: string | null;
  payloadArgs: PayloadArg[] | null;
}

export interface FunctionBindingsPluginOptions {
  /** Only bindings for this api are exposed as mutations. */
  apiId: string;
  /**
   * Schema containing function_api_bindings / function_definitions /
   * function_invocations. Auto-discovered from the pgService's exposed
   * schemas (or the search path) when omitted.
   */
  computeSchema?: string;
}
