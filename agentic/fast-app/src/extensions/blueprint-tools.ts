import { readConstructionFailure } from '@agentic-kit/db-tools/blueprint-construction';
import type { ProjectContext } from '@agentic-kit/pi';
import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';
import { type Static, Type } from 'typebox';

import { CURATED_BLUEPRINTS } from '../blueprints/curated';
import { projectContext } from '../pipeline/project-env';
import { BLUEPRINT_LEGEND, describeBlueprint } from './blueprint-summary';
import {
  type BlueprintPort,
  constructionRejection,
  provisionTemplate,
  type ProvisionTemplateResult,
  type ProvisionTemplateStatus,
} from './provision-template';

export { CURATED_BLUEPRINTS };

const ProvisionTemplateSchema = Type.Object({
  slug: Type.String({
    minLength: 1,
    description: 'Curated blueprint slug from list_blueprints, e.g. "agent".',
  }),
});

type ProvisionTemplateParams = Static<typeof ProvisionTemplateSchema>;

export type ProvisionTemplateDetails = {
  slug: string;
  status: ProvisionTemplateStatus;
  entityTypes: string[];
  tables: number;
  error: string | null;
};

// The modules client calls `provisionTemplate` needs, scoped to one database.
export function blueprintPort(context: ProjectContext, ownerId: string): BlueprintPort {
  const { modules, databaseId, schemaId } = context;
  return {
    async findBlueprintId(name) {
      const res = await modules.blueprint
        .findMany({
          where: { databaseId: { equalTo: databaseId }, name: { equalTo: name } },
          select: { id: true },
        })
        .unwrap();
      return res.blueprints?.nodes?.[0]?.id as string | undefined;
    },
    async createBlueprint(bp) {
      const created = await modules.blueprint
        .create({
          data: {
            ownerId,
            databaseId,
            name: bp.name,
            displayName: bp.display_name,
            description: bp.description,
            definition: bp,
          },
          select: { id: true },
        })
        .unwrap();
      const id = created.createBlueprint?.blueprint?.id as string | undefined;
      if (!id) throw new Error('The backend did not return the new blueprint.');
      return id;
    },
    async constructions(blueprintId) {
      // No error column here: older backends lack it, and naming it fails the
      // whole query. failureReason reads it on its own.
      const res = await modules.blueprintConstruction
        .findMany({
          where: { blueprintId: { equalTo: blueprintId } },
          select: { id: true, status: true },
        })
        .unwrap();
      return (res.blueprintConstructions?.nodes ?? []).map((n) => ({
        id: String(n.id),
        status: String(n.status),
      }));
    },
    async construct(blueprintId) {
      try {
        await modules.mutation
          .constructBlueprint({ input: { blueprintId, schemaId } }, { select: { result: true } })
          .unwrap();
      } catch (err) {
        throw constructionRejection(err) ?? err;
      }
    },
    failureReason: (constructionId) => readConstructionFailure(modules, constructionId),
    async entityTypes() {
      const res = await modules.entityTypeProvision
        .findMany({
          where: { databaseId: { equalTo: databaseId } },
          select: { prefix: true, outMembershipType: true, outEntityTableName: true },
        })
        .unwrap();
      return (res.entityTypeProvisions?.nodes ?? []).map((n) => ({
        prefix: String(n.prefix),
        membershipType: n.outMembershipType,
        entityTableName: n.outEntityTableName,
      }));
    },
  };
}

/**
 * Applies a curated blueprint to the database bound in `<cwd>/.env`. The
 * provision_template tool and the app pipeline both come through here.
 */
export async function applyCuratedBlueprint(
  slug: string,
  options: { cwd: string; signal?: AbortSignal; onProgress?: (text: string) => void },
): Promise<ProvisionTemplateResult> {
  const bp = CURATED_BLUEPRINTS[slug];
  if (!bp) {
    throw new Error(
      `Unknown blueprint "${slug}". Blueprints: ${Object.keys(CURATED_BLUEPRINTS).join(', ')}.`,
    );
  }
  const resolved = await projectContext(options.cwd);
  if (!resolved.context) {
    throw new Error(
      resolved.reason ?? 'The project has no database yet; run provision_database first.',
    );
  }
  const { ownerId } = resolved.context;
  if (!ownerId) throw new Error('Not authenticated (missing OWNER_ID in .env).');
  return provisionTemplate(blueprintPort(resolved.context, ownerId), bp, {
    signal: options.signal,
    onProgress: options.onProgress,
  });
}

export const blueprintTools: ExtensionFactory = (pi) => {
  pi.registerTool({
    name: 'list_blueprints',
    label: 'List blueprints',
    description:
      'List the curated Constructive blueprints (complete backends, such as the agent conversations backend) that an AppSpec can name as backend.kind "blueprint" and that provision_template can apply to the project database, with each table and the columns its seed rows fill.',
    promptSnippet:
      'list_blueprints: the curated backend blueprints, with their tables and columns.',
    parameters: Type.Object({}),
    async execute() {
      const text = [
        'Curated blueprints (use the slug as backend.slug in an AppSpec, or apply with provision_template).',
        BLUEPRINT_LEGEND,
        ...Object.values(CURATED_BLUEPRINTS).map(describeBlueprint),
      ].join('\n\n');
      return {
        content: [{ type: 'text', text }],
        details: { slugs: Object.keys(CURATED_BLUEPRINTS) },
      };
    },
  });

  pi.registerTool({
    name: 'provision_template',
    label: 'Provision template',
    description:
      'Apply a curated blueprint (list_blueprints) to the project database: entity types with their memberships, profiles, invites, limits and storage, plus its tables. Runs once per database; it takes a minute or two. Afterwards call describe_live_schema.',
    promptSnippet:
      'provision_template: apply a curated blueprint, such as agent, to the project database.',
    parameters: ProvisionTemplateSchema,
    async execute(_toolCallId, params: ProvisionTemplateParams, signal, onUpdate, ctx) {
      const bp = CURATED_BLUEPRINTS[params.slug];
      const base = {
        slug: params.slug,
        entityTypes: (bp?.entity_types ?? []).map((e) => e.prefix),
        tables: bp?.tables?.length ?? 0,
      };
      const result = await applyCuratedBlueprint(params.slug, {
        cwd: ctx.cwd,
        signal,
        onProgress: (text) =>
          onUpdate?.({
            content: [{ type: 'text', text }],
            details: { ...base, status: 'failed', error: null },
          }),
      });
      return {
        content: [{ type: 'text', text: result.text }],
        details: {
          ...base,
          status: result.status,
          error: result.error,
        } satisfies ProvisionTemplateDetails,
      };
    },
  });
};
