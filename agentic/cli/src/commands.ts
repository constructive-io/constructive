import {
  backendFromEndpoints,
  listBackends,
  type PreviousKey,
  resolveSession,
  sessionProblem,
  signIn,
  signOut,
  verifySession
} from '@agentic-kit/session';
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

function maskKey(token: string): string {
  if (token.length <= 10) return '****';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export async function login(config: AgentCliConfig, argv: Record<string, unknown>): Promise<void> {
  if (!process.stdin.isTTY && !(argv.email && argv.password)) {
    throw new Error(
      'agent login is interactive and needs a terminal. For headless use, set CONSTRUCTIVE_API_ENDPOINT, CONSTRUCTIVE_USER_ID, CONSTRUCTIVE_ACCESS_TOKEN, and CONSTRUCTIVE_API_KEY.'
    );
  }

  const current = listBackends(config.store).find((backend) => backend.current);
  const savedEndpoint = current?.status === 'complete' ? current.backend.apiEndpoint : current?.status === 'incomplete' ? current.apiEndpoint : undefined;
  const prompter = new Inquirerer({ noTty: !process.stdin.isTTY });
  try {
    const answers = await prompter.prompt(argv, [
      {
        type: 'text',
        name: 'apiUrl',
        message: 'API GraphQL endpoint (e.g. https://api.example.com/graphql)',
        default: savedEndpoint ?? process.env.CONSTRUCTIVE_API_ENDPOINT
      },
      { type: 'text', name: 'email', message: 'Email' },
      { type: 'password', name: 'password', message: 'Password' }
    ]);

    const backend = backendFromEndpoints({ api: String(answers.apiUrl ?? '') });
    const { session, context, apiKey, previousKey } = await signIn({
      store: config.store,
      backend,
      email: String(answers.email ?? ''),
      password: String(answers.password ?? '')
    });

    log(`signed in as ${session.email}`);
    log(`backend: ${backend.apiEndpoint}`);
    if (session.apiKey) {
      log(`API key ${maskKey(session.apiKey)} (expires ${session.apiKeyExpiresAt ?? 'unknown'})`);
    }
    if (apiKey.kind === 'not-minted') {
      log(`warning: no new API key was minted (${apiKey.reason}); the previous key stays in use. Run \`agent login\` again to retry.`);
    }
    const replaced = previousKeyWarning(previousKey);
    if (replaced) log(`warning: ${replaced}`);
    log(`session stored in context ${context}`);
  } finally {
    prompter.close();
  }
}

function previousKeyWarning(previousKey: PreviousKey): string | null {
  if (previousKey.kind !== 'failed') return null;
  return `the API key ${previousKey.keyId} of the replaced session could not be revoked (${previousKey.reason}); it stays valid until it expires.`;
}

export async function logout(config: AgentCliConfig): Promise<void> {
  const result = await signOut({ store: config.store, session: resolveSession({ store: config.store }) });
  if (result.kind === 'not-signed-in') {
    log('not signed in.');
    return;
  }
  if (result.kind === 'from-environment') {
    log('nothing to sign out of: the session comes from the environment (CONSTRUCTIVE_USER_ID, CONSTRUCTIVE_ACCESS_TOKEN). Unset them to sign out.');
    return;
  }
  switch (result.key.kind) {
  case 'revoked':
    log('signed out — API key revoked and session cleared.');
    break;
  case 'absent':
    log('signed out — session cleared (it had no API key).');
    break;
  case 'failed':
    log(`signed out — session cleared, but the API key ${result.key.keyId} could not be revoked (${result.key.reason}); it stays valid until it expires.`);
    break;
  }
}

/** The `agent` command that stores a complete backend context. */
export const REPAIR_HINT = 'Run `agent login` to store a complete backend.';

export async function whoami(config: AgentCliConfig): Promise<void> {
  const session = resolveSession({ store: config.store });
  if (session.kind !== 'signed-in') {
    log(sessionProblem(session, REPAIR_HINT) ?? 'not signed in — run `agent login`');
    process.exitCode = 1;
    return;
  }
  const { account, backend } = session;
  log(`signed in as ${account.email ?? `user ${account.userId}`}${session.source === 'env' ? ' (from the environment)' : ''}`);
  log(`user id: ${account.userId}`);
  log(`backend: ${backend.apiEndpoint}`);
  if (account.key.kind === 'active') {
    log(`API key: ${maskKey(account.key.apiKey)} (expires ${account.key.expiresAt ?? 'unknown'})`);
  } else {
    log('API key: none — db tools stay signed out. Run `agent login` to mint one.');
  }
  if (account.key.kind === 'none' && account.accessTokenExpiresAt) log(`access token expires: ${account.accessTokenExpiresAt}`);
  log(`context: ${session.context ?? 'none'}`);
  const check = await verifySession(session);
  if (check.kind === 'accepted') {
    log('credential: accepted by the backend');
  } else if (check.kind === 'rejected') {
    log(`credential: rejected — ${check.reason} Run \`agent login\` to sign in again.`);
    process.exitCode = 1;
  } else {
    log(`credential: not checked — ${check.reason}`);
  }
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
