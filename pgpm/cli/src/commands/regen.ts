import { parsePlanFile, PgpmPackage, readScript } from '@pgpmjs/core';
import { Logger } from '@pgpmjs/logger';
import { isStubScript, loadModule, regenerateScripts } from '@pgpmjs/transform';
import * as fs from 'fs';
import { cliExitWithError, CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';

const log = new Logger('regen');

const regenUsageText = `
Regen Command:

  pgpm regen [change...] [OPTIONS]

  Generate revert/verify scripts from deploy scripts. By default sweeps every
  change in pgpm.plan and fills in scripts that are missing or empty stubs
  (only comments and a BEGIN/COMMIT wrapper). Reverts are mechanical inverses
  in reverse dependency order; verifies are existence checks per created
  object. Statements with no derivable inverse become
  '-- revert not derivable: <reason>' comments.

Arguments:
  change                 Regenerate only the named change(s) (targeted mode)

Options:
  --help, -h             Show this help message
  --revert-only          Only generate revert scripts
  --verify-only          Only generate verify scripts
  --dry-run              Report what would be written without writing
  --force                Overwrite non-empty existing scripts
  --cwd <directory>      Working directory (default: current directory)

Examples:
  pgpm regen                                  Fill in all missing/stub revert+verify scripts
  pgpm regen schemas/app/tables/users/table   Regenerate one change
  pgpm regen --verify-only --dry-run          Preview verify generation
  pgpm regen foo --force                      Overwrite foo's scripts even if non-empty
`;

type ScriptType = 'revert' | 'verify';

interface RegenResult {
  generated: string[];
  skipped: string[];
  warnings: string[];
}

const wrapScript = (type: ScriptType, change: string, body: string): string => {
  const header =
    type === 'revert' ? `-- Revert ${change} from pg` : `-- Verify ${change} on pg`;
  const close = type === 'revert' ? 'COMMIT;' : 'ROLLBACK;';
  const sql = body.trim();
  return `${header}\n\nBEGIN;\n\n${sql ? `${sql}\n\n` : ''}${close}\n`;
};

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(regenUsageText);
    process.exit(0);
  }

  const cwd = (argv.cwd as string) || process.cwd();
  const revertOnly = Boolean(argv['revert-only'] ?? argv.revertOnly);
  const verifyOnly = Boolean(argv['verify-only'] ?? argv.verifyOnly);
  const dryRun = Boolean(argv['dry-run'] ?? argv.dryRun);
  const force = Boolean(argv.force);

  if (revertOnly && verifyOnly) {
    await cliExitWithError('--revert-only and --verify-only are mutually exclusive');
  }

  const types: ScriptType[] = revertOnly
    ? ['revert']
    : verifyOnly
      ? ['verify']
      : ['revert', 'verify'];

  const pkg = new PgpmPackage(path.resolve(cwd));
  if (!pkg.isInModule()) {
    await cliExitWithError('This command must be run inside a pgpm module (or pass --cwd <module>).');
  }
  const modulePath = pkg.modulePath!;

  const planResult = parsePlanFile(path.join(modulePath, 'pgpm.plan'));
  if (!planResult.data) {
    await cliExitWithError(`Failed to parse pgpm.plan: ${planResult.errors.map(e => e.message).join(', ')}`);
  }
  const planChanges = planResult.data.changes.map(c => c.name);

  const requested = (argv._ as string[] | undefined)?.filter(Boolean) ?? [];
  let targets: string[];
  if (requested.length > 0) {
    const missing = requested.filter(name => !planChanges.includes(name));
    if (missing.length > 0) {
      await cliExitWithError(`Change(s) not found in pgpm.plan: ${missing.join(', ')}`);
    }
    targets = requested;
  } else {
    targets = planChanges;
  }

  const result: RegenResult = { generated: [], skipped: [], warnings: [] };

  await loadModule();

  for (const change of targets) {
    const deploySql = readScript(modulePath, 'deploy', change);
    if (!deploySql) {
      result.warnings.push(`${change}: no deploy script found, skipping`);
      continue;
    }

    const needed = types.filter(type => {
      const existing = readScript(modulePath, type, change);
      return force || isStubScript(existing);
    });
    const untouched = types.filter(type => !needed.includes(type));
    for (const type of untouched) {
      result.skipped.push(`${type}/${change}`);
    }
    if (needed.length === 0) continue;

    let scripts;
    try {
      scripts = regenerateScripts(deploySql);
    } catch (err: any) {
      result.warnings.push(`${change}: failed to parse deploy script (${err?.message ?? err})`);
      continue;
    }

    for (const warning of scripts.revert.warnings) {
      result.warnings.push(`${change}: ${warning}`);
    }
    for (const warning of scripts.verify.warnings) {
      result.warnings.push(`${change}: ${warning}`);
    }

    for (const type of needed) {
      const body = type === 'revert' ? scripts.revert.sql : scripts.verify.sql;
      const content = wrapScript(type, change, body);
      const target = `${type}/${change}`;
      if (dryRun) {
        log.info(`would write ${target}.sql`);
      } else {
        const filePath = path.join(modulePath, type, `${change}.sql`);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content);
      }
      result.generated.push(target);
    }
  }

  for (const warning of result.warnings) {
    log.warn(warning);
  }
  const verb = dryRun ? 'would generate' : 'generated';
  log.success(
    `regen: ${verb} ${result.generated.length} script(s), skipped ${result.skipped.length} existing, ${result.warnings.length} warning(s)`
  );

  return argv;
};
