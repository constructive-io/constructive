/**
 * The pi extension: evaluate the policy on every `tool_call`, and block the call
 * when the policy — or the human the policy defers to — says no.
 *
 * pi's `tool_call` handler can await, so an `ask` verdict simply suspends the
 * tool until the approval channel resolves. That is the whole mechanism for
 * "approve a cloud agent's `rm -rf` from a browser tab".
 */

import type { ExtensionAPI, ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { type ApprovalChannel, type ApprovalOutcome, type ApprovalRequest } from './approval';
import { type GateDecision, GatePolicy, type GatePolicyOptions, type GateVerdict } from './policy';

export interface GateDecisionRecord {
  runId: string;
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  /** What the policy said. */
  verdict: GateVerdict;
  /** How the request was finally settled. */
  decision: 'allow' | 'deny';
  reason?: string;
  actorId?: string;
  decidedAt: string;
}

export interface GateExtensionOptions {
  runId: string;
  /** A policy, or the options to build one. */
  policy: GatePolicy | GatePolicyOptions;
  /** Required only if the policy can produce `ask`. */
  approvals?: ApprovalChannel;
  /** Every settled decision, for the run log / audit trail. */
  onDecision?: (record: GateDecisionRecord) => void;
  now?: () => Date;
}

export interface GateExtension {
  extension: ExtensionFactory;
  policy: GatePolicy;
  /** Requests currently waiting on a human. */
  pending: ReadonlyMap<string, ApprovalRequest>;
}

export function createGateExtension(options: GateExtensionOptions): GateExtension {
  const policy = options.policy instanceof GatePolicy ? options.policy : new GatePolicy(options.policy);
  const now = options.now ?? (() => new Date());

  if (canAsk(policy) && !options.approvals) {
    throw new Error('gate: the policy can produce "ask", so an approvals channel is required');
  }

  const pending = new Map<string, ApprovalRequest>();

  const extension: ExtensionFactory = (pi: ExtensionAPI) => {
    pi.on('tool_call', async (event) => {
      const input = (event.input ?? {}) as Record<string, unknown>;
      const verdict = policy.evaluate({ toolName: event.toolName, input });

      const settled: ApprovalOutcome =
        verdict.decision === 'ask'
          ? await ask(event.toolCallId, event.toolName, input, verdict)
          : { decision: verdict.decision, ...(verdict.reason === undefined ? {} : { reason: verdict.reason }) };

      options.onDecision?.({
        runId: options.runId,
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        input,
        verdict,
        decision: settled.decision,
        ...(settled.reason === undefined ? {} : { reason: settled.reason }),
        ...(settled.actorId === undefined ? {} : { actorId: settled.actorId }),
        decidedAt: now().toISOString()
      });

      if (settled.decision === 'allow') return {};
      // The reason is the model's only explanation for the refusal, so it is
      // worth being specific in the policy.
      return { block: true, reason: settled.reason ?? `gate: ${event.toolName} is not permitted in this run` };
    });
  };

  return { extension, policy, pending };

  async function ask(
    toolCallId: string,
    toolName: string,
    input: Record<string, unknown>,
    verdict: GateVerdict
  ): Promise<ApprovalOutcome> {
    const request: ApprovalRequest = {
      runId: options.runId,
      toolCallId,
      toolName,
      input,
      ...(verdict.reason === undefined ? {} : { reason: verdict.reason }),
      requestedAt: now().toISOString()
    };

    pending.set(toolCallId, request);
    try {
      return await options.approvals!.request(request);
    } finally {
      pending.delete(toolCallId);
    }
  }
}

function canAsk(policy: GatePolicy): boolean {
  const decisions: GateDecision[] = [policy.defaultDecision, ...policy.rules.map((rule) => rule.decision)];
  return decisions.includes('ask');
}
