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
  /** Category: authz | data | field | relation | view */
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
