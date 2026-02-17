import type { GraphQLSDKConfigTarget, InfraNames } from '../../../types/config';
import type { CleanOperation, CleanTable } from '../../../types/schema';
import { generateCommandMap, generateMultiTargetCommandMap } from './command-map-generator';
import { generateCustomCommand } from './custom-command-generator';
import { generateExecutorFile, generateMultiTargetExecutorFile } from './executor-generator';
import type { GeneratedFile, MultiTargetExecutorInput } from './executor-generator';
import {
  generateAuthCommand,
  generateAuthCommandWithName,
  generateContextCommand,
  generateMultiTargetContextCommand,
} from './infra-generator';
import { generateTableCommand } from './table-command-generator';

export interface GenerateCliOptions {
  tables: CleanTable[];
  customOperations?: {
    queries: CleanOperation[];
    mutations: CleanOperation[];
  };
  config: GraphQLSDKConfigTarget;
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

  const executorFile = generateExecutorFile(toolName);
  files.push(executorFile);

  const contextFile = generateContextCommand(toolName);
  files.push(contextFile);

  const authFile = generateAuthCommand(toolName);
  files.push(authFile);

  for (const table of tables) {
    const tableFile = generateTableCommand(table);
    files.push(tableFile);
  }

  const allCustomOps: CleanOperation[] = [
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

  return {
    files,
    stats: {
      tables: tables.length,
      customQueries: customOperations?.queries.length ?? 0,
      customMutations: customOperations?.mutations.length ?? 0,
      infraFiles: 3,
      totalFiles: files.length,
    },
  };
}

export interface MultiTargetCliTarget {
  name: string;
  endpoint: string;
  ormImportPath: string;
  tables: CleanTable[];
  customOperations: {
    queries: CleanOperation[];
    mutations: CleanOperation[];
  };
  isAuthTarget?: boolean;
}

export interface GenerateMultiTargetCliOptions {
  toolName: string;
  infraNames?: InfraNames;
  targets: MultiTargetCliTarget[];
}

export function resolveInfraNames(
  targetNames: string[],
  userOverrides?: InfraNames,
): { auth: string; context: string } {
  let authName = userOverrides?.auth ?? 'auth';
  let contextName = userOverrides?.context ?? 'context';

  if (targetNames.includes(authName) && !userOverrides?.auth) {
    authName = 'credentials';
  }
  if (targetNames.includes(contextName) && !userOverrides?.context) {
    contextName = 'env';
  }

  return { auth: authName, context: contextName };
}

export function generateMultiTargetCli(
  options: GenerateMultiTargetCliOptions,
): GenerateCliResult {
  const { toolName, targets } = options;
  const files: GeneratedFile[] = [];

  const targetNames = targets.map((t) => t.name);
  const infraNames = resolveInfraNames(targetNames, options.infraNames);

  const executorInputs: MultiTargetExecutorInput[] = targets.map((t) => ({
    name: t.name,
    endpoint: t.endpoint,
    ormImportPath: t.ormImportPath,
  }));
  const executorFile = generateMultiTargetExecutorFile(toolName, executorInputs);
  files.push(executorFile);

  const contextFile = generateMultiTargetContextCommand(
    toolName,
    infraNames.context,
    targets.map((t) => ({ name: t.name, endpoint: t.endpoint })),
  );
  files.push(contextFile);

  const authFile = generateAuthCommandWithName(toolName, infraNames.auth);
  files.push(authFile);

  let totalTables = 0;
  let totalQueries = 0;
  let totalMutations = 0;

  const commandMapTargets: Array<{
    name: string;
    tables: CleanTable[];
    customOperations: CleanOperation[];
  }> = [];

  for (const target of targets) {
    const allOps: CleanOperation[] = [
      ...(target.customOperations?.queries ?? []),
      ...(target.customOperations?.mutations ?? []),
    ];

    for (const table of target.tables) {
      const tableFile = generateTableCommand(table, {
        targetName: target.name,
        executorImportPath: '../../executor',
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
    infraNames,
    targets: commandMapTargets,
  });
  files.push(commandMapFile);

  return {
    files,
    stats: {
      tables: totalTables,
      customQueries: totalQueries,
      customMutations: totalMutations,
      infraFiles: 3,
      totalFiles: files.length,
    },
  };
}

export { generateExecutorFile, generateMultiTargetExecutorFile } from './executor-generator';
export { generateTableCommand } from './table-command-generator';
export { generateCustomCommand } from './custom-command-generator';
export { generateCommandMap, generateMultiTargetCommandMap } from './command-map-generator';
export {
  generateContextCommand,
  generateAuthCommand,
  generateMultiTargetContextCommand,
  generateAuthCommandWithName,
} from './infra-generator';
export {
  generateReadme,
  generateAgentsDocs,
  getCliMcpTools,
  generateSkills,
} from './docs-generator';
export { resolveDocsConfig } from '../docs-utils';
export type { GeneratedDocFile, McpTool } from '../docs-utils';
export type { GeneratedFile, MultiTargetExecutorInput } from './executor-generator';
