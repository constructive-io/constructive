/**
 * Partition dial: project one deploy surface into a set of pgpm packages.
 *
 * The object graph (statements classified by `@pgsql/semantics`, grouped
 * into identity-keyed units) is the source of truth; which package a unit
 * lives in is a *derived projection* of a declarative partition config.
 * Units can be assigned by schema, by object kind, by explicit cherry-pick
 * (identity or derived path), or dragged in as the dependency closure of a
 * package's seeds. `requires` headers are a mechanical post-pass over the
 * statement graph: intra-package edges become `requires: <path>`,
 * cross-package edges become `requires: <pkg>:<path>` — both rendered
 * through the naming spec, never authored.
 *
 * A partition is rejected (hard error) when packages require each other in
 * a cycle: that is the one unshippable configuration, because no package
 * install order can satisfy it.
 *
 * Like the other drivers in this package the emit shape is structurally
 * typed on the change seam — no dependency on `@pgpmjs/bundle` or
 * `@pgpmjs/core`. Callers materialize packages however they like (write
 * pgpm.plan + deploy trees, feed a bundle, ...).
 */
import { pathFor, PathStyle } from '@pgpmjs/naming-spec';
import { classifyStatements, StatementFacts, StatementKind } from '@pgsql/semantics';
import {
  buildStatementGraph,
  identityOf,
  ObjectIdentity,
  ObjectIdentityKind
} from '@pgsql/transform';

/** One deployable unit: an object (by identity) and the statements that build it. */
export interface PartitionUnit {
  /** The object's identity, or `null` for split riders and the residual unit. */
  identity: ObjectIdentity | null;
  /** Statement kind of the unit's primary statement (`grant` for split grants, ...). */
  primaryKind: StatementKind;
  /** Canonical change path derived from the identity via the naming spec. */
  path: string;
  /** Indexes into the classified statement list, in source order. */
  statements: number[];
  /** The unit's deploy SQL (statement text joined in source order). */
  sql: string;
  /**
   * A statement in this unit executes dynamic SQL: its edges are incomplete,
   * so assignments involving it cannot be proven safe by the graph alone.
   */
  dynamicSql: boolean;
}

/**
 * Matches units for assignment. Every given field must match (AND); array
 * values match any element (OR). Omitted fields match everything, so
 * `{ schema: 'billing' }` selects a whole schema, `{ kind: 'policy' }`
 * selects every policy, and `{ path: 'schemas/app/tables/users/table' }`
 * cherry-picks one object.
 */
export interface UnitSelector {
  kind?: ObjectIdentityKind | ObjectIdentityKind[];
  /**
   * Statement-level kind of the unit's primary statement — selects units
   * that have no object identity, like grants split out via
   * {@link PartitionConfig.splitRiders} (`statementKind: 'grant'`).
   */
  statementKind?: StatementKind | StatementKind[];
  schema?: string | string[];
  name?: string | string[];
  /** Owning table, for table-scoped kinds (trigger/policy/index/constraint/seed). */
  table?: string | string[];
  /** The derived naming-spec path — exact cherry-pick. */
  path?: string | string[];
}

/** Assigns matching units to a package. Rules are tried in order; first match wins. */
export interface PartitionRule {
  package: string;
  /** A unit matching ANY of these selectors is assigned to `package`. */
  select: UnitSelector[];
  /**
   * Also pull in the transitive dependency closure (hard + fk edges) of the
   * selected units. Only units that would otherwise land in the default
   * package are pulled — a unit another rule claimed stays where it is and
   * becomes an ordinary cross-package dependency.
   */
  closure?: boolean;
}

export interface PartitionConfig {
  /** Assignment rules, in priority order. */
  rules: PartitionRule[];
  /** Package for units no rule matches. */
  defaultPackage: string;
  /** Naming-spec rendering style for derived paths (default `directory`). */
  style?: PathStyle;
  /**
   * Statement kinds to split out of their host unit into standalone units
   * (e.g. `['grant']` makes every GRANT its own selectable unit named
   * `<hostPath>/grants/<role>`), so security surface can be partitioned
   * independently of the objects it attaches to. Split units depend on
   * their host, so ordering stays correct wherever they are assigned.
   */
  splitRiders?: StatementKind[];
}

/** One emitted change of a partitioned package. */
export interface PartitionedChange {
  /** Change path (naming spec). */
  name: string;
  /**
   * Same-package dependencies as plain paths, cross-package dependencies as
   * `<pkg>:<path>` — the pgpm cross-package requires convention.
   */
  dependencies: string[];
  deploy: string;
}

export interface PartitionedPackage {
  name: string;
  /** Changes in a valid deploy order (statement-graph topological order). */
  changes: PartitionedChange[];
  /** Package names this package requires (from cross-package edges). */
  requires: string[];
}

