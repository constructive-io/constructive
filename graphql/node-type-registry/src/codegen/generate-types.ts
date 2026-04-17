/**
 * Generate TypeScript types for blueprint definitions from node type registry.
 *
 * Uses @babel/types AST nodes + schema-typescript for JSON Schema -> TS
 * conversion.  Produces a `blueprint-types.generated.ts` file with:
 *
 *   - Per-node-type parameter interfaces (via schema-typescript)
 *   - BlueprintNode  -- discriminated union of all non-relation node types
 *   - BlueprintRelation -- typed relation entries with $type, source_table, target_table
 *   - BlueprintTable, BlueprintField, BlueprintPolicy, BlueprintIndex, etc.
 *   - BlueprintDefinition -- the top-level type matching the JSONB shape
 *
 * These types are client-side only -- they provide autocomplete and type safety
 * when building blueprint JSON.  The API itself accepts plain JSONB.
 *
 * Usage:
 *   npx ts-node src/codegen/generate-types.ts [--outdir <dir>] [--meta <path>]
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generate = require('@babel/generator').default ?? require('@babel/generator');
import * as t from '@babel/types';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateTypeScriptTypes } from 'schema-typescript';
import type { JSONSchema as SchemaTS_JSONSchema } from 'schema-typescript';

import { allNodeTypes } from '../index';
import type { NodeTypeDefinition } from '../types';

// ---------------------------------------------------------------------------
// _meta types (matches TableMeta / FieldMeta from MetaSchemaPlugin)
// ---------------------------------------------------------------------------

interface MetaFieldInfo {
  name: string;
  type: { pgType: string; gqlType: string; isArray: boolean };
  isNotNull: boolean;
  hasDefault: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description: string | null;
}

interface MetaTableInfo {
  name: string;
  schemaName: string;
  fields: MetaFieldInfo[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Attach a JSDoc-style leading comment to an AST node. */
function addJSDoc<T extends t.Node>(node: T, description: string): T {
  node.leadingComments = [
    { type: 'CommentBlock', value: `* ${description} ` } as t.CommentBlock,
  ];
  return node;
}

/** Create an optional TSPropertySignature. */
function optionalProp(
  name: string,
  typeAnnotation: t.TSType
): t.TSPropertySignature {
  const prop = t.tsPropertySignature(
    t.identifier(name),
    t.tsTypeAnnotation(typeAnnotation)
  );
  prop.optional = true;
  return prop;
}

/** Create a required TSPropertySignature. */
function requiredProp(
  name: string,
  typeAnnotation: t.TSType
): t.TSPropertySignature {
  return t.tsPropertySignature(
    t.identifier(name),
    t.tsTypeAnnotation(typeAnnotation)
  );
}

/** Create an exported interface declaration. */
function exportInterface(
  name: string,
  members: t.TSTypeElement[]
): t.ExportNamedDeclaration {
  return t.exportNamedDeclaration(
    t.tsInterfaceDeclaration(
      t.identifier(name),
      null,
      [],
      t.tsInterfaceBody(members)
    )
  );
}

/** Create an exported type alias. */
function exportTypeAlias(
  name: string,
  type: t.TSType
): t.ExportNamedDeclaration {
  return t.exportNamedDeclaration(
    t.tsTypeAliasDeclaration(t.identifier(name), null, type)
  );
}

/** Create a string literal type. */
function strLit(value: string): t.TSLiteralType {
  return t.tsLiteralType(t.stringLiteral(value));
}

/** Create a union of string literals. */
function strUnion(values: string[]): t.TSType {
  if (values.length === 1) return strLit(values[0]);
  return t.tsUnionType(values.map(strLit));
}

/** Create Record<K, V> type reference. */
function recordType(keyType: t.TSType, valueType: t.TSType): t.TSTypeReference {
  return t.tsTypeReference(
    t.identifier('Record'),
    t.tsTypeParameterInstantiation([keyType, valueType])
  );
}

/** Create Partial<T> type reference. */
function partialOf(inner: t.TSType): t.TSTypeReference {
  return t.tsTypeReference(
    t.identifier('Partial'),
    t.tsTypeParameterInstantiation([inner])
  );
}

