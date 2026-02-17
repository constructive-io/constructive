import type { GraphQLSDKConfigTarget } from '../../../types/config';
import type { CleanOperation, CleanTable } from '../../../types/schema';
import { generateCommandMap } from './command-map-generator';
import { generateCustomCommand } from './custom-command-generator';
import { generateExecutorFile } from './executor-generator';
import type { GeneratedFile } from './executor-generator';
import { generateAuthCommand, generateContextCommand } from './infra-generator';
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

export { generateExecutorFile } from './executor-generator';
export { generateTableCommand } from './table-command-generator';
export { generateCustomCommand } from './custom-command-generator';
export { generateCommandMap } from './command-map-generator';
export {
  generateContextCommand,
  generateAuthCommand,
} from './infra-generator';
export type { GeneratedFile } from './executor-generator';
