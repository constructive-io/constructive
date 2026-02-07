/**
 * Custom mutation hook generators for non-table operations
 *
 * Generates hooks for operations discovered via schema introspection
 * that are NOT table CRUD operations (e.g., login, register, etc.)
 *
 * Delegates to ORM custom mutation operations:
 *   getClient().mutation.operationName(args, { select }).unwrap()
 *
 * Output structure:
 * mutations/
 *   useLoginMutation.ts
 *   useRegisterMutation.ts
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
  getTypeBaseName,
  typeRefToTsType
} from './type-resolver';
import { getGeneratedFileHeader,ucFirst } from './utils';

export interface GeneratedCustomMutationFile {
  fileName: string;
  content: string;
  operationName: string;
}

export interface GenerateCustomMutationHookOptions {
  operation: CleanOperation;
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateCustomMutationHook(
  options: GenerateCustomMutationHookOptions
): GeneratedCustomMutationFile | null {
  const { operation, reactQueryEnabled = true } = options;

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
  const {
    operation,
    typeRegistry,
    tableTypeNames,
    useCentralizedKeys = true
  } = options;

  const hookName = getOperationHookName(operation.name, 'mutation');
  const fileName = getOperationFileName(operation.name, 'mutation');
  const varTypeName = `${ucFirst(operation.name)}Variables`;

  const tracker = createTypeTracker({ tableTypeNames });

  const hasArgs = operation.args.length > 0;

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
  lines.push(`import { useMutation } from '@tanstack/react-query';`);
  lines.push(`import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';`);
  lines.push(`import { getClient } from '../client';`);
  lines.push(`import { buildSelectionArgs } from '../selection';`);
  lines.push(`import type { SelectionConfig } from '../selection';`);

  if (useCentralizedKeys) {
    lines.push(`import { customMutationKeys } from '../mutation-keys';`);
  }

  // ORM type imports - variable types come from orm/mutation, entity types from orm/input-types
  if (hasArgs) {
    lines.push(`import type { ${varTypeName} } from '../../orm/mutation';`);
  }

  const inputTypeImports: string[] = [];
  if (hasSelect) {
    inputTypeImports.push(selectTypeName);
    inputTypeImports.push(payloadTypeName);
  } else {
    // For scalar/Connection returns, import any non-scalar type used in resultType
    for (const refType of tracker.referencedTypes) {
      if (!inputTypeImports.includes(refType)) {
        inputTypeImports.push(refType);
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
    lines.push(`export type { ${varTypeName} } from '../../orm/mutation';`);
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

  // Hook
  if (hasSelect) {
    // With selection.fields: overloaded hook for autocompletion + typed options/result
    const mutationVarType = hasArgs ? varTypeName : 'void';
    const selectedResultType = (s: string) =>
      `{ ${operation.name}: ${wrapInferSelectResult(operation.returnType, payloadTypeName!, s)} }`;
    const mutationOptionsType = (s: string) =>
      `Omit<UseMutationOptions<${selectedResultType(s)}, Error, ${mutationVarType}>, 'mutationFn'>`;
    const selectionWithFieldsType = (s: string) =>
      `({ fields: ${s} } & StrictSelect<${s}, ${selectTypeName}>)`;
    const selectionWithoutFieldsType = () => `({ fields?: undefined })`;

    lines.push(`export function ${hookName}<S extends ${selectTypeName}>(`);
    lines.push(`  params: { selection: ${selectionWithFieldsType('S')} } & ${mutationOptionsType('S')}`);
    lines.push(`): UseMutationResult<${selectedResultType('S')}, Error, ${mutationVarType}>;`);
    lines.push(`export function ${hookName}(`);
    lines.push(`  params?: { selection?: ${selectionWithoutFieldsType()} } & ${mutationOptionsType('typeof defaultSelect')}`);
    lines.push(`): UseMutationResult<${selectedResultType('typeof defaultSelect')}, Error, ${mutationVarType}>;`);
    lines.push(`export function ${hookName}(`);
    lines.push(`  params?: { selection?: SelectionConfig<${selectTypeName}> } & Omit<UseMutationOptions<any, Error, ${mutationVarType}>, 'mutationFn'>`);
    lines.push(`) {`);
    lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
    lines.push(`  const { selection: _selection, ...mutationOptions } = params ?? {};`);
    lines.push(`  void _selection;`);
    lines.push(`  return useMutation({`);

    if (useCentralizedKeys) {
      lines.push(`    mutationKey: customMutationKeys.${operation.name}(),`);
    }

    if (hasArgs) {
      lines.push(`    mutationFn: (variables: ${varTypeName}) => getClient().mutation.${operation.name}(variables, { select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
    } else {
      lines.push(`    mutationFn: () => getClient().mutation.${operation.name}({ select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);
    }

    lines.push(`    ...mutationOptions,`);
    lines.push(`  });`);
    lines.push(`}`);
  } else {
    // Without select: simple hook (scalar return type)
    const resultTypeStr = `{ ${operation.name}: ${resultType} }`;
    const mutationVarType = hasArgs ? varTypeName : 'void';

    const optionsType = `Omit<UseMutationOptions<${resultTypeStr}, Error, ${mutationVarType}>, 'mutationFn'>`;

    if (hasArgs) {
      lines.push(`export function ${hookName}(`);
      lines.push(`  params?: ${optionsType}`);
    } else {
      lines.push(`export function ${hookName}(`);
      lines.push(`  params?: ${optionsType}`);
    }
    lines.push(`) {`);
    lines.push(`  const mutationOptions = params ?? {};`);
    lines.push(`  return useMutation({`);

    if (useCentralizedKeys) {
      lines.push(`    mutationKey: customMutationKeys.${operation.name}(),`);
    }

    if (hasArgs) {
      lines.push(`    mutationFn: (variables: ${varTypeName}) => getClient().mutation.${operation.name}(variables).unwrap(),`);
    } else {
      lines.push(`    mutationFn: () => getClient().mutation.${operation.name}().unwrap(),`);
    }

    lines.push(`    ...mutationOptions,`);
    lines.push(`  });`);
    lines.push(`}`);
  }

  const content = getGeneratedFileHeader(`Custom mutation hook for ${operation.name}`) + '\n\n' + lines.join('\n') + '\n';

  return {
    fileName,
    content,
    operationName: operation.name
  };
}

export interface GenerateAllCustomMutationHooksOptions {
  operations: CleanOperation[];
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateAllCustomMutationHooks(
  options: GenerateAllCustomMutationHooksOptions
): GeneratedCustomMutationFile[] {
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
    .filter((op) => op.kind === 'mutation')
    .map((operation) =>
      generateCustomMutationHook({
        operation,
        typeRegistry,
        maxDepth,
        skipQueryField,
        reactQueryEnabled,
        tableTypeNames,
        useCentralizedKeys
      })
    )
    .filter((result): result is GeneratedCustomMutationFile => result !== null);
}
