export type {
  BlockPageDocument,
  ContentPreset,
  ContentPresetKind,
  FunctionRouteBinding,
  LimitBaselinePreset,
  PageDocument,
  PagesPreset,
  PrincipalPreset,
  PrincipalPresetCredentials,
  PrincipalPresetDefinition,
  PrincipalPresetScope,
  ProsePageDocument,
  RedirectRouteBinding,
  RobotsDirective,
  RobotsPreset,
  RouteBinding,
  RouteBindingsPreset,
  TrustLadderPreset,
} from './types';

import { agent } from './agent';
import { approvals } from './approvals';
import { humanity } from './humanity';
import { layouts } from './layouts';
import { legal } from './legal';
import { mantra } from './mantra';
import { mantraStandalone } from './mantra-standalone';
import { metered, meteredBaseline } from './metered';
import { deployBot, readOnlyAnalyst } from './principals';
import { robotsNoAi, robotsOpen } from './robots';
import { sso } from './sso';
import type { ContentPreset } from './types';

export {
  agent,
  approvals,
  deployBot,
  humanity,
  layouts,
  legal,
  mantra,
  mantraStandalone,
  metered,
  meteredBaseline,
  readOnlyAnalyst,
  robotsNoAi,
  robotsOpen,
  sso,
};

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
  mantra,
  legal,
  approvals,
  robotsOpen,
  robotsNoAi,
  // Appended, not grouped with `legal`: the catalog's order is the order of the
  // generated alteration files, so inserting a preset in the middle renumbers
  // every one after it and rewrites alterations deployed databases have already
  // applied. A new preset goes last.
  layouts,
  readOnlyAnalyst,
  deployBot,
  agent,
  mantraStandalone,
  sso,
];

/** Look up a shipped content preset by kind and slug. */
export function getContentPreset(
  kind: ContentPreset['kind'],
  slug: string
): ContentPreset | undefined {
  return allContentPresets.find((p) => p.kind === kind && p.slug === slug);
}
