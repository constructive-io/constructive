/**
 * Schema types generator for React Query hooks (non-ORM mode)
 *
 * Generates TypeScript interfaces for:
 * 1. INPUT_OBJECT types (e.g., BootstrapUserInput, LoginInput)
 * 2. Payload OBJECT types (e.g., BootstrapUserPayload, LoginPayload)
 * 3. ENUM types (e.g., FieldCategory, TableCategory)
 *
 * These types are referenced by custom mutation/query hooks but not generated
 * elsewhere in non-ORM mode.
 *
 * Uses ts-morph for robust AST-based code generation.
 */
import type { SourceFile } from 'ts-morph';
import type {
  TypeRegistry,
  CleanArgument,
  ResolvedType,
} from '../../types/schema';
import {
  createProject,
  createSourceFile,
  getMinimalFormattedOutput,
  createFileHeader,
  createInterface,
  createTypeAlias,
  addSectionComment,
  type InterfaceProperty,
} from './ts-ast';
import { getTypeBaseName } from './type-resolver';
import {
  scalarToTsType,
  SCALAR_NAMES,
  BASE_FILTER_TYPE_NAMES,
} from './scalars';

export interface GeneratedSchemaTypesFile {
  fileName: string;
  content: string;
  /** List of enum type names that were generated */
  generatedEnums: string[];
  /** List of table entity types that are referenced */
  referencedTableTypes: string[];
}

export interface GenerateSchemaTypesOptions {
  /** The TypeRegistry containing all GraphQL types */
  typeRegistry: TypeRegistry;
  /** Type names that already exist in types.ts (table entity types) */
  tableTypeNames: Set<string>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Types that should not be generated (scalars, built-ins, types generated elsewhere)
 */
const SKIP_TYPES = new Set([
  ...SCALAR_NAMES,
  // GraphQL built-ins
  'Query',
  'Mutation',
  'Subscription',
  '__Schema',
  '__Type',
  '__Field',
  '__InputValue',
  '__EnumValue',
  '__Directive',
  // Note: PageInfo and Cursor are NOT skipped - they're needed by Connection types
  // Base filter types (generated in types.ts via filters.ts)
  ...BASE_FILTER_TYPE_NAMES,
]);

/**
 * Type name patterns to skip (regex patterns)
 *
 * Note: We intentionally DO NOT skip Connection, Edge, Filter, Patch, Condition,
 * or OrderBy types because they may be referenced by custom operations.
 * Previously Condition and OrderBy were skipped but they ARE needed for
 * custom queries like `schemata`, `apiSchemata`, etc.
 */
const SKIP_TYPE_PATTERNS: RegExp[] = [
  // Currently no patterns are skipped - all types may be needed by custom operations
];

// ============================================================================
// Type Conversion Utilities
// ============================================================================

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
  return scalarToTsType(name, { unknownScalar: 'name' });
}

/**
 * Check if a type is required (NON_NULL)
 */
function isRequired(typeRef: CleanArgument['type']): boolean {
  return typeRef.kind === 'NON_NULL';
}

/**
 * Check if a type should be skipped
 */
function shouldSkipType(
  typeName: string,
  tableTypeNames: Set<string>
): boolean {
  // Skip scalars and built-ins
  if (SKIP_TYPES.has(typeName)) return true;

  // Skip table entity types (already in types.ts)
  if (tableTypeNames.has(typeName)) return true;

  // Skip types matching patterns
  for (const pattern of SKIP_TYPE_PATTERNS) {
    if (pattern.test(typeName)) return true;
  }

  // Skip table-specific types that would conflict with inline types in table-based hooks.
  // Note: Patch and CreateInput are now NOT exported from hooks (isExported: false),
  // so we only skip Filter types here.
  // The Filter and OrderBy types are generated inline (non-exported) by table query hooks,
  // but schema-types should still generate them for custom operations that need them.
  // Actually, we don't skip any table-based types now since hooks don't export them.

  return false;
}

// ============================================================================
// ENUM Types Generator
// ============================================================================

/**
 * Add ENUM types to source file
 */
function addEnumTypes(
  sourceFile: SourceFile,
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>
): Set<string> {
  const generatedTypes = new Set<string>();

  addSectionComment(sourceFile, 'Enum Types');

  for (const [typeName, typeInfo] of typeRegistry) {
    if (typeInfo.kind !== 'ENUM') continue;
    if (shouldSkipType(typeName, tableTypeNames)) continue;
    if (!typeInfo.enumValues || typeInfo.enumValues.length === 0) continue;

    const values = typeInfo.enumValues.map((v) => `'${v}'`).join(' | ');
    sourceFile.addTypeAlias(createTypeAlias(typeName, values));
    generatedTypes.add(typeName);
  }

  return generatedTypes;
}

// ============================================================================
// INPUT_OBJECT Types Generator
// ============================================================================

/**
 * Add INPUT_OBJECT types to source file
 * Uses iteration to handle nested input types
 */
