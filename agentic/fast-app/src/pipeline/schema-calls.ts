// The schema step's calls: each call the delta and the card chose, run
// through the db-tools tool of its name, in order. A secure_table_provision
// has no tool; it is the modules API call the tools would make.

import { resolveSchema, resolveTable } from '@agentic-kit/db-tools/schema-resolve';
import {
  createFieldTool,
  deleteFieldTool,
  deleteTableTool,
  updateFieldTool,
} from '@agentic-kit/db-tools/tools/mutations';
import { provisionBlueprintTool } from '@agentic-kit/db-tools/tools/provision-blueprint';

import type { DeltaCall } from '../app-spec';
import { recordActivity } from './activity';
import { getFastAppHost } from './host';
import { errorMessage, PhaseError } from './progress';
import { requireProjectContext } from './project-env';
import { fixFor } from './schema-fix';
import { deltaCallActivity } from './step-facts';
import { blueprintCallError, isNotReady, retryTransientOnce } from './transient';

type CallContext = { cwd: string; signal?: AbortSignal };

// The backend builds one blueprint at a time, so a build can wait behind
// another; past the first tick the note says how long it has been.
const BUILD_TICK_MS = 15_000;

type MutationTool<P> = {
  parameters: { parse(value: unknown): P };
  execute(params: P, ctx: CallContext): Promise<{ details: { success: boolean; message: string } }>;
};

async function mutate<P>(tool: MutationTool<P>, params: unknown, ctx: CallContext): Promise<void> {
  const result = await tool.execute(tool.parameters.parse(params), ctx);
  if (!result.details.success) throw new Error(result.details.message);
}

export async function runDeltaCall(call: DeltaCall, ctx: CallContext): Promise<void> {
  switch (call.tool) {
  case 'provision_blueprint': {
    const params = provisionBlueprintTool.parameters.parse(call.params);
    const result = await provisionBlueprintTool.execute(params, ctx);
    if (result.details.error) {
      throw blueprintCallError(result.details.error, result.details.constructionId);
    }
    // A call may carry only relations (a follow-up's new keys); one with
    // tables that created none failed without an error (no database binding).
    if (call.params.definition.tables.length && result.details.created === 0) {
      throw new Error(result.content.map((c) => ('text' in c ? c.text : '')).join(' '));
    }
    return;
  }
  case 'create_field':
    return mutate(createFieldTool, call.params, ctx);
  case 'update_field':
    return mutate(updateFieldTool, call.params, ctx);
  case 'delete_field':
    return mutate(deleteFieldTool, call.params, ctx);
  case 'delete_table':
    return mutate(deleteTableTool, call.params, ctx);
  case 'secure_table_provision': {
    const context = await requireProjectContext(
      ctx.cwd,
      'The project has no database binding in .env.',
    );
    const table = resolveTable(await resolveSchema(context), call.params.table_name);
    const { nodes, owns, policies } = call.params;
    const result = await context.modules.secureTableProvision
      .create({
        data: {
          databaseId: context.databaseId,
          schemaId: context.schemaId,
          tableId: table.id,
          ...(nodes ? { nodes } : {}),
          ...(owns ? { owns } : {}),
          ...(policies ? { policies } : {}),
        } as never,
        select: { id: true },
      })
      .execute();
    if (!result.ok) throw new Error(result.errors.map((e) => e.message).join('; '));
    return;
  }
  }
}

function describeCall(call: DeltaCall): string {
  const params = call.params as { table_name?: string; field_name?: string };
  if (call.tool === 'provision_blueprint') return 'new tables and keys';
  const where = [params.table_name, params.field_name].filter(Boolean).join('.');
  return `${call.tool.replace(/_/g, ' ')} ${where}`.trim();
}

const AGAIN_FIX =
  'Call plan_app again with the same spec: it reads the database first and applies only what is still missing.';

/** Runs the calls in order; the first that fails stops the step with `fix`. */
export async function runSchemaCalls(
  calls: readonly DeltaCall[],
  ctx: CallContext,
  note: (text: string) => void,
  fix = AGAIN_FIX,
): Promise<void> {
  for (const [index, call] of calls.entries()) {
    const label = `${describeCall(call)} (${index + 1} of ${calls.length})`;
    note(label);
    const started = Date.now();
    const ticker =
      call.tool === 'provision_blueprint'
        ? setInterval(() => {
          const seconds = Math.round((Date.now() - started) / 1000);
          note(
            `${label}: still building (${seconds} s; the backend builds one blueprint at a time)`,
          );
        }, BUILD_TICK_MS)
        : undefined;
    try {
      await recordActivity(deltaCallActivity(call), () =>
        retryTransientOnce(() => runDeltaCall(call, ctx), { note, signal: ctx.signal }),
      );
    } catch (err) {
      const cause = `${describeCall(call)} failed: ${errorMessage(err)}`;
      // A backend that still isn't ready gets the phase's wait, not the spec's fix.
      if (isNotReady(cause)) throw new Error(cause);
      throw new PhaseError('schema', cause, fixFor(cause, fix));
    } finally {
      clearInterval(ticker);
    }
  }
  if (calls.length) getFastAppHost().events?.dbChanged({ kind: 'schema', cwd: ctx.cwd });
}
