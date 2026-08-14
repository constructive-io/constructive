/**
 * The declared half of the gate: which tool calls run, which are refused, and
 * which need a human. A policy is data — an ordered rule list evaluated with no
 * I/O — so the same policy can be asserted in a test, stored on a run row, and
 * shown in a UI.
 */

export type GateDecision = 'allow' | 'deny' | 'ask';

export interface GateRequest {
  toolName: string;
  input: Record<string, unknown>;
}

export interface GateRule {
  /** Tool name, or `*` for every tool. */
  tool: string;
  decision: GateDecision;
  /** Narrow the rule to particular arguments (e.g. a bash command pattern). */
  match?: (request: GateRequest) => boolean;
  /** Shown to the model when denied, and to the human when asked. */
  reason?: string;
}

export interface GateVerdict {
  decision: GateDecision;
  reason?: string;
  /** The rule that decided, or `undefined` when the default applied. */
  rule?: GateRule;
}

export interface GatePolicyOptions {
  rules?: readonly GateRule[];
  /** Verdict when no rule matches. Defaults to `ask` — an undeclared tool is
   * not implicitly trusted, and denying outright would strand the run. */
  defaultDecision?: GateDecision;
  defaultReason?: string;
}

export class GatePolicy {
  readonly rules: readonly GateRule[];
  readonly defaultDecision: GateDecision;
  private readonly defaultReason: string | undefined;

  constructor(options: GatePolicyOptions = {}) {
    this.rules = options.rules ?? [];
    this.defaultDecision = options.defaultDecision ?? 'ask';
    this.defaultReason = options.defaultReason;

    for (const rule of this.rules) {
      if (!rule.tool) throw new Error('gate: every rule needs a tool name (or "*")');
    }
  }

  /** First matching rule wins, so order the list most specific first. */
  evaluate(request: GateRequest): GateVerdict {
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

export function gatePolicy(options: GatePolicyOptions = {}): GatePolicy {
  return new GatePolicy(options);
}
