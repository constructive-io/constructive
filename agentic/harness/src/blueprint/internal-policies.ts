// System-managed policies that the platform attaches automatically; they are
// noise in a schema overview and not something the agent can act on, so they
// are hidden from both the agent's tool output and the UI policy pills.
const INTERNAL_POLICY_TYPES = new Set(['AuthzNotReadOnly']);

export function isInternalPolicy(policyType: string | null | undefined): boolean {
  return !policyType || INTERNAL_POLICY_TYPES.has(policyType);
}

export function filterInternalPolicies(policyTypes: string[]): string[] {
  return policyTypes.filter((type) => !isInternalPolicy(type));
}
