import {
  alignColumns,
  type ConfirmPreviewTable,
  type HarnessTool,
  strictObject,  textParam,
  type ToolFailure } from '@agentic-kit/harness';
import { z } from 'zod';

import { buildBlueprint } from '../blueprint-construction';
import type { ModulesClient, ProjectContext } from '../context';
import {
  DESCRIBE_SCHEMA,
  failedResult,
  failureFromError,
  failureFromErrors,
  failureText,
  noRowCreated,
  noRowsChanged,
  type Result,
  suggest,
  ToolFailureError,
} from '../failure';
import { ownedProjectReady, projectReady } from '../ready';
import { storedTableNames, tablesTaken } from '../schema-resolve';

export type TemplateDetails = {
  success: boolean;
  message: string;
};

export type CreateTemplateDetails = TemplateDetails & {
  displayName?: string;
  blueprintName?: string;
  tables?: ConfirmPreviewTable[];
};

type TemplateField = {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue: string | null;
};

type TemplateTable = {
  name: string;
  fields: TemplateField[];
  policies: string[];
  relationCount: number;
};

type TemplateInfo = {
  id: string;
  version: string | null;
  displayName: string;
  description: string | null;
  categories: string[];
  tables: TemplateTable[];
};

export type ListTemplatesDetails = { templates: TemplateInfo[] };

// A stored blueprint field's `type` is an expanded object (`{ name: 'text' }`),
// not the bare string the agent passes to provision_blueprint. Flatten it to the
// type name so the renderer gets a string, never an object (which React can't
// render as a child).
function fieldTypeName(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && typeof (raw as { name?: unknown }).name === 'string') {
    return (raw as { name: string }).name;
  }
  return '';
}

// A template's definition is a stored blueprint (see BlueprintDefinitionSchema):
// { tables: [{ table_name, fields, policies }], relations: [{ source_table, … }] }.
// Parse it into the same table shape provision_blueprint surfaces so the renderer
// can reuse TableCard. Defensive throughout — it's untyped JSON from the catalog.
function parseTemplateTables(definition: unknown): TemplateTable[] {
  if (!definition || typeof definition !== 'object') return [];
  const def = definition as { tables?: unknown; relations?: unknown };
  const tables = Array.isArray(def.tables) ? def.tables : [];
  const relations = Array.isArray(def.relations) ? def.relations : [];
  return tables.map((raw) => {
    const table = raw as { table_name?: string; fields?: unknown; policies?: unknown };
    const fields = Array.isArray(table.fields) ? table.fields : [];
    const policies = Array.isArray(table.policies) ? table.policies : [];
    return {
      name: table.table_name ?? '',
      fields: fields.map((rawField) => {
        const field = rawField as {
          name?: string;
          type?: unknown;
          is_required?: boolean;
          default?: unknown;
        };
        return {
          name: field.name ?? '',
          type: fieldTypeName(field.type),
          isRequired: field.is_required ?? false,
          defaultValue: typeof field.default === 'string' ? field.default : null,
        };
      }),
      policies: [...new Set(policies.map((policy) => (policy as { $type?: string }).$type ?? '').filter(Boolean))],
      relationCount: relations.filter(
        (relation) => (relation as { source_table?: string }).source_table === table.table_name,
      ).length,
    };
  });
}

function formatTemplatesText(templates: TemplateInfo[]): string {
  if (templates.length === 0) return 'No templates yet.';
  return alignColumns([
    ['NAME', 'VERSION', 'TABLES', 'TAGS', 'ID'],
    ...templates.map((template) => [
      template.displayName || '(no name)',
      template.version ?? '',
      String(template.tables.length),
      template.categories.join(', '),
      template.id,
    ]),
  ]).join('\n');
}

// The latest project blueprint (or a named one) — the definition source for
// create_template, and for the confirm preview of the tables it will template.
// A blueprintName is a best-effort hint: if it matches nothing (the agent often
// guesses casing/wording), fall back to the most recent blueprint so the confirm
// still previews real tables and execute templates the same one it previewed.
async function fetchLatestBlueprint(
  context: ProjectContext,
  blueprintName: string | undefined,
) {
  const found = await context.modules.blueprint
    .findMany({
      select: { displayName: true, definition: true },
      where: {
        databaseId: { equalTo: context.databaseId },
        ...(blueprintName ? { displayName: { equalTo: blueprintName } } : {}),
      },
      orderBy: ['CREATED_AT_DESC'],
      first: 1,
    })
    .unwrap();
  return found.blueprints?.nodes?.[0];
}

