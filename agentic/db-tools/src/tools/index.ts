import type { AnyHarnessTool, PlanTableAccess, PlanTarget } from '@agentic-kit/harness';
import type { BlueprintPolicy } from 'node-type-registry';

import { type TableAccessInput, tablePolicyFromBlueprint } from '../access';
import { fieldTypeToTypeName } from '../blueprint/field-type';
import type { ProjectContext } from '../context';
import type { Result } from '../failure';
import { provisionDatabaseReady } from '../provision-database/provision';
import { accountTarget, databaseTarget, ownedProjectReady, projectReady } from '../ready';
import { renameNote } from '../schema-resolve';
import { columnChange, columnPlan, planTableAccess } from '../table-access';
import { addedByBackend, describePolicyTypeTool, explainAccessTool, readOnlyNotes, setAccessPlan, setAccessReady, setAccessTool } from './access';
import { addPoliciesPlan, addPoliciesReady, addPoliciesTool } from './add-policies';
import { addRecordsReady, addRecordsTool } from './add-records';
import { addRelationReady, addRelationTool } from './add-relation';
import { createApiKeyReady, createApiKeyTool } from './create-api-key';
import { describeSchemaTool } from './describe-schema';
import { createEntityTypeReady, createEntityTypeTool, deleteEntityTypeReady, deleteEntityTypeTool, listEntityTypesTool } from './entity-types';
import {
  createFieldReady,
  createFieldTool,
  deleteFieldReady,
  deleteFieldTool,
  deleteTableReady,
  deleteTableTool,
  retypeFieldReady,
  retypeFieldTool,
  updateFieldReady,
  updateFieldTool,
} from './mutations';
import { type ProvisionBlueprintReady, provisionBlueprintReady, provisionBlueprintTool } from './provision-blueprint';
import { provisionDatabaseTool, replaceDatabaseTool } from './provision-database';
import { runCodegenReady, runCodegenTool } from './run-codegen';
import {
  applyTemplateReady,
  applyTemplateTool,
  createTemplateTool,
  deleteTemplateTool,
  listTemplatesTool,
  templateReady,
  updateTemplateTool,
} from './templates';

/**
 * The Constructive database tools, in registration order.
 *
 * Plain `HarnessTool`s: a harness gets them by mapping them into its own tool
 * shape, which is the adapter's job, so this package stays free of any harness
 * dependency (see `toPiTool` in `@agentic-kit/pi` for that binding).
 */
export const constructiveDbTools: readonly AnyHarnessTool[] = [
  provisionDatabaseTool,
  replaceDatabaseTool,
  describeSchemaTool,
  listTemplatesTool,
  provisionBlueprintTool,
  addRelationTool,
  deleteTableTool,
  createFieldTool,
  updateFieldTool,
  retypeFieldTool,
  deleteFieldTool,
  addPoliciesTool,
  applyTemplateTool,
  createTemplateTool,
  updateTemplateTool,
  deleteTemplateTool,
  addRecordsTool,
  listEntityTypesTool,
  createEntityTypeTool,
  deleteEntityTypeTool,
  createApiKeyTool,
  runCodegenTool,
  explainAccessTool,
  setAccessTool,
  describePolicyTypeTool,
];

/** What a plan names that the tool's check resolved: its target, the access of the tables it creates or changes, and what it must say that the input does not. */
export type Resolved = { target: PlanTarget; access?: PlanTableAccess[]; notes?: string[] };

type Precondition = (params: any, cwd: string) => Promise<Result<Resolved>>;

/** A tool's first check, with what it resolved turned into what its plan names. */
function targeting<T>(
  check: (params: any, cwd: string) => Promise<Result<T>>,
  target: (value: T) => PlanTarget,
  access?: (value: T) => PlanTableAccess[],
  notes?: (params: any) => Array<string | undefined>,
): Precondition {
  return async (params, cwd) => {
    const ready = await check(params, cwd);
    if (ready.kind === 'failed') return ready;
    const said = (notes?.(params) ?? []).filter((note): note is string => note !== undefined);
    return {
      kind: 'ok',
      value: {
        target: target(ready.value),
        ...(access ? { access: access(ready.value) } : {}),
        ...(said.length ? { notes: said } : {}),
      },
    };
  };
}

// A new field's or table's name, as the backend will store it.
const newFieldNote = (params: { field_name?: string }) => [params.field_name ? renameNote('field', params.field_name) : undefined];
const newRelationNotes = (params: { field_name?: string; junction_table_name?: string }) => [
  ...newFieldNote(params),
  params.junction_table_name ? renameNote('table', params.junction_table_name) : undefined,
];