export interface PartitionUnitsResult {
  packages: PartitionedPackage[];
  /** unit path → package name, for every unit. */
  assignments: Map<string, string>;
  /** Units pulled in by closure rules: path → the rule's package. */
  closureIncluded: Map<string, string>;
  warnings: string[];
}

/** A partition whose packages require each other in a cycle — unshippable. */
export class PartitionCycleError extends Error {
  constructor(
    /** The packages forming the cycle. */
    readonly packages: string[],
    /** One offending edge per hop: `fromPkg:fromPath -> toPkg:toPath`. */
    readonly edges: string[]
  ) {
    super(
      `cross-package dependency cycle: ${packages.join(' -> ')} -> ${packages[0]}\n` +
        edges.map(e => `  ${e}`).join('\n')
    );
    this.name = 'PartitionCycleError';
  }
}

const identityKey = (id: ObjectIdentity): string =>
  `${id.kind}\u0000${id.schema ?? ''}\u0000${id.table ?? ''}\u0000${id.name}`;

const matchField = <T>(value: T, wanted: T | T[] | undefined): boolean => {
  if (wanted === undefined) return true;
  return Array.isArray(wanted) ? wanted.includes(value) : wanted === value;
};

function matches(unit: PartitionUnit, selector: UnitSelector): boolean {
  if (!matchField(unit.path, selector.path)) return false;
  if (!matchField(unit.primaryKind, selector.statementKind)) return false;
  const id = unit.identity;
  if (selector.kind === undefined && selector.schema === undefined &&
      selector.name === undefined && selector.table === undefined) {
    return true;
  }
  if (!id) return false;
  // A schema object's own name counts as its schema, so `{ schema: 'x' }`
  // selects the schema together with everything in it.
  const schema = id.kind === 'schema' ? id.name : id.schema;
  return (
    matchField(id.kind, selector.kind) &&
    matchField(schema, selector.schema as string | string[] | undefined) &&
    matchField(id.name, selector.name) &&
    matchField(id.table, selector.table as string | string[] | undefined)
  );
}

/** Path of the residual unit for statements attributable to no object. */
export const RESIDUAL_UNIT_PATH = 'misc/statements';

interface UnitGraph {
  facts: StatementFacts[];
  units: PartitionUnit[];
  unitOf: number[];
  /** unit → units it depends on (hard + fk edges, schema membership). */
  deps: Set<number>[];
  source: string;
}

/**
 * Group a classified script into identity-keyed units and compute unit-level
 * dependencies from the statement graph.
 *
 * Statements with no identity of their own (grants, comments) ride with the
 * unit of the object they target — resolved through the statement graph's
 * edges — falling back to the closest preceding statement's unit; lead-in
 * statements with no unit at all land in a residual unit so nothing is
 * silently dropped. Kinds listed in `splitRiders` become standalone units
 * (named `<hostPath>/grants/<role>` for grants, `<hostPath>/<kind>/<n>`
 * otherwise) that depend on their host unit.
 */
