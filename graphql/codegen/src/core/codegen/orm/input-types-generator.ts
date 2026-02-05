/**
 * Input types generator for ORM client (Babel AST-based)
 *
 * Generates TypeScript interfaces for:
 * 1. Scalar filter types (StringFilter, IntFilter, UUIDFilter, etc.)
 * 2. Entity interfaces (User, Order, etc.)
 * 3. Table filter types (UserFilter, OrderFilter, etc.)
 * 4. OrderBy enums (UsersOrderBy, OrdersOrderBy, etc.)
 * 5. Input types (LoginInput, CreateUserInput, etc.)
 *
 * Uses Babel AST for robust code generation.
 */
import * as t from '@babel/types';
import { pluralize } from 'inflekt';

import type {
  CleanArgument,
  CleanTable,
  TypeRegistry
} from '../../../types/schema';
import { addLineComment,generateCode } from '../babel-ast';
import { scalarToFilterType,scalarToTsType } from '../scalars';
import { getTypeBaseName } from '../type-resolver';
import {
  getConditionTypeName,
  getFilterTypeName,
  getGeneratedFileHeader,
  getOrderByTypeName,
  getPrimaryKeyInfo,
  getTableNames,
  isRelationField
} from '../utils';

export interface GeneratedInputTypesFile {
  fileName: string;
  content: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Fields excluded from Create/Update inputs (auto-generated or system fields) */
const EXCLUDED_MUTATION_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'nodeId'
] as const;

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Overrides for input-type generation
 */
const INPUT_SCALAR_OVERRIDES: Record<string, string> = {
  JSON: 'Record<string, unknown>'
};

/**
 * Convert GraphQL scalar to TypeScript type
 */