// ---------------------------------------------------------------------------
// Schema sanitizer — ensures array types have an items spec (schema-typescript
// throws without one).  Numeric/boolean enum handling is fixed upstream as of
// schema-typescript@0.14.2.
// ---------------------------------------------------------------------------

function ensureArrayItems(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...schema };

  // Ensure arrays have an items spec (schema-typescript throws without one)
  if (out.type === 'array' && !out.items) {
    out.items = { type: 'string' };
  }

  // Recurse into properties
  if (out.properties && typeof out.properties === 'object') {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(out.properties as Record<string, unknown>)) {
      props[k] = v && typeof v === 'object' ? ensureArrayItems(v as Record<string, unknown>) : v;
    }
    out.properties = props;
  }

  // Recurse into items
  if (out.items && typeof out.items === 'object') {
    out.items = ensureArrayItems(out.items as Record<string, unknown>);
  }

  // Recurse into composition keywords
  for (const keyword of ['oneOf', 'anyOf', 'allOf'] as const) {
    if (Array.isArray(out[keyword])) {
      out[keyword] = (out[keyword] as unknown[]).map((s) =>
        s && typeof s === 'object' ? ensureArrayItems(s as Record<string, unknown>) : s
      );
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Generate per-node-type parameter interfaces via schema-typescript
// ---------------------------------------------------------------------------

function generateParamsInterfaces(
  nodeTypes: NodeTypeDefinition[]
): t.ExportNamedDeclaration[] {
  const results: t.ExportNamedDeclaration[] = [];

  for (const nt of nodeTypes) {
    const schema = nt.parameter_schema;
    const typeName = `${nt.name}Params`;

    const sanitized = ensureArrayItems({ ...schema, title: typeName });
    const astNodes = generateTypeScriptTypes(sanitized as SchemaTS_JSONSchema, {
      includePropertyComments: true,
      includeTypeComments: false,
      strictTypeSafety: true,
    });

    if (astNodes.length > 0) {
      // The last node is the main interface for the title
      const mainNode = astNodes[astNodes.length - 1];
      addJSDoc(mainNode, nt.description);

      for (const node of astNodes) {
        results.push(node);
      }
    } else {
      // Fallback: empty interface for node types with no properties
      results.push(addJSDoc(exportInterface(typeName, []), nt.description));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Introspection-driven structural type derivation
// ---------------------------------------------------------------------------

/** Map PostgreSQL type names to TypeScript type annotations. */
function pgTypeToTSType(pgType: string, isArray: boolean): t.TSType {
  let base: t.TSType;
  switch (pgType) {
    case 'bool':
    case 'boolean':
      base = t.tsBooleanKeyword();
      break;
    case 'int2':
    case 'int4':
    case 'int8':
    case 'integer':
    case 'smallint':
    case 'bigint':
    case 'float4':
    case 'float8':
    case 'float':
    case 'double precision':
    case 'numeric':
    case 'real':
      base = t.tsNumberKeyword();
      break;
    case 'jsonb':
    case 'json':
      base = recordType(t.tsStringKeyword(), t.tsUnknownKeyword());
      break;
    default:
      base = t.tsStringKeyword();
      break;
  }
  return isArray ? t.tsArrayType(base) : base;
}

/**
 * Derive a TS interface from an introspection table's columns.
 *
 * Fully procedural — uses field metadata to determine:
 *   - Which columns to skip (isPrimaryKey || isForeignKey)
 *   - Required vs optional (isNotNull && !hasDefault)
 *   - JSDoc from PG column comments (description)
 *
 * Special-case overrides (e.g. typed discriminants) can be passed via
 * `typeOverrides` for columns that need a non-default TS type.
 */
function deriveInterfaceFromTable(
  table: MetaTableInfo,
  interfaceName: string,
  description: string,
  typeOverrides?: Record<string, t.TSType>
): t.ExportNamedDeclaration {
  const members: t.TSTypeElement[] = [];

  for (const field of table.fields) {
    // Skip PK and FK columns — these are internal to the DB schema
    if (field.isPrimaryKey || field.isForeignKey) continue;

    const tsType = typeOverrides?.[field.name] ?? pgTypeToTSType(field.type.pgType, field.type.isArray);
    const doc = field.description ?? `${table.schemaName}.${table.name}.${field.name} (${field.type.pgType})`;
    const isRequired = field.isNotNull && !field.hasDefault;

    const prop = isRequired
      ? requiredProp(field.name, tsType)
      : optionalProp(field.name, tsType);
    members.push(addJSDoc(prop, doc));
  }

  return addJSDoc(exportInterface(interfaceName, members), description);
}

// ---------------------------------------------------------------------------
// Structural types — introspection-driven or static fallback
// ---------------------------------------------------------------------------

function findTable(
  tables: MetaTableInfo[],
  schemaName: string,
  tableName: string
): MetaTableInfo | undefined {
  return tables.find((tbl) => tbl.schemaName === schemaName && tbl.name === tableName);
}

function buildBlueprintField(
  meta?: MetaTableInfo[]
): t.ExportNamedDeclaration {
  const table = meta && findTable(meta, 'metaschema_public', 'field');
  if (table) {
    return deriveInterfaceFromTable(
      table,
      'BlueprintField',
      'A custom field (column) to add to a blueprint table. Derived from _meta.',
    );
  }
  // Static fallback
  return addJSDoc(
    exportInterface('BlueprintField', [
      addJSDoc(requiredProp('name', t.tsStringKeyword()), 'The column name.'),
      addJSDoc(requiredProp('type', t.tsStringKeyword()), 'The PostgreSQL type (e.g., "text", "integer", "boolean", "uuid").'),
      addJSDoc(optionalProp('is_required', t.tsBooleanKeyword()), 'Whether the column has a NOT NULL constraint.'),
      addJSDoc(optionalProp('default_value', t.tsStringKeyword()), 'SQL default value expression (e.g., "true", "now()").'),
      addJSDoc(optionalProp('description', t.tsStringKeyword()), 'Comment/description for this field.'),
    ]),
    'A custom field (column) to add to a blueprint table.'
  );
}

function buildBlueprintPolicy(
  authzNodes: NodeTypeDefinition[],
  _meta?: MetaTableInfo[]
): t.ExportNamedDeclaration {
  // BlueprintPolicy represents the blueprint JSON shape (not the DB table).
  // The SQL procedure reads $type (not policy_type) from the JSONB:
  //   v_policy_type := v_policy_entry->>'$type';
  // So we always use the static definition with $type.
  const policyTypeAnnotation =
    authzNodes.length > 0
      ? strUnion(authzNodes.map((nt) => nt.name))
      : t.tsStringKeyword();

  return addJSDoc(
    exportInterface('BlueprintPolicy', [
      addJSDoc(requiredProp('$type', policyTypeAnnotation), 'Authz* policy type name (e.g., "AuthzDirectOwner", "AuthzAllowAll").'),
      addJSDoc(optionalProp('privileges', t.tsArrayType(t.tsStringKeyword())), 'Privileges this policy applies to (e.g., ["select"], ["insert", "update", "delete"]).'),
      addJSDoc(optionalProp('permissive', t.tsBooleanKeyword()), 'Whether this policy is permissive (true) or restrictive (false). Defaults to true.'),
      addJSDoc(optionalProp('policy_role', t.tsStringKeyword()), 'Role for this policy. Defaults to "authenticated".'),
      addJSDoc(optionalProp('policy_name', t.tsStringKeyword()), 'Optional custom name for this policy.'),
      addJSDoc(optionalProp('data', recordType(t.tsStringKeyword(), t.tsUnknownKeyword())), 'Policy-specific data (structure varies by policy type).'),
    ]),
    'An RLS policy entry for a blueprint table. Uses $type to match the blueprint JSON convention.'
  );
}

function buildBlueprintFtsSource(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintFtsSource', [
      addJSDoc(
        requiredProp('field', t.tsStringKeyword()),
        'Column name of the source field.'
      ),
      addJSDoc(
        requiredProp('weight', t.tsStringKeyword()),
        'TSVector weight: "A", "B", "C", or "D".'
      ),
      addJSDoc(
        optionalProp('lang', t.tsStringKeyword()),
        'Language for text search. Defaults to "english".'
      ),
    ]),
    'A source field contributing to a full-text search tsvector column.'
  );
}

function buildBlueprintFullTextSearch(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintFullTextSearch', [
      addJSDoc(
        requiredProp('table_name', t.tsStringKeyword()),
        'Table name this full-text search belongs to.'
      ),
      addJSDoc(
        optionalProp('schema_name', t.tsStringKeyword()),
        'Optional schema name for disambiguation (falls back to top-level default).'
      ),
      addJSDoc(
        requiredProp('field', t.tsStringKeyword()),
        'Name of the tsvector field on the table.'
      ),
      addJSDoc(
        requiredProp(
          'sources',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintFtsSource')))
        ),
        'Source fields that feed into this tsvector.'
      ),
    ]),
    'A full-text search configuration for a blueprint table (top-level, requires table_name).'
  );
}

