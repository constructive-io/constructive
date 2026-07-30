import { classifyStatements, SchemaRouter, StatementFacts } from '@pgpmjs/transform';

import { SqlObjectRef } from './refs';

/**
 * Selects a *subsystem*: the set of objects a module owns that a consumer
 * wants to remove and substitute with another provider. Selection is by
 * schema — every object created in one of these schemas belongs to the
 * subsystem, as do the schemas themselves.
 */
export interface SubsystemSelector {
  schemas: string[];
}

/**
 * One reference the surviving statements make *into* the subsystem. This is
 * the subsystem's external contract: whatever replaces it must satisfy every
 * one of these (or the consumer must rewrite the referencing statement).
 */
export interface SubsystemDependency {
  /** The subsystem object being depended on. */
  object: SqlObjectRef;
  /** True when at least one dependent is a foreign-key constraint. */
  fk: boolean;
  /** Statement indexes (into the classified statement list) that depend on it. */
  dependents: number[];
}

/**
 * The measured external contract of a subsystem: what the rest of the SQL
 * actually requires of it, derived purely from the reference graph.
 */
export interface SubsystemContract {
  /** Objects the subsystem creates. */
  provides: SqlObjectRef[];
  /** Subsystem objects referenced from outside — the replacement surface. */
  required: SubsystemDependency[];
  /** Subsystem objects nothing outside references — safe to drop silently. */
  internal: SqlObjectRef[];
}

export interface ExcludeWarning {
  /**
   * - `mixed-statement`: a statement creates objects both inside and outside
   *   the subsystem, so it can be neither dropped nor kept cleanly.
   * - `opaque-statement`: a statement's target is invisible to classification
   *   (e.g. `COMMENT ON`, bare `DROP`), so it is kept but may reference a
   *   dropped object.
   * - `dynamic-sql`: a kept statement runs `EXECUTE`; references inside the
   *   dynamic string cannot be checked against the subsystem.
   */
  kind: 'mixed-statement' | 'opaque-statement' | 'dynamic-sql';
  statement: number;
  detail: string;
}

/**
 * A kept statement references a subsystem object that no route rebinds to a
 * replacement. Exclusion is unsafe until every one of these is resolved.
 */
export interface UnsatisfiedReference {
  object: SqlObjectRef;
  statement: number;
  fk: boolean;
}

export interface ExcludeResult {
  /** Indexes of statements belonging to the subsystem (to be dropped). */
  excluded: number[];
  /** Indexes of surviving statements. */
  kept: number[];
  /** The subsystem's measured external contract. */
  contract: SubsystemContract;
  /**
   * References into the subsystem from kept statements that the provided
   * router does not rebind. Empty ⇔ the exclusion is safe.
   */
  unsatisfied: UnsatisfiedReference[];
  warnings: ExcludeWarning[];
  /** The classified statements, for callers that need the facts. */
  statements: StatementFacts[];
}

function inSubsystem(ref: SqlObjectRef, schemas: Set<string>): boolean {
  return ref.schema !== null && schemas.has(ref.schema);
}

function refKey(ref: SqlObjectRef): string {
  return `${ref.schema ?? ''}.${ref.name}`;
}

function pushUnique(list: SqlObjectRef[], ref: SqlObjectRef): void {
  if (!list.some(x => x.schema === ref.schema && x.name === ref.name)) list.push(ref);
}

/**
 * The classifier does not tag a reference with its namespace, so resolution
 * tries each object namespace (FK targets are known to be relations) before
 * falling back to the schema-level default.
 */
function resolveRebind(
  router: SchemaRouter | undefined,
  ref: SqlObjectRef,
  fk: boolean
): boolean {
  if (!router) return false;
  const namespaces: Array<'relation' | 'function' | 'type' | 'unknown'> = fk
    ? ['relation']
    : ['function', 'relation', 'type', 'unknown'];
  for (const ns of namespaces) {
    const target = router.resolveObject(ref.schema, ref.name, ns);
    if (target !== undefined && (target.name !== undefined || target.schema !== undefined)) {
      return true;
    }
  }
  return false;
}

/**
 * Decide statement membership: a statement belongs to the subsystem when
 * everything it creates/targets is inside it, or (creating nothing) when all
 * of its references point inside it (GRANTs on subsystem objects).
 */
