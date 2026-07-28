import { HarnessSkill } from '../types';
import { layerAllowsSkill, SkillsManifest, validateManifest } from './manifest';
import { SkillSource } from './source';

/**
 * Resolve the effective skill set from ordered source layers.
 *
 * Sources are applied in manifest order; a later layer replaces an
 * earlier layer's skill of the same name wholesale (all files), and may add
 * new skills. Include/exclude filters apply per layer.
 */
export async function resolveSkills(
  manifest: SkillsManifest,
  sources: SkillSource[]
): Promise<HarnessSkill[]> {
  validateManifest(manifest);
  const byName = new Map(sources.map((s) => [s.name, s]));
  const resolved = new Map<string, HarnessSkill>();
  for (const ref of manifest.sources) {
    const source = byName.get(ref.name);
    if (!source) {
      throw new Error(`Manifest source ${ref.name} has no registered SkillSource`);
    }
    for (const skill of await source.load()) {
      if (!layerAllowsSkill(ref, skill.name)) continue;
      resolved.set(skill.name, skill);
    }
  }
  return [...resolved.values()];
}
