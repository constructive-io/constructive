/**
 * Codegen utilities - naming conventions, type mapping, and helpers
 */
import { pluralize } from 'inflekt';

import type {
  CleanField,
  CleanFieldType,
  CleanTable,
  TypeRegistry,
} from '../../types/schema';
import { scalarToFilterType, scalarToTsType } from './scalars';

// ============================================================================
// String manipulation
// ============================================================================

/** Lowercase first character */
export function lcFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/** Uppercase first character */
export function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Convert to camelCase */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (_, char) => char.toLowerCase());
}

/** Convert to PascalCase */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (_, char) => char.toUpperCase());
}

/** Convert to SCREAMING_SNAKE_CASE */
export function toScreamingSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]/g, '_')
    .toUpperCase()
    .replace(/^_/, '');
}

// ============================================================================
// Naming conventions for generated code
// ============================================================================

export interface TableNames {
  /** PascalCase singular (e.g., "Car") */
  typeName: string;
  /** camelCase singular (e.g., "car") */
  singularName: string;
  /** camelCase plural (e.g., "cars") */
  pluralName: string;
  /** PascalCase plural (e.g., "Cars") */
  pluralTypeName: string;
}

/**
 * Derive all naming variants from a table
 */
export function getTableNames(table: CleanTable): TableNames {
  const typeName = table.name;
  const singularName = table.inflection?.tableFieldName || lcFirst(typeName);
  const pluralName =
    table.query?.all ||
    table.inflection?.allRows ||
    lcFirst(pluralize(typeName));
  const pluralTypeName = ucFirst(pluralName);

  return {
    typeName,
    singularName,
    pluralName,
    pluralTypeName,
  };
}

/**
 * Generate hook function name for list query
 * e.g., "useCarsQuery"
 */
export function getListQueryHookName(table: CleanTable): string {
  const { pluralName } = getTableNames(table);
  return `use${ucFirst(pluralName)}Query`;
}

/**
 * Generate hook function name for single item query
 * e.g., "useCarQuery"
 */
export function getSingleQueryHookName(table: CleanTable): string {
  const { singularName } = getTableNames(table);
  return `use${ucFirst(singularName)}Query`;
}

/**
 * Generate hook function name for create mutation
 * e.g., "useCreateCarMutation"
 */
export function getCreateMutationHookName(table: CleanTable): string {
  const { typeName } = getTableNames(table);
  return `useCreate${typeName}Mutation`;
}

/**
 * Generate hook function name for update mutation
 * e.g., "useUpdateCarMutation"
 */
export function getUpdateMutationHookName(table: CleanTable): string {
  const { typeName } = getTableNames(table);
  return `useUpdate${typeName}Mutation`;
}

/**
 * Generate hook function name for delete mutation
 * e.g., "useDeleteCarMutation"
 */
export function getDeleteMutationHookName(table: CleanTable): string {
  const { typeName } = getTableNames(table);
  return `useDelete${typeName}Mutation`;
}

/**
 * Generate file name for list query hook
 * e.g., "useCarsQuery.ts"
 */
export function getListQueryFileName(table: CleanTable): string {
  return `${getListQueryHookName(table)}.ts`;
}

/**
 * Generate file name for single query hook
 * e.g., "useCarQuery.ts"
 */
export function getSingleQueryFileName(table: CleanTable): string {
  return `${getSingleQueryHookName(table)}.ts`;
}

/**
 * Generate file name for create mutation hook
 */
export function getCreateMutationFileName(table: CleanTable): string {
  return `${getCreateMutationHookName(table)}.ts`;
}

/**
 * Generate file name for update mutation hook
 */
export function getUpdateMutationFileName(table: CleanTable): string {
  return `${getUpdateMutationHookName(table)}.ts`;
}

/**
 * Generate file name for delete mutation hook
 */
export function getDeleteMutationFileName(table: CleanTable): string {
  return `${getDeleteMutationHookName(table)}.ts`;
}

// ============================================================================
// GraphQL operation names
// ============================================================================

/**
 * Get the GraphQL query name for fetching all rows
 * Uses inflection from introspection, falls back to convention
 */
