/**
 * Call-graph construction and trust-boundary classification.
 *
 * Starting from the exposed entry points (functions the API roles can
 * EXECUTE), walk what those functions transitively call and touch, and emit
 * an unscored audit checklist of trust boundaries for human review:
 *
 *   CG1  trust hop           — execution crosses into a SECURITY DEFINER
 *   CG2  RLS-bypass path     — a DEFINER touches a table whose RLS its owner bypasses
 *   CG3  auth-context change — a reachable function mutates jwt claims / role
 *   CG4  internal reach      — a non-exposed table is reached via a DEFINER hop
 *   CG5  opaque node         — dynamic SQL / unparseable body; audit manually
 *
 * Plus two provable misconfigurations:
 *
 *   CF1  SECURITY DEFINER without a pinned search_path (CWE-426)
 *   CF2  SECURITY DEFINER executable by anonymous / PUBLIC
 */

import type { FunctionSnapshot } from '../pg/functions';
import type { TableSnapshot } from '../pg/introspect';
import { extractBody,type ExtractedBody } from './extract';

export interface CallGraphOptions {
  functions: FunctionSnapshot[];
  tables: TableSnapshot[];
  /** Exposed schemas; when undefined the exposure surface is unknown. */
  exposedSchemas?: string[];
  /** Roles the API connects as. EXECUTE for any of these (or PUBLIC) marks an entry point. */
  apiRoles: string[];
}

export interface CallGraphNode {
  id: string;
  schema: string;
  name: string;
  securityDefiner: boolean;
  owner: string;
  ownerBypassesRls: boolean;
  searchPathPinned: boolean;
  language: string;
  opaque: boolean;
  opaqueReason?: string;
  /** Auth-context settings this function writes (jwt claims, role, …). */
  authSettings: string[];
  /** Entry-point roles when this node is an entry (EXECUTE-granted API roles). */
  entryRoles?: string[];
}

export interface CallGraphEdge {
  from: string;
  to: string;
  kind: 'call' | 'read' | 'write';
}

export type ChecklistCode = 'CG1' | 'CG2' | 'CG3' | 'CG4' | 'CG5' | 'CF1' | 'CF2';

export interface ChecklistItem {
  code: ChecklistCode;
  /** Entry point this boundary is reachable from. */
  entry: string;
  /** Call path from the entry to the flagged node, entry first. */
  path: string[];
  /** The flagged function. */
  fn: string;
  /** The touched table, for CG2/CG4. */
  table?: string;
  message: string;
}

export interface CallGraphReport {
  entries: Array<{ fn: string; roles: string[]; securityDefiner: boolean }>;
  nodes: CallGraphNode[];
  edges: CallGraphEdge[];
  checklist: ChecklistItem[];
  stats: {
    entryPoints: number;
    reachableFunctions: number;
    trustHops: number;
    rlsBypassPaths: number;
    authContextMutations: number;
    internalReach: number;
    opaqueNodes: number;
  };
}

/** GUC names whose mutation means the function changes who the caller "is". */
const AUTH_SETTING_PATTERN = /jwt|claims|role|session_authorization|user_id|\bauth\b/i;