function addInputObjectTypes(
  sourceFile: SourceFile,
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>,
  alreadyGenerated: Set<string>
): Set<string> {
  const generatedTypes = new Set<string>(alreadyGenerated);
  const typesToGenerate = new Set<string>();

  // Collect all INPUT_OBJECT types
  for (const [typeName, typeInfo] of typeRegistry) {
    if (typeInfo.kind !== 'INPUT_OBJECT') continue;
    if (shouldSkipType(typeName, tableTypeNames)) continue;
    if (generatedTypes.has(typeName)) continue;
    typesToGenerate.add(typeName);
  }

  if (typesToGenerate.size === 0) return generatedTypes;

  addSectionComment(sourceFile, 'Input Object Types');

  // Process all types - no artificial limit
  while (typesToGenerate.size > 0) {
    const typeNameResult = typesToGenerate.values().next();
    if (typeNameResult.done) break;
    const typeName: string = typeNameResult.value;
    typesToGenerate.delete(typeName);

    if (generatedTypes.has(typeName)) continue;

    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo || typeInfo.kind !== 'INPUT_OBJECT') continue;

    generatedTypes.add(typeName);

    if (typeInfo.inputFields && typeInfo.inputFields.length > 0) {
      const properties: InterfaceProperty[] = [];

      for (const field of typeInfo.inputFields) {
        const optional = !isRequired(field.type);
        const tsType = typeRefToTs(field.type);
        properties.push({
          name: field.name,
          type: tsType,
          optional,
          docs: field.description ? [field.description] : undefined,
        });

        // Follow nested Input types
        const baseType = getTypeBaseName(field.type);
        if (
          baseType &&
          !generatedTypes.has(baseType) &&
          !shouldSkipType(baseType, tableTypeNames)
        ) {
          const nestedType = typeRegistry.get(baseType);
          if (nestedType?.kind === 'INPUT_OBJECT') {
            typesToGenerate.add(baseType);
          }
        }
      }

      sourceFile.addInterface(createInterface(typeName, properties));
    } else {
      // Empty input object
      sourceFile.addInterface(createInterface(typeName, []));
    }
  }

  return generatedTypes;
}

// ============================================================================
// UNION Types Generator
// ============================================================================

/**
 * Add UNION types to source file
 */
function addUnionTypes(
  sourceFile: SourceFile,
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>,
  alreadyGenerated: Set<string>
): Set<string> {
  const generatedTypes = new Set<string>(alreadyGenerated);
  const unionTypesToGenerate = new Set<string>();

  // Collect all UNION types
  for (const [typeName, typeInfo] of typeRegistry) {
    if (typeInfo.kind !== 'UNION') continue;
    if (shouldSkipType(typeName, tableTypeNames)) continue;
    if (generatedTypes.has(typeName)) continue;
    unionTypesToGenerate.add(typeName);
  }

  if (unionTypesToGenerate.size === 0) return generatedTypes;

  addSectionComment(sourceFile, 'Union Types');

  for (const typeName of unionTypesToGenerate) {
    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo || typeInfo.kind !== 'UNION') continue;
    if (!typeInfo.possibleTypes || typeInfo.possibleTypes.length === 0)
      continue;

    // Generate union type as TypeScript union
    const unionMembers = typeInfo.possibleTypes.join(' | ');
    sourceFile.addTypeAlias(createTypeAlias(typeName, unionMembers));
    generatedTypes.add(typeName);
  }

  return generatedTypes;
}

// ============================================================================
// Payload/Return OBJECT Types Generator
// ============================================================================

export interface PayloadTypesResult {
  generatedTypes: Set<string>;
  referencedTableTypes: Set<string>;
}

/**
 * Collect return types from Query and Mutation root types
 * This dynamically discovers what OBJECT types need to be generated
 * based on actual schema structure, not pattern matching
 */
function collectReturnTypesFromRootTypes(
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>
): Set<string> {
  const returnTypes = new Set<string>();

  // Get Query and Mutation root types
  const queryType = typeRegistry.get('Query');
  const mutationType = typeRegistry.get('Mutation');

  const processFields = (fields: ResolvedType['fields']) => {
    if (!fields) return;
    for (const field of fields) {
      const baseType = getTypeBaseName(field.type);
      if (baseType && !shouldSkipType(baseType, tableTypeNames)) {
        const typeInfo = typeRegistry.get(baseType);
        if (typeInfo?.kind === 'OBJECT') {
          returnTypes.add(baseType);
        }
      }
    }
  };

  if (queryType?.fields) processFields(queryType.fields);
  if (mutationType?.fields) processFields(mutationType.fields);

  return returnTypes;
}

/**
 * Add Payload OBJECT types to source file
 * These are return types from mutations (e.g., LoginPayload, BootstrapUserPayload)
 *
 * Also tracks which table entity types are referenced so they can be imported.
 *
 * Uses dynamic type discovery from Query/Mutation return types instead of pattern matching.
 */
