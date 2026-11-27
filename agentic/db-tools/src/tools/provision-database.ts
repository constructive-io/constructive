import { type HarnessTool, type HarnessToolResult, strictObject } from '@agentic-kit/harness';
import { z } from 'zod';

import { run, type RunCommand } from '../app-workspace';
import { DATABASE_NAME_PATTERN } from '../provision-database/env-file';
import {
  boundDatabaseId,
  type ProvisionDatabaseDetails,
  provisionFromTool,
} from '../provision-database/provision';

export type { ProvisionDatabaseDetails };

const ProvisionDatabaseZod = strictObject('the input', {
  database_name: z
    .string()
    .min(3)
    .max(63)
    .regex(DATABASE_NAME_PATTERN, { message: 'must start with a letter and hold only letters, digits, _ and -' })
    .describe(
      '3 to 63 characters: a letter, then letters, digits, _ or -. It becomes the subdomain (api-<name>.<domain>), so keep it short and lowercase.',
    ),
});

type Params = z.infer<typeof ProvisionDatabaseZod>;

type ToolResult = HarnessToolResult<ProvisionDatabaseDetails>;

// `exec` runs the prewarm's child processes (clone, install); tests inject it.
export function createProvisionDatabaseTool(
  exec: RunCommand = run,
): HarnessTool<typeof ProvisionDatabaseZod, ProvisionDatabaseDetails> {
  return {
    name: 'provision_database',
    label: 'Provision database',
    description:
      'Bootstrap a new Constructive database for the project under your account: provision the standard module set and write the database binding (DATABASE_ID, DATABASE_NAME, etc.) to the project .env. Run this ONCE before the schema and record tools. If the project is already bound to a live database under the signed-in account it skips. If a call returns while the database is still provisioning, call it again with the same name to keep waiting; a different name starts a second database.',
    promptSnippet:
      'provision_database: one-time bootstrap of the project database (owner + modules + .env), before any schema change. Skips when the existing binding is live under the signed-in account. Gated.',
    parameters: ProvisionDatabaseZod,
    effect: 'write',
    async execute(params: Params, ctx): Promise<ToolResult> {
      const { details, failure } = await provisionFromTool({ databaseName: params.database_name, mode: 'ensure' }, ctx, exec);
      return { content: [{ type: 'text', text: details.message }], details, ...(failure ? { failure } : {}) };
    },
  };
}

// `exec` runs the prewarm's child processes (clone, install); tests inject it.
export function createReplaceDatabaseTool(
  exec: RunCommand = run,
): HarnessTool<typeof ProvisionDatabaseZod, ProvisionDatabaseDetails> {
  return {
    name: 'replace_database',
    label: 'Replace database',
    description:
      'Bind the project to a new, empty database in place of the one it is bound to: for a bound database that no longer exists on this backend, one that belongs to another account, or a clean rebuild the user asks for. The old .env keys are archived as comments and the old database is kept on the backend; the schema must be built again in the new one, and records do not carry over. Destructive.',
    promptSnippet:
      'replace_database: bind the project to a new, empty database in place of a dead, foreign-account or unwanted one (old keys archived, old database kept). Destructive — gated.',
    parameters: ProvisionDatabaseZod,
    effect: 'destructive',
    async execute(params: Params, ctx): Promise<ToolResult> {
      // A replace swaps the binding the project has right now; one that changes while this call waits for the project
      // lock is not replaced.
      const replaces = (await boundDatabaseId(ctx.cwd)) ?? null;
      const { details, failure } = await provisionFromTool({ databaseName: params.database_name, mode: 'replace', replaces }, ctx, exec);
      return { content: [{ type: 'text', text: details.message }], details, ...(failure ? { failure } : {}) };
    },
  };
}

export const provisionDatabaseTool = createProvisionDatabaseTool();
export const replaceDatabaseTool = createReplaceDatabaseTool();
