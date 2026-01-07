/**
 * Custom operations generator for ORM client
 *
 * Generates db.query.* and db.mutation.* namespaces for non-table operations
 * like login, register, currentUser, etc.
 *
 * Example output:
 * ```typescript
 * // query/index.ts
 * export function createQueryOperations(client: OrmClient) {
 *   return {
 *     currentUser: (args?: { select?: CurrentUserSelect }) =>
 *       new QueryBuilder({ ... }),
 *   };
 * }
 * ```
 */
import type { CleanOperation, CleanArgument } from '../../../types/schema';
import {
  createProject,
  createSourceFile,
  getFormattedOutput,
  createFileHeader,
  createImport,
} from '../ts-ast';
import { ucFirst } from '../utils';
import { typeRefToTsType, isTypeRequired, getTypeBaseName } from '../type-resolver';
import { SCALAR_NAMES } from '../scalars';

export interface GeneratedCustomOpsFile {
  fileName: string;
  content: string;
}

/**
 * Collect all input type names used by operations
 */
function collectInputTypeNamesFromOps(operations: CleanOperation[]): string[] {
  const inputTypes = new Set<string>();

  for (const op of operations) {
    for (const arg of op.args) {
      const baseName = getTypeBaseName(arg.type);
      if (baseName && (baseName.endsWith('Input') || baseName.endsWith('Filter'))) {
        inputTypes.add(baseName);
      }
    }
  }

  return Array.from(inputTypes);
}

// Types that don't need Select types
const NON_SELECT_TYPES = new Set<string>([...SCALAR_NAMES, 'Query', 'Mutation']);

/**
 * Collect all payload/return type names from operations (for Select types)
 * Filters out scalar types
 */
function collectPayloadTypeNamesFromOps(operations: CleanOperation[]): string[] {
  const payloadTypes = new Set<string>();

  for (const op of operations) {
    const baseName = getTypeBaseName(op.returnType);
    if (baseName && 
        !baseName.endsWith('Connection') && 
        baseName !== 'Query' && 
        baseName !== 'Mutation' &&
        !NON_SELECT_TYPES.has(baseName)) {
      payloadTypes.add(baseName);
    }
  }

  return Array.from(payloadTypes);
}

/**
 * Get the Select type name for a return type
 * Returns null for scalar types, Connection types (no select needed)
 */
function getSelectTypeName(returnType: CleanArgument['type']): string | null {
  const baseName = getTypeBaseName(returnType);
  if (baseName && 
      !NON_SELECT_TYPES.has(baseName) && 
      baseName !== 'Query' && 
      baseName !== 'Mutation' &&
      !baseName.endsWith('Connection')) {
    return `${baseName}Select`;
  }
  return null;
}

/**
 * Generate the query/index.ts file for custom query operations
 */