function addPayloadObjectTypes(
  sourceFile: SourceFile,
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>,
  alreadyGenerated: Set<string>
): PayloadTypesResult {
  const generatedTypes = new Set<string>(alreadyGenerated);
  const referencedTableTypes = new Set<string>();

  // Dynamically collect return types from Query and Mutation
  const typesToGenerate = collectReturnTypesFromRootTypes(
    typeRegistry,
    tableTypeNames
  );

  // Filter out already generated types
  for (const typeName of Array.from(typesToGenerate)) {
    if (generatedTypes.has(typeName)) {
      typesToGenerate.delete(typeName);
    }
  }

  if (typesToGenerate.size === 0) {
    return { generatedTypes, referencedTableTypes };
  }

  addSectionComment(sourceFile, 'Payload/Return Object Types');

  // Process all types - no artificial limit
  while (typesToGenerate.size > 0) {
    const typeNameResult = typesToGenerate.values().next();
    if (typeNameResult.done) break;
    const typeName: string = typeNameResult.value;
    typesToGenerate.delete(typeName);

    if (generatedTypes.has(typeName)) continue;

    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo || typeInfo.kind !== 'OBJECT') continue;

    generatedTypes.add(typeName);

    if (typeInfo.fields && typeInfo.fields.length > 0) {
      const properties: InterfaceProperty[] = [];

      for (const field of typeInfo.fields) {
        const baseType = getTypeBaseName(field.type);

        // Skip Query and Mutation fields
        if (baseType === 'Query' || baseType === 'Mutation') continue;

        const tsType = typeRefToTs(field.type);
        const isNullable = !isRequired(field.type);

        properties.push({
          name: field.name,
          type: isNullable ? `${tsType} | null` : tsType,
          optional: isNullable,
          docs: field.description ? [field.description] : undefined,
        });

        // Track table entity types that are referenced
        if (baseType && tableTypeNames.has(baseType)) {
          referencedTableTypes.add(baseType);
        }

        // Follow nested OBJECT types that aren't table types
        if (
          baseType &&
          !generatedTypes.has(baseType) &&
          !shouldSkipType(baseType, tableTypeNames)
        ) {
          const nestedType = typeRegistry.get(baseType);
          if (nestedType?.kind === 'OBJECT') {
            typesToGenerate.add(baseType);
          }
        }
      }

      sourceFile.addInterface(createInterface(typeName, properties));
    } else {
      // Empty payload object
      sourceFile.addInterface(createInterface(typeName, []));
    }
  }

  return { generatedTypes, referencedTableTypes };
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate comprehensive schema-types.ts file using ts-morph AST
 *
 * This generates all Input/Payload/Enum types from the TypeRegistry
 * that are needed by custom mutation/query hooks.
 */
export function generateSchemaTypesFile(
  options: GenerateSchemaTypesOptions
): GeneratedSchemaTypesFile {
  const { typeRegistry, tableTypeNames } = options;

  const project = createProject();
  const sourceFile = createSourceFile(project, 'schema-types.ts');

  // Add file header
  sourceFile.insertText(
    0,
    createFileHeader('GraphQL schema types for custom operations') + '\n'
  );

  // Track all generated types
  let generatedTypes = new Set<string>();

  // 1. Generate ENUM types
  const enumTypes = addEnumTypes(sourceFile, typeRegistry, tableTypeNames);
  generatedTypes = new Set([...generatedTypes, ...enumTypes]);

  // 2. Generate UNION types
  const unionTypes = addUnionTypes(
    sourceFile,
    typeRegistry,
    tableTypeNames,
    generatedTypes
  );
  generatedTypes = new Set([...generatedTypes, ...unionTypes]);

  // 3. Generate INPUT_OBJECT types
  const inputTypes = addInputObjectTypes(
    sourceFile,
    typeRegistry,
    tableTypeNames,
    generatedTypes
  );
  generatedTypes = new Set([...generatedTypes, ...inputTypes]);

  // 4. Generate Payload OBJECT types
  const payloadResult = addPayloadObjectTypes(
    sourceFile,
    typeRegistry,
    tableTypeNames,
    generatedTypes
  );

  // 5. Add imports from types.ts (table entity types + base filter types)
  const referencedTableTypes = Array.from(
    payloadResult.referencedTableTypes
  ).sort();
  // Always import base filter types since generated Filter interfaces reference them
  const baseFilterImports = Array.from(BASE_FILTER_TYPE_NAMES).sort();
  const allTypesImports = [...referencedTableTypes, ...baseFilterImports];

  if (allTypesImports.length > 0) {
    // Insert import after the file header comment
    const importStatement = `import type { ${allTypesImports.join(', ')} } from './types';\n\n`;
    // Find position after header (after first */ + newlines)
    const headerEndIndex = sourceFile.getFullText().indexOf('*/') + 3;
    sourceFile.insertText(headerEndIndex, '\n' + importStatement);
  }

  return {
    fileName: 'schema-types.ts',
    content: getMinimalFormattedOutput(sourceFile),
    generatedEnums: Array.from(enumTypes).sort(),
    referencedTableTypes,
  };
}
