/**
 * Generate TypeScript types for blueprint definitions from node type registry.
 *
 * Reads all node type definitions (the TS source of truth) and generates
 * a `blueprint-types.generated.ts` file with:
 *
 *   - Per-node-type parameter interfaces (e.g., DataIdParams, DataEmbeddingParams)
 *   - BlueprintNode — discriminated union of all non-relation node types
 *   - BlueprintRelation — typed relation entries with $type, source_ref, target_ref
 *   - BlueprintTable, BlueprintField, BlueprintPolicy, BlueprintIndex, etc.
 *   - BlueprintDefinition — the top-level type matching the JSONB shape
 *
 * These types are client-side only — they provide autocomplete and type safety
 * when building blueprint JSON. The API itself accepts plain JSONB.
 *
 * Usage:
 *   npx ts-node src/codegen/generate-types.ts [--outdir <dir>]
 *
 *   --outdir <dir>   Directory to write the generated file (default: src/)
 *
 * Example:
 *   npx ts-node src/codegen/generate-types.ts
 *   npx ts-node src/codegen/generate-types.ts --outdir ./src
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { allNodeTypes } from '../index';
import type { NodeTypeDefinition, JSONSchema } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GENERATED_HEADER = `// GENERATED FILE — DO NOT EDIT
//
// Regenerate with:
//   cd graphile/node-type-registry && pnpm generate:types
//
// These types match the JSONB shape expected by construct_blueprint().
// All field names are snake_case to match the SQL convention.
`;

// ---------------------------------------------------------------------------
// JSON Schema → TypeScript type conversion
// ---------------------------------------------------------------------------

/**
 * Convert a JSON Schema property to a TypeScript type string.
 */
