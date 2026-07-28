import { HarnessSkill } from '../types';
import { layerAllowsSkill, SkillsManifest, validateManifest } from './manifest';
import { SkillSource } from './source';

export interface ResolveSkillsOptions {
  /**
   * Called for every `requires:` entry that names a skill not present in any
   * layer (or explicitly excluded everywhere). Missing requirements never
   * throw — a skill may legitimately depend on one the host bundles itself.
   */
  onMissingRequire?: (skillName: string, requiredName: string) => void;
}

/**
 * Resolve the effective skill set from ordered source layers.
 *
 * Sources are applied in manifest order; a later layer replaces an
 * earlier layer's skill of the same name wholesale (all files), and may add
 * new skills. Include/exclude filters apply per layer.
 *
 * After merging, frontmatter `requires:` dependencies are followed
 * transitively: a required skill is pulled in even when a layer's `include`
 * list omits it. Explicit `exclude` entries still win — an excluded skill is
 * never pulled back in by a dependency.
 */
export async function resolveSkills(
  manifest: SkillsManifest,
  sources: SkillSource[],
  options: ResolveSkillsOptions = {}
): Promise<HarnessSkill[]> {
  validateManifest(manifest);
  const byName = new Map(sources.map((s) => [s.name, s]));
  const resolved = new Map<string, HarnessSkill>();
  /** Merged pool ignoring `include` filters (but honoring `exclude`) — the
   * candidates a `requires:` may pull in. */
  const requirePool = new Map<string, HarnessSkill>();
  for (const ref of manifest.sources) {
    const source = byName.get(ref.name);
    if (!source) {
      throw new Error(`Manifest source ${ref.name} has no registered SkillSource`);
    }
    for (const skill of await source.load()) {
      if (ref.exclude?.includes(skill.name)) continue;
      requirePool.set(skill.name, skill);
      if (!layerAllowsSkill(ref, skill.name)) continue;
      resolved.set(skill.name, skill);
    }
  }
  const queue = [...resolved.values()];
  while (queue.length > 0) {
    const skill = queue.pop()!;
    for (const requiredName of skill.requires) {
      if (resolved.has(requiredName)) continue;
      const required = requirePool.get(requiredName);
      if (!required) {
        options.onMissingRequire?.(skill.name, requiredName);
        continue;
      }
      resolved.set(requiredName, required);
      queue.push(required);
    }
  }
  return [...resolved.values()];
}
