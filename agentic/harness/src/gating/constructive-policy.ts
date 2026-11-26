import type { ToolEffect, ToolFailure } from '../tools/tool';
import type { GatePolicy, GateToolCallEvent } from './policy';
import type { ConfirmPreview, PlanTableAccess, PlanTarget } from './preview';
import { buildConfirmPrompt } from './prompts';

/**
 * What the precondition step resolved: why the call cannot run, or what it acts
 * on, for a call that creates or changes the access of a table, that access,
 * and what the plan must say that the input does not.
 */
export type GateReadiness =
  | { kind: 'blocked'; failure: ToolFailure }
  | { kind: 'ready'; target: PlanTarget; access?: PlanTableAccess[]; notes?: string[] };

/**
 * Host capabilities the Constructive database policy needs. These are
 * Constructive-specific — a policy for another host asks for whatever *its*
 * rules depend on instead.
 */
export type ConstructiveGateDeps = {
  /**
   * The effect of a tool, or undefined for a tool this policy does not know,
   * which it leaves ungated. Synchronous and free of I/O, like `isGated`.
   */
  effectOf(toolName: string): ToolEffect | undefined;
  /**
   * Why the call cannot run now, or what it acts on when it can. It must be
   * the check the tool itself makes before it changes anything (the same
   * project context, plane and sign-in), so the gate and the tool cannot
   * disagree; the target it resolved goes into the plan.
   */
  precondition(
    toolName: string,
    input: Record<string, unknown> | undefined,
    cwd: string
  ): Promise<GateReadiness>;
  /**
   * Resolve the preview for `create_template` (its tables live in the
   * blueprint it copies, not in the tool input). Return undefined when a
   * preview can't be built.
   */
  resolveTemplatePreview(
    cwd: string,
    blueprintName: string | undefined,
    displayName: string
  ): Promise<ConfirmPreview | undefined>;
};

/**
 * The gate policy for Constructive's database tools, as the Desktop and CLI
 * hosts want it: gate every call whose effect is not `read`, block a call
 * whose precondition fails with that failure, and ask for every other one.
 */
export function createConstructiveGatePolicy(deps: ConstructiveGateDeps): GatePolicy {
  return {
    isGated: (event: GateToolCallEvent) => {
      const effect = deps.effectOf(event.toolName);
      return effect !== undefined && effect !== 'read';
    },

    resolvePrompt: async (event, cwd) => {
      const input = event.input;
      const ready = await deps.precondition(event.toolName, input, cwd);
      if (ready.kind === 'blocked') return { kind: 'blocked', failure: ready.failure };

      const prompt = buildConfirmPrompt(event.toolName, input, { target: ready.target, access: ready.access, notes: ready.notes });
      if (event.toolName === 'create_template') {
        const blueprintName =
          typeof input?.blueprintName === 'string' ? input.blueprintName : undefined;
        const displayName = typeof input?.displayName === 'string' ? input.displayName : '';
        const preview = await deps.resolveTemplatePreview(cwd, blueprintName, displayName);
        if (preview) return { kind: 'ask', prompt: { ...prompt, preview } };
      }
      return { kind: 'ask', prompt };
    },
  };
}
