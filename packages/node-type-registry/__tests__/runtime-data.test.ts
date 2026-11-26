import { buildJsonArtifacts } from '../src/codegen/generate-json';
import * as registry from '../src/index';

// Private repository paths, backend internals and issue numbers that published data must not carry.
const DENIED: Array<[string, RegExp]> = [
  ['a private repository name', /constructive-db/],
  ['a deploy path', /deploy\//],
  ['an SQL file', /\.sql\b/],
  ['a procedures path', /procedures\//],
  ['the policy parser', /rls_parser/],
  ['a private schema', /metaschema_private/],
  ['a private schema', /_private\./],
  ['a file:line pointer', /[\w-]+\.[a-z]{1,5}:\d+/],
  ['an issue number', /planning#/]
];

function* strings(value: unknown, path: string): Generator<[string, string]> {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (const [i, item] of value.entries()) yield* strings(item, `${path}[${i}]`);
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) yield* strings(item, `${path}.${key}`);
}

function leaks(root: Record<string, unknown>): string[] {
  const found: string[] = [];
  for (const [name, value] of Object.entries(root)) {
    if (typeof value === 'function') continue;
    for (const [path, text] of strings(value, name)) {
      for (const [what, pattern] of DENIED) if (pattern.test(text)) found.push(`${path}: ${what}`);
    }
  }
  return found;
}

describe('runtime data carries no internal details', () => {
  test('the exported data', () => {
    expect(leaks(registry as Record<string, unknown>)).toEqual([]);
  });

  test('the JSON files generate:json writes', () => {
    expect(leaks(buildJsonArtifacts('0.0.0') as unknown as Record<string, unknown>)).toEqual([]);
  });
});
