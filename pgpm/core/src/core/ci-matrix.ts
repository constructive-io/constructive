import fs from 'fs';
import path from 'path';

const WORKFLOW_DIR = path.join('.github', 'workflows');
const MATRIX_KEY = 'package';

const parseFlowEntries = (raw: string): string[] =>
  raw
    .split(',')
    .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);

const sortEntries = (entries: string[]): string[] =>
  [...new Set(entries)].sort((left, right) => left.localeCompare(right));

/**
 * Add a module to the `package:` matrix of a workspace's CI workflows, keeping
 * the list sorted. The list stays a plain, hand-editable array: workflows
 * without one, or without the key, are left alone.
 *
 * Returns the workflow files that changed, relative to `workspacePath`.
 */
export const addToCiMatrix = (
  workspacePath: string,
  modulePackagePath: string
): string[] => {
  const dir = path.join(workspacePath, WORKFLOW_DIR);
  if (!fs.existsSync(dir)) return [];

  const entry = modulePackagePath.split(path.sep).join('/');
  const changed: string[] = [];

  for (const file of fs.readdirSync(dir).sort()) {
    if (!/\.ya?ml$/.test(file)) continue;
    const filePath = path.join(dir, file);
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = addToMatrixYaml(original, entry);
    if (updated === original) continue;
    fs.writeFileSync(filePath, updated);
    changed.push(path.join(WORKFLOW_DIR, file).split(path.sep).join('/'));
  }

  return changed;
};

/**
 * Insert `entry` into the first `package:` sequence of a workflow, in either
 * flow (`package: [a, b]`) or block form, preserving indentation, comments and
 * everything else in the file.
 */
export const addToMatrixYaml = (source: string, entry: string): string => {
  const lines = source.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const flow = lines[index].match(
      new RegExp(`^(\\s*)${MATRIX_KEY}:\\s*\\[(.*)\\]\\s*$`)
    );
    if (flow) {
      const [, indent, raw] = flow;
      const entries = parseFlowEntries(raw);
      if (entries.includes(entry)) return source;
      const next = sortEntries([...entries, entry]);
      lines[index] = `${indent}${MATRIX_KEY}: [${next.join(', ')}]`;
      return lines.join('\n');
    }

    const block = lines[index].match(new RegExp(`^(\\s*)${MATRIX_KEY}:\\s*$`));
    if (!block) continue;

    const [, indent] = block;
    const items: { line: number; value: string }[] = [];
    let cursor = index + 1;
    let itemIndent: string | undefined;

    while (cursor < lines.length) {
      const item = lines[cursor].match(/^(\s*)-\s*(.*?)\s*$/);
      if (!item || item[1].length <= indent.length) break;
      if (itemIndent === undefined) itemIndent = item[1];
      if (item[1] !== itemIndent) break;
      items.push({ line: cursor, value: item[2].replace(/^['"]|['"]$/g, '') });
      cursor += 1;
    }

    // A `package:` key with nothing under it is a mapping we don't understand;
    // only rewrite a sequence we fully parsed.
    if (!items.length) continue;

    const values = items.map((item) => item.value);
    if (values.includes(entry)) return source;
    const next = sortEntries([...values, entry]);
    const rendered = next.map((value) => `${itemIndent}- ${value}`);
    lines.splice(items[0].line, items.length, ...rendered);
    return lines.join('\n');
  }

  return source;
};
