/**
 * The declared half of the run gate: which tool calls run, which are refused,
 * and which need a human. A policy is data — an ordered rule list evaluated with
 * no I/O — so the same policy can be asserted in a test, stored on a run row,
 * and shown in a UI.
 *
 * This is the *run's* policy, decided wherever the run is configured and
 * enforceable without a UI, as opposed to `ConfirmGatePolicy` in
 * `./policy`, which is a host's interactive confirm surface. Harness-neutral:
 * an adapter maps its own tool-call event onto `RunGateRequest`.
 */

export type RunGateDecision = 'allow' | 'deny' | 'ask';

export interface RunGateRequest {
  toolName: string;
  input: Record<string, unknown>;
}

export interface RunGateRule {
  /** Tool name, or `*` for every tool. */
  tool: string;
  decision: RunGateDecision;
  /** Narrow the rule to particular arguments (e.g. a bash command pattern). */
  match?: (request: RunGateRequest) => boolean;
  /** Shown to the model when denied, and to the human when asked. */
  reason?: string;
}

export interface RunGateVerdict {
  decision: RunGateDecision;
  reason?: string;
  /** The rule that decided, or `undefined` when the default applied. */
  rule?: RunGateRule;
}

export interface RunGatePolicyOptions {
  rules?: readonly RunGateRule[];
  /** Verdict when no rule matches. Defaults to `ask` — an undeclared tool is
   * not implicitly trusted, and denying outright would strand the run. */
  defaultDecision?: RunGateDecision;
  defaultReason?: string;
}

export class RunGatePolicy {
  readonly rules: readonly RunGateRule[];
  readonly defaultDecision: RunGateDecision;
  private readonly defaultReason: string | undefined;

  constructor(options: RunGatePolicyOptions = {}) {
    this.rules = options.rules ?? [];
    this.defaultDecision = options.defaultDecision ?? 'ask';
    this.defaultReason = options.defaultReason;

    for (const rule of this.rules) {
      if (!rule.tool) throw new Error('gate: every rule needs a tool name (or "*")');
    }
  }

  /** First matching rule wins, so order the list most specific first. */
  evaluate(request: RunGateRequest): RunGateVerdict {
    for (const rule of this.rules) {
      if (rule.tool !== '*' && rule.tool !== request.toolName) continue;
      if (rule.match && !rule.match(request)) continue;
      return rule.reason === undefined
        ? { decision: rule.decision, rule }
        : { decision: rule.decision, reason: rule.reason, rule };
    }
    return this.defaultReason === undefined
      ? { decision: this.defaultDecision }
      : { decision: this.defaultDecision, reason: this.defaultReason };
  }
}

export function runGatePolicy(options: RunGatePolicyOptions = {}): RunGatePolicy {
  return new RunGatePolicy(options);
}
