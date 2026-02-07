/**
 * Custom query hook generators for non-table operations
 *
 * Generates hooks for operations discovered via schema introspection
 * that are NOT table CRUD operations (e.g., currentUser, nodeById, etc.)
 *
 * Delegates to ORM custom query operations:
 *   getClient().query.operationName(args, { select }).unwrap()
 *
 * Output structure:
 * queries/
 *   useCurrentUserQuery.ts
 *   useNodeQuery.ts
 *   ...
 */
import type {
  CleanOperation,
  TypeRegistry
} from '../../types/schema';
import {
  buildDefaultSelectLiteral,
  getSelectTypeName,
  wrapInferSelectResult
} from './select-helpers';
import {
  createTypeTracker,
  getOperationFileName,
  getOperationHookName,
  getQueryKeyName,
  getTypeBaseName,
  isTypeRequired,
  typeRefToTsType
} from './type-resolver';
import { getGeneratedFileHeader,ucFirst } from './utils';

export interface GeneratedCustomQueryFile {
  fileName: string;
  content: string;
  operationName: string;
}

export interface GenerateCustomQueryHookOptions {
  operation: CleanOperation;
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateCustomQueryHook(
  options: GenerateCustomQueryHookOptions
): GeneratedCustomQueryFile {
  const {
    operation,
    typeRegistry,
    reactQueryEnabled = true,
    tableTypeNames,
    useCentralizedKeys = true
  } = options;

  const hookName = getOperationHookName(operation.name, 'query');
  const fileName = getOperationFileName(operation.name, 'query');
  const queryKeyName = getQueryKeyName(operation.name);
  const varTypeName = `${ucFirst(operation.name)}Variables`;

  const tracker = createTypeTracker({ tableTypeNames });

  const hasArgs = operation.args.length > 0;
  const hasRequiredArgs = operation.args.some((arg) => isTypeRequired(arg.type));

  // Resolve types using tracker for import tracking
  const resultType = typeRefToTsType(operation.returnType, tracker);
  for (const arg of operation.args) {
    typeRefToTsType(arg.type, tracker);
  }

  const selectTypeName = getSelectTypeName(operation.returnType);
  const payloadTypeName = getTypeBaseName(operation.returnType);
  const hasSelect = !!selectTypeName && !!payloadTypeName;
  const defaultSelectLiteral =
    hasSelect && payloadTypeName
      ? buildDefaultSelectLiteral(payloadTypeName, typeRegistry)
      : null;

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
    lines.push(`import { customQueryKeys } from '../query-keys';`);
  }

  // ORM type imports - variable types come from orm/query, entity types from orm/input-types
  if (hasArgs) {
    lines.push(`import type { ${varTypeName} } from '../../orm/query';`);
  }

  const inputTypeImports: string[] = [];
  if (hasSelect) {
    inputTypeImports.push(selectTypeName);
    inputTypeImports.push(payloadTypeName);
  } else {
    // For scalar/Connection returns, import any non-scalar type used in resultType
    const baseName = getTypeBaseName(operation.returnType);
    if (baseName && !tracker.referencedTypes.has('__skip__')) {
      // Import Connection types and other non-scalar types referenced in the result
      for (const refType of tracker.referencedTypes) {
        if (!inputTypeImports.includes(refType)) {
          inputTypeImports.push(refType);
        }
      }
    }
  }
  if (inputTypeImports.length > 0) {
    lines.push(`import type { ${inputTypeImports.join(', ')} } from '../../orm/input-types';`);
  }

  if (hasSelect) {
    lines.push(`import type { InferSelectResult, StrictSelect } from '../../orm/select-types';`);
  }

  lines.push('');

  // Re-export variable types for consumer convenience
  if (hasArgs) {
    lines.push(`export type { ${varTypeName} } from '../../orm/query';`);
  }
  if (hasSelect) {
    lines.push(`export type { ${selectTypeName} } from '../../orm/input-types';`);
  }
  if (hasArgs || hasSelect) {
    lines.push('');
  }

