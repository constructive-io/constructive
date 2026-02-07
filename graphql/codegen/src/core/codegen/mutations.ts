/**
 * Mutation hook generators - delegates to ORM model methods
 *
 * Output structure:
 * mutations/
 *   useCreateCarMutation.ts  -> ORM create
 *   useUpdateCarMutation.ts  -> ORM update
 *   useDeleteCarMutation.ts  -> ORM delete
 */
import type { CleanTable } from '../../types/schema';
import {
  getCreateMutationFileName,
  getCreateMutationHookName,
  getCreateMutationName,
  getDefaultSelectFieldName,
  getDeleteMutationFileName,
  getDeleteMutationHookName,
  getDeleteMutationName,
  getGeneratedFileHeader,
  getPrimaryKeyInfo,
  getTableNames,
  getUpdateMutationFileName,
  getUpdateMutationHookName,
  getUpdateMutationName,
  hasValidPrimaryKey,
  lcFirst
} from './utils';

export interface GeneratedMutationFile {
  fileName: string;
  content: string;
}

export interface MutationGeneratorOptions {
  reactQueryEnabled?: boolean;
  useCentralizedKeys?: boolean;
}

export function generateCreateMutationHook(
  table: CleanTable,
  options: MutationGeneratorOptions = {}
): GeneratedMutationFile | null {
  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true
  } = options;

  if (!reactQueryEnabled) {
    return null;
  }

  const { typeName, singularName } = getTableNames(table);
  const hookName = getCreateMutationHookName(table);
  const mutationName = getCreateMutationName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const mutationKeysName = `${lcFirst(typeName)}MutationKeys`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const createInputTypeName = `Create${typeName}Input`;

  const defaultFieldName = getDefaultSelectFieldName(table);

  const lines: string[] = [];

  // Imports
  lines.push(`import { useMutation, useQueryClient } from '@tanstack/react-query';`);
  lines.push(`import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';`);
  lines.push(`import { getClient } from '../client';`);
  lines.push(`import { buildSelectionArgs } from '../selection';`);
  lines.push(`import type { SelectionConfig } from '../selection';`);

  if (useCentralizedKeys) {
    lines.push(`import { ${keysName} } from '../query-keys';`);
    lines.push(`import { ${mutationKeysName} } from '../mutation-keys';`);
  }

  lines.push(`import type {`);
  lines.push(`  ${selectTypeName},`);
  lines.push(`  ${relationTypeName},`);
  lines.push(`  ${createInputTypeName},`);
  lines.push(`} from '../../orm/input-types';`);
  lines.push(`import type { InferSelectResult, StrictSelect } from '../../orm/select-types';`);
  lines.push('');

  // Re-export types
  lines.push(`export type { ${selectTypeName}, ${relationTypeName}, ${createInputTypeName} } from '../../orm/input-types';`);
  lines.push('');

  lines.push(`const defaultSelect = { ${defaultFieldName}: true } as const;`);
  lines.push('');

  // Hook
  lines.push(`/**`);
  lines.push(` * Mutation hook for creating a ${typeName}`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`tsx`);
  lines.push(` * const { mutate, isPending } = ${hookName}({`);
  lines.push(` *   selection: { fields: { id: true, name: true } },`);
  lines.push(` * });`);
  lines.push(` *`);
  lines.push(` * mutate({ name: 'New item' });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  const createResultType = (s: string) => `{ ${mutationName}: { ${singularName}: InferSelectResult<${relationTypeName}, ${s}> } }`;
  const createVarType = `${createInputTypeName}['${singularName}']`;
  const createOptionsType = (s: string) => `Omit<UseMutationOptions<${createResultType(s)}, Error, ${createVarType}>, 'mutationFn'>`;
  const selectionWithFieldsType = (s: string) =>
    `({ fields: ${s} } & StrictSelect<${s}, ${selectTypeName}>)`;
  const selectionWithoutFieldsType = () => `({ fields?: undefined })`;
  lines.push(`export function ${hookName}<S extends ${selectTypeName}>(`);
  lines.push(`  params: { selection: ${selectionWithFieldsType('S')} } & ${createOptionsType('S')}`);
  lines.push(`): UseMutationResult<${createResultType('S')}, Error, ${createVarType}>;`);
  lines.push(`export function ${hookName}(`);
  lines.push(`  params?: { selection?: ${selectionWithoutFieldsType()} } & ${createOptionsType('typeof defaultSelect')}`);
  lines.push(`): UseMutationResult<${createResultType('typeof defaultSelect')}, Error, ${createVarType}>;`);
  lines.push(`export function ${hookName}(`);
  lines.push(`  params?: { selection?: SelectionConfig<${selectTypeName}> } & Omit<UseMutationOptions<any, Error, ${createVarType}>, 'mutationFn'>`);
  lines.push(`) {`);
  lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
  lines.push(`  const { selection: _selection, ...mutationOptions } = params ?? {};`);
  lines.push(`  void _selection;`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);

  if (useCentralizedKeys) {
    lines.push(`    mutationKey: ${mutationKeysName}.create(),`);
  }

  lines.push(`    mutationFn: (data: ${createInputTypeName}['${singularName}']) => getClient().${singularName}.create({ data, select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);

  const listKey = useCentralizedKeys
    ? `${keysName}.lists()`
    : `['${typeName.toLowerCase()}', 'list']`;
  lines.push(`    onSuccess: () => {`);
  lines.push(`      queryClient.invalidateQueries({ queryKey: ${listKey} });`);
  lines.push(`    },`);
  lines.push(`    ...mutationOptions,`);
  lines.push(`  });`);
  lines.push(`}`);

  const content = getGeneratedFileHeader(`Create mutation hook for ${typeName}`) + '\n\n' + lines.join('\n') + '\n';

  return {
    fileName: getCreateMutationFileName(table),
    content
  };
}

export function generateUpdateMutationHook(
  table: CleanTable,
  options: MutationGeneratorOptions = {}
): GeneratedMutationFile | null {
  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true
  } = options;

  if (!reactQueryEnabled) {
    return null;
  }

  if (table.query?.update === null) {
    return null;
  }

  if (!hasValidPrimaryKey(table)) {
    return null;
  }

  const { typeName, singularName } = getTableNames(table);
  const hookName = getUpdateMutationHookName(table);
  const mutationName = getUpdateMutationName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const mutationKeysName = `${lcFirst(typeName)}MutationKeys`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const patchTypeName = `${typeName}Patch`;

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];

  const lines: string[] = [];

  // Imports
  lines.push(`import { useMutation, useQueryClient } from '@tanstack/react-query';`);
  lines.push(`import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';`);
  lines.push(`import { getClient } from '../client';`);
  lines.push(`import { buildSelectionArgs } from '../selection';`);
  lines.push(`import type { SelectionConfig } from '../selection';`);

  if (useCentralizedKeys) {
    lines.push(`import { ${keysName} } from '../query-keys';`);
    lines.push(`import { ${mutationKeysName} } from '../mutation-keys';`);
  }

  lines.push(`import type {`);
  lines.push(`  ${selectTypeName},`);
  lines.push(`  ${relationTypeName},`);
  lines.push(`  ${patchTypeName},`);
  lines.push(`} from '../../orm/input-types';`);
  lines.push(`import type { InferSelectResult, StrictSelect } from '../../orm/select-types';`);
  lines.push('');

  // Re-export types
  lines.push(`export type { ${selectTypeName}, ${relationTypeName}, ${patchTypeName} } from '../../orm/input-types';`);
  lines.push('');

  lines.push(`const defaultSelect = { ${pkField.name}: true } as const;`);
  lines.push('');

  // Hook
  lines.push(`/**`);
  lines.push(` * Mutation hook for updating a ${typeName}`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`tsx`);
  lines.push(` * const { mutate, isPending } = ${hookName}({`);
  lines.push(` *   selection: { fields: { id: true, name: true } },`);
  lines.push(` * });`);
  lines.push(` *`);
  lines.push(` * mutate({ ${pkField.name}: 'value-here', patch: { name: 'Updated' } });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  const updateResultType = (s: string) => `{ ${mutationName}: { ${singularName}: InferSelectResult<${relationTypeName}, ${s}> } }`;
  const updateVarType = `{ ${pkField.name}: ${pkField.tsType}; patch: ${patchTypeName} }`;
  const updateOptionsType = (s: string) => `Omit<UseMutationOptions<${updateResultType(s)}, Error, ${updateVarType}>, 'mutationFn'>`;
  const selectionWithFieldsType = (s: string) =>
    `({ fields: ${s} } & StrictSelect<${s}, ${selectTypeName}>)`;
  const selectionWithoutFieldsType = () => `({ fields?: undefined })`;
  lines.push(`export function ${hookName}<S extends ${selectTypeName}>(`);
  lines.push(`  params: { selection: ${selectionWithFieldsType('S')} } & ${updateOptionsType('S')}`);
  lines.push(`): UseMutationResult<${updateResultType('S')}, Error, ${updateVarType}>;`);
  lines.push(`export function ${hookName}(`);
  lines.push(`  params?: { selection?: ${selectionWithoutFieldsType()} } & ${updateOptionsType('typeof defaultSelect')}`);
  lines.push(`): UseMutationResult<${updateResultType('typeof defaultSelect')}, Error, ${updateVarType}>;`);
  lines.push(`export function ${hookName}(`);
  lines.push(`  params?: { selection?: SelectionConfig<${selectTypeName}> } & Omit<UseMutationOptions<any, Error, ${updateVarType}>, 'mutationFn'>`);
  lines.push(`) {`);
  lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
  lines.push(`  const { selection: _selection, ...mutationOptions } = params ?? {};`);
  lines.push(`  void _selection;`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);

  if (useCentralizedKeys) {
    lines.push(`    mutationKey: ${mutationKeysName}.all,`);
  }

  lines.push(`    mutationFn: ({ ${pkField.name}, patch }: { ${pkField.name}: ${pkField.tsType}; patch: ${patchTypeName} }) => getClient().${singularName}.update({ where: { ${pkField.name} }, data: patch, select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);

  const detailKey = useCentralizedKeys
    ? `${keysName}.detail(variables.${pkField.name})`
    : `['${typeName.toLowerCase()}', 'detail', variables.${pkField.name}]`;
  const listKey = useCentralizedKeys
    ? `${keysName}.lists()`
    : `['${typeName.toLowerCase()}', 'list']`;

  lines.push(`    onSuccess: (_, variables) => {`);
  lines.push(`      queryClient.invalidateQueries({ queryKey: ${detailKey} });`);
  lines.push(`      queryClient.invalidateQueries({ queryKey: ${listKey} });`);
  lines.push(`    },`);
  lines.push(`    ...mutationOptions,`);
  lines.push(`  });`);
  lines.push(`}`);

  const content = getGeneratedFileHeader(`Update mutation hook for ${typeName}`) + '\n\n' + lines.join('\n') + '\n';

  return {
    fileName: getUpdateMutationFileName(table),
    content
  };
}

export function generateDeleteMutationHook(
  table: CleanTable,
  options: MutationGeneratorOptions = {}
): GeneratedMutationFile | null {
  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true
  } = options;

  if (!reactQueryEnabled) {
    return null;
  }

  if (table.query?.delete === null) {
    return null;
  }

  if (!hasValidPrimaryKey(table)) {
    return null;
  }

  const { typeName, singularName } = getTableNames(table);
  const hookName = getDeleteMutationHookName(table);
  const mutationName = getDeleteMutationName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const mutationKeysName = `${lcFirst(typeName)}MutationKeys`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];

  const lines: string[] = [];

  // Imports
  lines.push(`import { useMutation, useQueryClient } from '@tanstack/react-query';`);
  lines.push(`import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';`);
  lines.push(`import { getClient } from '../client';`);
  lines.push(`import { buildSelectionArgs } from '../selection';`);
  lines.push(`import type { SelectionConfig } from '../selection';`);

  if (useCentralizedKeys) {
    lines.push(`import { ${keysName} } from '../query-keys';`);
    lines.push(`import { ${mutationKeysName} } from '../mutation-keys';`);
  }

  lines.push(`import type {`);
  lines.push(`  ${selectTypeName},`);
  lines.push(`  ${relationTypeName},`);
  lines.push(`} from '../../orm/input-types';`);
  lines.push(`import type { InferSelectResult, StrictSelect } from '../../orm/select-types';`);
  lines.push('');

  // Re-export types
  lines.push(`export type { ${selectTypeName}, ${relationTypeName} } from '../../orm/input-types';`);
  lines.push('');

  lines.push(`const defaultSelect = { ${pkField.name}: true } as const;`);
  lines.push('');

  // Hook
  lines.push(`/**`);
  lines.push(` * Mutation hook for deleting a ${typeName}`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`tsx`);
  lines.push(` * const { mutate, isPending } = ${hookName}({`);
  lines.push(` *   selection: { fields: { id: true } },`);
  lines.push(` * });`);
  lines.push(` *`);
  lines.push(` * mutate({ ${pkField.name}: ${pkField.tsType === 'string' ? "'value-to-delete'" : '123'} });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  const deleteResultType = (s: string) => `{ ${mutationName}: { ${singularName}: InferSelectResult<${relationTypeName}, ${s}> } }`;
  const deleteVarType = `{ ${pkField.name}: ${pkField.tsType} }`;
  const deleteOptionsType = (s: string) => `Omit<UseMutationOptions<${deleteResultType(s)}, Error, ${deleteVarType}>, 'mutationFn'>`;
  const selectionWithFieldsType = (s: string) =>
    `({ fields: ${s} } & StrictSelect<${s}, ${selectTypeName}>)`;
  const selectionWithoutFieldsType = () => `({ fields?: undefined })`;
  lines.push(`export function ${hookName}<S extends ${selectTypeName}>(`);
  lines.push(`  params: { selection: ${selectionWithFieldsType('S')} } & ${deleteOptionsType('S')}`);
  lines.push(`): UseMutationResult<${deleteResultType('S')}, Error, ${deleteVarType}>;`);
  lines.push(`export function ${hookName}(`);
  lines.push(`  params?: { selection?: ${selectionWithoutFieldsType()} } & ${deleteOptionsType('typeof defaultSelect')}`);
  lines.push(`): UseMutationResult<${deleteResultType('typeof defaultSelect')}, Error, ${deleteVarType}>;`);
  lines.push(`export function ${hookName}(`);
  lines.push(`  params?: { selection?: SelectionConfig<${selectTypeName}> } & Omit<UseMutationOptions<any, Error, ${deleteVarType}>, 'mutationFn'>`);
  lines.push(`) {`);
  lines.push(`  const args = buildSelectionArgs<${selectTypeName}>(params?.selection);`);
  lines.push(`  const { selection: _selection, ...mutationOptions } = params ?? {};`);
  lines.push(`  void _selection;`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);

  if (useCentralizedKeys) {
    lines.push(`    mutationKey: ${mutationKeysName}.all,`);
  }

  lines.push(`    mutationFn: ({ ${pkField.name} }: { ${pkField.name}: ${pkField.tsType} }) => getClient().${singularName}.delete({ where: { ${pkField.name} }, select: (args?.select ?? defaultSelect) as ${selectTypeName} }).unwrap(),`);

  const detailKey = useCentralizedKeys
    ? `${keysName}.detail(variables.${pkField.name})`
    : `['${typeName.toLowerCase()}', 'detail', variables.${pkField.name}]`;
  const listKey = useCentralizedKeys
    ? `${keysName}.lists()`
    : `['${typeName.toLowerCase()}', 'list']`;

  lines.push(`    onSuccess: (_, variables) => {`);
  lines.push(`      queryClient.removeQueries({ queryKey: ${detailKey} });`);
  lines.push(`      queryClient.invalidateQueries({ queryKey: ${listKey} });`);
  lines.push(`    },`);
  lines.push(`    ...mutationOptions,`);
  lines.push(`  });`);
  lines.push(`}`);

  const content = getGeneratedFileHeader(`Delete mutation hook for ${typeName}`) + '\n\n' + lines.join('\n') + '\n';

  return {
    fileName: getDeleteMutationFileName(table),
    content
  };
}

export function generateAllMutationHooks(
  tables: CleanTable[],
  options: MutationGeneratorOptions = {}
): GeneratedMutationFile[] {
  const files: GeneratedMutationFile[] = [];

  for (const table of tables) {
    const createHook = generateCreateMutationHook(table, options);
    if (createHook) {
      files.push(createHook);
    }

    const updateHook = generateUpdateMutationHook(table, options);
    if (updateHook) {
      files.push(updateHook);
    }

    const deleteHook = generateDeleteMutationHook(table, options);
    if (deleteHook) {
      files.push(deleteHook);
    }
  }

  return files;
}
