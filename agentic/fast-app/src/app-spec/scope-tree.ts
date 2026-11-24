// The membership scopes of an app's database: `app` (everyone who uses the
// app), `org` (organizations, rows of the users table) and every entity type
// a blueprint adds (`data_room`, `team`, …). The AppSpec's opt-in screens name
// them (`ui.workspace`, `ui.access`, `ui.resources.<table>.panels`); this file
// says what each scope offers and refuses a spec that names one wrongly.
// Pure: the live tree comes from the modules API (scope-tree-load.ts), the
// planned one from the blueprint about to be applied.

import { type CuratedBlueprint, ENTITY_OWNER_FIELD } from '../blueprints/curated';
import { normalizeKey, scopeOfDefault } from './contract/app-spec.types';
import type { AppSpec } from './types';

export type ScopeInfo = {
  scope: string;
  /** The scope its entities belong to; null for `app`. */
  parent: string | null;
  /** The SQL table of its entities; null for `app`, and for `org`, whose entities are users. */
  entityTable: string | null;
  /**
   * The entity table's column that names the entity's parent (a data room's
   * organization): the database's memberships module's, or for a first build
   * the one the backend will make. Null for `app` and `org`.
   */
  ownerField: string | null;
  /** Its entities are rows of the users table (an organization), so a workspace can switch to them. */
  usersTable: boolean;
  /** Members of the parent scope list its entities; false keeps them to their own members. */
  visible: boolean;
  files: boolean;
  /**
   * An entity type's membership type, which a policy on its entities names;
   * null until the database has the type (a first build's blueprint makes it).
   */
  membershipType?: number | null;
};

/** What Desktop's databases always have: the `b2b:storage` preset's app and org scopes. */
const BUILT_IN: ScopeInfo[] = [
  {
    scope: 'app',
    parent: null,
    entityTable: null,
    ownerField: null,
    usersTable: false,
    visible: true,
    files: true,
  },
  {
    scope: 'org',
    parent: 'app',
    entityTable: null,
    ownerField: null,
    usersTable: true,
    visible: true,
    files: true,
  },
];

type EntityTypeRow = {
  prefix: string;
  parentEntity?: string | null;
  tableName?: string | null;
  isVisible?: boolean | null;
  ownerField?: string | null;
  storage?: unknown;
  membershipType?: number | null;
};

function entityScope(row: EntityTypeRow, files: boolean): ScopeInfo {
  return {
    scope: row.prefix,
    parent: row.parentEntity || 'org',
    entityTable: row.tableName || `${row.prefix}s`,
    ownerField: row.ownerField ?? null,
    usersTable: false,
    visible: row.isVisible !== false,
    files,
    membershipType: row.membershipType ?? null,
  };
}

/** The live tree: the scopes with memberships, entity types by their tables, files where storage is. */
export function scopeTreeFrom(input: {
  memberships: readonly { scope: string }[];
  storages: readonly { scope: string }[];
  entityTypes: readonly EntityTypeRow[];
}): ScopeInfo[] {
  const withFiles = new Set(input.storages.map((row) => row.scope));
  const entities = new Map(input.entityTypes.map((row) => [row.prefix, row]));
  return input.memberships.map(({ scope }) => {
    const builtIn = BUILT_IN.find((info) => info.scope === scope);
    const entity = entities.get(scope);
    if (builtIn) return { ...builtIn, files: withFiles.has(scope) };
    return entityScope(entity ?? { prefix: scope }, withFiles.has(scope));
  });
}

/** The tree a first build will make: the built-in scopes plus the blueprint's entity types. */
export function plannedScopeTree(blueprint: CuratedBlueprint | undefined): ScopeInfo[] {
  return [
    ...BUILT_IN,
    ...(blueprint?.entity_types ?? [])
      .filter((entity) => entity.name)
      .map((entity) =>
        entityScope(
          {
            prefix: entity.prefix,
            parentEntity: entity.parent_entity,
            tableName: entity.table_name,
            isVisible: entity.is_visible,
            ownerField: ENTITY_OWNER_FIELD,
          },
          Array.isArray(entity.storage) && entity.storage.length > 0,
        ),
      ),
  ];
}

const quote = (values: readonly string[]) => values.map((value) => `"${value}"`).join(', ');

