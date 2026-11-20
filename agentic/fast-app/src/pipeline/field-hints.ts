// Per-field hints `_meta` can't give (CONTRACT v1.2): a status column's
// allowed values (a CHECK), an owner column the signed-in user fills, a
// column a trigger copies from the parent row. For a curated blueprint they
// come from its nodes, as blueprints/curated.ts reads them; for custom
// entities from the AppSpec.
// The generator reads them from `ui.resources.<table>.fields`, and the CRUD
// smoke and the seed honor the same rules.

import type { AppSpec, FieldUiSpec } from '../app-spec';
import { SCOPE_DEFAULT_PREFIX } from '../app-spec/contract/app-spec.types';
import { scopeColumn, scopeOfAccess } from '../app-spec/scope-access';
import type { ScopeInfo } from '../app-spec/scope-tree';
import type { SpecModel } from '../app-spec/spec-model';
import { type CuratedBlueprint, curatedTables } from '../blueprints/curated';
import {
  CURRENT_USER_ID,
  type FieldHint,
  type FieldRules,
  normalizeKey,
} from '../extensions/db-tools/live-meta-index';
import { resourceUi } from './spec-ui';

/** Table → field → hint, spelled as in the spec or the blueprint. */
export type SpecFieldHints = Record<string, Record<string, FieldUiSpec>>;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v !== '') : [];

export function blueprintFieldHints(curated: CuratedBlueprint | undefined): SpecFieldHints {
  const hints: SpecFieldHints = {};
  const add = (table: string, field: string, hint: FieldUiSpec) => {
    const fields = (hints[table] ??= {});
    fields[field] = { ...fields[field], ...hint };
  };
  for (const table of curated ? curatedTables(curated).values() : []) {
    if (table.ownerField) {
      // A key an entity's membership guards follows the app's active workspace.
      const fill = table.ownerScope
        ? `${SCOPE_DEFAULT_PREFIX}${table.ownerScope}`
        : CURRENT_USER_ID;
      add(table.name, table.ownerField, { hidden: true, default: fill });
    }
    for (const field of table.inherited) add(table.name, field, { hidden: true, required: false });
    for (const [field, options] of table.statusValues) add(table.name, field, { options });
  }
  return hints;
}

/**
 * The database's own word on its entity types, curated or custom: an entity's
 * owner column names its parent (a property's organization), so a new entity
 * joins the one the app's workspace has active. Only a parent a workspace can
 * switch to (an organization) has an active one; a child of another entity
 * keeps its owner column on the form.
 */
export function scopeFieldHints(tree: readonly ScopeInfo[]): SpecFieldHints {
  const hints: SpecFieldHints = {};
  const workspaces = new Set(tree.filter((info) => info.usersTable).map((info) => info.scope));
  for (const info of tree) {
    if (!info.entityTable || !info.ownerField || !info.parent || !workspaces.has(info.parent))
      continue;
    hints[info.entityTable] = {
      [info.ownerField]: { hidden: true, default: `${SCOPE_DEFAULT_PREFIX}${info.parent}` },
    };
  }
  return hints;
}

/**
 * A scoped table's entity column, which no form shows: an organization's
 * takes the active workspace, and one a trigger copies from the parent row
 * needs nothing.
 */
export function accessFieldHints(model: SpecModel, tree: readonly ScopeInfo[]): SpecFieldHints {
  const hints: SpecFieldHints = {};
  for (const table of model.tables.values()) {
    if (table.origin !== 'entity' || !scopeOfAccess(table.access)) continue;
    const column = scopeColumn(model, table, tree);
    if ('problem' in column || column.kind === 'key') continue;
    hints[table.name] = {
      [column.field]:
        column.kind === 'workspace'
          ? { hidden: true, default: `${SCOPE_DEFAULT_PREFIX}${column.scope}` }
          : { hidden: true, required: false },
    };
  }
  return hints;
}

