/**
 * Routine exposure: which functions an untrusted role can actually call.
 *
 * The exposure surface answers "which relations can the API address?", and
 * every finding was graded by that question — including the ones that are not
 * about a relation at all. A definer function lives in a private schema, so by
 * relation reach it is unexposed; but `anonymous` holds `EXECUTE` on it, so it
 * is one call away from whatever its owner can touch. Grading it by its schema
 * is not conservative, it is wrong in the dangerous direction.
 *
 * The question a routine finding is graded by is therefore the callability
 * one: can an untrusted role reach the function itself — `USAGE` on its
 * schema, and `EXECUTE` on the function, directly, by inheritance, or through
 * Postgres's default `EXECUTE TO PUBLIC`.
 */

import type { RoleGraph } from '../checks/lattice';
import { canEnterSchema, type SchemaAclInfo } from '../pg/acl';
import type { FunctionSnapshot } from '../pg/functions';

export interface RoutineReachOptions {
  /** Roles a request can arrive as — the API edge, plus its anonymous roles. */
  roles: string[];
  graph: RoleGraph;
  schemaAcls: Map<string, SchemaAclInfo>;
  /**
   * Schemas on the API surface. A trigger function is not directly callable
   * whatever its ACL says, so it is judged the way its firing is: reachable
   * when a write that fires it is.
   */
  exposedSchemas: Set<string>;
}

/**
 * Every `schema.name` an untrusted role can execute. Overloads collapse: the
 * finding names a function, not a signature, and a role that can call one
 * overload can reach the body the rule is talking about.
 */
export function resolveRoutineReach(
  functions: FunctionSnapshot[],
  options: RoutineReachOptions
): Set<string> {
  const reachable = new Set<string>();
  if (options.roles.length === 0) return reachable;

  for (const fn of functions) {
    const key = `${fn.schema}.${fn.name}`;
    if (reachable.has(key)) continue;
    if (fn.returnsTrigger) {
      // Postgres refuses a direct call however wide the ACL is. What reaches
      // the body is a write to the table the trigger is attached to, so the
      // API surface is the right question after all.
      if (options.exposedSchemas.has(fn.schema)) reachable.add(key);
      continue;
    }
    if (options.roles.some((role) => canExecute(fn, role, options))) reachable.add(key);
  }

  return reachable;
}

function canExecute(
  fn: FunctionSnapshot,
  role: string,
  { graph, schemaAcls }: RoutineReachOptions
): boolean {
  if (!canEnterSchema(fn.schema, role, graph, schemaAcls)) return false;
  const attrs = graph.get(role);
  if (attrs?.isSuper) return true;
  if (role === fn.owner) return true;
  return fn.grants.some(
    (g) =>
      g.role === 'PUBLIC'
      || g.role === role
      || (attrs?.inheritsFrom ?? []).includes(g.role)
  );
}
