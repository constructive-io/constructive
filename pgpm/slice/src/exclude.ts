import { parseSqlProgram, SchemaRouter, SqlProgram, StatementFacts } from '@pgpmjs/transform';

import { buildObjectGraph, SqlObjectGraph } from './object-graph';
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
  /** The parsed program the analysis ran over (one parse, shared with strip). */
  program: SqlProgram;
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
  const program = parseSqlProgram(sql);
  const analysis = analyzeProgram(program, new Set(selector.schemas), options.rebinds);

  return {
    excluded: analysis.excluded,
    kept: analysis.kept,
    contract: contractOf(analysis.provides, analysis.required),
    unsatisfied: analysis.unsatisfied,
    warnings: analysis.warnings,
    statements: program.statements.map(s => s.facts),
    program
  };
}

/** Per-program exclusion analysis, shared by the single- and multi-program APIs. */
interface ProgramAnalysis {
  excluded: number[];
  kept: number[];
  warnings: ExcludeWarning[];
  provides: SqlObjectRef[];
  required: Map<string, SubsystemDependency>;
  unsatisfied: UnsatisfiedReference[];
}

function contractOf(
  provides: SqlObjectRef[],
  required: Map<string, SubsystemDependency>
): SubsystemContract {
  const internal: SqlObjectRef[] = [];
  for (const p of provides) {
    if (!required.has(refKey(p))) pushUnique(internal, p);
  }
  return { provides, required: [...required.values()], internal };
}

function analyzeProgram(
  program: SqlProgram,
  schemas: Set<string>,
  router: SchemaRouter | undefined
): ProgramAnalysis {
  const statements = program.statements.map(s => s.facts);

  const excluded: number[] = [];
  const kept: number[] = [];
  const warnings: ExcludeWarning[] = [];
  const provides: SqlObjectRef[] = [];
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

  return { excluded, kept, warnings, provides, required, unsatisfied };
}

/** An `UnsatisfiedReference`/`ExcludeWarning` tagged with its owning program. */
export type ProgramUnsatisfiedReference = UnsatisfiedReference & { program: string };
export type ProgramExcludeWarning = ExcludeWarning & { program: string };

/** Per-program exclusion decisions from {@link excludeSubsystemPrograms}. */
export interface ProgramExclusion {
  /** Statement indexes removed: subsystem members + opaque subsystem-targeted. */
  dropped: number[];
  /**
   * The whole program consists of subsystem statements (plus transaction
   * control): it should be removed as a unit rather than emptied in place.
   */
  fullyExcluded: boolean;
  /** The surviving SQL with the dropped statements sliced out. */
  sql: string;
}

export interface ExcludeProgramsResult {
  /** The unified object graph over every analyzed program. */
  graph: SqlObjectGraph;
  /** The subsystem's external contract, measured across all programs. */
  contract: SubsystemContract;
  /** Unrebound references into the subsystem, tagged with their program. */
  unsatisfied: ProgramUnsatisfiedReference[];
  warnings: ProgramExcludeWarning[];
  /** Per-program decisions, keyed by program name. */
  programs: Map<string, ProgramExclusion>;
}

/**
 * Analyze a subsystem exclusion across a set of already-parsed programs
 * (typically one per pgpm change) in a single pass: the contract and cascade
 * safety are measured over all programs together — which is what catches
 * cross-change dependencies on the subsystem — while drop/strip/prune
 * decisions are returned per program, derived from statement membership and
 * ownership rather than survivor counting. The unified {@link SqlObjectGraph}
 * over the same programs is returned for structural queries.
 */
export function excludeSubsystemPrograms(
  programs: Map<string, SqlProgram> | Array<[string, SqlProgram]>,
  selector: SubsystemSelector,
  options: { rebinds?: SchemaRouter } = {}
): ExcludeProgramsResult {
  const entries = programs instanceof Map ? [...programs.entries()] : programs;
  const schemas = new Set(selector.schemas);

  const provides: SqlObjectRef[] = [];
  const required = new Map<string, SubsystemDependency>();
  const unsatisfied: ProgramUnsatisfiedReference[] = [];
  const warnings: ProgramExcludeWarning[] = [];
  const perProgram = new Map<string, ProgramExclusion>();

  for (const [name, program] of entries) {
    const analysis = analyzeProgram(program, schemas, options.rebinds);

    for (const p of analysis.provides) pushUnique(provides, p);
    for (const [key, dep] of analysis.required) {
      const merged = required.get(key) ?? { object: dep.object, fk: false, dependents: [] };
      merged.fk = merged.fk || dep.fk;
      required.set(key, merged);
    }
    unsatisfied.push(...analysis.unsatisfied.map(u => ({ ...u, program: name })));
    warnings.push(...analysis.warnings.map(w => ({ ...w, program: name })));

    const dropped = new Set(analysis.excluded);
    for (const i of analysis.kept) {
      if (opaqueTargetsSubsystem(program.statements[i].stmt, schemas)) dropped.add(i);
    }

    const survivors = program.statements.filter(
      (s, i) => !dropped.has(i) && !('TransactionStmt' in s.stmt)
    );

    perProgram.set(name, {
      dropped: [...dropped].sort((a, b) => a - b),
      fullyExcluded: dropped.size > 0 && survivors.length === 0,
      sql: sliceSurvivors(program, dropped)
    });
  }

  return {
    graph: buildObjectGraph(entries),
    contract: contractOf(provides, required),
    unsatisfied,
    warnings,
    programs: perProgram
  };
}