export function getAllRowsQueryName(table: CleanTable): string {
  return (
    table.query?.all ||
    table.inflection?.allRows ||
    lcFirst(pluralize(table.name))
  );
}

/**
 * Get the GraphQL query name for fetching single row
 */
export function getSingleRowQueryName(table: CleanTable): string {
  return (
    table.query?.one || table.inflection?.tableFieldName || lcFirst(table.name)
  );
}

/**
 * Get the GraphQL mutation name for creating
 */
export function getCreateMutationName(table: CleanTable): string {
  return table.query?.create || `create${table.name}`;
}

/**
 * Get the GraphQL mutation name for updating
 */
export function getUpdateMutationName(table: CleanTable): string {
  return table.query?.update || `update${table.name}`;
}

/**
 * Get the GraphQL mutation name for deleting
 */
export function getDeleteMutationName(table: CleanTable): string {
  return table.query?.delete || `delete${table.name}`;
}

// ============================================================================
// Type names
// ============================================================================

/**
 * Get PostGraphile filter type name
 * e.g., "CarFilter"
 */
export function getFilterTypeName(table: CleanTable): string {
  return table.inflection?.filterType || `${table.name}Filter`;
}

/**
 * Get PostGraphile OrderBy enum type name
 * e.g., "CarsOrderBy", "AddressesOrderBy"
 */
export function getOrderByTypeName(table: CleanTable): string {
  return table.inflection?.orderByType || `${pluralize(table.name)}OrderBy`;
}

/**
 * Get PostGraphile Condition type name (simple equality filter)
 * e.g., "CarCondition", "AddressCondition"
 */
export function getConditionTypeName(table: CleanTable): string {
  return table.inflection?.conditionType || `${table.name}Condition`;
}

/**
 * Get PostGraphile create input type name
 * e.g., "CreateCarInput"
 */
export function getCreateInputTypeName(table: CleanTable): string {
  return table.inflection?.createInputType || `Create${table.name}Input`;
}

/**
 * Get PostGraphile patch type name for updates
 * e.g., "CarPatch"
 */
export function getPatchTypeName(table: CleanTable): string {
  return table.inflection?.patchType || `${table.name}Patch`;
}

/**
 * Get PostGraphile update input type name
 * e.g., "UpdateCarInput"
 */
export function getUpdateInputTypeName(table: CleanTable): string {
  return `Update${table.name}Input`;
}

/**
 * Get PostGraphile delete input type name
 * e.g., "DeleteCarInput"
 */
export function getDeleteInputTypeName(table: CleanTable): string {
  return `Delete${table.name}Input`;
}

// ============================================================================
// Type mapping: GraphQL → TypeScript
// ============================================================================

/**
 * Convert GraphQL type to TypeScript type
 */
export function gqlTypeToTs(gqlType: string, isArray: boolean = false): string {
  // Remove non-null markers
  const cleanType = gqlType.replace(/!/g, '');

  // Look up in map, fallback to the type name itself (custom type)
  const tsType = scalarToTsType(cleanType, { unknownScalar: 'name' });

  return isArray ? `${tsType}[]` : tsType;
}

/**
 * Convert CleanFieldType to TypeScript type string
 */
export function fieldTypeToTs(fieldType: CleanFieldType): string {
  return gqlTypeToTs(fieldType.gqlType, fieldType.isArray);
}

// ============================================================================
// Type mapping: GraphQL → Filter type
// ============================================================================

/**
 * Get the PostGraphile filter type for a GraphQL scalar
 * @param gqlType - The GraphQL type string (e.g., "String", "UUID")
 * @param isArray - Whether this is an array type
 */
export function getScalarFilterType(
  gqlType: string,
  isArray = false,
): string | null {
  const cleanType = gqlType.replace(/!/g, '');
  return scalarToFilterType(cleanType, isArray);
}

// ============================================================================
// Field filtering utilities
// ============================================================================

/**
 * Check if a field is a relation field (not a scalar)
 */
export function isRelationField(fieldName: string, table: CleanTable): boolean {
  const { belongsTo, hasOne, hasMany, manyToMany } = table.relations;
  return (
    belongsTo.some((r) => r.fieldName === fieldName) ||
    hasOne.some((r) => r.fieldName === fieldName) ||
    hasMany.some((r) => r.fieldName === fieldName) ||
    manyToMany.some((r) => r.fieldName === fieldName)
  );
}