function jsonSchemaToTsType(schema: JSONSchema): string {
  if (schema.enum) {
    return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
  }

  const type = schema.type;

  if (type === 'string') {
    return 'string';
  }
  if (type === 'integer' || type === 'number') {
    return 'number';
  }
  if (type === 'boolean') {
    return 'boolean';
  }
  if (type === 'array') {
    if (schema.items && !Array.isArray(schema.items)) {
      return `${jsonSchemaToTsType(schema.items)}[]`;
    }
    return 'unknown[]';
  }
  if (type === 'object') {
    if (schema.properties) {
      const props = Object.entries(schema.properties)
        .map(([key, val]) => {
          const optional = !schema.required?.includes(key);
          const tsType = jsonSchemaToTsType(val as JSONSchema);
          return `    ${key}${optional ? '?' : ''}: ${tsType};`;
        })
        .join('\n');
      return `{\n${props}\n  }`;
    }
    return 'Record<string, unknown>';
  }

  // Fallback for union types or unrecognized
  if (Array.isArray(type)) {
    return type.map((t) => jsonSchemaToTsType({ type: t })).join(' | ');
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Generate per-node-type parameter interfaces
// ---------------------------------------------------------------------------

function generateParamsInterface(nt: NodeTypeDefinition): string {
  const lines: string[] = [];
  const schema = nt.parameter_schema;

  lines.push(`/** ${nt.description} */`);
  lines.push(`export interface ${nt.name}Params {`);

  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as JSONSchema;
      const isRequired = schema.required?.includes(key) ?? false;
      const tsType = jsonSchemaToTsType(prop);
      if (prop.description) {
        lines.push(`  /** ${prop.description} */`);
      }
      lines.push(`  ${key}${isRequired ? '' : '?'}: ${tsType};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Generate the main blueprint types
// ---------------------------------------------------------------------------

function generateBlueprintTypes(nodeTypes: NodeTypeDefinition[]): string {
  const dataNodes = nodeTypes.filter(
    (nt) => nt.category !== 'relation' && nt.category !== 'view'
  );
  const relationNodes = nodeTypes.filter((nt) => nt.category === 'relation');
  const authzNodes = nodeTypes.filter((nt) => nt.category === 'authz');

  const lines: string[] = [];

  // -- Static structural types --

  lines.push(`
// ===========================================================================
// Static structural types
// ===========================================================================

/** A custom field (column) to add to a blueprint table. */
export interface BlueprintField {
  /** The column name. */
  name: string;
  /** The PostgreSQL type (e.g., "text", "integer", "boolean", "uuid"). */
  type: string;
  /** Whether the column has a NOT NULL constraint. */
  is_not_null?: boolean;
  /** SQL default value expression (e.g., "true", "now()"). */
  default_value?: string;
  /** Comment/description for this field. */
  description?: string;
}

/** An RLS policy entry for a blueprint table. */
export interface BlueprintPolicy {
  /** Authz* policy type name (e.g., "AuthzDirectOwner", "AuthzAllowAll"). */
  $type: ${authzNodes.length > 0 ? authzNodes.map((nt) => `'${nt.name}'`).join(' | ') : 'string'};
  /** Role for this policy. Defaults to "authenticated". */
  policy_role?: string;
  /** Whether this policy is permissive (true) or restrictive (false). */
  permissive?: boolean;
  /** Optional custom name for this policy. */
  policy_name?: string;
  /** Privileges this policy applies to. */
  privileges?: string[];
  /** Policy-specific data (structure varies by policy type). */
  data?: Record<string, unknown>;
}

/** A source field contributing to a full-text search tsvector column. */
export interface BlueprintFtsSource {
  /** Column name of the source field. */
  field: string;
  /** TSVector weight: "A", "B", "C", or "D". */
  weight: string;
  /** Language for text search. Defaults to "english". */
  lang?: string;
}

/** A full-text search configuration for a blueprint table. */
export interface BlueprintFullTextSearch {
  /** Reference key of the table this full-text search belongs to. */
  table_ref: string;
  /** Name of the tsvector field on the table. */
  field: string;
  /** Source fields that feed into this tsvector. */
  sources: BlueprintFtsSource[];
}

/** An index definition within a blueprint. */
export interface BlueprintIndex {
  /** Reference key of the table this index belongs to. */
  table_ref: string;
  /** Single column name for the index. Mutually exclusive with "columns". */
  column?: string;
  /** Array of column names for a multi-column index. Mutually exclusive with "column". */
  columns?: string[];
  /** Index access method (e.g., "BTREE", "GIN", "GIST", "HNSW", "BM25"). */
  access_method: string;
  /** Whether this is a unique index. */
  is_unique?: boolean;
  /** Optional custom name for the index. */
  name?: string;
  /** Operator classes for the index columns. */
  op_classes?: string[];
  /** Additional index-specific options. */
  options?: Record<string, unknown>;
}`);

  // -- Node types (discriminated union) --

  lines.push(`
// ===========================================================================
// Node types — discriminated union for nodes[] entries
// ===========================================================================
`);

  // Generate BlueprintNode type
  // Nodes can be string shorthand or { $type: "...", data: {...} } objects
  const nodeUnionMembers: string[] = [];

  for (const nt of dataNodes) {
    const hasParams =
      nt.parameter_schema.properties &&
      Object.keys(nt.parameter_schema.properties).length > 0;
    if (hasParams) {
      nodeUnionMembers.push(
        `  | { $type: '${nt.name}'; data: ${nt.name}Params }`
      );
    } else {
      nodeUnionMembers.push(
        `  | { $type: '${nt.name}'; data?: Record<string, never> }`
      );
    }
  }

  // String shorthand for nodes with no required params
  const shorthandNames = dataNodes.map((nt) => `'${nt.name}'`).join('\n  | ');

  lines.push(`/** String shorthand — just the node type name. */`);
  lines.push(`export type BlueprintNodeShorthand =\n  | ${shorthandNames};`);
  lines.push('');
  lines.push(`/** Object form — { $type, data } with typed parameters. */`);
  lines.push(`export type BlueprintNodeObject =`);
  lines.push(nodeUnionMembers.join('\n') + ';');
  lines.push('');
  lines.push(
    `/** A node entry in a blueprint table. Either a string shorthand or a typed object. */`
  );
  lines.push(
    `export type BlueprintNode = BlueprintNodeShorthand | BlueprintNodeObject;`
  );

  // -- Relation types --

  lines.push(`
// ===========================================================================
// Relation types
// ===========================================================================
`);

  const relationUnionMembers: string[] = [];
  for (const nt of relationNodes) {
    relationUnionMembers.push(
      `  | ({\n      $type: '${nt.name}';\n      source_ref: string;\n      target_ref: string;\n    } & Partial<${nt.name}Params>)`
    );
  }

  lines.push(`/** A relation entry in a blueprint definition. */`);
  lines.push(`export type BlueprintRelation =`);
  lines.push(relationUnionMembers.join('\n') + ';');

  // -- Table and Definition --

  lines.push(`
// ===========================================================================
// Blueprint table and definition
// ===========================================================================

/** A table definition within a blueprint. */
export interface BlueprintTable {
  /** Local reference key for this table (used by relations, indexes, fts). */
  ref: string;
  /** The PostgreSQL table name to create. */
  table_name: string;
  /** Array of node type entries that define the table's behavior. */
  nodes: BlueprintNode[];
  /** Custom fields (columns) to add to the table. */
  fields?: BlueprintField[];
  /** RLS policies for this table. */
  policies?: BlueprintPolicy[];
  /** Database roles to grant privileges to. Defaults to ["authenticated"]. */
  grant_roles?: string[];
  /** Privilege grants as [verb, column] tuples or objects. */
  grants?: unknown[];
  /** Whether to enable RLS on this table. Defaults to true. */
  use_rls?: boolean;
}

/** The complete blueprint definition — the JSONB shape accepted by construct_blueprint(). */
export interface BlueprintDefinition {
  /** Tables to create. */
  tables: BlueprintTable[];
  /** Relations between tables. */
  relations?: BlueprintRelation[];
  /** Indexes on table columns. */
  indexes?: BlueprintIndex[];
  /** Full-text search configurations. */
  full_text_searches?: BlueprintFullTextSearch[];
}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

function generate(): string {
  const sections: string[] = [GENERATED_HEADER];

  // Group node types by category for organized output
  const categories = new Map<string, NodeTypeDefinition[]>();
  for (const nt of allNodeTypes) {
    const list = categories.get(nt.category) ?? [];
    list.push(nt);
    categories.set(nt.category, list);
  }

  // Generate parameter interfaces grouped by category
  const categoryOrder = ['data', 'authz', 'relation', 'view'];
  for (const cat of categoryOrder) {
    const nts = categories.get(cat);
    if (!nts || nts.length === 0) continue;

    sections.push(
      `\n// ===========================================================================`
    );
    sections.push(`// ${cat.charAt(0).toUpperCase() + cat.slice(1)} node type parameters`);
    sections.push(
      `// ===========================================================================\n`
    );

    for (const nt of nts) {
      sections.push(generateParamsInterface(nt));
      sections.push('');
    }
  }

  // Generate the main blueprint types
  sections.push(generateBlueprintTypes(allNodeTypes));

  return sections.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const outdirIdx = args.indexOf('--outdir');
  const outdir = outdirIdx !== -1 ? args[outdirIdx + 1] : join(__dirname, '..');

  const content = generate();
  const filename = 'blueprint-types.generated.ts';
  const filepath = join(outdir, filename);

  if (!existsSync(outdir)) mkdirSync(outdir, { recursive: true });
  writeFileSync(filepath, content);

  console.log(`Generated ${filepath} (${allNodeTypes.length} node types)`);
}

main();
