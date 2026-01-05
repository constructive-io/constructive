/**
 * Input types generator for ORM client (AST-based)
 *
 * Generates TypeScript interfaces for:
 * 1. Scalar filter types (StringFilter, IntFilter, UUIDFilter, etc.)
 * 2. Entity interfaces (User, Order, etc.)
 * 3. Table filter types (UserFilter, OrderFilter, etc.)
 * 4. OrderBy enums (UsersOrderBy, OrdersOrderBy, etc.)
 * 5. Input types (LoginInput, CreateUserInput, etc.)
 *
 * Uses ts-morph for robust AST-based code generation.
 */
import type { SourceFile } from 'ts-morph';
import type { TypeRegistry, CleanArgument, CleanTable } from '../../../types/schema';
import {
  createProject,
  createSourceFile,
  getMinimalFormattedOutput,
  createFileHeader,
  createInterface,
  createTypeAlias,
  addSectionComment,
  type InterfaceProperty,
} from '../ts-ast';
import {
  getTableNames,
  getFilterTypeName,
  getOrderByTypeName,
  isRelationField,
} from '../utils';
import { getTypeBaseName } from '../type-resolver';
import { scalarToTsType, scalarToFilterType } from '../scalars';

export interface GeneratedInputTypesFile {
  fileName: string;
  content: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Fields excluded from Create/Update inputs (auto-generated or system fields) */
const EXCLUDED_MUTATION_FIELDS = ['id', 'createdAt', 'updatedAt', 'nodeId'] as const;

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Overrides for input-type generation
 */
const INPUT_SCALAR_OVERRIDES: Record<string, string> = {
  JSON: 'Record<string, unknown>',
};

/**
 * Convert GraphQL scalar to TypeScript type
 */
function scalarToInputTs(scalar: string): string {
  return scalarToTsType(scalar, {
    unknownScalar: 'name',
    overrides: INPUT_SCALAR_OVERRIDES,
  });
}

/**
 * Convert a CleanTypeRef to TypeScript type string
 */
function typeRefToTs(typeRef: CleanArgument['type']): string {
  if (typeRef.kind === 'NON_NULL') {
    if (typeRef.ofType) {
      return typeRefToTs(typeRef.ofType as CleanArgument['type']);
    }
    return typeRef.name ?? 'unknown';
  }

  if (typeRef.kind === 'LIST') {
    if (typeRef.ofType) {
      return `${typeRefToTs(typeRef.ofType as CleanArgument['type'])}[]`;
    }
    return 'unknown[]';
  }

  // Scalar or named type
  const name = typeRef.name ?? 'unknown';
  return scalarToInputTs(name);
}

/**
 * Check if a type is required (NON_NULL)
 */
function isRequired(typeRef: CleanArgument['type']): boolean {
  return typeRef.kind === 'NON_NULL';
}

// ============================================================================
// Scalar Filter Types Generator (AST-based)
// ============================================================================

/** Filter operator sets for different scalar types */
type FilterOperators = 'equality' | 'distinct' | 'inArray' | 'comparison' | 'string' | 'json' | 'inet' | 'fulltext';

interface ScalarFilterConfig {
  name: string;
  tsType: string;
  operators: FilterOperators[];
}

/** Configuration for all scalar filter types - matches PostGraphile's generated filters */
const SCALAR_FILTER_CONFIGS: ScalarFilterConfig[] = [
  { name: 'StringFilter', tsType: 'string', operators: ['equality', 'distinct', 'inArray', 'comparison', 'string'] },
  { name: 'IntFilter', tsType: 'number', operators: ['equality', 'distinct', 'inArray', 'comparison'] },
  { name: 'FloatFilter', tsType: 'number', operators: ['equality', 'distinct', 'inArray', 'comparison'] },
  { name: 'BooleanFilter', tsType: 'boolean', operators: ['equality'] },
  { name: 'UUIDFilter', tsType: 'string', operators: ['equality', 'distinct', 'inArray'] },
  { name: 'DatetimeFilter', tsType: 'string', operators: ['equality', 'distinct', 'inArray', 'comparison'] },
  { name: 'DateFilter', tsType: 'string', operators: ['equality', 'distinct', 'inArray', 'comparison'] },
  { name: 'JSONFilter', tsType: 'Record<string, unknown>', operators: ['equality', 'distinct', 'json'] },
  { name: 'BigIntFilter', tsType: 'string', operators: ['equality', 'distinct', 'inArray', 'comparison'] },
  { name: 'BigFloatFilter', tsType: 'string', operators: ['equality', 'distinct', 'inArray', 'comparison'] },
  { name: 'BitStringFilter', tsType: 'string', operators: ['equality'] },
  { name: 'InternetAddressFilter', tsType: 'string', operators: ['equality', 'distinct', 'inArray', 'comparison', 'inet'] },
  { name: 'FullTextFilter', tsType: 'string', operators: ['fulltext'] },
];

/**
 * Build filter properties based on operator sets
 */
function buildScalarFilterProperties(config: ScalarFilterConfig): InterfaceProperty[] {
  const { tsType, operators } = config;
  const props: InterfaceProperty[] = [];

  // Equality operators (isNull, equalTo, notEqualTo)
  if (operators.includes('equality')) {
    props.push(
      { name: 'isNull', type: 'boolean', optional: true },
      { name: 'equalTo', type: tsType, optional: true },
      { name: 'notEqualTo', type: tsType, optional: true },
    );
  }

  // Distinct operators
  if (operators.includes('distinct')) {
    props.push(
      { name: 'distinctFrom', type: tsType, optional: true },
      { name: 'notDistinctFrom', type: tsType, optional: true },
    );
  }

  // In/notIn operators
  if (operators.includes('inArray')) {
    props.push(
      { name: 'in', type: `${tsType}[]`, optional: true },
      { name: 'notIn', type: `${tsType}[]`, optional: true },
    );
  }

  // Comparison operators (less than, greater than)
  if (operators.includes('comparison')) {
    props.push(
      { name: 'lessThan', type: tsType, optional: true },
      { name: 'lessThanOrEqualTo', type: tsType, optional: true },
      { name: 'greaterThan', type: tsType, optional: true },
      { name: 'greaterThanOrEqualTo', type: tsType, optional: true },
    );
  }

  // String operators (includes, startsWith, like, etc.)
  if (operators.includes('string')) {
    props.push(
      { name: 'includes', type: 'string', optional: true },
      { name: 'notIncludes', type: 'string', optional: true },
      { name: 'includesInsensitive', type: 'string', optional: true },
      { name: 'notIncludesInsensitive', type: 'string', optional: true },
      { name: 'startsWith', type: 'string', optional: true },
      { name: 'notStartsWith', type: 'string', optional: true },
      { name: 'startsWithInsensitive', type: 'string', optional: true },
      { name: 'notStartsWithInsensitive', type: 'string', optional: true },
      { name: 'endsWith', type: 'string', optional: true },
      { name: 'notEndsWith', type: 'string', optional: true },
      { name: 'endsWithInsensitive', type: 'string', optional: true },
      { name: 'notEndsWithInsensitive', type: 'string', optional: true },
      { name: 'like', type: 'string', optional: true },
      { name: 'notLike', type: 'string', optional: true },
      { name: 'likeInsensitive', type: 'string', optional: true },
      { name: 'notLikeInsensitive', type: 'string', optional: true },
    );
  }

  // JSON operators (contains, containsKey, etc.)
  if (operators.includes('json')) {
    props.push(
      { name: 'contains', type: 'Record<string, unknown>', optional: true },
      { name: 'containedBy', type: 'Record<string, unknown>', optional: true },
      { name: 'containsKey', type: 'string', optional: true },
      { name: 'containsAllKeys', type: 'string[]', optional: true },
      { name: 'containsAnyKeys', type: 'string[]', optional: true },
    );
  }

  // Internet address operators
  if (operators.includes('inet')) {
    props.push(
      { name: 'contains', type: 'string', optional: true },
      { name: 'containsOrEqualTo', type: 'string', optional: true },
      { name: 'containedBy', type: 'string', optional: true },
      { name: 'containedByOrEqualTo', type: 'string', optional: true },
      { name: 'containsOrContainedBy', type: 'string', optional: true },
    );
  }

  // Full-text search operators
  if (operators.includes('fulltext')) {
    props.push({ name: 'matches', type: 'string', optional: true });
  }

  return props;
}

/**
 * Add scalar filter types to source file using ts-morph
 */
function addScalarFilterTypes(sourceFile: SourceFile): void {
  addSectionComment(sourceFile, 'Scalar Filter Types');

  for (const config of SCALAR_FILTER_CONFIGS) {
    sourceFile.addInterface(
      createInterface(config.name, buildScalarFilterProperties(config))
    );
  }
}

// ============================================================================
// Entity Types Generator (AST-based)
// ============================================================================

/**
 * Build properties for an entity interface
 */
function buildEntityProperties(table: CleanTable): InterfaceProperty[] {
  const properties: InterfaceProperty[] = [];

  for (const field of table.fields) {
    if (isRelationField(field.name, table)) continue;

    const fieldType = typeof field.type === 'string' ? field.type : field.type.gqlType;
    const tsType = scalarToInputTs(fieldType);
    const isNullable = field.name !== 'id' && field.name !== 'nodeId';

    properties.push({
      name: field.name,
      type: isNullable ? `${tsType} | null` : tsType,
      optional: isNullable,
    });
  }

  return properties;
}

/**
 * Add entity type interface for a table
 */
function addEntityType(sourceFile: SourceFile, table: CleanTable): void {
  const { typeName } = getTableNames(table);
  sourceFile.addInterface(createInterface(typeName, buildEntityProperties(table)));
}

/**
 * Add all entity types
 */
function addEntityTypes(sourceFile: SourceFile, tables: CleanTable[]): void {
  addSectionComment(sourceFile, 'Entity Types');
  for (const table of tables) {
    addEntityType(sourceFile, table);
  }
}

// ============================================================================
// Relation Helper Types Generator (AST-based)
// ============================================================================

/**
 * Add relation helper types (ConnectionResult, PageInfo)
 */
function addRelationHelperTypes(sourceFile: SourceFile): void {
  addSectionComment(sourceFile, 'Relation Helper Types');

  sourceFile.addInterface(createInterface('ConnectionResult<T>', [
    { name: 'nodes', type: 'T[]', optional: false },
    { name: 'totalCount', type: 'number', optional: false },
    { name: 'pageInfo', type: 'PageInfo', optional: false },
  ]));

  sourceFile.addInterface(createInterface('PageInfo', [
    { name: 'hasNextPage', type: 'boolean', optional: false },
    { name: 'hasPreviousPage', type: 'boolean', optional: false },
    { name: 'startCursor', type: 'string | null', optional: true },
    { name: 'endCursor', type: 'string | null', optional: true },
  ]));
}

// ============================================================================
// Entity Relation Types Generator (AST-based)
// ============================================================================

function getRelatedTypeName(
  tableName: string,
  tableByName: Map<string, CleanTable>
): string {
  const relatedTable = tableByName.get(tableName);
  return relatedTable ? getTableNames(relatedTable).typeName : tableName;
}

function getRelatedOrderByName(
  tableName: string,
  tableByName: Map<string, CleanTable>
): string {
  const relatedTable = tableByName.get(tableName);
  return relatedTable ? getOrderByTypeName(relatedTable) : `${tableName}sOrderBy`;
}

function getRelatedFilterName(
  tableName: string,
  tableByName: Map<string, CleanTable>
): string {
  const relatedTable = tableByName.get(tableName);
  return relatedTable ? getFilterTypeName(relatedTable) : `${tableName}Filter`;
}

/**
 * Build properties for entity relations interface
 */
function buildEntityRelationProperties(
  table: CleanTable,
  tableByName: Map<string, CleanTable>
): InterfaceProperty[] {
  const properties: InterfaceProperty[] = [];

  for (const relation of table.relations.belongsTo) {
    if (!relation.fieldName) continue;
    const relatedTypeName = getRelatedTypeName(relation.referencesTable, tableByName);
    properties.push({
      name: relation.fieldName,
      type: `${relatedTypeName} | null`,
      optional: true,
    });
  }

  for (const relation of table.relations.hasOne) {
    if (!relation.fieldName) continue;
    const relatedTypeName = getRelatedTypeName(relation.referencedByTable, tableByName);
    properties.push({
      name: relation.fieldName,
      type: `${relatedTypeName} | null`,
      optional: true,
    });
  }

  for (const relation of table.relations.hasMany) {
    if (!relation.fieldName) continue;
    const relatedTypeName = getRelatedTypeName(relation.referencedByTable, tableByName);
    properties.push({
      name: relation.fieldName,
      type: `ConnectionResult<${relatedTypeName}>`,
      optional: true,
    });
  }

  for (const relation of table.relations.manyToMany) {
    if (!relation.fieldName) continue;
    const relatedTypeName = getRelatedTypeName(relation.rightTable, tableByName);
    properties.push({
      name: relation.fieldName,
      type: `ConnectionResult<${relatedTypeName}>`,
      optional: true,
    });
  }

  return properties;
}

/**
 * Add entity relation types
 */
function addEntityRelationTypes(
  sourceFile: SourceFile,
  tables: CleanTable[],
  tableByName: Map<string, CleanTable>
): void {
  addSectionComment(sourceFile, 'Entity Relation Types');

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    sourceFile.addInterface(
      createInterface(`${typeName}Relations`, buildEntityRelationProperties(table, tableByName))
    );
  }
}

