import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';
import { type Static, Type } from 'typebox';

import { getFastAppHost } from '../pipeline/host';
import {
  appRegistry,
  type BlockMatch,
  describeMatch,
  rankBlocks,
  registryIndex,
} from './blocks-search';

const SearchBlocksSchema = Type.Object({
  query: Type.String({
    minLength: 1,
    description:
      'What the screen is for, in plain words, e.g. "agent conversations and messages" or "documents shared with investors".',
  }),
});

type SearchBlocksParams = Static<typeof SearchBlocksSchema>;

export type SearchBlocksDetails = { query: string; indexUrl: string; matches: BlockMatch[] };

export const blocksTools: ExtensionFactory = (pi) => {
  // One index read per session; a failed read is tried again on the next call.
  const readIndex = registryIndex();

  pi.registerTool({
    name: 'search_blocks',
    label: 'Search blocks',
    description:
      "Search the app's @constructive blocks registry for blocks that fit a screen: chat and agent UIs, documents, dashboards, org charts and more. Each hit gives the import line and props from its docs, the blocks it brings, and the exact install command.",
    promptSnippet:
      'search_blocks: find registry blocks for a screen, with their docs and install command.',
    parameters: SearchBlocksSchema,
    async execute(_toolCallId, params: SearchBlocksParams, _signal, _onUpdate, ctx) {
      const registry = appRegistry(ctx.cwd, {
        registryUrl: getFastAppHost().blocksRegistryUrl?.(),
      });
      const items = await readIndex(registry.indexUrl);
      const matches = rankBlocks(items, params.query);
      const text = matches.length
        ? [
          `${matches.length} block(s) for "${params.query}":`,
          ...matches.map((m) => describeMatch(m, registry)),
        ].join('\n')
        : `No block in the registry matches "${params.query}". Try other words for the screen, or compose it from the installed blocks.`;
      return {
        content: [{ type: 'text', text }],
        details: {
          query: params.query,
          indexUrl: registry.indexUrl,
          matches,
        } satisfies SearchBlocksDetails,
      };
    },
  });
};
