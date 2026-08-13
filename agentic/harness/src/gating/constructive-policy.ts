import type { GatePolicy, GateToolCallEvent } from './policy';
import type { ConfirmPreview } from './preview';
import { buildConfirmPrompt, MUTATING_DB_TOOLS } from './prompts';

/**
 * Host capabilities the Constructive database policy needs. These are
 * Constructive-specific — a policy for another host asks for whatever *its*
 * rules depend on instead.
 */
export type ConstructiveGateDeps = {
  /**
   * Whether the project is provisioned/runnable at `cwd`. Unrunnable calls
   * skip the confirm so the tool can return its clean "provision first"
   * message instead of making the user approve something that fails.
   */
  isProjectRunnable(cwd: string): Promise<boolean>;
  /** Whether a data-plane token is available (gates `add_records`). */
  hasDataToken(cwd: string): Promise<boolean>;
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
  /**
   * Tool names that require a human decision. Defaults to
   * `MUTATING_DB_TOOLS`; a host that wants a different set entirely is better
   * served by its own `GatePolicy`.
   */
  gatedTools?: ReadonlySet<string>;
};

/**
 * The gate policy for Constructive's database tools, as the Desktop and CLI
 * hosts want it: gate every mutating db tool, and skip the confirm when the
 * call is going to bounce off a missing project or a missing sign-in anyway.
 */
export function createConstructiveGatePolicy(deps: ConstructiveGateDeps): GatePolicy {
  const gatedTools = deps.gatedTools ?? MUTATING_DB_TOOLS;

  return {
    isGated: (event: GateToolCallEvent) => {
      if (!gatedTools.has(event.toolName)) return false;
      // manage_entity_types multiplexes read + write actions behind one tool
      // name; its read action is not a mutation, so it skips the gate.
      if (event.toolName === 'manage_entity_types' && event.input?.action === 'list') return false;
      return true;
    },

    resolvePrompt: async (event, cwd) => {
      const input = event.input;
      const prompt = buildConfirmPrompt(event.toolName, input);

      // provision_database is the tool that CREATES the project context, so it
      // can't gate on an existing one — confirm it directly.
      if (event.toolName === 'provision_database') return prompt;

      if (!(await deps.isProjectRunnable(cwd))) return null;
      // Tools that need an app sign-in skip the confirm when no data token
      // exists — the tool returns its sign-in prompt instead of making the
      // user approve something that fails.
      if (
        (event.toolName === 'add_records' || event.toolName === 'create_api_key') &&
        !(await deps.hasDataToken(cwd))
      ) {
        return null;
      }

      if (event.toolName === 'create_template') {
        const blueprintName =
          typeof input?.blueprintName === 'string' ? input.blueprintName : undefined;
        const displayName = typeof input?.displayName === 'string' ? input.displayName : '';
        const preview = await deps.resolveTemplatePreview(cwd, blueprintName, displayName);
        if (preview) return { ...prompt, preview };
      }

      return prompt;
    },
  };
}
