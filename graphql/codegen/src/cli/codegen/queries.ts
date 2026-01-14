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
  lcFirst,
} from './utils';

export interface GeneratedQueryFile {
  fileName: string;
  content: string;
}

export interface QueryGeneratorOptions {
  /** Whether to generate React Query hooks (default: true for backwards compatibility) */
  reactQueryEnabled?: boolean;
  /** Whether to use centralized query keys from query-keys.ts (default: true) */
  useCentralizedKeys?: boolean;
  /** Whether this entity has parent relationships (for scope support) */
  hasRelationships?: boolean;
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
  const { reactQueryEnabled = true, useCentralizedKeys = true, hasRelationships = false } = options;
  const project = createProject();
  const { typeName, pluralName } = getTableNames(table);
  const hookName = getListQueryHookName(table);
  const queryName = getAllRowsQueryName(table);
  const filterTypeName = getFilterTypeName(table);
  const orderByTypeName = getOrderByTypeName(table);
  const scalarFields = getScalarFields(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const scopeTypeName = `${typeName}Scope`;

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

  // Import centralized query keys
  if (useCentralizedKeys) {
    const queryKeyImports = [keysName];
    const queryKeyTypeImports = hasRelationships ? [scopeTypeName] : [];
    imports.push(
      createImport({
        moduleSpecifier: '../query-keys',
        namedImports: queryKeyImports,
        typeOnlyNamedImports: queryKeyTypeImports,
      })
    );
  }

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

  // Query key - either re-export from centralized keys or define inline
  if (useCentralizedKeys) {
    // Re-export the query key function from centralized keys
    sourceFile.addVariableStatement(
      createConst(
        `${queryName}QueryKey`,
        `${keysName}.list`,
        { docs: ['Query key factory - re-exported from query-keys.ts'] }
      )
    );
  } else {
    // Legacy: Define inline query key factory
    sourceFile.addVariableStatement(
      createConst(
        `${queryName}QueryKey`,
        `(variables?: ${ucFirst(pluralName)}QueryVariables) =>
  ['${typeName.toLowerCase()}', 'list', variables] as const`
      )
    );
  }

  // Add React Query hook section (only if enabled)
  if (reactQueryEnabled) {
    sourceFile.addStatements('\n// ============================================================================');
    sourceFile.addStatements('// Hook');
    sourceFile.addStatements('// ============================================================================\n');

    // Hook parameters - add scope support when entity has relationships
    const hookParameters: Array<{ name: string; type: string; hasQuestionToken?: boolean }> = [
      {
        name: 'variables',
        type: `${ucFirst(pluralName)}QueryVariables`,
        hasQuestionToken: true,
      },
    ];

    // Options type - include scope if entity has relationships
    let optionsType: string;
    if (hasRelationships && useCentralizedKeys) {
      optionsType = `Omit<UseQueryOptions<${ucFirst(pluralName)}QueryResult, Error>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`;
    } else {
      optionsType = `Omit<UseQueryOptions<${ucFirst(pluralName)}QueryResult, Error>, 'queryKey' | 'queryFn'>`;
    }

    hookParameters.push({
      name: 'options',
      type: optionsType,
      hasQuestionToken: true,
    });

    // Hook body - use scope if available
    let hookBody: string;
    if (hasRelationships && useCentralizedKeys) {
      hookBody = `const { scope, ...queryOptions } = options ?? {};
  return useQuery({
    queryKey: ${keysName}.list(variables, scope),
    queryFn: () => execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
      ${queryName}QueryDocument,
      variables
    ),
    ...queryOptions,
  });`;
    } else if (useCentralizedKeys) {
      hookBody = `return useQuery({
    queryKey: ${keysName}.list(variables),
    queryFn: () => execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
      ${queryName}QueryDocument,
      variables
    ),
    ...options,
  });`;
    } else {
      hookBody = `return useQuery({
    queryKey: ${queryName}QueryKey(variables),
    queryFn: () => execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
      ${queryName}QueryDocument,
      variables
    ),
    ...options,
  });`;
    }

    // Doc example
    let docExample = `Query hook for fetching ${typeName} list

@example
\`\`\`tsx
const { data, isLoading } = ${hookName}({
  first: 10,
  filter: { name: { equalTo: "example" } },
  orderBy: ['CREATED_AT_DESC'],
});
\`\`\``;

    if (hasRelationships && useCentralizedKeys) {
      docExample += `

@example With scope for hierarchical cache invalidation
\`\`\`tsx
const { data } = ${hookName}(
  { first: 10 },
  { scope: { parentId: 'parent-id' } }
);
\`\`\``;
    }

    // Hook function
    sourceFile.addFunction({
      name: hookName,
      isExported: true,
      parameters: hookParameters,
      statements: hookBody,
      docs: [{ description: docExample }],
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
    // Prefetch parameters - add scope support when entity has relationships
    const prefetchParams: Array<{ name: string; type: string; hasQuestionToken?: boolean }> = [
      { name: 'queryClient', type: 'QueryClient' },
      { name: 'variables', type: `${ucFirst(pluralName)}QueryVariables`, hasQuestionToken: true },
    ];

    if (hasRelationships && useCentralizedKeys) {
      prefetchParams.push({ name: 'scope', type: scopeTypeName, hasQuestionToken: true });
    }

    prefetchParams.push({ name: 'options', type: 'ExecuteOptions', hasQuestionToken: true });

    // Prefetch body
    let prefetchBody: string;
    if (hasRelationships && useCentralizedKeys) {
      prefetchBody = `await queryClient.prefetchQuery({
    queryKey: ${keysName}.list(variables, scope),
    queryFn: () => execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
      ${queryName}QueryDocument,
      variables,
      options
    ),
  });`;
    } else if (useCentralizedKeys) {
      prefetchBody = `await queryClient.prefetchQuery({
    queryKey: ${keysName}.list(variables),
    queryFn: () => execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
      ${queryName}QueryDocument,
      variables,
      options
    ),
  });`;
    } else {
      prefetchBody = `await queryClient.prefetchQuery({
    queryKey: ${queryName}QueryKey(variables),
    queryFn: () => execute<${ucFirst(pluralName)}QueryResult, ${ucFirst(pluralName)}QueryVariables>(
      ${queryName}QueryDocument,
      variables,
      options
    ),
  });`;
    }

    sourceFile.addFunction({
      name: `prefetch${ucFirst(pluralName)}Query`,
      isExported: true,
      isAsync: true,
      parameters: prefetchParams,
      returnType: 'Promise<void>',
      statements: prefetchBody,
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
  const { reactQueryEnabled = true, useCentralizedKeys = true, hasRelationships = false } = options;
  const project = createProject();
  const { typeName, singularName } = getTableNames(table);
  const hookName = getSingleQueryHookName(table);
  const queryName = getSingleRowQueryName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const scopeTypeName = `${typeName}Scope`;

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

  // Import centralized query keys
  if (useCentralizedKeys) {
    const queryKeyImports = [keysName];
    const queryKeyTypeImports = hasRelationships ? [scopeTypeName] : [];
    imports.push(
      createImport({
        moduleSpecifier: '../query-keys',
        namedImports: queryKeyImports,
        typeOnlyNamedImports: queryKeyTypeImports,
      })
    );
  }

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

  // Query key - either re-export from centralized keys or define inline
  if (useCentralizedKeys) {
    // Re-export the query key function from centralized keys
    sourceFile.addVariableStatement(
      createConst(
        `${queryName}QueryKey`,
        `${keysName}.detail`,
        { docs: ['Query key factory - re-exported from query-keys.ts'] }
      )
    );
  } else {
    // Legacy: Define inline query key factory
    sourceFile.addVariableStatement(
      createConst(
        `${queryName}QueryKey`,
        `(${pkName}: ${pkTsType}) =>
  ['${typeName.toLowerCase()}', 'detail', ${pkName}] as const`
      )
    );
  }

  // Add React Query hook section (only if enabled)
  if (reactQueryEnabled) {
    sourceFile.addStatements('\n// ============================================================================');
    sourceFile.addStatements('// Hook');
    sourceFile.addStatements('// ============================================================================\n');

    // Hook parameters - add scope support when entity has relationships
    const hookParameters: Array<{ name: string; type: string; hasQuestionToken?: boolean }> = [
      { name: pkName, type: pkTsType },
    ];

    // Options type - include scope if entity has relationships
    let optionsType: string;
    if (hasRelationships && useCentralizedKeys) {
      optionsType = `Omit<UseQueryOptions<${ucFirst(singularName)}QueryResult, Error>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`;
    } else {
      optionsType = `Omit<UseQueryOptions<${ucFirst(singularName)}QueryResult, Error>, 'queryKey' | 'queryFn'>`;
    }

    hookParameters.push({
      name: 'options',
      type: optionsType,
      hasQuestionToken: true,
    });

    // Hook body - use scope if available
    let hookBody: string;
    if (hasRelationships && useCentralizedKeys) {
      hookBody = `const { scope, ...queryOptions } = options ?? {};
  return useQuery({
    queryKey: ${keysName}.detail(${pkName}, scope),
    queryFn: () => execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
      ${queryName}QueryDocument,
      { ${pkName} }
    ),
    enabled: !!${pkName} && (queryOptions?.enabled !== false),
    ...queryOptions,
  });`;
    } else if (useCentralizedKeys) {
      hookBody = `return useQuery({
    queryKey: ${keysName}.detail(${pkName}),
    queryFn: () => execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
      ${queryName}QueryDocument,
      { ${pkName} }
    ),
    enabled: !!${pkName} && (options?.enabled !== false),
    ...options,
  });`;
    } else {
      hookBody = `return useQuery({
    queryKey: ${queryName}QueryKey(${pkName}),
    queryFn: () => execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
      ${queryName}QueryDocument,
      { ${pkName} }
    ),
    enabled: !!${pkName} && (options?.enabled !== false),
    ...options,
  });`;
    }

    // Hook function
    sourceFile.addFunction({
      name: hookName,
      isExported: true,
      parameters: hookParameters,
      statements: hookBody,
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
    // Prefetch parameters - add scope support when entity has relationships
    const prefetchParams: Array<{ name: string; type: string; hasQuestionToken?: boolean }> = [
      { name: 'queryClient', type: 'QueryClient' },
      { name: pkName, type: pkTsType },
    ];

    if (hasRelationships && useCentralizedKeys) {
      prefetchParams.push({ name: 'scope', type: scopeTypeName, hasQuestionToken: true });
    }

    prefetchParams.push({ name: 'options', type: 'ExecuteOptions', hasQuestionToken: true });

    // Prefetch body
    let prefetchBody: string;
    if (hasRelationships && useCentralizedKeys) {
      prefetchBody = `await queryClient.prefetchQuery({
    queryKey: ${keysName}.detail(${pkName}, scope),
    queryFn: () => execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
      ${queryName}QueryDocument,
      { ${pkName} },
      options
    ),
  });`;
    } else if (useCentralizedKeys) {
      prefetchBody = `await queryClient.prefetchQuery({
    queryKey: ${keysName}.detail(${pkName}),
    queryFn: () => execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
      ${queryName}QueryDocument,
      { ${pkName} },
      options
    ),
  });`;
    } else {
      prefetchBody = `await queryClient.prefetchQuery({
    queryKey: ${queryName}QueryKey(${pkName}),
    queryFn: () => execute<${ucFirst(singularName)}QueryResult, ${ucFirst(singularName)}QueryVariables>(
      ${queryName}QueryDocument,
      { ${pkName} },
      options
    ),
  });`;
    }

    sourceFile.addFunction({
      name: `prefetch${ucFirst(singularName)}Query`,
      isExported: true,
      isAsync: true,
      parameters: prefetchParams,
      returnType: 'Promise<void>',
      statements: prefetchBody,
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
