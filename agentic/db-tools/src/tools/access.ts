// The access tools: what a policy type takes, the rules of a live table in plain words with the structural findings,
// and a replace of a table's rules. Each sentence comes from the words of a rule's Authz node; no part of a result
// says who can or cannot reach a row.

import { type HarnessTool, identifierParam, type PlanRule, strictObject, type ToolCallSuggestion, type ToolFailure } from '@agentic-kit/harness';
import { type BlueprintNode, type BlueprintPolicy, policyNodeTypes } from 'node-type-registry';
import { z } from 'zod';

import {
  type AccessFinding,
  accessFindings,
  checkRule,
  columnGaps,
  dataNodesForPolicies,
  type MembershipScope,
  POLICY_ROLES,
  policyDifference,
  type ResolvedPolicy,
  resolveEntityTypes,
  type RuleProblem,
  TABLE_NEEDS,
  type TableAccessInput,
  type TablePolicy,
  tablePolicyFromBlueprint,
} from '../access';
import { AUTHZ_NODES as AUTHZ } from '../access/policies';
import type { RuleContext } from '../access/rule-check';
import { columnsOf, type RelatedColumns } from '../access/words';
import { type AccessPolicy, AccessPolicyZod, AuthzTypeZod, ruleShapeProblems } from '../blueprint/blueprint-schema';
import type { ProjectContext } from '../context';
import { failedResult, failureFromError, type FailureMeaning, failureText, noRowCreated, type Result, suggest } from '../failure';
import { statusAdapter } from '../graphql-http';
import { appSessionReady, projectReady } from '../ready';
import { findMetaTable, META_QUERY, type MetaResponse, type RawMetaTable } from '../records/meta';
import { storedName } from '../schema-resolve';
import {
  accessInputOf,
  asWritten,
  canonical,
  changeMeaning,
  type ColumnChange,
  columnChange,
  columnPlan,
  grantWords,
  planRule,
  planTableAccess,
  readTable,
  readTables,
  rowsConflict,
  type Rule,
  ruleWords,
  tableField,
  type TableRecord,
  type WrittenRule,
} from '../table-access';
import { LIST_ENTITY_TYPES, readEntityTypes } from './entity-types';

function fail<T extends object>(failure: ToolFailure, extra: T) {
  return failedResult(failure, { success: false, message: failureText(failure), ...extra });
}

/** The call that describes one policy type, or every one. */
const describeType = (type?: string): ToolCallSuggestion =>
  type ? suggest('describe_policy_type', { type }, `See the parameters of ${type}`) : suggest('describe_policy_type', {}, 'See the policy types a rule can use');

/** The read of the rules a table has. */
const explainTable = (table: string, why = 'See the rules the table has'): ToolCallSuggestion => suggest('explain_access', { table_name: table }, why);

// ── describe_policy_type ─────────────────────────────────────────────────

const DescribePolicyTypeZod = strictObject('the input', {
  type: AuthzTypeZod.optional().describe('One Authz node to describe in full; every node in short when left out'),
});

type PolicyTypeSummary = { name: string; summary?: string; tableKind?: string };
type PolicyTypeDetail = PolicyTypeSummary & {
  parameterSchema: unknown;
  useWhen: string[];
  avoidWhen: string[];
  risks: string[];
  dataNode?: unknown;
};

export const describePolicyTypeTool: HarnessTool<typeof DescribePolicyTypeZod, { types?: PolicyTypeSummary[]; type?: PolicyTypeDetail }> = {
  name: 'describe_policy_type',
  label: 'Describe policy type',
  description:
    'Describe the Authz policy types a rule can use: with no type, each one with who it lets in and what it needs on the table; with a type, its parameters (JSON Schema), when to use it and when not, its risks, and the columns it needs. Read-only.',
  promptSnippet: 'describe_policy_type: the parameters and plain words of a policy type, before writing rules. Read-only.',
  parameters: DescribePolicyTypeZod,
  effect: 'read',
  async execute(params) {
    if (!params.type) {
      const types = policyNodeTypes.map((node) => ({ name: node.name, summary: node.summary, tableKind: TABLE_NEEDS[node.name]?.kind }));
      const text = types.map((type) => `${type.name} (${type.tableKind}): ${type.summary ?? ''}`).join('\n');
      return { content: [{ type: 'text', text }], details: { types } };
    }
    const node = policyNodeTypes.find((entry) => entry.name === params.type);
    const needs = TABLE_NEEDS[node.name];
    const type: PolicyTypeDetail = {
      name: node.name,
      summary: node.summary,
      tableKind: needs?.kind,
      parameterSchema: node.parameter_schema,
      useWhen: node.use_when ?? [],
      avoidWhen: node.avoid_when ?? [],
      risks: node.risks ?? [],
      ...(needs?.data_node ? { dataNode: needs.data_node } : {}),
    };
    const text = [
      `${node.name} (${type.tableKind}): ${node.summary ?? ''}`,
      `parameters: ${JSON.stringify(node.parameter_schema.properties ?? {})}`,
      ...type.useWhen.map((line) => `use when: ${line}`),
      ...type.avoidWhen.map((line) => `avoid when: ${line}`),
      ...type.risks.map((line) => `risk: ${line}`),
      ...(needs?.data_node ? [`needs on the table: ${needs.data_node.type} ${JSON.stringify(needs.data_node.columns)}`] : []),
    ].join('\n');
    return { content: [{ type: 'text', text }], details: { type } };
  },
};

