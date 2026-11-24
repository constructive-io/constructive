import { constructiveDbTools, toPiTools } from '@agentic-kit/pi';
import type { ExtensionFactory, ToolDefinition } from '@earendil-works/pi-coding-agent';
import type { TSchema } from 'typebox';

import { withOwnerKeys } from './add-records-owner';
import { describeLiveSchemaTool } from './describe-live-schema';
import { executeWithLimits, timeoutFor } from './tool-limits';

type ProvisionResult = {
  details?: { success?: boolean; message?: string };
};

export async function executeProvision<T extends ProvisionResult>(
  execute: () => Promise<T>,
): Promise<T> {
  const result = await execute();
  if (result.details?.success === false) {
    throw new Error(result.details.message ?? 'Database provisioning failed.');
  }
  return result;
}

export const DATABASE_NAME_PATTERN = '^[a-z][a-z0-9]*(-[a-z0-9]+)*$';

const DATABASE_NAME_SCHEMA = {
  type: 'string',
  pattern: DATABASE_NAME_PATTERN,
  maxLength: 50,
  description:
    'Name for the app database: lowercase letters, digits, and hyphens, starting with a letter (for example "notes-app"). No underscores. It doubles as the per-database hostname (api-<name>, auth-<name>, admin-<name>), and a hostname cannot contain an underscore.',
};

type ToolParameters = { properties?: Record<string, unknown> };

export function withHostnameSafeName<T extends ToolParameters>(parameters: T): T {
  return {
    ...parameters,
    properties: { ...parameters.properties, database_name: DATABASE_NAME_SCHEMA },
  };
}

type DbTool = ToolDefinition<TSchema, unknown>;

export function withLimits(tool: DbTool, timeoutMs = timeoutFor(tool.name)): DbTool {
  const limited: DbTool = {
    ...tool,
    execute: (toolCallId, params, signal, onUpdate, ctx) =>
      executeWithLimits(() => tool.execute(toolCallId, params, signal, onUpdate, ctx), {
        timeoutMs,
        signal,
      }),
  };
  if (tool.name !== 'provision_database') return limited;
  return {
    ...limited,
    parameters: withHostnameSafeName(tool.parameters),
    execute: (...args) => executeProvision(() => limited.execute(...args)),
  };
}

export const dbToolsWithLimits: ExtensionFactory = (pi) => {
  for (const tool of toPiTools(constructiveDbTools))
    pi.registerTool(withLimits(withOwnerKeys(tool)));
  // Its parameters are narrower than DbTool's, which strict function types
  // refuse for its render callbacks; it takes the same limits.
  pi.registerTool(withLimits(describeLiveSchemaTool as DbTool));
};
