// The rules of one table in one shape: stored policies and a caller's blueprint policies, their normal form (registry
// defaults in, keys the backend derives out), their expression trees, and the comparison the read-back after an
// access change makes.

import { listed, nearestName } from '@agentic-kit/harness';
import { allNodeTypes, type BlueprintPolicy, type NodeTypeDefinition } from 'node-type-registry';

export type TablePrivilege = 'select' | 'insert' | 'update' | 'delete';
export type AccessOperation = 'read' | 'create' | 'update' | 'delete';

/** One policy of a table, as the backend stores it; a read gives it to a caller through `asWritten`. */
export interface TablePolicy {
  /** An Authz node name. */
  type: string;
  privileges: TablePrivilege[];
  /** False for a restrictive policy. */
  permissive: boolean;
  /** Default 'authenticated'; 'public' applies to every role. */
  role?: string;
  /** As stored: it holds keys the backend resolved too. */
  data: Record<string, unknown>;
  /** UPDATE only: the rule a changed row must pass, when it differs from the policy's own. */
  with_check?: { type: string; data?: Record<string, unknown> } | null;
}

declare const RESOLVED: unique symbol;

/**
 * A rule in the form the backend stores it: no `entity_type`, only the `membership_type` it stands for. Only
 * `resolveEntityTypes` makes one, so a caller's rules cannot be compared with stored ones before they are resolved.
 */
export type ResolvedPolicy = TablePolicy & { readonly [RESOLVED]: true };

export const OPERATIONS: AccessOperation[] = ['read', 'create', 'update', 'delete'];
export const PRIVILEGE: Record<AccessOperation, TablePrivilege> = { read: 'select', create: 'insert', update: 'update', delete: 'delete' };
export const PRIVILEGES: TablePrivilege[] = OPERATIONS.map((operation) => PRIVILEGE[operation]);
export const SIGNED_IN = 'authenticated';
/** PostgreSQL's PUBLIC: a grant or a policy for it applies to every role. */
export const PUBLIC = 'public';

export const AUTHZ_NODES = new Map<string, NodeTypeDefinition>(allNodeTypes.filter((node) => node.category === 'authz').map((node) => [node.name, node]));

const COMPOSITE = 'AuthzComposite';
const COMBINATORS = ['AND', 'OR', 'NOT'];
const BOOL_OPS: Record<string, 'and' | 'or' | 'not'> = { AND_EXPR: 'and', OR_EXPR: 'or', NOT_EXPR: 'not' };
const TEAM_KIND = ['membership_type', 'entity_type'];
const SPRT = ['sprt_schema', 'sprt_table'];
// The policy parser removes these from every rule before it stores it.
const STRIPPED_KEYS = new Set(['rls_role_schema', 'rls_role', 'current_user_ast']);

/**
 * Keys the backend writes from other keys when it stores a rule. They carry no meaning of their own, so two rules that
 * differ only in them mean the same. The member list (sprt_*) comes from the team kind, and only when a rule gives one;
 * without it the backend keeps a given member list, which then decides who passes. An app rule's membership_type is
 * derived only when it is the app's own (1): another one names the member list the rule reads.
 */
export const DERIVED_KEYS: Record<string, string[]> = {
  AuthzAppMemberOwner: [...SPRT, 'bitlen', 'membership_type'],
  AuthzAppMembership: [...SPRT, 'bitlen', 'membership_type'],
  AuthzEntityMembership: [...SPRT, 'bitlen', 'mask_table'],
  AuthzMemberOwner: [...SPRT, 'bitlen'],
  AuthzNotReadOnly: SPRT,
  AuthzOrgHierarchy: SPRT,
  AuthzPeerOwnership: [...SPRT, 'bitlen'],
  AuthzRelatedEntityMembership: [...SPRT, 'bitlen'],
  AuthzRelatedMemberOwner: [...SPRT, 'bitlen'],
  AuthzRelatedPeerOwnership: [...SPRT, 'bitlen'],
  AuthzValueExists: ['protected_table_name'],
  AuthzValueMatch: ['protected_table_name']
};