export async function buildCallGraph(options: CallGraphOptions): Promise<CallGraphReport> {
  const exposureKnown = options.exposedSchemas !== undefined;
  const exposed = new Set(options.exposedSchemas ?? []);
  const apiRoles = new Set([...options.apiRoles, 'PUBLIC']);

  // Overloads collapse into one node per schema.name — we resolve calls by
  // name, not by argument types.
  const nodesById = new Map<string, CallGraphNode>();
  const fnsById = new Map<string, FunctionSnapshot[]>();
  const fnsByName = new Map<string, string[]>();
  for (const fn of options.functions) {
    const id = `${fn.schema}.${fn.name}`;
    const group = fnsById.get(id);
    if (group) group.push(fn);
    else {
      fnsById.set(id, [fn]);
      const byName = fnsByName.get(fn.name);
      if (byName) byName.push(id);
      else fnsByName.set(fn.name, [id]);
    }
  }

  const tablesById = new Map<string, TableSnapshot>();
  const tablesByName = new Map<string, string[]>();
  for (const t of options.tables) {
    const id = `${t.schema}.${t.name}`;
    tablesById.set(id, t);
    const byName = tablesByName.get(t.name);
    if (byName) byName.push(id);
    else tablesByName.set(t.name, [id]);
  }

  // Entry points: functions in an exposed schema (or anywhere, when exposure
  // is unknown) that an API role can EXECUTE.
  const entries: Array<{ fn: string; roles: string[]; securityDefiner: boolean }> = [];
  for (const [id, group] of fnsById) {
    const fn = group[0];
    if (exposureKnown && !exposed.has(fn.schema)) continue;
    const roles = [...new Set(
      group.flatMap((g) => g.grants.map((gr) => gr.role)).filter((r) => apiRoles.has(r))
    )].sort();
    if (roles.length === 0) continue;
    entries.push({ fn: id, roles, securityDefiner: group.some((g) => g.isSecurityDefiner) });
  }
  entries.sort((a, b) => a.fn.localeCompare(b.fn));

  // Extract bodies lazily, memoized per node.
  const bodies = new Map<string, ExtractedBody>();
  const getBody = async (id: string): Promise<ExtractedBody> => {
    const cached = bodies.get(id);
    if (cached) return cached;
    const group = fnsById.get(id) ?? [];
    const merged: ExtractedBody = { calls: [], tables: [], settings: [], opaque: false };
    for (const fn of group) {
      const b = await extractBody(fn);
      merged.calls.push(...b.calls);
      merged.tables.push(...b.tables);
      merged.settings.push(...b.settings);
      if (b.opaque && !merged.opaque) {
        merged.opaque = true;
        merged.opaqueReason = b.opaqueReason;
      }
    }
    bodies.set(id, merged);
    return merged;
  };

  const resolveCall = (ref: { schema?: string; name: string }): string[] => {
    if (ref.schema) {
      return fnsById.has(`${ref.schema}.${ref.name}`) ? [`${ref.schema}.${ref.name}`] : [];
    }
    // Unqualified: candidates are every user function with that name. None →
    // assume a builtin. Multiple → follow all (conservative over-approximation).
    return fnsByName.get(ref.name) ?? [];
  };

  const resolveTable = (ref: { schema?: string; name: string }): string[] => {
    if (ref.schema) {
      return tablesById.has(`${ref.schema}.${ref.name}`) ? [`${ref.schema}.${ref.name}`] : [];
    }
    return tablesByName.get(ref.name) ?? [];
  };

  const ensureNode = (id: string, body: ExtractedBody): CallGraphNode => {
    let node = nodesById.get(id);
    if (node) return node;
    const group = fnsById.get(id) ?? [];
    const fn = group[0];
    node = {
      id,
      schema: fn.schema,
      name: fn.name,
      securityDefiner: group.some((g) => g.isSecurityDefiner),
      owner: fn.owner,
      ownerBypassesRls: fn.ownerBypassesRls,
      searchPathPinned: group.every((g) => g.searchPathPinned),
      language: fn.language,
      opaque: body.opaque,
      ...(body.opaqueReason ? { opaqueReason: body.opaqueReason } : {}),
      authSettings: body.settings.filter((s) => AUTH_SETTING_PATTERN.test(s)).sort()
    };
    nodesById.set(id, node);
    return node;
  };

  const edges: CallGraphEdge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (edge: CallGraphEdge): void => {
    const key = `${edge.from}→${edge.to}:${edge.kind}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(edge);
  };

  const checklist: ChecklistItem[] = [];
  const itemKeys = new Set<string>();
  const addItem = (item: ChecklistItem): void => {
    // Dedupe on (code, fn, table) — the shortest path from the first entry
    // that reaches the boundary is kept as the exemplar.
    const key = `${item.code}::${item.fn}::${item.table ?? ''}`;
    if (itemKeys.has(key)) return;
    itemKeys.add(key);
    checklist.push(item);
  };

  // BFS from each entry point; nodes are visited once globally for graph
  // construction, but per-entry paths drive the checklist exemplars.
  const globallyVisited = new Set<string>();

  for (const entry of entries) {
    const queue: Array<{ id: string; path: string[] }> = [{ id: entry.fn, path: [entry.fn] }];
    const visited = new Set<string>([entry.fn]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const body = await getBody(id);
      const node = ensureNode(id, body);
      if (id === entry.fn) node.entryRoles = entry.roles;

      const firstVisit = !globallyVisited.has(id);
      globallyVisited.add(id);

      // Does the path so far cross a DEFINER boundary?
      const pathHasDefiner = path.some((p) => nodesById.get(p)?.securityDefiner);

      if (node.opaque) {
        addItem({
          code: 'CG5', entry: entry.fn, path, fn: id,
          message: node.opaqueReason ?? 'body cannot be followed statically — audit manually'
        });
      }
      if (node.authSettings.length > 0) {
        addItem({
          code: 'CG3', entry: entry.fn, path, fn: id,
          message: `mutates auth context: ${node.authSettings.join(', ')}`
        });
      }
      if (node.securityDefiner && firstVisit) {
        if (!node.searchPathPinned) {
          addItem({
            code: 'CF1', entry: entry.fn, path, fn: id,
            message: 'SECURITY DEFINER without a pinned search_path (CWE-426) — set `SET search_path` on the function'
          });
        }
        const group = fnsById.get(id) ?? [];
        const wideRoles = [...new Set(
          group.flatMap((g) => g.grants.map((gr) => gr.role))
            .filter((r) => r === 'PUBLIC' || r === 'anonymous')
        )].sort();
        if (wideRoles.length > 0) {
          addItem({
            code: 'CF2', entry: entry.fn, path, fn: id,
            message: `SECURITY DEFINER executable by ${wideRoles.join(', ')} — widest blast radius; confirm this is intended`
          });
        }
      }

      // Table edges.
      for (const t of body.tables) {
        for (const tableId of resolveTable(t)) {
          const table = tablesById.get(tableId)!;
          addEdge({ from: id, to: tableId, kind: t.write ? 'write' : 'read' });

          const effectiveDefiner = node.securityDefiner || pathHasDefiner;
          if (
            node.securityDefiner
            && (node.owner === table.owner || node.ownerBypassesRls)
            && !table.rlsForced
          ) {
            addItem({
              code: 'CG2', entry: entry.fn, path, fn: id, table: tableId,
              message: `RLS on ${tableId} does not apply on this path — ${id} is SECURITY DEFINER running as ${node.owner}`
                + (node.ownerBypassesRls ? ' (BYPASSRLS/superuser)' : ` (owner of ${tableId})`)
            });
          }
          if (exposureKnown && !exposed.has(table.schema) && effectiveDefiner) {
            addItem({
              code: 'CG4', entry: entry.fn, path, fn: id, table: tableId,
              message: `${t.write ? 'writes' : 'reads'} internal table ${tableId} via a SECURITY DEFINER path`
            });
          }
        }
      }

      // Call edges.
      for (const c of body.calls) {
        for (const calleeId of resolveCall(c)) {
          if (calleeId === id) continue;
          addEdge({ from: id, to: calleeId, kind: 'call' });
          const calleeBody = await getBody(calleeId);
          const callee = ensureNode(calleeId, calleeBody);
          if (callee.securityDefiner) {
            addItem({
              code: 'CG1', entry: entry.fn, path: [...path, calleeId], fn: calleeId,
              message: `trust hop — execution crosses into SECURITY DEFINER ${calleeId} (runs as ${callee.owner})`
            });
          }
          if (!visited.has(calleeId)) {
            visited.add(calleeId);
            queue.push({ id: calleeId, path: [...path, calleeId] });
          }
        }
      }
    }

    // The entry itself being a DEFINER is the first trust hop.
    const entryNode = nodesById.get(entry.fn);
    if (entryNode?.securityDefiner) {
      addItem({
        code: 'CG1', entry: entry.fn, path: [entry.fn], fn: entry.fn,
        message: `trust hop — entry point is SECURITY DEFINER (runs as ${entryNode.owner}; callable by ${entry.roles.join(', ')})`
      });
    }
  }

  checklist.sort(compareItems);
  const nodes = [...nodesById.values()].sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.kind.localeCompare(b.kind));

  const count = (code: ChecklistCode): number => checklist.filter((i) => i.code === code).length;

  return {
    entries,
    nodes,
    edges,
    checklist,
    stats: {
      entryPoints: entries.length,
      reachableFunctions: globallyVisited.size,
      trustHops: count('CG1'),
      rlsBypassPaths: count('CG2'),
      authContextMutations: count('CG3'),
      internalReach: count('CG4'),
      opaqueNodes: count('CG5')
    }
  };
}

const CODE_ORDER: Record<ChecklistCode, number> = {
  CF1: 0, CF2: 1, CG2: 2, CG3: 3, CG1: 4, CG4: 5, CG5: 6
};

function compareItems(a: ChecklistItem, b: ChecklistItem): number {
  if (CODE_ORDER[a.code] !== CODE_ORDER[b.code]) return CODE_ORDER[a.code] - CODE_ORDER[b.code];
  if (a.fn !== b.fn) return a.fn.localeCompare(b.fn);
  return (a.table ?? '').localeCompare(b.table ?? '');
}