function buildUnitGraph(sql: string, style: PathStyle, splitRiders: Set<StatementKind>): UnitGraph {
  const facts = classifyStatements(sql);
  const graph = buildStatementGraph(facts);

  const unitOf: number[] = new Array(facts.length).fill(-1);
  const units: PartitionUnit[] = [];
  const byIdentity = new Map<string, number>();
  const takenPaths = new Set<string>();

  const newUnit = (identity: ObjectIdentity | null, primaryKind: StatementKind, path: string): number => {
    units.push({ identity, primaryKind, path, statements: [], sql: '', dynamicSql: false });
    takenPaths.add(path);
    return units.length - 1;
  };

  // Naming-spec path for a unit; ENABLE ROW LEVEL SECURITY uses the spec's
  // dedicated rls template rather than its constraint-shaped identity.
  const unitPath = (identity: ObjectIdentity, kind: StatementKind): string => {
    if (kind === 'rls_enable' && identity.table) {
      return `schemas/${identity.schema ?? 'public'}/tables/${identity.table}/policies/enable_row_level_security`;
    }
    return pathFor(identity, { style });
  };

  const unitFor = (identity: ObjectIdentity | null, kind: StatementKind): number => {
    const key = identity ? identityKey(identity) : RESIDUAL_UNIT_PATH;
    let u = byIdentity.get(key);
    if (u === undefined) {
      u = newUnit(identity, kind, identity ? unitPath(identity, kind) : RESIDUAL_UNIT_PATH);
      byIdentity.set(key, u);
    }
    return u;
  };

  // Object-owning units by qualified name, for rider host resolution. Only
  // top-level objects qualify (table-scoped identities share the table's
  // qualified name and must not shadow it).
  const objectUnits = new Map<string, number>();
  const registerObject = (identity: ObjectIdentity, u: number): void => {
    if (identity.table) return;
    objectUnits.set(`${identity.schema ?? ''}.${identity.name}`, u);
  };

  /** Host unit of a rider statement: the unit owning the first object it
   *  references, falling back to the preceding statement's unit. */
  const hostOf = (i: number): number => {
    for (const r of facts[i].references) {
      const u = objectUnits.get(`${r.schema ?? ''}.${r.name}`);
      if (u !== undefined) return u;
    }
    if (i > 0 && unitOf[i - 1] !== -1) return unitOf[i - 1];
    return -1;
  };

  const riderPath = (f: StatementFacts, host: number): string => {
    const base = host !== -1 ? units[host].path : RESIDUAL_UNIT_PATH;
    const dir = f.kind === 'grant' ? 'grants' : f.kind;
    const label = f.roles.length > 0 ? f.roles.join('_') : f.kind;
    let path = `${base}/${dir}/${label}`;
    for (let n = 2; takenPaths.has(path); n++) path = `${base}/${dir}/${label}-${n}`;
    return path;
  };

  const hostUnit = new Map<number, number>();

  facts.forEach((f, i) => {
    const identity = identityOf(f);
    if (identity && !splitRiders.has(f.kind)) {
      unitOf[i] = unitFor(identity, f.kind);
      registerObject(identity, unitOf[i]);
      return;
    }
    const host = hostOf(i);
    if (splitRiders.has(f.kind)) {
      unitOf[i] = newUnit(identity, f.kind, identity ? unitPath(identity, f.kind) : riderPath(f, host));
      if (identity) registerObject(identity, unitOf[i]);
      if (host !== -1) hostUnit.set(unitOf[i], host);
      return;
    }
    // No identity: ride with the host unit.
    if (host !== -1) {
      unitOf[i] = host;
      return;
    }
    unitOf[i] = unitFor(null, f.kind);
  });

  facts.forEach((f, i) => {
    const text = sql.slice(f.span.start, f.span.start + f.span.len).trim();
    if (!text) return;
    const unit = units[unitOf[i]];
    unit.statements.push(i);
    unit.sql += (unit.sql ? '\n\n' : '') + (text.endsWith(';') ? text : `${text};`);
    if (f.dynamicSql) unit.dynamicSql = true;
  });

  // Unit dependencies: statement edges (late edges do not constrain deploy
  // order), plus schema membership (an object requires its schema's unit).
  const deps: Set<number>[] = units.map((): Set<number> => new Set<number>());
  for (const edge of graph.edges) {
    if (edge.kind === 'late') continue;
    const from = unitOf[edge.from];
    const to = unitOf[edge.to];
    if (from !== -1 && to !== -1 && from !== to) deps[from].add(to);
  }
  // A split rider requires its host object; a table-scoped object (trigger,
  // policy, index, constraint, RLS) requires its table.
  for (const [u, host] of hostUnit) {
    if (u !== host) deps[u].add(host);
  }
  units.forEach((u, i) => {
    const id = u.identity;
    if (!id?.table) return;
    const table = objectUnits.get(`${id.schema ?? ''}.${id.table}`);
    if (table !== undefined && table !== i) deps[i].add(table);
  });

  const schemaUnit = new Map<string, number>();
  units.forEach((u, i) => {
    if (u.identity?.kind === 'schema') schemaUnit.set(u.identity.name, i);
  });
  facts.forEach((f, i) => {
    const from = unitOf[i];
    if (from === -1) return;
    const schemas = new Set<string>(f.referencedSchemas);
    for (const created of f.creates) {
      if (created.schema) schemas.add(created.schema);
    }
    for (const schema of schemas) {
      const to = schemaUnit.get(schema);
      if (to !== undefined && to !== from) deps[from].add(to);
    }
  });

  return { facts, units, unitOf, deps, source: sql };
}

/** A change's deploy surface going into the partition (same seam as the granularity driver). */
export interface PartitionInputChange {
  name: string;
  dependencies: string[];
  deploy: string;
}

/**
 * Partition a deploy surface into packages.
 *
 * Accepts either raw SQL or pgpm changes (whose deploy scripts are flattened
 * in the given order — run the granularity dial first if a different unit
 * shape is wanted). Requires `loadModule()` from `plpgsql-parser` first.
 *
 * Assignment: for each unit the first matching rule wins; unmatched units go
 * to `defaultPackage`. Closure rules then pull the transitive dependency
 * closure (hard + fk) of their units out of the default package. Finally the
 * requires post-pass renders every unit dependency through the naming spec —
 * same package as `<path>`, cross-package as `<pkg>:<path>` — and the
 * package-level graph is checked for cycles ({@link PartitionCycleError}).
 */
