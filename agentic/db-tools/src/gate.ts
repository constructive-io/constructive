import type { ConstructiveGateDeps, GateReadiness, ToolFailure } from '@agentic-kit/harness';
import type { z } from 'zod';

import { resolveProjectContext as defaultResolveProjectContext } from './context';
import { thrownText } from './graphql-http';
import { constructiveDbTools, toolPreconditions } from './tools';
import { createTemplatePreviewTables as defaultCreateTemplatePreviewTables } from './tools/templates';

/** What the deps are built from, so a test can substitute fakes. */
export type ConstructiveGateResolvers = {
  /** Default: the check the tool itself runs first (`toolPreconditions`). */
  precondition: ConstructiveGateDeps['precondition'];
  resolveProjectContext: typeof defaultResolveProjectContext;
  createTemplatePreviewTables: typeof defaultCreateTemplatePreviewTables;
};

const tools = new Map(constructiveDbTools.map((tool) => [tool.name, tool]));

function invalidInput(error: z.ZodError): ToolFailure {
  const issues = error.issues.map((issue) => `${issue.path.join('.') || 'the input'}: ${issue.message.replace(/\.$/, '')}`);
  return { code: 'invalid-input', message: `The input is not valid: ${issues.join('; ')}.` };
}

const blocked = (failure: ToolFailure): GateReadiness => ({ kind: 'blocked', failure });

/** The tool's own first check, on the params it would parse, and the target it resolved. */
async function toolPrecondition(
  toolName: string,
  input: Record<string, unknown> | undefined,
  cwd: string
): Promise<GateReadiness> {
  const tool = tools.get(toolName);
  const check = toolPreconditions.get(toolName);
  if (!tool || !check) {
    // Every db tool has a check (tool-contract.test.ts), so this is a tool of another set.
    return blocked({
      code: 'unsupported',
      message: `The Constructive gate does not know the tool "${toolName}", so it cannot say what the call acts on.`,
    });
  }
  const parsed = tool.parameters.safeParse(input);
  if (!parsed.success) return blocked(invalidInput(parsed.error));
  try {
    const ready = await check(parsed.data, cwd);
    return ready.kind === 'ok' ? { kind: 'ready', ...ready.value } : blocked(ready.failure);
  } catch (err) {
    // A check that cannot finish blocks the call rather than let it through.
    return blocked({
      code: 'failed',
      message: `Could not check whether the call can run: ${thrownText(err)}`,
    });
  }
}

/**
 * The Constructive gate's host capabilities, answered by this package's own
 * tools: their effects say what is gated, and their first checks say whether
 * a gated call can run at all.
 *
 * Every adapter gates the same tools against the same project state, so the
 * mapping lives here rather than once per harness — an adapter's job is only
 * to hand its harness's confirm surface to the gate.
 */
export function constructiveGateDeps(
  resolvers: Partial<ConstructiveGateResolvers> = {}
): ConstructiveGateDeps {
  const resolveProjectContext = resolvers.resolveProjectContext ?? defaultResolveProjectContext;
  const createTemplatePreviewTables =
    resolvers.createTemplatePreviewTables ?? defaultCreateTemplatePreviewTables;

  return {
    effectOf: (toolName) => tools.get(toolName)?.effect,

    precondition: resolvers.precondition ?? toolPrecondition,

    resolveTemplatePreview: async (cwd, blueprintName, displayName) => {
      const { context } = await resolveProjectContext(cwd);
      if (!context) return undefined;
      const result = await createTemplatePreviewTables(context, blueprintName);
      if (result.tables.length === 0) return undefined;
      return {
        kind: 'template',
        displayName,
        blueprintName: result.blueprintName || undefined,
        tables: result.tables,
      };
    },
  };
}
