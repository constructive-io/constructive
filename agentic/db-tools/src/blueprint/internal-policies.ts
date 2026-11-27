// Policies the platform can attach by itself, such as the read-only block a team
// table gets. Every report of a table's policies shows them; only the
// classification of a table's access mode leaves them out.
const INTERNAL_POLICY_TYPES = new Set(['AuthzNotReadOnly']);

export function isInternalPolicy(policyType: string | null | undefined): boolean {
  return !policyType || INTERNAL_POLICY_TYPES.has(policyType);
}