function buildBlueprintTableFullTextSearch(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintTableFullTextSearch', [
      addJSDoc(
        requiredProp('field', t.tsStringKeyword()),
        'Name of the tsvector field on the table.'
      ),
      addJSDoc(
        requiredProp(
          'sources',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintFtsSource')))
        ),
        'Source fields that feed into this tsvector.'
      ),
      addJSDoc(
        optionalProp('schema_name', t.tsStringKeyword()),
        'Optional schema name override.'
      ),
    ]),
    'A full-text search configuration nested inside a table definition (table_name not required).'
  );
}

function buildBlueprintIndex(
  meta?: MetaTableInfo[]
): t.ExportNamedDeclaration {
  const table = meta && findTable(meta, 'metaschema_public', 'index');
  if (table) {
    return deriveInterfaceFromTable(
      table,
      'BlueprintIndex',
      'An index definition within a blueprint. Derived from _meta.',
      {
        // JSONB columns get Record<string, unknown> instead of the default
        index_params: recordType(t.tsStringKeyword(), t.tsUnknownKeyword()),
        where_clause: recordType(t.tsStringKeyword(), t.tsUnknownKeyword()),
        options: recordType(t.tsStringKeyword(), t.tsUnknownKeyword()),
      },
    );
  }
  // Static fallback
  return addJSDoc(
    exportInterface('BlueprintIndex', [
      addJSDoc(requiredProp('table_name', t.tsStringKeyword()), 'Table name this index belongs to.'),
      addJSDoc(optionalProp('schema_name', t.tsStringKeyword()), 'Optional schema name for disambiguation (falls back to top-level default).'),
      addJSDoc(optionalProp('column', t.tsStringKeyword()), 'Single column name for the index.'),
      addJSDoc(optionalProp('columns', t.tsArrayType(t.tsStringKeyword())), 'Array of column names for a multi-column index.'),
      addJSDoc(requiredProp('access_method', t.tsStringKeyword()), 'Index access method (e.g., "BTREE", "GIN", "GIST", "HNSW", "BM25").'),
      addJSDoc(optionalProp('is_unique', t.tsBooleanKeyword()), 'Whether this is a unique index.'),
      addJSDoc(optionalProp('name', t.tsStringKeyword()), 'Optional custom name for the index.'),
      addJSDoc(optionalProp('op_classes', t.tsArrayType(t.tsStringKeyword())), 'Operator classes for the index columns.'),
      addJSDoc(optionalProp('options', recordType(t.tsStringKeyword(), t.tsUnknownKeyword())), 'Additional index-specific options.'),
    ]),
    'An index definition within a blueprint (top-level, requires table_name).'
  );
}

