import { PgpmPackage } from '@pgpmjs/core';
import { getEnvOptions } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { CLIOptions, Inquirerer } from 'inquirerer';
import { ParsedArgs } from 'minimist';
import { getPgEnvOptions, getSpawnEnvWithPg } from 'pg-env';

const log = new Logger('test-packages');

// ANSI color codes
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const NC = '\x1b[0m'; // No Color

const testPackagesUsageText = `
Test Packages Command:

  pgpm test-packages [OPTIONS]

  Run integration tests on all PGPM packages in a workspace.
  Tests each package with a deploy/verify/revert/deploy cycle.

Options:
  --help, -h           Show this help message
  --dirs <dirs>        Comma-separated directories to search for packages (default: packages)
  --exclude <pkgs>     Comma-separated package paths to exclude
  --stop-on-fail       Stop testing immediately when a package fails
  --full-cycle         Run full deploy/verify/revert/deploy cycle (default: deploy only)
  --cwd <directory>    Working directory (default: current directory)

Examples:
  pgpm test-packages                              Test all packages in packages/
  pgpm test-packages --dirs packages,services    Test packages in multiple directories
  pgpm test-packages --full-cycle                Run full test cycle with verify/revert
  pgpm test-packages --stop-on-fail              Stop on first failure
  pgpm test-packages --exclude packages/legacy   Exclude specific packages
`;

interface TestResult {
  packageName: string;
  packagePath: string;
  success: boolean;
  error?: string;
}

