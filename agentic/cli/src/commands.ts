import { deriveSubdomainEndpoint } from '@agentic-kit/pi';
import { Inquirerer } from 'inquirerer';

import { loadSession } from './account-store';
import { signIn, signOut } from './auth';
import { BACKEND_PRESETS, BackendConfig, loadBackendConfig, saveBackendConfig } from './backend-store';
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

function maskKey(token: string): string {
  if (token.length <= 10) return '****';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function presetNameFor(config: BackendConfig | null): string | undefined {
  if (!config) return undefined;
  for (const [name, preset] of Object.entries(BACKEND_PRESETS)) {
    if (preset.apiEndpoint === config.apiEndpoint) return name;
  }
  return 'custom';
}

export async function login(config: AgentCliConfig, argv: Record<string, unknown>): Promise<void> {
  if (!process.stdin.isTTY && !(argv.email && argv.password)) {
    throw new Error(
      'agent login is interactive and needs a terminal. For headless use, set CONSTRUCTIVE_USER_ID, CONSTRUCTIVE_ACCESS_TOKEN, and CONSTRUCTIVE_API_KEY.'
    );
  }

  const saved = loadBackendConfig(config.backendFile);
  const prompter = new Inquirerer({ noTty: !process.stdin.isTTY });
  try {
    const answers = await prompter.prompt(argv, [
      {
        type: 'list',
        name: 'backend',
        message: 'Backend',
        options: [...Object.keys(BACKEND_PRESETS), 'custom'],
        default: presetNameFor(saved) ?? 'localnet'
      },
      {
        type: 'text',
        name: 'apiUrl',
        message: 'API GraphQL endpoint (e.g. https://api.example.com/graphql)',
        default: saved?.apiEndpoint,
        when: (a: Record<string, unknown>) => a.backend === 'custom'
      },
      { type: 'text', name: 'email', message: 'Email' },
      { type: 'password', name: 'password', message: 'Password' }
    ]);

    let backend: BackendConfig;
    if (answers.backend === 'custom') {
      const apiUrl = String(answers.apiUrl ?? '').trim();
      const authEndpoint = deriveSubdomainEndpoint(apiUrl, 'auth');
      const modulesEndpoint = deriveSubdomainEndpoint(apiUrl, 'modules');
      if (!apiUrl || !authEndpoint || !modulesEndpoint) {
        throw new Error(`Invalid API endpoint URL: ${apiUrl || '(empty)'}`);
      }
      backend = { apiEndpoint: apiUrl, authEndpoint, modulesEndpoint };
    } else {
      backend = BACKEND_PRESETS[String(answers.backend)];
      if (!backend) throw new Error(`Unknown backend preset: ${answers.backend}`);
    }

    const session = await signIn({
      accountFile: config.accountFile,
      authEndpoint: backend.authEndpoint,
      email: String(answers.email ?? ''),
      password: String(answers.password ?? '')
    });
    saveBackendConfig(config.backendFile, backend);

    log(`signed in as ${session.email}`);
    log(`backend: ${backend.apiEndpoint}`);
    if (session.apiKey) {
      log(`API key ${maskKey(session.apiKey)} (expires ${session.apiKeyExpiresAt ?? 'unknown'})`);
    } else {
      log('warning: API key mint failed — db tools stay signed out. Run `agent login` again to retry.');
    }
    log(`session stored at ${config.accountFile}`);
  } finally {
    prompter.close();
  }
}

export async function logout(config: AgentCliConfig): Promise<void> {
  const backend = loadBackendConfig(config.backendFile) ?? BACKEND_PRESETS.localnet;
  const wasSignedIn = await signOut({
    accountFile: config.accountFile,
    authEndpoint: backend.authEndpoint
  });
  if (wasSignedIn) log('signed out — API key revoked and session cleared.');
  else log('not signed in.');
}

export function whoami(config: AgentCliConfig): void {
  const session = loadSession(config.accountFile);
  if (!session) {
    log('not signed in — run `agent login`');
    process.exitCode = 1;
    return;
  }
  const backend = loadBackendConfig(config.backendFile);
  log(`signed in as ${session.email}`);
  log(`user id: ${session.userId}`);
  log(`backend: ${backend?.apiEndpoint ?? 'unknown'}`);
  if (session.apiKey) {
    log(`API key: ${maskKey(session.apiKey)} (expires ${session.apiKeyExpiresAt ?? 'unknown'})`);
  } else {
    log('API key: none — db tools stay signed out. Run `agent login` to mint one.');
  }
  if (session.accessTokenExpiresAt) log(`access token expires: ${session.accessTokenExpiresAt}`);
  log(`session file: ${config.accountFile}`);
}

export function usage(): void {
  console.log(`agent — the pi coding agent with the Constructive harness baked in

Usage:
  agent [pi options...]        start an interactive session (pi TUI)
  agent -p "prompt"            one-shot print mode (pi)
  agent init                   configure the skills source (repo + pin)
  agent login                  sign in to the Constructive platform
  agent logout                 revoke the API key and clear the session
  agent whoami                 show the signed-in account
  agent skills list            resolve + list the effective skill set
  agent skills update          re-fetch the base release and re-materialize
  agent help                   show this help

Skills layering (later wins by skill name, wholesale):
  1. ${'constructive-skills'} release (git tag/branch/SHA pin, offline fallback)
  2. local overlay: <config>/skills-overlay/<skill-name>/SKILL.md
`);
}