// A table or column a rule names by id: the backend writes its schema and name beside the id when it stores the rule.
const NAMED_BY_ID: Array<[string, string[]]> = [
  ['obj_table_id', ['obj_schema', 'obj_table']],
  ['obj_field_id', ['obj_field']],
  ['ref_table_id', ['ref_schema', 'ref_table']],
  ['owned_table_id', ['owned_schema', 'owned_table']],
  ['shares_table_id', ['shares_schema', 'shares_table']],
  ['files_table_id', ['files_schema', 'files_table']]
];

// The conditions of a value rule: the backend stores them compiled (conditions_ast), so a plan and its stored rule share
// only that the rule has some.
const CONDITIONS = ['conditions', 'conditions_ast'];
const COMPILED_CONDITIONS = { compiled: true };
const VALUE_RULES = new Set(['AuthzValueExists', 'AuthzValueMatch']);

const NEEDS_TEAM_KIND = new Set(['AuthzEntityMembership', 'AuthzMemberOwner', 'AuthzNotReadOnly', 'AuthzPeerOwnership', 'AuthzRelatedEntityMembership', 'AuthzRelatedMemberOwner', 'AuthzRelatedPeerOwnership']);
const APP_RULES = new Set(['AuthzAppMembership', 'AuthzAppMemberOwner']);
export const APP_MEMBERSHIP_TYPE = 1;

/**
 * The keys of this rule's data the backend derived; a member list counts as derived only beside a team kind, an app
 * rule's membership_type only when it is the app's, and a table's schema and name only beside the table's id.
 */
export function derivedKeys(type: string, data: Record<string, unknown>): Set<string> {
  const teamKind = TEAM_KIND.some((key) => data?.[key] !== undefined && data?.[key] !== null);
  const appKind = data?.membership_type === undefined || data?.membership_type === APP_MEMBERSHIP_TYPE;
  const listed = (DERIVED_KEYS[type] ?? []).filter((key) => {
    if (key === 'membership_type' && APP_RULES.has(type)) return appKind;
    return !SPRT.includes(key) || !NEEDS_TEAM_KIND.has(type) || teamKind;
  });
  const named = NAMED_BY_ID.flatMap(([id, keys]) => (data?.[id] !== undefined && data?.[id] !== null ? keys : []));
  return new Set([...listed, ...named]);
}

// A value rule's data, or its nested `exists`, with its conditions in the one form a plan and its stored rule share.
function sharedConditions(data: Record<string, unknown>): Record<string, unknown> {
  const kept = Object.fromEntries(Object.entries(data).filter(([key]) => !CONDITIONS.includes(key)));
  return CONDITIONS.some((key) => data[key] !== undefined && data[key] !== null) ? { ...kept, conditions: COMPILED_CONDITIONS } : kept;
}

// A value rule's nested `exists` without the keys the backend derives in it.
const normalExists = (value: Record<string, unknown>): Record<string, unknown> => {
  const derived = NAMED_BY_ID.flatMap(([id, keys]) => (value[id] !== undefined && value[id] !== null ? keys : []));
  return sharedConditions(Object.fromEntries(Object.entries(value).filter(([key]) => !derived.includes(key))));
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
}

export function unique<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(keyOf(item)) && seen.add(keyOf(item)));
}

/** Each parameter's registry default. */
export function defaultsOf(type: string): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [param, schema] of Object.entries(AUTHZ_NODES.get(type)?.parameter_schema.properties ?? {})) {
    if (schema.default !== undefined) values[param] = schema.default;
  }
  return values;
}

/** A blueprint policy as a table policy, with the defaults the provisioner applies. */
export function tablePolicyFromBlueprint(policy: BlueprintPolicy): TablePolicy {
  return {
    type: policy.$type,
    privileges: (policy.privileges ?? PRIVILEGES) as TablePrivilege[],
    permissive: policy.permissive ?? true,
    role: policy.policy_role ?? SIGNED_IN,
    data: policy.data ?? {},
    ...(policy.with_check ? { with_check: { type: policy.with_check.$type, data: policy.with_check.data ?? {} } } : {})
  };
}

