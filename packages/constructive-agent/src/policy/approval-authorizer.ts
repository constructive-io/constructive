import type { ApprovalDecision } from '../types/approval';
import type { CapabilityTag, ToolRiskClass } from '../types/tools';

export interface ApprovalAuthorizationContext {
  runId: string;
  requestId: string;
  decision: ApprovalDecision;
  decidedBy: string;
  reason?: string;
  actorId?: string;
  tenantId?: string;
  toolName?: string;
  capability?: CapabilityTag;
  riskClass?: ToolRiskClass;
}

export interface ApprovalAuthorizer {
  authorize(
    context: ApprovalAuthorizationContext,
  ): Promise<boolean> | boolean;
}

export interface RoleBasedApprovalAuthorizerOptions {
  allowedActors: string[];
}

export class RoleBasedApprovalAuthorizer implements ApprovalAuthorizer {
  private readonly allowedActors: Set<string>;

  constructor(options: RoleBasedApprovalAuthorizerOptions) {
    this.allowedActors = new Set(options.allowedActors);
  }

  async authorize(context: ApprovalAuthorizationContext): Promise<boolean> {
    return this.allowedActors.has(context.decidedBy);
  }
}

export interface ApprovalAuthorizationRule {
  id: string;
  effect: 'allow' | 'deny';
  priority?: number;
  deciders?: string[];
  tenantIds?: string[];
  actorIds?: string[];
  toolNames?: string[];
  capabilities?: CapabilityTag[];
  riskClasses?: ToolRiskClass[];
  decisions?: ApprovalDecision[];
}

export interface PolicyMatrixApprovalAuthorizerOptions {
  rules: ApprovalAuthorizationRule[];
  defaultEffect?: 'allow' | 'deny';
}

const sortRules = (
  rules: ApprovalAuthorizationRule[],
): ApprovalAuthorizationRule[] => {
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

const matches = <TValue>(
  value: TValue | undefined,
  expected?: TValue[],
): boolean => {
  if (!expected || expected.length === 0) {
    return true;
  }

  if (value === undefined) {
    return false;
  }

  return expected.includes(value);
};

const matchesRule = (
  context: ApprovalAuthorizationContext,
  rule: ApprovalAuthorizationRule,
): boolean => {
  if (!matches(context.decidedBy, rule.deciders)) {
    return false;
  }

  if (!matches(context.tenantId, rule.tenantIds)) {
    return false;
  }

  if (!matches(context.actorId, rule.actorIds)) {
    return false;
  }

  if (!matches(context.toolName, rule.toolNames)) {
    return false;
  }

  if (!matches(context.capability, rule.capabilities)) {
    return false;
  }

  if (!matches(context.riskClass, rule.riskClasses)) {
    return false;
  }

  if (!matches(context.decision, rule.decisions)) {
    return false;
  }

  return true;
};

export class PolicyMatrixApprovalAuthorizer implements ApprovalAuthorizer {
  private readonly rules: ApprovalAuthorizationRule[];
  private readonly defaultEffect: 'allow' | 'deny';

  constructor(options: PolicyMatrixApprovalAuthorizerOptions) {
    this.rules = sortRules(options.rules);
    this.defaultEffect = options.defaultEffect || 'deny';
  }

  async authorize(context: ApprovalAuthorizationContext): Promise<boolean> {
    for (const rule of this.rules) {
      if (!matchesRule(context, rule)) {
        continue;
      }

      return rule.effect === 'allow';
    }

    return this.defaultEffect === 'allow';
  }
}

export const assertApprovalAuthorized = async (
  authorizer: ApprovalAuthorizer | undefined,
  context: ApprovalAuthorizationContext,
): Promise<void> => {
  if (!authorizer) {
    return;
  }

  const allowed = await authorizer.authorize(context);
  if (!allowed) {
    throw new Error(
      `Approval decision not authorized for actor ${context.decidedBy}`,
    );
  }
};
