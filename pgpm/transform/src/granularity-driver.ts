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
import type { ObjectIdentity as NamingIdentity } from '@pgpmjs/naming-spec';
import { pathFor } from '@pgpmjs/naming-spec';
import { revertFor, verifyFor } from '@pgsql/scripts';
import type { Granularity, StatementFacts } from '@pgsql/transform';
import {
  buildStatementGraph,
  classifyStatements,
  identityOf,
  restructureSql
} from '@pgsql/transform';

import { nameUnnamedConstraints, subObjectIdentityOf } from './sub-object';

export type { Granularity } from '@pgsql/transform';

/**
 * How statements are distributed across pgpm changes — orthogonal to
 * `Granularity`, which shapes the SQL *within* a change.
 *
 * - `alteration` — one change per alteration: every `ADD COLUMN` /
 *                  `ADD CONSTRAINT` becomes its own plan entry with its own
 *                  deploy/revert/verify and graph-derived requires, so a
 *                  single column can deploy or revert independently.
 * - `object`     — one change per created object (the default): a table's
 *                  CREATE and all its ALTERs share one plan entry.
 * - `single`     — one change for the whole module: every statement lands in
 *                  a single plan entry with one deploy/revert/verify.
 */
export type ChangeGranularity = 'alteration' | 'object' | 'single';

export const CHANGE_GRANULARITIES: readonly ChangeGranularity[] = ['alteration', 'object', 'single'];

export const isChangeGranularity = (value: string): value is ChangeGranularity =>
  (CHANGE_GRANULARITIES as readonly string[]).includes(value);

/** A change's deploy surface going into or out of the restructure. */
export interface GranularityChange {
  /** Change name (plan token, e.g. `schemas/app/tables/users/table`). */
  name: string;
  /** Change names this change requires (within the same module). */
  dependencies: string[];
  /** Deploy SQL (headerless — the caller owns pgpm headers). */
  deploy: string;
}

/** A restructured change: deploy plus generated revert/verify scripts. */
export interface RestructuredChange extends GranularityChange {
  /**
   * Generated revert SQL (headerless): mechanical inverses of the change's
   * statements in reverse topological order within the group, via
   * `revertFor`. Non-invertible statements leave a `-- revert not
   * derivable` comment and a warning.
   */
  revert: string;
  /**
   * Generated verify SQL (headerless): one raise-on-failure existence check
   * per created object, via `verifyFor`.
   */
  verify: string;
}

export interface RestructureModuleOptions {
  granularity: Granularity;
  /**
   * Change-level distribution (default `object`). With `alteration`, every
   * single-command `ALTER TABLE ADD COLUMN` / `ADD CONSTRAINT` in the
   * restructured script becomes its own change, named by the sub-object's
   * naming-spec path (`.../columns/{name}/column`,
   * `.../constraints/{name}/constraint`); unnamed constraints are first
   * given their Postgres default name so each change stays revertible.
   * With `single`, the whole restructured script becomes one change.
   */
  changeGranularity?: ChangeGranularity;
  /**
   * Plan token for the single change (used only with `changeGranularity:
   * 'single'`). Defaults to `module/init`.
   */
  singleChangeName?: string;
  /**
   * Derive a change name for an alteration group from its sub-object
   * identity (used only with `changeGranularity: 'alteration'`). Defaults to
   * `pathFor` in `directory` style.
   */
  subObjectName?: (identity: NamingIdentity) => string;
  /**
   * Derive a change name for a statement group from the facts of its primary
   * (creating) statement. Defaults to {@link defaultChangeName}: naming spec
   * v1 paths (`identityOf` + `pathFor`).
   */
  changeName?: (facts: StatementFacts) => string;
}

