export type {
  ContentPreset,
  ContentPresetKind,
  LimitBaselinePreset,
  TrustLadderPreset,
} from './types';

import { humanity } from './humanity';
import { metered, meteredBaseline } from './metered';
import type { ContentPreset } from './types';

export { humanity, metered, meteredBaseline };

/**
 * Every shipped content preset, in catalog order. Consumed by `generate.ts`,
 * which emits them as `content_presets` seed rows.
 *
 * There is deliberately no `default` slug. A caller names the content it wants —
 * `humanity` for "does this account belong to someone", `metered` for "how much
 * may it consume" — because a slug called `default` hides a product decision
 * behind a word, and the two ladders answer genuinely different questions.
 */
export const allContentPresets: ContentPreset[] = [
  humanity,
  metered,
  meteredBaseline,
];

/** Look up a shipped content preset by kind and slug. */
export function getContentPreset(
  kind: ContentPreset['kind'],
  slug: string
): ContentPreset | undefined {
  return allContentPresets.find((p) => p.kind === kind && p.slug === slug);
}
