import { ConfigValidationError } from './resolve';
import { CONFIG_SHAPE, type Node } from './schema';

/**
 * Check a config against the described shape: unknown keys, and values of the
 * wrong kind.
 *
 * A typo'd key used to be *silently ignored*, which for a file that decides
 * whether CI fails is the worst possible outcome — `failon: { grade: 'B' }`
 * reads as a passing build rather than as a mistake. So this rejects rather
 * than warns, and names the key it thinks you meant.
 *
 * Value checks stay shallow on purpose: rule settings, severities and grades
 * are validated by `resolveRules` and by the gate code, which know the rule
 * registry. This is the shape, not the semantics.
 */
export function validateConfigShape(config: unknown): void {
  const problems: string[] = [];
  checkObject(config, CONFIG_SHAPE as Record<string, Node>, '', problems, ['$schema', 'extends']);
  if (problems.length === 0) return;
  throw new ConfigValidationError(
    `Invalid safegres configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`
  );
}

function checkObject(
  value: unknown,
  properties: Record<string, Node>,
  path: string,
  problems: string[],
  extraKeys: string[] = []
): void {
  if (!isPlainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (extraKeys.includes(key)) continue;
    const node = properties[key];
    if (!node) {
      problems.push(`unknown key ${quote(path, key)}${suggestion(key, Object.keys(properties))}`);
      continue;
    }
    checkNode(entry, node, path ? `${path}.${key}` : key, problems);
  }
}

function checkNode(value: unknown, node: Node, path: string, problems: string[]): void {
  if (value === undefined || value === null) return;
  switch (node.type) {
  case 'any':
    return;
  case 'string':
    if (typeof value !== 'string') return void problems.push(wrongType(path, 'a string', value));
    if (node.enum && !node.enum.includes(value)) {
      problems.push(`"${path}" is "${value}"; expected one of ${node.enum.map((v) => `"${v}"`).join(', ')}`);
    }
    return;
  case 'number':
    if (typeof value !== 'number') problems.push(wrongType(path, 'a number', value));
    return;
  case 'boolean':
    if (typeof value !== 'boolean') problems.push(wrongType(path, 'a boolean', value));
    return;
  case 'array':
    if (!Array.isArray(value)) return void problems.push(wrongType(path, 'an array', value));
    value.forEach((item, i) => checkNode(item, node.items, `${path}[${i}]`, problems));
    return;
  case 'object':
    if (!isPlainObject(value)) return void problems.push(wrongType(path, 'an object', value));
    checkObject(value, node.properties, path, problems);
    return;
  case 'record':
    if (!isPlainObject(value)) return void problems.push(wrongType(path, 'an object', value));
    for (const [key, entry] of Object.entries(value)) {
      checkNode(entry, node.values, `${path}.${key}`, problems);
    }
    return;
  case 'union': {
    // A union is satisfied by any branch, so only report when every branch
    // rejects — and then report the branch that complained least.
    const attempts = node.of.map((branch) => {
      const branchProblems: string[] = [];
      checkNode(value, branch, path, branchProblems);
      return branchProblems;
    });
    if (attempts.some((a) => a.length === 0)) return;
    const best = attempts.reduce((a, b) => (b.length < a.length ? b : a));
    problems.push(...best);
  }
  }
}

function wrongType(path: string, expected: string, value: unknown): string {
  return `"${path}" is ${describe(value)}; expected ${expected}`;
}

function describe(value: unknown): string {
  if (Array.isArray(value)) return 'an array';
  if (value === null) return 'null';
  return `a ${typeof value}`;
}

function quote(path: string, key: string): string {
  return `"${path ? `${path}.${key}` : key}"`;
}

/** "did you mean" for one edit's worth of typo, which is the common case. */
function suggestion(key: string, known: string[]): string {
  const lower = key.toLowerCase();
  const near = known.find((k) => k.toLowerCase() === lower)
    ?? known.find((k) => distance(k.toLowerCase(), lower) <= Math.max(1, Math.floor(key.length / 4)));
  return near ? ` — did you mean "${near}"?` : '';
}

function distance(a: string, b: string): number {
  const rows: number[][] = [Array.from({ length: b.length + 1 }, (_, j) => j)];
  for (let i = 1; i <= a.length; i++) {
    rows[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return rows[a.length][b.length];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
