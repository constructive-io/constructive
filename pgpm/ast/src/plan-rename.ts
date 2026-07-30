/**
 * Rewrite change names in a pgpm.plan's content according to a rename map.
 * Textual and format-preserving: only the change-name token at the start of a
 * change line, plain (same-package) dependency refs inside `[...]`, and tag
 * lines' change field are rewritten; timestamps, planners, comments,
 * cross-package refs, and tag refs are untouched.
 *
 * Runs in a single linear pass: each line is scanned once and every
 * whitespace/bracket-delimited token is looked up in the rename map directly,
 * so the rewrite is O(content length) rather than O(lines × renames). A token
 * qualifies when it is bounded on the left by start-of-line, whitespace or `[`
 * and on the right by end-of-line, whitespace, `]` or `@` — which is exactly
 * the change-name and plain-dependency positions. Cross-package refs
 * (`pkg:change`) are left untouched because their change segment is preceded by
 * `:`, and a trailing `@tag` suffix is preserved because the token ends at `@`.
 */
export function renameInPlanContent(content: string, renames: Map<string, string>): string {
  if (renames.size === 0) return content;

  // One regex, compiled once per call (not per line or per rename).
  const tokenRe = /(^|[\s\[])([^\s\[\]@]+)(?=$|[\s\]@])/g;

  return content
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('%')) return line;

      return line.replace(tokenRe, (match, pre: string, token: string) => {
        const to = renames.get(token);
        return to === undefined ? match : `${pre}${to}`;
      });
    })
    .join('\n');
}
