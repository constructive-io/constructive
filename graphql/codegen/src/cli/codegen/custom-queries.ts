/**
 * Custom query hook generators for non-table operations
 *
 * Generates hooks for operations discovered via schema introspection
 * that are NOT table CRUD operations (e.g., currentUser, nodeById, etc.)
 *
 * Output structure:
 * queries/
 *   useCurrentUserQuery.ts
 *   useNodeQuery.ts
 *   ...
 */
import type {
  CleanOperation,
  CleanArgument,
  TypeRegistry,
} from '../../types/schema';
import {
  createProject,
  createSourceFile,
  getFormattedOutput,
  createFileHeader,
  createImport,
  createInterface,
  createConst,
  type InterfaceProperty,
} from './ts-ast';
import { buildCustomQueryString } from './schema-gql-ast';
import {
  typeRefToTsType,
  isTypeRequired,
  getOperationHookName,
  getOperationFileName,
  getOperationVariablesTypeName,
  getOperationResultTypeName,
  getDocumentConstName,
  getQueryKeyName,
} from './type-resolver';
import { ucFirst } from './utils';

export interface GeneratedCustomQueryFile {
  fileName: string;
  content: string;
  operationName: string;
}

// ============================================================================
// Single custom query hook generator
// ============================================================================

export interface GenerateCustomQueryHookOptions {
  operation: CleanOperation;
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  /** Whether to generate React Query hooks (default: true for backwards compatibility) */
  reactQueryEnabled?: boolean;
}

/**
 * Generate a custom query hook file
 */