export function generateCustomQueryOpsFile(
  operations: CleanOperation[]
): GeneratedCustomOpsFile {
  const project = createProject();
  const sourceFile = createSourceFile(project, 'index.ts');

  // Collect all input type names and payload type names
  const inputTypeNames = collectInputTypeNamesFromOps(operations);
  const payloadTypeNames = collectPayloadTypeNamesFromOps(operations);
  
  // Generate Select type names for payloads
  const selectTypeNames = payloadTypeNames.map((p) => `${p}Select`);
  
  // Combine all type imports
  const allTypeImports = [...new Set([...inputTypeNames, ...payloadTypeNames, ...selectTypeNames])];

  // Add file header
  sourceFile.insertText(
    0,
    createFileHeader('Custom query operations') + '\n\n'
  );

  // Add imports
  sourceFile.addImportDeclarations([
    createImport({
      moduleSpecifier: '../client',
      namedImports: ['OrmClient'],
    }),
    createImport({
      moduleSpecifier: '../query-builder',
      namedImports: ['QueryBuilder', 'buildCustomDocument'],
    }),
    createImport({
      moduleSpecifier: '../select-types',
      typeOnlyNamedImports: ['InferSelectResult'],
    }),
  ]);

  // Import types from input-types if we have any
  if (allTypeImports.length > 0) {
    sourceFile.addImportDeclarations([
      createImport({
        moduleSpecifier: '../input-types',
        typeOnlyNamedImports: allTypeImports,
      }),
    ]);
  }

  // Generate variable definitions type for each operation
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Variable Types');
  sourceFile.addStatements('// ============================================================================\n');

  for (const op of operations) {
    if (op.args.length > 0) {
      const varTypeName = `${ucFirst(op.name)}Variables`;
      const props = op.args.map((arg) => {
        const optional = !isTypeRequired(arg.type);
        return `${arg.name}${optional ? '?' : ''}: ${typeRefToTsType(arg.type)};`;
      });
      sourceFile.addStatements(`export interface ${varTypeName} {\n  ${props.join('\n  ')}\n}\n`);
    }
  }

  // Generate factory function
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Query Operations Factory');
  sourceFile.addStatements('// ============================================================================\n');

  // Build the operations object
  const operationMethods = operations.map((op) => {
    const hasArgs = op.args.length > 0;
    const varTypeName = `${ucFirst(op.name)}Variables`;
    const varDefs = op.args.map((arg) => ({
      name: arg.name,
      type: formatGraphQLType(arg.type),
    }));
    const varDefsJson = JSON.stringify(varDefs);
    
    // Get Select type for return type
    const selectTypeName = getSelectTypeName(op.returnType);
    const payloadTypeName = getTypeBaseName(op.returnType);
    
    // Use typed select if available, otherwise fall back to Record<string, unknown>
    const selectType = selectTypeName ?? 'Record<string, unknown>';
    const returnTypePart = selectTypeName && payloadTypeName
      ? `{ ${op.name}: InferSelectResult<${payloadTypeName}, S> }`
      : 'unknown';

    if (hasArgs) {
      if (selectTypeName) {
        return `${op.name}: <const S extends ${selectType}>(args: ${varTypeName}, options?: { select?: S }) =>
      new QueryBuilder<${returnTypePart}>({
        client,
        operation: 'query',
        operationName: '${ucFirst(op.name)}',
        fieldName: '${op.name}',
        ...buildCustomDocument('query', '${ucFirst(op.name)}', '${op.name}', options?.select, args, ${varDefsJson}),
      })`;
      } else {
        return `${op.name}: (args: ${varTypeName}, options?: { select?: Record<string, unknown> }) =>
      new QueryBuilder({
        client,
        operation: 'query',
        operationName: '${ucFirst(op.name)}',
        fieldName: '${op.name}',
        ...buildCustomDocument('query', '${ucFirst(op.name)}', '${op.name}', options?.select, args, ${varDefsJson}),
      })`;
      }
    } else {
      // No args - still provide typed select
      if (selectTypeName) {
        return `${op.name}: <const S extends ${selectType}>(options?: { select?: S }) =>
      new QueryBuilder<${returnTypePart}>({
        client,
        operation: 'query',
        operationName: '${ucFirst(op.name)}',
        fieldName: '${op.name}',
        ...buildCustomDocument('query', '${ucFirst(op.name)}', '${op.name}', options?.select, undefined, []),
      })`;
      } else {
        return `${op.name}: (options?: { select?: Record<string, unknown> }) =>
      new QueryBuilder({
        client,
        operation: 'query',
        operationName: '${ucFirst(op.name)}',
        fieldName: '${op.name}',
        ...buildCustomDocument('query', '${ucFirst(op.name)}', '${op.name}', options?.select, undefined, []),
      })`;
      }
    }
  });

  sourceFile.addFunction({
    name: 'createQueryOperations',
    isExported: true,
    parameters: [{ name: 'client', type: 'OrmClient' }],
    statements: `return {
    ${operationMethods.join(',\n    ')},
  };`,
  });

  return {
    fileName: 'query/index.ts',
    content: getFormattedOutput(sourceFile),
  };
}

/**
 * Generate the mutation/index.ts file for custom mutation operations
 */