/** The policy a rule stands for: a composite whose data is exactly one Authz node is that node. */
export function effectivePolicy(type: string, data: Record<string, unknown>): { type: string; data: Record<string, unknown> } {
  const keys = Object.keys(data ?? {});
  if (type !== COMPOSITE || keys.length !== 1 || !AUTHZ_NODES.has(keys[0]) || !isObject(data[keys[0]])) return { type, data };
  return effectivePolicy(keys[0], data[keys[0]] as Record<string, unknown>);
}

// ─── Normal form ─────────────────────────────────────────────────

/** The two team kinds every database has. */
export const BUILT_IN_SCOPES: readonly MembershipScope[] = [
  { scope: 'app', membership_type: 1 },
  { scope: 'org', membership_type: 2 }
];

/** A team kind of the database: the scope an `entity_type` names (an entity type's prefix), and its membership type. */
export interface MembershipScope {
  scope: string;
  membership_type: number;
}

function normalNested(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalNested);
  if (!isObject(value)) return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && AUTHZ_NODES.has(keys[0]) && isObject(value[keys[0]])) {
    return { [keys[0]]: normalData(keys[0], value[keys[0]] as Record<string, unknown>) };
  }
  return Object.fromEntries(keys.map((key) => [key, normalNested(value[key])]));
}

// The backend removes entity_type once it has resolved it into membership_type.
const withoutEntityType = (data: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'entity_type'));

// An entity_type every database has (app, org) is the membership_type the backend stores for it; another one needs the
// database's team kinds (resolveEntityTypes).
function builtInScope(data: Record<string, unknown>): Record<string, unknown> {
  const scope = BUILT_IN_SCOPES.find((entry) => entry.scope === data.entity_type);
  if (!scope) return data;
  return { ...withoutEntityType(data), membership_type: scope.membership_type };
}

/**
 * Registry defaults filled in, and the keys the backend derives or strips left out: a plan and the stored policy it
 * becomes have the same normal form.
 */
export function normalData(type: string, given: Record<string, unknown>): Record<string, unknown> {
  const data = builtInScope(given ?? {});
  const derived = derivedKeys(type, data);
  const schema = AUTHZ_NODES.get(type)?.parameter_schema.properties ?? {};
  const normal: Record<string, unknown> = defaultsOf(type);
  for (const [key, value] of Object.entries(data)) {
    // The builders test a flag with IS TRUE, so false with no default is the same as leaving it out.
    const off = value === false && schema[key]?.default === undefined;
    if (STRIPPED_KEYS.has(key) || derived.has(key) || off) continue;
    normal[key] = key === 'exists' && VALUE_RULES.has(type) && isObject(value) ? normalExists(value) : normalNested(value);
  }
  return VALUE_RULES.has(type) ? sharedConditions(normal) : normal;
}

// ─── Policies as trees ───────────────────────────────────────────

export interface Leaf {
  kind: 'leaf';
  type: string;
  /** Normal form. */
  data: Record<string, unknown>;
}

/** A policy's expression: one node, or a composite's and/or/not tree. `raw` is a part no Authz node describes. */
export type Expr = Leaf | { kind: 'and' | 'or'; args: Expr[] } | { kind: 'not'; arg: Expr } | { kind: 'raw' };

const RAW: Expr = { kind: 'raw' };

export function exprOf(type: string, data: Record<string, unknown>): Expr {
  if (type === COMPOSITE) return treeOf(data);
  return { kind: 'leaf', type, data: normalData(type, data ?? {}) };
}

// The composite's tree: one key per level. A stored rule may hold a stored boolean expression, read by its operator.
export function treeOf(value: unknown): Expr {
  if (!isObject(value)) return RAW;
  const keys = Object.keys(value);
  if (keys.length !== 1) return RAW;
  const [key] = keys;
  const inner = value[key];
  if (key === 'AND' || key === 'OR') {
    return Array.isArray(inner) && inner.length > 0 ? { kind: key === 'AND' ? 'and' : 'or', args: inner.map(treeOf) } : RAW;
  }
  if (key === 'NOT') return isObject(inner) ? { kind: 'not', arg: treeOf(inner) } : RAW;
  if (key === 'BoolExpr' && isObject(inner) && Array.isArray(inner.args)) {
    const op = BOOL_OPS[String(inner.boolop)];
    if (op === 'not') return inner.args.length === 1 ? { kind: 'not', arg: treeOf(inner.args[0]) } : RAW;
    return op && inner.args.length > 0 ? { kind: op, args: inner.args.map(treeOf) } : RAW;
  }
  if (AUTHZ_NODES.has(key) && isObject(inner)) {
    const effective = effectivePolicy(key, inner);
    return exprOf(effective.type, effective.data);
  }
  return RAW;
}

