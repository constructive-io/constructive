import { PgpmPackage, resolveExtensionDependencies } from '@pgpmjs/core';
import { getEnvOptions } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import path from 'path';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

const log = new Logger('test-packages');

// ANSI color codes
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const NC = '\x1b[0m'; // No Color

const testPackagesUsageText = `
Test Packages Command:

  pgpm test-packages [OPTIONS]

  Run integration tests on the PGPM packages in a workspace.
  Tests each package with a deploy/verify/revert/deploy cycle.

  By default only the minimal covering set is tested: the modules nothing else
  in the workspace requires. Deploying one of those deploys everything it
  requires first, so every module in the workspace is still exercised — just
  once per covering module instead of once per module.

Options:
  --help, -h           Show this help message
  --exclude <pkgs>     Comma-separated module names to exclude
  --continue-on-fail   Continue testing all packages even after failures
  --full-cycle         Run full deploy/verify/revert/deploy cycle (default: deploy only)
  --force-all          Test every module in its own database (pre-minimal-set behavior)
  --cwd <directory>    Working directory (default: current directory)

Examples:
  pgpm test-packages                              Test the minimal covering set
  pgpm test-packages --force-all                 Test every module in its own database
  pgpm test-packages --full-cycle                Run full test cycle with verify/revert
  pgpm test-packages --continue-on-fail          Test all packages, collect all failures
  pgpm test-packages --exclude my-module         Exclude specific modules
`;

interface TestResult {
  moduleName: string;
  modulePath: string;
  success: boolean;
  error?: string;
}

/**
 * Reduce the module list to a minimal covering set: the modules that no other
 * candidate requires, transitively.
 *
 * Testing a module deploys its whole dependency closure in dependency order, so
 * a module that some other candidate requires is already deployed, verified,
 * reverted and re-deployed inside that candidate's database. Selection runs over
 * the post-exclude candidates, so excluding a covering module promotes whatever
 * it alone covered rather than dropping it.
 *
 * The property this trades away is standalone deployability — that a module's own
 * `requires` is complete rather than satisfied by a sibling in the same database.
 * Use --force-all to get it back.
 */
export function minimalCoveringSet(
  moduleMap: Record<string, { requires: string[] }>,
  candidateNames: string[]
): { selected: string[]; coveredBy: Map<string, string> } {
  const candidates = new Set(candidateNames);

  // name -> its transitive requires, restricted to the candidates
  const closures = new Map<string, string[]>();
  for (const name of candidates) {
    const { resolved } = resolveExtensionDependencies(name, moduleMap);
    closures.set(
      name,
      resolved.filter((dep) => dep !== name && candidates.has(dep))
    );
  }

  const coveredBy = new Map<string, string>();
  for (const [name, deps] of closures) {
    for (const dep of deps) {
      if (!coveredBy.has(dep)) {
        coveredBy.set(dep, name);
      }
    }
  }

  const selected = candidateNames.filter((name) => !coveredBy.has(name));

  // Nothing may fall out of the selection. Covering-set membership is derived
  // from pairwise closures, so assert the union actually reaches every candidate
  // rather than trusting that argument.
  const covered = new Set<string>();
  for (const name of selected) {
    covered.add(name);
    for (const dep of closures.get(name) ?? []) {
      covered.add(dep);
    }
  }
  const uncovered = candidateNames.filter((name) => !covered.has(name));
  if (uncovered.length > 0) {
    throw new Error(
      `Minimal module selection left ${uncovered.length} module(s) untested: ${uncovered.join(', ')}. ` +
        'Re-run with --force-all and report this as a pgpm bug.'
    );
  }

  return { selected, coveredBy };
}

function selectMinimalModules(
  workspacePkg: PgpmPackage,
  candidates: PgpmPackage[]
): { selected: PgpmPackage[]; coveredBy: Map<string, string> } {
  const { selected, coveredBy } = minimalCoveringSet(
    workspacePkg.getModuleMap(),
    candidates.map((mod) => mod.getModuleName())
  );
  const selectedNames = new Set(selected);
  return {
    selected: candidates.filter((mod) => selectedNames.has(mod.getModuleName())),
    coveredBy
  };
}

