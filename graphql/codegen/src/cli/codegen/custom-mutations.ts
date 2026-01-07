/**
 * Custom mutation hook generators for non-table operations
 *
 * Generates hooks for operations discovered via schema introspection
 * that are NOT table CRUD operations (e.g., login, register, etc.)
 *
 * Output structure:
 * mutations/
 *   useLoginMutation.ts
 *   useRegisterMutation.ts
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
import { buildCustomMutationString } from './schema-gql-ast';
import {
  typeRefToTsType,
  isTypeRequired,
  getOperationHookName,
  getOperationFileName,
  getOperationVariablesTypeName,
  getOperationResultTypeName,
  getDocumentConstName,
} from './type-resolver';

export interface GeneratedCustomMutationFile {
  fileName: string;
  content: string;
  operationName: string;
}

// ============================================================================
// Single custom mutation hook generator
// ============================================================================

export interface GenerateCustomMutationHookOptions {
  operation: CleanOperation;
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  /** Whether to generate React Query hooks (default: true for backwards compatibility) */
  reactQueryEnabled?: boolean;
}

/**
 * Generate a custom mutation hook file
 * When reactQueryEnabled is false, returns null since mutations require React Query
 */
export function generateCustomMutationHook(
  options: GenerateCustomMutationHookOptions
): GeneratedCustomMutationFile | null {
  const { operation, reactQueryEnabled = true } = options;

  // Mutations require React Query - skip generation when disabled
  if (!reactQueryEnabled) {
    return null;
  }

  try {
    return generateCustomMutationHookInternal(options);
  } catch (err) {
    console.error(`Error generating hook for mutation: ${operation.name}`);
    console.error(`  Args: ${operation.args.length}, Return type: ${operation.returnType.kind}/${operation.returnType.name}`);
    throw err;
  }
}

function generateCustomMutationHookInternal(
  options: GenerateCustomMutationHookOptions
): GeneratedCustomMutationFile {
  const { operation, typeRegistry, maxDepth = 2, skipQueryField = true } = options;

  const project = createProject();
  const hookName = getOperationHookName(operation.name, 'mutation');
  const fileName = getOperationFileName(operation.name, 'mutation');
  const variablesTypeName = getOperationVariablesTypeName(operation.name, 'mutation');
  const resultTypeName = getOperationResultTypeName(operation.name, 'mutation');
  const documentConstName = getDocumentConstName(operation.name, 'mutation');

  // Generate GraphQL document
  const mutationDocument = buildCustomMutationString({
    operation,
    typeRegistry,
    maxDepth,
    skipQueryField,
  });

  const sourceFile = createSourceFile(project, fileName);

  // Add file header
  sourceFile.insertText(
    0,
    createFileHeader(`Custom mutation hook for ${operation.name}`) + '\n\n'
  );

  // Add imports
  sourceFile.addImportDeclarations([
    createImport({
      moduleSpecifier: '@tanstack/react-query',
      namedImports: ['useMutation'],
      typeOnlyNamedImports: ['UseMutationOptions'],
    }),
    createImport({
      moduleSpecifier: '../client',
      namedImports: ['execute'],
    }),
  ]);

  // Add mutation document constant
  sourceFile.addVariableStatement(
    createConst(documentConstName, '`\n' + mutationDocument + '`', {
      docs: ['GraphQL mutation document'],
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

  // Generate hook function
  const hookParams = generateHookParameters(operation, variablesTypeName, resultTypeName);
  const hookBody = generateHookBody(operation, documentConstName, variablesTypeName, resultTypeName);

  // Note: docs can cause ts-morph issues with certain content, so we skip them
  sourceFile.addFunction({
    name: hookName,
    isExported: true,
    parameters: hookParams,
    statements: hookBody,
  });

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
  const hasArgs = operation.args.length > 0;

  // Mutation hooks use UseMutationOptions with variables as the second type param
  const optionsType = hasArgs
    ? `Omit<UseMutationOptions<${resultTypeName}, Error, ${variablesTypeName}>, 'mutationFn'>`
    : `Omit<UseMutationOptions<${resultTypeName}, Error, void>, 'mutationFn'>`;

  return [
    {
      name: 'options',
      type: optionsType,
      hasQuestionToken: true,
    },
  ];
}

/**
 * Generate hook function body
 */
function generateHookBody(
  operation: CleanOperation,
  documentConstName: string,
  variablesTypeName: string,
  resultTypeName: string
): string {
  const hasArgs = operation.args.length > 0;

  if (hasArgs) {
    return `return useMutation({
    mutationFn: (variables: ${variablesTypeName}) =>
      execute<${resultTypeName}, ${variablesTypeName}>(
        ${documentConstName},
        variables
      ),
    ...options,
  });`;
  } else {
    return `return useMutation({
    mutationFn: () => execute<${resultTypeName}>(${documentConstName}),
    ...options,
  });`;
  }
}

// NOTE: JSDoc generation removed due to ts-morph issues with certain content

// ============================================================================
// Batch generator
// ============================================================================

export interface GenerateAllCustomMutationHooksOptions {
  operations: CleanOperation[];
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  /** Whether to generate React Query hooks (default: true for backwards compatibility) */
  reactQueryEnabled?: boolean;
}

/**
 * Generate all custom mutation hook files
 * When reactQueryEnabled is false, returns empty array since mutations require React Query
 */
export function generateAllCustomMutationHooks(
  options: GenerateAllCustomMutationHooksOptions
): GeneratedCustomMutationFile[] {
  const { operations, typeRegistry, maxDepth = 2, skipQueryField = true, reactQueryEnabled = true } = options;

  return operations
    .filter((op) => op.kind === 'mutation')
    .map((operation) =>
      generateCustomMutationHook({
        operation,
        typeRegistry,
        maxDepth,
        skipQueryField,
        reactQueryEnabled,
      })
    )
    .filter((result): result is GeneratedCustomMutationFile => result !== null);
}