export function partitionUnits(
  input: string | PartitionInputChange[],
  config: PartitionConfig
): PartitionUnitsResult {
  const style = config.style ?? 'directory';
  const sql =
    typeof input === 'string'
      ? input
      : input.map(c => c.deploy.trim()).filter(Boolean).join('\n\n');

  const { units, deps } = buildUnitGraph(sql, style, new Set(config.splitRiders ?? []));
  const warnings: string[] = [];

  // 1. Assignment: first matching rule wins.
  const packageOf: string[] = units.map(unit => {
    for (const rule of config.rules) {
      if (rule.select.some(s => matches(unit, s))) return rule.package;
    }
    return config.defaultPackage;
  });

  // 2. Closure: pull each closure rule's dependency closure out of the
  // default package (never out of another rule's package).
  const closureIncluded = new Map<string, string>();
  for (const rule of config.rules) {
    if (!rule.closure) continue;
    const queue = units.map((_, i) => i).filter(i => packageOf[i] === rule.package);
    const seen = new Set(queue);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const dep of deps[current]) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        if (packageOf[dep] === rule.package) {
          queue.push(dep);
          continue;
        }
        if (packageOf[dep] !== config.defaultPackage) continue;
        packageOf[dep] = rule.package;
        closureIncluded.set(units[dep].path, rule.package);
        queue.push(dep);
      }
    }
  }

  // Dynamic SQL makes edges incomplete: surface it, do not guess.
  units.forEach((unit, i) => {
    if (unit.dynamicSql && unit.statements.length > 0) {
      warnings.push(
        `${units[i].path} (${packageOf[i]}) executes dynamic SQL; hidden references cannot be checked against the partition`
      );
    }
  });

  // 3. Requires post-pass + package-level graph.
  const pkgNames = [...new Set([...packageOf, config.defaultPackage])];
  const pkgIndex = new Map(pkgNames.map((p, i) => [p, i]));
  const pkgEdges = new Map<string, { from: number; to: number; via: string }>();

  const changesByPkg = new Map<string, PartitionedChange[]>();
  for (const p of pkgNames) changesByPkg.set(p, []);

  units.forEach((unit, i) => {
    if (unit.statements.length === 0) return;
    const pkg = packageOf[i];
    const dependencies = [...deps[i]]
      .filter(d => units[d].statements.length > 0)
      .map(d => {
        const depPkg = packageOf[d];
        if (depPkg === pkg) return units[d].path;
        const key = `${pkg}\u0000${depPkg}`;
        if (!pkgEdges.has(key)) {
          pkgEdges.set(key, {
            from: pkgIndex.get(pkg)!,
            to: pkgIndex.get(depPkg)!,
            via: `${pkg}:${unit.path} -> ${depPkg}:${units[d].path}`
          });
        }
        return `${depPkg}:${units[d].path}`;
      })
      .sort();
    changesByPkg.get(pkg)!.push({ name: unit.path, dependencies, deploy: unit.sql });
  });

  // 4. Cross-package cycle detection over the package graph.
  detectCycles(pkgNames, [...pkgEdges.values()]);

  const assignments = new Map<string, string>();
  units.forEach((unit, i) => {
    if (unit.statements.length > 0) assignments.set(unit.path, packageOf[i]);
  });

  const packages: PartitionedPackage[] = pkgNames
    .map(name => ({
      name,
      changes: changesByPkg.get(name)!,
      requires: [...new Set(
        [...pkgEdges.values()]
          .filter(e => pkgNames[e.from] === name)
          .map(e => pkgNames[e.to])
      )].sort()
    }))
    .filter(p => p.changes.length > 0);

  return { packages, assignments, closureIncluded, warnings };
}

function detectCycles(
  pkgNames: string[],
  edges: { from: number; to: number; via: string }[]
): void {
  const out = new Map<number, { to: number; via: string }[]>();
  for (const e of edges) {
    const list = out.get(e.from) ?? [];
    list.push({ to: e.to, via: e.via });
    out.set(e.from, list);
  }

  const state = new Array<number>(pkgNames.length).fill(0); // 0 unseen, 1 on stack, 2 done
  const stack: number[] = [];
  const viaStack: string[] = [];

  const visit = (v: number): void => {
    state[v] = 1;
    stack.push(v);
    for (const { to, via } of out.get(v) ?? []) {
      if (state[to] === 2) continue;
      viaStack.push(via);
      if (state[to] === 1) {
        const start = stack.indexOf(to);
        const cyclePkgs = stack.slice(start).map(i => pkgNames[i]);
        const cycleEdges = viaStack.slice(viaStack.length - cyclePkgs.length);
        throw new PartitionCycleError(cyclePkgs, cycleEdges);
      }
      visit(to);
      viaStack.pop();
    }
    stack.pop();
    state[v] = 2;
  };

  for (let v = 0; v < pkgNames.length; v++) {
    if (state[v] === 0) visit(v);
  }
}