export function generateCustomMutationOpsFile(
  operations: CleanOperation[]
): GeneratedCustomOpsFile {
  const project = createProject();
  const sourceFile = createSourceFile(project, 'index.ts');

  // Collect all input type names and payload type names
  const inputTypeNames = collectInputTypeNamesFromOps(operations);
  const payloadTypeNames = collectPayloadTypeNamesFromOps(operations);
  
  // Generate Select type names for payloads
  const selectTypeNames = payloadTypeNames.map((p) => `${p}Select`);
  
  // Combine all type imports
  const allTypeImports = [...new Set([...inputTypeNames, ...payloadTypeNames, ...selectTypeNames])];

  // Add file header
  sourceFile.insertText(
    0,
    createFileHeader('Custom mutation operations') + '\n\n'
  );

  // Add imports
  sourceFile.addImportDeclarations([
    createImport({
      moduleSpecifier: '../client',
      namedImports: ['OrmClient'],
    }),
    createImport({
      moduleSpecifier: '../query-builder',
      namedImports: ['QueryBuilder', 'buildCustomDocument'],
    }),
    createImport({
      moduleSpecifier: '../select-types',
      typeOnlyNamedImports: ['InferSelectResult'],
    }),
  ]);

  // Import types from input-types if we have any
  if (allTypeImports.length > 0) {
    sourceFile.addImportDeclarations([
      createImport({
        moduleSpecifier: '../input-types',
        typeOnlyNamedImports: allTypeImports,
      }),
    ]);
  }

  // Generate variable definitions type for each operation
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Variable Types');
  sourceFile.addStatements('// ============================================================================\n');

  for (const op of operations) {
    if (op.args.length > 0) {
      const varTypeName = `${ucFirst(op.name)}Variables`;
      const props = op.args.map((arg) => {
        const optional = !isTypeRequired(arg.type);
        return `${arg.name}${optional ? '?' : ''}: ${typeRefToTsType(arg.type)};`;
      });
      sourceFile.addStatements(`export interface ${varTypeName} {\n  ${props.join('\n  ')}\n}\n`);
    }
  }

  // Generate factory function
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Mutation Operations Factory');
  sourceFile.addStatements('// ============================================================================\n');

  // Build the operations object
  const operationMethods = operations.map((op) => {
    const hasArgs = op.args.length > 0;
    const varTypeName = `${ucFirst(op.name)}Variables`;
    const varDefs = op.args.map((arg) => ({
      name: arg.name,
      type: formatGraphQLType(arg.type),
    }));
    const varDefsJson = JSON.stringify(varDefs);
    
    // Get Select type for return type
    const selectTypeName = getSelectTypeName(op.returnType);
    const payloadTypeName = getTypeBaseName(op.returnType);
    
    // Use typed select if available, otherwise fall back to Record<string, unknown>
    const selectType = selectTypeName ?? 'Record<string, unknown>';
    const returnTypePart = selectTypeName && payloadTypeName
      ? `{ ${op.name}: InferSelectResult<${payloadTypeName}, S> }`
      : 'unknown';

    if (hasArgs) {
      if (selectTypeName) {
        return `${op.name}: <const S extends ${selectType}>(args: ${varTypeName}, options?: { select?: S }) =>
      new QueryBuilder<${returnTypePart}>({
        client,
        operation: 'mutation',
        operationName: '${ucFirst(op.name)}',
        fieldName: '${op.name}',
        ...buildCustomDocument('mutation', '${ucFirst(op.name)}', '${op.name}', options?.select, args, ${varDefsJson}),
      })`;
      } else {
        return `${op.name}: (args: ${varTypeName}, options?: { select?: Record<string, unknown> }) =>
      new QueryBuilder({
        client,
        operation: 'mutation',
        operationName: '${ucFirst(op.name)}',
        fieldName: '${op.name}',
        ...buildCustomDocument('mutation', '${ucFirst(op.name)}', '${op.name}', options?.select, args, ${varDefsJson}),
      })`;
      }
    } else {
      // No args - still provide typed select
      if (selectTypeName) {
        return `${op.name}: <const S extends ${selectType}>(options?: { select?: S }) =>
      new QueryBuilder<${returnTypePart}>({
        client,
        operation: 'mutation',
        operationName: '${ucFirst(op.name)}',
        fieldName: '${op.name}',
        ...buildCustomDocument('mutation', '${ucFirst(op.name)}', '${op.name}', options?.select, undefined, []),
      })`;
      } else {
        return `${op.name}: (options?: { select?: Record<string, unknown> }) =>
      new QueryBuilder({
        client,
        operation: 'mutation',
        operationName: '${ucFirst(op.name)}',
        fieldName: '${op.name}',
        ...buildCustomDocument('mutation', '${ucFirst(op.name)}', '${op.name}', options?.select, undefined, []),
      })`;
      }
    }
  });

  sourceFile.addFunction({
    name: 'createMutationOperations',
    isExported: true,
    parameters: [{ name: 'client', type: 'OrmClient' }],
    statements: `return {
    ${operationMethods.join(',\n    ')},
  };`,
  });

  return {
    fileName: 'mutation/index.ts',
    content: getFormattedOutput(sourceFile),
  };
}

/**
 * Format a CleanTypeRef to GraphQL type string
 */
function formatGraphQLType(typeRef: CleanArgument['type']): string {
  let result = '';

  if (typeRef.kind === 'NON_NULL') {
    if (typeRef.ofType) {
      result = formatGraphQLType(typeRef.ofType as CleanArgument['type']) + '!';
    } else {
      result = (typeRef.name ?? 'String') + '!';
    }
  } else if (typeRef.kind === 'LIST') {
    if (typeRef.ofType) {
      result = `[${formatGraphQLType(typeRef.ofType as CleanArgument['type'])}]`;
    } else {
      result = '[String]';
    }
  } else {
    result = typeRef.name ?? 'String';
  }

  return result;
}