function dbsafename(packagePath: string): string {
  const packageName = path.basename(packagePath);
  return `test_${packageName}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

function getProjectName(packagePath: string, projectRoot: string): string | null {
  const planFile = path.isAbsolute(packagePath)
    ? path.join(packagePath, 'pgpm.plan')
    : path.join(projectRoot, packagePath, 'pgpm.plan');

  if (!fs.existsSync(planFile)) {
    return null;
  }

  const content = fs.readFileSync(planFile, 'utf8');
  const match = content.match(/^%project=(.+)$/m);
  return match ? match[1].trim() : null;
}

function execCommand(command: string, options: { silent?: boolean; cwd?: string; env?: NodeJS.ProcessEnv } = {}): { success: boolean; output?: string; error?: string } {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd,
      env: options.env
    });
    return { success: true, output: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function commandExists(command: string): boolean {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkDockerPostgres(): boolean {
  if (!commandExists('docker')) {
    return false;
  }
  const result = execCommand('docker exec postgres psql -U postgres -c "SELECT 1;"', { silent: true });
  return result.success;
}

function checkDirectPostgres(pgEnv: NodeJS.ProcessEnv): boolean {
  if (!commandExists('psql')) {
    return false;
  }
  const result = execCommand('psql -c "SELECT 1;"', { silent: true, env: pgEnv });
  return result.success;
}

function cleanupDb(dbname: string, useDocker: boolean, pgEnv: NodeJS.ProcessEnv): void {
  log.debug(`Cleaning up database: ${dbname}`);
  if (useDocker) {
    execCommand(`docker exec postgres dropdb -U postgres "${dbname}"`, { silent: true });
  } else {
    execCommand(`dropdb "${dbname}"`, { silent: true, env: pgEnv });
  }
}

function createDb(dbname: string, useDocker: boolean, pgEnv: NodeJS.ProcessEnv): boolean {
  if (useDocker) {
    const result = execCommand(`docker exec postgres createdb -U postgres "${dbname}"`);
    return result.success;
  } else {
    const result = execCommand(`createdb "${dbname}"`, { env: pgEnv });
    return result.success;
  }
}

function findPackages(projectRoot: string, directories: string[] = ['packages']): string[] {
  const packages: string[] = [];

  function walkDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip dist and node_modules directories
        if (entry.name === 'dist' || entry.name === 'node_modules' || fullPath.includes('/dist/') || fullPath.includes('/node_modules/')) {
          continue;
        }
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name === 'pgpm.plan') {
        const packagePath = path.relative(projectRoot, dir);
        packages.push(packagePath);
      }
    }
  }

  // Walk each specified directory
  for (const dirName of directories) {
    const dirPath = path.join(projectRoot, dirName);
    if (fs.existsSync(dirPath)) {
      walkDir(dirPath);
    }
  }

  return packages.sort();
}

function runPgpmCommand(
  command: string,
  dbname: string,
  packageName: string,
  packagePath: string,
  projectRoot: string,
  pgEnv: NodeJS.ProcessEnv
): boolean {
  const fullCommand = `pgpm ${command} --database "${dbname}" --yes --package "${packageName}"`;
  const result = execCommand(fullCommand, {
    cwd: path.join(projectRoot, packagePath),
    env: pgEnv
  });
  return result.success;
}

function testPackage(
  packagePath: string,
  projectRoot: string,
  useDocker: boolean,
  fullCycle: boolean,
  pgEnv: NodeJS.ProcessEnv
): TestResult {
  const packageName = path.basename(packagePath);
  const dbname = dbsafename(packagePath);

  const lqlPackageName = getProjectName(packagePath, projectRoot);

  if (!lqlPackageName) {
    return {
      packageName,
      packagePath,
      success: false,
      error: `Could not find %project= in ${packagePath}/pgpm.plan`
    };
  }

  console.log(`${YELLOW}Testing package: ${packageName}${NC}`);
  console.log(`  Package path: ${packagePath}`);
  console.log(`  Database name: ${dbname}`);

  cleanupDb(dbname, useDocker, pgEnv);

  console.log(`  Creating database: ${dbname}`);
  if (!createDb(dbname, useDocker, pgEnv)) {
    return {
      packageName,
      packagePath,
      success: false,
      error: `Could not create database ${dbname}`
    };
  }

  const packageFullPath = path.join(projectRoot, packagePath);
  if (!fs.existsSync(packageFullPath)) {
    cleanupDb(dbname, useDocker, pgEnv);
    return {
      packageName,
      packagePath,
      success: false,
      error: `Could not find directory ${packageFullPath}`
    };
  }

  console.log('  Running pgpm deploy...');
  if (!runPgpmCommand('deploy', dbname, lqlPackageName, packagePath, projectRoot, pgEnv)) {
    cleanupDb(dbname, useDocker, pgEnv);
    return {
      packageName,
      packagePath,
      success: false,
      error: `pgpm deploy failed for package ${lqlPackageName}`
    };
  }

  if (fullCycle) {
    console.log('  Running pgpm verify...');
    if (!runPgpmCommand('verify', dbname, lqlPackageName, packagePath, projectRoot, pgEnv)) {
      cleanupDb(dbname, useDocker, pgEnv);
      return {
        packageName,
        packagePath,
        success: false,
        error: `pgpm verify failed for package ${lqlPackageName}`
      };
    }

    console.log('  Running pgpm revert...');
    if (!runPgpmCommand('revert', dbname, lqlPackageName, packagePath, projectRoot, pgEnv)) {
      cleanupDb(dbname, useDocker, pgEnv);
      return {
        packageName,
        packagePath,
        success: false,
        error: `pgpm revert failed for package ${lqlPackageName}`
      };
    }

    console.log('  Running pgpm deploy (second time)...');
    if (!runPgpmCommand('deploy', dbname, lqlPackageName, packagePath, projectRoot, pgEnv)) {
      cleanupDb(dbname, useDocker, pgEnv);
      return {
        packageName,
        packagePath,
        success: false,
        error: `pgpm deploy (second time) failed for package ${lqlPackageName}`
      };
    }
  }

  cleanupDb(dbname, useDocker, pgEnv);

  console.log(`${GREEN}SUCCESS: Package ${packageName} passed all tests${NC}`);
  return {
    packageName,
    packagePath,
    success: true
  };
}

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(testPackagesUsageText);
    process.exit(0);
  }

  const pgEnvOptions = getPgEnvOptions();
  const pgEnv = getSpawnEnvWithPg(pgEnvOptions);

  // Parse options
  const stopOnFail = argv['stop-on-fail'] === true || argv.stopOnFail === true;
  const fullCycle = argv['full-cycle'] === true || argv.fullCycle === true;
  const cwd = argv.cwd || process.cwd();

  // Parse directories
  let directories: string[] = ['packages'];
  if (argv.dirs) {
    directories = (argv.dirs as string).split(',').map(d => d.trim());
  }

  // Parse excludes
  let excludes: string[] = [];
  if (argv.exclude) {
    excludes = (argv.exclude as string).split(',').map(e => e.trim());
  }

  console.log('=== PGPM Package Integration Test ===');
  console.log(`Testing all packages with ${fullCycle ? 'deploy/verify/revert/deploy cycle' : 'deploy only'}`);
  if (stopOnFail) {
    console.log('Mode: Stop on first failure');
  } else {
    console.log('Mode: Test all packages (collect all failures)');
  }
  console.log('');

  if (!commandExists('pgpm')) {
    log.error('pgpm CLI not found. Please install pgpm globally.');
    console.log('Run: npm install -g pgpm');
    process.exit(1);
  }

  const useDocker = checkDockerPostgres();
  const useDirect = !useDocker && checkDirectPostgres(pgEnv);

  if (useDocker) {
    console.log('Using Docker PostgreSQL container');
  } else if (useDirect) {
    console.log('Using direct PostgreSQL connection');
  } else {
    log.error('PostgreSQL not accessible.');
    console.log('For local development: docker-compose up -d');
    console.log('For CI: ensure PostgreSQL service is running');
    process.exit(1);
  }

  const projectRoot = path.resolve(cwd);
  process.chdir(projectRoot);

  console.log(`Finding all PGPM packages in: ${directories.join(', ')}`);
  let packages = findPackages(projectRoot, directories);

  // Apply excludes
  if (excludes.length > 0) {
    packages = packages.filter(pkg => !excludes.includes(pkg));
    console.log(`Excluding: ${excludes.join(', ')}`);
  }

  console.log(`Found ${packages.length} packages to test:`);
  for (const pkg of packages) {
    console.log(`  - ${path.basename(pkg)}`);
  }
  console.log('');

  const failedPackages: TestResult[] = [];
  const successfulPackages: TestResult[] = [];

  for (const packagePath of packages) {
    const result = testPackage(packagePath, projectRoot, useDocker, fullCycle, pgEnv);

    if (result.success) {
      successfulPackages.push(result);
    } else {
      failedPackages.push(result);

      if (stopOnFail) {
        console.log('');
        console.error(`${RED}STOPPING: Test failed for package ${result.packageName} and --stop-on-fail was specified${NC}`);
        console.log('');
        console.log('=== TEST SUMMARY (PARTIAL) ===');
        if (successfulPackages.length > 0) {
          console.log(`${GREEN}Successful packages before failure (${successfulPackages.length}):${NC}`);
          for (const pkg of successfulPackages) {
            console.log(`  ${GREEN}✓${NC} ${pkg.packageName}`);
          }
          console.log('');
        }
        console.error(`${RED}Failed package: ${result.packageName}${NC}`);
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
  console.log(`${GREEN}Successful packages (${successfulPackages.length}):${NC}`);
  for (const pkg of successfulPackages) {
    console.log(`  ${GREEN}✓${NC} ${pkg.packageName}`);
  }

  if (failedPackages.length > 0) {
    console.log('');
    console.error(`${RED}Failed packages (${failedPackages.length}):${NC}`);
    for (const pkg of failedPackages) {
      console.error(`  ${RED}✗${NC} ${pkg.packageName}`);
      if (pkg.error) {
        console.error(`    Error: ${pkg.error}`);
      }
    }
    console.log('');
    console.error(`${RED}OVERALL RESULT: FAILED${NC}`);
    process.exit(1);
  } else {
    console.log('');
    console.log(`${GREEN}OVERALL RESULT: ALL PACKAGES PASSED${NC}`);
    process.exit(0);
  }
};
