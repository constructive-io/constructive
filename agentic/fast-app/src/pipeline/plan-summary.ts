// What the plan card says: the AppSpec reduced to what the user approves.
// Pure, so it reads the same live and in a test.

import type {
  BlueprintExtend,
  SpecEntity,
  SpecField,
  SpecFieldType,
} from '../app-spec';
import type { AppBuildPlan, AppPlanEntity, AppPlanField, AppPlanPrompt } from './app-plan';
import { type BuildPlan, cardChanges, prevOf } from './build-plan';

/** A field's type in the user's words, on the card's schema diff. */
export const TYPE_WORDS: Record<SpecFieldType, string> = {
  text: 'text',
  long_text: 'long text',
  integer: 'whole number',
  decimal: 'number',
  money: 'money',
  boolean: 'yes or no',
  date: 'date',
  timestamp: 'date and time',
  email: 'email',
  url: 'url',
  uuid: 'id',
  json: 'json',
};

function fieldOf(field: SpecField): AppPlanField {
  const values = field.enum?.length ? field.enum : null;
  return {
    name: field.name,
    type: values ? 'one of' : (TYPE_WORDS[field.type] ?? field.type),
    ...(field.required ? { required: true as const } : {}),
    ...(values ? { values: [...values] } : {}),
  };
}

function entityOf(entity: SpecEntity): AppPlanEntity {
  return {
    name: entity.name,
    ...(entity.label ? { label: entity.label } : {}),
    access: entity.access ?? 'shared',
    fields: entity.fields.length,
    belongsTo: (entity.belongsTo ?? []).map((link) => link.to),
    columns: entity.fields.map(fieldOf),
    keys: (entity.belongsTo ?? []).map(({ field, to }) => ({ field, to })),
  };
}

function extensionOf(extend: BlueprintExtend) {
  const names = new Set([
    ...Object.keys(extend.fields ?? {}),
    ...Object.keys(extend.belongsTo ?? {}),
  ]);
  return {
    entities: (extend.entities ?? []).map(entityOf),
    links: (extend.links ?? []).map((link) => link.between),
    tables: [...names].map((name) => ({
      name,
      columns: (extend.fields?.[name] ?? []).map(fieldOf),
      keys: (extend.belongsTo?.[name] ?? []).map(({ field, to }) => ({ field, to })),
    })),
  };
}

export function describePlan(
  plan: BuildPlan,
  context: {
    /** The project's name, as the sidebar shows it. */
    project?: string;
    databaseName: string;
    /** The project's .env names the database already. */
    databaseBound: boolean;
    account: AppPlanPrompt['account'];
  },
): AppPlanPrompt {
  const { spec, delta } = plan;
  // A follow-up on a built app: the card lists its changes, and the rows it adds.
  const update = prevOf(plan) !== null;
  const backend: AppPlanPrompt['backend'] =
    spec.backend.kind === 'blueprint'
      ? {
        kind: 'blueprint',
        slug: spec.backend.slug,
        ...(spec.backend.extend ? { extend: extensionOf(spec.backend.extend) } : {}),
      }
      : {
        kind: 'custom',
        entities: spec.backend.entities.map(entityOf),
        links: (spec.backend.links ?? []).map((link) => link.between),
      };
  const seedRows = update
    ? delta.seed.rows
    : Object.values(spec.seed ?? {}).reduce((sum, rows) => sum + rows.length, 0);

  return {
    name: spec.name,
    ...(spec.tagline ? { tagline: spec.tagline } : {}),
    ...(context.project ? { project: context.project } : {}),
    databaseName: context.databaseName,
    ...(!update && context.databaseBound ? { databaseBound: true as const } : {}),
    backend,
    seedRows,
    // A table the record knows no sample rows of gets them only while it is empty.
    ...(update && seedRows && plan.seedIfEmpty.length ? { seedOnlyIfEmpty: true as const } : {}),
    nav: spec.ui?.nav ?? [],
    account: context.account,
    warnings: update ? delta.warnings : [],
    ...(update ? { changes: cardChanges(delta), unchanged: unchangedParts(plan) } : {}),
    ...(plan.outside.length ? { outside: plan.outside } : {}),
  };
}

// What a follow-up leaves as it was: no schema change, no new sample rows, the
// same sidebar.
function unchangedParts(plan: BuildPlan): AppPlanPrompt['unchanged'] {
  const { spec, delta } = plan;
  const prev = prevOf(plan);
  const sameNav = JSON.stringify(spec.ui?.nav ?? []) === JSON.stringify(prev?.ui?.nav ?? []);
  return [
    ...(delta.additions.length || delta.destructive.length ? [] : (['tables'] as const)),
    ...(delta.seed.rows ? [] : (['seed'] as const)),
    ...(sameNav ? (['nav'] as const) : []),
  ];
}

/** The plan the build card keeps once approved: no account, and only the ticked destructive changes. */
export function approvedPlan(prompt: AppPlanPrompt, ticked: readonly string[]): AppBuildPlan {
  const { account: _account, ...plan } = prompt;
  if (!plan.changes) return plan;
  const destructive = plan.changes.destructive.filter((change) => ticked.includes(change.id));
  return { ...plan, changes: { ...plan.changes, destructive } };
}