/** An object that is an Authz expression: one Authz node, or one of the combinators. */
export const isExpression = (value: unknown): boolean =>
  isObject(value) && Object.keys(value).length === 1 && (AUTHZ_NODES.has(Object.keys(value)[0]) || COMBINATORS.includes(Object.keys(value)[0]));

// ─── One policy, keyed by meaning ────────────────────────────────

export interface Part {
  policy: TablePolicy;
  role: string;
  /** Equal for two policies with the same meaning. */
  key: string;
  expr: Expr;
  /** The rule a changed row must pass, when the policy has its own (UPDATE). */
  check_expr?: Expr;
}

export function part(policy: TablePolicy): Part {
  const effective = effectivePolicy(policy.type, policy.data ?? {});
  const data = normalData(effective.type, effective.data);
  const role = policy.role ?? SIGNED_IN;
  const meaning = JSON.stringify([effective.type, sorted(data)]);
  const own = policy.with_check ? effectivePolicy(policy.with_check.type, policy.with_check.data ?? {}) : undefined;
  // The backend drops a check that is the same as the policy.
  const check = own && JSON.stringify([own.type, sorted(normalData(own.type, own.data))]) !== meaning ? own : undefined;
  return {
    policy,
    role,
    key: JSON.stringify([effective.type, policy.permissive !== false, role, sorted(data), check ? [check.type, sorted(normalData(check.type, check.data))] : null]),
    expr: exprOf(effective.type, effective.data),
    ...(check ? { check_expr: exprOf(check.type, check.data) } : {})
  };
}

export const covers = (policy: TablePolicy, privilege: TablePrivilege): boolean => policy.privileges.map((entry) => entry.toLowerCase()).includes(privilege);

export function partsFor(policies: TablePolicy[], privilege: TablePrivilege): Part[] {
  return unique(policies.filter((policy) => covers(policy, privilege)).map(part), (entry) => entry.key);
}

export const appliesTo = (item: Part, role: string): boolean => item.role === role || item.role === PUBLIC;
export const lets = (item: Part): boolean => item.policy.permissive !== false;

/**
 * What differs between two rule sets of one table, by meaning: order, duplicates, registry defaults and the keys the
 * backend derives do not count, and a `with_check` equal to its policy is no check. Each policy returned is the given
 * one, with only the privileges that differ. The role counts as it is (`public` also lets the signed-out in), and a
 * stored raw part counts by its exact data (key order aside). The planned rules are a caller's, resolved by
 * `resolveEntityTypes`; the stored ones are the backend's, which never hold an `entity_type`.
 */
export function policyDifference(planned: ResolvedPolicy[], stored: TablePolicy[]): { missing: TablePolicy[]; unplanned: TablePolicy[] } {
  const atomsOf = (policies: TablePolicy[]) => {
    const found = new Map<string, { key: string; policy: TablePolicy; privilege: string }>();
    for (const policy of policies) {
      const { key } = part(policy);
      for (const privilege of policy.privileges.map((entry) => entry.toLowerCase())) {
        if (!found.has(`${key}:${privilege}`)) found.set(`${key}:${privilege}`, { key, policy, privilege });
      }
    }
    return found;
  };
  const side = (from: ReturnType<typeof atomsOf>, other: ReturnType<typeof atomsOf>): TablePolicy[] => {
    const groups = new Map<string, { policy: TablePolicy; privileges: Set<string> }>();
    for (const [atom, { key, policy, privilege }] of from) {
      if (other.has(atom)) continue;
      const group = groups.get(key) ?? { policy, privileges: new Set<string>() };
      group.privileges.add(privilege);
      groups.set(key, group);
    }
    return [...groups.values()].map(({ policy, privileges }) => ({
      ...policy,
      privileges: [...PRIVILEGES.filter((entry) => privileges.has(entry)), ...[...privileges].filter((entry) => !(PRIVILEGES as string[]).includes(entry))] as TablePrivilege[]
    }));
  };
  const plannedAtoms = atomsOf(planned);
  const storedAtoms = atomsOf(stored);
  return { missing: side(plannedAtoms, storedAtoms), unplanned: side(storedAtoms, plannedAtoms) };
}

