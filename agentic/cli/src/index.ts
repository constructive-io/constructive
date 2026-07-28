#!/usr/bin/env node
import { loadConfig } from './config';
import { init, skillsList, skillsUpdate, usage } from './commands';
import { assembleSkills } from './skills';

export { assembleSkills } from './skills';
export { AgentCliConfig, loadConfig } from './config';

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
  if (first === 'skills') {
    if (second === 'update') await skillsUpdate(config);
    else await skillsList(config);
    return;
  }

  await assembleSkills(config, (msg) => console.log(`[agent] ${msg}`));
  const { main } = await import('@earendil-works/pi-coding-agent');
  await main(args);
}

if (require.main === module) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