function scalarToInputTs(scalar: string): string {
  return scalarToTsType(scalar, {
    unknownScalar: 'name',
    overrides: INPUT_SCALAR_OVERRIDES
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
// Babel AST Helper Functions
// ============================================================================

/**
 * Parse a type string into a TSType node
 */
function parseTypeString(typeStr: string): t.TSType {
  // Handle union types like "string | null"
  if (typeStr.includes(' | ')) {
    const parts = typeStr.split(' | ').map((p) => p.trim());
    return t.tsUnionType(parts.map((p) => parseTypeString(p)));
  }

  // Handle array types like "string[]"
  if (typeStr.endsWith('[]')) {
    const elementType = typeStr.slice(0, -2);
    return t.tsArrayType(parseTypeString(elementType));
  }

  // Handle generic types like "Record<string, unknown>"
  if (typeStr.includes('<')) {
    const match = typeStr.match(/^([^<]+)<(.+)>$/);
    if (match) {
      const [, baseName, params] = match;
      const typeParams = params.split(',').map((p) => parseTypeString(p.trim()));
      return t.tsTypeReference(
        t.identifier(baseName),
        t.tsTypeParameterInstantiation(typeParams)
      );
    }
  }

  // Handle primitive types
  switch (typeStr) {
  case 'string':
    return t.tsStringKeyword();
  case 'number':
    return t.tsNumberKeyword();
  case 'boolean':
    return t.tsBooleanKeyword();
  case 'null':
    return t.tsNullKeyword();
  case 'unknown':
    return t.tsUnknownKeyword();
  default:
    return t.tsTypeReference(t.identifier(typeStr));
  }
}

/**
 * Create an interface property signature
 */
function createPropertySignature(
  name: string,
  typeStr: string,
  optional: boolean
): t.TSPropertySignature {
  const prop = t.tsPropertySignature(
    t.identifier(name),
    t.tsTypeAnnotation(parseTypeString(typeStr))
  );
  prop.optional = optional;
  return prop;
}

/**
 * Create an exported interface declaration
 */
function createExportedInterface(
  name: string,
  properties: Array<{ name: string; type: string; optional: boolean }>
): t.ExportNamedDeclaration {
  const props = properties.map((p) =>
    createPropertySignature(p.name, p.type, p.optional)
  );
  const body = t.tsInterfaceBody(props);
  const interfaceDecl = t.tsInterfaceDeclaration(
    t.identifier(name),
    null,
    null,
    body
  );
  return t.exportNamedDeclaration(interfaceDecl);
}

/**
 * Create an exported type alias declaration
 */
function createExportedTypeAlias(
  name: string,
  typeStr: string
): t.ExportNamedDeclaration {
  const typeAlias = t.tsTypeAliasDeclaration(
    t.identifier(name),
    null,
    parseTypeString(typeStr)
  );
  return t.exportNamedDeclaration(typeAlias);
}

/**
 * Create a union type from string literals
 */
function createStringLiteralUnion(values: string[]): t.TSUnionType {
  return t.tsUnionType(
    values.map((v) => t.tsLiteralType(t.stringLiteral(v)))
  );
}

/**
 * Add a section comment to the first statement in an array
 */
function addSectionComment(
  statements: t.Statement[],
  sectionName: string
): void {
  if (statements.length > 0) {
    addLineComment(statements[0], `============ ${sectionName} ============`);
  }
}

// ============================================================================
// Interface Property Type
// ============================================================================

interface InterfaceProperty {
  name: string;
  type: string;
  optional: boolean;
}

// ============================================================================
// Scalar Filter Types Generator (AST-based)
// ============================================================================

/** Filter operator sets for different scalar types */
type FilterOperators =
  | 'equality'
  | 'distinct'
  | 'inArray'
  | 'comparison'
  | 'string'
  | 'json'
  | 'inet'
  | 'fulltext'
  | 'listArray';

interface ScalarFilterConfig {
  name: string;
  tsType: string;
  operators: FilterOperators[];
}

/** Configuration for all scalar filter types - matches PostGraphile's generated filters */
const SCALAR_FILTER_CONFIGS: ScalarFilterConfig[] = [
  {
    name: 'StringFilter',
    tsType: 'string',
    operators: ['equality', 'distinct', 'inArray', 'comparison', 'string']
  },
  {
    name: 'IntFilter',
    tsType: 'number',
    operators: ['equality', 'distinct', 'inArray', 'comparison']
  },
  {
    name: 'FloatFilter',
    tsType: 'number',
    operators: ['equality', 'distinct', 'inArray', 'comparison']
  },
  { name: 'BooleanFilter', tsType: 'boolean', operators: ['equality'] },
  {
    name: 'UUIDFilter',
    tsType: 'string',
    operators: ['equality', 'distinct', 'inArray']
  },
  {
    name: 'DatetimeFilter',
    tsType: 'string',
    operators: ['equality', 'distinct', 'inArray', 'comparison']
  },
  {
    name: 'DateFilter',
    tsType: 'string',
    operators: ['equality', 'distinct', 'inArray', 'comparison']
  },
  {
    name: 'JSONFilter',
    tsType: 'Record<string, unknown>',
    operators: ['equality', 'distinct', 'json']
  },
  {
    name: 'BigIntFilter',
    tsType: 'string',
    operators: ['equality', 'distinct', 'inArray', 'comparison']
  },
  {
    name: 'BigFloatFilter',
    tsType: 'string',
    operators: ['equality', 'distinct', 'inArray', 'comparison']
  },
  { name: 'BitStringFilter', tsType: 'string', operators: ['equality'] },
  {
    name: 'InternetAddressFilter',
    tsType: 'string',
    operators: ['equality', 'distinct', 'inArray', 'comparison', 'inet']
  },
  { name: 'FullTextFilter', tsType: 'string', operators: ['fulltext'] },
  // List filters (for array fields like string[], int[], uuid[])
  {
    name: 'StringListFilter',
    tsType: 'string[]',
    operators: ['equality', 'distinct', 'comparison', 'listArray']
  },
  {
    name: 'IntListFilter',
    tsType: 'number[]',
    operators: ['equality', 'distinct', 'comparison', 'listArray']
  },
  {
    name: 'UUIDListFilter',
    tsType: 'string[]',
    operators: ['equality', 'distinct', 'comparison', 'listArray']
  }
];

/**
 * Build filter properties based on operator sets
 */
function buildScalarFilterProperties(
  config: ScalarFilterConfig
): InterfaceProperty[] {
  const { tsType, operators } = config;
  const props: InterfaceProperty[] = [];

  // Equality operators (isNull, equalTo, notEqualTo)
  if (operators.includes('equality')) {
    props.push(
      { name: 'isNull', type: 'boolean', optional: true },
      { name: 'equalTo', type: tsType, optional: true },
      { name: 'notEqualTo', type: tsType, optional: true }
    );
  }

  // Distinct operators
  if (operators.includes('distinct')) {
    props.push(
      { name: 'distinctFrom', type: tsType, optional: true },
      { name: 'notDistinctFrom', type: tsType, optional: true }
    );
  }

  // In/notIn operators
  if (operators.includes('inArray')) {
    props.push(
      { name: 'in', type: `${tsType}[]`, optional: true },
      { name: 'notIn', type: `${tsType}[]`, optional: true }
    );
  }

  // Comparison operators (less than, greater than)
  if (operators.includes('comparison')) {
    props.push(
      { name: 'lessThan', type: tsType, optional: true },
      { name: 'lessThanOrEqualTo', type: tsType, optional: true },
      { name: 'greaterThan', type: tsType, optional: true },
      { name: 'greaterThanOrEqualTo', type: tsType, optional: true }
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
      { name: 'notLikeInsensitive', type: 'string', optional: true }
    );
  }

  // JSON operators (contains, containsKey, etc.)
  if (operators.includes('json')) {
    props.push(
      { name: 'contains', type: 'Record<string, unknown>', optional: true },
      { name: 'containedBy', type: 'Record<string, unknown>', optional: true },
      { name: 'containsKey', type: 'string', optional: true },
      { name: 'containsAllKeys', type: 'string[]', optional: true },
      { name: 'containsAnyKeys', type: 'string[]', optional: true }
    );
  }

  // Internet address operators
  if (operators.includes('inet')) {
    props.push(
      { name: 'contains', type: 'string', optional: true },
      { name: 'containsOrEqualTo', type: 'string', optional: true },
      { name: 'containedBy', type: 'string', optional: true },
      { name: 'containedByOrEqualTo', type: 'string', optional: true },
      { name: 'containsOrContainedBy', type: 'string', optional: true }
    );
  }

  // Full-text search operators
  if (operators.includes('fulltext')) {
    props.push({ name: 'matches', type: 'string', optional: true });
  }

  // List/Array operators (contains, overlaps, anyEqualTo, etc.)
  if (operators.includes('listArray')) {
    // Extract base type from array type (e.g., 'string[]' -> 'string')
    const baseType = tsType.replace('[]', '');
    props.push(
      { name: 'contains', type: tsType, optional: true },
      { name: 'containedBy', type: tsType, optional: true },
      { name: 'overlaps', type: tsType, optional: true },
      { name: 'anyEqualTo', type: baseType, optional: true },
      { name: 'anyNotEqualTo', type: baseType, optional: true },
      { name: 'anyLessThan', type: baseType, optional: true },
      { name: 'anyLessThanOrEqualTo', type: baseType, optional: true },
      { name: 'anyGreaterThan', type: baseType, optional: true },
      { name: 'anyGreaterThanOrEqualTo', type: baseType, optional: true }
    );
  }

  return props;
}

/**
 * Generate scalar filter type statements
 */
function generateScalarFilterTypes(): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const config of SCALAR_FILTER_CONFIGS) {
    statements.push(
      createExportedInterface(config.name, buildScalarFilterProperties(config))
    );
  }

  addSectionComment(statements, 'Scalar Filter Types');
  return statements;
}

// ============================================================================
// Enum Types Collector
// ============================================================================

/**
 * Check if a type is likely an enum (not a scalar and not ending with Input/Filter/etc)
 */
function isLikelyEnumType(
  typeName: string,
  typeRegistry: TypeRegistry
): boolean {
  const typeInfo = typeRegistry.get(typeName);
  return typeInfo?.kind === 'ENUM';
}

/**
 * Collect enum types used by table fields
 */
function collectEnumTypesFromTables(
  tables: CleanTable[],
  typeRegistry: TypeRegistry
): Set<string> {
  const enumTypes = new Set<string>();

  for (const table of tables) {
    for (const field of table.fields) {
      const fieldType =
        typeof field.type === 'string' ? field.type : field.type.gqlType;
      // Check if this type is an enum in the registry
      if (isLikelyEnumType(fieldType, typeRegistry)) {
        enumTypes.add(fieldType);
      }
    }
  }

  return enumTypes;
}

/**
 * Generate enum type statements
 */
function generateEnumTypes(
  typeRegistry: TypeRegistry,
  enumTypeNames: Set<string>
): t.Statement[] {
  if (enumTypeNames.size === 0) return [];

  const statements: t.Statement[] = [];

  for (const typeName of Array.from(enumTypeNames).sort()) {
    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo || typeInfo.kind !== 'ENUM' || !typeInfo.enumValues) continue;

    const unionType = createStringLiteralUnion(typeInfo.enumValues);
    const typeAlias = t.tsTypeAliasDeclaration(
      t.identifier(typeName),
      null,
      unionType
    );
    statements.push(t.exportNamedDeclaration(typeAlias));
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Enum Types');
  }
  return statements;
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

    const fieldType =
      typeof field.type === 'string' ? field.type : field.type.gqlType;
    const tsType = scalarToInputTs(fieldType);
    const isNullable = field.name !== 'id' && field.name !== 'nodeId';

    properties.push({
      name: field.name,
      type: isNullable ? `${tsType} | null` : tsType,
      optional: isNullable
    });
  }

  return properties;
}

