/**
 * Query hook generators using AST-based code generation
 *
 * Output structure:
 * queries/
 *   useCarsQuery.ts    - List query hook
 *   useCarQuery.ts     - Single item query hook
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
  createTypeAlias,
  createUnionType,
  createFilterInterface,
  type InterfaceProperty,
} from './ts-ast';
import {
  buildListQueryAST,
  buildSingleQueryAST,
  printGraphQL,
} from './gql-ast';
import {
  getTableNames,
  getListQueryHookName,
  getSingleQueryHookName,
  getListQueryFileName,
  getSingleQueryFileName,
  getAllRowsQueryName,
  getSingleRowQueryName,
  getFilterTypeName,
  getOrderByTypeName,
  getScalarFields,
  getScalarFilterType,
  getPrimaryKeyInfo,
  toScreamingSnake,
  ucFirst,
} from './utils';

export interface GeneratedQueryFile {
  fileName: string;
  content: string;
}

export interface QueryGeneratorOptions {
  /** Whether to generate React Query hooks (default: true for backwards compatibility) */
  reactQueryEnabled?: boolean;
}

// ============================================================================
// List query hook generator
// ============================================================================

/**
 * Generate list query hook file content using AST
 */
export function generateListQueryHook(
  table: CleanTable,
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile {
  const { reactQueryEnabled = true } = options;
  const project = createProject();
  const { typeName, pluralName } = getTableNames(table);
  const hookName = getListQueryHookName(table);
  const queryName = getAllRowsQueryName(table);
  const filterTypeName = getFilterTypeName(table);
  const orderByTypeName = getOrderByTypeName(table);
  const scalarFields = getScalarFields(table);

  // Generate GraphQL document via AST
  const queryAST = buildListQueryAST({ table });
  const queryDocument = printGraphQL(queryAST);

  const sourceFile = createSourceFile(project, getListQueryFileName(table));

  // Add file header as leading comment
  const headerText = reactQueryEnabled
    ? `List query hook for ${typeName}`
    : `List query functions for ${typeName}`;
  sourceFile.insertText(0, createFileHeader(headerText) + '\n\n');

  // Collect all filter types used by this table's fields
  const filterTypesUsed = new Set<string>();
  for (const field of scalarFields) {
    const filterType = getScalarFilterType(field.type.gqlType, field.type.isArray);
    if (filterType) {
      filterTypesUsed.add(filterType);
    }
  }

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
    }),
    createImport({
      moduleSpecifier: '../types',
      typeOnlyNamedImports: [typeName, ...Array.from(filterTypesUsed)],
    })
  );
  sourceFile.addImportDeclarations(imports);

  // Re-export entity type
  sourceFile.addStatements(`\n// Re-export entity type for convenience\nexport type { ${typeName} };\n`);

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// GraphQL Document');
  sourceFile.addStatements('// ============================================================================\n');

  // Add query document constant
  sourceFile.addVariableStatement(
    createConst(`${queryName}QueryDocument`, '`\n' + queryDocument + '`')
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Types');
  sourceFile.addStatements('// ============================================================================\n');

  // Generate filter interface
  const fieldFilters = scalarFields
    .map((field) => {
      const filterType = getScalarFilterType(field.type.gqlType, field.type.isArray);
      return filterType ? { fieldName: field.name, filterType } : null;
    })
    .filter((f): f is { fieldName: string; filterType: string } => f !== null);

  // Note: Not exported to avoid conflicts with schema-types
  sourceFile.addInterface(createFilterInterface(filterTypeName, fieldFilters, { isExported: false }));

  // Generate OrderBy type
  // Note: Not exported to avoid conflicts with schema-types
  const orderByValues = [
    ...scalarFields.flatMap((f) => [
      `${toScreamingSnake(f.name)}_ASC`,
      `${toScreamingSnake(f.name)}_DESC`,
    ]),
    'NATURAL',
    'PRIMARY_KEY_ASC',
    'PRIMARY_KEY_DESC',
  ];
  sourceFile.addTypeAlias(
    createTypeAlias(orderByTypeName, createUnionType(orderByValues), { isExported: false })
  );

  // Variables interface
  const variablesProps: InterfaceProperty[] = [
    { name: 'first', type: 'number', optional: true },
    { name: 'offset', type: 'number', optional: true },
    { name: 'filter', type: filterTypeName, optional: true },
    { name: 'orderBy', type: `${orderByTypeName}[]`, optional: true },
  ];
  sourceFile.addInterface(
    createInterface(`${ucFirst(pluralName)}QueryVariables`, variablesProps)
  );

  // Result interface
  const resultProps: InterfaceProperty[] = [
    {
      name: queryName,
      type: `{
    totalCount: number;
    nodes: ${typeName}[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
  }`,
    },
  ];
  sourceFile.addInterface(
    createInterface(`${ucFirst(pluralName)}QueryResult`, resultProps)
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Query Key');
  sourceFile.addStatements('// ============================================================================\n');

  // Query key factory
  sourceFile.addVariableStatement(
    createConst(
      `${queryName}QueryKey`,
      `(variables?: ${ucFirst(pluralName)}QueryVariables) =>
  ['${typeName.toLowerCase()}', 'list', variables] as const`
    )
  );

  // Add React Query hook section (only if enabled)
  if (reactQueryEnabled) {
    sourceFile.addStatements('\n// ============================================================================');
    sourceFile.addStatements('// Hook');
    sourceFile.addStatements('// ============================================================================\n');

    // Hook function
    sourceFile.addFunction({
      name: hookName,
      isExported: true,
      parameters: [
        {
          name: 'variables',
          type: `${ucFirst(pluralName)}QueryVariables`,
          hasQuestionToken: true,
        },
        {
          name: 'options',
          type: `Omit<UseQueryOptions<${ucFirst(pluralName)}QueryResult, Error>, 'queryKey' | 'queryFn'>`,
          hasQuestionToken: true,
        },
      ],
      statements: `return useQuery({
    queryKey: ${queryName}QueryKey(variables),
    queryFn: () => execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
      ${queryName}QueryDocument,
      variables
    ),
    ...options,
  });`,
      docs: [
        {
          description: `Query hook for fetching ${typeName} list

@example
\`\`\`tsx
const { data, isLoading } = ${hookName}({
  first: 10,
  filter: { name: { equalTo: "example" } },
  orderBy: ['CREATED_AT_DESC'],
});
\`\`\``,
        },
      ],
    });
  }

  // Add section comment for standalone functions
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Standalone Functions (non-React)');
  sourceFile.addStatements('// ============================================================================\n');

  // Fetch function (standalone, no React)
  sourceFile.addFunction({
    name: `fetch${ucFirst(pluralName)}Query`,
    isExported: true,
    isAsync: true,
    parameters: [
      {
        name: 'variables',
        type: `${ucFirst(pluralName)}QueryVariables`,
        hasQuestionToken: true,
      },
      {
        name: 'options',
        type: 'ExecuteOptions',
        hasQuestionToken: true,
      },
    ],
    returnType: `Promise<${ucFirst(pluralName)}QueryResult>`,
    statements: `return execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
    ${queryName}QueryDocument,
    variables,
    options
  );`,
    docs: [
      {
        description: `Fetch ${typeName} list without React hooks

@example
\`\`\`ts
// Direct fetch
const data = await fetch${ucFirst(pluralName)}Query({ first: 10 });

// With QueryClient
const data = await queryClient.fetchQuery({
  queryKey: ${queryName}QueryKey(variables),
  queryFn: () => fetch${ucFirst(pluralName)}Query(variables),
});
\`\`\``,
      },
    ],
  });

  // Prefetch function (for SSR/QueryClient) - only if React Query is enabled
  if (reactQueryEnabled) {
    sourceFile.addFunction({
      name: `prefetch${ucFirst(pluralName)}Query`,
      isExported: true,
      isAsync: true,
      parameters: [
        {
          name: 'queryClient',
          type: 'QueryClient',
        },
        {
          name: 'variables',
          type: `${ucFirst(pluralName)}QueryVariables`,
          hasQuestionToken: true,
        },
        {
          name: 'options',
          type: 'ExecuteOptions',
          hasQuestionToken: true,
        },
      ],
      returnType: 'Promise<void>',
      statements: `await queryClient.prefetchQuery({
    queryKey: ${queryName}QueryKey(variables),
    queryFn: () => execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
      ${queryName}QueryDocument,
      variables,
      options
    ),
  });`,
      docs: [
        {
          description: `Prefetch ${typeName} list for SSR or cache warming

@example
\`\`\`ts
await prefetch${ucFirst(pluralName)}Query(queryClient, { first: 10 });
\`\`\``,
        },
      ],
    });
  }

  return {
    fileName: getListQueryFileName(table),
    content: getFormattedOutput(sourceFile),
  };
}

// ============================================================================
// Single item query hook generator
// ============================================================================

/**
 * Generate single item query hook file content using AST
 */
export function generateSingleQueryHook(
  table: CleanTable,
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile {
  const { reactQueryEnabled = true } = options;
  const project = createProject();
  const { typeName, singularName } = getTableNames(table);
  const hookName = getSingleQueryHookName(table);
  const queryName = getSingleRowQueryName(table);

  // Get primary key info dynamically from table constraints
  const pkFields = getPrimaryKeyInfo(table);
  // For simplicity, use first PK field (most common case)
  // Composite PKs would need more complex handling
  const pkField = pkFields[0];
  const pkName = pkField.name;
  const pkTsType = pkField.tsType;

  // Generate GraphQL document via AST
  const queryAST = buildSingleQueryAST({ table });
  const queryDocument = printGraphQL(queryAST);

  const sourceFile = createSourceFile(project, getSingleQueryFileName(table));

  // Add file header
  const headerText = reactQueryEnabled
    ? `Single item query hook for ${typeName}`
    : `Single item query functions for ${typeName}`;
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
    }),
    createImport({
      moduleSpecifier: '../types',
      typeOnlyNamedImports: [typeName],
    })
  );
  sourceFile.addImportDeclarations(imports);

  // Re-export entity type
  sourceFile.addStatements(`\n// Re-export entity type for convenience\nexport type { ${typeName} };\n`);

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// GraphQL Document');
  sourceFile.addStatements('// ============================================================================\n');

  // Add query document constant
  sourceFile.addVariableStatement(
    createConst(`${queryName}QueryDocument`, '`\n' + queryDocument + '`')
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Types');
  sourceFile.addStatements('// ============================================================================\n');

  // Variables interface - use dynamic PK field name and type
  sourceFile.addInterface(
    createInterface(`${ucFirst(singularName)}QueryVariables`, [
      { name: pkName, type: pkTsType },
    ])
  );

  // Result interface
  sourceFile.addInterface(
    createInterface(`${ucFirst(singularName)}QueryResult`, [
      { name: queryName, type: `${typeName} | null` },
    ])
  );

  // Add section comment
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Query Key');
  sourceFile.addStatements('// ============================================================================\n');

  // Query key factory - use dynamic PK field name and type
  sourceFile.addVariableStatement(
    createConst(
      `${queryName}QueryKey`,
      `(${pkName}: ${pkTsType}) =>
  ['${typeName.toLowerCase()}', 'detail', ${pkName}] as const`
    )
  );

  // Add React Query hook section (only if enabled)
  if (reactQueryEnabled) {
    sourceFile.addStatements('\n// ============================================================================');
    sourceFile.addStatements('// Hook');
    sourceFile.addStatements('// ============================================================================\n');

    // Hook function - use dynamic PK field name and type
    sourceFile.addFunction({
      name: hookName,
      isExported: true,
      parameters: [
        { name: pkName, type: pkTsType },
        {
          name: 'options',
          type: `Omit<UseQueryOptions<${ucFirst(singularName)}QueryResult, Error>, 'queryKey' | 'queryFn'>`,
          hasQuestionToken: true,
        },
      ],
      statements: `return useQuery({
    queryKey: ${queryName}QueryKey(${pkName}),
    queryFn: () => execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
      ${queryName}QueryDocument,
      { ${pkName} }
    ),
    enabled: !!${pkName} && (options?.enabled !== false),
    ...options,
  });`,
      docs: [
        {
          description: `Query hook for fetching a single ${typeName} by primary key

@example
\`\`\`tsx
const { data, isLoading } = ${hookName}(${pkTsType === 'string' ? "'value-here'" : '123'});

if (data?.${queryName}) {
  console.log(data.${queryName}.${pkName});
}
\`\`\``,
        },
      ],
    });
  }

  // Add section comment for standalone functions
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Standalone Functions (non-React)');
  sourceFile.addStatements('// ============================================================================\n');

  // Fetch function (standalone, no React) - use dynamic PK
  sourceFile.addFunction({
    name: `fetch${ucFirst(singularName)}Query`,
    isExported: true,
    isAsync: true,
    parameters: [
      { name: pkName, type: pkTsType },
      {
        name: 'options',
        type: 'ExecuteOptions',
        hasQuestionToken: true,
      },
    ],
    returnType: `Promise<${ucFirst(singularName)}QueryResult>`,
    statements: `return execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
    ${queryName}QueryDocument,
    { ${pkName} },
    options
  );`,
    docs: [
      {
        description: `Fetch a single ${typeName} by primary key without React hooks

@example
\`\`\`ts
const data = await fetch${ucFirst(singularName)}Query(${pkTsType === 'string' ? "'value-here'" : '123'});
\`\`\``,
      },
    ],
  });

  // Prefetch function (for SSR/QueryClient) - only if React Query is enabled, use dynamic PK
  if (reactQueryEnabled) {
    sourceFile.addFunction({
      name: `prefetch${ucFirst(singularName)}Query`,
      isExported: true,
      isAsync: true,
      parameters: [
        { name: 'queryClient', type: 'QueryClient' },
        { name: pkName, type: pkTsType },
        {
          name: 'options',
          type: 'ExecuteOptions',
          hasQuestionToken: true,
        },
      ],
      returnType: 'Promise<void>',
      statements: `await queryClient.prefetchQuery({
    queryKey: ${queryName}QueryKey(${pkName}),
    queryFn: () => execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
      ${queryName}QueryDocument,
      { ${pkName} },
      options
    ),
  });`,
      docs: [
        {
          description: `Prefetch a single ${typeName} for SSR or cache warming

@example
\`\`\`ts
await prefetch${ucFirst(singularName)}Query(queryClient, ${pkTsType === 'string' ? "'value-here'" : '123'});
\`\`\``,
        },
      ],
    });
  }

  return {
    fileName: getSingleQueryFileName(table),
    content: getFormattedOutput(sourceFile),
  };
}

// ============================================================================
// Batch generator
// ============================================================================

/**
 * Generate all query hook files for all tables
 */
export function generateAllQueryHooks(
  tables: CleanTable[],
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile[] {
  const files: GeneratedQueryFile[] = [];

  for (const table of tables) {
    files.push(generateListQueryHook(table, options));
    files.push(generateSingleQueryHook(table, options));
  }

  return files;
}
