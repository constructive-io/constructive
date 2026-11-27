import type { HarnessTool, ToolFailure } from '@agentic-kit/harness';
import type { BlueprintDefinition, BlueprintPolicy, BlueprintRelation, BlueprintTable } from 'node-type-registry';

import { dataNodesForPolicies, fieldsAddedByNodes, ROW_ID, tablePolicyFromBlueprint } from '../access';
import { columnsOf, type RelatedColumns } from '../access/words';
import { expandBlueprintDefaults } from '../blueprint/blueprint-defaults';
import { type Blueprint, blueprintProblems, BlueprintZod } from '../blueprint/blueprint-schema';
import { fieldTypeToTypeName } from '../blueprint/field-type';
import { BlueprintBuildError, buildBlueprint } from '../blueprint-construction';
import type { ProjectContext } from '../context';
import { DESCRIBE_SCHEMA, failedResult, failureFromError, noRowCreated, type Result } from '../failure';
import { ownedProjectReady } from '../ready';
import { readSchemas, relationTablesMissing, schemasMissing, storedName, storedTableNames, tablesTaken } from '../schema-resolve';
import { columnChange } from '../table-access';
import { relatedColumns, rolesFor, ruleProblems, rulesToSend } from './access';

export type ProvisionBlueprintReady = ProjectContext & { ownerId: string; definition: BlueprintDefinition; related?: RelatedColumns };

// The rules of a table entry that are rule objects; anything else in the list is the schema's to refuse.
const rulesOf = (table: BlueprintTable): BlueprintPolicy[] =>
  (Array.isArray(table.policies) ? table.policies : []).filter(
    (policy): policy is BlueprintPolicy => typeof policy === 'object' && policy !== null && typeof (policy as { $type?: unknown }).$type === 'string',
  );

// The new tables of a blueprint: the entries that name a table (an entry may attach to a module's table instead).
const newTables = (definition: BlueprintDefinition): Array<BlueprintTable & { table_name: string }> =>
  definition.tables.filter((table): table is BlueprintTable & { table_name: string } => typeof table.table_name === 'string');

// The columns of each new table, by its name: its own fields, the row id, and the columns its nodes add.
function newTableColumns(definition: BlueprintDefinition): RelatedColumns {
  return Object.fromEntries(
    newTables(definition).map((table) => [
      table.table_name,
      [...new Set([ROW_ID, ...(table.fields ?? []).map((field) => field.name), ...fieldsAddedByNodes(table.nodes ?? []).fields.map((column) => column.name)])],
    ]),
  );
}

/**
 * A field of a new table that a node of the table also adds, when the backend cannot keep it: the row id, which the
 * table's own id node makes, or a column of another type than the node's. The backend creates a field before the
 * nodes, and a node keeps a column that exists as it is.
 */
function fieldNodeClash(table: BlueprintTable & { table_name: string }): ToolFailure | null {
  const added = fieldsAddedByNodes(table.nodes ?? []).fields;
  for (const field of table.fields ?? []) {
    const column = added.find((entry) => entry.name === field.name);
    if (field.name === ROW_ID) {
      return {
        code: 'invalid-input',
        message: `Table "${table.table_name}": the field ${ROW_ID} is the row id, which every table gets. Leave it out of the fields.`,
      };
    }
    const type = fieldTypeToTypeName(field.type);
    if (column && column.type !== type) {
      return {
        code: 'invalid-input',
        message:
          `Table "${table.table_name}": the field ${field.name} is ${type}, and ${column.node} adds ${field.name} as ${column.type} for the table's rules or nodes; ` +
          'the backend keeps the field as given, so they cannot work on it.',
        hint: `Leave ${field.name} out of the fields so ${column.node} adds it, or give it the type ${column.type}.`,
      };
    }
  }
  return null;
}

/**
 * The checks of a blueprint that need no backend: each rule's shape and data against its node (the columns of the
 * other tables it reads included), the rules each table sends (`rulesToSend`), the registry's blueprint JSON Schema
 * over what the backend would receive, and for each new table its fields beside its nodes, the columns its rules read
 * and the Data nodes that add them. It answers the definition with each table's rules as the backend creates them.
 */