/**
 * Slice the surviving statements out of a program's source, preserving the
 * leading text (pgpm headers) and each survivor's original bytes.
 */
function sliceSurvivors(program: SqlProgram, dropped: Set<number>): string {
  const { source, statements } = program;
  const prefix = statements.length > 0 ? source.slice(0, statements[0].span.start) : source;

  const pieces: string[] = [];
  statements.forEach((s, i) => {
    if (dropped.has(i)) return;
    pieces.push(s.raw.trim() + ';');
  });

  return prefix + pieces.join('\n\n') + (pieces.length > 0 ? '\n' : '');
}

/**
 * Blank a script: keep its leading text (pgpm header) and transaction
 * statements, drop everything else. Used for the scripts of a change whose
 * deploy is entirely inside an excluded subsystem — its verify/revert bodies
 * target dropped objects, so they must go with it.
 */
export function blankScriptSql(sql: string): string {
  const { statements } = parseSqlProgram(sql);
  const prefix = statements.length > 0 ? sql.slice(0, statements[0].span.start) : sql;
  const pieces: string[] = [];
  for (const s of statements) {
    if (!('TransactionStmt' in s.stmt)) continue;
    pieces.push(s.raw.trim() + ';');
  }
  return prefix + pieces.join('\n\n') + (pieces.length > 0 ? '\n' : '');
}

export interface StripSubsystemResult {
  /** The surviving SQL, with subsystem statements removed. */
  sql: string;
  /** The analysis behind the removal (contract, unsatisfied, warnings). */
  result: ExcludeResult;
  /** Every removed statement index (excluded + opaque subsystem-targeted). */
  dropped: number[];
}

/** Qualified name (`[schema, name]` items) from a raw parse-tree name list. */
function qualifiedName(node: unknown): SqlObjectRef | undefined {
  const items = (node as { List?: { items?: Array<{ String?: { sval?: string } }> } })?.List
    ?.items;
  if (!items) return undefined;
  const parts = items.map(x => x.String?.sval).filter((s): s is string => typeof s === 'string');
  if (parts.length === 2) return { schema: parts[0], name: parts[1] };
  if (parts.length === 1) return { schema: null, name: parts[0] };
  return undefined;
}

/**
 * Whether an opaque statement (invisible to classification) provably targets
 * only subsystem objects, so it can be removed along with them: bare `DROP`
 * of subsystem objects, `COMMENT ON` a subsystem object.
 */
function opaqueTargetsSubsystem(stmt: Record<string, any>, schemas: Set<string>): boolean {
  if (stmt.DropStmt?.objects) {
    const objects: unknown[] = stmt.DropStmt.objects;
    const refs = objects.map(qualifiedName);
    return refs.length > 0 && refs.every(r => r !== undefined && inSubsystem(r, schemas));
  }
  if (stmt.CommentStmt?.object) {
    const ref = qualifiedName(stmt.CommentStmt.object);
    return ref !== undefined && inSubsystem(ref, schemas);
  }
  return false;
}

/**
 * Remove a subsystem's statements from a SQL script, preserving the original
 * text of every survivor (no reformat — statements are sliced out of the
 * source by parser-reported location). Also removes opaque statements that
 * provably target only subsystem objects (`DROP`/`COMMENT ON` them), which
 * membership classification alone keeps.
 *
 * Requires `await loadModule()` first (same as every other sync API here).
 * This performs no safety check by itself — callers decide what to do with
 * `result.unsatisfied` (typically: refuse before ever writing output).
 */
export function stripSubsystemSql(
  sql: string,
  selector: SubsystemSelector,
  options: { rebinds?: SchemaRouter } = {}
): StripSubsystemResult {
  const result = excludeSubsystem(sql, selector, options);
  const schemas = new Set(selector.schemas);
  const { statements } = result.program;

  const drop = new Set(result.excluded);
  for (const i of result.kept) {
    if (opaqueTargetsSubsystem(statements[i].stmt, schemas)) drop.add(i);
  }

  return {
    sql: sliceSurvivors(result.program, drop),
    result,
    dropped: [...drop].sort((a, b) => a - b)
  };
}
