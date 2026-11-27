import { type HarnessTool, identifierParam, idParam, strictObject, textParam, type ToolCallSuggestion, type ToolFailure } from '@agentic-kit/harness';
import { z } from 'zod';

import type { ProjectContext } from '../context';
import { failedResult, failureFromError, failureText, noRowCreated, noRowsChanged, type Result, suggest } from '../failure';
import { projectReady } from '../ready';

export type EntityTypeSummary = {
  id: string;
  name: string | null;
  description: string | null;
  prefix: string | null;
  parentEntity: string | null;
  isVisible: boolean | null;
  entityTableName: string | null;
  installedModules: string[] | null;
};

export type EntityTypesDetails = {
  success: boolean;
  message: string;
  entityTypes?: EntityTypeSummary[];
};

const SUMMARY_SELECT = {
  id: true,
  name: true,
  description: true,
  prefix: true,
  parentEntity: true,
  isVisible: true,
  outEntityTableName: true,
  outInstalledModules: true,
} as const;

type SummaryRow = {
  id: string;
  name: string | null;
  description: string | null;
  prefix: string | null;
  parentEntity: string | null;
  isVisible: boolean | null;
  outEntityTableName: string | null;
  outInstalledModules: string[] | null;
};

function toSummary(row: SummaryRow): EntityTypeSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    prefix: row.prefix,
    parentEntity: row.parentEntity,
    isVisible: row.isVisible,
    entityTableName: row.outEntityTableName,
    installedModules: row.outInstalledModules,
  };
}

function formatSummary(s: EntityTypeSummary): string {
  const parts = [
    `- ${s.name ?? '?'} (id: ${s.id})`,
    `  table: ${s.entityTableName ?? '?'}, prefix: ${s.prefix ?? '?'}`,
  ];
  if (s.parentEntity) parts.push(`  parent: ${s.parentEntity}`);
  if (s.description) parts.push(`  description: ${s.description}`);
  if (s.installedModules?.length) parts.push(`  modules: ${s.installedModules.join(', ')}`);
  return parts.join('\n');
}

export function defaultPrefix(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const LIST_ENTITY_TYPES = suggest('list_entity_types', {}, 'See the entity types that exist');

export type EntityTypeRow = { id: string; prefix?: string | null; outMembershipType?: number | null };

/** The entity types of the project database: each one's prefix is a team kind, and its out_membership_type the number rules store. */
export async function readEntityTypes(context: ProjectContext): Promise<Result<EntityTypeRow[]>> {
  try {
    const result = await context.modules.entityTypeProvision
      .findMany({ where: { databaseId: { equalTo: context.databaseId } }, select: { id: true, prefix: true, outMembershipType: true } })
      .unwrap();
    return { kind: 'ok', value: result.entityTypeProvisions.nodes };
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, 'Failed to read the entity types of the project database') };
  }
}

function fail(failure: ToolFailure) {
  return failedResult<EntityTypesDetails>(failure, { success: false, message: failureText(failure) });
}

const done = (message: string, entityTypes?: EntityTypeSummary[], calls?: ToolCallSuggestion[]) => ({
  content: [{ type: 'text' as const, text: message }],
  details: { success: true, message, ...(entityTypes ? { entityTypes } : {}) },
  ...(calls ? { calls } : {}),
});

// ── list_entity_types ────────────────────────────────────────────────────

const ListEntityTypesZod = strictObject('the input', {});

