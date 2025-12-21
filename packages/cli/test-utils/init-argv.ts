import { ParsedArgs } from 'minimist';

// Use testing boilerplate repo for tests to avoid breaking snapshots when production templates change
// Can be overridden via PGPM_TEST_TEMPLATE_REPO env var if needed
export const TEST_TEMPLATE_REPO =
  process.env.PGPM_TEST_TEMPLATE_REPO ??
  'https://github.com/constructive-io/pgpm-boilerplates-testing.git';

export const addInitDefaults = (argv: ParsedArgs): ParsedArgs => {
  const baseName = (argv.moduleName as string) || (argv.name as string) || 'module';

  const defaults = {
    fullName: 'Tester',
    email: 'tester@example.com',
    moduleName: argv.workspace ? 'starter-module' : baseName,
    username: 'tester',
    repoName: baseName,
    license: 'MIT',
    access: 'public',
    packageIdentifier: baseName,
    moduleDesc: baseName
  };

  return { ...defaults, ...argv };
};

export const withInitDefaults = (argv: ParsedArgs, defaultRepo: string = TEST_TEMPLATE_REPO): ParsedArgs => {
  const args = addInitDefaults(argv);
  if (!Array.isArray(args._) || !args._.includes('init')) return args;

  return {
    ...args,
    repo: args.repo ?? defaultRepo,
    fromBranch: args.fromBranch ?? 'main'
    // Don't set default templatePath - let scaffoldTemplate use metadata-driven resolution from .boilerplates.json
  };
};
