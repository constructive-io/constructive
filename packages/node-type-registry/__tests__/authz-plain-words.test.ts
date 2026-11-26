import * as authz from '../src/authz';
import type { NodeTypeDefinition } from '../src/types';

const authzNodes: NodeTypeDefinition[] = Object.values(authz);

const BANNED_ENGINE_WORDS = [/\bSPRT\b/i, /\bRLS\b/i, /\bpermissive\b/i, /\bmembership_type\b/i, /\bpredicate\b/i];

function plainWords(node: NodeTypeDefinition): string[] {
  return [node.summary, ...(node.use_when ?? []), ...(node.avoid_when ?? []), ...(node.risks ?? [])].filter(
    (text): text is string => typeof text === 'string'
  );
}

describe('authz plain words', () => {
  test.each(authzNodes.map((node) => [node.name, node] as const))('%s has a summary', (_name, node) => {
    expect(node.summary?.trim()).toBeTruthy();
  });

  test('no plain-word field uses an engine word', () => {
    const hits = authzNodes.flatMap((node) =>
      plainWords(node).flatMap((text) => BANNED_ENGINE_WORDS.filter((word) => word.test(text)).map((word) => `${node.name}: ${word} in "${text}"`))
    );
    expect(hits).toEqual([]);
  });
});
