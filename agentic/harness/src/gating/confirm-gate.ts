import { buildDeclineReason, createDeclineGuard } from './decline-guard';
import type { ConfirmPreview } from './preview';
import { buildConfirmPrompt, MUTATING_DB_TOOLS } from './prompts';

/**
 * Host-neutral confirm gate for mutating db tools. Structurally mirrors the
 * pi extension `tool_call` hook so a pi adapter is a thin mapping, but takes
 * every host capability (confirm UI, skip notification, context/token/preview
 * resolvers) as injected deps — no Electron, no pi imports.
 */

export type GateToolCallEvent = {
  toolName: string;
  toolCallId: string;
  input?: Record<string, unknown>;
};

/** `block: true` stops the tool call; `reason` is surfaced to the agent. */
export type GateResult = { block: true; reason: string } | undefined;

export type GateHost = {
  /** Whether a confirmation UI is available (headless hosts return false). */
  hasUI: boolean;
  /** Ask the user to approve the call. Resolve false to decline. */
  confirmTool(
    toolCallId: string,
    title: string,
    message: string,
    preview?: ConfirmPreview
  ): Promise<boolean>;
  /** A retry of an already-declined call was auto-skipped without prompting. */
  notifyToolSkipped(toolCallId: string): void;
};

export type ConfirmGateDeps = {
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
};

export type ConfirmGate = {
  onAgentStart: () => void;
  onToolCall: (event: GateToolCallEvent, host: GateHost, cwd: string) => Promise<GateResult>;
};

export function createConfirmGate(deps: ConfirmGateDeps): ConfirmGate {
  const declineGuard = createDeclineGuard();

  async function confirmOrDecline(
    event: GateToolCallEvent,
    host: GateHost,
    input: Record<string, unknown> | undefined,
    preview?: ConfirmPreview
  ): Promise<GateResult> {
    const { title, message, preview: basePreview } = buildConfirmPrompt(event.toolName, input);
    const approved = await host.confirmTool(
      event.toolCallId,
      title,
      message,
      preview ?? basePreview
    );
    if (!approved) {
      declineGuard.recordDecline(event.toolName, input);
      return { block: true, reason: buildDeclineReason(event.toolName) };
    }
    // An approved mutation changes database state, so earlier declines may no
    // longer describe the same effect (e.g. a create_template preview derives
    // from the blueprint, not the input) — let them re-prompt with fresh eyes.
    declineGuard.clear();
    return undefined;
  }

  return {
    onAgentStart: () => declineGuard.clear(),

    onToolCall: async (event, host, cwd) => {
      if (!MUTATING_DB_TOOLS.has(event.toolName)) return;

      const input = event.input;

      // manage_entity_types multiplexes read + write actions behind one tool
      // name; its read action is not a mutation, so it skips the gate.
      if (event.toolName === 'manage_entity_types' && input?.action === 'list') return;

      const retryBlock = declineGuard.checkRetry(event.toolName, input);
      if (retryBlock) {
        if (host.hasUI) {
          host.notifyToolSkipped(event.toolCallId);
        }
        return { block: true, reason: retryBlock };
      }

      if (!host.hasUI) {
        return {
          block: true,
          reason: `Cannot confirm "${event.toolName}" — no confirmation UI is available.`,
        };
      }

      // provision_database is the tool that CREATES the project context, so it
      // can't gate on an existing one — confirm it directly.
      if (event.toolName === 'provision_database') {
        return confirmOrDecline(event, host, input);
      }

      if (!(await deps.isProjectRunnable(cwd))) return;
      if (event.toolName === 'add_records' && !(await deps.hasDataToken(cwd))) return;

      let resolvedPreview: ConfirmPreview | undefined;
      if (event.toolName === 'create_template') {
        const blueprintName =
          typeof input?.blueprintName === 'string' ? input.blueprintName : undefined;
        const displayName = typeof input?.displayName === 'string' ? input.displayName : '';
        resolvedPreview = await deps.resolveTemplatePreview(cwd, blueprintName, displayName);
      }

      return confirmOrDecline(event, host, input, resolvedPreview);
    },
  };
}
