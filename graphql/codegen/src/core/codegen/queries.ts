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

  const lines: string[] = [];

  // Imports
  if (reactQueryEnabled) {
    lines.push(`import { useQuery } from '@tanstack/react-query';`);
    lines.push(`import type { UseQueryOptions, QueryClient } from '@tanstack/react-query';`);
  }
  lines.push(`import { getClient } from '../client';`);

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
  lines.push(`  DeepExact,`);
  lines.push(`  InferSelectResult,`);
  lines.push(`  ConnectionResult,`);
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
    lines.push(`export const ${queryName}QueryKey = (variables?: FindManyArgs<any, ${filterTypeName}, ${orderByTypeName}>) => ['${typeName.toLowerCase()}', 'list', variables] as const;`);
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
      ` *   select: { id: true, name: true },`,
      ` *   first: 10,`,
      ` *   where: { name: { equalTo: "example" } },`,
      ` *   orderBy: ['CREATED_AT_DESC'],`,
      ` * });`,
      ` * \`\`\``
    ];
    if (hasRelationships && useCentralizedKeys) {
      docLines.push(` *`);
      docLines.push(` * @example With scope for hierarchical cache invalidation`);
      docLines.push(` * \`\`\`tsx`);
      docLines.push(` * const { data } = ${hookName}(`);
      docLines.push(` *   { first: 10 },`);
      docLines.push(` *   { scope: { parentId: 'parent-id' } }`);
      docLines.push(` * );`);
      docLines.push(` * \`\`\``);
    }
    docLines.push(` */`);
    lines.push(...docLines);

    let optionsType: string;
    if (hasRelationships && useCentralizedKeys) {
      optionsType = `Omit<UseQueryOptions<{ ${queryName}: ConnectionResult<InferSelectResult<${relationTypeName}, S>> }, Error>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`;
    } else {
      optionsType = `Omit<UseQueryOptions<{ ${queryName}: ConnectionResult<InferSelectResult<${relationTypeName}, S>> }, Error>, 'queryKey' | 'queryFn'>`;
    }

    lines.push(`export function ${hookName}<const S extends ${selectTypeName} = typeof defaultSelect>(`);
    lines.push(`  args?: FindManyArgs<DeepExact<S, ${selectTypeName}>, ${filterTypeName}, ${orderByTypeName}>,`);
    lines.push(`  options?: ${optionsType}`);
    lines.push(`) {`);

    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  const { scope, ...queryOptions } = options ?? {};`);
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${keysName}.list(args, scope),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany(args).unwrap(),`);
      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
    } else if (useCentralizedKeys) {
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${keysName}.list(args),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany(args).unwrap(),`);
      lines.push(`    ...options,`);
      lines.push(`  });`);
    } else {
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${queryName}QueryKey(args),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany(args).unwrap(),`);
      lines.push(`    ...options,`);
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
  lines.push(` * const data = await fetch${ucFirst(pluralName)}Query({ first: 10, select: { id: true } });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  lines.push(`export async function fetch${ucFirst(pluralName)}Query<const S extends ${selectTypeName} = typeof defaultSelect>(`);
  lines.push(`  args?: FindManyArgs<DeepExact<S, ${selectTypeName}>, ${filterTypeName}, ${orderByTypeName}>,`);
  lines.push(`) {`);
  lines.push(`  return getClient().${singularName}.findMany(args).unwrap();`);
  lines.push(`}`);
  lines.push('');

  // Prefetch function
  if (reactQueryEnabled) {
    lines.push(`/**`);
    lines.push(` * Prefetch ${typeName} list for SSR or cache warming`);
    lines.push(` *`);
    lines.push(` * @example`);
    lines.push(` * \`\`\`ts`);
    lines.push(` * await prefetch${ucFirst(pluralName)}Query(queryClient, { first: 10 });`);
    lines.push(` * \`\`\``);
    lines.push(` */`);
    lines.push(`export async function prefetch${ucFirst(pluralName)}Query<const S extends ${selectTypeName} = typeof defaultSelect>(`);
    lines.push(`  queryClient: QueryClient,`);
    lines.push(`  args?: FindManyArgs<DeepExact<S, ${selectTypeName}>, ${filterTypeName}, ${orderByTypeName}>,`);
    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  scope?: ${scopeTypeName},`);
    }
    lines.push(`): Promise<void> {`);

    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${keysName}.list(args, scope),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany(args).unwrap(),`);
      lines.push(`  });`);
    } else if (useCentralizedKeys) {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${keysName}.list(args),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany(args).unwrap(),`);
      lines.push(`  });`);
    } else {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${queryName}QueryKey(args),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findMany(args).unwrap(),`);
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

  const lines: string[] = [];

  // Imports
  if (reactQueryEnabled) {
    lines.push(`import { useQuery } from '@tanstack/react-query';`);
    lines.push(`import type { UseQueryOptions, QueryClient } from '@tanstack/react-query';`);
  }
  lines.push(`import { getClient } from '../client';`);

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
  lines.push(`  DeepExact,`);
  lines.push(`  InferSelectResult,`);
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
      ` *   select: { id: true, name: true },`,
      ` * });`,
      ` * \`\`\``
    ];
    if (hasRelationships && useCentralizedKeys) {
      docLines.push(` *`);
      docLines.push(` * @example With scope for hierarchical cache invalidation`);
      docLines.push(` * \`\`\`tsx`);
      docLines.push(` * const { data } = ${hookName}(`);
      docLines.push(` *   { ${pkFieldName}: 'some-id' },`);
      docLines.push(` *   { scope: { parentId: 'parent-id' } }`);
      docLines.push(` * );`);
      docLines.push(` * \`\`\``);
    }
    docLines.push(` */`);
    lines.push(...docLines);

    let optionsType: string;
    if (hasRelationships && useCentralizedKeys) {
      optionsType = `Omit<UseQueryOptions<{ ${queryName}: InferSelectResult<${relationTypeName}, S> | null }, Error>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`;
    } else {
      optionsType = `Omit<UseQueryOptions<{ ${queryName}: InferSelectResult<${relationTypeName}, S> | null }, Error>, 'queryKey' | 'queryFn'>`;
    }

    lines.push(`export function ${hookName}<const S extends ${selectTypeName} = typeof defaultSelect>(`);
    lines.push(`  args: { ${pkFieldName}: ${pkFieldTsType}; select?: DeepExact<S, ${selectTypeName}> },`);
    lines.push(`  options?: ${optionsType}`);
    lines.push(`) {`);

    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  const { scope, ...queryOptions } = options ?? {};`);
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${keysName}.detail(args.${pkFieldName}, scope),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne(args).unwrap(),`);
      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
    } else if (useCentralizedKeys) {
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${keysName}.detail(args.${pkFieldName}),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne(args).unwrap(),`);
      lines.push(`    ...options,`);
      lines.push(`  });`);
    } else {
      lines.push(`  return useQuery({`);
      lines.push(`    queryKey: ${queryName}QueryKey(args.${pkFieldName}),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne(args).unwrap(),`);
      lines.push(`    ...options,`);
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
  lines.push(` * const data = await fetch${ucFirst(singularName)}Query({ ${pkFieldName}: 'some-id', select: { id: true } });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  lines.push(`export async function fetch${ucFirst(singularName)}Query<const S extends ${selectTypeName} = typeof defaultSelect>(`);
  lines.push(`  args: { ${pkFieldName}: ${pkFieldTsType}; select?: DeepExact<S, ${selectTypeName}> },`);
  lines.push(`) {`);
  lines.push(`  return getClient().${singularName}.findOne(args).unwrap();`);
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
    lines.push(`export async function prefetch${ucFirst(singularName)}Query<const S extends ${selectTypeName} = typeof defaultSelect>(`);
    lines.push(`  queryClient: QueryClient,`);
    lines.push(`  args: { ${pkFieldName}: ${pkFieldTsType}; select?: DeepExact<S, ${selectTypeName}> },`);
    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  scope?: ${scopeTypeName},`);
    }
    lines.push(`): Promise<void> {`);

    if (hasRelationships && useCentralizedKeys) {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${keysName}.detail(args.${pkFieldName}, scope),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne(args).unwrap(),`);
      lines.push(`  });`);
    } else if (useCentralizedKeys) {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${keysName}.detail(args.${pkFieldName}),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne(args).unwrap(),`);
      lines.push(`  });`);
    } else {
      lines.push(`  await queryClient.prefetchQuery({`);
      lines.push(`    queryKey: ${queryName}QueryKey(args.${pkFieldName}),`);
      lines.push(`    queryFn: () => getClient().${singularName}.findOne(args).unwrap(),`);
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
