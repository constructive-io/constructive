// plan_app takes an AppSpec. The JSON Schema that ships in the composed app is
// the contract, but it is not the tool's parameter schema: pi sends a provider
// only the top-level properties (the `$defs` are dropped, so the model would
// see dangling refs), and pi's own pre-check reports a failed `if/then` as
// "must match then schema" before plan_app can say which field is wrong. So
// the parameters stay loose, the tool points the model at the schema file in
// the project's app, and plan_app validates against it with exact paths.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { TSchema } from 'typebox';

import {
  APP_SPEC_SCHEMA_FILE as SCHEMA_FILE,
  type AppSpec,
  validateAppSpec,
  type ValidateOptions,
} from '../app-spec';
import type { ScopeInfo } from '../app-spec/scope-tree';
import { specModel } from '../app-spec/spec-model';
import { CURATED_BLUEPRINTS } from '../extensions/blueprint-tools';
import {
  accessFieldHints,
  blueprintFieldHints,
  scopeFieldHints,
  withFieldHints,
  withPersonalDefaults,
} from '../pipeline/field-hints';
import type { FastAppServices } from '../pipeline/host';

/** Where every project's app keeps the schema, relative to the project. */
export const APP_SPEC_SCHEMA_FILE_IN_PROJECT = `packages/app/${SCHEMA_FILE}`;

const SEE_SCHEMA = `See ${APP_SPEC_SCHEMA_FILE_IN_PROJECT}.`;

const LOOSE_PARAMETERS = {
  type: 'object',
  required: ['version', 'name', 'backend'],
  properties: {
    version: { type: 'integer', enum: [1] },
    name: { type: 'string' },
    tagline: { type: 'string' },
    backend: {
      type: 'object',
      description: `A curated blueprint or custom entities. ${SEE_SCHEMA}`,
    },
    seed: { type: 'object', description: `Sample rows per table. ${SEE_SCHEMA}` },
    ui: { type: 'object', description: `Sidebar, resource and dashboard hints. ${SEE_SCHEMA}` },
  },
};

export function appSpecParameters(): TSchema {
  return LOOSE_PARAMETERS as unknown as TSchema;
}

/**
 * The schema plan_app validates against: the project's own copy (the one the
 * model read), else the app template's (desktop: the snapshot's, else the
 * template checkout's).
 */
export async function loadAppSpecSchema(
  cwd: string,
  services: Pick<FastAppServices, 'template'>,
): Promise<Record<string, unknown>> {
  const own = path.join(cwd, APP_SPEC_SCHEMA_FILE_IN_PROJECT);
  const template = existsSync(own) ? null : await services.template.schemaFile();
  const file = existsSync(own) ? own : template;
  if (!file) throw new Error('No AppSpec schema: the app template snapshot is not available.');
  return JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
}

/** Validation errors as the tool results list them: "<path>: <what to change>". */
export const errorLines = (errors: ReadonlyArray<{ path: string; message: string }>) =>
  errors.map((e) => `${e.path}: ${e.message}`);

/** Whether the app's generator reads `$scope:<scope>` defaults: its schema copy names scopes. */
const knowsScopeDefaults = (schema: Record<string, unknown>) =>
  Boolean((schema.$defs as Record<string, unknown> | undefined)?.scopeName);

// What `_meta` can't say (CONTRACT v1.2), as field hints the generator and the
// CRUD smoke read: the scope tree's entity types (each one's owner column
// follows the parent's workspace), then a curated blueprint's own nodes. The
// spec's own hints win, then the tree's. An app copy whose schema predates
// field hints keeps the spec as approved, and one whose generator predates
// `$scope:` defaults gets the user's own id in their place.
export function withSpecHints(
  spec: AppSpec,
  schema: Record<string, unknown>,
  options: ValidateOptions,
  tree: readonly ScopeInfo[],
): AppSpec {
  const blueprint =
    spec.backend.kind === 'blueprint' ? CURATED_BLUEPRINTS[spec.backend.slug] : undefined;
  const model = specModel(spec, CURATED_BLUEPRINTS, options.entityTables);
  const merged = withFieldHints(
    withFieldHints(withFieldHints(spec, accessFieldHints(model, tree)), scopeFieldHints(tree)),
    blueprintFieldHints(blueprint),
  );
  const enriched = knowsScopeDefaults(schema) ? merged : withPersonalDefaults(merged);
  if (enriched === spec) return spec;
  const checked = validateAppSpec(enriched, schema, options);
  if ('spec' in checked) return checked.spec;
  console.warn(`[fast-app] field hints left out: ${errorLines(checked.errors).join('; ')}`);
  return spec;
}
