import type { ConstructiveGateDeps } from './constructive-policy';
import { createConstructiveGatePolicy } from './constructive-policy';
import { buildDeclineReason, createDeclineGuard } from './decline-guard';
import type { GatePolicy, GateToolCallEvent } from './policy';
import type { ConfirmPreview } from './preview';

/**
 * Host-neutral confirm gate. It owns the mechanics of asking a human —
 * decline memory, auto-skipping a declined retry, refusing gated calls on a
 * headless host — and takes both the host's capabilities (confirm UI, skip
 * notification) and its policy (which calls are gated, what the prompt says)
 * as injected dependencies. Structurally mirrors the pi extension `tool_call`
 * hook so a pi adapter is a thin mapping: no Electron, no pi imports.
 */

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

/**
 * The Constructive database deps, from which the gate derives the default
 * `GatePolicy`. Kept as the name every existing host passes.
 */
export type ConfirmGateDeps = ConstructiveGateDeps;

/**
 * Either hand the gate the Constructive deps and get its database policy, or
 * hand it a policy of your own — a remote coding host gating `bash` has no
 * project context or data token to speak of.
 */
export type ConfirmGateOptions = ConfirmGateDeps | { policy: GatePolicy };

export type ConfirmGate = {
  onAgentStart: () => void;
  onToolCall: (event: GateToolCallEvent, host: GateHost, cwd: string) => Promise<GateResult>;
};

export function createConfirmGate(options: ConfirmGateOptions): ConfirmGate {
  const declineGuard = createDeclineGuard();
  const policy: GatePolicy =
    'policy' in options ? options.policy : createConstructiveGatePolicy(options);

  return {
    onAgentStart: () => declineGuard.clear(),

    onToolCall: async (event, host, cwd) => {
      if (!policy.isGated(event)) return;

      const input = event.input;

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

      const prompt = await policy.resolvePrompt(event, cwd);
      if (!prompt) return;

      const approved = await host.confirmTool(
        event.toolCallId,
        prompt.title,
        prompt.message,
        prompt.preview
      );
      if (!approved) {
        declineGuard.recordDecline(event.toolName, input);
        return { block: true, reason: buildDeclineReason(event.toolName) };
      }
      // An approved mutation changes state, so earlier declines may no longer
      // describe the same effect (e.g. a create_template preview derives from
      // the blueprint, not the input) — let them re-prompt with fresh eyes.
      declineGuard.clear();
      return undefined;
    },
  };
}
