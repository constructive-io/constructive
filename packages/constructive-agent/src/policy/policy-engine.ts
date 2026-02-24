import type {
  PolicyDecision,
  PolicyEngine,
  PolicyEvaluationContext,
} from '../types/policy';
import type { CapabilityTag, ToolRiskClass } from '../types/tools';

export type CapabilityPolicyRule = {
  action: PolicyDecision['action'];
  reason: string;
  riskClass?: ToolRiskClass;
};

export type CapabilityPolicyMap = Partial<Record<CapabilityTag, CapabilityPolicyRule>>;

export class StaticPolicyEngine implements PolicyEngine {
  constructor(
    private readonly rules: CapabilityPolicyMap,
    private readonly defaultRule: CapabilityPolicyRule,
  ) {}

  async evaluate(context: PolicyEvaluationContext): Promise<PolicyDecision> {
    const capability = context.tool.capability;
    const toolRiskClass = context.tool.riskClass;

    const rule = this.rules[capability] || this.defaultRule;

    return {
      action: rule.action,
      reason: rule.reason,
      riskClass: rule.riskClass || toolRiskClass,
      metadata: {
        capability,
        toolName: context.tool.name,
      },
    };
  }
}

const ACTION_PRIORITY: Record<PolicyDecision['action'], number> = {
  deny: 3,
  needs_approval: 2,
  allow: 1,
};

export type ContextualPolicyEvaluator = (
  context: PolicyEvaluationContext,
) => Promise<PolicyDecision | null> | PolicyDecision | null;

export class ContextualPolicyEngine implements PolicyEngine {
  constructor(private readonly evaluator: ContextualPolicyEvaluator) {}