/**
 * Generate entity type statements
 */
function generateEntityTypes(tables: CleanTable[]): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    statements.push(
      createExportedInterface(typeName, buildEntityProperties(table))
    );
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Entity Types');
  }
  return statements;
}

// ============================================================================
// Relation Helper Types Generator (AST-based)
// ============================================================================

/**
 * Generate relation helper type statements (ConnectionResult, PageInfo)
 */
function generateRelationHelperTypes(): t.Statement[] {
  const statements: t.Statement[] = [];

  // ConnectionResult<T> interface with type parameter
  const connectionResultProps: t.TSPropertySignature[] = [
    createPropertySignature('nodes', 'T[]', false),
    createPropertySignature('totalCount', 'number', false),
    createPropertySignature('pageInfo', 'PageInfo', false)
  ];
  const connectionResultBody = t.tsInterfaceBody(connectionResultProps);
  const connectionResultDecl = t.tsInterfaceDeclaration(
    t.identifier('ConnectionResult'),
    t.tsTypeParameterDeclaration([
      t.tsTypeParameter(null, null, 'T')
    ]),
    null,
    connectionResultBody
  );
  statements.push(t.exportNamedDeclaration(connectionResultDecl));

  // PageInfo interface
  statements.push(
    createExportedInterface('PageInfo', [
      { name: 'hasNextPage', type: 'boolean', optional: false },
      { name: 'hasPreviousPage', type: 'boolean', optional: false },
      { name: 'startCursor', type: 'string | null', optional: true },
      { name: 'endCursor', type: 'string | null', optional: true }
    ])
  );

  addSectionComment(statements, 'Relation Helper Types');
  return statements;
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
  if (relatedTable) {
    return getOrderByTypeName(relatedTable);
  }
  // For ManyToMany connection types, don't pluralize - just append OrderBy
  // These types already have a fixed suffix pattern like "UserUsersByFooManyToMany"
  if (tableName.endsWith('ManyToMany')) {
    return `${tableName}OrderBy`;
  }
  return `${pluralize(tableName)}OrderBy`;
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
    const relatedTypeName = getRelatedTypeName(
      relation.referencesTable,
      tableByName
    );
    properties.push({
      name: relation.fieldName,
      type: `${relatedTypeName} | null`,
      optional: true
    });
  }

  for (const relation of table.relations.hasOne) {
    if (!relation.fieldName) continue;
    const relatedTypeName = getRelatedTypeName(
      relation.referencedByTable,
      tableByName
    );
    properties.push({
      name: relation.fieldName,
      type: `${relatedTypeName} | null`,
      optional: true
    });
  }

  for (const relation of table.relations.hasMany) {
    if (!relation.fieldName) continue;
    const relatedTypeName = getRelatedTypeName(
      relation.referencedByTable,
      tableByName
    );
    properties.push({
      name: relation.fieldName,
      type: `ConnectionResult<${relatedTypeName}>`,
      optional: true
    });
  }

  for (const relation of table.relations.manyToMany) {
    if (!relation.fieldName) continue;
    const relatedTypeName = getRelatedTypeName(
      relation.rightTable,
      tableByName
    );
    properties.push({
      name: relation.fieldName,
      type: `ConnectionResult<${relatedTypeName}>`,
      optional: true
    });
  }

  return properties;
}