function classifyMembership(
  facts: StatementFacts,
  schemas: Set<string>
): 'inside' | 'outside' | 'mixed' | 'opaque' {
  if (facts.kind === 'schema') {
    const created = facts.creates[0];
    return created && schemas.has(created.name) ? 'inside' : 'outside';
  }

  if (facts.creates.length > 0) {
    const inside = facts.creates.filter(c => inSubsystem(c, schemas)).length;
    if (inside === facts.creates.length) return 'inside';
    if (inside === 0) return 'outside';
    return 'mixed';
  }

  const refs = [...facts.references, ...facts.bodyReferences];
  if (refs.length > 0) {
    return refs.every(r => inSubsystem(r, schemas)) ? 'inside' : 'outside';
  }

  // No creates, no visible references: COMMENT ON, bare DROP, SET, ...
  return 'opaque';
}

/**
 * Partition a SQL script into a subsystem (statements to exclude) and its
 * survivors, measure the subsystem's external contract, and verify that a
 * routing profile rebinds every surviving reference into it.
 *
 * Pure and I/O-free. The caller applies the actual removal/rewrite (e.g. via
 * `transpileBundle`'s `transformScript` with the same router); this function
 * only *decides* and *checks* — exclusion is safe iff `unsatisfied` is empty.
 */
export function excludeSubsystem(
  sql: string,
  selector: SubsystemSelector,
  options: { rebinds?: SchemaRouter } = {}
): ExcludeResult {
  const schemas = new Set(selector.schemas);
  const statements = classifyStatements(sql);
  const router = options.rebinds;

  const excluded: number[] = [];
  const kept: number[] = [];
  const warnings: ExcludeWarning[] = [];
  const provides: SqlObjectRef[] = [];
  const internal: SqlObjectRef[] = [];
  const required = new Map<string, SubsystemDependency>();
  const unsatisfied: UnsatisfiedReference[] = [];

  statements.forEach((facts, i) => {
    const membership = classifyMembership(facts, schemas);

    if (membership === 'inside') {
      excluded.push(i);
      for (const c of facts.creates) {
        if (inSubsystem(c, schemas)) pushUnique(provides, { schema: c.schema, name: c.name });
      }
      return;
    }

    kept.push(i);

    if (membership === 'mixed') {
      warnings.push({
        kind: 'mixed-statement',
        statement: i,
        detail: `creates objects both inside and outside the subsystem: ${facts.creates
          .map(refKey)
          .join(', ')}`
      });
    } else if (membership === 'opaque') {
      warnings.push({
        kind: 'opaque-statement',
        statement: i,
        detail: `${facts.nodeTag} target is not classified; verify it does not reference the subsystem`
      });
    }

    if (facts.dynamicSql) {
      warnings.push({
        kind: 'dynamic-sql',
        statement: i,
        detail: 'kept statement executes dynamic SQL; references inside it are unchecked'
      });
    }

    const refs = new Map<string, { ref: SqlObjectRef; fk: boolean }>();
    for (const r of [...facts.references, ...facts.bodyReferences]) {
      if (inSubsystem(r, schemas)) refs.set(refKey(r), { ref: r, fk: refs.get(refKey(r))?.fk ?? false });
    }
    for (const t of facts.fkTargets) {
      if (inSubsystem(t, schemas)) refs.set(refKey(t), { ref: t, fk: true });
    }

    for (const { ref, fk } of refs.values()) {
      const key = refKey(ref);
      const dep = required.get(key) ?? { object: { schema: ref.schema, name: ref.name }, fk: false, dependents: [] };
      dep.fk = dep.fk || fk;
      if (!dep.dependents.includes(i)) dep.dependents.push(i);
      required.set(key, dep);

      const rebound = resolveRebind(router, ref, fk);
      if (!rebound && !unsatisfied.some(u => refKey(u.object) === key && u.statement === i)) {
        unsatisfied.push({ object: { schema: ref.schema, name: ref.name }, statement: i, fk });
      }
    }
  });

  for (const p of provides) {
    if (!required.has(refKey(p))) pushUnique(internal, p);
  }

  return {
    excluded,
    kept,
    contract: {
      provides,
      required: [...required.values()],
      internal
    },
    unsatisfied,
    warnings,
    statements
  };
}