export const listEntityTypesTool: HarnessTool<typeof ListEntityTypesZod, EntityTypesDetails> = {
  name: 'list_entity_types',
  label: 'List entity types',
  description:
    'List the entity types of the project database (organizations, teams, projects, …): each one with its id, prefix, entity table and modules. An entity type is the unit API keys can be scoped to. Read-only.',
  promptSnippet: 'list_entity_types: the entity types (orgs, teams, …) of the project database. Read-only.',
  parameters: ListEntityTypesZod,
  effect: 'read',
  async execute(_params, ctx) {
    const ready = await projectReady(ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { modules, databaseId } = ready.value;
    try {
      const result = await modules.entityTypeProvision.findMany({ where: { databaseId: { equalTo: databaseId } }, select: SUMMARY_SELECT }).unwrap();
      const entityTypes = result.entityTypeProvisions.nodes.map((row) => toSummary(row as SummaryRow));
      const message =
        entityTypes.length === 0
          ? 'No entity types yet.'
          : `${entityTypes.length} entity type${entityTypes.length === 1 ? '' : 's'}:\n${entityTypes.map(formatSummary).join('\n')}`;
      return done(message, entityTypes);
    } catch (err) {
      return fail(failureFromError(err, 'Failed to list entity types'));
    }
  },
};

// ── create_entity_type ───────────────────────────────────────────────────

const CreateEntityTypeZod = strictObject('the input', {
  name: textParam().describe('Entity type name'),
  description: z.string().describe('Human-readable description of the entity type').optional(),
  prefix: identifierParam()
    .describe('Table-name prefix for the provisioned tables (e.g. "org" → org table, org_memberships); defaults to the snake_case of name.')
    .optional(),
  parent_entity: identifierParam()
    .describe('Parent entity table name, for hierarchical types (e.g. a "team" under an "org"); the backend defaults it to the root entity (org).')
    .optional(),
  is_visible: z.boolean().describe('Whether the type shows up in end-user entity listings').optional(),
  has_invites: z.boolean().describe('Provision an invites module ({prefix}_invites + claimed invites)').optional(),
  has_profiles: z.boolean().describe('Provision a profiles table for members of this type').optional(),
  has_limits: z.boolean().describe('Provision usage-limits tracking for this type').optional(),
  has_levels: z.boolean().describe('Provision levels/achievements support for this type').optional(),
  has_storage: z.boolean().describe('Provision a storage module (files + buckets tables) for this type').optional(),
});

type CreateParams = z.infer<typeof CreateEntityTypeZod>;

const prefixOf = (params: CreateParams): string => params.prefix?.trim() || defaultPrefix(params.name);

/** What create_entity_type checks before it changes anything: a name, the project, and a prefix no entity type has. */
export async function createEntityTypeReady(params: CreateParams, cwd: string): Promise<Result<ProjectContext>> {
  if (!params.name.trim()) return { kind: 'failed', failure: { code: 'invalid-input', message: 'The entity type needs a name that is not blank.' } };
  const ready = await projectReady(cwd);
  if (ready.kind === 'failed') return ready;
  const read = await readEntityTypes(ready.value);
  if (read.kind === 'failed') return read;
  const prefix = prefixOf(params);
  if (read.value.some((type) => type.prefix === prefix)) {
    return {
      kind: 'failed',
      failure: {
        code: 'name-taken',
        message: `Failed to create entity type "${params.name}": an entity type with the prefix "${prefix}" already exists in this database.`,
        hint: 'Choose another name or prefix; check the entity types that exist.',
        calls: [LIST_ENTITY_TYPES],
      },
    };
  }
  return ready;
}

export const createEntityTypeTool: HarnessTool<typeof CreateEntityTypeZod, EntityTypesDetails> = {
  name: 'create_entity_type',
  label: 'Create entity type',
  description:
    'Create an entity type in the project database (an organization, a team, a project): it provisions its own entity table and the tables that record who belongs to each one. A type cannot be changed once provisioned; to change one, delete it and create a new one.',
  promptSnippet: 'create_entity_type: add an entity type (org, team, …) with its table and memberships. Gated.',
  parameters: CreateEntityTypeZod,
  effect: 'write',
  async execute(params, ctx) {
    const ready = await createEntityTypeReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { modules, databaseId } = ready.value;
    const name = params.name.trim();
    const action = `Failed to create entity type "${name}"`;
    try {
      const result = await modules.entityTypeProvision
        .create({
          data: {
            databaseId,
            name,
            prefix: prefixOf(params),
            ...(params.description !== undefined && { description: params.description }),
            ...(params.parent_entity !== undefined && { parentEntity: params.parent_entity }),
            ...(params.is_visible !== undefined && { isVisible: params.is_visible }),
            ...(params.has_invites !== undefined && { hasInvites: params.has_invites }),
            ...(params.has_profiles !== undefined && { hasProfiles: params.has_profiles }),
            ...(params.has_limits !== undefined && { hasLimits: params.has_limits }),
            ...(params.has_levels !== undefined && { hasLevels: params.has_levels }),
            ...(params.has_storage && { storage: [{}] as unknown as Record<string, unknown> }),
          },
          select: SUMMARY_SELECT,
        })
        .unwrap();
      const row = result.createEntityTypeProvision?.entityTypeProvision;
      if (!row) return fail(noRowCreated(action, LIST_ENTITY_TYPES));
      const summary = toSummary(row as SummaryRow);
      const modulesText = summary.installedModules?.length ? `, modules: ${summary.installedModules.join(', ')}` : '';
      return done(
        `Created entity type "${summary.name}" (id: ${summary.id}) — entity table "${summary.entityTableName}"${modulesText}. Generate the typed SDK again to use it in the app.`,
        [summary],
        [suggest('run_codegen', {}, 'Generate the typed SDK with the new entity type')],
      );
    } catch (err) {
      return fail(failureFromError(err, action, { taken: `an entity type with the prefix "${prefixOf(params)}" already exists in this database.`, check: LIST_ENTITY_TYPES }));
    }
  },
};

// ── delete_entity_type ───────────────────────────────────────────────────

const DeleteEntityTypeZod = strictObject('the input', {
  entity_type_id: idParam().describe('The id of the entity type, as the list of entity types gives it'),
});

type DeleteParams = z.infer<typeof DeleteEntityTypeZod>;

/** What delete_entity_type checks before it changes anything: the project, and an entity type of that id. */
export async function deleteEntityTypeReady(params: DeleteParams, cwd: string): Promise<Result<ProjectContext>> {
  const ready = await projectReady(cwd);
  if (ready.kind === 'failed') return ready;
  const read = await readEntityTypes(ready.value);
  if (read.kind === 'failed') return read;
  if (!read.value.some((type) => type.id === params.entity_type_id)) {
    return {
      kind: 'failed',
      failure: {
        code: 'not-found',
        message: `No entity type has the id ${params.entity_type_id} in the project database.`,
        hint: 'Check the ids of the entity types that exist, then retry.',
        calls: [LIST_ENTITY_TYPES],
      },
    };
  }
  return ready;
}

export const deleteEntityTypeTool: HarnessTool<typeof DeleteEntityTypeZod, EntityTypesDetails> = {
  name: 'delete_entity_type',
  label: 'Delete entity type',
  description:
    'Delete the registration of an entity type. Its entity table and the rows in it stay in the database and its API. Destructive.',
  promptSnippet: 'delete_entity_type: remove the registration of an entity type; its table stays. Destructive — gated.',
  parameters: DeleteEntityTypeZod,
  effect: 'destructive',
  async execute(params, ctx) {
    const ready = await deleteEntityTypeReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const action = `Failed to delete entity type ${params.entity_type_id}`;
    try {
      const result = await ready.value.modules.entityTypeProvision
        .delete({ where: { id: params.entity_type_id }, select: { id: true, name: true, outEntityTableName: true } })
        .unwrap();
      const row = result.deleteEntityTypeProvision?.entityTypeProvision;
      if (!row) return fail(noRowsChanged(action, LIST_ENTITY_TYPES));
      const table = row.outEntityTableName ? ` "${row.outEntityTableName}"` : '';
      return done(`Deleted entity type registration "${row.name ?? params.entity_type_id}". Note: the provisioned entity table${table} remains in the API schema with its data.`);
    } catch (err) {
      return fail(failureFromError(err, action));
    }
  },
};