// ─── Entity types ────────────────────────────────────────────────

/** A problem with one rule a caller wrote: where, what kind, and what to do. */
export interface RuleProblem {
  /** A key, or a path into a composite such as `OR.0.AuthzEntityMembership.membership_type`; '' for the whole data. */
  path: string;
  code: string;
  /** What is wrong, why, and what to do. */
  message: string;
  /** For a misspelling: the name it probably meant. */
  meant?: string;
}

export const quoted = (keys: string[]): string[] => keys.map((key) => `"${key}"`);
export const join = (path: string, key: string | number): string => (path ? `${path}.${key}` : String(key));

type Say = (problem: RuleProblem) => void;

// A node's data with its entity_type turned into the membership_type the backend stores (it sets membership_type from
// the scope and removes entity_type), nested expressions included.
function resolveNode(type: string, data: Record<string, unknown>, path: string, scopes: readonly MembershipScope[], say: Say): Record<string, unknown> {
  if (!AUTHZ_NODES.has(type)) return data;
  if (type === COMPOSITE) return resolveTree(data, path, scopes, say) as Record<string, unknown>;
  const out = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, isObject(value) ? resolveTree(value, join(path, key), scopes, say) : value]));
  if (out.entity_type === undefined || out.entity_type === null) return out;
  const name = String(out.entity_type);
  const found = scopes.find((scope) => scope.scope === name);
  if (!found) {
    const meant = nearestName(name, scopes.map((scope) => scope.scope));
    say({
      path: join(path, 'entity_type'),
      code: 'unknown-entity-type',
      message:
        `${type}'s "entity_type" is "${name}", which is not a team kind of this database${meant ? `; did you mean "${meant}"?` : '.'} ` +
        `The database has ${listed(quoted(scopes.map((scope) => scope.scope)))}.`,
      ...(meant ? { meant } : {})
    });
    return out;
  }
  return { ...withoutEntityType(out), membership_type: found.membership_type };
}

function resolveTree(value: unknown, path: string, scopes: readonly MembershipScope[], say: Say): unknown {
  if (Array.isArray(value)) return value.map((item, i) => resolveTree(item, join(path, i), scopes, say));
  if (!isObject(value)) return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && AUTHZ_NODES.has(keys[0]) && isObject(value[keys[0]])) {
    return { [keys[0]]: resolveNode(keys[0], value[keys[0]] as Record<string, unknown>, join(path, keys[0]), scopes, say) };
  }
  return Object.fromEntries(keys.map((key) => [key, resolveTree(value[key], join(path, key), scopes, say)]));
}

/**
 * A caller's rules in the form the backend stores them: every `entity_type`, in every node at any depth (and in a
 * `with_check`), becomes its `membership_type`, from the database's team kinds (`scopes`: an entity type's prefix and
 * its `out_membership_type`; `app` and `org` are always there). An `entity_type` the database does not have is a
 * problem, with the index of its rule.
 */
export function resolveEntityTypes(
  policies: TablePolicy[],
  scopes: MembershipScope[]
): { policies: ResolvedPolicy[]; problems: Array<RuleProblem & { policy: number }> } {
  const all = [...BUILT_IN_SCOPES, ...scopes.filter((scope) => !BUILT_IN_SCOPES.some((built) => built.scope === scope.scope))];
  const problems: Array<RuleProblem & { policy: number }> = [];
  const resolved = policies.map((policy, index) => {
    const say: Say = (problem) => problems.push({ ...problem, policy: index });
    const data = resolveNode(policy.type, policy.data ?? {}, '', all, say);
    const check = policy.with_check ? { ...policy.with_check, data: resolveNode(policy.with_check.type, policy.with_check.data ?? {}, 'with_check', all, say) } : policy.with_check;
    return { ...policy, data, ...(policy.with_check === undefined ? {} : { with_check: check }) } as ResolvedPolicy;
  });
  return { policies: resolved, problems };
}