function blueprintChecks(definition: BlueprintDefinition, context: { roles: readonly string[] | undefined; related: RelatedColumns }): Result<BlueprintDefinition> {
  const tables: BlueprintTable[] = [];
  for (const table of definition.tables) {
    const name = table.table_name ?? 'of the module';
    const policies = rulesOf(table);
    // A rule list that is not a list of rules is the schema's to say.
    if (policies.length !== (Array.isArray(table.policies) ? table.policies.length : 0)) {
      tables.push(table);
      continue;
    }
    const label = (index: number) => `Table "${name}", rule ${index + 1} (${policies[index].$type})`;
    const rules = ruleProblems(policies, { roles: context.roles, inBlueprint: true, withCheck: true, columnsOf: columnsOf(context.related) }, label);
    if (rules) return { kind: 'failed', failure: rules };
    const sent = rulesToSend(policies, { defaultRole: 'authenticated', label });
    if (sent.kind === 'failed') return sent;
    tables.push(Array.isArray(table.policies) ? { ...table, policies: sent.value } : table);
  }
  const checked = { ...definition, tables };
  const problems = blueprintProblems(checked);
  if (problems.length) {
    return {
      kind: 'failed',
      failure: {
        code: 'invalid-input',
        message: `The blueprint is not valid: ${problems.join(' ')}`,
        hint: 'Fix each place the message names; the blueprint JSON Schema of node-type-registry describes every key.',
      },
    };
  }
  for (const table of newTables(checked)) {
    const clash = fieldNodeClash(table);
    if (clash) return { kind: 'failed', failure: clash };
    const rules = (table.policies ?? []).map(tablePolicyFromBlueprint);
    const needed = dataNodesForPolicies(rules.flatMap((rule) => rule.with_check ? [rule, { type: rule.with_check.type, data: rule.with_check.data ?? {} }] : [rule]), new Set((table.fields ?? []).map(({ name }) => name)));
    if (needed.problems.length) return { kind: 'failed', failure: { code: 'invalid-input', message: `Table "${table.table_name}": ${needed.problems.join(' ')}` } };
    const change = columnChange(table.table_name, (table.fields ?? []).map(({ name }) => ({ name })), table.nodes ?? [], rules);
    if (change.kind === 'failed') return { kind: 'failed', failure: { ...change.failure, message: `Table "${table.table_name}": ${change.failure.message}` } };
  }
  return { kind: 'ok', value: checked };
}

// Each schema the blueprint names: a table's own, an end of a relation, and the table of a top-level index or constraint.
function schemasNamed(definition: BlueprintDefinition): string[] {
  const items = [definition.indexes, definition.unique_constraints, definition.check_constraints, definition.full_text_searches].flatMap((list) => (list ?? []) as Array<{ schema_name?: string }>);
  return [
    ...definition.tables.map((table) => table.schema_name),
    ...(definition.relations ?? []).flatMap((relation) => [relation.source_schema, relation.target_schema]),
    ...items.map((item) => item.schema_name),
  ].filter((name): name is string => typeof name === 'string');
}

/**
 * What provision_blueprint checks before it changes anything: an owned
 * project, a blueprint the registry's JSON Schema takes once its defaults are
 * filled in, rules that fit their nodes and the roles of the database, the
 * schemas it names, none of its new tables yet, and the tables its relations
 * name.
 */
export async function provisionBlueprintReady(params: Blueprint, cwd: string): Promise<Result<ProvisionBlueprintReady>> {
  const ready = await ownedProjectReady(cwd);
  if (ready.kind === 'failed') return ready;
  const expanded = expandBlueprintDefaults(params.definition as unknown as Record<string, unknown>) as unknown as BlueprintDefinition;
  const rules = expanded.tables.flatMap(rulesOf);
  const roles = await rolesFor(ready.value, rules);
  if (roles.kind === 'failed') return roles;
  const existing = await relatedColumns(ready.value, rules);
  if (existing.kind === 'failed') return existing;
  const related = existing.value ? { ...existing.value, ...newTableColumns(expanded) } : undefined;
  const checked = blueprintChecks(expanded, { roles: roles.value, related });
  if (checked.kind === 'failed') return checked;
  const definition = checked.value;
  const named = schemasNamed(definition);
  const schemas = named.length ? await readSchemas(ready.value) : { kind: 'ok' as const, value: new Map<string, string>() };
  if (schemas.kind === 'failed') return schemas;
  const missingSchema = named.length ? schemasMissing(named, schemas.value) : null;
  if (missingSchema) return { kind: 'failed', failure: missingSchema };
  const made = newTables(definition);
  const taken = await tablesTaken(ready.value, made.map((table) => ({ name: table.table_name, ...(table.schema_name ? { schema: table.schema_name } : {}) })), schemas.value);
  if (taken) return { kind: 'failed', failure: taken };
  const missing = await relationTablesMissing(ready.value, made.map((table) => table.table_name), (definition.relations ?? []) as BlueprintRelation[], schemas.value);
  if (missing) return { kind: 'failed', failure: missing };
  return { kind: 'ok', value: { ...ready.value, definition, ...(related ? { related } : {}) } };
}

type ProvisionedField = {
  /** As the backend stored it. */
  name: string;
  /** The name the blueprint gave, when the backend stored another. */
  requestedName?: string;
  type: string;
  isRequired: boolean;
  defaultValue: string | null;
};

type ProvisionedTable = {
  /** As the backend stored it. */
  name: string;
  /** The name the blueprint gave, when the backend stored another. */
  requestedName?: string;
  fields: ProvisionedField[];
  policies: string[];
  relationCount: number;
};