/**
 * Generate entity relation type statements
 */
function generateEntityRelationTypes(
  tables: CleanTable[],
  tableByName: Map<string, CleanTable>
): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    statements.push(
      createExportedInterface(
        `${typeName}Relations`,
        buildEntityRelationProperties(table, tableByName)
      )
    );
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Entity Relation Types');
  }
  return statements;
}

/**
 * Generate entity types with relations (intersection types)
 */
function generateEntityWithRelations(tables: CleanTable[]): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    statements.push(
      createExportedTypeAlias(
        `${typeName}WithRelations`,
        `${typeName} & ${typeName}Relations`
      )
    );
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Entity Types With Relations');
  }
  return statements;
}

// ============================================================================
// Entity Select Types Generator (AST-based)
// ============================================================================

/**
 * Build the Select type as a TSTypeLiteral
 */
function buildSelectTypeLiteral(
  table: CleanTable,
  tableByName: Map<string, CleanTable>
): t.TSTypeLiteral {
  const members: t.TSTypeElement[] = [];

  // Add scalar fields
  for (const field of table.fields) {
    if (!isRelationField(field.name, table)) {
      const prop = t.tsPropertySignature(
        t.identifier(field.name),
        t.tsTypeAnnotation(t.tsBooleanKeyword())
      );
      prop.optional = true;
      members.push(prop);
    }
  }

  // Add belongsTo relations
  for (const relation of table.relations.belongsTo) {
    if (relation.fieldName) {
      const relatedTypeName = getRelatedTypeName(
        relation.referencesTable,
        tableByName
      );
      const prop = t.tsPropertySignature(
        t.identifier(relation.fieldName),
        t.tsTypeAnnotation(
          t.tsUnionType([
            t.tsBooleanKeyword(),
            t.tsTypeLiteral([
              (() => {
                const selectProp = t.tsPropertySignature(
                  t.identifier('select'),
                  t.tsTypeAnnotation(
                    t.tsTypeReference(t.identifier(`${relatedTypeName}Select`))
                  )
                );
                selectProp.optional = true;
                return selectProp;
              })()
            ])
          ])
        )
      );
      prop.optional = true;
      members.push(prop);
    }
  }

  // Add hasMany relations
  for (const relation of table.relations.hasMany) {
    if (relation.fieldName) {
      const relatedTypeName = getRelatedTypeName(
        relation.referencedByTable,
        tableByName
      );
      const filterName = getRelatedFilterName(
        relation.referencedByTable,
        tableByName
      );
      const orderByName = getRelatedOrderByName(
        relation.referencedByTable,
        tableByName
      );
      const prop = t.tsPropertySignature(
        t.identifier(relation.fieldName),
        t.tsTypeAnnotation(
          t.tsUnionType([
            t.tsBooleanKeyword(),
            t.tsTypeLiteral([
              (() => {
                const p = t.tsPropertySignature(
                  t.identifier('select'),
                  t.tsTypeAnnotation(
                    t.tsTypeReference(t.identifier(`${relatedTypeName}Select`))
                  )
                );
                p.optional = true;
                return p;
              })(),
              (() => {
                const p = t.tsPropertySignature(
                  t.identifier('first'),
                  t.tsTypeAnnotation(t.tsNumberKeyword())
                );
                p.optional = true;
                return p;
              })(),
              (() => {
                const p = t.tsPropertySignature(
                  t.identifier('filter'),
                  t.tsTypeAnnotation(t.tsTypeReference(t.identifier(filterName)))
                );
                p.optional = true;
                return p;
              })(),
              (() => {
                const p = t.tsPropertySignature(
                  t.identifier('orderBy'),
                  t.tsTypeAnnotation(
                    t.tsArrayType(t.tsTypeReference(t.identifier(orderByName)))
                  )
                );
                p.optional = true;
                return p;
              })()
            ])
          ])
        )
      );
      prop.optional = true;
      members.push(prop);
    }
  }

  // Add manyToMany relations
  for (const relation of table.relations.manyToMany) {
    if (relation.fieldName) {
      const relatedTypeName = getRelatedTypeName(
        relation.rightTable,
        tableByName
      );
      const filterName = getRelatedFilterName(relation.rightTable, tableByName);
      const orderByName = getRelatedOrderByName(
        relation.rightTable,
        tableByName
      );
      const prop = t.tsPropertySignature(
        t.identifier(relation.fieldName),
        t.tsTypeAnnotation(
          t.tsUnionType([
            t.tsBooleanKeyword(),
            t.tsTypeLiteral([
              (() => {
                const p = t.tsPropertySignature(
                  t.identifier('select'),
                  t.tsTypeAnnotation(
                    t.tsTypeReference(t.identifier(`${relatedTypeName}Select`))
                  )
                );
                p.optional = true;
                return p;
              })(),
              (() => {
                const p = t.tsPropertySignature(
                  t.identifier('first'),
                  t.tsTypeAnnotation(t.tsNumberKeyword())
                );
                p.optional = true;
                return p;
              })(),
              (() => {
                const p = t.tsPropertySignature(
                  t.identifier('filter'),
                  t.tsTypeAnnotation(t.tsTypeReference(t.identifier(filterName)))
                );
                p.optional = true;
                return p;
              })(),
              (() => {
                const p = t.tsPropertySignature(
                  t.identifier('orderBy'),
                  t.tsTypeAnnotation(
                    t.tsArrayType(t.tsTypeReference(t.identifier(orderByName)))
                  )
                );
                p.optional = true;
                return p;
              })()
            ])
          ])
        )
      );
      prop.optional = true;
      members.push(prop);
    }
  }

  // Add hasOne relations
  for (const relation of table.relations.hasOne) {
    if (relation.fieldName) {
      const relatedTypeName = getRelatedTypeName(
        relation.referencedByTable,
        tableByName
      );
      const prop = t.tsPropertySignature(
        t.identifier(relation.fieldName),
        t.tsTypeAnnotation(
          t.tsUnionType([
            t.tsBooleanKeyword(),
            t.tsTypeLiteral([
              (() => {
                const selectProp = t.tsPropertySignature(
                  t.identifier('select'),
                  t.tsTypeAnnotation(
                    t.tsTypeReference(t.identifier(`${relatedTypeName}Select`))
                  )
                );
                selectProp.optional = true;
                return selectProp;
              })()
            ])
          ])
        )
      );
      prop.optional = true;
      members.push(prop);
    }
  }

  return t.tsTypeLiteral(members);
}