async function findProjectBlueprint(
  context: ProjectContext,
  blueprintName: string | undefined,
): Promise<{ displayName: string; definition: unknown } | null> {
  let node = await fetchLatestBlueprint(context, blueprintName);
  if (!node && blueprintName) node = await fetchLatestBlueprint(context, undefined);
  return node?.definition ? { displayName: node.displayName ?? '', definition: node.definition } : null;
}

export type CreateTemplatePreview = {
  blueprintName: string;
  tables: ConfirmPreviewTable[];
};

// The create_template confirm preview — the source blueprint's name and its
// tables, parsed into the shape the renderer's TableCard reuses. Best-effort: any
// failure yields no tables rather than blocking the confirm.
export async function createTemplatePreviewTables(
  context: ProjectContext,
  blueprintName: string | undefined,
): Promise<CreateTemplatePreview> {
  try {
    const blueprint = await findProjectBlueprint(context, blueprintName);
    if (!blueprint) return { blueprintName: '', tables: [] };
    return {
      blueprintName: blueprint.displayName,
      tables: parseTemplateTables(blueprint.definition),
    };
  } catch (err) {
    console.warn('[db-tools] create_template preview lookup failed:', err);
    return { blueprintName: '', tables: [] };
  }
}

async function findTemplate(client: ModulesClient, displayName: string): Promise<{ id: string; definition: unknown }> {
  const result = await client.blueprintTemplate
    .findMany({
      select: { id: true, displayName: true, definition: true },
      where: { displayName: { equalTo: displayName } },
      first: 1,
    })
    .unwrap();

  const template = result.blueprintTemplates?.nodes?.[0];
  if (!template?.id) {
    throw new ToolFailureError({
      code: 'not-found',
      message: `Template "${displayName}" not found.`,
      hint: 'Check the template names that exist, then retry.',
      calls: [suggest('list_templates', {}, 'See the templates that exist')],
    });
  }
  return { id: template.id, definition: template.definition };
}

/** What update_template and delete_template check before they change anything: the project, and the template. */
export async function templateReady(params: { templateName: string }, cwd: string): Promise<Result<{ context: ProjectContext; templateId: string }>> {
  const ready = await projectReady(cwd);
  if (ready.kind === 'failed') return ready;
  try {
    return { kind: 'ok', value: { context: ready.value, templateId: (await findTemplate(ready.value.modules, params.templateName)).id } };
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, `Failed to read the template "${params.templateName}"`) };
  }
}

function done(message: string) {
  return { content: [{ type: 'text' as const, text: message }], details: { success: true, message } };
}

function fail(failure: ToolFailure) {
  return failedResult<TemplateDetails>(failure, { success: false, message: failureText(failure) });
}

// ── list_templates ────────────────────────────────────────────────────────

const ListTemplatesZod = strictObject('the input', {});

export const listTemplatesTool: HarnessTool<typeof ListTemplatesZod, ListTemplatesDetails> = {
  name: 'list_templates',
  label: 'List templates',
  description:
    'List the blueprint templates this account can apply to the project database: its own and the public ones (display name, description, categories, table count). Read-only — these are a template catalog, not the project schema.',
  promptSnippet:
    'list_templates: list the available blueprint templates to apply. Read-only — call before apply_template.',
  parameters: ListTemplatesZod,
  effect: 'read',
  async execute(_params: z.infer<typeof ListTemplatesZod>, ctx) {
    const ready = await projectReady(ctx.cwd);
    if (ready.kind === 'failed') return failedResult(ready.failure, { templates: [] });

    let result;
    try {
      result = await ready.value.modules.blueprintTemplate
        .findMany({
          select: {
            id: true,
            version: true,
            displayName: true,
            description: true,
            categories: true,
            definition: true,
          },
          orderBy: ['NAME_ASC'],
        })
        .execute();
    } catch (err) {
      return failedResult(failureFromError(err, 'Failed to read templates'), { templates: [] });
    }

    if (!result.ok) return failedResult(failureFromErrors(result.errors, 'Failed to read templates'), { templates: [] });

    const templates: TemplateInfo[] = (result.data.blueprintTemplates?.nodes ?? []).map(
      (template) => ({
        id: template.id,
        version: template.version ?? null,
        displayName: template.displayName ?? '',
        description: template.description ?? null,
        categories: Array.isArray(template.categories) ? template.categories : [],
        tables: parseTemplateTables(template.definition),
      }),
    );

    return {
      content: [{ type: 'text', text: formatTemplatesText(templates) }],
      details: { templates },
    };
  },
};

