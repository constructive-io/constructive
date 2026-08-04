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
 * function_definitions row, either preloaded or loaded at gather time.
 */
export interface FunctionBindingRow {
  bindingId: string;
  alias: string;
  config: Record<string, unknown> | null;
  functionDefinitionId: string;
  taskIdentifier: string;
  description: string | null;
  payloadArgs: PayloadArg[] | null;
}

/**
 * Physical names of one function-module scope's compute tables, resolved
 * from the constructive metaschema (metaschema_modules_public.function_module
 * / function_invocation_module) by the express-context compute module loader.
 * The plugin never guesses or hard-codes physical names.
 */
export interface ComputeModuleNames {
  /** Schema containing the bindings and definitions tables. */
  computeSchema: string;
  /** Bindings table name. */
  bindingsTable: string;
  /** Definitions table name. */
  definitionsTable: string;
  /** Schema containing the invocations table. */
  invocationsSchema: string;
  /** Invocations table name. */
  invocationsTable: string;
  /**
   * Scope-key column of the invocations table (metaschema `entity_field`):
   * `database_id` for the database scope, `null` for global scopes. Set on
   * the invocation insert instead of switching on scope name.
   */
  invocationsEntityField: string | null;
}

/**
 * A control-plane-resolved binding paired with the exact physical compute
 * module used for invocation writes. Supplying these rows lets schema builds
 * avoid querying tenant runtime pools for binding metadata.
 */
export interface PreloadedFunctionBinding extends FunctionBindingRow {
  module: ComputeModuleNames;
}

export interface FunctionBindingsPluginOptions {
  /** Only bindings for this api are exposed as mutations. */
  apiId: string;
  /**
   * One entry per provisioned function-module scope. Bindings from every
   * module are exposed; RLS on the underlying tables governs access.
   */
  modules: readonly ComputeModuleNames[];
  /**
   * Authoritative control-plane-resolved bindings for this build. When this
   * option is defined, including as an empty array, the plugin performs no
   * gather-time binding metadata query. Omit it to retain the generic SQL
   * loader for callers that do not have a control-plane snapshot.
   */
  preloadedBindings?: readonly PreloadedFunctionBinding[];
}
