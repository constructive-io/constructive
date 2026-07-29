// ─── FieldType / FieldDefault ─────────────────────────────────────

/**
 * Structured representation of a PostgreSQL data type.
 *
 * Stored as JSONB in `metaschema_public.field.type`.
 *
 * @example Simple type
 * { name: "text" }
 *
 * @example Type with arguments
 * { name: "geometry", args: ["Point", 4326] }
 * { name: "numeric", args: [10, 2] }
 * { name: "vector", args: [1536] }
 *
 * @example Array type
 * { name: "text", array_dimensions: 1 }
 *
 * @example Schema-qualified type
 * { name: "my_type", schema: "my_schema" }
 *
 * @example Interval with field range
 * { name: "interval", range: ["day", "second"] }
 */
export interface FieldType {
  /** Type name (required). Must be a valid SQL identifier. */
  name: string;
  /** Schema qualifier (optional). Must be a valid SQL identifier. */
  schema?: string;
  /** Type arguments (optional). Each is a string identifier, number, or boolean. */
  args?: (string | number | boolean)[];
  /** Number of array dimensions (optional). 1 = `text[]`, 2 = `text[][]`. */
  array_dimensions?: number;
  /** Interval field range (optional). 1-2 elements: ["day"] or ["day", "second"]. */
  range?: string[];
}

/**
 * Argument to a function in a FieldDefault expression.
 * Can be a literal value or a nested FieldDefault (recursive).
 */
export type FieldDefaultArg = string | number | boolean | null | FieldDefault;

/**
 * Structured representation of a PostgreSQL default value expression.
 *
 * Stored as JSONB in `metaschema_public.field.default_value`.
 *
 * @example Literal values
 * { value: false }
 * { value: 0 }
 * { value: "pooled" }
 *
 * @example Cast expression
 * { value: {}, cast: { name: "jsonb" } }
 * { value: "15 minutes", cast: { name: "interval" } }
 *
 * @example Simple function call
 * { function: "now" }
 * { function: "gen_random_uuid" }
 *
 * @example Schema-qualified function
 * { function: "current_user_id", schema: "jwt_public" }
 *
 * @example Function with arguments (nested)
 * { function: "encode", args: [{ function: "gen_random_bytes", args: [{ value: 16 }] }, { value: "hex" }] }
 *
 * @example Function with cast
 * { function: "lpad", args: [{ value: "" }, { value: 32 }, { value: "0" }], cast: { name: "bit", args: [32] } }
 *
 * @example Operator expression
 * { operator: "+", left: { function: "now" }, right: { value: "5 minutes", cast: { name: "interval" } } }
 *
 * @example SQL keyword
 * { sql_keyword: "CURRENT_TIMESTAMP" }
 */
export interface FieldDefault {
  /** Literal value (string, number, boolean, null, array, or object). */
  value?: string | number | boolean | null | unknown[] | Record<string, unknown>;
  /** Function name. Must be a valid SQL identifier. */
  function?: string;
  /** Schema qualifier for function (optional). */
  schema?: string;
  /** Function arguments (optional, recursive). */
  args?: FieldDefaultArg[];
  /** Output type cast (optional). Reuses FieldType shape. */
  cast?: FieldType;
  /** Binary operator (e.g., "+", "-", "||"). */
  operator?: string;
  /** Left operand for operator expression. */
  left?: FieldDefault;
  /** Right operand for operator expression. */
  right?: FieldDefault;
  /** SQL keyword (e.g., "CURRENT_TIMESTAMP", "CURRENT_USER"). */
  sql_keyword?: string;
}

// ─── JSON Schema ──────────────────────────────────────────────────

/**
 * JSON Schema type definition.
 *
 * Inline subset matching the shape used by schema-typescript in dev-utils.
 * We copy it here to avoid an external dependency.
 */
export interface JSONSchema {
  $schema?: string;
  $ref?: string;
  title?: string;
  properties?: { [key: string]: JSONSchema };
  required?: string[];
  type?: string | string[];
  const?: string;
  enum?: (string | number | boolean)[];
  items?: JSONSchema | JSONSchema[];
  $defs?: { [key: string]: JSONSchema };
  definitions?: { [key: string]: JSONSchema };
  additionalProperties?: boolean | JSONSchema;
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  description?: string;
  default?: unknown;
  [key: string]: unknown;
  format?: string;
}

/**
 * A single node type definition in the registry.
 *
 * Each node type describes a reusable building block for blueprints:
 * authorization policies (Authz*), data behaviors (Data*), field
 * constraints (Field*), relations (Relation*), views (View*), or
 * table templates (Table*).
 *
 * All keys use snake_case to match the server-side SQL convention.
 * The parameter_schema uses JSON Schema to describe the node's
 * configuration shape — these keys are also snake_case.
 */
export interface NodeTypeDefinition {
  /** PascalCase name, e.g. 'AuthzDirectOwner' */
  name: string;
  /** snake_case slug, e.g. 'authz_direct_owner' */
  slug: string;
  /** Category: authz | check | data | field | relation | search | view */
  category: string;
  /** Human-readable display name, e.g. 'Direct Ownership' */
  display_name: string;
  /** Description of what this node type does */
  description: string;
  /** JSON Schema defining the parameter shape (all keys are snake_case) */
  parameter_schema: JSONSchema;
  /** Tags for categorization and filtering */
  tags: string[];
}