  if (hasSelect && defaultSelectLiteral) {
    lines.push(`const defaultSelect = ${defaultSelectLiteral} as const;`);
    lines.push('');
  }

  // Query key
  if (useCentralizedKeys) {
    lines.push(`/** Query key factory - re-exported from query-keys.ts */`);
    lines.push(`export const ${queryKeyName} = customQueryKeys.${operation.name};`);
  } else if (hasArgs) {
    lines.push(`/** Query key factory for caching */`);
    lines.push(`export const ${queryKeyName} = (variables?: ${varTypeName}) => ['${operation.name}', variables] as const;`);
  } else {
    lines.push(`/** Query key factory for caching */`);
    lines.push(`export const ${queryKeyName} = () => ['${operation.name}'] as const;`);
  }
  lines.push('');

  // Hook
  if (reactQueryEnabled) {
    const description = operation.description || `Query hook for ${operation.name}`;
    const argNames = operation.args.map((a) => a.name).join(', ');
    const exampleCall = hasArgs ? `${hookName}({ ${argNames} })` : `${hookName}()`;

    lines.push(`/**`);
    lines.push(` * ${description}`);
    lines.push(` *`);
    lines.push(` * @example`);
    lines.push(` * \`\`\`tsx`);
    lines.push(` * const { data, isLoading } = ${exampleCall};`);
    lines.push(` *`);
    lines.push(` * if (data?.${operation.name}) {`);
    lines.push(` *   console.log(data.${operation.name});`);
    lines.push(` * }`);
    lines.push(` * \`\`\``);
    lines.push(` */`);

    if (hasSelect) {
      // With selection.fields: overloaded hook for autocompletion
      const customSelectResultType = (s: string) =>
        `{ ${operation.name}: ${wrapInferSelectResult(operation.returnType, payloadTypeName!, s)} }`;
      const optionsType = (queryData: string, data: string) =>
        `Omit<UseQueryOptions<${queryData}, Error, ${data}>, 'queryKey' | 'queryFn'>`;

      const withFieldsSelectionType = (s: string) =>
        `({ fields: ${s} } & StrictSelect<${s}, ${selectTypeName}>)`;
      const withoutFieldsSelectionType = () => `({ fields?: undefined })`;

      // Overload 1: with selection.fields
      if (hasArgs) {
        const varTypeStr = hasRequiredArgs ? varTypeName : `${varTypeName} | undefined`;
        lines.push(`export function ${hookName}<S extends ${selectTypeName}, TData = ${customSelectResultType('S')}>(`);
        lines.push(`  params: { variables: ${varTypeStr}; selection: ${withFieldsSelectionType('S')} } & ${optionsType(customSelectResultType('S'), 'TData')}`);
        lines.push(`): UseQueryResult<TData>;`);
      } else {
        lines.push(`export function ${hookName}<S extends ${selectTypeName}, TData = ${customSelectResultType('S')}>(`);
        lines.push(`  params: { selection: ${withFieldsSelectionType('S')} } & ${optionsType(customSelectResultType('S'), 'TData')}`);
        lines.push(`): UseQueryResult<TData>;`);
      }

      // Overload 2: without selection.fields (uses default)
      if (hasArgs) {
        lines.push(`export function ${hookName}<TData = ${customSelectResultType('typeof defaultSelect')}>(`);
        lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName}; selection?: ${withoutFieldsSelectionType()} } & ${optionsType(customSelectResultType('typeof defaultSelect'), 'TData')}`);
        lines.push(`): UseQueryResult<TData>;`);
      } else {
        lines.push(`export function ${hookName}<TData = ${customSelectResultType('typeof defaultSelect')}>(`);
        lines.push(`  params?: { selection?: ${withoutFieldsSelectionType()} } & ${optionsType(customSelectResultType('typeof defaultSelect'), 'TData')}`);
        lines.push(`): UseQueryResult<TData>;`);
      }

      // Implementation
      if (hasArgs) {
        lines.push(`export function ${hookName}(`);
        lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName}; selection?: SelectionConfig<${selectTypeName}> } & Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>`);
        lines.push(`) {`);
        lines.push(`  const variables = params?.variables;`);
        lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
        lines.push(`  const { variables: _variables, selection: _selection, ...queryOptions } = params ?? {};`);
        lines.push(`  void _variables;`);
        lines.push(`  void _selection;`);
        lines.push(`  return useQuery({`);
        lines.push(`    queryKey: ${queryKeyName}(variables),`);
        lines.push(`    queryFn: () => getClient().query.${operation.name}(${hasRequiredArgs ? 'variables!' : 'variables'}, { select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
        if (hasRequiredArgs) {
          lines.push(`    enabled: !!variables && params?.enabled !== false,`);
        }
        lines.push(`    ...queryOptions,`);
        lines.push(`  });`);
        lines.push(`}`);
      } else {
        lines.push(`export function ${hookName}(`);
        lines.push(`  params?: { selection?: SelectionConfig<${selectTypeName}> } & Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>`);
        lines.push(`) {`);
        lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
        lines.push(`  const { selection: _selection, ...queryOptions } = params ?? {};`);
        lines.push(`  void _selection;`);
        lines.push(`  return useQuery({`);
        lines.push(`    queryKey: ${queryKeyName}(),`);
        lines.push(`    queryFn: () => getClient().query.${operation.name}({ select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
        lines.push(`    ...queryOptions,`);
        lines.push(`  });`);
        lines.push(`}`);
      }
    } else {
      // Without select: simple hook (scalar return type)
      const resultTypeStr = `{ ${operation.name}: ${resultType} }`;
      const optionsType = `Omit<UseQueryOptions<${resultTypeStr}, Error, TData>, 'queryKey' | 'queryFn'>`;

      lines.push(`export function ${hookName}<TData = ${resultTypeStr}>(`);
      if (hasArgs) {
        lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName} } & ${optionsType}`);
      } else {
        lines.push(`  params?: ${optionsType}`);
      }
      lines.push(`): UseQueryResult<TData> {`);
      if (hasArgs) {
        lines.push(`  const variables = params?.variables;`);
        lines.push(`  const { variables: _variables, ...queryOptions } = params ?? {};`);
        lines.push(`  void _variables;`);
      } else {
        lines.push(`  const queryOptions = params ?? {};`);
      }
      lines.push(`  return useQuery({`);

      if (hasArgs) {
        lines.push(`    queryKey: ${queryKeyName}(variables),`);
        lines.push(`    queryFn: () => getClient().query.${operation.name}(${hasRequiredArgs ? 'variables!' : 'variables'}).unwrap(),`);
      } else {
        lines.push(`    queryKey: ${queryKeyName}(),`);
        lines.push(`    queryFn: () => getClient().query.${operation.name}().unwrap(),`);
      }

      if (hasRequiredArgs) {
        lines.push(`    enabled: !!variables && params?.enabled !== false,`);
      }

      lines.push(`    ...queryOptions,`);
      lines.push(`  });`);
      lines.push(`}`);
    }

    lines.push('');
  }

  // Fetch function (non-hook)
  const fetchFnName = `fetch${ucFirst(operation.name)}Query`;
  const fetchArgNames = operation.args.map((a) => a.name).join(', ');
  const fetchExampleCall = hasArgs ? `${fetchFnName}({ ${fetchArgNames} })` : `${fetchFnName}()`;

  lines.push(`/**`);
  lines.push(` * Fetch ${operation.name} without React hooks`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`ts`);
  lines.push(` * const data = await ${fetchExampleCall};`);
  lines.push(` * \`\`\``);
  lines.push(` */`);

  if (hasSelect) {
    const customSelectResultType = (s: string) =>
      `{ ${operation.name}: ${wrapInferSelectResult(operation.returnType, payloadTypeName!, s)} }`;
    const withFieldsSelectionType = (s: string) =>
      `({ fields: ${s} } & StrictSelect<${s}, ${selectTypeName}>)`;
    const withoutFieldsSelectionType = () => `({ fields?: undefined })`;

    if (hasArgs) {
      const requiredVarType = hasRequiredArgs ? varTypeName : `${varTypeName} | undefined`;

      lines.push(`export async function ${fetchFnName}<S extends ${selectTypeName}>(`);
      lines.push(`  params: { variables: ${requiredVarType}; selection: ${withFieldsSelectionType('S')} }`);
      lines.push(`): Promise<${customSelectResultType('S')}>;`);
      lines.push(`export async function ${fetchFnName}(`);
      lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName}; selection?: ${withoutFieldsSelectionType()} }`);
      lines.push(`): Promise<${customSelectResultType('typeof defaultSelect')}>;`);
      lines.push(`export async function ${fetchFnName}(`);
      lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName}; selection?: SelectionConfig<${selectTypeName}> },`);
      lines.push(`) {`);
      lines.push(`  const variables = params?.variables;`);
      lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
      lines.push(`  return getClient().query.${operation.name}(${hasRequiredArgs ? 'variables!' : 'variables'}, { select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap();`);
      lines.push(`}`);
    } else {
      lines.push(`export async function ${fetchFnName}<S extends ${selectTypeName}>(`);
      lines.push(`  params: { selection: ${withFieldsSelectionType('S')} }`);
      lines.push(`): Promise<${customSelectResultType('S')}>;`);
      lines.push(`export async function ${fetchFnName}(`);
      lines.push(`  params?: { selection?: ${withoutFieldsSelectionType()} },`);
      lines.push(`): Promise<${customSelectResultType('typeof defaultSelect')}>;`);
      lines.push(`export async function ${fetchFnName}(`);
      lines.push(`  params?: { selection?: SelectionConfig<${selectTypeName}> },`);
      lines.push(`) {`);
      lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
      lines.push(`  return getClient().query.${operation.name}({ select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap();`);
      lines.push(`}`);
    }
  } else {
    if (hasArgs) {
      lines.push(`export async function ${fetchFnName}(`);
      lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName} }`);
      lines.push(`) {`);
      lines.push(`  const variables = params?.variables;`);
      lines.push(`  return getClient().query.${operation.name}(${hasRequiredArgs ? 'variables!' : 'variables'}).unwrap();`);
      lines.push(`}`);
    } else {
      lines.push(`export async function ${fetchFnName}() {`);
      lines.push(`  return getClient().query.${operation.name}().unwrap();`);
      lines.push(`}`);
    }
  }

  // Prefetch function
  if (reactQueryEnabled) {
    lines.push('');

    const prefetchFnName = `prefetch${ucFirst(operation.name)}Query`;
    const prefetchArgNames = operation.args.map((a) => a.name).join(', ');
    const prefetchExampleCall = hasArgs
      ? `${prefetchFnName}(queryClient, { ${prefetchArgNames} })`
      : `${prefetchFnName}(queryClient)`;

    lines.push(`/**`);
    lines.push(` * Prefetch ${operation.name} for SSR or cache warming`);
    lines.push(` *`);
    lines.push(` * @example`);
    lines.push(` * \`\`\`ts`);
    lines.push(` * await ${prefetchExampleCall};`);
    lines.push(` * \`\`\``);
    lines.push(` */`);

    if (hasSelect) {
      const withFieldsSelectionType = (s: string) =>
        `({ fields: ${s} } & StrictSelect<${s}, ${selectTypeName}>)`;
      const withoutFieldsSelectionType = () => `({ fields?: undefined })`;

      if (hasArgs) {
        const requiredVarType = hasRequiredArgs ? varTypeName : `${varTypeName} | undefined`;

        lines.push(`export async function ${prefetchFnName}<S extends ${selectTypeName}>(`);
        lines.push(`  queryClient: QueryClient,`);
        lines.push(`  params: { variables: ${requiredVarType}; selection: ${withFieldsSelectionType('S')} }`);
        lines.push(`): Promise<void>;`);
        lines.push(`export async function ${prefetchFnName}(`);
        lines.push(`  queryClient: QueryClient,`);
        lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName}; selection?: ${withoutFieldsSelectionType()} }`);
        lines.push(`): Promise<void>;`);
        lines.push(`export async function ${prefetchFnName}(`);
        lines.push(`  queryClient: QueryClient,`);
        lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName}; selection?: SelectionConfig<${selectTypeName}> }`);
        lines.push(`): Promise<void> {`);
        lines.push(`  const variables = params?.variables;`);
        lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
        lines.push(`  await queryClient.prefetchQuery({`);
        lines.push(`    queryKey: ${queryKeyName}(variables),`);
        lines.push(`    queryFn: () => getClient().query.${operation.name}(${hasRequiredArgs ? 'variables!' : 'variables'}, { select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
        lines.push(`  });`);
        lines.push(`}`);
      } else {
        lines.push(`export async function ${prefetchFnName}<S extends ${selectTypeName}>(`);
        lines.push(`  queryClient: QueryClient,`);
        lines.push(`  params: { selection: ${withFieldsSelectionType('S')} }`);
        lines.push(`): Promise<void>;`);
        lines.push(`export async function ${prefetchFnName}(`);
        lines.push(`  queryClient: QueryClient,`);
        lines.push(`  params?: { selection?: ${withoutFieldsSelectionType()} }`);
        lines.push(`): Promise<void>;`);
        lines.push(`export async function ${prefetchFnName}(`);
        lines.push(`  queryClient: QueryClient,`);
        lines.push(`  params?: { selection?: SelectionConfig<${selectTypeName}> }`);
        lines.push(`): Promise<void> {`);
        lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
        lines.push(`  await queryClient.prefetchQuery({`);
        lines.push(`    queryKey: ${queryKeyName}(),`);
        lines.push(`    queryFn: () => getClient().query.${operation.name}({ select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
        lines.push(`  });`);
        lines.push(`}`);
      }
    } else {
      if (hasArgs) {
        lines.push(`export async function ${prefetchFnName}(`);
        lines.push(`  queryClient: QueryClient,`);
        lines.push(`  params${hasRequiredArgs ? '' : '?'}: { variables${hasRequiredArgs ? '' : '?'}: ${varTypeName} }`);
        lines.push(`): Promise<void> {`);
        lines.push(`  const variables = params?.variables;`);
        lines.push(`  await queryClient.prefetchQuery({`);
        lines.push(`    queryKey: ${queryKeyName}(variables),`);
        lines.push(`    queryFn: () => getClient().query.${operation.name}(${hasRequiredArgs ? 'variables!' : 'variables'}).unwrap(),`);
        lines.push(`  });`);
        lines.push(`}`);
      } else {
        lines.push(`export async function ${prefetchFnName}(queryClient: QueryClient): Promise<void> {`);
        lines.push(`  await queryClient.prefetchQuery({`);
        lines.push(`    queryKey: ${queryKeyName}(),`);
        lines.push(`    queryFn: () => getClient().query.${operation.name}().unwrap(),`);
        lines.push(`  });`);
        lines.push(`}`);
      }
    }
  }

  const headerText = reactQueryEnabled
    ? `Custom query hook for ${operation.name}`
    : `Custom query functions for ${operation.name}`;
  const content = getGeneratedFileHeader(headerText) + '\n\n' + lines.join('\n') + '\n';

  return {
    fileName,
    content,
    operationName: operation.name
  };
}

export interface GenerateAllCustomQueryHooksOptions {
  operations: CleanOperation[];
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateAllCustomQueryHooks(
  options: GenerateAllCustomQueryHooksOptions
): GeneratedCustomQueryFile[] {
  const {
    operations,
    typeRegistry,
    maxDepth = 2,
    skipQueryField = true,
    reactQueryEnabled = true,
    tableTypeNames,
    useCentralizedKeys = true
  } = options;

  return operations
    .filter((op) => op.kind === 'query')
    .map((operation) =>
      generateCustomQueryHook({
        operation,
        typeRegistry,
        maxDepth,
        skipQueryField,
        reactQueryEnabled,
        tableTypeNames,
        useCentralizedKeys
      })
    );
}