/**
 * Generate entity Select type statements
 */
function generateEntitySelectTypes(
  tables: CleanTable[],
  tableByName: Map<string, CleanTable>
): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    const typeAlias = t.tsTypeAliasDeclaration(
      t.identifier(`${typeName}Select`),
      null,
      buildSelectTypeLiteral(table, tableByName)
    );
    statements.push(t.exportNamedDeclaration(typeAlias));
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Entity Select Types');
  }
  return statements;
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
    const fieldType =
      typeof field.type === 'string' ? field.type : field.type.gqlType;
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
 * Generate table filter type statements
 */
function generateTableFilterTypes(tables: CleanTable[]): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const table of tables) {
    const filterName = getFilterTypeName(table);
    statements.push(
      createExportedInterface(filterName, buildTableFilterProperties(table))
    );
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Table Filter Types');
  }
  return statements;
}

// ============================================================================
// Condition Types Generator (AST-based)
// ============================================================================

/**
 * Build properties for a table condition interface
 * Condition types are simpler than Filter types - they use direct value equality
 */
function buildTableConditionProperties(table: CleanTable): InterfaceProperty[] {
  const properties: InterfaceProperty[] = [];

  for (const field of table.fields) {
    const fieldType =
      typeof field.type === 'string' ? field.type : field.type.gqlType;
    if (isRelationField(field.name, table)) continue;

    // Condition types use the raw scalar type (nullable)
    const tsType = scalarToTsType(fieldType, { unknownScalar: 'unknown' });
    properties.push({
      name: field.name,
      type: `${tsType} | null`,
      optional: true
    });
  }

  return properties;
}