export type ProvisionBlueprintDetails = {
  created: number;
  total: number;
  tables: ProvisionedTable[];
  error: string | null;
  /**
   * The construction the backend queued, also when the build then failed or
   * the wait gave up: the build carries on, so calling again would build the
   * same tables twice. Null when nothing was queued.
   */
  constructionId: string | null;
};

function formatText(name: string, details: ProvisionBlueprintDetails): string {
  const lines = [`Created ${details.created} table${details.created === 1 ? '' : 's'} from "${name}":`];
  for (const table of details.tables) {
    const parts = [
      ...(table.requestedName ? [`stored from "${table.requestedName}"`] : []),
      `${table.fields.length} field${table.fields.length === 1 ? '' : 's'}`,
      ...table.fields.filter((field) => field.requestedName).map((field) => `field ${field.name} stored from "${field.requestedName}"`),
    ];
    if (table.relationCount > 0) {
      parts.push(`${table.relationCount} relation${table.relationCount === 1 ? '' : 's'}`);
    }
    if (table.policies.length > 0) {
      parts.push(`policies: ${table.policies.map((policy) => policy.replace(/^Authz/, '')).join(', ')}`);
    }
    lines.push(`  - ${table.name} (${parts.join(', ')})`);
  }
  return lines.join('\n');
}

const typeText = (type: unknown): string => (typeof type === 'string' ? type : JSON.stringify(type));
const defaultText = (value: unknown): string | null => (value == null ? null : typeof value === 'string' ? value : JSON.stringify(value));

export const provisionBlueprintTool: HarnessTool<typeof BlueprintZod, ProvisionBlueprintDetails> = {
  name: 'provision_blueprint',
  label: 'Provision blueprint',
  description:
    'Create one or more related tables (with fields, access rules, relations, indexes and constraints) in the project database from a blueprint definition. Always put related tables in a SINGLE call so relations are created together.',
  promptSnippet: 'provision_blueprint: create new tables from scratch in a single call (fields, rules, relations, indexes). Read the schema first. Gated.',
  parameters: BlueprintZod,
  effect: 'write',
  async execute(input, ctx) {
    const params = input as unknown as Blueprint;
    const empty: ProvisionBlueprintDetails = {
      created: 0,
      total: 0,
      tables: [],
      error: null,
      constructionId: null,
    };

    const ready = await provisionBlueprintReady(params, ctx.cwd);
    if (ready.kind === 'failed') return failedResult(ready.failure, empty);
    const { modules, databaseId, schemaId, ownerId, definition } = ready.value;
    const uniqueName = `${params.name}_${Date.now()}`;
    const made = newTables(definition);

    try {
      const createResult = await modules.blueprint
        .create({
          data: {
            ownerId,
            databaseId,
            name: uniqueName,
            displayName: params.name,
            description: params.description,
            definition: definition as unknown as Record<string, unknown>,
          },
          select: { id: true, name: true },
        })
        .unwrap();

      const blueprintId = createResult.createBlueprint?.blueprint?.id;
      if (!blueprintId) return failedResult(noRowCreated(`Failed to create the blueprint "${params.name}"`, DESCRIBE_SCHEMA), empty);

      const { constructionId, tables } = await buildBlueprint(
        modules,
        { blueprintId, schemaId },
        { signal: ctx.signal },
      );
      // The construction maps each table name of the blueprint to its id; the stored name is read back by id.
      const stored = await storedTableNames(ready.value, Object.values(tables)).catch(() => new Map<string, string>());
      const named = <T extends object>(given: string, as: string | undefined, rest: T) =>
        as && as !== given ? { name: as, requestedName: given, ...rest } : { name: given, ...rest };

      const relations = (definition.relations ?? []) as Array<{ source_table?: string }>;
      const given = new Map(params.definition.tables.filter((table) => typeof table.table_name === 'string').map((table) => [table.table_name, table]));
      const details: ProvisionBlueprintDetails = {
        created: made.length,
        total: made.length,
        tables: made.map((table) =>
          named(table.table_name, stored.get(tables[table.table_name]) ?? storedName(table.table_name), {
            fields: (given.get(table.table_name)?.fields ?? []).map((field) =>
              named(field.name, storedName(field.name), { type: typeText(field.type), isRequired: field.is_required ?? false, defaultValue: defaultText(field.default) }),
            ),
            policies: [...new Set((table.policies ?? []).map((policy) => policy.$type))],
            relationCount: relations.filter((relation) => relation.source_table === table.table_name).length,
          }),
        ),
        error: null,
        constructionId,
      };
      return { content: [{ type: 'text', text: formatText(params.name, details) }], details };
    } catch (err) {
      const failure = failureFromError(err, `Failed to provision "${params.name}"`);
      return failedResult(failure, {
        created: 0,
        total: made.length,
        tables: [],
        error: failure.message,
        constructionId: err instanceof BlueprintBuildError ? err.constructionId : null,
      });
    }
  },
};
