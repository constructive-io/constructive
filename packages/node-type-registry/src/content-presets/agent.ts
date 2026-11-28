import type { TrustLadderPreset } from './types';

/**
 * How an agent principal earns standing in a scope: by finishing runs there.
 *
 * `agent_proven` — three completed runs. Cheap, and deliberately so: it says
 * the agent has done real work here, nothing more.
 *
 * `agent_trusted` — ten completed runs inside a 30-day window, and it lapses
 * 30 days after it is earned, so an idle agent drifts back to proven rather
 * than keeping a standing nobody has re-checked. A replayed refresh token or a
 * refused attempt to widen its own scope demotes it on the spot, and demotion
 * resets the count: the agent re-earns trust from zero, it does not get it
 * back on the next run.
 *
 * Neither rung unlocks anything by itself. Which permissions wait for which
 * rung is the scope administrator's vocabulary, not the platform's — a tenant
 * arms the ladder by adding `unlocks: ['manage_domains', …]` in its own
 * catalog's names, and an unknown name fails the seed rather than silently
 * un-gating. Seeding `agent` alone therefore changes no principal's mask.
 *
 * Trust is earned per scope: the ladder an entity seeds counts that entity's
 * runs, and an agent proven in one organization is a stranger in the next.
 */
export const agent: TrustLadderPreset = {
  kind: 'trust_ladder',
  slug: 'agent',
  label: 'Agent trust',
  description:
    'Proven after three completed runs, trusted after ten in a 30-day window; a replayed refresh token or a refused widening demotes trusted. Unlocks are the scope administrator\'s to name.',
  rungs: [
    {
      level: 'agent_proven',
      event: 'agent.run.completed',
      required_count: 3,
      period_interval: '30 days',
    },
    {
      level: 'agent_trusted',
      event: 'agent.run.completed',
      required_count: 10,
      period_interval: '30 days',
      expires_interval: '30 days',
      revoked_by: ['token.refresh_reused', 'PRINCIPAL_CHILD_WIDENS'],
    },
  ],
};