function buildBlueprintTableIndex(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintTableIndex', [
      addJSDoc(optionalProp('column', t.tsStringKeyword()), 'Single column name for the index.'),
      addJSDoc(optionalProp('columns', t.tsArrayType(t.tsStringKeyword())), 'Array of column names for a multi-column index.'),
      addJSDoc(requiredProp('access_method', t.tsStringKeyword()), 'Index access method (e.g., "BTREE", "GIN", "GIST", "HNSW", "BM25").'),
      addJSDoc(optionalProp('is_unique', t.tsBooleanKeyword()), 'Whether this is a unique index.'),
      addJSDoc(optionalProp('name', t.tsStringKeyword()), 'Optional custom name for the index.'),
      addJSDoc(optionalProp('op_classes', t.tsArrayType(t.tsStringKeyword())), 'Operator classes for the index columns.'),
      addJSDoc(optionalProp('options', recordType(t.tsStringKeyword(), t.tsUnknownKeyword())), 'Additional index-specific options.'),
      addJSDoc(optionalProp('schema_name', t.tsStringKeyword()), 'Optional schema name override.'),
    ]),
    'An index definition nested inside a table definition (table_name not required).'
  );
}

// ---------------------------------------------------------------------------
// Node type discriminated unions
// ---------------------------------------------------------------------------

