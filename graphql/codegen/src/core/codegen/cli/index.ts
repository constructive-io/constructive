import type { BuiltinNames, GraphQLSDKConfigTarget } from '../../../types/config';
import type { Operation, Table, TypeRegistry } from '../../../types/schema';
import { generateCommandMap, generateMultiTargetCommandMap } from './command-map-generator';
import { generateConfigCommand } from './config-command-generator';
import { generateCustomCommand } from './custom-command-generator';
import type { GeneratedFile, MultiTargetExecutorInput } from './executor-generator';
import { generateExecutorFile, generateMultiTargetExecutorFile } from './executor-generator';
import type { HelpersGeneratorInput } from './helpers-generator';
import { generateHelpersFile } from './helpers-generator';
import {
  generateAuthCommand,
  generateAuthCommandWithName,
  generateContextCommand,
  generateMultiTargetContextCommand,
} from './infra-generator';
import { generateTableCommand } from './table-command-generator';
import { generateEmbedderFile,generateEntryPointFile, generateUtilsFile } from './utils-generator';

export interface GenerateCliOptions {
  tables: Table[];
  customOperations?: {
    queries: Operation[];
    mutations: Operation[];
  };
  config: GraphQLSDKConfigTarget;
  /** TypeRegistry from introspection, used to check field defaults */
  typeRegistry?: TypeRegistry;
}

export interface GenerateCliResult {
  files: GeneratedFile[];
  stats: {
    tables: number;
    customQueries: number;
    customMutations: number;
    infraFiles: number;
    totalFiles: number;
  };
}

export function generateCli(options: GenerateCliOptions): GenerateCliResult {
  const { tables, customOperations, config } = options;
  const files: GeneratedFile[] = [];

  const cliConfig = config.cli;
  const toolName =
    typeof cliConfig === 'object' && cliConfig.toolName
      ? cliConfig.toolName
      : 'app';

  const stashName =
    typeof cliConfig === 'object' ? cliConfig.stashName : undefined;

  const executorFile = generateExecutorFile(toolName, stashName);
  files.push(executorFile);

  const utilsFile = generateUtilsFile();
  files.push(utilsFile);

  // Generate embedder module if any table has vector embedding fields
  const hasAnyEmbeddings = tables.some((t) =>
    t.fields.some((f) => f.type.gqlType === 'Vector' || f.type.gqlType === '[Float]'),
  );
  if (hasAnyEmbeddings) {
    files.push(generateEmbedderFile());
  }

  const contextFile = generateContextCommand(toolName);
  files.push(contextFile);

  const authFile = generateAuthCommand(toolName);
  files.push(authFile);

  for (const table of tables) {
    const tableFile = generateTableCommand(table, {
      typeRegistry: options.typeRegistry,
    });
    files.push(tableFile);
  }

  const allCustomOps: Operation[] = [
    ...(customOperations?.queries ?? []),
    ...(customOperations?.mutations ?? []),
  ];

  for (const op of allCustomOps) {
    const customFile = generateCustomCommand(op);
    files.push(customFile);
  }

  const commandMapFile = generateCommandMap(
    tables,
    allCustomOps,
    toolName,
  );
  files.push(commandMapFile);

  // Generate entry point if configured
  const generateEntryPoint =
    typeof cliConfig === 'object' && !!cliConfig.entryPoint;
  if (generateEntryPoint) {
    files.push(generateEntryPointFile());
  }

  return {
    files,
    stats: {
      tables: tables.length,
      customQueries: customOperations?.queries.length ?? 0,
      customMutations: customOperations?.mutations.length ?? 0,
      infraFiles: 4,
      totalFiles: files.length,
    },
  };
}

export interface MultiTargetCliTarget {
  name: string;
  endpoint: string;
  ormImportPath: string;
  tables: Table[];
  customOperations: {
    queries: Operation[];
    mutations: Operation[];
  };
  isAuthTarget?: boolean;
  /** TypeRegistry from introspection, used to check field defaults */
  typeRegistry?: TypeRegistry;
}

export interface GenerateMultiTargetCliOptions {
  toolName: string;
  /** Directory identity to share signed-in state with sibling tools. */
  stashName?: string;
  builtinNames?: BuiltinNames;
  targets: MultiTargetCliTarget[];
  /** Generate a runnable index.ts entry point */
  entryPoint?: boolean;
}

export function resolveBuiltinNames(
  targetNames: string[],
  userOverrides?: BuiltinNames,
): { auth: string; context: string; config: string } {
  let authName = userOverrides?.auth ?? 'auth';
  let contextName = userOverrides?.context ?? 'context';
  let configName = userOverrides?.config ?? 'config';

  if (targetNames.includes(authName) && !userOverrides?.auth) {
    authName = 'credentials';
  }
  if (targetNames.includes(contextName) && !userOverrides?.context) {
    contextName = 'env';
  }
  if (targetNames.includes(configName) && !userOverrides?.config) {
    configName = 'vars';
  }

  return { auth: authName, context: contextName, config: configName };
}