/**
 * Add entity types with relations (intersection types)
 */
function addEntityWithRelations(sourceFile: SourceFile, tables: CleanTable[]): void {
  addSectionComment(sourceFile, 'Entity Types With Relations');

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    sourceFile.addTypeAlias(
      createTypeAlias(`${typeName}WithRelations`, `${typeName} & ${typeName}Relations`)
    );
  }
}

// ============================================================================
// Entity Select Types Generator (AST-based)
// ============================================================================

/**
 * Build the type string for a Select type (as object type literal)
 */
function buildSelectTypeBody(
  table: CleanTable,
  tableByName: Map<string, CleanTable>
): string {
  const lines: string[] = ['{'];

  // Add scalar fields
  for (const field of table.fields) {
    if (!isRelationField(field.name, table)) {
      lines.push(`${field.name}?: boolean;`);
    }
  }

  // Add belongsTo relations
  for (const relation of table.relations.belongsTo) {
    if (relation.fieldName) {
      const relatedTypeName = getRelatedTypeName(relation.referencesTable, tableByName);
      lines.push(`${relation.fieldName}?: boolean | { select?: ${relatedTypeName}Select };`);
    }
  }

  // Add hasMany relations
  for (const relation of table.relations.hasMany) {
    if (relation.fieldName) {
      const relatedTypeName = getRelatedTypeName(relation.referencedByTable, tableByName);
      const filterName = getRelatedFilterName(relation.referencedByTable, tableByName);
      const orderByName = getRelatedOrderByName(relation.referencedByTable, tableByName);
      lines.push(`${relation.fieldName}?: boolean | {`);
      lines.push(`  select?: ${relatedTypeName}Select;`);
      lines.push(`  first?: number;`);
      lines.push(`  filter?: ${filterName};`);
      lines.push(`  orderBy?: ${orderByName}[];`);
      lines.push(`};`);
    }
  }

  // Add manyToMany relations
  for (const relation of table.relations.manyToMany) {
    if (relation.fieldName) {
      const relatedTypeName = getRelatedTypeName(relation.rightTable, tableByName);
      const filterName = getRelatedFilterName(relation.rightTable, tableByName);
      const orderByName = getRelatedOrderByName(relation.rightTable, tableByName);
      lines.push(`${relation.fieldName}?: boolean | {`);
      lines.push(`  select?: ${relatedTypeName}Select;`);
      lines.push(`  first?: number;`);
      lines.push(`  filter?: ${filterName};`);
      lines.push(`  orderBy?: ${orderByName}[];`);
      lines.push(`};`);
    }
  }

  // Add hasOne relations
  for (const relation of table.relations.hasOne) {
    if (relation.fieldName) {
      const relatedTypeName = getRelatedTypeName(relation.referencedByTable, tableByName);
      lines.push(`${relation.fieldName}?: boolean | { select?: ${relatedTypeName}Select };`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Add entity Select types
 */
function addEntitySelectTypes(
  sourceFile: SourceFile,
  tables: CleanTable[],
  tableByName: Map<string, CleanTable>
): void {
  addSectionComment(sourceFile, 'Entity Select Types');

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    sourceFile.addTypeAlias(
      createTypeAlias(`${typeName}Select`, buildSelectTypeBody(table, tableByName))
    );
  }
}

// ============================================================================
// Table Filter Types Generator (AST-based)
// ============================================================================

/**
 * Map field type to filter type
 */
function getFilterTypeForField(fieldType: string): string {
  return scalarToFilterType(fieldType) ?? 'StringFilter';
}

/**
 * Build properties for a table filter interface
 */
function buildTableFilterProperties(table: CleanTable): InterfaceProperty[] {
  const filterName = getFilterTypeName(table);
  const properties: InterfaceProperty[] = [];

  for (const field of table.fields) {
    const fieldType = typeof field.type === 'string' ? field.type : field.type.gqlType;
    if (isRelationField(field.name, table)) continue;

    const filterType = getFilterTypeForField(fieldType);
    properties.push({ name: field.name, type: filterType, optional: true });
  }

  // Add logical operators
  properties.push({ name: 'and', type: `${filterName}[]`, optional: true });
  properties.push({ name: 'or', type: `${filterName}[]`, optional: true });
  properties.push({ name: 'not', type: filterName, optional: true });

  return properties;
}

/**
 * Add table filter types
 */
function addTableFilterTypes(sourceFile: SourceFile, tables: CleanTable[]): void {
  addSectionComment(sourceFile, 'Table Filter Types');

  for (const table of tables) {
    const filterName = getFilterTypeName(table);
    sourceFile.addInterface(createInterface(filterName, buildTableFilterProperties(table)));
  }
}

// ============================================================================
// OrderBy Types Generator (AST-based)
// ============================================================================

/**
 * Build OrderBy union type string
 */
function buildOrderByUnion(table: CleanTable): string {
  const values: string[] = ['PRIMARY_KEY_ASC', 'PRIMARY_KEY_DESC', 'NATURAL'];

  for (const field of table.fields) {
    if (isRelationField(field.name, table)) continue;
    const upperSnake = field.name.replace(/([A-Z])/g, '_$1').toUpperCase();
    values.push(`${upperSnake}_ASC`);
    values.push(`${upperSnake}_DESC`);
  }

  return values.map((v) => `'${v}'`).join(' | ');
}

/**
 * Add OrderBy types
 */
function addOrderByTypes(sourceFile: SourceFile, tables: CleanTable[]): void {
  addSectionComment(sourceFile, 'OrderBy Types');

  for (const table of tables) {
    const enumName = getOrderByTypeName(table);
    sourceFile.addTypeAlias(createTypeAlias(enumName, buildOrderByUnion(table)));
  }
}

// ============================================================================
// CRUD Input Types Generator (AST-based)
// ============================================================================

/**
 * Build the nested data object fields for Create input
 */
function buildCreateDataFields(table: CleanTable): Array<{ name: string; type: string; optional: boolean }> {
  const fields: Array<{ name: string; type: string; optional: boolean }> = [];

  for (const field of table.fields) {
    if (EXCLUDED_MUTATION_FIELDS.includes(field.name as typeof EXCLUDED_MUTATION_FIELDS[number])) continue;
    if (isRelationField(field.name, table)) continue;

    const fieldType = typeof field.type === 'string' ? field.type : field.type.gqlType;
    const tsType = scalarToInputTs(fieldType);
    const isOptional = !field.name.endsWith('Id');

    fields.push({ name: field.name, type: tsType, optional: isOptional });
  }

  return fields;
}

/**
 * Generate Create input interface as formatted string.
 * 
 * ts-morph doesn't handle nested object types in interface properties well,
 * so we build this manually with pre-doubled indentation (4→2, 8→4) since
 * getMinimalFormattedOutput halves all indentation.
 */
function buildCreateInputInterface(table: CleanTable): string {
  const { typeName, singularName } = getTableNames(table);
  const fields = buildCreateDataFields(table);
  
  const lines = [
    `export interface Create${typeName}Input {`,
    `    clientMutationId?: string;`,
    `    ${singularName}: {`,
  ];
  
  for (const field of fields) {
    const opt = field.optional ? '?' : '';
    lines.push(`        ${field.name}${opt}: ${field.type};`);
  }
  
  lines.push('    };');
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Build Patch type properties
 */
function buildPatchProperties(table: CleanTable): InterfaceProperty[] {
  const properties: InterfaceProperty[] = [];

  for (const field of table.fields) {
    if (EXCLUDED_MUTATION_FIELDS.includes(field.name as typeof EXCLUDED_MUTATION_FIELDS[number])) continue;
    if (isRelationField(field.name, table)) continue;

    const fieldType = typeof field.type === 'string' ? field.type : field.type.gqlType;
    const tsType = scalarToInputTs(fieldType);

    properties.push({ name: field.name, type: `${tsType} | null`, optional: true });
  }

  return properties;
}

/**
 * Add CRUD input types for a table
 */
function addCrudInputTypes(sourceFile: SourceFile, table: CleanTable): void {
  const { typeName } = getTableNames(table);
  const patchName = `${typeName}Patch`;

  // Create input - build as raw statement due to nested object type formatting
  sourceFile.addStatements(buildCreateInputInterface(table));

  // Patch interface
  sourceFile.addInterface(createInterface(patchName, buildPatchProperties(table)));

  // Update input
  sourceFile.addInterface(createInterface(`Update${typeName}Input`, [
    { name: 'clientMutationId', type: 'string', optional: true },
    { name: 'id', type: 'string', optional: false },
    { name: 'patch', type: patchName, optional: false },
  ]));

  // Delete input
  sourceFile.addInterface(createInterface(`Delete${typeName}Input`, [
    { name: 'clientMutationId', type: 'string', optional: true },
    { name: 'id', type: 'string', optional: false },
  ]));
}

/**
 * Add all CRUD input types
 */
function addAllCrudInputTypes(sourceFile: SourceFile, tables: CleanTable[]): void {
  addSectionComment(sourceFile, 'CRUD Input Types');

  for (const table of tables) {
    addCrudInputTypes(sourceFile, table);
  }
}

// ============================================================================
// Custom Input Types Generator (AST-based)
// ============================================================================

/**
 * Collect all input type names used by operations
 */
export function collectInputTypeNames(
  operations: Array<{ args: CleanArgument[] }>
): Set<string> {
  const inputTypes = new Set<string>();

  function collectFromTypeRef(typeRef: CleanArgument['type']) {
    const baseName = getTypeBaseName(typeRef);
    if (baseName && baseName.endsWith('Input')) {
      inputTypes.add(baseName);
    }
    if (baseName && baseName.endsWith('Filter')) {
      inputTypes.add(baseName);
    }
  }

  for (const op of operations) {
    for (const arg of op.args) {
      collectFromTypeRef(arg.type);
    }
  }

  return inputTypes;
}

/**
 * Add custom input types from TypeRegistry
 */
function addCustomInputTypes(
  sourceFile: SourceFile,
  typeRegistry: TypeRegistry,
  usedInputTypes: Set<string>
): void {
  addSectionComment(sourceFile, 'Custom Input Types (from schema)');

  const generatedTypes = new Set<string>();
  const typesToGenerate = new Set(Array.from(usedInputTypes));

  // Filter out types we've already generated
  const typesToRemove: string[] = [];
  typesToGenerate.forEach((typeName) => {
    if (
      typeName.endsWith('Filter') ||
      typeName.startsWith('Create') ||
      typeName.startsWith('Update') ||
      typeName.startsWith('Delete')
    ) {
      const isTableCrud =
        /^(Create|Update|Delete)[A-Z][a-zA-Z]+Input$/.test(typeName) ||
        /^[A-Z][a-zA-Z]+Filter$/.test(typeName);

      if (isTableCrud) {
        typesToRemove.push(typeName);
      }
    }
  });
  typesToRemove.forEach((t) => typesToGenerate.delete(t));

  let iterations = 0;
  const maxIterations = 200;

  while (typesToGenerate.size > 0 && iterations < maxIterations) {
    iterations++;
    const typeNameResult = typesToGenerate.values().next();
    if (typeNameResult.done) break;
    const typeName: string = typeNameResult.value;
    typesToGenerate.delete(typeName);

    if (generatedTypes.has(typeName)) continue;
    generatedTypes.add(typeName);

    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo) {
      sourceFile.addStatements(`// Type '${typeName}' not found in schema`);
      sourceFile.addTypeAlias(createTypeAlias(typeName, 'Record<string, unknown>'));
      continue;
    }

    if (typeInfo.kind === 'INPUT_OBJECT' && typeInfo.inputFields) {
      const properties: InterfaceProperty[] = [];

      for (const field of typeInfo.inputFields) {
        const optional = !isRequired(field.type);
        const tsType = typeRefToTs(field.type);
        properties.push({ name: field.name, type: tsType, optional });

        // Follow nested Input types
        const baseType = getTypeBaseName(field.type);
        if (baseType && baseType.endsWith('Input') && !generatedTypes.has(baseType)) {
          typesToGenerate.add(baseType);
        }
      }

      sourceFile.addInterface(createInterface(typeName, properties));
    } else if (typeInfo.kind === 'ENUM' && typeInfo.enumValues) {
      const values = typeInfo.enumValues.map((v) => `'${v}'`).join(' | ');
      sourceFile.addTypeAlias(createTypeAlias(typeName, values));
    } else {
      sourceFile.addStatements(`// Type '${typeName}' is ${typeInfo.kind}`);
      sourceFile.addTypeAlias(createTypeAlias(typeName, 'unknown'));
    }
  }
}

// ============================================================================
// Payload/Return Types Generator (AST-based)
// ============================================================================

/**
 * Collect all payload type names from operation return types
 */
export function collectPayloadTypeNames(
  operations: Array<{ returnType: CleanArgument['type'] }>
): Set<string> {
  const payloadTypes = new Set<string>();

  for (const op of operations) {
    const baseName = getTypeBaseName(op.returnType);
    if (baseName && (baseName.endsWith('Payload') || !baseName.endsWith('Connection'))) {
      payloadTypes.add(baseName);
    }
  }

  return payloadTypes;
}

/**
 * Add payload/return types
 */
function addPayloadTypes(
  sourceFile: SourceFile,
  typeRegistry: TypeRegistry,
  usedPayloadTypes: Set<string>,
  alreadyGeneratedTypes: Set<string>
): void {
  addSectionComment(sourceFile, 'Payload/Return Types (for custom operations)');

  const generatedTypes = new Set<string>(alreadyGeneratedTypes);
  const typesToGenerate = new Set(Array.from(usedPayloadTypes));

  const skipTypes = new Set<string>([
    'String', 'Int', 'Float', 'Boolean', 'ID', 'UUID', 'Datetime', 'Date',
    'Time', 'JSON', 'BigInt', 'BigFloat', 'Cursor', 'Query', 'Mutation',
  ]);

  let iterations = 0;
  const maxIterations = 200;

  while (typesToGenerate.size > 0 && iterations < maxIterations) {
    iterations++;
    const typeNameResult = typesToGenerate.values().next();
    if (typeNameResult.done) break;
    const typeName: string = typeNameResult.value;
    typesToGenerate.delete(typeName);

    if (generatedTypes.has(typeName) || skipTypes.has(typeName)) continue;

    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo) continue;

    if (typeInfo.kind !== 'OBJECT' || !typeInfo.fields) continue;

    generatedTypes.add(typeName);

    // Build interface properties
    const interfaceProps: InterfaceProperty[] = [];
    for (const field of typeInfo.fields) {
      const baseType = getTypeBaseName(field.type);
      if (baseType === 'Query' || baseType === 'Mutation') continue;

      const tsType = typeRefToTs(field.type);
      const isNullable = !isRequired(field.type);
      interfaceProps.push({
        name: field.name,
        type: isNullable ? `${tsType} | null` : tsType,
        optional: isNullable,
      });

      // Follow nested OBJECT types
      if (baseType && !generatedTypes.has(baseType) && !skipTypes.has(baseType)) {
        const nestedType = typeRegistry.get(baseType);
        if (nestedType?.kind === 'OBJECT') {
          typesToGenerate.add(baseType);
        }
      }
    }

    sourceFile.addInterface(createInterface(typeName, interfaceProps));

    // Build Select type (no indentation - ts-morph adds it)
    const selectLines: string[] = ['{'];
    for (const field of typeInfo.fields) {
      const baseType = getTypeBaseName(field.type);
      if (baseType === 'Query' || baseType === 'Mutation') continue;

      const nestedType = baseType ? typeRegistry.get(baseType) : null;
      if (nestedType?.kind === 'OBJECT') {
        selectLines.push(`${field.name}?: boolean | { select?: ${baseType}Select };`);
      } else {
        selectLines.push(`${field.name}?: boolean;`);
      }
    }
    selectLines.push('}');

    sourceFile.addTypeAlias(createTypeAlias(`${typeName}Select`, selectLines.join('\n')));
  }
}

// ============================================================================
// Main Generator (AST-based)
// ============================================================================

/**
 * Generate comprehensive input-types.ts file using ts-morph AST
 */
export function generateInputTypesFile(
  typeRegistry: TypeRegistry,
  usedInputTypes: Set<string>,
  tables?: CleanTable[],
  usedPayloadTypes?: Set<string>
): GeneratedInputTypesFile {
  const project = createProject();
  const sourceFile = createSourceFile(project, 'input-types.ts');

  // Add file header
  sourceFile.insertText(0, createFileHeader('GraphQL types for ORM client') + '\n');

  // 1. Scalar filter types
  addScalarFilterTypes(sourceFile);

  // 2. Entity and relation types (if tables provided)
  if (tables && tables.length > 0) {
    const tableByName = new Map(tables.map((table) => [table.name, table]));

    addEntityTypes(sourceFile, tables);
    addRelationHelperTypes(sourceFile);
    addEntityRelationTypes(sourceFile, tables, tableByName);
    addEntityWithRelations(sourceFile, tables);
    addEntitySelectTypes(sourceFile, tables, tableByName);

    // 3. Table filter types
    addTableFilterTypes(sourceFile, tables);

    // 4. OrderBy types
    addOrderByTypes(sourceFile, tables);

    // 5. CRUD input types
    addAllCrudInputTypes(sourceFile, tables);
  }

  // 6. Custom input types from TypeRegistry
  addCustomInputTypes(sourceFile, typeRegistry, usedInputTypes);

  // 7. Payload/return types for custom operations
  if (usedPayloadTypes && usedPayloadTypes.size > 0) {
    const alreadyGeneratedTypes = new Set<string>();
    if (tables) {
      for (const table of tables) {
        const { typeName } = getTableNames(table);
        alreadyGeneratedTypes.add(typeName);
      }
    }
    addPayloadTypes(sourceFile, typeRegistry, usedPayloadTypes, alreadyGeneratedTypes);
  }

  return {
    fileName: 'input-types.ts',
    content: getMinimalFormattedOutput(sourceFile),
  };
}