function buildNodeTypes(
  dataNodes: NodeTypeDefinition[]
): t.ExportNamedDeclaration[] {
  const results: t.ExportNamedDeclaration[] = [];

  // BlueprintNodeShorthand -- union of string literals
  results.push(
    addJSDoc(
      exportTypeAlias(
        'BlueprintNodeShorthand',
        strUnion(dataNodes.map((nt) => nt.name))
      ),
      'String shorthand -- just the node type name.'
    )
  );

  // BlueprintNodeObject -- discriminated union of { $type, data } objects
  const objectMembers: t.TSType[] = dataNodes.map((nt) => {
    const hasParams =
      nt.parameter_schema.properties &&
      Object.keys(nt.parameter_schema.properties).length > 0;

    const dataType = hasParams
      ? t.tsTypeReference(t.identifier(`${nt.name}Params`))
      : recordType(t.tsStringKeyword(), t.tsNeverKeyword());

    const dataProp = hasParams
      ? requiredProp('data', dataType)
      : optionalProp('data', dataType);

    return t.tsTypeLiteral([requiredProp('$type', strLit(nt.name)), dataProp]);
  });

  results.push(
    addJSDoc(
      exportTypeAlias('BlueprintNodeObject', t.tsUnionType(objectMembers)),
      'Object form -- { $type, data } with typed parameters.'
    )
  );

  // BlueprintNode -- shorthand | object
  results.push(
    addJSDoc(
      exportTypeAlias(
        'BlueprintNode',
        t.tsUnionType([
          t.tsTypeReference(t.identifier('BlueprintNodeShorthand')),
          t.tsTypeReference(t.identifier('BlueprintNodeObject')),
        ])
      ),
      'A node entry in a blueprint table. Either a string shorthand or a typed object.'
    )
  );

  return results;
}

// ---------------------------------------------------------------------------
// Relation types
// ---------------------------------------------------------------------------

function buildRelationTypes(
  relationNodes: NodeTypeDefinition[]
): t.ExportNamedDeclaration[] {
  const relationMembers: t.TSType[] = relationNodes.map((nt) => {
    const baseType = t.tsTypeLiteral([
      requiredProp('$type', strLit(nt.name)),
      requiredProp('source_table', t.tsStringKeyword()),
      requiredProp('target_table', t.tsStringKeyword()),
      optionalProp('source_schema_name', t.tsStringKeyword()),
      optionalProp('target_schema_name', t.tsStringKeyword()),
    ]);

    return t.tsIntersectionType([
      baseType,
      partialOf(t.tsTypeReference(t.identifier(`${nt.name}Params`))),
    ]);
  });

  return [
    addJSDoc(
      exportTypeAlias('BlueprintRelation', t.tsUnionType(relationMembers)),
      'A relation entry in a blueprint definition.'
    ),
  ];
}

// ---------------------------------------------------------------------------
// BlueprintTable and BlueprintDefinition
// ---------------------------------------------------------------------------

function buildBlueprintUniqueConstraint(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintUniqueConstraint', [
      addJSDoc(
        requiredProp('table_name', t.tsStringKeyword()),
        'Table name this unique constraint belongs to.'
      ),
      addJSDoc(
        optionalProp('schema_name', t.tsStringKeyword()),
        'Optional schema name for disambiguation (falls back to top-level default).'
      ),
      addJSDoc(
        requiredProp('columns', t.tsArrayType(t.tsStringKeyword())),
        'Column names that form the unique constraint.'
      ),
    ]),
    'A unique constraint definition within a blueprint (top-level, requires table_name).'
  );
}