  async evaluate(context: PolicyEvaluationContext): Promise<PolicyDecision> {
    const decision = await this.evaluator(context);

    if (!decision) {
      return {
        action: 'allow',
        reason: 'No contextual policy override matched.',
        riskClass: context.tool.riskClass,
        metadata: {
          capability: context.tool.capability,
          toolName: context.tool.name,
          source: 'contextual_default_allow',
        },
      };
    }

    return decision;
  }
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries
    .map(
      ([key, nested]) =>
        `${JSON.stringify(key)}:${stableStringify(nested)}`,
    )
    .join(',')}}`;
};

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    (isObjectRecord(left) || Array.isArray(left)) &&
    (isObjectRecord(right) || Array.isArray(right))
  ) {
    return stableStringify(left) === stableStringify(right);
  }

  return false;
};

const toArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

const getValueByPath = (source: unknown, path: string): unknown => {
  if (!path) {
    return source;
  }

  const segments = path.split('.');
  let current: unknown = source;

  for (const segment of segments) {
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      const index = Number(segment);
      current = current[index];
      continue;
    }

    if (isObjectRecord(current)) {
      current = current[segment];
      continue;
    }

    return undefined;
  }

  return current;
};

const matchesList = <TValue>(
  currentValue: TValue | undefined,
  expectedValues?: TValue[],
): boolean => {
  if (!expectedValues || expectedValues.length === 0) {
    return true;
  }

  if (currentValue === undefined) {
    return false;
  }

  return expectedValues.includes(currentValue);
};

const matchesPathConstraints = (
  source: unknown,
  expected: Record<string, unknown | unknown[]> | undefined,
): boolean => {
  if (!expected) {
    return true;
  }

  for (const [path, expectedValue] of Object.entries(expected)) {
    const actual = getValueByPath(source, path);
    const expectedCandidates = toArray(expectedValue);
    const matched = expectedCandidates.some((candidate) =>
      valuesEqual(actual, candidate),
    );

    if (!matched) {
      return false;
    }
  }

  return true;
};

const matchesPathExistence = (
  source: unknown,
  paths: string[] | undefined,
): boolean => {
  if (!paths || paths.length === 0) {
    return true;
  }

  for (const path of paths) {
    const value = getValueByPath(source, path);
    if (value === undefined) {
      return false;
    }
  }

  return true;
};

export interface ContextualPolicyRuleMatcher {
  tenantIds?: string[];
  actorIds?: string[];
  toolNames?: string[];
  capabilities?: CapabilityTag[];
  riskClasses?: ToolRiskClass[];
  metadataEquals?: Record<string, unknown | unknown[]>;
  invocationArgsEquals?: Record<string, unknown | unknown[]>;
  invocationArgsExists?: string[];
}

export interface ContextualPolicyRule {
  id: string;
  description?: string;
  priority?: number;
  matcher?: ContextualPolicyRuleMatcher;
  action: PolicyDecision['action'];
  reason: string;
  riskClass?: ToolRiskClass;
}

export interface RuleBasedContextualPolicyEngineOptions {
  rules: ContextualPolicyRule[];
  defaultDecision?: Omit<PolicyDecision, 'metadata'>;
}

const sortRules = (rules: ContextualPolicyRule[]): ContextualPolicyRule[] => {
  return rules
    .map((rule, index) => ({ rule, index }))
    .sort((left, right) => {
      const byPriority =
        (right.rule.priority || 0) - (left.rule.priority || 0);
      if (byPriority !== 0) {
        return byPriority;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.rule);
};

const matchesRule = (
  context: PolicyEvaluationContext,
  rule: ContextualPolicyRule,
): boolean => {
  const matcher = rule.matcher;
  if (!matcher) {
    return true;
  }

  if (!matchesList(context.run.tenantId, matcher.tenantIds)) {
    return false;
  }

  if (!matchesList(context.run.actorId, matcher.actorIds)) {
    return false;
  }

  if (!matchesList(context.tool.name, matcher.toolNames)) {
    return false;
  }

  if (!matchesList(context.tool.capability, matcher.capabilities)) {
    return false;
  }

  if (!matchesList(context.tool.riskClass, matcher.riskClasses)) {
    return false;
  }

  if (!matchesPathConstraints(context.run.metadata || {}, matcher.metadataEquals)) {
    return false;
  }

  if (
    !matchesPathConstraints(
      (context.invocation.args || {}) as Record<string, unknown>,
      matcher.invocationArgsEquals,
    )
  ) {
    return false;
  }

  if (
    !matchesPathExistence(
      (context.invocation.args || {}) as Record<string, unknown>,
      matcher.invocationArgsExists,
    )
  ) {
    return false;
  }

  return true;
};

export class RuleBasedContextualPolicyEngine implements PolicyEngine {
  private readonly rules: ContextualPolicyRule[];
  private readonly defaultDecision?: Omit<PolicyDecision, 'metadata'>;

  constructor(options: RuleBasedContextualPolicyEngineOptions) {
    this.rules = sortRules(options.rules);
    this.defaultDecision = options.defaultDecision;
  }

  async evaluate(context: PolicyEvaluationContext): Promise<PolicyDecision> {
    for (const rule of this.rules) {
      if (!matchesRule(context, rule)) {
        continue;
      }

      return {
        action: rule.action,
        reason: rule.reason,
        riskClass: rule.riskClass || context.tool.riskClass,
        metadata: {
          capability: context.tool.capability,
          toolName: context.tool.name,
          source: 'contextual_rule',
          ruleId: rule.id,
        },
      };
    }

    if (this.defaultDecision) {
      return {
        ...this.defaultDecision,
        riskClass: this.defaultDecision.riskClass || context.tool.riskClass,
        metadata: {
          capability: context.tool.capability,
          toolName: context.tool.name,
          source: 'contextual_rule_default',
        },
      };
    }

    return {
      action: 'allow',
      reason: 'No contextual policy rule matched.',
      riskClass: context.tool.riskClass,
      metadata: {
        capability: context.tool.capability,
        toolName: context.tool.name,
        source: 'contextual_default_allow',
      },
    };
  }
}

export class CompositePolicyEngine implements PolicyEngine {
  constructor(private readonly engines: PolicyEngine[]) {}

  async evaluate(context: PolicyEvaluationContext): Promise<PolicyDecision> {
    if (this.engines.length === 0) {
      return {
        action: 'deny',
        reason: 'No policy engines configured.',
        riskClass: context.tool.riskClass,
        metadata: {
          capability: context.tool.capability,
          toolName: context.tool.name,
        },
      };
    }

    const decisions = await Promise.all(
      this.engines.map((engine) => engine.evaluate(context)),
    );

    const selected = decisions
      .slice()
      .sort((a, b) => ACTION_PRIORITY[b.action] - ACTION_PRIORITY[a.action])[0];

    return {
      ...selected,
      metadata: {
        ...selected.metadata,
        chainDecisions: decisions.map((decision) => ({
          action: decision.action,
          reason: decision.reason,
          riskClass: decision.riskClass,
        })),
      },
    };
  }
}
