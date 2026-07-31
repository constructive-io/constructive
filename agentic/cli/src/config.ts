import { HarnessDirs, harnessDirs, SkillsManifest } from '@agentic-kit/harness';
import * as fs from 'fs';
import * as path from 'path';

export const DEFAULT_SKILLS_REPO = 'constructive-io/constructive-skills';
export const DEFAULT_SKILLS_PIN = 'main';

/** Layer names understood by the assembler. */
export const BASE_LAYER = 'constructive-skills';
export const OVERLAY_LAYER = 'local-overlay';

export interface AgentCliConfig {
  dirs: HarnessDirs;
  /** pi's agent dir (PI_CODING_AGENT_DIR): `<data>/agent`. */
  agentDir: string;
  /** Highest-precedence local skills: `<config>/skills-overlay/`. */
  overlayDir: string;
  /** Path of the user-editable manifest: `<config>/skills-manifest.json`. */
  manifestFile: string;
  manifest: SkillsManifest;
  skillsRepo: string;
  skillsPin: string;
}

interface ManifestFile {
  repo?: string;
  pin?: string;
  manifest?: SkillsManifest;
}

export function defaultManifest(): SkillsManifest {
  return {
    sources: [{ name: BASE_LAYER }, { name: OVERLAY_LAYER }]
  };
}

export function loadConfig(baseDir?: string): AgentCliConfig {
  const dirs = harnessDirs('constructive', baseDir);
  const agentDir = path.join(dirs.stash.data, 'agent');
  const overlayDir = path.join(dirs.stash.config, 'skills-overlay');
  const manifestFile = path.join(dirs.stash.config, 'skills-manifest.json');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(overlayDir, { recursive: true });

  let file: ManifestFile = {};
  if (fs.existsSync(manifestFile)) {
    file = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as ManifestFile;
  }

  return {
    dirs,
    agentDir,
    overlayDir,
    manifestFile,
    manifest: file.manifest ?? defaultManifest(),
    skillsRepo: process.env.AGENT_SKILLS_REPO ?? file.repo ?? DEFAULT_SKILLS_REPO,
    skillsPin: process.env.AGENT_SKILLS_PIN ?? file.pin ?? DEFAULT_SKILLS_PIN
  };
}

export function saveManifestFile(config: AgentCliConfig, file: ManifestFile): void {
  fs.mkdirSync(path.dirname(config.manifestFile), { recursive: true });
  fs.writeFileSync(config.manifestFile, JSON.stringify(file, null, 2) + '\n');
}