function buildBlueprintTableUniqueConstraint(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintTableUniqueConstraint', [
      addJSDoc(
        requiredProp('columns', t.tsArrayType(t.tsStringKeyword())),
        'Column names that form the unique constraint.'
      ),
      addJSDoc(
        optionalProp('schema_name', t.tsStringKeyword()),
        'Optional schema name override.'
      ),
    ]),
    'A unique constraint nested inside a table definition (table_name not required).'
  );
}

function buildBlueprintEntityTableProvision(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintEntityTableProvision', [
      addJSDoc(
        optionalProp('use_rls', t.tsBooleanKeyword()),
        'Whether to enable RLS on the entity table. Forwarded to secure_table_provision. Defaults to true.'
      ),
      addJSDoc(
        optionalProp(
          'nodes',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintNode')))
        ),
        'Node objects applied to the entity table for field creation (e.g., DataTimestamps, DataPeoplestamps). Forwarded to secure_table_provision as-is.'
      ),
      addJSDoc(
        optionalProp(
          'fields',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintField')))
        ),
        'Custom fields (columns) to add to the entity table. Forwarded to secure_table_provision as-is.'
      ),
      addJSDoc(
        optionalProp('grant_privileges', t.tsArrayType(t.tsUnknownKeyword())),
        'Privilege grants for the entity table as [verb, columns] tuples (e.g. [["select","*"],["insert","*"]]). Forwarded to secure_table_provision as-is.'
      ),
      addJSDoc(
        optionalProp('grant_roles', t.tsArrayType(t.tsStringKeyword())),
        'Database roles to grant privileges to. Forwarded to secure_table_provision as-is. Defaults to ["authenticated"].'
      ),
      addJSDoc(
        optionalProp(
          'policies',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintPolicy')))
        ),
        'RLS policies for the entity table. When present, these policies fully replace the five default entity-table policies (is_visible becomes a no-op).'
      ),
    ]),
    'Override object for the entity table created by a BlueprintMembershipType. Shape mirrors BlueprintTable / secure_table_provision vocabulary. When supplied, policies[] replaces the default entity-table policies entirely.'
  );
}

function buildBlueprintMembershipType(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintMembershipType', [
      addJSDoc(
        requiredProp('name', t.tsStringKeyword()),
        'Entity type name (e.g., "data_room", "channel", "department"). Must be unique per database.'
      ),
      addJSDoc(
        requiredProp('prefix', t.tsStringKeyword()),
        'Short prefix for generated objects (e.g., "dr", "ch", "dept"). Used in table/trigger naming.'
      ),
      addJSDoc(
        optionalProp('description', t.tsStringKeyword()),
        'Human-readable description of this entity type.'
      ),
      addJSDoc(
        optionalProp('parent_entity', t.tsStringKeyword()),
        'Parent entity type name. Defaults to "org".'
      ),
      addJSDoc(
        optionalProp('table_name', t.tsStringKeyword()),
        'Custom table name for the entity table. Defaults to name-derived convention.'
      ),
      addJSDoc(
        optionalProp('is_visible', t.tsBooleanKeyword()),
        'Whether parent-entity members can see child entities via the default parent_member SELECT policy. Gates one of the five default policies. No-op when table_provision is supplied. Defaults to true.'
      ),
      addJSDoc(
        optionalProp('has_limits', t.tsBooleanKeyword()),
        'Whether to provision a limits module for this entity type. Defaults to false.'
      ),
      addJSDoc(
        optionalProp('has_profiles', t.tsBooleanKeyword()),
        'Whether to provision a profiles module for this entity type. Defaults to false.'
      ),
      addJSDoc(
        optionalProp('has_levels', t.tsBooleanKeyword()),
        'Whether to provision a levels module for this entity type. Defaults to false.'
      ),
      addJSDoc(
        optionalProp('skip_entity_policies', t.tsBooleanKeyword()),
        'Escape hatch: when true AND table_provision is NULL, zero policies are provisioned on the entity table. Defaults to false.'
      ),
      addJSDoc(
        optionalProp(
          'table_provision',
          t.tsTypeReference(t.identifier('BlueprintEntityTableProvision'))
        ),
        'Override for the entity table. Shape mirrors BlueprintTable / secure_table_provision vocabulary. When supplied, its policies[] replaces the five default entity-table policies; is_visible becomes a no-op. When NULL (default), the five default policies are applied (gated by is_visible).'
      ),
    ]),
    'A membership type entry for Phase 0 of construct_blueprint(). Provisions a full entity type with its own entity table, membership modules, and security policies via entity_type_provision.'
  );
}

