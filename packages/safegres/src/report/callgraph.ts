import yanse from 'yanse';

import type { CallGraphReport, ChecklistCode, ChecklistItem } from '../callgraph/graph';

type Painter = (s: string) => string;

const CODE_META: Record<ChecklistCode, { title: string; paint: Painter }> = {
  CF1: { title: 'DEFINER without pinned search_path (provable — fix these)', paint: yanse.red },
  CF2: { title: 'DEFINER executable by anonymous/PUBLIC (provable — confirm intent)', paint: yanse.red },
  CG2: { title: 'RLS-bypass paths (RLS does not protect the table on this path)', paint: yanse.yellow },
  CG3: { title: 'auth-context mutations (functions that change who you are)', paint: yanse.yellow },
  CG1: { title: 'trust hops (execution crosses into SECURITY DEFINER)', paint: yanse.cyan },
  CG4: { title: 'internal tables reached via DEFINER paths', paint: yanse.cyan },
  CG5: { title: 'opaque nodes (static analysis ends here — audit manually)', paint: yanse.gray }
};

const CODE_ORDER: ChecklistCode[] = ['CF1', 'CF2', 'CG2', 'CG3', 'CG1', 'CG4', 'CG5'];

export interface RenderCallGraphOptions {
  color?: boolean;
  /** Only the stats line — no checklist items. */
  summary?: boolean;
}

export function renderCallGraph(cg: CallGraphReport, options: RenderCallGraphOptions = {}): string {
  const color = options.color === true;
  const paint = (p: Painter, s: string) => (color ? p(s) : s);

  const s = cg.stats;
  const lines: string[] = [
    paint(yanse.bold, 'call graph — trust boundaries reachable from the exposed surface (unscored; human review)'),
    `  ${s.entryPoints} entry point(s) → ${s.reachableFunctions} reachable function(s)`
      + `  |  ${s.trustHops} trust hop(s)  ${s.rlsBypassPaths} RLS-bypass  `
      + `${s.authContextMutations} auth-context  ${s.internalReach} internal-reach  ${s.opaqueNodes} opaque`
  ];

  if (options.summary || cg.checklist.length === 0) {
    if (cg.checklist.length === 0) lines.push('  no trust boundaries found.');
    return lines.join('\n');
  }

  for (const code of CODE_ORDER) {
    const items = cg.checklist.filter((i) => i.code === code);
    if (items.length === 0) continue;
    const meta = CODE_META[code];
    lines.push('', paint(meta.paint, `${code} — ${meta.title} (${items.length})`));
    for (const item of items) {
      lines.push(...renderItem(item));
    }
  }

  return lines.join('\n');
}

function renderItem(item: ChecklistItem): string[] {
  const subject = item.table ? `${item.fn} → ${item.table}` : item.fn;
  const out = [`  • ${subject}`, `      ${item.message}`];
  if (item.path.length > 1) {
    out.push(`      via: ${item.path.join(' → ')}`);
  } else if (item.entry !== item.fn) {
    out.push(`      via: ${item.entry}`);
  }
  return out;
}