/**
 * Generate table condition type statements
 */
function generateTableConditionTypes(tables: CleanTable[]): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const table of tables) {
    const conditionName = getConditionTypeName(table);
    statements.push(
      createExportedInterface(
        conditionName,
        buildTableConditionProperties(table)
      )
    );
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Table Condition Types');
  }
  return statements;
}

// ============================================================================
// OrderBy Types Generator (AST-based)
// ============================================================================

/**
 * Build OrderBy union type values
 */
function buildOrderByValues(table: CleanTable): string[] {
  const values: string[] = ['PRIMARY_KEY_ASC', 'PRIMARY_KEY_DESC', 'NATURAL'];

  for (const field of table.fields) {
    if (isRelationField(field.name, table)) continue;
    const upperSnake = field.name.replace(/([A-Z])/g, '_$1').toUpperCase();
    values.push(`${upperSnake}_ASC`);
    values.push(`${upperSnake}_DESC`);
  }

  return values;
}

/**
 * Generate OrderBy type statements
 */
function generateOrderByTypes(tables: CleanTable[]): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const table of tables) {
    const enumName = getOrderByTypeName(table);
    const values = buildOrderByValues(table);
    const unionType = createStringLiteralUnion(values);
    const typeAlias = t.tsTypeAliasDeclaration(
      t.identifier(enumName),
      null,
      unionType
    );
    statements.push(t.exportNamedDeclaration(typeAlias));
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'OrderBy Types');
  }
  return statements;
}

// ============================================================================
// CRUD Input Types Generator (AST-based)
// ============================================================================

/**
 * Build the nested data object fields for Create input
 */
function buildCreateDataFields(
  table: CleanTable
): Array<{ name: string; type: string; optional: boolean }> {
  const fields: Array<{ name: string; type: string; optional: boolean }> = [];

  for (const field of table.fields) {
    if (
      EXCLUDED_MUTATION_FIELDS.includes(
        field.name as (typeof EXCLUDED_MUTATION_FIELDS)[number]
      )
    )
      continue;
    if (isRelationField(field.name, table)) continue;

    const fieldType =
      typeof field.type === 'string' ? field.type : field.type.gqlType;
    const tsType = scalarToInputTs(fieldType);
    const isOptional = !field.name.endsWith('Id');

    fields.push({ name: field.name, type: tsType, optional: isOptional });
  }

  return fields;
}

/**
 * Build Create input interface as AST
 */
function buildCreateInputInterface(table: CleanTable): t.ExportNamedDeclaration {
  const { typeName, singularName } = getTableNames(table);
  const fields = buildCreateDataFields(table);

  // Build the nested object type for the entity data
  const nestedProps: t.TSPropertySignature[] = fields.map((field) => {
    const prop = t.tsPropertySignature(
      t.identifier(field.name),
      t.tsTypeAnnotation(parseTypeString(field.type))
    );
    prop.optional = field.optional;
    return prop;
  });

  const nestedObjectType = t.tsTypeLiteral(nestedProps);

  // Build the main interface properties
  const mainProps: t.TSPropertySignature[] = [
    (() => {
      const prop = t.tsPropertySignature(
        t.identifier('clientMutationId'),
        t.tsTypeAnnotation(t.tsStringKeyword())
      );
      prop.optional = true;
      return prop;
    })(),
    t.tsPropertySignature(
      t.identifier(singularName),
      t.tsTypeAnnotation(nestedObjectType)
    )
  ];

  const body = t.tsInterfaceBody(mainProps);
  const interfaceDecl = t.tsInterfaceDeclaration(
    t.identifier(`Create${typeName}Input`),
    null,
    null,
    body
  );
  return t.exportNamedDeclaration(interfaceDecl);
}

/**
 * Build Patch type properties
 */
function buildPatchProperties(table: CleanTable): InterfaceProperty[] {
  const properties: InterfaceProperty[] = [];

  for (const field of table.fields) {
    if (
      EXCLUDED_MUTATION_FIELDS.includes(
        field.name as (typeof EXCLUDED_MUTATION_FIELDS)[number]
      )
    )
      continue;
    if (isRelationField(field.name, table)) continue;

    const fieldType =
      typeof field.type === 'string' ? field.type : field.type.gqlType;
    const tsType = scalarToInputTs(fieldType);

    properties.push({
      name: field.name,
      type: `${tsType} | null`,
      optional: true
    });
  }

  return properties;
}