function dbSafeName(moduleName: string): string {
  return `test_${moduleName}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

async function createDatabase(dbname: string, adminDb: string = 'postgres'): Promise<boolean> {
  try {
    const pgEnv = getPgEnvOptions({ database: adminDb });
    const pool = getPgPool(pgEnv);
    
    // Sanitize database name (only allow alphanumeric and underscore)
    const safeName = dbname.replace(/[^a-zA-Z0-9_]/g, '_');
    
    await pool.query(`CREATE DATABASE "${safeName}"`);
    log.debug(`Created database: ${safeName}`);
    return true;
  } catch (error: any) {
    if (error.code === '42P04') {
      // Database already exists, that's fine
      log.debug(`Database ${dbname} already exists`);
      return true;
    }
    log.error(`Failed to create database ${dbname}: ${error.message}`);
    return false;
  }
}

async function dropDatabase(dbname: string, adminDb: string = 'postgres'): Promise<void> {
  try {
    const pgEnv = getPgEnvOptions({ database: adminDb });
    const pool = getPgPool(pgEnv);
    
    // Sanitize database name
    const safeName = dbname.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Terminate all connections to the database first
    await pool.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [safeName]);
    
    await pool.query(`DROP DATABASE IF EXISTS "${safeName}"`);
    log.debug(`Dropped database: ${safeName}`);
  } catch (error: any) {
    // Ignore errors when dropping (database might not exist)
    log.debug(`Could not drop database ${dbname}: ${error.message}`);
  }
}

async function checkPostgresConnection(): Promise<boolean> {
  try {
    const pgEnv = getPgEnvOptions({ database: 'postgres' });
    const pool = getPgPool(pgEnv);
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function testModule(
  workspacePkg: PgpmPackage,
  modulePkg: PgpmPackage,
  fullCycle: boolean
): Promise<TestResult> {
  const moduleName = modulePkg.getModuleName();
  const modulePath = modulePkg.getModulePath() || '';
  const dbname = dbSafeName(moduleName);

  console.log(`${YELLOW}Testing module: ${moduleName}${NC}`);
  console.log(`  Module path: ${modulePath}`);
  console.log(`  Database name: ${dbname}`);

  // Clean up any existing test database
  await dropDatabase(dbname);

  // Create fresh test database
  console.log(`  Creating database: ${dbname}`);
  if (!await createDatabase(dbname)) {
    return {
      moduleName,
      modulePath,
      success: false,
      error: `Could not create database ${dbname}`
    };
  }

  try {
    // Create options for this test database
    const opts = getEnvOptions({
      pg: getPgEnvOptions({ database: dbname }),
      deployment: {
        useTx: true,
        fast: false,
        usePlan: true,
        cache: false,
        logOnly: false
      }
    });

    // Deploy
    console.log('  Running deploy...');
    try {
      await workspacePkg.deploy(opts, moduleName, true);
    } catch (error: any) {
      await dropDatabase(dbname);
      return {
        moduleName,
        modulePath,
        success: false,
        error: `Deploy failed: ${error.message}`
      };
    }

    if (fullCycle) {
      // Verify
      console.log('  Running verify...');
      try {
        await workspacePkg.verify(opts, moduleName, true);
      } catch (error: any) {
        await dropDatabase(dbname);
        return {
          moduleName,
          modulePath,
          success: false,
          error: `Verify failed: ${error.message}`
        };
      }

      // Revert
      console.log('  Running revert...');
      try {
        await workspacePkg.revert(opts, moduleName, true);
      } catch (error: any) {
        await dropDatabase(dbname);
        return {
          moduleName,
          modulePath,
          success: false,
          error: `Revert failed: ${error.message}`
        };
      }

      // Deploy again
      console.log('  Running deploy (second time)...');
      try {
        await workspacePkg.deploy(opts, moduleName, true);
      } catch (error: any) {
        await dropDatabase(dbname);
        return {
          moduleName,
          modulePath,
          success: false,
          error: `Deploy (second time) failed: ${error.message}`
        };
      }
    }

    // Clean up test database
    await dropDatabase(dbname);

    console.log(`${GREEN}SUCCESS: Module ${moduleName} passed all tests${NC}`);
    return {
      moduleName,
      modulePath,
      success: true
    };
  } catch (error: any) {
    // Ensure cleanup on any unexpected error
    await dropDatabase(dbname);
    return {
      moduleName,
      modulePath,
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

export default async (
  argv: Partial<ParsedArgs>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(testPackagesUsageText);
    process.exit(0);
  }

  // Parse options (stopOnFail defaults to true, use --continue-on-fail to disable)
  const continueOnFail = argv['continue-on-fail'] === true || argv.continueOnFail === true;
  const stopOnFail = !continueOnFail;
  const fullCycle = argv['full-cycle'] === true || argv.fullCycle === true;
  const forceAll = argv['force-all'] === true || argv.forceAll === true;
  const cwd = argv.cwd || process.cwd();

  // Parse excludes
  let excludes: string[] = [];
  if (argv.exclude) {
    excludes = (argv.exclude as string).split(',').map(e => e.trim());
  }

  console.log('=== PGPM Package Integration Test ===');
  console.log(`Testing ${forceAll ? 'all packages' : 'the minimal covering set'} with ${fullCycle ? 'deploy/verify/revert/deploy cycle' : 'deploy only'}`);
  if (!stopOnFail) {
    console.log('Mode: Test all packages (collect all failures)');
  }
  console.log('');

  // Check PostgreSQL connection
  console.log('Checking PostgreSQL connection...');
  if (!await checkPostgresConnection()) {
    log.error('PostgreSQL not accessible.');
    console.log('Ensure PostgreSQL is running and connection settings are correct.');
    console.log('For local development: docker-compose up -d');
    console.log('For CI: ensure PostgreSQL service is running');
    process.exit(1);
  }
  console.log('PostgreSQL connection successful');
  console.log('');

  // Initialize workspace package
  const projectRoot = path.resolve(cwd);
  const workspacePkg = new PgpmPackage(projectRoot);

  if (!workspacePkg.getWorkspacePath()) {
    log.error('Not in a PGPM workspace. Run this command from a workspace root.');
    process.exit(1);
  }

  // Get all modules from workspace using internal API
  console.log('Finding all PGPM modules in workspace...');
  const modules = await workspacePkg.getModules();

  if (modules.length === 0) {
    log.warn('No modules found in workspace.');
    process.exit(0);
  }

  // Filter out excluded modules
  let filteredModules = modules;
  if (excludes.length > 0) {
    filteredModules = modules.filter(mod => {
      const moduleName = mod.getModuleName();
      return !excludes.includes(moduleName);
    });
    console.log(`Excluding: ${excludes.join(', ')}`);
  }

  let selectedModules = filteredModules;
  if (!forceAll) {
    const { selected, coveredBy } = selectMinimalModules(workspacePkg, filteredModules);
    selectedModules = selected;
    console.log(
      `Minimal covering set: ${selected.length} of ${filteredModules.length} modules ` +
        `(${coveredBy.size} covered transitively; --force-all to test each on its own)`
    );
  }

  console.log(`Found ${selectedModules.length} modules to test:`);
  for (const mod of selectedModules) {
    console.log(`  - ${mod.getModuleName()}`);
  }
  console.log('');

  const failedPackages: TestResult[] = [];
  const successfulPackages: TestResult[] = [];

  for (const modulePkg of selectedModules) {
    const result = await testModule(workspacePkg, modulePkg, fullCycle);

    if (result.success) {
      successfulPackages.push(result);
    } else {
      failedPackages.push(result);

      if (stopOnFail) {
        console.log('');
        console.error(`${RED}STOPPING: Test failed for module ${result.moduleName}${NC}`);
        console.log('');
        console.log('=== TEST SUMMARY (PARTIAL) ===');
        if (successfulPackages.length > 0) {
          console.log(`${GREEN}Successful modules before failure (${successfulPackages.length}):${NC}`);
          for (const pkg of successfulPackages) {
            console.log(`  ${GREEN}✓${NC} ${pkg.moduleName}`);
          }
          console.log('');
        }
        console.error(`${RED}Failed module: ${result.moduleName}${NC}`);
        if (result.error) {
          console.error(`  Error: ${result.error}`);
        }
        console.log('');
        console.error(`${RED}OVERALL RESULT: FAILED (stopped on first failure)${NC}`);
        process.exit(1);
      }
    }
    console.log('');
  }

  console.log('=== TEST SUMMARY ===');
  console.log(`${GREEN}Successful modules (${successfulPackages.length}):${NC}`);
  for (const pkg of successfulPackages) {
    console.log(`  ${GREEN}✓${NC} ${pkg.moduleName}`);
  }

  if (failedPackages.length > 0) {
    console.log('');
    console.error(`${RED}Failed modules (${failedPackages.length}):${NC}`);
    for (const pkg of failedPackages) {
      console.error(`  ${RED}✗${NC} ${pkg.moduleName}`);
      if (pkg.error) {
        console.error(`    Error: ${pkg.error}`);
      }
    }
    console.log('');
    console.error(`${RED}OVERALL RESULT: FAILED${NC}`);
    process.exit(1);
  } else {
    console.log('');
    console.log(`${GREEN}OVERALL RESULT: ALL MODULES PASSED${NC}`);
    process.exit(0);
  }
};
