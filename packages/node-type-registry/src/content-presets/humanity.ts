import type { TrustLadderPreset } from './types';

/**
 * The ladder most apps actually want: is there a person behind this account,
 * and did they finish onboarding? No metering, no capacity rewards — evidence
 * projected into capability bits that policies can gate on.
 *
 * Two rungs, deliberately:
 *
 * `reachable` — one working channel, satisfied by email OR phone OR captcha
 * (alternatives share a group). It is the cheapest useful signal: it does not
 * prove a human, it proves the account can be reached, which is what makes
 * later consequences possible.
 *
 * `profile_complete` — terms accepted, privacy accepted, a chosen username and
 * an uploaded avatar. No `capability`, so it spends no bit: it is a badge, and
 * the thing an app shows a progress bar for. Onboarding completeness is not
 * trust, and conflating the two is how a checklist becomes a capability.
 *
 * Humans, bots and agents climb this identically. Nothing here asserts
 * humanity — it accumulates evidence that costs something to fake.
 */
export const humanity: TrustLadderPreset = {
  kind: 'trust_ladder',
  slug: 'humanity',
  label: 'Humanity and onboarding',
  description:
    'One reachable channel plus completed onboarding. Projects into capability bits and grants no capacity — for apps that care whether an account belongs to someone, not how much it consumes.',
  rungs: [
    // One channel is enough; three ways to prove it, one reward.
    { level: 'reachable', event: 'email.verified', group: 'contactable', capability: 'level.reachable' },
    { level: 'reachable', event: 'phone.verified', group: 'contactable', capability: 'level.reachable' },
    { level: 'reachable', event: 'captcha.passed', group: 'contactable', capability: 'level.reachable' },

    // A badge: every one of these is required, and none of them buys anything.
    { level: 'profile_complete', event: 'terms.accepted' },
    { level: 'profile_complete', event: 'privacy.accepted' },
    { level: 'profile_complete', event: 'username.chosen' },
    { level: 'profile_complete', event: 'avatar.uploaded' },
  ],
};
