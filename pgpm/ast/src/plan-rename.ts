function escapeRe(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrite change names in a pgpm.plan's content according to a rename map.
 * Textual and format-preserving: only the change-name token at the start of a
 * change line, plain (same-package) dependency refs inside `[...]`, and tag
 * lines' change field are rewritten; timestamps, planners, comments,
 * cross-package refs, and tag refs are untouched.
 */
export function renameInPlanContent(content: string, renames: Map<string, string>): string {
  const froms = Array.from(renames.keys()).sort((a, b) => b.length - a.length);

  return content
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('%')) return line;

      let result = line;
      for (const from of froms) {
        const to = renames.get(from)!;
        const re = new RegExp(`(^|[\\s\\[])${escapeRe(from)}(?=$|[\\s\\]@])`, 'g');
        result = result.replace(re, `$1${to}`);
      }
      return result;
    })
    .join('\n');
}
