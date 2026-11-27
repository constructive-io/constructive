import { type HarnessTool, identifierParam, strictObject, type ToolFailure } from '@agentic-kit/harness';
import { z } from 'zod';

import type { TableAccessInput } from '../access';
import { AccessPolicyZod } from '../blueprint/blueprint-schema';
import type { ProjectContext } from '../context';
import { failedResult, type FailureMeaning, failureText, type Result } from '../failure';
import { projectReady } from '../ready';
import { accessInputOf, changeMeaning, type ColumnChange, columnPlan, planTableAccess, readTable, type TableRecord } from '../table-access';
import { applyProvision, existingTableChange, neededNodes, type PlannedAccess, plannedPolicies, type Provision, readBack, readOnlyNotes, storedRules } from './access';

// The grants a rule list sends beside its rules: every privilege on every column, to the signed-in.
const LIST_GRANTS: NonNullable<TableAccessInput['grants']> = [{ roles: ['authenticated'], privileges: [['select', '*'], ['insert', '*'], ['update', '*'], ['delete', '*']] }];

const AddPoliciesZod = strictObject('the input', {
  table_name: identifierParam().describe('Name of the existing table to attach the rules to'),
  policies: z.array(AccessPolicyZod).describe("One or more rules to add, in one change; the table's own rules stay"),
});

type AddPoliciesParams = z.infer<typeof AddPoliciesZod>;

export type AddPoliciesReady = {
  context: ProjectContext;
  table: TableRecord;
  /** What the call sends: the Data nodes, the rules as the backend will store them, and the grants. */
  provision: Provision;
  /** What the plan says beside the rules. */
  notes: string[];
  after: PlannedAccess;
  /** The columns the change adds. */
  columns: ColumnChange;
  /** What a refusal of the change means. */
  meaning: FailureMeaning;
};

/**
 * What add_policies checks before it changes anything: a list of rules, the
 * table, and the columns the rules need. It resolves the access the table
 * will have, which keeps its own rules and grants.
 */
export async function addPoliciesReady(params: AddPoliciesParams, cwd: string): Promise<Result<AddPoliciesReady>> {
  if (params.policies.length === 0) {
    return { kind: 'failed', failure: { code: 'invalid-input', message: 'The rule list is empty: give at least one rule to add.' } };
  }
  const ready = await projectReady(cwd);
  if (ready.kind === 'failed') return ready;
  const context = ready.value;
  const read = await readTable(context, params.table_name);
  if (read.kind === 'failed') return read;
  const table = read.value;
  const now = accessInputOf(table);
  const prepared = await storedRules(context, params.policies, { table, grants: LIST_GRANTS });
  if (prepared.kind === 'failed') return prepared;
  const { policies, scopes, related } = prepared.value;
  const nodes = neededNodes(policies, table);
  if (nodes.kind === 'failed') return nodes;
  const provision: Provision = { nodes: nodes.value, policies, grants: LIST_GRANTS };
  const rules = policies.map((policy) => ({ type: policy.$type, data: policy.data ?? {} }));
  const columns = await existingTableChange(context, table, provision.nodes, rules);
  if (columns.kind === 'failed') return columns;
  return {
    kind: 'ok',
    value: {
      context,
      table,
      provision,
      notes: [...readOnlyNotes(policies, LIST_GRANTS), ...columns.value.notes],
      after: {
        ...now,
        policies: plannedPolicies(now.policies, policies, LIST_GRANTS, scopes),
        grants: [...(now.grants ?? []), ...LIST_GRANTS],
        rls_enabled: true,
        fields: [...(now.fields ?? []), ...columns.value.fields],
        ...(related ? { related } : {}),
      },
      columns: columns.value,
      meaning: changeMeaning(table.name, columns.value, rules),
    },
  };
}

/** The plan's access for add_policies: the live table now, and with the added rules and the columns they add. */
export const addPoliciesPlan = ({ table, after, notes, columns }: AddPoliciesReady) => [
  { ...planTableAccess(table.name, { ...accessInputOf(table), ...(after.related ? { related: after.related } : {}) }, after), ...columnPlan(columns, true), ...(notes.length ? { notes } : {}) },
];

export type AddPoliciesDetails = {
  success: boolean;
  message: string;
};

function fail(failure: ToolFailure) {
  return failedResult<AddPoliciesDetails>(failure, { success: false, message: failureText(failure) });
}

export const addPoliciesTool: HarnessTool<typeof AddPoliciesZod, AddPoliciesDetails> = {
  name: 'add_policies',
  label: 'Add policies',
  description:
    'Add one or more access rules to an existing table; the rules it has stay. A rule whose Authz node reads columns a Data node adds (AuthzDirectOwner, AuthzEntityMembership, AuthzPublishable, ...) gets those columns when the table lacks them, so do not add them first. Gated.',
  promptSnippet: 'add_policies: add access rules to an existing table (one call can add many). Gated.',
  parameters: AddPoliciesZod,
  effect: 'write',
  async execute(params: AddPoliciesParams, ctx) {
    const ready = await addPoliciesReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);

    const { context, table, provision, meaning } = ready.value;
    const failure = await applyProvision(context, table, provision, `Failed to add policies to "${params.table_name}"`, meaning);
    if (failure) return fail(failure);
    // An add has no call that makes the table as planned again: adding the rules twice adds them twice.
    const checked = await readBack(context, table.name, ready.value.after, ready.value.columns.added.map((column) => column.name));
    if (checked.kind !== 'same') return fail(checked.failure);
    const count = provision.policies.length;
    const message = `Added ${count} ${count === 1 ? 'rule' : 'rules'} to ${params.table_name}`;
    return { content: [{ type: 'text', text: message }], details: { success: true, message } };
  },
};
