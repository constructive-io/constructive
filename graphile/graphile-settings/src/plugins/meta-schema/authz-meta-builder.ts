import type { AuthzGrantMeta, AuthzPolicyMeta, PgCodec } from './types';

/**
 * Raw @authz tag entry as stored in smart_tags jsonb / PostgreSQL COMMENT ON.
 * Each entry maps 1:1 to an apply_rls() call.
 */
interface RawAuthzEntry {
  grants?: [string, string][];
  policy_type?: string;
  vars?: Record<string, unknown>;
  name?: string;
  permissive?: boolean;
  field_names?: string[];
}

/**
 * Human-readable description generators keyed by policy_type.
 * Each function receives the vars object and returns a description string.
 */
const POLICY_DESCRIPTIONS: Record<string, (vars: Record<string, unknown>) => string> = {
  AuthzAllowAll: () => 'Allows all access',
  AuthzDenyAll: () => 'Denies all access',
  AuthzDirectOwner: (vars) => {
    const field = vars.entity_field || 'owner_id';
    return `Requires direct ownership via ${field}`;
  },
  AuthzDirectOwnerAny: (vars) => {
    const fields = Array.isArray(vars.entity_fields) ? vars.entity_fields.join(', ') : 'owner fields';
    return `Requires ownership via any of: ${fields}`;
  },
  AuthzMembership: (vars) => {
    const parts = ['Requires app membership'];
    if (vars.permission) parts.push(`with ${vars.permission} permission`);
    if (vars.permissions && Array.isArray(vars.permissions)) parts.push(`with ${vars.permissions.join(' or ')} permission`);
    if (vars.is_admin) parts.push('(admin)');
    if (vars.is_owner) parts.push('(owner)');
    return parts.join(' ');
  },
  AuthzEntityMembership: (vars) => {
    const field = vars.entity_field || 'entity_id';
    const parts = [`Requires membership on entity referenced by ${field}`];
    if (vars.permission) parts.push(`with ${vars.permission} permission`);
    if (vars.permissions && Array.isArray(vars.permissions)) parts.push(`with ${vars.permissions.join(' or ')} permission`);
    if (vars.is_admin) parts.push('(admin)');
    if (vars.is_owner) parts.push('(owner)');
    return parts.join(' ');
  },
  AuthzRelatedEntityMembership: (vars) => {
    const field = vars.entity_field || 'entity_id';
    return `Requires membership via related entity on ${field}`;
  },
  AuthzOrgHierarchy: (vars) => {
    const dir = vars.direction === 'up' ? 'managers' : 'subordinates';
    return `Org hierarchy access (${dir} can view)`;
  },
  AuthzTemporal: (vars) => {
    const parts = ['Time-window access'];
    if (vars.valid_from_field) parts.push(`from ${vars.valid_from_field}`);
    if (vars.valid_until_field) parts.push(`until ${vars.valid_until_field}`);
    return parts.join(' ');
  },
  AuthzPublishable: () => 'Requires published state',
  AuthzMemberList: (vars) => {
    const field = vars.array_field || 'member_ids';
    return `Requires user in ${field} array`;
  },
  AuthzRelatedMemberList: (vars) => {
    const table = vars.owned_table || 'related table';
    return `Requires user in member list on ${table}`;
  },
  AuthzComposite: (vars) => {
    const op = vars.bool_op === 'or' ? 'OR' : 'AND';
    return `Composite policy (${op})`;
  },
};

function describePolicy(policyType: string, vars: Record<string, unknown>): string {
  const describer = POLICY_DESCRIPTIONS[policyType];
  if (describer) return describer(vars);
  return policyType;
}

function buildGrantMeta(rawGrant: [string, string]): AuthzGrantMeta {
  return {
    privilege: rawGrant[0],
    role: rawGrant[1],
  };
}

function buildPolicyMeta(entry: RawAuthzEntry): AuthzPolicyMeta | null {
  const policyType = entry.policy_type;
  if (!policyType) return null;

  const vars = entry.vars || {};
  const grants = Array.isArray(entry.grants)
    ? entry.grants.map(buildGrantMeta)
    : [];

  return {
    policyType,
    description: describePolicy(policyType, vars),
    grants,
    permissive: entry.permissive !== false,
    ...(entry.name ? { name: entry.name } : {}),
  };
}

/**
 * Extract @authz smart tag from a PostGraphile codec's extensions
 * and transform into AuthzPolicyMeta[].
 *
 * PostGraphile v5 stores smart tags from COMMENT ON as codec.extensions.tags.
 * The metaschema stores @authz as a JSON array in smart_tags jsonb,
 * which flows through to the codec via the PostGraphile introspection.
 */
export function buildAuthzMeta(codec: PgCodec): AuthzPolicyMeta[] | undefined {
  const tags = (codec as PgCodecWithTags).extensions?.tags;
  if (!tags) return undefined;

  const authzRaw = tags.authz;
  if (!authzRaw) return undefined;

  // authz can be a JSON string or already-parsed array
  let entries: RawAuthzEntry[];
  if (typeof authzRaw === 'string') {
    try {
      entries = JSON.parse(authzRaw);
    } catch {
      return undefined;
    }
  } else if (Array.isArray(authzRaw)) {
    entries = authzRaw as RawAuthzEntry[];
  } else {
    return undefined;
  }

  if (!Array.isArray(entries) || entries.length === 0) return undefined;

  const policies = entries
    .map(buildPolicyMeta)
    .filter((p): p is AuthzPolicyMeta => p !== null);

  return policies.length > 0 ? policies : undefined;
}

/**
 * Extended PgCodec type that includes tags in extensions.
 * PostGraphile v5 stores smart tags from COMMENT ON in extensions.tags.
 */
interface PgCodecWithTags extends PgCodec {
  extensions?: PgCodec['extensions'] & {
    tags?: Record<string, unknown>;
  };
}
