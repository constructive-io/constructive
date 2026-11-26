import type { HarnessTool, HarnessToolResult, ToolFailure } from '@agentic-kit/harness';

import { expandBlueprintDefaults } from '../blueprint/blueprint-defaults';
import { buildBlueprint } from '../blueprint-construction';
import type { ProjectContext } from '../context';
import { DESCRIBE_SCHEMA, failedResult, failureFromError, failureText, noRowCreated, type Result, suggest } from '../failure';
import { ownedProjectReady } from '../ready';
import { resolveSchema, resolveTable, storedName, tablesTaken } from '../schema-resolve';
import { type AddRelationParams as Params, AddRelationZod, buildRelation } from './add-relation-schema';

export type AddRelationDetails = {
  success: boolean;
  message: string;
  sourceTable?: string;
  targetTable?: string;
  fieldName?: string;
};

type ToolResult = HarnessToolResult<AddRelationDetails>;

/**
 * What add_relation checks before it changes anything: its input, an owned
 * project with both tables, and no field or junction table of the new name.
 */
export async function addRelationReady(params: Params, cwd: string): Promise<Result<ProjectContext & { ownerId: string }>> {
  const type = params.relation_type ?? 'belongs_to';
  if (type === 'belongs_to' && !params.field_name) {
    return {
      kind: 'failed',
      failure: {
        code: 'invalid-input',
        message: 'A belongs_to relation needs the name of its foreign-key column on the source table.',
      },
    };
  }
  if (type === 'many_to_many' && !params.junction_table_name) {
    return {
      kind: 'failed',
      failure: { code: 'invalid-input', message: 'A many_to_many relation needs the name of its junction table.' },
    };
  }
  const ready = await ownedProjectReady(cwd);
  if (ready.kind === 'failed') return ready;

  // Both tables must exist: a clearer error than the backend's, and no no-op blueprint.
  let source;
  try {
    const schema = await resolveSchema(ready.value);
    source = resolveTable(schema, params.source_table);
    resolveTable(schema, params.target_table);
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, 'Failed to resolve schema') };
  }

  if (type === 'many_to_many') {
    const taken = await tablesTaken(ready.value, [{ name: params.junction_table_name }]);
    return taken ? { kind: 'failed', failure: taken } : ready;
  }
  if (source.fields.some((field) => field.name === (storedName(params.field_name) ?? params.field_name))) {
    const again = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'field_name'));
    return {
      kind: 'failed',
      failure: {
        code: 'name-taken',
        message: `Table "${params.source_table}" already has a field named "${params.field_name}".`,
        hint: 'Call again with another field name.',
        calls: [
          suggest('add_relation', again, 'Add the relation under a field name the table does not have yet', ['field_name']),
        ],
      },
    };
  }
  return ready;
}

function fail(failure: ToolFailure): ToolResult {
  return failedResult<AddRelationDetails>(failure, { success: false, message: failureText(failure) });
}

export const addRelationTool: HarnessTool<typeof AddRelationZod, AddRelationDetails> = {
  name: 'add_relation',
  label: 'Add relation',
  description:
    'Add a relation between two EXISTING tables without recreating them: belongs_to adds a foreign-key column on the source table; many_to_many creates a junction table. Use this for relations discovered after the tables were provisioned. For brand-new related tables, prefer one blueprint that creates them together.',
  promptSnippet:
    'add_relation: link two existing tables (belongs_to FK column, or many_to_many junction). Gated.',
  parameters: AddRelationZod,
  effect: 'write',
  async execute(params: Params, ctx): Promise<ToolResult> {
    const ready = await addRelationReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const type = params.relation_type ?? 'belongs_to';
    const { modules, databaseId, schemaId, ownerId } = ready.value;

    const definition = expandBlueprintDefaults({ tables: [], relations: buildRelation(params) });
    const uniqueName = `add_relation_${Date.now()}`;

    try {
      const created = await modules.blueprint
        .create({
          data: {
            ownerId,
            databaseId,
            name: uniqueName,
            displayName: `${params.source_table} → ${params.target_table}`,
            description: `Add ${type} relation`,
            definition,
          },
          select: { id: true },
        })
        .unwrap();

      const blueprintId = created.createBlueprint?.blueprint?.id;
      if (!blueprintId) return fail(noRowCreated('Failed to add relation', DESCRIBE_SCHEMA));

      await buildBlueprint(modules, { blueprintId, schemaId }, { signal: ctx.signal });
    } catch (err) {
      return fail(failureFromError(err, 'Failed to add relation'));
    }

    const message =
      type === 'many_to_many'
        ? `Created junction table "${params.junction_table_name}" linking ${params.source_table} ↔ ${params.target_table}.`
        : `Added FK "${params.field_name}" on ${params.source_table} → ${params.target_table}.`;
    return {
      content: [{ type: 'text', text: message }],
      details: {
        success: true,
        message,
        sourceTable: params.source_table,
        targetTable: params.target_table,
        fieldName: params.field_name,
      },
    };
  },
};
