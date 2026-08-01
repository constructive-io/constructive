import { checkForUpdates } from '@inquirerer/utils';
import { cliExitWithError, CLIOptions, extractFirst, getPackageJson,Inquirerer, ParsedArgs } from 'inquirerer';
import { teardownPgPools } from 'pg-cache';

import add from './commands/add';
import adminUsers from './commands/admin-users';
import analyze from './commands/analyze';
import cache from './commands/cache';
import clear from './commands/clear';
import deploy from './commands/deploy';
import diff from './commands/diff';
import docker from './commands/docker';
import doctor from './commands/doctor';
import dump from './commands/dump';
import env from './commands/env';
import _export from './commands/export';
import extension from './commands/extension';
import _import from './commands/import';
import init from './commands/init';
import install from './commands/install';
import kill from './commands/kill';
import materialize from './commands/materialize';
import migrate from './commands/migrate';
import _package from './commands/package';
import plan from './commands/plan';
import regen from './commands/regen';
import remove from './commands/remove';
import renameCmd from './commands/rename';
import revert from './commands/revert';
import slice from './commands/slice';
import syncVersions from './commands/sync-versions';
import tag from './commands/tag';
import testPackages from './commands/test-packages';
import transform from './commands/transform';
import tune from './commands/tune';
import updateCmd from './commands/update';
import upgrade from './commands/upgrade';
import verify from './commands/verify';
import {
  activateEngine,
  deactivateEngine,
  EngineArgv,
  engineCommandBlocker,
  getActiveEngine,
  usageText
} from './utils';

/**
 * Commands that never open a connection, so they must not activate a driver —
 * a workspace-wide `engine` must not make plan/scaffolding commands depend on
 * the driver plugin being installed. `init` additionally owns its own `--pglite`
 * meaning (scaffold from the PGlite boilerplates), and runs before the plugin
 * it scaffolds exists.
 */
const ENGINE_EXEMPT_COMMANDS = new Set([
  'add',
  'analyze',
  'cache',
  'doctor',
  'env',
  'extension',
  'import',
  'init',
  'install',
  'package',
  'materialize',
  'plan',
  'regen',
  'remove',
  'rename',
  'slice',
  'sync-versions',
  'tag',
  'up',
  'update',
  'upgrade'
]);

const withPgTeardown = (fn: Function, skipTeardown: boolean = false) => async (...args: any[]) => {
  try {
    await fn(...args);
  } finally {
    if (!skipTeardown) {
      await teardownPgPools();
    }
  }
};

export const createPgpmCommandMap = (skipPgTeardown: boolean = false): Record<string, Function> => {
  const pgt = (fn: Function) => withPgTeardown(fn, skipPgTeardown);
  return {
    add,
    'admin-users': pgt(adminUsers),
    clear: pgt(clear),
    deploy: pgt(deploy),
    diff: pgt(diff),
    docker,
    doctor,
    dump: pgt(dump),
    env,
    verify: pgt(verify),
    revert: pgt(revert),
    remove: pgt(remove),
    init: pgt(init),
    extension: pgt(extension),
    plan: pgt(plan),
    regen,
    export: pgt(_export),
    import: pgt(_import),
    package: pgt(_package),
    tag: pgt(tag),
    kill: pgt(kill),
    install: pgt(install),
    migrate: pgt(migrate),
    materialize,
    analyze: pgt(analyze),
    rename: pgt(renameCmd),
    slice,
    'sync-versions': syncVersions,
    'test-packages': pgt(testPackages),
    transform: pgt(transform),
    tune: pgt(tune),
    upgrade: pgt(upgrade),
    up: pgt(upgrade),
    cache,
    update: updateCmd
  };
};

export const commands = async (argv: Partial<ParsedArgs>, prompter: Inquirerer, options: CLIOptions & { skipPgTeardown?: boolean }) => {
  if (argv.version || argv.v) {
    const pkg = getPackageJson(__dirname);
    console.log(pkg.version);
    process.exit(0);
  }

  let { first: command, newArgv } = extractFirst(argv);

  if ((argv.help || argv.h || command === 'help') && !command) {
    console.log(usageText);
    process.exit(0);
  }
  
  if (command === 'help') {
    console.log(usageText);
    process.exit(0);
  }

  const commandMap = createPgpmCommandMap(options?.skipPgTeardown);

  if (!command) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'command',
        message: 'What do you want to do?',
        options: Object.keys(commandMap)
      }
    ]);
    command = answer.command;
  }

  // Run update check (skip on 'update' command to avoid redundant check)
  // (checkForUpdates auto-skips in CI or when INQUIRERER_SKIP_UPDATE_CHECK / PGPM_SKIP_UPDATE_CHECK is set)
  if (command !== 'update') {
    try {
      const pkg = getPackageJson(__dirname);
      const updateResult = await checkForUpdates({
        pkgName: pkg.name,
        pkgVersion: pkg.version,
        toolName: 'pgpm'
      });
      if (updateResult.hasUpdate && updateResult.message) {
        console.warn(updateResult.message);
        console.warn('Run pgpm update to upgrade.');
      }
    } catch {
      // ignore update check failures
    }
  }

  newArgv = await prompter.prompt(newArgv, [
    {
      type: 'text',
      name: 'cwd',
      message: 'Working directory',
      required: false,
      default: process.cwd(),
      useDefault: true
    }
  ]);

  const commandFn = commandMap[command];

  if (!commandFn) {
    console.log(usageText);
    await cliExitWithError(`Unknown command: ${command}`, { beforeExit: teardownPgPools });
  }

  // Activate the selected migration backend (`--engine`/`--driver`/`--pglite` or
  // pgpm.json) before the command runs: the driver plugin registers its
  // pool/client factories, so the unmodified engine targets it. The built-in
  // `pg` engine activates nothing and behaves exactly as before.
  const engineArgv = newArgv as unknown as EngineArgv & { cwd?: string };
  const { engine, capabilities } = ENGINE_EXEMPT_COMMANDS.has(command)
    ? getActiveEngine()
    : await activateEngine(engineArgv, engineArgv.cwd).catch(async (error: Error) => {
      await cliExitWithError(error.message, { beforeExit: teardownPgPools });
      throw error;
    });
  try {
    const blocked = engineCommandBlocker(command, engine, capabilities);
    if (blocked) {
      await cliExitWithError(blocked, { beforeExit: teardownPgPools });
    }

    await commandFn(newArgv, prompter, options);
  } finally {
    await deactivateEngine();
  }
  prompter.close();

  return argv;
};
