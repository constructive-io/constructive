/**
 * Types generator - generates types.ts with entity interfaces using AST
 */
import type { CleanTable } from '../../types/schema';
import {
  createProject,
  createSourceFile,
  getFormattedOutput,
  createFileHeader,
  createImport,
  createInterface,
  type InterfaceProperty,
} from './ts-ast';
import { getScalarFields, fieldTypeToTs } from './utils';

// ============================================================================
// Filter Types Configuration
// ============================================================================

type FilterOps = 'equality' | 'distinct' | 'inArray' | 'comparison' | 'string' | 'json' | 'inet' | 'fulltext' | 'listArray';

/** All filter type configurations - scalar and list filters */
const FILTER_CONFIGS: Array<{ name: string; tsType: string; operators: FilterOps[] }> = [
  // Scalar filters
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
  // List filters
  { name: 'StringListFilter', tsType: 'string[]', operators: ['equality', 'distinct', 'comparison', 'listArray'] },
  { name: 'IntListFilter', tsType: 'number[]', operators: ['equality', 'distinct', 'comparison', 'listArray'] },
  { name: 'UUIDListFilter', tsType: 'string[]', operators: ['equality', 'distinct', 'comparison', 'listArray'] },
];

/** Build filter properties based on operator sets */
function buildFilterProperties(tsType: string, operators: FilterOps[]): InterfaceProperty[] {
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

  // In array operators
  if (operators.includes('inArray')) {
    props.push(
      { name: 'in', type: `${tsType}[]`, optional: true },
      { name: 'notIn', type: `${tsType}[]`, optional: true },
    );
  }

  // Comparison operators (lt, lte, gt, gte)
  if (operators.includes('comparison')) {
    props.push(
      { name: 'lessThan', type: tsType, optional: true },
      { name: 'lessThanOrEqualTo', type: tsType, optional: true },
      { name: 'greaterThan', type: tsType, optional: true },
      { name: 'greaterThanOrEqualTo', type: tsType, optional: true },
    );
  }

  // String-specific operators
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

  // JSON-specific operators
  if (operators.includes('json')) {
    props.push(
      { name: 'contains', type: 'unknown', optional: true },
      { name: 'containedBy', type: 'unknown', optional: true },
      { name: 'containsKey', type: 'string', optional: true },
      { name: 'containsAllKeys', type: 'string[]', optional: true },
      { name: 'containsAnyKeys', type: 'string[]', optional: true },
    );
  }

  // Internet address operators
  if (operators.includes('inet')) {
    props.push(
      { name: 'contains', type: 'string', optional: true },
      { name: 'containedBy', type: 'string', optional: true },
      { name: 'containsOrContainedBy', type: 'string', optional: true },
    );
  }

  // Full-text search operator
  if (operators.includes('fulltext')) {
    props.push({ name: 'matches', type: 'string', optional: true });
  }

  // List/Array operators (for StringListFilter, IntListFilter, etc.)
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
      { name: 'anyGreaterThanOrEqualTo', type: baseType, optional: true },
    );
  }

  return props;
}

/**
 * Options for generating types.ts
 */
export interface GenerateTypesOptions {
  /** Enum type names that are available from schema-types.ts */
  enumsFromSchemaTypes?: string[];
}

/**
 * Generate types.ts content with all entity interfaces and base filter types
 */
export function generateTypesFile(
  tables: CleanTable[],
  options: GenerateTypesOptions = {}
): string {
  const { enumsFromSchemaTypes = [] } = options;
  const enumSet = new Set(enumsFromSchemaTypes);

  const project = createProject();
  const sourceFile = createSourceFile(project, 'types.ts');

  // Add file header
  sourceFile.insertText(0, createFileHeader('Entity types and filter types') + '\n\n');

  // Collect which enums are actually used by entity fields
  const usedEnums = new Set<string>();
  for (const table of tables) {
    const scalarFields = getScalarFields(table);
    for (const field of scalarFields) {
      // Check if the field's gqlType matches any known enum
      const cleanType = field.type.gqlType.replace(/!/g, '');
      if (enumSet.has(cleanType)) {
        usedEnums.add(cleanType);
      }
    }
  }

  // Add import for enum types from schema-types if any are used
  if (usedEnums.size > 0) {
    sourceFile.addImportDeclaration(
      createImport({
        moduleSpecifier: './schema-types',
        typeOnlyNamedImports: Array.from(usedEnums).sort(),
      })
    );
    sourceFile.addStatements('');
  }

  // Add section comment for entity types
  sourceFile.addStatements('// ============================================================================');
  sourceFile.addStatements('// Entity types');
  sourceFile.addStatements('// ============================================================================\n');

  // Generate entity interfaces
  for (const table of tables) {
    const scalarFields = getScalarFields(table);

    const properties: InterfaceProperty[] = scalarFields.map((field) => ({
      name: field.name,
      type: `${fieldTypeToTs(field.type)} | null`,
    }));

    sourceFile.addInterface(createInterface(table.name, properties));
  }

  // Add section comment for filter types
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Filter types (shared PostGraphile filter interfaces)');
  sourceFile.addStatements('// ============================================================================\n');

  // Generate all filter types
  for (const { name, tsType, operators } of FILTER_CONFIGS) {
    sourceFile.addInterface(createInterface(name, buildFilterProperties(tsType, operators)));
  }

  return getFormattedOutput(sourceFile);
}
