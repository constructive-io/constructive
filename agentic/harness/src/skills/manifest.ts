/**
 * Ordered-overlay skill source manifest.
 *
 * Skills are resolved from an ordered list of sources; later sources override
 * or add skills by name (last-write-wins). Typical order:
 *
 *   1. `constructive-skills` at a pinned release (hardened public base)
 *   2. team overlay repo(s) (skills being iterated on)
 *   3. private known-gaps overlay (internal deployments only)
 *
 * Each layer keeps its own pin so the base can harden slowly while overlays
 * stay fresh; promoting an overlay skill upstream = moving the file down a
 * layer.
 */

export interface SkillSourceRef {
  /** Unique layer name, e.g. `constructive-skills`, `team-overlay`. */
  name: string;
  /**
   * Version/SHA pin for the layer. For npm sources a semver or dist-tag; for
   * git sources a commit SHA; for local directories informational only.
   */
  pin?: string;
  /** Restrict this layer to an explicit set of skill names (default: all). */
  include?: string[];
  /** Skill names to skip from this layer. */
  exclude?: string[];
}

export interface SkillsManifest {
  /** Ordered layers, lowest precedence first. */
  sources: SkillSourceRef[];
  /**
   * Semver range of the skills release the installed harness tool code
   * supports. Updaters must not adopt releases outside this range, so skill
   * docs can never drift ahead of installed tool signatures.
   */
  compatibleSkillsRange?: string;
}

export function validateManifest(manifest: SkillsManifest): void {
  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) {
    throw new Error('Skills manifest must declare at least one source layer');
  }
  const seen = new Set<string>();
  for (const source of manifest.sources) {
    if (!source.name) {
      throw new Error('Every manifest source needs a unique `name`');
    }
    if (seen.has(source.name)) {
      throw new Error(`Duplicate manifest source name: ${source.name}`);
    }
    seen.add(source.name);
  }
}

export function layerAllowsSkill(source: SkillSourceRef, skillName: string): boolean {
  if (source.exclude?.includes(skillName)) return false;
  if (source.include && !source.include.includes(skillName)) return false;
  return true;
}