/**
 * Get only scalar fields (non-relation fields)
 */
export function getScalarFields(table: CleanTable): CleanField[] {
  return table.fields.filter((f) => !isRelationField(f.name, table));
}

/**
 * Resolve the inner input type from a CreateXInput.
 * PostGraphile create inputs wrap the actual field definitions in an inner type
 * (e.g. CreateUserInput -> { user: UserInput }) — this resolves that inner type
 * and returns the set of field names it contains.
 */
export function resolveInnerInputType(
  inputTypeName: string,
  typeRegistry: TypeRegistry,
): { name: string; fields: Set<string> } | null {
  const inputType = typeRegistry.get(inputTypeName);
  if (!inputType?.inputFields) return null;

  for (const inputField of inputType.inputFields) {
    const innerTypeName = inputField.type.name
      || inputField.type.ofType?.name
      || inputField.type.ofType?.ofType?.name;
    if (!innerTypeName) continue;

    const innerType = typeRegistry.get(innerTypeName);
    if (!innerType?.inputFields) continue;

    const fields = new Set(innerType.inputFields.map((f) => f.name));
    return { name: innerTypeName, fields };
  }
  return null;
}

/**
 * Get the set of field names that actually exist in the create input type.
 * Fields not in this set (e.g. computed fields like searchTsvRank, hashUuid)
 * are plugin-added computed fields that don't correspond to real database columns.
 * Returns null when no typeRegistry is provided (caller should treat as "no filtering").
 */
export function getWritableFieldNames(
  table: CleanTable,
  typeRegistry?: TypeRegistry,
): Set<string> | null {
  if (!typeRegistry) return null;

  const createInputTypeName = getCreateInputTypeName(table);
  const resolved = resolveInnerInputType(createInputTypeName, typeRegistry);
  return resolved?.fields ?? null;
}

/**
 * Get scalar fields that represent actual database columns (not computed/plugin-added).
 * When a TypeRegistry is provided, filters out fields that don't exist in the
 * create input type — these are computed fields added by plugins (e.g. search scores,
 * hash UUIDs) that aren't real columns and shouldn't appear in default selections.
 * Without a TypeRegistry, falls back to all scalar fields.
 */
export function getSelectableScalarFields(
  table: CleanTable,
  typeRegistry?: TypeRegistry,
): CleanField[] {
  const writableFields = getWritableFieldNames(table, typeRegistry);
  return getScalarFields(table).filter(
    (f) => writableFields === null || writableFields.has(f.name),
  );
}

/**
 * Primary key field information
 */
export interface PrimaryKeyField {
  /** Field name */
  name: string;
  /** GraphQL type (e.g., "UUID", "Int", "String") */
  gqlType: string;
  /** TypeScript type (e.g., "string", "number") */
  tsType: string;
}

/**
 * Get primary key field information from table constraints
 * Returns array to support composite primary keys
 */
export function getPrimaryKeyInfo(table: CleanTable): PrimaryKeyField[] {
  const pk = table.constraints?.primaryKey?.[0];
  if (!pk || pk.fields.length === 0) {
    // Fallback: try to find 'id' field in table fields
    const idField = table.fields.find((f) => f.name.toLowerCase() === 'id');
    if (idField) {
      return [
        {
          name: idField.name,
          gqlType: idField.type.gqlType,
          tsType: fieldTypeToTs(idField.type),
        },
      ];
    }
    // Last resort: assume 'id' of type string (UUID)
    return [{ name: 'id', gqlType: 'UUID', tsType: 'string' }];
  }
  return pk.fields.map((f) => ({
    name: f.name,
    gqlType: f.type.gqlType,
    tsType: fieldTypeToTs(f.type),
  }));
}

/**
 * Get primary key field names (convenience wrapper)
 */
export function getPrimaryKeyFields(table: CleanTable): string[] {
  return getPrimaryKeyInfo(table).map((pk) => pk.name);
}

/**
 * Check if table has a valid single-field primary key
 * Used to determine if a single query hook can be generated
 * Tables with composite keys return false (handled as custom queries)
 */