// ── explain_access ───────────────────────────────────────────────────────

const ExplainAccessZod = strictObject('the input', {
  table_name: identifierParam().optional().describe('The table to explain; every application table when left out'),
});

/** One stored rule: in the shape a caller writes it, with its words. */
export type ExplainedRule = WrittenRule & Pick<PlanRule, 'words'>;

/** The access of one live table: each rule in words, the grants, row security, and what may be wrong. */
export type ExplainedTable = { name: string; rules: ExplainedRule[]; grants: string[]; rowSecurity: boolean; findings: AccessFinding[] };

function explained(table: TableRecord, related?: RelatedColumns): ExplainedTable {
  const input = { ...accessInputOf(table), ...(related ? { related } : {}) };
  return {
    name: table.name,
    rules: input.policies.map((policy) => ({ ...asWritten(policy), words: planRule(policy, input.related).words })),
    grants: grantWords(input.grants),
    rowSecurity: input.rls_enabled !== false,
    findings: accessFindings(input),
  };
}

const ruleLine = (rule: ExplainedRule): string =>
  `  ${rule.permissive ? 'rule' : 'limit'} (${[rule.privileges.join(', '), ...(rule.policy_role === 'authenticated' ? [] : [`role ${rule.policy_role}`])].join('; ')}): ${rule.words}`;

function accessText(table: ExplainedTable): string[] {
  return [
    table.name,
    ...(table.rules.length ? table.rules.map(ruleLine) : ['  rules: none']),
    `  grants: ${table.grants.join('; ') || 'none'}`,
    ...(table.rowSecurity ? [] : ['  row security: off, so the rules do not apply']),
    ...table.findings.map((finding) => `  finding (${finding.level}): ${finding.summary} ${finding.fix}`),
  ];
}

export const explainAccessTool: HarnessTool<typeof ExplainAccessZod, { tables: ExplainedTable[] }> = {
  name: 'explain_access',
  label: 'Explain access',
  description:
    'Show the access rules of a table (or of every table): each rule in the shape a rule is written, without the parts the backend sets, with one plain sentence for it; the grants, row security, and the structures that may let in more people than meant or lock out people who should pass. Read-only.',
  promptSnippet: 'explain_access: the rules of a table in plain words, and what may be wrong with them. Read-only.',
  parameters: ExplainAccessZod,
  effect: 'read',
  async execute(params, ctx) {
    const ready = await projectReady(ctx.cwd);
    if (ready.kind === 'failed') return failedResult(ready.failure, { tables: [] });
    const read = params.table_name ? await readTable(ready.value, params.table_name) : await readTables(ready.value);
    if (read.kind === 'failed') return failedResult(read.failure, { tables: [] });
    const records = Array.isArray(read.value) ? read.value : [read.value];
    const related = await relatedColumns(ready.value, records.flatMap((table) => table.policyRules), Array.isArray(read.value) ? read.value : undefined);
    if (related.kind === 'failed') return failedResult(related.failure, { tables: [] });
    const tables = records.map((table) => explained(table, related.value));
    const text = tables.length ? tables.flatMap(accessText).join('\n') : 'No application tables yet.';
    return { content: [{ type: 'text', text }], details: { tables } };
  },
};

// ── set_access ───────────────────────────────────────────────────────────

const SetAccessZod = strictObject('the input', {
  table_name: identifierParam().describe('The table whose access rules are replaced'),
  policies: z.array(AccessPolicyZod).describe('The rules that become the whole set; the grants of the table stay'),
});

type SetAccessParams = z.infer<typeof SetAccessZod>;

/** What one change of a table's access installs; `owns` names what it replaces instead of adding to. */
export type Provision = { nodes: BlueprintNode[]; policies: BlueprintPolicy[]; grants?: unknown; owns?: Array<'policies' | 'grants'> };