export interface RestructureModuleResult {
  /** Restructured changes in deploy order, dependencies recomputed. */
  changes: RestructuredChange[];
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
 * Default change name for a statement group: the object's canonical naming
 * spec v1 path — `identityOf(facts)` (Postgres-native identity, from
 * `@pgsql/transform`) rendered through `pathFor` (`@pgpmjs/naming-spec`).
 * Paths are pure projections of identity, never authored.
 */
export function defaultChangeName(facts: StatementFacts): string {
  const identity = identityOf(facts);
  if (identity) return pathFor(identity);
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
  const subNameFor = options.subObjectName ?? ((identity: NamingIdentity): string => pathFor(identity));
  const alteration = options.changeGranularity === 'alteration';

  const flattened = changes
    .map(c => c.deploy.trim())
    .filter(Boolean)
    .join('\n\n');

  const restructured = restructureSql(flattened, {
    granularity: options.granularity
  });
  const warnings = restructured.warnings;
  const sql = alteration ? nameUnnamedConstraints(restructured.sql) : restructured.sql;

  // Re-classify the emitted script; group statements by the object they
  // target (creates[0]), so a table's CREATE and its remaining ALTERs land
  // in the same change regardless of statement kind.
  const facts = classifyStatements(sql);

  if (options.changeGranularity === 'single') {
    const name = options.singleChangeName ?? 'module/init';
    const inputNames = new Set(changes.map(c => c.name));
    const dependencies = [...new Set(
      changes.flatMap(c => c.dependencies).filter(d => !inputNames.has(d))
    )].sort();
    const statements = facts
      .map(f => sql.slice(f.span.start, f.span.start + f.span.len).trim())
      .filter(Boolean)
      .map(text => (text.endsWith(';') ? text : `${text};`));
    const revert = revertFor(facts);
    const verify = verifyFor(facts);
    for (const warning of [...revert.warnings, ...verify.warnings]) {
      warnings.push(`${name}: ${warning}`);
    }
    return {
      changes: statements.length > 0
        ? [{ name, dependencies, deploy: statements.join('\n\n'), revert: revert.sql, verify: verify.sql }]
        : [],
      warnings
    };
  }

  const graph = buildStatementGraph(facts);

  const groupOf: number[] = new Array(facts.length).fill(-1);
  const groupKeys: string[] = [];
  const groupFacts: StatementFacts[] = [];
  const groupKeyToIndex = new Map<string, number>();
  /** Sub-object path for alteration groups; null means name via `nameFor`. */
  const groupSubName: (string | null)[] = [];
  /** For alteration groups: the object-group key of the owning table. */
  const groupOwnerKey: (string | null)[] = [];

  facts.forEach((f, i) => {
    const created = f.creates[0];
    if (!created) {
      // Statements creating nothing (grants, comments) ride with the
      // previous statement's change.
      if (i > 0 && groupOf[i - 1] !== -1) groupOf[i] = groupOf[i - 1];
      return;
    }
    if (alteration) {
      const sub = subObjectIdentityOf(f);
      if (sub) {
        const key = `sub\u0000${sub.kind}\u0000${sub.schema ?? ''}\u0000${sub.table}\u0000${sub.name}`;
        let g = groupKeyToIndex.get(key);
        if (g === undefined) {
          g = groupKeys.length;
          groupKeys.push(key);
          groupFacts.push(f);
          groupSubName.push(subNameFor(sub));
          groupOwnerKey.push(`${sub.schema ?? ''}.${sub.table}`);
          groupKeyToIndex.set(key, g);
        }
        groupOf[i] = g;
        return;
      }
    }
    const key = `${created.schema ?? ''}.${created.name}`;
    let g = groupKeyToIndex.get(key);
    if (g === undefined) {
      g = groupKeys.length;
      groupKeys.push(key);
      groupFacts.push(f);
      groupSubName.push(null);
      groupOwnerKey.push(null);
      groupKeyToIndex.set(key, g);
    } else if (!(groupFacts[g].kind in KIND_DIRS) && groupFacts[g].kind !== 'schema' && (f.kind in KIND_DIRS || f.kind === 'schema')) {
      // Prefer naming the group after its creating statement over an ALTER.
      groupFacts[g] = f;
    }
    groupOf[i] = g;
  });

  const groupNames = groupFacts.map((f, g) => groupSubName[g] ?? nameFor(f));

  // Schema producers, for schema-level change dependencies.
  const schemaGroup = new Map<string, number>();
  facts.forEach((f, i) => {
    if (f.kind === 'schema' && f.creates[0] && groupOf[i] !== -1) {
      schemaGroup.set(f.creates[0].name, groupOf[i]);
    }
  });

  // Slice statement text per group, in the emitted (topological) order,
  // and collect each group's facts for revert/verify generation.
  const groupSql: string[][] = groupNames.map((): string[] => []);
  const groupStatements: StatementFacts[][] = groupNames.map((): StatementFacts[] => []);

  facts.forEach((f, i) => {
    const text = sql.slice(f.span.start, f.span.start + f.span.len).trim();
    const g = groupOf[i];
    if (g !== -1 && text) {
      groupSql[g].push(text.endsWith(';') ? text : `${text};`);
      groupStatements[g].push(f);
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

  // Alteration groups depend on their table's own change, and constraint
  // groups additionally on the column changes they key on — the statement
  // graph keys everything by the table, so these finer edges are added here.
  if (alteration) {
    const columnGroup = new Map<string, number>();
    groupKeys.forEach((key, g) => {
      const parts = key.split('\u0000');
      if (parts[0] === 'sub' && parts[1] === 'column') {
        columnGroup.set(`${parts[2]}.${parts[3]}.${parts[4]}`, g);
      }
    });
    groupKeys.forEach((key, g) => {
      const owner = groupOwnerKey[g];
      if (owner === null) return;
      const tableGroup = groupKeyToIndex.get(owner);
      if (tableGroup !== undefined && tableGroup !== g) groupDeps[g].add(tableGroup);
      const parts = key.split('\u0000');
      if (parts[1] !== 'constraint') return;
      const constraint = (groupFacts[g].stmt?.AlterTableStmt as {
        cmds?: { AlterTableCmd?: { def?: { Constraint?: {
          keys?: { String?: { sval?: string } }[];
          fk_attrs?: { String?: { sval?: string } }[];
        } } } }[];
      } | undefined)?.cmds?.[0]?.AlterTableCmd?.def?.Constraint;
      const referenced = [...(constraint?.keys ?? []), ...(constraint?.fk_attrs ?? [])]
        .map(k => k.String?.sval)
        .filter((s): s is string => typeof s === 'string');
      for (const col of referenced) {
        const to = columnGroup.get(`${owner}.${col}`);
        if (to !== undefined && to !== g) groupDeps[g].add(to);
      }
    });
  }

  // Emit groups in first-statement order (already topological).
  const order = [...groupNames.keys()].sort((a, b) => {
    const firstA = groupOf.indexOf(a);
    const firstB = groupOf.indexOf(b);
    return firstA - firstB;
  });

  const result: RestructuredChange[] = order
    .filter(g => groupSql[g].length > 0)
    .map(g => {
      const revert = revertFor(groupStatements[g]);
      const verify = verifyFor(groupStatements[g]);
      for (const warning of revert.warnings) {
        warnings.push(`${groupNames[g]}: ${warning}`);
      }
      for (const warning of verify.warnings) {
        warnings.push(`${groupNames[g]}: ${warning}`);
      }
      return {
        name: groupNames[g],
        dependencies: [...groupDeps[g]].map(d => groupNames[d]).sort(),
        deploy: groupSql[g].join('\n\n'),
        revert: revert.sql,
        verify: verify.sql
      };
    });

  return { changes: result, warnings };
}