export function generateCustomQueryHook(
  options: GenerateCustomQueryHookOptions
): GeneratedCustomQueryFile {
  const { operation, typeRegistry, maxDepth = 2, skipQueryField = true, reactQueryEnabled = true } = options;

  const project = createProject();
  const hookName = getOperationHookName(operation.name, 'query');
  const fileName = getOperationFileName(operation.name, 'query');
  const variablesTypeName = getOperationVariablesTypeName(operation.name, 'query');
  const resultTypeName = getOperationResultTypeName(operation.name, 'query');
  const documentConstName = getDocumentConstName(operation.name, 'query');
  const queryKeyName = getQueryKeyName(operation.name);

  // Generate GraphQL document
  const queryDocument = buildCustomQueryString({
    operation,
    typeRegistry,
    maxDepth,
    skipQueryField,
  });

  const sourceFile = createSourceFile(project, fileName);

  // Add file header
  const headerText = reactQueryEnabled
    ? `Custom query hook for ${operation.name}`
    : `Custom query functions for ${operation.name}`;
  sourceFile.insertText(0, createFileHeader(headerText) + '\n\n');

  // Add imports - conditionally include React Query imports
  const imports = [];
  if (reactQueryEnabled) {
    imports.push(
      createImport({
        moduleSpecifier: '@tanstack/react-query',
        namedImports: ['useQuery'],
        typeOnlyNamedImports: ['UseQueryOptions', 'QueryClient'],
      })
    );
  }
  imports.push(
    createImport({
      moduleSpecifier: '../client',
      namedImports: ['execute'],
      typeOnlyNamedImports: ['ExecuteOptions'],
    })
  );
  sourceFile.addImportDeclarations(imports);

  // Add query document constant
  sourceFile.addVariableStatement(
    createConst(documentConstName, '`\n' + queryDocument + '`', {
      docs: ['GraphQL query document'],
    })
  );

  // Generate variables interface if there are arguments
  if (operation.args.length > 0) {
    const variablesProps = generateVariablesProperties(operation.args);
    sourceFile.addInterface(createInterface(variablesTypeName, variablesProps));
  }

  // Generate result interface
  const resultType = typeRefToTsType(operation.returnType);
  const resultProps: InterfaceProperty[] = [
    { name: operation.name, type: resultType },
  ];
  sourceFile.addInterface(createInterface(resultTypeName, resultProps));

  // Query key factory
  if (operation.args.length > 0) {
    sourceFile.addVariableStatement(
      createConst(
        queryKeyName,
        `(variables?: ${variablesTypeName}) =>
  ['${operation.name}', variables] as const`,
        { docs: ['Query key factory for caching'] }
      )
    );
  } else {
    sourceFile.addVariableStatement(
      createConst(queryKeyName, `() => ['${operation.name}'] as const`, {
        docs: ['Query key factory for caching'],
      })
    );
  }

  // Generate hook function (only if React Query is enabled)
  if (reactQueryEnabled) {
    const hookParams = generateHookParameters(operation, variablesTypeName, resultTypeName);
    const hookBody = generateHookBody(operation, documentConstName, queryKeyName, variablesTypeName, resultTypeName);
    const hookDoc = generateHookDoc(operation, hookName);

    sourceFile.addFunction({
      name: hookName,
      isExported: true,
      parameters: hookParams,
      statements: hookBody,
      docs: [{ description: hookDoc }],
    });
  }

  // Add standalone functions section
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Standalone Functions (non-React)');
  sourceFile.addStatements('// ============================================================================\n');

  // Generate standalone fetch function
  const fetchFnName = `fetch${ucFirst(operation.name)}Query`;
  const fetchParams = generateFetchParameters(operation, variablesTypeName);
  const fetchBody = generateFetchBody(operation, documentConstName, variablesTypeName, resultTypeName);
  const fetchDoc = generateFetchDoc(operation, fetchFnName);

  sourceFile.addFunction({
    name: fetchFnName,
    isExported: true,
    isAsync: true,
    parameters: fetchParams,
    returnType: `Promise<${resultTypeName}>`,
    statements: fetchBody,
    docs: [{ description: fetchDoc }],
  });

  // Generate prefetch function (only if React Query is enabled)
  if (reactQueryEnabled) {
    const prefetchFnName = `prefetch${ucFirst(operation.name)}Query`;
    const prefetchParams = generatePrefetchParameters(operation, variablesTypeName);
    const prefetchBody = generatePrefetchBody(operation, documentConstName, queryKeyName, variablesTypeName, resultTypeName);
    const prefetchDoc = generatePrefetchDoc(operation, prefetchFnName);

    sourceFile.addFunction({
      name: prefetchFnName,
      isExported: true,
      isAsync: true,
      parameters: prefetchParams,
      returnType: 'Promise<void>',
      statements: prefetchBody,
      docs: [{ description: prefetchDoc }],
    });
  }

  return {
    fileName,
    content: getFormattedOutput(sourceFile),
    operationName: operation.name,
  };
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Generate interface properties from CleanArguments
 */
function generateVariablesProperties(args: CleanArgument[]): InterfaceProperty[] {
  return args.map((arg) => ({
    name: arg.name,
    type: typeRefToTsType(arg.type),
    optional: !isTypeRequired(arg.type),
    docs: arg.description ? [arg.description] : undefined,
  }));
}

/**
 * Generate hook function parameters
 */
function generateHookParameters(
  operation: CleanOperation,
  variablesTypeName: string,
  resultTypeName: string
): Array<{ name: string; type: string; hasQuestionToken?: boolean }> {
  const params: Array<{ name: string; type: string; hasQuestionToken?: boolean }> = [];

  // Add variables parameter if there are required args
  const hasRequiredArgs = operation.args.some((arg) => isTypeRequired(arg.type));

  if (operation.args.length > 0) {
    params.push({
      name: 'variables',
      type: variablesTypeName,
      hasQuestionToken: !hasRequiredArgs,
    });
  }

  // Add options parameter
  params.push({
    name: 'options',
    type: `Omit<UseQueryOptions<${resultTypeName}, Error>, 'queryKey' | 'queryFn'>`,
    hasQuestionToken: true,
  });

  return params;
}

/**
 * Generate hook function body
 */
function generateHookBody(
  operation: CleanOperation,
  documentConstName: string,
  queryKeyName: string,
  variablesTypeName: string,
  resultTypeName: string
): string {
  const hasArgs = operation.args.length > 0;
  const hasRequiredArgs = operation.args.some((arg) => isTypeRequired(arg.type));

  if (hasArgs) {
    // With variables
    const enabledCondition = hasRequiredArgs
      ? `enabled: !!variables && (options?.enabled !== false),`
      : '';

    return `return useQuery({
    queryKey: ${queryKeyName}(variables),
    queryFn: () => execute<${resultTypeName}, ${variablesTypeName}>(
      ${documentConstName},
      variables
    ),
    ${enabledCondition}
    ...options,
  });`;
  } else {
    // No variables
    return `return useQuery({
    queryKey: ${queryKeyName}(),
    queryFn: () => execute<${resultTypeName}>(${documentConstName}),
    ...options,
  });`;
  }
}

/**
 * Generate hook JSDoc documentation
 */
function generateHookDoc(operation: CleanOperation, hookName: string): string {
  const description = operation.description
    ? operation.description
    : `Query hook for ${operation.name}`;

  const hasArgs = operation.args.length > 0;

  let example: string;
  if (hasArgs) {
    const argNames = operation.args.map((a) => a.name).join(', ');
    example = `
@example
\`\`\`tsx
const { data, isLoading } = ${hookName}({ ${argNames} });

if (data?.${operation.name}) {
  console.log(data.${operation.name});
}
\`\`\``;
  } else {
    example = `
@example
\`\`\`tsx
const { data, isLoading } = ${hookName}();

if (data?.${operation.name}) {
  console.log(data.${operation.name});
}
\`\`\``;
  }

  return description + '\n' + example;
}

// ============================================================================
// Standalone function generators
// ============================================================================

/**
 * Generate fetch function parameters
 */
function generateFetchParameters(
  operation: CleanOperation,
  variablesTypeName: string
): Array<{ name: string; type: string; hasQuestionToken?: boolean }> {
  const params: Array<{ name: string; type: string; hasQuestionToken?: boolean }> = [];

  if (operation.args.length > 0) {
    const hasRequiredArgs = operation.args.some((arg) => isTypeRequired(arg.type));
    params.push({
      name: 'variables',
      type: variablesTypeName,
      hasQuestionToken: !hasRequiredArgs,
    });
  }

  params.push({
    name: 'options',
    type: 'ExecuteOptions',
    hasQuestionToken: true,
  });

  return params;
}

/**
 * Generate fetch function body
 */
function generateFetchBody(
  operation: CleanOperation,
  documentConstName: string,
  variablesTypeName: string,
  resultTypeName: string
): string {
  if (operation.args.length > 0) {
    return `return execute<${resultTypeName}, ${variablesTypeName}>(
    ${documentConstName},
    variables,
    options
  );`;
  } else {
    return `return execute<${resultTypeName}>(${documentConstName}, undefined, options);`;
  }
}

/**
 * Generate fetch function documentation
 */
function generateFetchDoc(operation: CleanOperation, fnName: string): string {
  const description = `Fetch ${operation.name} without React hooks`;

  if (operation.args.length > 0) {
    const argNames = operation.args.map((a) => a.name).join(', ');
    return `${description}

@example
\`\`\`ts
const data = await ${fnName}({ ${argNames} });
\`\`\``;
  } else {
    return `${description}

@example
\`\`\`ts
const data = await ${fnName}();
\`\`\``;
  }
}

/**
 * Generate prefetch function parameters
 */
function generatePrefetchParameters(
  operation: CleanOperation,
  variablesTypeName: string
): Array<{ name: string; type: string; hasQuestionToken?: boolean }> {
  const params: Array<{ name: string; type: string; hasQuestionToken?: boolean }> = [
    { name: 'queryClient', type: 'QueryClient' },
  ];

  if (operation.args.length > 0) {
    const hasRequiredArgs = operation.args.some((arg) => isTypeRequired(arg.type));
    params.push({
      name: 'variables',
      type: variablesTypeName,
      hasQuestionToken: !hasRequiredArgs,
    });
  }

  params.push({
    name: 'options',
    type: 'ExecuteOptions',
    hasQuestionToken: true,
  });

  return params;
}

/**
 * Generate prefetch function body
 */
function generatePrefetchBody(
  operation: CleanOperation,
  documentConstName: string,
  queryKeyName: string,
  variablesTypeName: string,
  resultTypeName: string
): string {
  if (operation.args.length > 0) {
    return `await queryClient.prefetchQuery({
    queryKey: ${queryKeyName}(variables),
    queryFn: () => execute<${resultTypeName}, ${variablesTypeName}>(
      ${documentConstName},
      variables,
      options
    ),
  });`;
  } else {
    return `await queryClient.prefetchQuery({
    queryKey: ${queryKeyName}(),
    queryFn: () => execute<${resultTypeName}>(${documentConstName}, undefined, options),
  });`;
  }
}

/**
 * Generate prefetch function documentation
 */
function generatePrefetchDoc(operation: CleanOperation, fnName: string): string {
  const description = `Prefetch ${operation.name} for SSR or cache warming`;

  if (operation.args.length > 0) {
    const argNames = operation.args.map((a) => a.name).join(', ');
    return `${description}

@example
\`\`\`ts
await ${fnName}(queryClient, { ${argNames} });
\`\`\``;
  } else {
    return `${description}

@example
\`\`\`ts
await ${fnName}(queryClient);
\`\`\``;
  }
}

// ============================================================================
// Batch generator
// ============================================================================

export interface GenerateAllCustomQueryHooksOptions {
  operations: CleanOperation[];
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  /** Whether to generate React Query hooks (default: true for backwards compatibility) */
  reactQueryEnabled?: boolean;
}

/**
 * Generate all custom query hook files
 */
export function generateAllCustomQueryHooks(
  options: GenerateAllCustomQueryHooksOptions
): GeneratedCustomQueryFile[] {
  const { operations, typeRegistry, maxDepth = 2, skipQueryField = true, reactQueryEnabled = true } = options;

  return operations
    .filter((op) => op.kind === 'query')
    .map((operation) =>
      generateCustomQueryHook({
        operation,
        typeRegistry,
        maxDepth,
        skipQueryField,
        reactQueryEnabled,
      })
    );
}
