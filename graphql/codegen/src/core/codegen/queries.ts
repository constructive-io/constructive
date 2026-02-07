/**
 * Query hook generators - delegates to ORM model methods
 *
 * Output structure:
 * queries/
 *   useCarsQuery.ts    - List query hook -> ORM findMany
 *   useCarQuery.ts     - Single item query hook -> ORM findOne
 */
import type { CleanTable } from '../../types/schema';
import {
  getAllRowsQueryName,
  getDefaultSelectFieldName,
  getFilterTypeName,
  getGeneratedFileHeader,
  getListQueryFileName,
  getListQueryHookName,
  getOrderByTypeName,
  getPrimaryKeyInfo,
  getSingleQueryFileName,
  getSingleQueryHookName,
  getSingleRowQueryName,
  getTableNames,
  hasValidPrimaryKey,
  lcFirst,
  ucFirst
} from './utils';

export interface GeneratedQueryFile {
  fileName: string;
  content: string;
}

export interface QueryGeneratorOptions {
  reactQueryEnabled?: boolean;
  useCentralizedKeys?: boolean;
  hasRelationships?: boolean;
}

export function generateListQueryHook(
  table: CleanTable,
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile {
  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true,
    hasRelationships = false
  } = options;
  const { typeName, pluralName, singularName } = getTableNames(table);
  const hookName = getListQueryHookName(table);
  const queryName = getAllRowsQueryName(table);
  const filterTypeName = getFilterTypeName(table);
  const orderByTypeName = getOrderByTypeName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const scopeTypeName = `${typeName}Scope`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;

  const defaultFieldName = getDefaultSelectFieldName(table);
  const listResultType = (s: string) => `{ ${queryName}: ConnectionResult<InferSelectResult<${relationTypeName}, ${s}>> }`;
  const selectionType = (s: string) => `ListSelectionConfig<${s}, ${filterTypeName}, ${orderByTypeName}>`;
  const selectionWithFieldsType = (s: string) =>
    `({ fields: ${s} } & Omit<${selectionType(s)}, 'fields'> & StrictSelect<${s}, ${selectTypeName}>)`;
  const selectionWithoutFieldsType = () =>
    `(Omit<${selectionType(selectTypeName)}, 'fields'> & { fields?: undefined })`;

  const lines: string[] = [];

  // Imports
  if (reactQueryEnabled) {
    lines.push(`import { useQuery } from '@tanstack/react-query';`);
    lines.push(`import type { UseQueryOptions, UseQueryResult, QueryClient } from '@tanstack/react-query';`);
  }
  lines.push(`import { getClient } from '../client';`);
  lines.push(`import { buildListSelectionArgs } from '../selection';`);
  lines.push(`import type { ListSelectionConfig } from '../selection';`);

  if (useCentralizedKeys) {
    lines.push(`import { ${keysName} } from '../query-keys';`);
    if (hasRelationships) {
      lines.push(`import type { ${scopeTypeName} } from '../query-keys';`);
    }
  }

  lines.push(`import type {`);
  lines.push(`  ${selectTypeName},`);
  lines.push(`  ${relationTypeName},`);
  lines.push(`  ${filterTypeName},`);
  lines.push(`  ${orderByTypeName},`);
  lines.push(`} from '../../orm/input-types';`);
  lines.push(`import type {`);
  lines.push(`  FindManyArgs,`);
  lines.push(`  InferSelectResult,`);
  lines.push(`  ConnectionResult,`);
  lines.push(`  StrictSelect,`);
  lines.push(`} from '../../orm/select-types';`);
  lines.push('');

  // Re-export types for backwards compat
  lines.push(`export type { ${selectTypeName}, ${relationTypeName}, ${filterTypeName}, ${orderByTypeName} } from '../../orm/input-types';`);
  lines.push('');

  lines.push(`const defaultSelect = { ${defaultFieldName}: true } as const;`);
  lines.push('');

  // Query key
  if (useCentralizedKeys) {
    lines.push(`/** Query key factory - re-exported from query-keys.ts */`);
    lines.push(`export const ${queryName}QueryKey = ${keysName}.list;`);
  } else {
    lines.push(`export const ${queryName}QueryKey = (variables?: FindManyArgs<unknown, ${filterTypeName}, ${orderByTypeName}>) => ['${typeName.toLowerCase()}', 'list', variables] as const;`);
  }
  lines.push('');

  // Hook
  if (reactQueryEnabled) {
    const docLines = [
      `/**`,
      ` * Query hook for fetching ${typeName} list`,
      ` *`,
      ` * @example`,
      ` * \`\`\`tsx`,
      ` * const { data, isLoading } = ${hookName}({`,
      ` *   selection: {`,
      ` *     fields: { id: true, name: true },`,
      ` *     where: { name: { equalTo: "example" } },`,
      ` *     orderBy: ['CREATED_AT_DESC'],`,
      ` *     first: 10,`,
      ` *   },`,
      ` * });`,
      ` * \`\`\``
    ];
    if (hasRelationships && useCentralizedKeys) {
      docLines.push(` *`);
      docLines.push(` * @example With scope for hierarchical cache invalidation`);
      docLines.push(` * \`\`\`tsx`);
      docLines.push(` * const { data } = ${hookName}({`);
      docLines.push(` *   selection: { first: 10 },`);
      docLines.push(` *   scope: { parentId: 'parent-id' },`);
      docLines.push(` * });`);
      docLines.push(` * \`\`\``);
    }
    docLines.push(` */`);
    lines.push(...docLines);

    const optionsType = (queryData: string, data: string) =>
      hasRelationships && useCentralizedKeys
        ? `Omit<UseQueryOptions<${queryData}, Error, ${data}>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`
        : `Omit<UseQueryOptions<${queryData}, Error, ${data}>, 'queryKey' | 'queryFn'>`;
    const implOptionsType = hasRelationships && useCentralizedKeys
      ? `Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`
      : `Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>`;

    // Overload 1: with selection.fields (autocompletion)
    lines.push(`export function ${hookName}<S extends ${selectTypeName}, TData = ${listResultType('S')}>(`);
    lines.push(`  params: { selection: ${selectionWithFieldsType('S')} } & ${optionsType(listResultType('S'), 'TData')}`);
    lines.push(`): UseQueryResult<TData>;`);

    // Overload 2: no fields (default select)
    lines.push(`export function ${hookName}<TData = ${listResultType('typeof defaultSelect')}>(`);
    lines.push(`  params?: { selection?: ${selectionWithoutFieldsType()} } & ${optionsType(listResultType('typeof defaultSelect'), 'TData')}`);
    lines.push(`): UseQueryResult<TData>;`);

    // Implementation
    lines.push(`export function ${hookName}(`);
    lines.push(`  params?: { selection?: ${selectionType(selectTypeName)} } & ${implOptionsType}`);
    lines.push(`) {`);
    lines.push(`  const selection = params?.selection;`);
    lines.push(`  const args = buildListSelectionArgs<${selectTypeName}, ${filterTypeName}, ${orderByTypeName}>(selection);`);

    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  const { scope, selection: _selection, ...queryOptions } = params ?? {};`);
      lines.push(`  void _selection;`);
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${keysName}.list(args, scope),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany({ ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
    } else if (useCentralizedKeys) {
      lines.push(`  const { selection: _selection, ...queryOptions } = params ?? {};`);
      lines.push(`  void _selection;`);
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${keysName}.list(args),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany({ ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
    } else {
      lines.push(`  const { selection: _selection, ...queryOptions } = params ?? {};`);
      lines.push(`  void _selection;`);
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${queryName}QueryKey(args),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany({ ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
    }

    lines.push(`}`);
    lines.push('');
  }

  // Fetch function (non-hook)
  lines.push(`/**`);
  lines.push(` * Fetch ${typeName} list without React hooks`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`ts`);
  lines.push(` * const data = await fetch${ucFirst(pluralName)}Query({`);
  lines.push(` *   selection: {`);
  lines.push(` *     fields: { id: true },`);
  lines.push(` *     first: 10,`);
  lines.push(` *   },`);
  lines.push(` * });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  lines.push(`export async function fetch${ucFirst(pluralName)}Query<S extends ${selectTypeName}>(`);
  lines.push(`  params: { selection: ${selectionWithFieldsType('S')} }`);
  lines.push(`): Promise<${listResultType('S')}>;`);
  lines.push(`export async function fetch${ucFirst(pluralName)}Query(`);
  lines.push(`  params?: { selection?: ${selectionWithoutFieldsType()} }`);
  lines.push(`): Promise<${listResultType('typeof defaultSelect')}>;`);
  lines.push(`export async function fetch${ucFirst(pluralName)}Query(`);
  lines.push(`  params?: { selection?: ${selectionType(selectTypeName)} }`);
  lines.push(`) {`);
  lines.push(`  const args = buildListSelectionArgs<${selectTypeName}, ${filterTypeName}, ${orderByTypeName}>(params?.selection);`);
  lines.push(`  return getClient().${singularName}.findMany({ ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap();`);
  lines.push(`}`);
  lines.push('');

  // Prefetch function
  if (reactQueryEnabled) {
    lines.push(`/**`);
    lines.push(` * Prefetch ${typeName} list for SSR or cache warming`);
    lines.push(` *`);
    lines.push(` * @example`);
    lines.push(` * \`\`\`ts`);
    lines.push(` * await prefetch${ucFirst(pluralName)}Query(queryClient, { selection: { first: 10 } });`);
    lines.push(` * \`\`\``);
    lines.push(` */`);
    lines.push(`export async function prefetch${ucFirst(pluralName)}Query<S extends ${selectTypeName}>(`);
    lines.push(`  queryClient: QueryClient,`);
    lines.push(`  params: { selection: ${selectionWithFieldsType('S')} }${hasRelationships && useCentralizedKeys ? ` & { scope?: ${scopeTypeName} }` : ''}`);
    lines.push(`): Promise<void>;`);
    lines.push(`export async function prefetch${ucFirst(pluralName)}Query(`);
    lines.push(`  queryClient: QueryClient,`);
    lines.push(`  params?: { selection?: ${selectionWithoutFieldsType()} }${hasRelationships && useCentralizedKeys ? ` & { scope?: ${scopeTypeName} }` : ''}`);
    lines.push(`): Promise<void>;`);
    lines.push(`export async function prefetch${ucFirst(pluralName)}Query(`);
    lines.push(`  queryClient: QueryClient,`);
    lines.push(`  params?: { selection?: ${selectionType(selectTypeName)} }${hasRelationships && useCentralizedKeys ? ` & { scope?: ${scopeTypeName} }` : ''}`);
    lines.push(`): Promise<void> {`);
    lines.push(`  const args = buildListSelectionArgs<${selectTypeName}, ${filterTypeName}, ${orderByTypeName}>(params?.selection);`);

    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${keysName}.list(args, params?.scope),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany({ ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`  });`);
    } else if (useCentralizedKeys) {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${keysName}.list(args),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany({ ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`  });`);
    } else {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${queryName}QueryKey(args),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany({ ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`  });`);
    }

    lines.push(`}`);
  }

  const headerText = reactQueryEnabled
    ? `List query hook for ${typeName}`
    : `List query functions for ${typeName}`;
  const content = getGeneratedFileHeader(headerText) + '\n\n' + lines.join('\n') + '\n';

  return {
    fileName: getListQueryFileName(table),
    content
  };
}

export function generateSingleQueryHook(
  table: CleanTable,
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile | null {
  if (!hasValidPrimaryKey(table)) {
    return null;
  }

  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true,
    hasRelationships = false
  } = options;
  const { typeName, singularName } = getTableNames(table);
  const hookName = getSingleQueryHookName(table);
  const queryName = getSingleRowQueryName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const scopeTypeName = `${typeName}Scope`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];
  const pkFieldName = pkField?.name ?? 'id';
  const pkFieldTsType = pkField?.tsType ?? 'string';
  const defaultFieldName = getDefaultSelectFieldName(table);
  const singleResultType = (s: string) => `{ ${queryName}: InferSelectResult<${relationTypeName}, ${s}> | null }`;
  const selectionWithFieldsType = (s: string) =>
    `({ fields: ${s} } & StrictSelect<${s}, ${selectTypeName}>)`;
  const selectionWithoutFieldsType = () => `({ fields?: undefined })`;

  const lines: string[] = [];

  // Imports
  if (reactQueryEnabled) {
    lines.push(`import { useQuery } from '@tanstack/react-query';`);
    lines.push(`import type { UseQueryOptions, UseQueryResult, QueryClient } from '@tanstack/react-query';`);
  }
  lines.push(`import { getClient } from '../client';`);
  lines.push(`import { buildSelectionArgs } from '../selection';`);
  lines.push(`import type { SelectionConfig } from '../selection';`);

  if (useCentralizedKeys) {
    lines.push(`import { ${keysName} } from '../query-keys';`);
    if (hasRelationships) {
      lines.push(`import type { ${scopeTypeName} } from '../query-keys';`);
    }
  }

  lines.push(`import type {`);
  lines.push(`  ${selectTypeName},`);
  lines.push(`  ${relationTypeName},`);
  lines.push(`} from '../../orm/input-types';`);
  lines.push(`import type {`);
  lines.push(`  InferSelectResult,`);
  lines.push(`  StrictSelect,`);
  lines.push(`} from '../../orm/select-types';`);
  lines.push('');

  // Re-export types
  lines.push(`export type { ${selectTypeName}, ${relationTypeName} } from '../../orm/input-types';`);
  lines.push('');

  lines.push(`const defaultSelect = { ${defaultFieldName}: true } as const;`);
  lines.push('');

  // Query key
  if (useCentralizedKeys) {
    lines.push(`/** Query key factory - re-exported from query-keys.ts */`);
    lines.push(`export const ${queryName}QueryKey = ${keysName}.detail;`);
  } else {
    lines.push(`export const ${queryName}QueryKey = (id: ${pkFieldTsType}) => ['${typeName.toLowerCase()}', 'detail', id] as const;`);
  }
  lines.push('');

  // Hook
  if (reactQueryEnabled) {
    const docLines = [
      `/**`,
      ` * Query hook for fetching a single ${typeName}`,
      ` *`,
      ` * @example`,
      ` * \`\`\`tsx`,
      ` * const { data, isLoading } = ${hookName}({`,
      ` *   ${pkFieldName}: 'some-id',`,
      ` *   selection: { fields: { id: true, name: true } },`,
      ` * });`,
      ` * \`\`\``
    ];
    if (hasRelationships && useCentralizedKeys) {
      docLines.push(` *`);
      docLines.push(` * @example With scope for hierarchical cache invalidation`);
      docLines.push(` * \`\`\`tsx`);
      docLines.push(` * const { data } = ${hookName}({`);
      docLines.push(` *   ${pkFieldName}: 'some-id',`);
      docLines.push(` *   scope: { parentId: 'parent-id' },`);
      docLines.push(` * });`);
      docLines.push(` * \`\`\``);
    }
    docLines.push(` */`);
    lines.push(...docLines);

    const singleOptionsType = (queryData: string, data: string) =>
      hasRelationships && useCentralizedKeys
        ? `Omit<UseQueryOptions<${queryData}, Error, ${data}>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`
        : `Omit<UseQueryOptions<${queryData}, Error, ${data}>, 'queryKey' | 'queryFn'>`;
    const singleImplOptionsType = hasRelationships && useCentralizedKeys
      ? `Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`
      : `Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>`;

    // Overload 1: with selection.fields (provides contextual typing for autocompletion)
    lines.push(`export function ${hookName}<S extends ${selectTypeName}, TData = ${singleResultType('S')}>(`);
    lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection: ${selectionWithFieldsType('S')} } & ${singleOptionsType(singleResultType('S'), 'TData')}`);
    lines.push(`): UseQueryResult<TData>;`);

    // Overload 2: without fields (uses default select)
    lines.push(`export function ${hookName}<TData = ${singleResultType('typeof defaultSelect')}>(`);
    lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection?: ${selectionWithoutFieldsType()} } & ${singleOptionsType(singleResultType('typeof defaultSelect'), 'TData')}`);
    lines.push(`): UseQueryResult<TData>;`);

    // Implementation
    lines.push(`export function ${hookName}(`);
    lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection?: SelectionConfig<${selectTypeName}> } & ${singleImplOptionsType}`);
    lines.push(`) {`);
    lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params.selection);`);

    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  const { scope, selection: _selection, ...queryOptions } = params ?? {};`);
      lines.push(`  void _selection;`);
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${keysName}.detail(params.${pkFieldName}, scope),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne({ ${pkFieldName}: params.${pkFieldName}, ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
    } else if (useCentralizedKeys) {
      lines.push(`  const { selection: _selection, ...queryOptions } = params ?? {};`);
      lines.push(`  void _selection;`);
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${keysName}.detail(params.${pkFieldName}),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne({ ${pkFieldName}: params.${pkFieldName}, ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
    } else {
      lines.push(`  const { selection: _selection, ...queryOptions } = params ?? {};`);
      lines.push(`  void _selection;`);
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${queryName}QueryKey(params.${pkFieldName}),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne({ ${pkFieldName}: params.${pkFieldName}, ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
    }

    lines.push(`}`);
    lines.push('');
  }

  // Fetch function
  lines.push(`/**`);
  lines.push(` * Fetch a single ${typeName} without React hooks`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`ts`);
  lines.push(` * const data = await fetch${ucFirst(singularName)}Query({`);
  lines.push(` *   ${pkFieldName}: 'some-id',`);
  lines.push(` *   selection: { fields: { id: true } },`);
  lines.push(` * });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  lines.push(`export async function fetch${ucFirst(singularName)}Query<S extends ${selectTypeName}>(`);
  lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection: ${selectionWithFieldsType('S')} }`);
  lines.push(`): Promise<${singleResultType('S')}>;`);
  lines.push(`export async function fetch${ucFirst(singularName)}Query(`);
  lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection?: ${selectionWithoutFieldsType()} },`);
  lines.push(`): Promise<${singleResultType('typeof defaultSelect')}>;`);
  lines.push(`export async function fetch${ucFirst(singularName)}Query(`);
  lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection?: SelectionConfig<${selectTypeName}> },`);
  lines.push(`) {`);
  lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params.selection);`);
  lines.push(`  return getClient().${singularName}.findOne({ ${pkFieldName}: params.${pkFieldName}, ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap();`);
  lines.push(`}`);
  lines.push('');

  // Prefetch function
  if (reactQueryEnabled) {
    lines.push(`/**`);
    lines.push(` * Prefetch a single ${typeName} for SSR or cache warming`);
    lines.push(` *`);
    lines.push(` * @example`);
    lines.push(` * \`\`\`ts`);
    lines.push(` * await prefetch${ucFirst(singularName)}Query(queryClient, { ${pkFieldName}: 'some-id' });`);
    lines.push(` * \`\`\``);
    lines.push(` */`);
    lines.push(`export async function prefetch${ucFirst(singularName)}Query<S extends ${selectTypeName}>(`);
    lines.push(`  queryClient: QueryClient,`);
    lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection: ${selectionWithFieldsType('S')} }${hasRelationships && useCentralizedKeys ? ` & { scope?: ${scopeTypeName} }` : ''},`);
    if (hasRelationships && useCentralizedKeys) {
      // scope is included in params above
    }
    lines.push(`): Promise<void>;`);
    lines.push(`export async function prefetch${ucFirst(singularName)}Query(`);
    lines.push(`  queryClient: QueryClient,`);
    lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection?: ${selectionWithoutFieldsType()} }${hasRelationships && useCentralizedKeys ? ` & { scope?: ${scopeTypeName} }` : ''},`);
    lines.push(`): Promise<void>;`);
    lines.push(`export async function prefetch${ucFirst(singularName)}Query(`);
    lines.push(`  queryClient: QueryClient,`);
    lines.push(`  params: { ${pkFieldName}: ${pkFieldTsType}; selection?: SelectionConfig<${selectTypeName}> }${hasRelationships && useCentralizedKeys ? ` & { scope?: ${scopeTypeName} }` : ''},`);
    lines.push(`): Promise<void> {`);
    lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params.selection);`);

    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${keysName}.detail(params.${pkFieldName}, params.scope),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne({ ${pkFieldName}: params.${pkFieldName}, ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`  });`);
    } else if (useCentralizedKeys) {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${keysName}.detail(params.${pkFieldName}),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne({ ${pkFieldName}: params.${pkFieldName}, ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`  });`);
    } else {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${queryName}QueryKey(params.${pkFieldName}),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne({ ${pkFieldName}: params.${pkFieldName}, ...(args ?? {}), select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
      lines.push(`  });`);
    }

    lines.push(`}`);
  }

  const headerText = reactQueryEnabled
    ? `Single item query hook for ${typeName}`
    : `Single item query functions for ${typeName}`;
  const content = getGeneratedFileHeader(headerText) + '\n\n' + lines.join('\n') + '\n';

  return {
    fileName: getSingleQueryFileName(table),
    content
  };
}

export function generateAllQueryHooks(
  tables: CleanTable[],
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile[] {
  const files: GeneratedQueryFile[] = [];
  for (const table of tables) {
    files.push(generateListQueryHook(table, options));
    const singleHook = generateSingleQueryHook(table, options);
    if (singleHook) {
      files.push(singleHook);
    }
  }
  return files;
}
