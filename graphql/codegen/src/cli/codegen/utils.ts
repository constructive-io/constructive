/**
 * Codegen utilities - naming conventions, type mapping, and helpers
 */
import type {
  CleanTable,
  CleanField,
  CleanFieldType,
} from '../../types/schema';
import { scalarToTsType, scalarToFilterType } from './scalars';
import { pluralize } from 'inflekt';

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
 * Uses inflection from _meta, falls back to convention
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
  isArray = false
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
