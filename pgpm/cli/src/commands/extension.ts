import { PgpmPackage } from '@pgpmjs/core';
import { CLIOptions, Inquirerer, OptionValue, ParsedArgs, Question } from 'inquirerer';

const extensionUsageText = `
Extension Command:

  pgpm extension [OPTIONS]

  Manage the extensions / module dependencies of the current module
  (the \`requires\` line of its .control file).

Options:
  --help, -h              Show this help message
  --cwd <directory>       Working directory (default: current directory)
  --add <a,b>             Add one or more dependencies (non-interactive)
  --remove <a,b>          Remove one or more dependencies (non-interactive)
  --set <a,b>             Replace all dependencies with this exact set (non-interactive)

Examples:
  pgpm extension                       Manage dependencies interactively
  pgpm extension --add uuid-ossp       Add a dependency
  pgpm extension --add pgcrypto,citext Add several dependencies
  pgpm extension --remove uuid-ossp    Remove a dependency
  pgpm extension --set plpgsql         Replace the dependency set
`;

/**
 * Parse a flag that may be a comma-separated string, a single value, or an
 * array (repeated flags) into a clean string[].
 */
const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((v) => parseList(v));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(extensionUsageText);
    process.exit(0);
  }
  const { cwd = process.cwd() } = argv;

  const project = new PgpmPackage(cwd);

  if (!project.isInModule()) {
    throw new Error('You must run this command inside a PGPM module.');
  }

  const installed = project.getRequiredModules();

  // Non-interactive mode: --set / --add / --remove let CI and scripts change
  // dependencies without a prompt. --set replaces the whole set; --add/--remove
  // mutate the current set.
  const setProvided = argv.set !== undefined;
  const addList = parseList(argv.add);
  const removeList = parseList(argv.remove);

  if (setProvided || addList.length > 0 || removeList.length > 0) {
    const base = setProvided ? parseList(argv.set) : [...installed];
    const withAdds = [...base];
    for (const ext of addList) {
      if (!withAdds.includes(ext)) withAdds.push(ext);
    }
    const next = withAdds.filter((ext) => !removeList.includes(ext));
    project.setModuleDependencies(next);
    return;
  }

  const info = project.getModuleInfo();
  const available = await project.getAvailableModules();
  const filtered = available.filter((name) => name !== info.extname);

  const questions: Question[] = [
    {
      name: 'extensions',
      message: 'Which extensions / modules does this one depend on?',
      type: 'checkbox',
      allowCustomOptions: true,
      options: filtered,
      default: installed
    }
  ];

  const answers = await prompter.prompt(argv, questions);
  const selected = (answers.extensions as OptionValue[])
    .filter((opt) => opt.selected)
    .map((opt) => opt.name);

  project.setModuleDependencies(selected);
};