function buildBlueprintTable(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintTable', [
      addJSDoc(
        requiredProp('table_name', t.tsStringKeyword()),
        'The PostgreSQL table name to create.'
      ),
      addJSDoc(
        optionalProp('schema_name', t.tsStringKeyword()),
        'Optional schema name (falls back to top-level default).'
      ),
      addJSDoc(
        requiredProp(
          'nodes',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintNode')))
        ),
        "Array of node type entries that define the table's behavior."
      ),
      addJSDoc(
        optionalProp(
          'fields',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintField')))
        ),
        'Custom fields (columns) to add to the table.'
      ),
      addJSDoc(
        optionalProp(
          'policies',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintPolicy')))
        ),
        'RLS policies for this table.'
      ),
      addJSDoc(
        optionalProp('grant_roles', t.tsArrayType(t.tsStringKeyword())),
        'Database roles to grant privileges to. Defaults to ["authenticated"].'
      ),
      addJSDoc(
        optionalProp('grants', t.tsArrayType(t.tsUnknownKeyword())),
        'Privilege grants as [verb, column] tuples or objects. Defaults to empty (no grants — callers must explicitly specify).'
      ),
      addJSDoc(
        optionalProp('use_rls', t.tsBooleanKeyword()),
        'Whether to enable RLS on this table. Defaults to true.'
      ),
      addJSDoc(
        optionalProp(
          'indexes',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintTableIndex')))
        ),
        'Table-level indexes (table_name inherited from parent).'
      ),
      addJSDoc(
        optionalProp(
          'full_text_searches',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintTableFullTextSearch')))
        ),
        'Table-level full-text search configurations (table_name inherited from parent).'
      ),
      addJSDoc(
        optionalProp(
          'unique_constraints',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintTableUniqueConstraint')))
        ),
        'Table-level unique constraints (table_name inherited from parent).'
      ),
    ]),
    'A table definition within a blueprint.'
  );
}

function buildBlueprintDefinition(): t.ExportNamedDeclaration {
  return addJSDoc(
    exportInterface('BlueprintDefinition', [
      addJSDoc(
        requiredProp(
          'tables',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintTable')))
        ),
        'Tables to create.'
      ),
      addJSDoc(
        optionalProp(
          'relations',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintRelation')))
        ),
        'Relations between tables.'
      ),
      addJSDoc(
        optionalProp(
          'indexes',
          t.tsArrayType(t.tsTypeReference(t.identifier('BlueprintIndex')))
        ),
        'Indexes on table columns.'
      ),
      addJSDoc(
        optionalProp(
          'full_text_searches',
          t.tsArrayType(
            t.tsTypeReference(t.identifier('BlueprintFullTextSearch'))
          )
        ),
        'Full-text search configurations.'
      ),
      addJSDoc(
        optionalProp(
          'unique_constraints',
          t.tsArrayType(
            t.tsTypeReference(t.identifier('BlueprintUniqueConstraint'))
          )
        ),
        'Unique constraints on table columns.'
      ),
      addJSDoc(
        optionalProp(
          'membership_types',
          t.tsArrayType(
            t.tsTypeReference(t.identifier('BlueprintMembershipType'))
          )
        ),
        'Entity types to provision in Phase 0 (before tables). Each entry creates an entity table with membership modules and security.'
      ),
    ]),
    'The complete blueprint definition -- the JSONB shape accepted by construct_blueprint().'
  );
}

// ---------------------------------------------------------------------------
// Section comment helper
// ---------------------------------------------------------------------------

