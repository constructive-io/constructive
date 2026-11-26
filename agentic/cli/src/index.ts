#!/usr/bin/env node
import { keyEndsSoon, resolveSession, sessionProblem } from '@agentic-kit/session';

import { init, login, logout, REPAIR_HINT, skillsList, skillsUpdate, usage, whoami } from './commands';
import { loadConfig } from './config';
import { materializeDbTools } from './db-tools';
import { assembleSkills } from './skills';

export { AgentCliConfig, loadConfig } from './config';
export { materializeDbTools } from './db-tools';
export { assembleSkills } from './skills';

async function run(args: string[]): Promise<void> {
  const config = loadConfig();
  // pi resolves its agent dir (skills, sessions, auth) from this env var;
  // point it at the appstash-owned dir before the SDK loads.
  process.env.PI_CODING_AGENT_DIR ??= config.agentDir;

  const [first, second] = args;
  if (first === 'help' || first === '--help-agent') {
    usage();
    return;
  }
  if (first === 'init') {
    await init(config, {});
    return;
  }
  if (first === 'login') {
    await login(config, {});
    return;
  }
  if (first === 'logout') {
    await logout(config);
    return;
  }
  if (first === 'whoami') {
    await whoami(config);
    return;
  }
  if (first === 'skills') {
    if (second === 'update') await skillsUpdate(config);
    else await skillsList(config);
    return;
  }

  const log = (msg: string) => console.log(`[agent] ${msg}`);
  await assembleSkills(config, log);
  materializeDbTools(config, log);
  const session = resolveSession({ store: config.store });
  const problem = sessionProblem(session, REPAIR_HINT);
  if (problem) log(`warning: ${problem}`);
  const key = session.kind === 'signed-in' ? session.account.key : null;
  if (key?.kind === 'active' && keyEndsSoon({ expiresAt: key.expiresAt })) {
    log(`warning: the API key ${Date.parse(key.expiresAt) <= Date.now() ? 'ended' : 'ends'} at ${key.expiresAt}. Run \`agent login\` to sign in again and get a new one.`);
  }
  // pi is ESM-only; tsc's CJS output would downlevel a plain `await import()`
  // into `require()`, which cannot load it. Indirect the import so it survives
  // transpilation in the CJS build.
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<{ main: (args: string[]) => Promise<void> }>;
  const { main } = await dynamicImport('@earendil-works/pi-coding-agent');
  await main(args);
}

if (require.main === module) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
