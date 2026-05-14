import type { GraphileConfig } from 'graphile-config';

/**
 * Creates a Graphile plugin that injects smart tags on table codecs during
 * the schema build phase. This runs early (before RealtimeSubscriptionsPlugin)
 * so that @realtime and other tags are visible when the subscription plugin
 * discovers tables.
 *
 * @param tagsByTable - Map of table name to tags to inject.
 *   Example: `{ items: { realtime: true } }`
 */
export function makeRealtimeSmartTagsPlugin(
  tagsByTable: Record<string, Record<string, unknown>>
): GraphileConfig.Plugin {
  return {
    name: 'RealtimeTestSmartTagsPlugin',
    version: '1.0.0',

    schema: {
      hooks: {
        init: {
          before: ['RealtimeSubscriptionsPlugin'],
          callback(_, build) {
            for (const codec of Object.values(
              (build.input as any).pgRegistry.pgCodecs
            )) {
              const c = codec as any;
              if (!c.attributes || !c.name) continue;

              const tags = tagsByTable[c.name];
              if (!tags) continue;

              if (!c.extensions) c.extensions = {};
              if (!c.extensions.tags) c.extensions.tags = {};

              Object.assign(c.extensions.tags, tags);
            }
            return _;
          },
        },
      },
    },
  };
}