// The access of each table a blueprint creates: its rules and grants as the backend receives them, with the read-only
// limit the backend adds beside a team rule, its own fields and the columns its nodes add (a new table has no rows),
// and the names the backend stores differently.
const blueprintAccess = ({ definition, related }: ProvisionBlueprintReady): PlanTableAccess[] =>
  definition.tables.flatMap((table) => {
    if (typeof table.table_name !== 'string') return [];
    const policies = (table.policies ?? []) as BlueprintPolicy[];
    const grants = table.grants as TableAccessInput['grants'];
    const rules = policies.map((policy) => ({ type: policy.$type, data: policy.data ?? {} }));
    // The blueprint was refused before this when a rule reads a column the table will not have.
    const change = columnChange(table.table_name, (table.fields ?? []).map(({ name }) => ({ name })), table.nodes ?? [], rules);
    const columns = change.kind === 'ok' ? change.value : { added: [], reused: [], failsIfRows: [], fields: [], notes: [] };
    const own = (table.fields ?? []).map((field) => ({ name: field.name, required: field.is_required === true, default: field.default ?? null, type: fieldTypeToTypeName(field.type) }));
    const access = planTableAccess(table.table_name, undefined, {
      policies: [...policies.map(tablePolicyFromBlueprint), ...addedByBackend(policies, grants)],
      grants,
      rls_enabled: table.use_rls !== false,
      fields: [...own, ...columns.fields],
      ...(related ? { related } : {}),
    });
    const names = [renameNote('table', table.table_name), ...(table.fields ?? []).map((field) => renameNote('field', field.name))];
    const notes = [...names.filter((note): note is string => note !== undefined), ...readOnlyNotes(policies, grants), ...columns.notes];
    return [{ ...access, ...columnPlan(columns, false), ...(notes.length ? { notes } : {}) }];
  });

const project = (_params: unknown, cwd: string) => projectReady(cwd);
const onDatabase = (check: (params: any, cwd: string) => Promise<Result<ProjectContext>>) => targeting(check, (context) => databaseTarget(context));

/**
 * The check each db tool runs first, before it changes anything, by tool name,
 * for the gate to run on the same parsed params; its target is what the plan
 * names. The template catalog belongs to the account, so the template tools
 * name the account, and provision_database the backend and account it
 * provisions under.
 */
export const toolPreconditions: ReadonlyMap<string, Precondition> = new Map<string, Precondition>([
  [provisionDatabaseTool.name, targeting((_params, cwd) => provisionDatabaseReady(false, cwd), (target) => target)],
  [replaceDatabaseTool.name, targeting((_params, cwd) => provisionDatabaseReady(true, cwd), (target) => target)],
  [describeSchemaTool.name, onDatabase(project)],
  [listTemplatesTool.name, targeting(project, accountTarget)],
  [provisionBlueprintTool.name, targeting(provisionBlueprintReady, (context) => databaseTarget(context), blueprintAccess)],
  [addRelationTool.name, targeting(addRelationReady, (context) => databaseTarget(context), undefined, newRelationNotes)],
  [deleteTableTool.name, targeting(deleteTableReady, ({ context }) => databaseTarget(context))],
  [createFieldTool.name, targeting(createFieldReady, ({ context }) => databaseTarget(context), undefined, newFieldNote)],
  [updateFieldTool.name, targeting(updateFieldReady, ({ context }) => databaseTarget(context))],
  [retypeFieldTool.name, targeting(retypeFieldReady, ({ context }) => databaseTarget(context))],
  [deleteFieldTool.name, targeting(deleteFieldReady, ({ context }) => databaseTarget(context))],
  [addPoliciesTool.name, targeting(addPoliciesReady, ({ context }) => databaseTarget(context), addPoliciesPlan)],
  [applyTemplateTool.name, targeting(applyTemplateReady, ({ context }) => databaseTarget(context))],
  [createTemplateTool.name, targeting((_params, cwd) => ownedProjectReady(cwd), accountTarget)],
  [updateTemplateTool.name, targeting(templateReady, ({ context }) => accountTarget(context))],
  [deleteTemplateTool.name, targeting(templateReady, ({ context }) => accountTarget(context))],
  [addRecordsTool.name, targeting(addRecordsReady, ({ context, userId }) => databaseTarget(context, userId))],
  [listEntityTypesTool.name, onDatabase(project)],
  [createEntityTypeTool.name, onDatabase(createEntityTypeReady)],
  [deleteEntityTypeTool.name, onDatabase(deleteEntityTypeReady)],
  [createApiKeyTool.name, targeting(createApiKeyReady, ({ context }) => databaseTarget(context))],
  [
    runCodegenTool.name,
    async (_params, cwd) => {
      const ready = await runCodegenReady(cwd);
      if (ready.kind === 'failed') return ready;
      const { context, notes } = ready.value;
      return { kind: 'ok', value: { target: databaseTarget(context), notes } };
    },
  ],
  [explainAccessTool.name, onDatabase(project)],
  [setAccessTool.name, targeting(setAccessReady, ({ context }) => databaseTarget(context), setAccessPlan)],
]);