/**
 * Generate CRUD input type statements for a table
 */
function generateCrudInputTypes(table: CleanTable): t.Statement[] {
  const statements: t.Statement[] = [];
  const { typeName } = getTableNames(table);
  const patchName = `${typeName}Patch`;

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];
  const pkFieldName = pkField?.name ?? 'id';
  const pkFieldTsType = pkField?.tsType ?? 'string';

  // Create input
  statements.push(buildCreateInputInterface(table));

  // Patch interface
  statements.push(
    createExportedInterface(patchName, buildPatchProperties(table))
  );

  // Update input
  statements.push(
    createExportedInterface(`Update${typeName}Input`, [
      { name: 'clientMutationId', type: 'string', optional: true },
      { name: pkFieldName, type: pkFieldTsType, optional: false },
      { name: 'patch', type: patchName, optional: false }
    ])
  );

  // Delete input
  statements.push(
    createExportedInterface(`Delete${typeName}Input`, [
      { name: 'clientMutationId', type: 'string', optional: true },
      { name: pkFieldName, type: pkFieldTsType, optional: false }
    ])
  );

  return statements;
}

/**
 * Generate all CRUD input type statements
 */
function generateAllCrudInputTypes(tables: CleanTable[]): t.Statement[] {
  const statements: t.Statement[] = [];

  for (const table of tables) {
    statements.push(...generateCrudInputTypes(table));
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'CRUD Input Types');
  }
  return statements;
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
 * Build a set of exact table CRUD input type names to skip
 * These are generated by generateAllCrudInputTypes, so we don't need to regenerate them
 */
function buildTableCrudTypeNames(tables: CleanTable[]): Set<string> {
  const crudTypes = new Set<string>();
  for (const table of tables) {
    const { typeName } = getTableNames(table);
    crudTypes.add(`Create${typeName}Input`);
    crudTypes.add(`Update${typeName}Input`);
    crudTypes.add(`Delete${typeName}Input`);
    crudTypes.add(`${typeName}Filter`);
    crudTypes.add(`${typeName}Patch`);
  }
  return crudTypes;
}

/**
 * Generate custom input type statements from TypeRegistry
 */
function generateCustomInputTypes(
  typeRegistry: TypeRegistry,
  usedInputTypes: Set<string>,
  tableCrudTypes?: Set<string>
): t.Statement[] {
  const statements: t.Statement[] = [];
  const generatedTypes = new Set<string>();
  const typesToGenerate = new Set(Array.from(usedInputTypes));

  // Filter out types we've already generated (exact matches for table CRUD types only)
  if (tableCrudTypes) {
    for (const typeName of Array.from(typesToGenerate)) {
      if (tableCrudTypes.has(typeName)) {
        typesToGenerate.delete(typeName);
      }
    }
  }

  // Process all types - no artificial limit
  while (typesToGenerate.size > 0) {
    const typeNameResult = typesToGenerate.values().next();
    if (typeNameResult.done) break;
    const typeName: string = typeNameResult.value;
    typesToGenerate.delete(typeName);

    if (generatedTypes.has(typeName)) continue;
    generatedTypes.add(typeName);

    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo) {
      // Add comment for missing type
      const commentStmt = t.emptyStatement();
      addLineComment(commentStmt, ` Type '${typeName}' not found in schema`);
      statements.push(commentStmt);
      statements.push(
        createExportedTypeAlias(typeName, 'Record<string, unknown>')
      );
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
        if (
          baseType &&
          baseType.endsWith('Input') &&
          !generatedTypes.has(baseType)
        ) {
          typesToGenerate.add(baseType);
        }
      }

      statements.push(createExportedInterface(typeName, properties));
    } else if (typeInfo.kind === 'ENUM' && typeInfo.enumValues) {
      const unionType = createStringLiteralUnion(typeInfo.enumValues);
      const typeAlias = t.tsTypeAliasDeclaration(
        t.identifier(typeName),
        null,
        unionType
      );
      statements.push(t.exportNamedDeclaration(typeAlias));
    } else {
      // Add comment for unsupported type kind
      const commentStmt = t.emptyStatement();
      addLineComment(commentStmt, ` Type '${typeName}' is ${typeInfo.kind}`);
      statements.push(commentStmt);
      statements.push(createExportedTypeAlias(typeName, 'unknown'));
    }
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Custom Input Types (from schema)');
  }
  return statements;
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
    if (baseName) {
      payloadTypes.add(baseName);
    }
  }

  return payloadTypes;
}

/**
 * Generate payload/return type statements
 */