const isScopeDefault = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(SCOPE_DEFAULT_PREFIX);

/**
 * The hints for an app whose generator predates `$scope:` defaults: it would
 * send one as a literal value, so each fills the user's own id, as before.
 */
export function personalDefaults(hints: SpecFieldHints): SpecFieldHints {
  return Object.fromEntries(
    Object.entries(hints).map(([table, fields]) => [
      table,
      Object.fromEntries(
        Object.entries(fields).map(([field, hint]) => [
          field,
          isScopeDefault(hint.default) ? { ...hint, default: CURRENT_USER_ID } : hint,
        ]),
      ),
    ]),
  );
}

/** The spec for such an app: each `$scope:` default its fields name, its own or a hint's, fills the user's id. */
export function withPersonalDefaults(spec: AppSpec): AppSpec {
  const resources = spec.ui?.resources ?? {};
  const scoped = Object.values(resources).some((resource) =>
    Object.values(resource.fields ?? {}).some((hint) => isScopeDefault(hint.default)),
  );
  if (!scoped) return spec;
  const next = structuredClone(spec);
  for (const resource of Object.values(next.ui?.resources ?? {})) {
    if (resource.fields) resource.fields = personalDefaults({ fields: resource.fields }).fields;
  }
  return next;
}

const findKey = (keys: string[], wanted: string) =>
  keys.find((key) => normalizeKey(key) === normalizeKey(wanted));

/**
 * The spec with the hints merged into `ui.resources.<table>.fields`; what the
 * spec already says wins, but for one case. An earlier desktop wrote
 * `$currentUserId` on a key that a workspace's membership guards, and
 * app-spec.json kept it. Both put a row in the user's personal workspace
 * when the app has no switcher; with one, only the `$scope:` hint puts it in
 * the active workspace, so that hint replaces it.
 */
export function withFieldHints(spec: AppSpec, hints: SpecFieldHints): AppSpec {
  if (!Object.keys(hints).length) return spec;
  const next = structuredClone(spec);
  for (const [table, fields] of Object.entries(hints)) {
    const existing = (resourceUi(next, table).fields ??= {});
    for (const [field, hint] of Object.entries(fields)) {
      const fieldKey = findKey(Object.keys(existing), field) ?? field;
      const own = existing[fieldKey];
      const scoped = own?.default === CURRENT_USER_ID && isScopeDefault(hint.default);
      existing[fieldKey] = { ...hint, ...own, ...(scoped && { default: hint.default }) };
    }
  }
  return next;
}

/** The rules the CRUD smoke and the seed honor: custom enums plus every field hint in the spec. */
export function fieldRules(spec: AppSpec): FieldRules {
  const rules: FieldRules = {};
  const add = (table: string, field: string, hint: FieldHint) => {
    const fields = (rules[normalizeKey(table)] ??= {});
    fields[normalizeKey(field)] = { ...fields[normalizeKey(field)], ...hint };
  };
  if (spec.backend.kind === 'custom') {
    for (const entity of spec.backend.entities) {
      for (const field of entity.fields) {
        if (field.enum?.length) add(entity.name, field.name, { options: field.enum });
      }
    }
  }
  const resources = (spec.ui as { resources?: Record<string, { fields?: unknown }> } | undefined)
    ?.resources;
  for (const [table, resource] of Object.entries(resources ?? {})) {
    const fields = resource?.fields;
    if (!fields || typeof fields !== 'object') continue;
    for (const [field, raw] of Object.entries(fields as Record<string, unknown>)) {
      if (!raw || typeof raw !== 'object') continue;
      const hint = raw as Record<string, unknown>;
      add(table, field, {
        ...(strings(hint.options).length ? { options: strings(hint.options) } : {}),
        ...(typeof hint.required === 'boolean' ? { required: hint.required } : {}),
        ...('default' in hint ? { default: hint.default } : {}),
      });
    }
  }
  return rules;
}
