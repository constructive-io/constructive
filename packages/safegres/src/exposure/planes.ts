/**
 * Plane reach and per-plane scoring.
 *
 * A plane is an access path: a set of schemas (`api`, `schema`) or a set of
 * roles (`role`). Reach is the set of relations a plane can touch — for a
 * schema plane that is membership, for a role plane it is the effective-grant
 * closure the lattice rules already compute (direct grants, grants TO PUBLIC,
 * and role inheritance). Every plane is then scored by the *same* function on
 * the *same* findings; only the finding set and the density denominator
 * differ.
 */

import type { RoleGraph } from '../checks/lattice';
import { effectiveGrants } from '../checks/lattice';
import type { ScoringConfig } from '../config/types';
import type { ResolvedPlane } from '../pg/exposure';
import type { TableSnapshot } from '../pg/introspect';
import { computeScore } from '../score/score';
import type { Finding, PlaneReport } from '../types';
import { summarize } from '../types';
import type { ApiReach, UnreachableRelation } from './reach';

/** A plane with its reach resolved against the catalog. */
export interface PlaneReach {
  plane: ResolvedPlane;
  /** `schema.table` keys the plane can touch. */
  relations: Set<string>;
  /** Schemas the plane touches (computed for role planes, declared otherwise). */
  schemas: string[];
  /** Most direct provenance across the plane's relations (role planes). */
  reachedVia?: 'grant' | 'PUBLIC' | 'inheritance';
  /** Why a declared plane was not graded. */
  skipped?: string;
  /**
   * Relations in the plane's schemas that its API cannot address, subtracted
   * from `relations`. Reported so the subtraction is auditable rather than
   * invisible.
   */
  unaddressable?: UnreachableRelation[];
}

export function relationKey(schema: string, table: string): string {
  return `${schema}.${table}`;
}

/**
 * Resolve what each plane can reach.
 *
 * A `role` plane for a superuser or `BYPASSRLS` role is refused rather than
 * graded: RLS does not apply to it, so it reaches everything and grades 0 by
 * construction — a number that teaches nothing and would read as a finding.
 */
export function resolvePlaneReach(
  planes: ResolvedPlane[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  apiReach?: ApiReach
): PlaneReach[] {
  return planes.map((plane) => {
    // A role plane is grant-truth and no API declaration narrows it: the
    // GraphQL API not exposing a table says nothing about a role holding a
    // direct connection to the database. This is the whole reason relation
    // reach is safe to apply at all.
    if (plane.kind === 'role') return roleReach(plane, tables, graph);

    const schemas = new Set(plane.schemas);
    const relations = new Set(
      tables.filter((t) => schemas.has(t.schema)).map((t) => relationKey(t.schema, t.name))
    );

    const unaddressable = (apiReach?.unreachable ?? []).filter((r) =>
      relations.has(relationKey(r.schema, r.table))
    );
    for (const r of unaddressable) relations.delete(relationKey(r.schema, r.table));

    return {
      plane,
      relations,
      schemas: [...schemas].sort(),
      ...(unaddressable.length > 0 ? { unaddressable } : {})
    };
  });
}

function roleReach(plane: ResolvedPlane, tables: TableSnapshot[], graph: RoleGraph): PlaneReach {
  const unsafe = plane.roles.filter((role) => {
    const attrs = graph.get(role);
    return attrs?.bypassRls === true || attrs?.isSuper === true;
  });
  if (unsafe.length > 0) {
    return {
      plane,
      relations: new Set(),
      schemas: [],
      skipped:
        `${unsafe.join(', ')} bypasses row-level security — every relation is unmediated for it, `
        + 'so a grade would say nothing about the schema'
    };
  }

  const relations = new Set<string>();
  const schemas = new Set<string>();
  let via: PlaneReach['reachedVia'];
  for (const table of tables) {
    for (const role of plane.roles) {
      const grants = effectiveGrants(table, role, graph);
      if (grants.length === 0) continue;
      relations.add(relationKey(table.schema, table.name));
      schemas.add(table.schema);
      for (const grant of grants) via = mostDirect(via, viaOf(grant.via));
      break;
    }
  }
  return { plane, relations, schemas: [...schemas].sort(), ...(via ? { reachedVia: via } : {}) };
}

function viaOf(via: string): NonNullable<PlaneReach['reachedVia']> {
  if (via === 'direct') return 'grant';
  if (via === 'PUBLIC') return 'PUBLIC';
  return 'inheritance';
}

const VIA_RANK: Record<NonNullable<PlaneReach['reachedVia']>, number> = {
  grant: 0,
  PUBLIC: 1,
  inheritance: 2
};

function mostDirect(
  a: PlaneReach['reachedVia'],
  b: NonNullable<PlaneReach['reachedVia']>
): NonNullable<PlaneReach['reachedVia']> {
  return a === undefined || VIA_RANK[b] < VIA_RANK[a] ? b : a;
}

/**
 * True when a finding is reachable on a plane. A finding with no relation
 * (e.g. W1, an audit-level advisory) belongs to every plane; a schema-level
 * finding (L4) belongs to the planes that touch the schema.
 */
export function onPlane(finding: Finding, reach: PlaneReach): boolean {
  if (!finding.schema) return true;
  if (!finding.table) return reach.schemas.includes(finding.schema);
  return reach.relations.has(relationKey(finding.schema, finding.table));
}

/** Stamp `finding.planes` with every plane the finding is reachable on. */
export function stampPlanes(findings: Finding[], reaches: PlaneReach[]): void {
  const graded = reaches.filter((r) => !r.skipped);
  if (graded.length === 0) return;
  for (const finding of findings) {
    const names = graded.filter((r) => onPlane(finding, r)).map((r) => r.plane.name);
    if (names.length > 0) finding.planes = names;
  }
}

/**
 * Score one secondary plane. Findings are re-stamped `exposed: true` because
 * "exposed" is a statement about the *primary* surface: a relation that is
 * internal to the API is not internal to a role holding a direct connection
 * to it, which is the entire point of grading the plane separately.
 */
export function scorePlane(
  reach: PlaneReach,
  securityFindings: Finding[],
  scoring: ScoringConfig | undefined,
  exposureKnown: boolean
): PlaneReport {
  const findings = securityFindings
    .filter((f) => onPlane(f, reach))
    .map((f) => ({ ...f, exposed: true }));

  const { plane } = reach;
  return {
    name: plane.name,
    kind: plane.kind,
    primary: plane.primary,
    source: plane.source,
    schemas: reach.schemas,
    ...(plane.roles.length > 0 ? { roles: plane.roles } : {}),
    exposedTables: reach.relations.size,
    ...(reach.unaddressable && reach.unaddressable.length > 0
      ? { unaddressableTables: reach.unaddressable.length }
      : {}),
    ...(reach.reachedVia ? { reachedVia: reach.reachedVia } : {}),
    score: computeScore(findings, scoring, {
      exposedTables: reach.relations.size,
      exposureKnown
    }),
    summary: summarize(findings)
  };
}
