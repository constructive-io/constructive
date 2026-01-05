/**
 * Mutation hook generators using AST-based code generation
 *
 * Output structure:
 * mutations/
 *   useCreateCarMutation.ts
 *   useUpdateCarMutation.ts
 *   useDeleteCarMutation.ts
 */
import type { CleanTable } from '../../types/schema';
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
import {
  buildCreateMutationAST,
  buildUpdateMutationAST,
  buildDeleteMutationAST,
  printGraphQL,
} from './gql-ast';
import {
  getTableNames,
  getCreateMutationHookName,
  getUpdateMutationHookName,
  getDeleteMutationHookName,
  getCreateMutationFileName,
  getUpdateMutationFileName,
  getDeleteMutationFileName,
  getCreateMutationName,
  getUpdateMutationName,
  getDeleteMutationName,
  getScalarFields,
  fieldTypeToTs,
  ucFirst,
  lcFirst,
} from './utils';

export interface GeneratedMutationFile {
  fileName: string;
  content: string;
}

// ============================================================================
// Create mutation hook generator
// ============================================================================

/**
 * Generate create mutation hook file content using AST
 */
export function generateCreateMutationHook(table: CleanTable): GeneratedMutationFile {
  const project = createProject();
  const { typeName, singularName } = getTableNames(table);
  const hookName = getCreateMutationHookName(table);
  const mutationName = getCreateMutationName(table);
  const scalarFields = getScalarFields(table);

  // Generate GraphQL document via AST
  const mutationAST = buildCreateMutationAST({ table });
  const mutationDocument = printGraphQL(mutationAST);

  const sourceFile = createSourceFile(project, getCreateMutationFileName(table));

  // Add file header
  sourceFile.insertText(0, createFileHeader(`Create mutation hook for ${typeName}`) + '\n\n');

  // Add imports
  sourceFile.addImportDeclarations([
    createImport({
      moduleSpecifier: '@tanstack/react-query',
      namedImports: ['useMutation', 'useQueryClient'],
      typeOnlyNamedImports: ['UseMutationOptions'],
    }),
    createImport({
      moduleSpecifier: '../client',
      namedImports: ['execute'],
    }),
    createImport({
      moduleSpecifier: '../types',
      typeOnlyNamedImports: [typeName],
    }),
  ]);

  // Re-export entity type
  sourceFile.addStatements(`\n// Re-export entity type for convenience\nexport type { ${typeName} };\n`);

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// GraphQL Document');
  sourceFile.addStatements('// ============================================================================\n');

  // Add mutation document constant
  sourceFile.addVariableStatement(
    createConst(`${mutationName}MutationDocument`, '`\n' + mutationDocument + '`')
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Types');
  sourceFile.addStatements('// ============================================================================\n');

  // Generate CreateInput type - exclude auto-generated fields
  const inputFields: InterfaceProperty[] = scalarFields
    .filter((f) => {
      const name = f.name.toLowerCase();
      return !['id', 'createdat', 'updatedat', 'created_at', 'updated_at'].includes(name);
    })
    .map((f) => ({
      name: f.name,
      type: `${fieldTypeToTs(f.type)} | null`,
      optional: true,
    }));

  sourceFile.addInterface(
    createInterface(`${typeName}CreateInput`, inputFields, {
      docs: [`Input type for creating a ${typeName}`],
    })
  );

  // Variables interface
  sourceFile.addInterface(
    createInterface(`${ucFirst(mutationName)}MutationVariables`, [
      {
        name: 'input',
        type: `{
    ${lcFirst(typeName)}: ${typeName}CreateInput;
  }`,
      },
    ])
  );

  // Result interface
  sourceFile.addInterface(
    createInterface(`${ucFirst(mutationName)}MutationResult`, [
      {
        name: mutationName,
        type: `{
    ${singularName}: ${typeName};
  }`,
      },
    ])
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Hook');
  sourceFile.addStatements('// ============================================================================\n');

  // Hook function
  sourceFile.addFunction({
    name: hookName,
    isExported: true,
    parameters: [
      {
        name: 'options',
        type: `Omit<UseMutationOptions<${ucFirst(mutationName)}MutationResult, Error, ${ucFirst(mutationName)}MutationVariables>, 'mutationFn'>`,
        hasQuestionToken: true,
      },
    ],
    statements: `const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: ${ucFirst(mutationName)}MutationVariables) =>
      execute<${ucFirst(mutationName)}MutationResult, ${ucFirst(mutationName)}MutationVariables>(
        ${mutationName}MutationDocument,
        variables
      ),
    onSuccess: () => {
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: ['${typeName.toLowerCase()}', 'list'] });
    },
    ...options,
  });`,
    docs: [
      {
        description: `Mutation hook for creating a ${typeName}

@example
\`\`\`tsx
const { mutate, isPending } = ${hookName}();

mutate({
  input: {
    ${lcFirst(typeName)}: {
      // ... fields
    },
  },
});
\`\`\``,
      },
    ],
  });

  return {
    fileName: getCreateMutationFileName(table),
    content: getFormattedOutput(sourceFile),
  };
}

// ============================================================================
// Update mutation hook generator
// ============================================================================

/**
 * Generate update mutation hook file content using AST
 */
export function generateUpdateMutationHook(table: CleanTable): GeneratedMutationFile | null {
  // Check if update mutation exists
  if (table.query?.update === null) {
    return null;
  }

  const project = createProject();
  const { typeName, singularName } = getTableNames(table);
  const hookName = getUpdateMutationHookName(table);
  const mutationName = getUpdateMutationName(table);
  const scalarFields = getScalarFields(table);

  // Generate GraphQL document via AST
  const mutationAST = buildUpdateMutationAST({ table });
  const mutationDocument = printGraphQL(mutationAST);

  const sourceFile = createSourceFile(project, getUpdateMutationFileName(table));

  // Add file header
  sourceFile.insertText(0, createFileHeader(`Update mutation hook for ${typeName}`) + '\n\n');

  // Add imports
  sourceFile.addImportDeclarations([
    createImport({
      moduleSpecifier: '@tanstack/react-query',
      namedImports: ['useMutation', 'useQueryClient'],
      typeOnlyNamedImports: ['UseMutationOptions'],
    }),
    createImport({
      moduleSpecifier: '../client',
      namedImports: ['execute'],
    }),
    createImport({
      moduleSpecifier: '../types',
      typeOnlyNamedImports: [typeName],
    }),
  ]);

  // Re-export entity type
  sourceFile.addStatements(`\n// Re-export entity type for convenience\nexport type { ${typeName} };\n`);

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// GraphQL Document');
  sourceFile.addStatements('// ============================================================================\n');

  // Add mutation document constant
  sourceFile.addVariableStatement(
    createConst(`${mutationName}MutationDocument`, '`\n' + mutationDocument + '`')
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Types');
  sourceFile.addStatements('// ============================================================================\n');

  // Generate Patch type - all fields optional
  const patchFields: InterfaceProperty[] = scalarFields
    .filter((f) => f.name.toLowerCase() !== 'id')
    .map((f) => ({
      name: f.name,
      type: `${fieldTypeToTs(f.type)} | null`,
      optional: true,
    }));

  sourceFile.addInterface(
    createInterface(`${typeName}Patch`, patchFields, {
      docs: [`Patch type for updating a ${typeName} - all fields optional`],
    })
  );

  // Variables interface
  sourceFile.addInterface(
    createInterface(`${ucFirst(mutationName)}MutationVariables`, [
      {
        name: 'input',
        type: `{
    id: string;
    patch: ${typeName}Patch;
  }`,
      },
    ])
  );

  // Result interface
  sourceFile.addInterface(
    createInterface(`${ucFirst(mutationName)}MutationResult`, [
      {
        name: mutationName,
        type: `{
    ${singularName}: ${typeName};
  }`,
      },
    ])
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Hook');
  sourceFile.addStatements('// ============================================================================\n');

  // Hook function
  sourceFile.addFunction({
    name: hookName,
    isExported: true,
    parameters: [
      {
        name: 'options',
        type: `Omit<UseMutationOptions<${ucFirst(mutationName)}MutationResult, Error, ${ucFirst(mutationName)}MutationVariables>, 'mutationFn'>`,
        hasQuestionToken: true,
      },
    ],
    statements: `const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: ${ucFirst(mutationName)}MutationVariables) =>
      execute<${ucFirst(mutationName)}MutationResult, ${ucFirst(mutationName)}MutationVariables>(
        ${mutationName}MutationDocument,
        variables
      ),
    onSuccess: (_, variables) => {
      // Invalidate specific item and list queries
      queryClient.invalidateQueries({ queryKey: ['${typeName.toLowerCase()}', 'detail', variables.input.id] });
      queryClient.invalidateQueries({ queryKey: ['${typeName.toLowerCase()}', 'list'] });
    },
    ...options,
  });`,
    docs: [
      {
        description: `Mutation hook for updating a ${typeName}

@example
\`\`\`tsx
const { mutate, isPending } = ${hookName}();

mutate({
  input: {
    id: 'uuid-here',
    patch: {
      // ... fields to update
    },
  },
});
\`\`\``,
      },
    ],
  });

  return {
    fileName: getUpdateMutationFileName(table),
    content: getFormattedOutput(sourceFile),
  };
}

// ============================================================================
// Delete mutation hook generator
// ============================================================================

/**
 * Generate delete mutation hook file content using AST
 */
export function generateDeleteMutationHook(table: CleanTable): GeneratedMutationFile | null {
  // Check if delete mutation exists
  if (table.query?.delete === null) {
    return null;
  }

  const project = createProject();
  const { typeName } = getTableNames(table);
  const hookName = getDeleteMutationHookName(table);
  const mutationName = getDeleteMutationName(table);

  // Generate GraphQL document via AST
  const mutationAST = buildDeleteMutationAST({ table });
  const mutationDocument = printGraphQL(mutationAST);

  const sourceFile = createSourceFile(project, getDeleteMutationFileName(table));

  // Add file header
  sourceFile.insertText(0, createFileHeader(`Delete mutation hook for ${typeName}`) + '\n\n');

  // Add imports
  sourceFile.addImportDeclarations([
    createImport({
      moduleSpecifier: '@tanstack/react-query',
      namedImports: ['useMutation', 'useQueryClient'],
      typeOnlyNamedImports: ['UseMutationOptions'],
    }),
    createImport({
      moduleSpecifier: '../client',
      namedImports: ['execute'],
    }),
  ]);

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// GraphQL Document');
  sourceFile.addStatements('// ============================================================================\n');

  // Add mutation document constant
  sourceFile.addVariableStatement(
    createConst(`${mutationName}MutationDocument`, '`\n' + mutationDocument + '`')
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Types');
  sourceFile.addStatements('// ============================================================================\n');

  // Variables interface
  sourceFile.addInterface(
    createInterface(`${ucFirst(mutationName)}MutationVariables`, [
      {
        name: 'input',
        type: `{
    id: string;
  }`,
      },
    ])
  );

  // Result interface
  sourceFile.addInterface(
    createInterface(`${ucFirst(mutationName)}MutationResult`, [
      {
        name: mutationName,
        type: `{
    clientMutationId: string | null;
    deletedId: string | null;
  }`,
      },
    ])
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Hook');
  sourceFile.addStatements('// ============================================================================\n');

  // Hook function
  sourceFile.addFunction({
    name: hookName,
    isExported: true,
    parameters: [
      {
        name: 'options',
        type: `Omit<UseMutationOptions<${ucFirst(mutationName)}MutationResult, Error, ${ucFirst(mutationName)}MutationVariables>, 'mutationFn'>`,
        hasQuestionToken: true,
      },
    ],
    statements: `const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: ${ucFirst(mutationName)}MutationVariables) =>
      execute<${ucFirst(mutationName)}MutationResult, ${ucFirst(mutationName)}MutationVariables>(
        ${mutationName}MutationDocument,
        variables
      ),
    onSuccess: (_, variables) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: ['${typeName.toLowerCase()}', 'detail', variables.input.id] });
      queryClient.invalidateQueries({ queryKey: ['${typeName.toLowerCase()}', 'list'] });
    },
    ...options,
  });`,
    docs: [
      {
        description: `Mutation hook for deleting a ${typeName}

@example
\`\`\`tsx
const { mutate, isPending } = ${hookName}();

mutate({
  input: {
    id: 'uuid-to-delete',
  },
});
\`\`\``,
      },
    ],
  });

  return {
    fileName: getDeleteMutationFileName(table),
    content: getFormattedOutput(sourceFile),
  };
}

// ============================================================================
// Batch generator
// ============================================================================

/**
 * Generate all mutation hook files for all tables
 */
export function generateAllMutationHooks(tables: CleanTable[]): GeneratedMutationFile[] {
  const files: GeneratedMutationFile[] = [];

  for (const table of tables) {
    files.push(generateCreateMutationHook(table));

    const updateHook = generateUpdateMutationHook(table);
    if (updateHook) {
      files.push(updateHook);
    }

    const deleteHook = generateDeleteMutationHook(table);
    if (deleteHook) {
      files.push(deleteHook);
    }
  }

  return files;
}
