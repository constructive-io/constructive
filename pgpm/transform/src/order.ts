/**
 * Graph ordering shared by the drivers: one priority-driven topological sort
 * (Kahn) and Tarjan's strongly connected components for cycle detection.
 * Dependencies are `deps[i]` = the set of nodes `i` must follow.
 */

export interface TopologicalOrderOptions {
  /** Tie-break among ready nodes (lower first). Defaults to node index. */
  priority?: (a: number, b: number) => number;
  /** Builds the error thrown when the graph has a cycle; receives the stuck nodes. */
  onCycle: (stuck: number[]) => Error;
}

/** Stable Kahn topological order over `deps`; throws `onCycle` when nodes remain. */
export function topologicalOrder(deps: Set<number>[], options: TopologicalOrderOptions): number[] {
  const priority = options.priority ?? ((a, b) => a - b);
  const indegree = deps.map(d => d.size);
  const dependents: number[][] = deps.map((): number[] => []);
  deps.forEach((d, node) => { for (const to of d) dependents[to].push(node); });
  const ready = deps.map((_, node) => node).filter(node => indegree[node] === 0).sort(priority);
  const order: number[] = [];
  while (ready.length > 0) {
    const next = ready.shift()!;
    order.push(next);
    for (const d of dependents[next]) {
      indegree[d] -= 1;
      if (indegree[d] === 0) {
        ready.push(d);
        ready.sort(priority);
      }
    }
  }
  if (order.length !== deps.length) {
    const placed = new Set(order);
    throw options.onCycle(deps.map((_, node) => node).filter(node => !placed.has(node)));
  }
  return order;
}

/** Tarjan's SCCs over `deps`, each component in discovery order. */
export function stronglyConnectedComponents(deps: Set<number>[]): number[][] {
  const index: number[] = new Array(deps.length).fill(-1);
  const low: number[] = new Array(deps.length).fill(0);
  const onStack: boolean[] = new Array(deps.length).fill(false);
  const stack: number[] = [];
  const components: number[][] = [];
  let counter = 0;
  const visit = (node: number): void => {
    index[node] = low[node] = counter++;
    stack.push(node);
    onStack[node] = true;
    for (const to of deps[node]) {
      if (index[to] === -1) {
        visit(to);
        low[node] = Math.min(low[node], low[to]);
      } else if (onStack[to]) {
        low[node] = Math.min(low[node], index[to]);
      }
    }
    if (low[node] === index[node]) {
      const component: number[] = [];
      let member: number;
      do {
        member = stack.pop()!;
        onStack[member] = false;
        component.push(member);
      } while (member !== node);
      components.push(component.sort((a, b) => a - b));
    }
  };
  deps.forEach((_, node) => { if (index[node] === -1) visit(node); });
  return components;
}

/** Nodes on at least one cycle: members of non-trivial SCCs plus self-loops. */
export function nodesOnCycles(deps: Set<number>[]): Set<number> {
  const cyclic = new Set<number>();
  for (const component of stronglyConnectedComponents(deps)) {
    if (component.length > 1 || deps[component[0]].has(component[0])) {
      for (const node of component) cyclic.add(node);
    }
  }
  return cyclic;
}
