/**
 * Content presets are the *contents* of a database, as opposed to module
 * presets, which are the modules a database installs. One entry becomes one
 * `content_presets` row — `(kind, slug)` keyed, merkle-versioned — and
 * provisioning resolves a slug through
 * `metaschema_generators.content_preset_definition(kind, slug)`.
 *
 * They live here, beside the module presets, for one reason: the numbers in a
 * trust ladder are product decisions, and a decision belongs somewhere a
 * reviewer can read it as a table of rows. Previously they were literal
 * `jsonb_build_object` calls inside a PL/pgSQL function, where changing what a
 * rung is worth meant editing a generator.
 *
 * Nothing here is privileged. A tenant that tunes its own rows and captures
 * them writes a row of exactly this shape, resolved by exactly the same
 * lookup — these are simply the ones we ship.
 */

import type { LimitDefault, TrustLadderRung } from '../module-presets/types';

/** The catalog kinds a content preset can be authored for. */
export type ContentPresetKind = 'trust_ladder' | 'limit_defaults';

/** Fields every content preset carries, whatever its kind. */
type ContentPresetBase = {
  /** Slug a caller names in module options, unique per kind. */
  slug: string;
  /** Human-readable label for a picker. */
  label: string;
  /** What this preset is for, and — where it matters — why the numbers are what they are. */
  description: string;
};

/**
 * A ladder of progressive trust: an ordered set of rungs, each naming the
 * evidence it wants and what earning it is worth. Rungs sharing a `group` are
 * alternatives — any one of them satisfies the rung, and they share one reward.
 */
export type TrustLadderPreset = ContentPresetBase & {
  kind: 'trust_ladder';
  rungs: TrustLadderRung[];
};

/** A baseline allowance an unproven principal starts with. */
export type LimitBaselinePreset = ContentPresetBase & {
  kind: 'limit_defaults';
  limits: LimitDefault[];
};

export type ContentPreset = TrustLadderPreset | LimitBaselinePreset;

/** The document provisioning installs for a preset: an array of rows. */
export function contentPresetDefinition(
  preset: ContentPreset
): TrustLadderRung[] | LimitDefault[] {
  return preset.kind === 'trust_ladder' ? preset.rungs : preset.limits;
}
