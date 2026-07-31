/**
 * Granularity driver: restructure a pgpm module's deploy surface between the
 * atomic, object, and consolidated shapes.
 *
 * The upstream pass (`restructureSql` in `@pgsql/transform`) rewrites one SQL
 * script between equivalent shapes, guarded by the statement dependency
 * graph. This driver lifts that to the pgpm change model: it flattens a
 * module's deploy scripts in plan order into one program, restructures it to
 * the target granularity, then re-slices the result into changes — one change
 * per created object — with change dependencies recomputed from the statement
 * graph. Like the other drivers in this package it is structurally typed on
 * the bundle seams: no dependency on `@pgpmjs/bundle` or `@pgpmjs/core`.
 *
 * - `atomic`       — the machine-emitted shape: bare CREATE TABLE plus one
 *                    ALTER per column/constraint.
 * - `object`       — each table fully baked; cross-object statements
 *                    (FKs, indexes, triggers, policies) stay separate.
 * - `consolidated` — additionally inlines FKs proven safe by the graph.
 */
import type { Granularity, StatementFacts } from '@pgsql/transform';
import {
  buildStatementGraph,
  classifyStatements,
  restructureSql
} from '@pgsql/transform';

export type { Granularity } from '@pgsql/transform';

/** A change's deploy surface going into or out of the restructure. */
export interface GranularityChange {
  /** Change name (plan token, e.g. `schemas/app/tables/users`). */
  name: string;
  /** Change names this change requires (within the same module). */
  dependencies: string[];
  /** Deploy SQL (headerless — the caller owns pgpm headers). */
  deploy: string;
}

export interface RestructureModuleOptions {
  granularity: Granularity;
  /**
   * Derive a change name for a statement group from the facts of its primary
   * (creating) statement. Defaults to {@link defaultChangeName}: pgpm-style
   * `schemas/<schema>` / `schemas/<schema>/tables/<name>` paths.
   */
  changeName?: (facts: StatementFacts) => string;
}

export interface RestructureModuleResult {
  /** Restructured changes in deploy order, dependencies recomputed. */
  changes: GranularityChange[];
  /** Non-fatal notes (folds rejected to preserve ordering, etc.). */
  warnings: string[];
}

const KIND_DIRS: Partial<Record<StatementFacts['kind'], string>> = {
  table: 'tables',
  view: 'views',
  index: 'indexes',
  type: 'types',
  function: 'procedures',
  trigger: 'triggers',
  policy: 'policies',
  seed_dml: 'fixtures'
};

/**
 * Default pgpm-style change name for a statement group:
 * `schemas/<schema>` for schemas, `schemas/<schema>/<kind>/<name>` for
 * objects, `misc/<n>` when nothing better is known.
 */
export function defaultChangeName(facts: StatementFacts): string {
  const created = facts.creates[0];
  if (facts.kind === 'schema' && created) return `schemas/${created.name}`;
  if (created) {
    const dir = KIND_DIRS[facts.kind] ?? 'objects';
    const schema = created.schema ?? 'public';
    // Trigger/policy names are table-qualified (`table.trigger`).
    const name = created.name.replace(/\./g, '/');
    return `schemas/${schema}/${dir}/${name}`;
  }
  return 'misc/statements';
}

/**
 * Restructure a module's deploy changes to the target granularity.
 *
 * The flattened program is restructured as one script, then re-sliced: each
 * emitted statement joins the group of the object it creates (statements
 * creating nothing attach to the previous group), groups become changes named
 * by `changeName`, and change dependencies are the statement-graph edges
 * mapped onto owning groups. Requires `loadModule()` from `plpgsql-parser`.
 */
export function restructureChanges(
  changes: GranularityChange[],
  options: RestructureModuleOptions
): RestructureModuleResult {
  const nameFor = options.changeName ?? defaultChangeName;

  const flattened = changes
    .map(c => c.deploy.trim())
    .filter(Boolean)
    .join('\n\n');

  const { sql, warnings } = restructureSql(flattened, {
    granularity: options.granularity
  });

  // Re-classify the emitted script; group statements by the object they
  // target (creates[0]), so a table's CREATE and its remaining ALTERs land
  // in the same change regardless of statement kind.
  const facts = classifyStatements(sql);
  const graph = buildStatementGraph(facts);

  const groupOf: number[] = new Array(facts.length).fill(-1);
  const groupKeys: string[] = [];
  const groupFacts: StatementFacts[] = [];
  const groupKeyToIndex = new Map<string, number>();

  facts.forEach((f, i) => {
    const created = f.creates[0];
    if (!created) {
      // Statements creating nothing (grants, comments) ride with the
      // previous statement's change.
      if (i > 0 && groupOf[i - 1] !== -1) groupOf[i] = groupOf[i - 1];
      return;
    }
    const key = `${created.schema ?? ''}.${created.name}`;
    let g = groupKeyToIndex.get(key);
    if (g === undefined) {
      g = groupKeys.length;
      groupKeys.push(key);
      groupFacts.push(f);
      groupKeyToIndex.set(key, g);
    } else if (!(groupFacts[g].kind in KIND_DIRS) && groupFacts[g].kind !== 'schema' && (f.kind in KIND_DIRS || f.kind === 'schema')) {
      // Prefer naming the group after its creating statement over an ALTER.
      groupFacts[g] = f;
    }
    groupOf[i] = g;
  });

  const groupNames = groupFacts.map(nameFor);

  // Schema producers, for schema-level change dependencies.
  const schemaGroup = new Map<string, number>();
  facts.forEach((f, i) => {
    if (f.kind === 'schema' && f.creates[0] && groupOf[i] !== -1) {
      schemaGroup.set(f.creates[0].name, groupOf[i]);
    }
  });

  // Slice statement text per group, in the emitted (topological) order.
  const groupSql: string[][] = groupNames.map((): string[] => []);

  facts.forEach((f, i) => {
    const text = sql.slice(f.span.start, f.span.start + f.span.len).trim();
    const g = groupOf[i];
    if (g !== -1 && text) {
      groupSql[g].push(text.endsWith(';') ? text : `${text};`);
    }
  });

  // Change dependencies = statement edges projected onto groups, plus
  // schema references (an object change depends on its schema's change).
  const groupDeps: Set<number>[] = groupNames.map((): Set<number> => new Set<number>());
  for (const edge of graph.edges) {
    if (edge.kind === 'late') continue;
    const from = groupOf[edge.from];
    const to = groupOf[edge.to];
    if (from !== -1 && to !== -1 && from !== to) groupDeps[from].add(to);
  }
  facts.forEach((f, i) => {
    const from = groupOf[i];
    if (from === -1) return;
    const schemas = new Set<string>(f.referencedSchemas);
    for (const created of f.creates) {
      if (created.schema) schemas.add(created.schema);
    }
    for (const schema of schemas) {
      const to = schemaGroup.get(schema);
      if (to !== undefined && to !== from) groupDeps[from].add(to);
    }
  });

  // Emit groups in first-statement order (already topological).
  const order = [...groupNames.keys()].sort((a, b) => {
    const firstA = groupOf.indexOf(a);
    const firstB = groupOf.indexOf(b);
    return firstA - firstB;
  });

  const result: GranularityChange[] = order
    .filter(g => groupSql[g].length > 0)
    .map(g => ({
      name: groupNames[g],
      dependencies: [...groupDeps[g]].map(d => groupNames[d]).sort(),
      deploy: groupSql[g].join('\n\n')
    }));

  return { changes: result, warnings };
}
