import * as path from 'path';

import {
  DirectorySkillSource,
  fetchSkillsFromGit,
  HarnessSkill,
  latestLocalRelease,
  materializeSkills,
  resolveSkills,
  SkillSource
} from '@agentic-kit/harness';

import { AgentCliConfig, BASE_LAYER, OVERLAY_LAYER } from './config';

/** An empty layer so a missing/unavailable source never breaks assembly. */
class EmptySkillSource implements SkillSource {
  constructor(public readonly name: string) {}
  async load(): Promise<HarnessSkill[]> {
    return [];
  }
}

async function baseSource(config: AgentCliConfig, log: (msg: string) => void): Promise<SkillSource> {
  try {
    const release = await fetchSkillsFromGit({
      repo: config.skillsRepo,
      pin: config.skillsPin,
      skillsRoot: config.dirs.skillsRoot,
      token: process.env.GITHUB_TOKEN
    });
    log(`skills base: ${config.skillsRepo}@${release.version}${release.fromCache ? ' (cached)' : ''}`);
    return new DirectorySkillSource(BASE_LAYER, release.skillsDir);
  } catch (error) {
    const local = latestLocalRelease(config.dirs.skillsRoot);
    if (local) {
      log(`skills base: offline fallback to local release ${local.version} (${(error as Error).message})`);
      return new DirectorySkillSource(BASE_LAYER, local.skillsDir);
    }
    log(`skills base: unavailable, continuing without it (${(error as Error).message})`);
    return new EmptySkillSource(BASE_LAYER);
  }
}

/**
 * Assemble the effective skill tree (fetched base + local overlay, later
 * layer wins wholesale by skill name) into pi's agent dir so the session
 * picks it up as regular skills.
 */
export async function assembleSkills(
  config: AgentCliConfig,
  log: (msg: string) => void = () => undefined
): Promise<HarnessSkill[]> {
  const sources: SkillSource[] = [];
  for (const ref of config.manifest.sources) {
    if (ref.name === BASE_LAYER) {
      sources.push(await baseSource(config, log));
    } else if (ref.name === OVERLAY_LAYER) {
      sources.push(new DirectorySkillSource(OVERLAY_LAYER, config.overlayDir));
    } else {
      throw new Error(`Unknown manifest source: ${ref.name}`);
    }
  }
  const resolved = await resolveSkills(config.manifest, sources, {
    onMissingRequire: (skill, required) => log(`skill ${skill} requires missing skill ${required}`)
  });
  materializeSkills(path.join(config.agentDir, 'skills'), resolved);
  log(`skills materialized: ${resolved.map((s) => s.name).join(', ') || '(none)'}`);
  return resolved;
}
