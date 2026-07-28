import { Inquirerer } from 'inquirerer';

import { AgentCliConfig, defaultManifest, saveManifestFile } from './config';
import { assembleSkills } from './skills';

const log = (msg: string) => console.log(`[agent] ${msg}`);

export async function skillsList(config: AgentCliConfig): Promise<void> {
  const resolved = await assembleSkills(config, log);
  if (resolved.length === 0) {
    console.log('No skills resolved.');
    return;
  }
  for (const skill of resolved) {
    console.log(`${skill.name}  [${skill.sourceName}]  ${skill.description}`);
  }
}

export async function skillsUpdate(config: AgentCliConfig): Promise<void> {
  await assembleSkills(config, log);
}

export async function init(config: AgentCliConfig, argv: Record<string, unknown>): Promise<void> {
  const prompter = new Inquirerer({ noTty: !process.stdin.isTTY });
  const answers = await prompter.prompt(argv, [
    {
      type: 'text',
      name: 'repo',
      message: 'Skills repository (owner/repo)',
      default: config.skillsRepo
    },
    {
      type: 'text',
      name: 'pin',
      message: 'Skills pin (tag, semver range, SHA, or branch)',
      default: config.skillsPin
    }
  ]);
  saveManifestFile(config, {
    repo: answers.repo as string,
    pin: answers.pin as string,
    manifest: defaultManifest()
  });
  log(`wrote ${config.manifestFile}`);
  log(`local overlay dir (highest precedence): ${config.overlayDir}`);
}

export function usage(): void {
  console.log(`agent — the pi coding agent with the Constructive harness baked in

Usage:
  agent [pi options...]        start an interactive session (pi TUI)
  agent -p "prompt"            one-shot print mode (pi)
  agent init                   configure the skills source (repo + pin)
  agent skills list            resolve + list the effective skill set
  agent skills update          re-fetch the base release and re-materialize
  agent help                   show this help

Skills layering (later wins by skill name, wholesale):
  1. ${'constructive-skills'} release (git tag/branch/SHA pin, offline fallback)
  2. local overlay: <config>/skills-overlay/<skill-name>/SKILL.md
`);
}