export function hasValidPrimaryKey(table: CleanTable): boolean {
  // Check for explicit primary key constraint with single field
  const pk = table.constraints?.primaryKey?.[0];
  if (pk && pk.fields.length === 1) {
    return true;
  }
  // Check for 'id' field as fallback
  const idField = table.fields.find((f) => f.name.toLowerCase() === 'id');
  if (idField) {
    return true;
  }
  return false;
}

// ============================================================================
// Query key generation
// ============================================================================

/**
 * Generate query key prefix for a table
 * e.g., "cars" for list queries, "car" for detail queries
 */
export function getQueryKeyPrefix(table: CleanTable): string {
  return lcFirst(table.name);
}

// ============================================================================
// Smart Comment Utilities
// ============================================================================

/**
 * PostGraphile smart comment tags that should be stripped from descriptions.
 * Smart comments start with `@` and control PostGraphile behavior
 * (e.g., `@omit`, `@name`, `@foreignKey`, etc.)
 *
 * A PostgreSQL COMMENT may contain both human-readable text and smart comments:
 *   COMMENT ON TABLE users IS 'User accounts for the application\n@omit delete';
 *
 * PostGraphile's introspection already separates these: the GraphQL `description`
 * field contains only the human-readable part. So in most cases, the description
 * we receive from introspection is already clean.
 *
 * However, as a safety measure, this utility strips any remaining `@`-prefixed
 * lines that may have leaked through.
 */

/**
 * PostGraphile auto-generated boilerplate descriptions that add no value.
 * These are generic descriptions PostGraphile puts on every mutation input,
 * clientMutationId field, etc. We filter them out to keep generated code clean.
 */
const POSTGRAPHILE_BOILERPLATE: string[] = [
  'The exclusive input argument for this mutation.',
  'An arbitrary string value with no semantic meaning.',
  'The exact same `clientMutationId` that was provided in the mutation input,',
  'The output of our',
  'All input for the',
  'A cursor for use in pagination.',
  'An edge for our',
  'Information to aid in pagination.',
  'Reads and enables pagination through a set of',
  'A list of edges which contains the',
  'The count of *all* `',
  'A list of `',
  'Our root query field',
  'Reads a single',
  'The root query type',
  'The root mutation type',
];

/**
 * Check if a description is generic PostGraphile boilerplate that should be suppressed.
 */
function isBoilerplateDescription(description: string): boolean {
  const trimmed = description.trim();
  return POSTGRAPHILE_BOILERPLATE.some((bp) => trimmed.startsWith(bp));
}

/**
 * Strip PostGraphile smart comments and boilerplate from a description string.
 *
 * Smart comments are lines starting with `@` (e.g., `@omit`, `@name newName`).
 * Boilerplate descriptions are generic PostGraphile-generated text that repeats
 * on every mutation input, clientMutationId field, etc.
 *
 * This returns only the meaningful human-readable portion of the comment,
 * or undefined if the result is empty or boilerplate.
 *
 * @param description - Raw description from GraphQL introspection
 * @returns Cleaned description, or undefined if empty/boilerplate
 */
export function stripSmartComments(
  description: string | null | undefined,
  enabled: boolean = true,
): string | undefined {
  if (!enabled) return undefined;
  if (!description) return undefined;

  // Check if entire description is boilerplate
  if (isBoilerplateDescription(description)) return undefined;

  const lines = description.split('\n');
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip lines that start with @ (smart comment directives)
    if (trimmed.startsWith('@')) continue;
    cleanLines.push(line);
  }

  const result = cleanLines.join('\n').trim();
  if (result.length === 0) return undefined;

  // Re-check after stripping smart comments
  if (isBoilerplateDescription(result)) return undefined;

  return result;
}

// ============================================================================
// Code generation helpers
// ============================================================================

/**
 * Generate a doc comment header for generated files
 */
export function getGeneratedFileHeader(description: string): string {
  return `/**
 * ${description}
 * @generated by @constructive-io/graphql-codegen
 * DO NOT EDIT - changes will be overwritten
 */`;
}

/**
 * Indent a multi-line string
 */
export function indent(str: string, spaces: number = 2): string {
  const pad = ' '.repeat(spaces);
  return str
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}
