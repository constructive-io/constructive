import type { AnyHarnessTool, HarnessTool, HarnessToolResult } from '@agentic-kit/harness';
import type { z } from 'zod';

import type {
  DshContentBlock,
  DshJsonSchema,
  DshToolDefinition,
  DshToolRunContext
} from './dsh-types';
import { toDshParameters } from './schema';

/** What a bound tool needs that a `HarnessTool` does not state. */
export interface ToDshToolOptions {
  /**
   * The working directory a tool resolves project context from. dsh keeps the
   * directory on the session header and its filesystem service rather than on a
   * tool's execution context, so the adapter is told once instead of guessing
   * per call. Defaults to `process.cwd()`.
   */
  cwd?: () => string;
}

/** The canonical value a bound tool returns: the neutral result, as JSON. */
const OUTPUT_SCHEMA: DshJsonSchema = {
  type: 'object',
  properties: {
    content: { type: 'array', items: { type: 'object' } },
    details: {},
    terminate: { type: 'boolean' }
  },
  required: ['content']
};

/**
 * Bind a neutral `HarnessTool` to dsh's `ToolDefinition`.
 *
 * The sibling of `toPiTool` — same tools, a second harness's shape. dsh asks
 * for three things pi does not: parameters in its JSON Schema subset (see
 * `./schema`), a *declared canonical output* with a pure projection from that
 * value to model-facing content, and a body that returns the value rather than
 * the content. So the neutral `HarnessToolResult` becomes the canonical value
 * verbatim and `output.render` projects its `content` — which means dsh's
 * durable log keeps the tool's structured `details`, and a Constructive
 * renderer reads the same detail out of a dsh transcript as out of a pi one.
 *
 * Arguments are parsed with the tool's own zod schema before the body runs:
 * dsh validates against the narrowed subset schema, and this restores every
 * constraint that narrowing dropped.
 */
export function toDshTool<TParams extends z.ZodType, TDetails>(
  tool: HarnessTool<TParams, TDetails>,
  options: ToDshToolOptions = {}
): DshToolDefinition {
  const cwd = options.cwd ?? (() => process.cwd());

  return {
    name: tool.name,
    description: describe(tool),
    parameters: toDshParameters(tool.parameters),
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => renderContent(value)
    },
    async execute(args: unknown, exec: DshToolRunContext): Promise<unknown> {
      const params = tool.parameters.parse(args) as z.output<TParams>;
      const result: HarnessToolResult<TDetails> = await tool.execute(params, {
        cwd: cwd(),
        signal: exec.signal
      });
      return {
        content: result.content,
        details: result.details === undefined ? null : result.details,
        ...(result.terminate === undefined ? {} : { terminate: result.terminate })
      };
    }
  };
}

/** Bind a whole tool set, in registration order. */
export function toDshTools(
  tools: readonly AnyHarnessTool[],
  options: ToDshToolOptions = {}
): DshToolDefinition[] {
  return tools.map((tool) => toDshTool(tool, options));
}

/**
 * dsh has one description field where pi has three, so a tool's prompt snippet
 * and guidelines — the parts that tell a model *when* to reach for it — are
 * folded in rather than dropped.
 */
function describe(tool: AnyHarnessTool): string {
  const parts = [tool.description];
  if (tool.promptSnippet) parts.push(tool.promptSnippet);
  if (tool.promptGuidelines?.length) {
    parts.push(tool.promptGuidelines.map((line) => `- ${line}`).join('\n'));
  }
  return parts.join('\n\n');
}

/** The neutral result's content blocks, in dsh's block vocabulary. */
function renderContent(value: unknown): DshContentBlock[] {
  const content = (value as { content?: unknown } | null)?.content;
  if (!Array.isArray(content)) return [];

  return content.map((block) => {
    const typed = block as { type?: string; text?: unknown };
    if (typed.type === 'text') return { type: 'text', text: String(typed.text ?? '') };
    // dsh's image block references an attachment the attachment service owns, so
    // an inline image cannot be handed over as one; its text form is honest.
    return { type: 'text', text: JSON.stringify(block) };
  });
}
