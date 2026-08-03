#!/usr/bin/env node
import { refreshApiKeyIfNeeded } from './auth';
import { BACKEND_PRESETS, loadBackendConfig } from './backend-store';
import { init, login, logout, skillsList, skillsUpdate, usage, whoami } from './commands';
import { loadConfig } from './config';
import { materializeDbTools } from './db-tools';
import { assembleSkills } from './skills';

export { AgentCliConfig, loadConfig } from './config';
export { HOST_ENV_VARS, materializeDbTools } from './db-tools';
export { assembleSkills } from './skills';

async function run(args: string[]): Promise<void> {
  const config = loadConfig(process.env.AGENT_HOME);
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
    whoami(config);
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
  // Fire-and-forget: keep the stored API key fresh (<7 days to expiry re-mints)
  // without ever blocking startup. Only an expired login session gets a line.
  const backend = loadBackendConfig(config.backendFile) ?? BACKEND_PRESETS.localnet;
  void refreshApiKeyIfNeeded({ accountFile: config.accountFile, authEndpoint: backend.authEndpoint })
    .then((status) => {
      if (status === 'reauth-required') log('API key expired — run `agent login`');
    })
    .catch(() => {});
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