/** True when the person signed in to the app sees a row of the table, so it certainly has rows; false when this tool cannot tell. */
async function rowsSeen(context: ProjectContext, table: string): Promise<boolean> {
  if (!context.dataEndpoint) return false;
  const session = await appSessionReady(context);
  if (session.kind === 'failed') return false;
  try {
    const adapter = statusAdapter(context.dataEndpoint, { Authorization: `Bearer ${session.value.token}` });
    const meta = await adapter.execute<MetaResponse>(META_QUERY);
    const all = meta.ok ? findMetaTable((meta.data._meta?.tables ?? []).filter(Boolean) as RawMetaTable[], table)?.query?.all : undefined;
    if (!all) return false;
    const rows = await adapter.execute<Record<string, { nodes?: unknown[] } | undefined>>(`query DbToolsRowsSeen { ${all}(first: 1) { nodes { __typename } } }`);
    return rows.ok && (rows.data[all]?.nodes?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * A column the rules' Data nodes would add that the table has with another type: a generator keeps it as it is,
 * so the rule cannot work on it.
 */
function typeGaps(table: TableRecord, rules: readonly Rule[]): ToolFailure | null {
  const gaps = columnGaps(table.fields.map(tableField), rules.map((rule) => ({ type: rule.type, data: rule.data ?? {} }))).filter((gap) => gap.gaps.includes('type'));
  if (gaps.length === 0) return null;
  return {
    code: 'conflict',
    message: gaps
      .map(
        ({ column, expected, actual }) =>
          `Table "${table.name}" has the column ${column} as ${actual.type ?? 'another type'}, and the rules need it as ${expected.type}; the backend keeps a column that exists, so the change cannot work on it.`,
      )
      .join(' '),
    hint: gaps
      .map(({ column, expected }) => `Change ${column} to ${expected.type} (each value is converted, and one that does not fit fails), or drop it so the change adds it.`)
      .join(' '),
    calls: gaps.flatMap(({ column, expected }) => [
      suggest('retype_field', { table_name: table.name, field_name: column, type: expected.type }, `Change ${column} to ${expected.type}, the type the rules need`),
      suggest('delete_field', { table_name: table.name, field_name: column }, `Drop ${column} and its values, so the change adds it as the rules need it`),
    ]),
  };
}

/**
 * What a change does to the columns of an existing table, refused before
 * anything changes when the backend cannot apply it: a rule reads a column
 * nothing gives the table, or a required column would be added to a table
 * whose rows this tool can see.
 */
export async function existingTableChange(context: ProjectContext, table: TableRecord, nodes: BlueprintNode[], rules: readonly Rule[]): Promise<Result<ColumnChange>> {
  const change = columnChange(table.name, table.fields, nodes, rules);
  if (change.kind === 'failed') return change;
  const misfit = typeGaps(table, rules);
  if (misfit) return { kind: 'failed', failure: misfit };
  if (change.value.failsIfRows.length === 0 || !(await rowsSeen(context, table.name))) return change;
  const conflict = rowsConflict(table.name, change.value.failsIfRows);
  const message = `${conflict.message.charAt(0).toUpperCase()}${conflict.message.slice(1)} The backend would refuse the change, so nothing was sent.`;
  return { kind: 'failed', failure: { code: 'conflict', ...conflict, message } };
}

/** Installs `provision` on the table in one request: the backend applies it in one transaction. */
export async function applyProvision(
  context: ProjectContext,
  table: { id: string; name: string },
  provision: Provision,
  action: string,
  meaning: FailureMeaning,
): Promise<ToolFailure | null> {
  try {
    const result = await context.modules.secureTableProvision
      .create({
        data: {
          databaseId: context.databaseId,
          schemaId: context.schemaId,
          tableId: table.id,
          nodes: provision.nodes,
          policies: provision.policies,
          ...(provision.grants ? { grants: provision.grants } : {}),
          ...(provision.owns ? { owns: provision.owns } : {}),
        } as unknown as Parameters<typeof context.modules.secureTableProvision.create>[0]['data'],
        select: { id: true },
      })
      .unwrap();
    return result.createSecureTableProvision?.secureTableProvision ? null : noRowCreated(action, explainTable(table.name, 'See the rules the table has now'));
  } catch (err) {
    return failureFromError(err, action, meaning);
  }
}

// A grant as one fact: the role, the privilege and the columns ('*' for every column).
const grantKeys = (grants: TableAccessInput['grants']): Set<string> =>
  new Set(
    (grants ?? []).flatMap((grant) =>
      grant.roles.flatMap((role) =>
        (grant.privileges as unknown[][]).map(([privilege, columns]) => `${role} ${String(privilege).toLowerCase()} ${Array.isArray(columns) ? [...columns].sort().join(',') : '*'}`),
      ),
    ),
  );

const grantKeyWords = (key: string): string => {
  const [role, privilege, columns] = key.split(' ');
  return `${privilege} to ${role}${columns === '*' ? '' : ` on ${columns}`}`;
};

const policyWords = (policy: TablePolicy): string => `${policy.type} for ${policy.privileges.join(', ')} ("${ruleWords(policy.type, policy.data)}")`;

// A rule with a part no Authz node describes: policyDifference compares it by its exact data, so two such rules that
// mean the same can still differ.
const unreadable = (policy: TablePolicy): boolean =>
  !AUTHZ.has(policy.type) || checkRule(policy.type, policy.data).some((problem) => problem.code === 'not-a-node' || problem.code === 'mistyped-node');

/** What the table holds after a change that is not what its plan said, by meaning. */
export type AccessDifference = {
  unplanned: TablePolicy[];
  missing: TablePolicy[];
  grants?: { unplanned: string[]; missing: string[] };
  rowSecurityOff?: true;
  columnsMissing?: string[];
};

/** The table after a change: as its plan said, different, or not readable. */
export type ReadBack = { kind: 'same'; table: TableRecord } | { kind: 'different' | 'unverified'; failure: ToolFailure };

// A read that can pass a moment later: the backend failing, gone for a moment, or limiting requests.
const PASSING = new Set(['backend-unreachable', 'rate-limited']);
const READ_AGAIN_MS = 1000;

/**
 * Reads the access of a table again after a change returned, and compares it
 * by meaning with the after state of the plan: `policyDifference` decides for
 * the rules (order, duplicates, defaults, derived keys and the backend's own
 * copy of the read-only block do not count), then the grants, row security
 * and the columns the change added. A change made at the same moment by
 * another call is what this finds: the backend's replace does not wait for
 * one. `again` is the call that makes the table as the plan said, when there
 * is one.
 */
export async function readBack(context: ProjectContext, table: string, planned: PlannedAccess, added: string[], again?: ToolCallSuggestion): Promise<ReadBack> {
  const explain = explainTable(table, 'See the rules the table has now');
  let live = await readTable(context, table);
  if (live.kind === 'failed' && PASSING.has(live.failure.code)) {
    await new Promise((resolve) => setTimeout(resolve, READ_AGAIN_MS));
    live = await readTable(context, table);
  }
  if (live.kind === 'failed') {
    // The change's state is the news; a session that ended is the step before the read.
    const signIn = live.failure.code === 'signed-out' ? 'Sign in again, then read' : 'Read';
    return {
      kind: 'unverified',
      failure: {
        code: 'unverified',
        message: `The change to the access of table "${table}" was sent, and the backend answered that it applied it, but reading the access back failed (${live.failure.message}), so this tool cannot say whether the table is as the plan said.`,
        hint: `${signIn} the rules the table has now before you change it again.`,
        calls: [explain],
      },
    };
  }
  const now = accessInputOf(live.value);
  const { missing, unplanned } = policyDifference(planned.policies, now.policies);
  const [want, have] = [grantKeys(planned.grants), grantKeys(now.grants)];
  const grants = { unplanned: [...have].filter((key) => !want.has(key)), missing: [...want].filter((key) => !have.has(key)) };
  const columnsMissing = added.filter((name) => !live.value.fields.some((field) => field.name === name));
  const rowSecurityOff = planned.rls_enabled === true && now.rls_enabled !== true;
  const difference: AccessDifference = {
    unplanned,
    missing,
    ...(grants.unplanned.length || grants.missing.length ? { grants } : {}),
    ...(rowSecurityOff ? { rowSecurityOff: true as const } : {}),
    ...(columnsMissing.length ? { columnsMissing } : {}),
  };
  const parts = [
    ...(unplanned.length ? [`it has rules the plan did not have: ${unplanned.map(policyWords).join('; ')}`] : []),
    ...(missing.length ? [`rules of the plan are missing: ${missing.map(policyWords).join('; ')}`] : []),
    ...(grants.unplanned.length ? [`it grants what the plan did not: ${grants.unplanned.map(grantKeyWords).join(', ')}`] : []),
    ...(grants.missing.length ? [`grants of the plan are missing: ${grants.missing.map(grantKeyWords).join(', ')}`] : []),
    ...(rowSecurityOff ? ['row security is off'] : []),
    ...(columnsMissing.length ? [`the column${columnsMissing.length === 1 ? '' : 's'} ${columnsMissing.join(', ')} the change adds ${columnsMissing.length === 1 ? 'is' : 'are'} missing`] : []),
  ];
  if (parts.length === 0) return { kind: 'same', table: live.value };
  const exact = [...new Set([...unplanned, ...missing].filter(unreadable).map((policy) => policy.type))];
  if (exact.length) parts.push(`the comparison of ${exact.join(', ')} is exact, not by meaning, because a part of it is one no Authz node describes`);
  return {
    kind: 'different',
    failure: {
      code: 'conflict',
      message: `The access of table "${table}" is not what the approved plan said: ${parts.join('; ')}. Another change may have run at the same moment.`,
      hint: `Read the rules the table has now${again ? '; sending the same change again replaces the whole set with the one you approved' : ''}.`,
      calls: again ? [explain, again] : [explain],
      context: { difference },
    },
  };
}

/** A table's access after a change, as its plan says: its rules in the form the backend stores them. */
export type PlannedAccess = Omit<TableAccessInput, 'policies'> & { policies: ResolvedPolicy[] };

export type SetAccessReady = {
  context: ProjectContext;
  table: TableRecord;
  provision: Provision;
  after: PlannedAccess;
  notes: string[];
  /** The columns the change adds. */
  columns: ColumnChange;
  /** What a refusal of the change means. */
  meaning: FailureMeaning;
};

// A team-membership rule: AuthzEntityMembership with a team kind given as a number of 2 or more, and an entity_field.
const teamRule = (policies: readonly BlueprintPolicy[]): BlueprintPolicy | undefined =>
  policies.find((policy) => {
    const data = (policy.data ?? {}) as { membership_type?: unknown; entity_field?: unknown };
    return policy.$type === 'AuthzEntityMembership' && Number(data.membership_type) >= 2 && data.entity_field !== undefined;
  });

const writesOf = (grants: TableAccessInput['grants'] | undefined): Array<'insert' | 'update' | 'delete'> =>
  [...new Set((grants ?? []).flatMap((grant) => (grant.privileges as unknown[][]).map(([privilege]) => String(privilege).toLowerCase())))].filter(
    (privilege): privilege is 'insert' | 'update' | 'delete' => privilege === 'insert' || privilege === 'update' || privilege === 'delete',
  );

/**
 * The rule the backend adds by itself beside the first team-membership rule of a change that grants writes: a
 * restrictive `AuthzNotReadOnly` for those writes. A plan's after state holds it, so the plan and the read-back after
 * the change both count it.
 */
export function addedByBackend(policies: readonly BlueprintPolicy[], grants: TableAccessInput['grants'] | undefined): TablePolicy[] {
  const team = teamRule(policies);
  const writes = writesOf(grants);
  if (!team || writes.length === 0) return [];
  const { entity_field, membership_type } = team.data as { entity_field: unknown; membership_type: unknown };
  return [{ type: 'AuthzNotReadOnly', privileges: writes, permissive: false, role: team.policy_role ?? 'authenticated', data: { entity_field, membership_type } }];
}

/** What a plan says about the read-only limit beside a team rule: the backend adds it only for a change that grants writes. */
export function readOnlyNotes(policies: readonly BlueprintPolicy[], grants: TableAccessInput['grants'] | undefined): string[] {
  if (!teamRule(policies)) return [];
  if (writesOf(grants).length) return ['The backend adds its own read-only limit beside the team rule, for the writes this change grants.'];
  if (policies.some((policy) => policy.$type === 'AuthzNotReadOnly')) return [];
  return [
    "No read-only limit is added: the backend adds one only for a change that grants writes, and this one keeps the table's grants. Read-only members of the team pass these rules unless a rule here limits them.",
  ];
}

const PRIVILEGE_ORDER = ['select', 'insert', 'update', 'delete'];

// The team kinds an entity_type names: the database's entity types, read only when a rule names one.
async function scopesFor(context: ProjectContext, policies: readonly BlueprintPolicy[]): Promise<Result<MembershipScope[]>> {
  if (!policies.some((policy) => JSON.stringify([policy.data ?? {}, policy.with_check ?? {}]).includes('"entity_type"'))) return { kind: 'ok', value: [] };
  const read = await readEntityTypes(context);
  if (read.kind === 'failed') return read;
  return {
    kind: 'ok',
    value: read.value.flatMap((row) => (row.prefix && typeof row.outMembershipType === 'number' ? [{ scope: row.prefix, membership_type: row.outMembershipType }] : [])),
  };
}

/** The roles a rule can name: the request roles every API has, and the roles the database's APIs run as, read only when a rule names another. */
export async function rolesFor(context: ProjectContext, policies: ReadonlyArray<{ policy_role?: string }>): Promise<Result<string[] | undefined>> {
  const known: readonly string[] = POLICY_ROLES;
  if (policies.every((policy) => policy.policy_role === undefined || known.includes(policy.policy_role))) return { kind: 'ok', value: undefined };
  try {
    const result = await context.api.api
      .findMany({ where: { databaseId: { equalTo: context.databaseId } }, select: { roleName: true, anonRole: true } })
      .unwrap();
    const own = result.apis.nodes.flatMap((api) => [api.roleName, api.anonRole]).filter((role): role is string => Boolean(role));
    return { kind: 'ok', value: [...new Set([...known, ...own])] };
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, 'Failed to read the roles of the APIs of the project database') };
  }
}

/**
 * The problems of the rules a caller wrote, as one failure: each rule's shape against the registry's `BlueprintPolicy`
 * (`with_check` only where `withCheck` allows it), and its data against its policy type with the rule's context; each
 * problem with its rule, and the calls that describe the nodes it is in.
 */
export function ruleProblems(
  policies: ReadonlyArray<{ $type: string; data?: unknown; policy_role?: string }>,
  context: Omit<RuleContext, 'role'> & { withCheck?: boolean },
  label: (index: number) => string,
): ToolFailure | null {
  const found = policies.flatMap((policy, index) => {
    const shape = ruleShapeProblems(policy, { withCheck: context.withCheck });
    const problems = shape.length ? shape : checkRule(policy.$type, policy.data, { ...context, ...(policy.policy_role !== undefined ? { role: policy.policy_role } : {}) });
    return problems.map((problem) => ({ ...problem, index, type: policy.$type }));
  });
  if (found.length === 0) return null;
  const calls = found.flatMap(({ code, meant, path, type }: RuleProblem & { type: string }): ToolCallSuggestion[] => {
    if (code === 'mistyped-node' && meant) return [describeType(meant)];
    if (code === 'not-a-node' || code === 'not-a-policy') return [describeType()];
    if (code === 'unknown-role' || !AUTHZ.has(type)) return [];
    return [type, ...path.split('.').filter((part) => AUTHZ.has(part))].map((name) => describeType(name));
  });
  return {
    code: 'invalid-input',
    message: found.map((problem) => `${label(problem.index)}: ${problem.message}`).join(' '),
    hint: 'Fix each rule the message names; the parameters of each policy type say what its data takes.',
    calls: calls.filter((call, index) => calls.findIndex((other) => canonical(other.input) === canonical(call.input)) === index),
    context: { problems: found.map(({ index, path, code, message }) => ({ rule: index + 1, path, code, message })) },
  };
}

function entityTypeFailure(problems: ReturnType<typeof resolveEntityTypes>['problems']): ToolFailure {
  const unknown = problems.some((problem) => problem.code === 'unknown-entity-type');
  return {
    code: 'invalid-input',
    message: problems.map((problem) => `Rule ${problem.policy + 1}: ${problem.message}`).join(' '),
    ...(unknown ? { hint: 'Use an entity type the database has, by its prefix.', calls: [LIST_ENTITY_TYPES] } : {}),
    context: { problems },
  };
}

// A rule whose meaning depends on the columns of another table: AuthzRelatedMemberList, at any depth.
const readsRelatedColumns = (policies: ReadonlyArray<{ type?: string; $type?: string; data?: unknown }>): boolean =>
  policies.some((policy) => (policy.type ?? policy.$type) === 'AuthzRelatedMemberList' || JSON.stringify(policy.data ?? {}).includes('"AuthzRelatedMemberList"'));

/**
 * The columns of the database's application tables, by id and by name, read only when a rule needs another table's
 * columns; `tables` are tables already read.
 */
export async function relatedColumns(
  context: ProjectContext,
  policies: ReadonlyArray<{ type?: string; $type?: string; data?: unknown }>,
  tables?: TableRecord[],
): Promise<Result<RelatedColumns | undefined>> {
  if (!readsRelatedColumns(policies)) return { kind: 'ok', value: undefined };
  const read = tables ? { kind: 'ok' as const, value: tables } : await readTables(context);
  if (read.kind === 'failed') return read;
  const columns: RelatedColumns = {};
  for (const table of read.value) columns[table.id] = columns[table.name] = table.fields.map((field) => field.name);
  return { kind: 'ok', value: columns };
}

// The name the backend gives each policy row of a rule: the role's first four letters, the privilege's first three, and
// the rule's name, which is its type without "Authz" unless it gives one.
const shortName = (type: string): string => storedName(type.replace(/^Authz/, '')) ?? type;
const rowName = (role: string, privilege: string, name: string): string => {
  const full = `${role.toLowerCase().slice(0, 4)}_${privilege.toLowerCase().slice(0, 3)}_${name}`;
  return storedName(full) ?? full;
};

const COMPOSITE_CALL = describeType('AuthzComposite');

// What the backend keeps one of on a table: a rule of one policy type with the same data and check of a changed row,
// whatever its privileges, role and kind.
const sameTypeAndData = (rule: { $type: string; data?: unknown; with_check?: unknown }) => canonical([rule.$type, rule.data ?? {}, rule.with_check ?? null]);

/**
 * The rules a change sends, as the backend creates them, or the failure that names the first rule the backend would
 * skip or refuse. Rules of one policy type, role, kind and data become one rule with all their privileges (in lower
 * case). Beside an earlier rule or one the table keeps (`table`, for an add), a rule is refused when the backend keeps
 * only one of its type and data, or when it names a policy row the same way: the role's first four letters, the
 * privilege's first three, and the rule's name. Every tool that sends rules sends them through this.
 */
export function rulesToSend(
  given: readonly BlueprintPolicy[],
  { table, defaultRole, label }: { table?: TableRecord; defaultRole: string; label: (index: number) => string },
): Result<BlueprintPolicy[]> {
  const merged: Array<{ rule: BlueprintPolicy; index: number }> = [];
  for (const [index, rule] of given.entries()) {
    const role = rule.policy_role ?? defaultRole;
    const privileges = rule.privileges?.map((privilege) => privilege.toLowerCase());
    const same = merged.find(({ rule: other }) => sameTypeAndData(other) === sameTypeAndData(rule) && (other.policy_role ?? defaultRole) === role && (other.permissive ?? true) === (rule.permissive ?? true) && other.policy_name === rule.policy_name);
    if (same && same.rule.privileges && privileges) {
      same.rule = { ...same.rule, privileges: PRIVILEGE_ORDER.filter((privilege) => same.rule.privileges.includes(privilege) || privileges.includes(privilege)) };
    } else {
      merged.push({ rule: { ...rule, ...(privileges ? { privileges } : {}) }, index });
    }
  }
  const kept = table?.policyRules ?? [];
  const names = new Map<string, number>();
  for (const [position, { rule, index }] of merged.entries()) {
    const role = rule.policy_role ?? defaultRole;
    const twin = merged.slice(0, position).find(({ rule: other }) => sameTypeAndData(other) === sameTypeAndData(rule));
    if (twin) {
      return {
        kind: 'failed',
        failure: {
          code: 'invalid-input',
          message:
            `${label(index)} has the same policy type and data as rule ${twin.index + 1}, and a table keeps one rule of a type with the same data, ` +
            'so the backend would skip it.',
          hint:
            'Give them as one rule for one role, which also lets in the roles that are members of it, or make the data differ, ' +
            'for example by putting one in an AuthzComposite rule.',
          calls: [COMPOSITE_CALL],
        },
      };
    }
    const stored = kept.find((other) => other.type === rule.$type && canonical(other.data) === canonical(rule.data ?? {}) && canonical(other.withCheck ?? null) === canonical(rule.with_check ?? null));
    if (stored) {
      return {
        kind: 'failed',
        failure: {
          code: 'conflict',
          message: `${label(index)}: table "${table.name}" has a ${rule.$type} rule with the same data for ${stored.privileges.join(', ')}, and a table keeps one rule of a type with the same data, so the backend would skip this one.`,
          hint: "Replace the table's rules with the whole set instead, with these privileges in that one rule.",
          calls: [explainTable(table.name)],
        },
      };
    }
    for (const privilege of rule.privileges ?? []) {
      const name = rowName(role, privilege, rule.policy_name ?? shortName(rule.$type));
      const what = `a second ${rule.$type} rule for ${privilege} and the role ${role}`;
      const before = names.get(name);
      if (before !== undefined) {
        return {
          kind: 'failed',
          failure: {
            code: 'invalid-input',
            message: `${label(index)} is ${what}, beside rule ${before + 1}: the backend names a rule by its role, privilege and policy type, so it would refuse the second one.`,
            hint: 'Put both in one AuthzComposite rule: under OR either one lets a person in, under AND a person must pass both. Or give one a "policy_name" of its own.',
            calls: [COMPOSITE_CALL],
          },
        };
      }
      if (table?.policyNames.includes(name)) {
        return {
          kind: 'failed',
          failure: {
            code: 'conflict',
            message: `${label(index)} would be ${what} on table "${table.name}", which already has one: the backend names a rule by its role, privilege and policy type, so it would refuse this one.`,
            hint: "Put the table's rule and this one in one AuthzComposite rule, and replace the table's rules with a set that holds it.",
            calls: [explainTable(table.name), COMPOSITE_CALL],
          },
        };
      }
      names.set(name, index);
    }
  }
  return { kind: 'ok', value: merged.map(({ rule }) => rule) };
}

// The backend names the read-only limit it adds beside a team rule the same way whatever the rule, and never finds the
// copy a table keeps, so an add that makes one fails on a table that has one.
function readOnlyNameTaken(rules: BlueprintPolicy[], grants: TableAccessInput['grants'] | undefined, table: TableRecord): ToolFailure | null {
  const [limit] = addedByBackend(rules, grants);
  const taken = limit && limit.privileges.map((privilege) => rowName(limit.role, privilege, 'read_only_restriction')).find((name) => table.policyNames.includes(name));
  if (!taken) return null;
  return {
    code: 'conflict',
    message:
      `Beside a team rule, the backend adds its own read-only limit for the writes the change grants, always under one name, ` +
      `and table "${table.name}" already has the policy ${taken}, so the backend would refuse the change.`,
    hint: "Replace the table's rules with the whole set instead: a replace removes that limit too.",
    calls: [explainTable(table.name)],
  };
}

/** The rules a change sends, as the backend will store them, the team kinds their entity_type names, and the columns of other tables they read. */
export type StoredRules = { policies: BlueprintPolicy[]; scopes: MembershipScope[]; related?: RelatedColumns };

/**
 * The rules a change sends, checked before the plan: each rule's shape and data, with the role it names and the
 * columns of the other tables it reads; every `entity_type` becomes the team kind the backend stores; and the rules
 * go through `rulesToSend`, beside the rules the table keeps (`table`, for an add). `live` is the table the plan shows
 * now, whose rules may read other tables too.
 */
export async function storedRules(
  context: ProjectContext,
  given: AccessPolicy[],
  { table, grants, live = table }: { table?: TableRecord; grants?: TableAccessInput['grants']; live?: TableRecord },
): Promise<Result<StoredRules>> {
  const label = (index: number) => `Rule ${index + 1} (${given[index].$type})`;
  const roles = await rolesFor(context, given);
  if (roles.kind === 'failed') return roles;
  const related = await relatedColumns(context, [...given, ...(live?.policyRules ?? [])]);
  if (related.kind === 'failed') return related;
  const problems = ruleProblems(given as Array<AccessPolicy & { $type: string }>, { roles: roles.value, columnsOf: columnsOf(related.value) }, label);
  if (problems) return { kind: 'failed', failure: problems };
  const policies = given as unknown as BlueprintPolicy[];
  const scopes = await scopesFor(context, policies);
  if (scopes.kind === 'failed') return scopes;
  const resolved = resolveEntityTypes(policies.map(tablePolicyFromBlueprint), scopes.value);
  if (resolved.problems.length) return { kind: 'failed', failure: entityTypeFailure(resolved.problems) };
  // The backend takes a rule's role from the first grant of the call when the rule names none.
  const defaultRole = grants?.[0]?.roles?.[0] ?? 'authenticated';
  const sent = rulesToSend(
    policies.map((policy, index) => ({ ...policy, data: resolved.policies[index].data })),
    { table, defaultRole, label },
  );
  if (sent.kind === 'failed') return sent;
  const taken = table && readOnlyNameTaken(sent.value, grants, table);
  if (taken) return { kind: 'failed', failure: taken };
  return { kind: 'ok', value: { policies: sent.value, scopes: scopes.value, ...(related.value ? { related: related.value } : {}) } };
}

/** The access a change leaves: `kept` (the table's rules an add keeps) and `sent`, with the rule the backend adds itself. */
export function plannedPolicies(kept: TablePolicy[], sent: BlueprintPolicy[], grants: TableAccessInput['grants'] | undefined, scopes: MembershipScope[]): ResolvedPolicy[] {
  return resolveEntityTypes([...kept, ...sent.map(tablePolicyFromBlueprint), ...addedByBackend(sent, grants)], scopes).policies;
}

/** The Data nodes the rules need for the columns `table` lacks, or the failure that says which rule names a column its node cannot add. */
export function neededNodes(policies: readonly BlueprintPolicy[], table: TableRecord): Result<BlueprintNode[]> {
  const needed = dataNodesForPolicies(
    policies.map((policy) => ({ type: policy.$type, data: policy.data ?? {} })),
    new Set(table.fields.map((field) => field.name)),
  );
  if (needed.problems.length > 0) return { kind: 'failed', failure: { code: 'invalid-input', message: needed.problems.join(' ') } };
  return { kind: 'ok', value: needed.nodes as BlueprintNode[] };
}

/** The calls that fix a required column no rule sets: make it optional, or drop it. */
export const columnFixes = (table: string, column: string) => [
  suggest('update_field', { table_name: table, field_name: column, is_required: false }, `Make ${column} optional, so new rows can leave it empty`),
  suggest('delete_field', { table_name: table, field_name: column }, `Drop ${column} and its values`),
];

// The columns of the finding that a required column is left from rules the table no longer has.
const strandedColumns = (findings: AccessFinding[]): string[] => findings.find((finding) => finding.id === 'required-column-not-set')?.columns ?? [];

/**
 * What set_access checks before it changes anything: a list of rules, the
 * table, and the columns the rules need. It resolves the replacement and the
 * access the table will have.
 */
export async function setAccessReady(params: SetAccessParams, cwd: string): Promise<Result<SetAccessReady>> {
  if (params.policies.length === 0) {
    return {
      kind: 'failed',
      failure: {
        code: 'invalid-input',
        message:
          'The rule list is empty: the table would keep no rule, and the backend replaces the rules only with a set that has one. ' +
          'To let no one read or change the rows, give one AuthzDenyAll rule for select, insert, update and delete.',
        calls: [describeType('AuthzDenyAll')],
      },
    };
  }
  const ready = await projectReady(cwd);
  if (ready.kind === 'failed') return ready;
  const context = ready.value;
  const read = await readTable(context, params.table_name);
  if (read.kind === 'failed') return read;
  const table = read.value;

  const prepared = await storedRules(context, params.policies, { live: table });
  if (prepared.kind === 'failed') return prepared;
  const { policies, scopes, related } = prepared.value;
  const nodes = neededNodes(policies, table);
  if (nodes.kind === 'failed') return nodes;
  const provision: Provision = { nodes: nodes.value, policies, owns: ['policies'] };
  const rules = policies.map((policy) => ({ type: policy.$type, data: policy.data as Record<string, unknown> }));
  const columns = await existingTableChange(context, table, provision.nodes, rules);
  if (columns.kind === 'failed') return columns;
  const after: PlannedAccess = {
    policies: plannedPolicies([], policies, undefined, scopes),
    grants: table.grants,
    rls_enabled: true,
    fields: [...table.fields.map(tableField), ...columns.value.fields],
    ...(related ? { related } : {}),
  };
  return {
    kind: 'ok',
    value: {
      context,
      table,
      provision,
      after,
      notes: [...readOnlyNotes(policies, undefined), ...columns.value.notes],
      columns: columns.value,
      meaning: changeMeaning(table.name, columns.value, rules),
    },
  };
}

/** The plan's access for set_access: the live table now, and after the replace, with the columns it adds. */
export const setAccessPlan = ({ table, after, notes, columns }: SetAccessReady) => [
  { ...planTableAccess(table.name, { ...accessInputOf(table), ...(after.related ? { related: after.related } : {}) }, after), ...columnPlan(columns, true), ...(notes.length ? { notes } : {}) },
];

type SetAccessDetails = {
  success: boolean;
  message: string;
  table?: string;
  access?: ExplainedTable;
};

export const setAccessTool: HarnessTool<typeof SetAccessZod, SetAccessDetails> = {
  name: 'set_access',
  label: 'Set access',
  description:
    'Replace every access rule of a table with a list of rules, in one change; the grants stay, and the columns the rules need are added. The plan marks each rule as kept, added or removed.',
  promptSnippet: 'set_access: replace the access rules of a table with a list of rules. Gated.',
  parameters: SetAccessZod,
  effect: 'write',
  async execute(params, ctx) {
    const ready = await setAccessReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure, {});
    const { context, table, provision, meaning } = ready.value;
    const failure = await applyProvision(context, table, provision, `Failed to set the access of table "${table.name}"`, meaning);
    if (failure) return fail(failure, { table: table.name });
    const again = suggest('set_access', params, 'Replace the whole set again with the rules you approved, once nothing else changes the table');
    const checked = await readBack(context, table.name, ready.value.after, ready.value.columns.added.map((column) => column.name), again);
    if (checked.kind !== 'same') return fail(checked.failure, { table: table.name });
    const access = explained(checked.table, ready.value.after.related);
    const stranded = strandedColumns(access.findings);
    const message = [
      `Set the access of table "${table.name}" to ${provision.policies.length} rule${provision.policies.length === 1 ? '' : 's'}.`,
      ...accessText(access).slice(1),
      ...ready.value.notes.map((note) => `  note: ${note}`),
      ...stranded.map((column) => `  ${column} is required and no rule sets it now: make it optional, or drop it.`),
    ].join('\n');
    const calls = stranded.flatMap((column) => columnFixes(table.name, column));
    return {
      content: [{ type: 'text', text: message }],
      details: { success: true, message, table: table.name, access },
      ...(calls.length ? { calls } : {}),
    };
  },
};
