/**
 * The run gate: evaluate the run's policy for one tool call and, when the policy
 * will not decide alone, wait for a human through the approval channel.
 *
 * Harness-neutral on purpose. An adapter owns one line of glue — map its
 * harness's tool-call event onto `decide()` and turn the outcome into whatever
 * that harness expects from a blocked call — so the policy, the approval
 * rendezvous and the audit record are the same for every harness.
 */

import { type ApprovalChannel, type ApprovalOutcome, type ApprovalRequest } from './approvals';
import { type RunGateDecision, RunGatePolicy, type RunGatePolicyOptions, type RunGateVerdict } from './run-policy';

export interface RunGateDecisionRecord {
  runId: string;
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  /** What the policy said. */
  verdict: RunGateVerdict;
  /** How the request was finally settled. */
  decision: 'allow' | 'deny';
  reason?: string;
  actorId?: string;
  decidedAt: string;
}

export interface RunGateOptions {
  runId: string;
  /** A policy, or the options to build one. */
  policy: RunGatePolicy | RunGatePolicyOptions;
  /** Required only if the policy can produce `ask`. */
  approvals?: ApprovalChannel;
  /** Every settled decision, for the run log / audit trail. */
  onDecision?: (record: RunGateDecisionRecord) => void;
  now?: () => Date;
}

export interface RunGateToolCall {
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
}

export interface RunGateOutcome {
  /** `false` means the harness must not run the call. */
  allowed: boolean;
  /** The model's only explanation for a refusal, so policies should be specific. */
  reason?: string;
}

export class RunGate {
  readonly policy: RunGatePolicy;
  /** Requests currently waiting on a human. */
  readonly pending: ReadonlyMap<string, ApprovalRequest>;

  private readonly options: RunGateOptions;
  private readonly now: () => Date;
  private readonly waiting = new Map<string, ApprovalRequest>();

  constructor(options: RunGateOptions) {
    this.options = options;
    this.now = options.now ?? (() => new Date());
    this.policy = options.policy instanceof RunGatePolicy ? options.policy : new RunGatePolicy(options.policy);
    this.pending = this.waiting;

    if (canAsk(this.policy) && !options.approvals) {
      throw new Error('gate: the policy can produce "ask", so an approvals channel is required');
    }
  }

  async decide(call: RunGateToolCall): Promise<RunGateOutcome> {
    const input = call.input ?? {};
    const verdict = this.policy.evaluate({ toolName: call.toolName, input });

    const settled: ApprovalOutcome =
      verdict.decision === 'ask'
        ? await this.ask(call.toolCallId, call.toolName, input, verdict)
        : { decision: verdict.decision, ...(verdict.reason === undefined ? {} : { reason: verdict.reason }) };

    this.options.onDecision?.({
      runId: this.options.runId,
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input,
      verdict,
      decision: settled.decision,
      ...(settled.reason === undefined ? {} : { reason: settled.reason }),
      ...(settled.actorId === undefined ? {} : { actorId: settled.actorId }),
      decidedAt: this.now().toISOString()
    });

    if (settled.decision === 'allow') return { allowed: true };
    return { allowed: false, reason: settled.reason ?? `gate: ${call.toolName} is not permitted in this run` };
  }

  private async ask(
    toolCallId: string,
    toolName: string,
    input: Record<string, unknown>,
    verdict: RunGateVerdict
  ): Promise<ApprovalOutcome> {
    const request: ApprovalRequest = {
      runId: this.options.runId,
      toolCallId,
      toolName,
      input,
      ...(verdict.reason === undefined ? {} : { reason: verdict.reason }),
      requestedAt: this.now().toISOString()
    };

    this.waiting.set(toolCallId, request);
    try {
      return await this.options.approvals!.request(request);
    } finally {
      this.waiting.delete(toolCallId);
    }
  }
}

export function createRunGate(options: RunGateOptions): RunGate {
  return new RunGate(options);
}

function canAsk(policy: RunGatePolicy): boolean {
  const decisions: RunGateDecision[] = [policy.defaultDecision, ...policy.rules.map((rule) => rule.decision)];
  return decisions.includes('ask');
}