export function generateMultiTargetCli(
  options: GenerateMultiTargetCliOptions,
): GenerateCliResult {
  const { toolName, stashName, targets } = options;
  const files: GeneratedFile[] = [];

  const targetNames = targets.map((t) => t.name);
  const builtinNames = resolveBuiltinNames(targetNames, options.builtinNames);

  const executorInputs: MultiTargetExecutorInput[] = targets.map((t) => ({
    name: t.name,
    endpoint: t.endpoint,
    ormImportPath: t.ormImportPath,
  }));
  const executorFile = generateMultiTargetExecutorFile(toolName, executorInputs, stashName);
  files.push(executorFile);

  const utilsFile = generateUtilsFile();
  files.push(utilsFile);

  // Generate embedder module if any target has tables with vector embedding fields
  const hasAnyMtEmbeddings = targets.some((tgt) =>
    tgt.tables.some((t) =>
      t.fields.some((f) => f.type.gqlType === 'Vector' || f.type.gqlType === '[Float]'),
    ),
  );
  if (hasAnyMtEmbeddings) {
    files.push(generateEmbedderFile());
  }

  const contextFile = generateMultiTargetContextCommand(
    toolName,
    builtinNames.context,
    targets.map((t) => ({ name: t.name, endpoint: t.endpoint })),
  );
  files.push(contextFile);

  const authFile = generateAuthCommandWithName(toolName, builtinNames.auth);
  files.push(authFile);

  const configFile = generateConfigCommand(toolName, builtinNames.config);
  files.push(configFile);

  const helpersInputs: HelpersGeneratorInput[] = targets.map((t) => ({
    name: t.name,
    ormImportPath: t.ormImportPath,
  }));
  const helpersFile = generateHelpersFile(toolName, helpersInputs, stashName);
  files.push(helpersFile);

  let totalTables = 0;
  let totalQueries = 0;
  let totalMutations = 0;

  const commandMapTargets: Array<{
    name: string;
    tables: Table[];
    customOperations: Operation[];
  }> = [];

  for (const target of targets) {
    const allOps: Operation[] = [
      ...(target.customOperations?.queries ?? []),
      ...(target.customOperations?.mutations ?? []),
    ];

    for (const table of target.tables) {
      const tableFile = generateTableCommand(table, {
        targetName: target.name,
        executorImportPath: '../../executor',
        typeRegistry: target.typeRegistry,
      });
      files.push(tableFile);
    }

    for (const op of allOps) {
      const isSaveToken = !!target.isAuthTarget && op.kind === 'mutation';
      const customFile = generateCustomCommand(op, {
        targetName: target.name,
        executorImportPath: '../../executor',
        saveToken: isSaveToken,
      });
      files.push(customFile);
    }

    totalTables += target.tables.length;
    totalQueries += target.customOperations?.queries?.length ?? 0;
    totalMutations += target.customOperations?.mutations?.length ?? 0;

    commandMapTargets.push({
      name: target.name,
      tables: target.tables,
      customOperations: allOps,
    });
  }

  const commandMapFile = generateMultiTargetCommandMap({
    toolName,
    builtinNames,
    targets: commandMapTargets,
  });
  files.push(commandMapFile);

  // Generate entry point if configured
  if (options.entryPoint) {
    files.push(generateEntryPointFile());
  }

  return {
    files,
    stats: {
      tables: totalTables,
      customQueries: totalQueries,
      customMutations: totalMutations,
      infraFiles: 6,
      totalFiles: files.length,
    },
  };
}

export type { GeneratedDocFile } from '../docs-utils';
export { resolveDocsConfig } from '../docs-utils';
export { generateCommandMap, generateMultiTargetCommandMap } from './command-map-generator';
export { generateConfigCommand } from './config-command-generator';
export { generateCustomCommand } from './custom-command-generator';
export type { MultiTargetDocsInput } from './docs-generator';
export {
  generateAgentsDocs,
  generateMultiTargetAgentsDocs,
  generateMultiTargetReadme,
  generateMultiTargetSkills,
  generateReadme,
  generateSkills,
} from './docs-generator';
export type { GeneratedFile, MultiTargetExecutorInput } from './executor-generator';
export { generateExecutorFile, generateMultiTargetExecutorFile } from './executor-generator';
export type { HelpersGeneratorInput } from './helpers-generator';
export { generateHelpersFile } from './helpers-generator';
export {
  generateAuthCommand,
  generateAuthCommandWithName,
  generateContextCommand,
  generateMultiTargetContextCommand,
} from './infra-generator';
export { generateTableCommand } from './table-command-generator';
export { generateEmbedderFile,generateEntryPointFile, generateUtilsFile } from './utils-generator';
