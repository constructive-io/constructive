/**
 * The pi side of the run gate: map pi's `tool_call` event onto the neutral
 * `RunGate` and turn its outcome into pi's block shape.
 *
 * pi's `tool_call` handler can await, so an `ask` verdict simply suspends the
 * tool until the approval channel resolves. That is the whole mechanism for
 * "approve a cloud agent's `rm -rf` from a browser tab" — and it is all the
 * harness-specific code the gate needs; the policy, the approval rendezvous and
 * the audit record live in `@agentic-kit/harness`.
 */

import {
  type ApprovalRequest,
  createRunGate,
  type RunGate,
  type RunGateOptions,
  type RunGatePolicy
} from '@agentic-kit/harness';
import type { ExtensionAPI, ExtensionFactory } from '@earendil-works/pi-coding-agent';

export type GateExtensionOptions = RunGateOptions;

export interface GateExtension {
  extension: ExtensionFactory;
  policy: RunGatePolicy;
  /** Requests currently waiting on a human. */
  pending: ReadonlyMap<string, ApprovalRequest>;
  gate: RunGate;
}

export function createGateExtension(options: GateExtensionOptions): GateExtension {
  const gate = createRunGate(options);

  const extension: ExtensionFactory = (pi: ExtensionAPI) => {
    pi.on('tool_call', async (event) => {
      const outcome = await gate.decide({
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        input: (event.input ?? {}) as Record<string, unknown>
      });

      if (outcome.allowed) return {};
      return { block: true, ...(outcome.reason === undefined ? {} : { reason: outcome.reason }) };
    });
  };

  return { extension, policy: gate.policy, pending: gate.pending, gate };
}