// ── create_template ───────────────────────────────────────────────────────

const CreateTemplateZod = strictObject('the input', {
  displayName: textParam().describe('Display name for the new blueprint template'),
  blueprintName: textParam()
    .describe(
      'Display name of an existing project blueprint to save as the template. Defaults to the most recently provisioned blueprint.',
    )
    .optional(),
  description: z.string().describe('Description shown in the template catalog').optional(),
  categories: z
    .array(textParam())
    .describe('Categories for catalog grouping and discovery')
    .optional(),
});

export const createTemplateTool: HarnessTool<typeof CreateTemplateZod, CreateTemplateDetails> = {
  name: 'create_template',
  label: 'Create template',
  description:
    'Save an existing project blueprint as a reusable blueprint template in the account\'s template catalog; it stays private until it is made public. Defaults to the most recently provisioned blueprint; give the display name of a blueprint to pick a specific one. Gated.',
  promptSnippet:
    'create_template: save a project blueprint to the reusable template catalog. Gated.',
  parameters: CreateTemplateZod,
  effect: 'write',
  async execute(params: z.infer<typeof CreateTemplateZod>, ctx) {
    const ready = await ownedProjectReady(ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { modules, ownerId } = ready.value;

    try {
      const blueprint = await findProjectBlueprint(ready.value, params.blueprintName);
      if (!blueprint) {
        const which = params.blueprintName ? `"${params.blueprintName}"` : 'any blueprint';
        return fail({
          code: 'not-found',
          message: `No project blueprint found (${which}).`,
          hint: 'Create tables from a blueprint first, then retry.',
        });
      }

      const base = params.displayName.toLowerCase().replace(/\s+/g, '_');
      const created = await modules.blueprintTemplate
        .create({
          data: {
            ownerId,
            name: `${base}_${Date.now()}`,
            displayName: params.displayName,
            description: params.description,
            categories: params.categories,
            definition: blueprint.definition as Record<string, unknown>,
          },
          select: { id: true, displayName: true },
        })
        .unwrap();
      if (!created.createBlueprintTemplate?.blueprintTemplate) {
        return fail(noRowCreated(`Failed to create template "${params.displayName}"`, suggest('list_templates', {}, 'See the templates that exist')));
      }

      const message = `Created template "${params.displayName}"`;
      return {
        content: [{ type: 'text' as const, text: message }],
        details: {
          success: true,
          message,
          displayName: params.displayName,
          blueprintName: blueprint.displayName,
          tables: parseTemplateTables(blueprint.definition),
        },
      };
    } catch (err) {
      return fail(failureFromError(err, `Failed to create template "${params.displayName}"`));
    }
  },
};

// ── apply_template ────────────────────────────────────────────────────────

const ApplyTemplateZod = strictObject('the input', {
  templateName: textParam().describe('The display name of the blueprint template to apply'),
  nameOverride: textParam()
    .describe(
      'Optional name override for the created blueprint (snake_case). Defaults to template name.',
    )
    .optional(),
});

type ApplyTemplateParams = z.infer<typeof ApplyTemplateZod>;

/**
 * What apply_template checks before it changes anything: an owned project,
 * the template, and none of its tables in the project yet.
 */
export async function applyTemplateReady(
  params: ApplyTemplateParams,
  cwd: string,
): Promise<Result<{ context: ProjectContext & { ownerId: string }; templateId: string }>> {
  const ready = await ownedProjectReady(cwd);
  if (ready.kind === 'failed') return ready;
  let template: { id: string; definition: unknown };
  try {
    template = await findTemplate(ready.value.modules, params.templateName);
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, `Failed to read the template "${params.templateName}"`) };
  }
  const taken = await tablesTaken(ready.value, parseTemplateTables(template.definition).map((table) => ({ name: table.name })));
  return taken ? { kind: 'failed', failure: taken } : { kind: 'ok', value: { context: ready.value, templateId: template.id } };
}