function sectionComment(title: string): t.Statement {
  const empty = t.emptyStatement();
  empty.leadingComments = [
    {
      type: 'CommentBlock',
      value: `*\n * ===========================================================================\n * ${title}\n * ===========================================================================\n `,
    } as t.CommentBlock,
  ];
  return empty;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

function buildProgram(meta?: MetaTableInfo[]): string {
  const statements: t.Statement[] = [];

  // Group node types by category
  const categories = new Map<string, NodeTypeDefinition[]>();
  for (const nt of allNodeTypes) {
    const list = categories.get(nt.category) ?? [];
    list.push(nt);
    categories.set(nt.category, list);
  }

  const dataNodes = allNodeTypes.filter(
    (nt) => nt.category !== 'relation' && nt.category !== 'view'
  );
  const relationNodes = allNodeTypes.filter(
    (nt) => nt.category === 'relation'
  );
  const authzNodes = allNodeTypes.filter((nt) => nt.category === 'authz');

  // -- Parameter interfaces grouped by category --
  const categoryOrder = ['data', 'search', 'authz', 'relation', 'view'];
  for (const cat of categoryOrder) {
    const nts = categories.get(cat);
    if (!nts || nts.length === 0) continue;

    statements.push(
      sectionComment(
        `${cat.charAt(0).toUpperCase() + cat.slice(1)} node type parameters`
      )
    );
    statements.push(...generateParamsInterfaces(nts));
  }

  // -- Structural types (_meta-driven when available, static fallback otherwise) --
  const metaSource = meta
    ? 'Derived from _meta'
    : 'Static fallback (no _meta provided)';
  statements.push(sectionComment(`Structural types — ${metaSource}`));
  statements.push(buildBlueprintField(meta));
  statements.push(buildBlueprintPolicy(authzNodes, meta));
  statements.push(buildBlueprintFtsSource());
  statements.push(buildBlueprintFullTextSearch());
  statements.push(buildBlueprintTableFullTextSearch());
  statements.push(buildBlueprintIndex(meta));
  statements.push(buildBlueprintTableIndex());
  statements.push(buildBlueprintUniqueConstraint());
  statements.push(buildBlueprintTableUniqueConstraint());
  statements.push(buildBlueprintEntityTableProvision());
  statements.push(buildBlueprintMembershipType());

  // -- Node types discriminated union --
  statements.push(
    sectionComment(
      'Node types -- discriminated union for nodes[] entries'
    )
  );
  statements.push(...buildNodeTypes(dataNodes));

  // -- Relation types --
  statements.push(sectionComment('Relation types'));
  statements.push(...buildRelationTypes(relationNodes));

  // -- Blueprint table and definition --
  statements.push(sectionComment('Blueprint table and definition'));
  statements.push(buildBlueprintTable());
  statements.push(buildBlueprintDefinition());

  // Build the full AST and render to code
  const program = t.program(statements);
  const file = t.file(program);

  const header = [
    '// GENERATED FILE \u2014 DO NOT EDIT',
    '//',
    '// Regenerate with:',
    '//   cd graphql/node-type-registry && pnpm generate:types',
    '//',
    '// These types match the JSONB shape expected by construct_blueprint().',
    '// All field names are snake_case to match the SQL convention.',
    '',
    '',
  ].join('\n');

  const output = generate(file, { comments: true });
  return header + output.code + '\n';
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const outdirIdx = args.indexOf('--outdir');
  const outdir =
    outdirIdx !== -1 ? args[outdirIdx + 1] : join(__dirname, '..');

  const metaIdx = args.indexOf('--meta');
  let meta: MetaTableInfo[] | undefined;
  if (metaIdx !== -1 && args[metaIdx + 1]) {
    const metaPath = args[metaIdx + 1];
    console.log(`Reading _meta from ${metaPath}`);
    const raw = readFileSync(metaPath, 'utf-8');
    const parsed = JSON.parse(raw);
    // Accept both { tables: [...] } (GQL query result) and raw [...] (array)
    meta = (Array.isArray(parsed) ? parsed : parsed?.tables ?? parsed?.data?._meta?.tables) as MetaTableInfo[] | undefined;
    if (meta) {
      console.log(`Loaded ${meta.length} tables from _meta`);
    } else {
      console.log('Could not find tables in _meta JSON; using static fallback types');
    }
  } else {
    console.log('No --meta flag; using static fallback types');
  }

  const content = buildProgram(meta);
  const filename = 'blueprint-types.generated.ts';
  const filepath = join(outdir, filename);

  if (!existsSync(outdir)) mkdirSync(outdir, { recursive: true });
  writeFileSync(filepath, content);

  console.log(`Generated ${filepath} (${allNodeTypes.length} node types)`);
}

main();
