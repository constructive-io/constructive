import {
  KnativeJobsSvc,
  KnativeJobsSvcOptions
} from '@constructive-io/knative-job-service';
import { existsSync } from 'fs';
import { cliExitWithError, CLIOptions, extractFirst,Inquirerer, Question } from 'inquirerer';
import { resolve } from 'path';

const jobsUsageText = `
Constructive Jobs:

  cnc jobs <subcommand> [OPTIONS]

  Start or manage Constructive jobs services.

Subcommands:
  up                  Start jobs runtime (worker + scheduler + callback server)

Options:
  --help, -h           Show this help message
  --cwd <directory>    Working directory (default: current directory)
  --with-jobs-server      Enable jobs server (default: disabled; flag-only)

Examples:
  cnc jobs up
  cnc jobs up --cwd /path/to/constructive
  cnc jobs up --with-jobs-server
`;

const questions: Question[] = [
  {
    name: 'withJobsServer',
    alias: 'with-jobs-server',
    message: 'Enable jobs server?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true
  }
];

const ensureCwd = (cwd: string): string => {
  const resolved = resolve(cwd);
  if (!existsSync(resolved)) {
    throw new Error(`Working directory does not exist: ${resolved}`);
  }
  process.chdir(resolved);
  return resolved;
};

const buildKnativeJobsSvcOptions = (
  args: Partial<Record<string, any>>
): KnativeJobsSvcOptions => ({
  jobs: { enabled: args.withJobsServer === true }
});

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(jobsUsageText);
    process.exit(0);
  }

  const { first: subcommand, newArgv } = extractFirst(argv);
  const args = newArgv as Partial<Record<string, any>>;

  if (!subcommand) {
    console.log(jobsUsageText);
    await cliExitWithError('No subcommand provided. Use "up".');
    return;
  }

  switch (subcommand) {
  case 'up': {
    try {
      ensureCwd((args.cwd as string) || process.cwd());
      const promptAnswers = await prompter.prompt(args, questions);
      const server = new KnativeJobsSvc(buildKnativeJobsSvcOptions(promptAnswers));
      await server.start();
    } catch (error) {
      await cliExitWithError(
        `Failed to start jobs runtime: ${(error as Error).message}`
      );
    }
    break;
  }

  default:
    console.log(jobsUsageText);
    await cliExitWithError(`Unknown subcommand: ${subcommand}. Use "up".`);
  }
};
