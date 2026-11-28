import type { RouteBindingsPreset } from './types';

/**
 * Approvals: where a parked graph node's notification points.
 *
 * Its own slug rather than a widening of `mantra`, because the two answer
 * different questions and a site should be able to take one without the other:
 * Mantra is who you are, approvals is what is waiting on you. A tenant serving
 * its own auth pages still wants this set, and a tenant with no human-in-the-
 * loop graphs wants neither.
 *
 * One binding, not two, because a route path is a *prefix*: `resolve_route`
 * matches the path exactly or followed by `/`, longest first, so `/approvals`
 * serves both the queue and `/approvals/<execution_id>/<node_name>`. The
 * question's reference therefore travels in the path — an address, never a
 * credential — and the page reads it back. Binding the parameterised form
 * separately would be a second row saying the same thing, and the two could
 * disagree.
 */
export const approvals: RouteBindingsPreset = {
  kind: 'route_bindings',
  slug: 'approvals',
  label: 'Approvals pages',
  description:
    "The human-in-the-loop answer surface served by the approvals function image: /approvals is everything waiting on you, and /approvals/<execution_id>/<node_name> is one question, rendered from its graph node-state row and settled through that scope's own approve_node. Bound as a single path prefix; claims no root or catch-all path, and installs independently of the auth pages.",
  bindings: [{ path: '/approvals', task_identifier: 'approvals:pages' }],
};