export const applyTemplateTool: HarnessTool<typeof ApplyTemplateZod, TemplateDetails> = {
  name: 'apply_template',
  label: 'Apply template',
  description:
    'Apply an existing blueprint template to the project database, creating its tables. Use the template display name, as the template list gives it.',
  promptSnippet: 'apply_template: provision a saved blueprint template by display name. Gated.',
  parameters: ApplyTemplateZod,
  effect: 'write',
  async execute(params: ApplyTemplateParams, ctx) {
    const ready = await applyTemplateReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { context, templateId } = ready.value;
    const { modules, databaseId, schemaId, ownerId } = context;

    try {
      const base = params.nameOverride ?? params.templateName.toLowerCase().replace(/\s+/g, '_');
      const nameOverride = `${base}_${Date.now()}`;

      const copyResult = await modules.mutation
        .copyTemplateToBlueprint(
          { input: { templateId, databaseId, ownerId, nameOverride } },
          { select: { result: true } },
        )
        .unwrap();

      const blueprintId = copyResult.copyTemplateToBlueprint?.result;
      if (!blueprintId) return fail(noRowCreated(`Failed to apply template "${params.templateName}"`, DESCRIBE_SCHEMA));

      const { tables } = await buildBlueprint(
        modules,
        { blueprintId, schemaId },
        { signal: ctx.signal },
      );

      const createdCount = Object.keys(tables).length;
      // The construction maps the template's table names to ids; the backend may store a name in another form.
      const stored = await storedTableNames(context, Object.values(tables)).catch(() => new Map<string, string>());
      const names = Object.entries(tables).map(([given, id]) => {
        const as = stored.get(id) ?? given;
        return as === given ? as : `${as} (stored from "${given}")`;
      });
      return done(
        `Applied template "${params.templateName}" — created ${createdCount} table${createdCount === 1 ? '' : 's'}${names.length ? `: ${names.join(', ')}` : ''}`,
      );
    } catch (err) {
      return fail(failureFromError(err, `Failed to apply template "${params.templateName}"`));
    }
  },
};

// ── update_template ───────────────────────────────────────────────────────

const UpdateTemplateZod = strictObject('the input', {
  templateName: textParam().describe('The display name of the blueprint template to update'),
  patch: strictObject('a patch', {
    displayName: textParam().describe('New display name').optional(),
    description: z.string().describe('New description').optional(),
    categories: z.array(textParam()).describe('New categories').optional(),
    tags: z.array(textParam()).describe('New tags').optional(),
    visibility: z.enum(['private', 'public']).describe('New visibility').optional(),
  }),
});

export const updateTemplateTool: HarnessTool<typeof UpdateTemplateZod, TemplateDetails> = {
  name: 'update_template',
  label: 'Update template',
  description: 'Update a blueprint template’s metadata (display name, description, categories, tags, visibility).',
  promptSnippet: 'update_template: edit a saved template’s metadata by display name. Gated.',
  parameters: UpdateTemplateZod,
  effect: 'write',
  async execute(params: z.infer<typeof UpdateTemplateZod>, ctx) {
    const ready = await templateReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { context, templateId } = ready.value;
    try {
      const result = await context.modules.blueprintTemplate
        .update({
          where: { id: templateId },
          data: params.patch,
          select: { id: true, displayName: true },
        })
        .unwrap();
      if (!result.updateBlueprintTemplate?.blueprintTemplate) {
        return fail(noRowsChanged(`Failed to update template "${params.templateName}"`, suggest('list_templates', {}, 'See the templates that exist')));
      }
      return done(`Updated template "${params.templateName}"`);
    } catch (err) {
      return fail(failureFromError(err, `Failed to update template "${params.templateName}"`));
    }
  },
};

// ── delete_template ───────────────────────────────────────────────────────

const DeleteTemplateZod = strictObject('the input', {
  templateName: textParam().describe('The display name of the blueprint template to delete'),
});

export const deleteTemplateTool: HarnessTool<typeof DeleteTemplateZod, TemplateDetails> = {
  name: 'delete_template',
  label: 'Delete template',
  description: 'Permanently delete a blueprint template by its display name.',
  promptSnippet: 'delete_template: remove a saved template by display name. Destructive — gated.',
  parameters: DeleteTemplateZod,
  effect: 'destructive',
  async execute(params: z.infer<typeof DeleteTemplateZod>, ctx) {
    const ready = await templateReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { context, templateId } = ready.value;
    try {
      const result = await context.modules.blueprintTemplate
        .delete({ where: { id: templateId }, select: { id: true } })
        .unwrap();
      if (!result.deleteBlueprintTemplate?.blueprintTemplate) {
        return fail(noRowsChanged(`Failed to delete template "${params.templateName}"`, suggest('list_templates', {}, 'See the templates that exist')));
      }
      return done(`Deleted template "${params.templateName}"`);
    } catch (err) {
      return fail(failureFromError(err, `Failed to delete template "${params.templateName}"`));
    }
  },
};