function generatePayloadTypes(
  typeRegistry: TypeRegistry,
  usedPayloadTypes: Set<string>,
  alreadyGeneratedTypes: Set<string>
): t.Statement[] {
  const statements: t.Statement[] = [];
  const generatedTypes = new Set<string>(alreadyGeneratedTypes);
  const typesToGenerate = new Set(Array.from(usedPayloadTypes));

  const skipTypes = new Set<string>([
    'String',
    'Int',
    'Float',
    'Boolean',
    'ID',
    'UUID',
    'Datetime',
    'Date',
    'Time',
    'JSON',
    'BigInt',
    'BigFloat',
    'Cursor',
    'Query',
    'Mutation'
  ]);

  // Process all types - no artificial limit
  while (typesToGenerate.size > 0) {
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
        optional: isNullable
      });

      // Follow nested OBJECT types
      if (
        baseType &&
        !generatedTypes.has(baseType) &&
        !skipTypes.has(baseType)
      ) {
        const nestedType = typeRegistry.get(baseType);
        if (nestedType?.kind === 'OBJECT') {
          typesToGenerate.add(baseType);
        }
      }
    }

    statements.push(createExportedInterface(typeName, interfaceProps));

    // Build Select type
    const selectMembers: t.TSTypeElement[] = [];
    for (const field of typeInfo.fields) {
      const baseType = getTypeBaseName(field.type);
      if (baseType === 'Query' || baseType === 'Mutation') continue;

      const nestedType = baseType ? typeRegistry.get(baseType) : null;
      let propType: t.TSType;
      if (nestedType?.kind === 'OBJECT') {
        propType = t.tsUnionType([
          t.tsBooleanKeyword(),
          t.tsTypeLiteral([
            (() => {
              const p = t.tsPropertySignature(
                t.identifier('select'),
                t.tsTypeAnnotation(
                  t.tsTypeReference(t.identifier(`${baseType}Select`))
                )
              );
              p.optional = true;
              return p;
            })()
          ])
        ]);
      } else {
        propType = t.tsBooleanKeyword();
      }

      const prop = t.tsPropertySignature(
        t.identifier(field.name),
        t.tsTypeAnnotation(propType)
      );
      prop.optional = true;
      selectMembers.push(prop);
    }

    const selectTypeAlias = t.tsTypeAliasDeclaration(
      t.identifier(`${typeName}Select`),
      null,
      t.tsTypeLiteral(selectMembers)
    );
    statements.push(t.exportNamedDeclaration(selectTypeAlias));
  }

  if (statements.length > 0) {
    addSectionComment(statements, 'Payload/Return Types (for custom operations)');
  }
  return statements;
}

// ============================================================================
// Main Generator (AST-based)
// ============================================================================

/**
 * Generate comprehensive input-types.ts file using Babel AST
 */
export function generateInputTypesFile(
  typeRegistry: TypeRegistry,
  usedInputTypes: Set<string>,
  tables?: CleanTable[],
  usedPayloadTypes?: Set<string>
): GeneratedInputTypesFile {
  const statements: t.Statement[] = [];

  // 1. Scalar filter types
  statements.push(...generateScalarFilterTypes());

  // 2. Enum types used by table fields
  if (tables && tables.length > 0) {
    const enumTypes = collectEnumTypesFromTables(tables, typeRegistry);
    statements.push(...generateEnumTypes(typeRegistry, enumTypes));
  }

  // 3. Entity and relation types (if tables provided)
  if (tables && tables.length > 0) {
    const tableByName = new Map(tables.map((table) => [table.name, table]));

    statements.push(...generateEntityTypes(tables));
    statements.push(...generateRelationHelperTypes());
    statements.push(...generateEntityRelationTypes(tables, tableByName));
    statements.push(...generateEntityWithRelations(tables));
    statements.push(...generateEntitySelectTypes(tables, tableByName));

    // 4. Table filter types
    statements.push(...generateTableFilterTypes(tables));

    // 4b. Table condition types (simple equality filter)
    statements.push(...generateTableConditionTypes(tables));

    // 5. OrderBy types
    statements.push(...generateOrderByTypes(tables));

    // 6. CRUD input types
    statements.push(...generateAllCrudInputTypes(tables));
  }

  // 7. Custom input types from TypeRegistry
  const tableCrudTypes = tables ? buildTableCrudTypeNames(tables) : undefined;
  statements.push(
    ...generateCustomInputTypes(typeRegistry, usedInputTypes, tableCrudTypes)
  );

  // 8. Payload/return types for custom operations
  if (usedPayloadTypes && usedPayloadTypes.size > 0) {
    const alreadyGeneratedTypes = new Set<string>();
    if (tables) {
      for (const table of tables) {
        const { typeName } = getTableNames(table);
        alreadyGeneratedTypes.add(typeName);
      }
    }
    statements.push(
      ...generatePayloadTypes(
        typeRegistry,
        usedPayloadTypes,
        alreadyGeneratedTypes
      )
    );
  }

  // Generate code with file header
  const header = getGeneratedFileHeader('GraphQL types for ORM client');
  const code = generateCode(statements);

  return {
    fileName: 'input-types.ts',
    content: header + '\n' + code
  };
}