/** Why the spec's scope screens don't fit the database's scopes; empty when they do. */
export function scopeFeatureErrors(
  spec: AppSpec,
  tree: readonly ScopeInfo[],
): Array<{ path: string; message: string }> {
  const errors: Array<{ path: string; message: string }> = [];
  const byScope = new Map(tree.map((info) => [info.scope, info]));
  const switchable = tree.filter((info) => info.usersTable).map((info) => info.scope);
  const workspace = spec.ui?.workspace?.scope;
  if (workspace && !byScope.get(workspace)?.usersTable) {
    errors.push({
      path: 'ui.workspace.scope',
      message: `"${workspace}" can't be a workspace: a workspace switches between organizations. Use ${quote(switchable)}.`,
    });
  }
  const pages = ['app', ...switchable];
  (spec.ui?.access ?? []).forEach((scope, index) => {
    if (pages.includes(scope)) return;
    errors.push({
      path: `ui.access[${index}]`,
      message: byScope.get(scope)?.entityTable
        ? `"${scope}" is an entity type: give its table "panels" with "members" instead of an access page.`
        : `This database has no "${scope}" scope. An access page takes ${quote(pages)}.`,
    });
  });
  for (const [table, ui] of Object.entries(spec.ui?.resources ?? {})) {
    if (!ui.panels) continue;
    const info = byScope.get(ui.panels.scope);
    const path = `ui.resources.${table}.panels.scope`;
    const entityTables = tree.filter((scope) => scope.entityTable);
    if (!info?.entityTable) {
      errors.push({
        path,
        message: `"${ui.panels.scope}" has no entity table. Panels belong on an entity type's table: ${
          entityTables.map((scope) => `${scope.entityTable} (scope "${scope.scope}")`).join(', ') ||
          'this database has none'
        }.`,
      });
    } else if (normalizeKey(info.entityTable) !== normalizeKey(table)) {
      errors.push({
        path,
        message: `"${table}" isn't the "${info.scope}" scope's entity table; that is "${info.entityTable}".`,
      });
    } else if (ui.panels.show.includes('files') && !info.files) {
      errors.push({
        path: `ui.resources.${table}.panels.show`,
        message: `The "${info.scope}" scope has no storage, so its records have no files to show.`,
      });
    }
  }
  // A `$scope:` default takes the scope's active one, and only a workspace has one.
  for (const [table, ui] of Object.entries(spec.ui?.resources ?? {})) {
    for (const [field, hint] of Object.entries(ui.fields ?? {})) {
      const scope = scopeOfDefault(hint.default);
      if (!scope || byScope.get(scope)?.usersTable) continue;
      errors.push({
        path: `ui.resources.${table}.fields.${field}.default`,
        message: `"$scope:${scope}" takes the active ${scope}, but only a workspace scope has an active one: use ${
          switchable.map((name) => `"$scope:${name}"`).join(' or ') || 'none in this database'
        }. To put a row under one ${scope} entity, give the table a key to its entity table.`,
      });
    }
  }
  return errors;
}

/** The scopes of entity types a rebuild makes again, from the last look at the gone database. */
export function recordedScopes(
  entityTypes: ReadonlyArray<{
    prefix: string;
    table: string;
    parentEntity?: string;
    isVisible?: boolean;
    storage?: unknown;
    membershipType?: number;
  }>,
): ScopeInfo[] {
  return entityTypes.map((type) => ({
    scope: type.prefix,
    parent: type.parentEntity ?? 'org',
    entityTable: type.table,
    ownerField: ENTITY_OWNER_FIELD,
    usersTable: false,
    visible: type.isVisible ?? true,
    files: Array.isArray(type.storage) ? type.storage.length > 0 : type.storage != null,
    // The type it is made again as; the rebuild checks the backend gives the same.
    membershipType: type.membershipType ?? null,
  }));
}

/** A first build's scopes on a database it hasn't built yet: the live ones, then the ones its blueprint adds. */
export function withPlannedScopes(
  live: readonly ScopeInfo[],
  planned: readonly ScopeInfo[],
): ScopeInfo[] {
  const have = new Set(live.map((info) => info.scope));
  return [...live, ...planned.filter((info) => !have.has(info.scope))];
}

/** The tree for the agent: what each scope is, and the AppSpec entry that shows it. */
// How an app gets a scope of its own, which no blueprint adds.
const OWN_SCOPE =
  '- A scope of the app\'s own, inside an organization (a clinic, a property, a team) with its own members and, with storage, its own files: once the project has a database (provision_database), make it with manage_entity_types (action "create", a singular prefix such as "clinic", parent_entity "org", has_storage true for files), then call describe_scopes again and plan_app. Its table is the prefix plus "s" (clinic: clinics; class: classs, so pick a prefix such as section). Choose the prefix before you create it: deleting an entity type leaves its table behind, and the table can\'t be dropped. Don\'t put one of these scopes inside another (a class inside a school) for now: the backend can\'t add members at the second level (constructive-planning#2526). Put each under "org", give a class a belongsTo key to its school, and tell the user that a school\'s members see only the rows of the scopes they are members of.';

export function describeScopeTree(tree: readonly ScopeInfo[]): string {
  const lines = tree.map((info) => {
    if (info.scope === 'app') {
      return '- app: everyone who signs up to the app. `"ui": { "access": ["app"] }` adds an Access page where the owner approves sign-ups and manages members, invitations and profiles. An app that other people use needs it: their sign-ups wait for the owner\'s approval, and this page is the only place in the app to give it.';
    }
    if (info.usersTable) {
      return `- ${info.scope}: organizations, which a user can create and invite people to. \`"ui": { "workspace": { "scope": "${info.scope}" } }\` adds a switcher between the user's personal workspace and their organizations; a key hinted \`"default": "$scope:${info.scope}"\` (plan_app adds it for a curated blueprint's organization keys) then takes the active one, and lists show its records. \`"access": ["${info.scope}"]\` manages the active organization's members. A table whose rows belong to one organization takes \`"access": { "scope": "${info.scope}" }\` on its entity: only that organization's members see its rows, and a new row joins the active one.`;
    }
    const files = info.files ? ' and files' : '';
    const visibility = info.visible ? '' : ' Only its members see an entity.';
    return `- ${info.scope}: entities in table ${info.entityTable}, under ${info.parent}.${visibility} \`"ui": { "resources": { "${info.entityTable}": { "panels": { "scope": "${info.scope}", "show": ["members"${info.files ? ', "files"' : ''}] } } } }\` puts its members${files} on each record's page. A table whose rows belong to one ${info.scope} entity takes \`"access": { "scope": "${info.scope}" }\` and a \`belongsTo\` to ${info.entityTable}, or to a table with that access, which its entity is copied from.`;
  });
  return [
    "Membership scopes of this database. Each screen below is opt-in: add it to the AppSpec only when the app needs it (a single-user app needs none). Signing in, every app shows a member the owner hasn't approved yet why they wait; the invitations waiting for a user show on the dashboard of any app with one of these screens.",
    ...lines,
    OWN_SCOPE,
  ].join('\n');
}
