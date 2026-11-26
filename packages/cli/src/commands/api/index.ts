import type { CommandDefinition } from '@agentic-kit/command';

import { operationCommands } from './operation';
import { schemaCommands } from './schema';

export const apiCommands: CommandDefinition[] = [...operationCommands, ...schemaCommands];
