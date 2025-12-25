import { DEFAULT_TEMPLATE_REPO, DEFAULT_TEMPLATE_TOOL_NAME, PgpmPackage, sluggify } from '@pgpmjs/core';
import { errors } from '@pgpmjs/types';
import { Inquirerer, OptionValue, Question } from 'inquirerer';

export default async function runModuleSetup(
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer
) {
  const { cwd = process.cwd() } = argv;

  const project = new PgpmPackage(cwd);

  if (!project.workspacePath) {
    process.stderr.write('Not inside a PGPM workspace.\n');
    throw errors.NOT_IN_WORKSPACE({});
  }

  if (!project.isInsideAllowedDirs(cwd) && !project.isInWorkspace() && !project.isParentOfAllowedDirs(cwd)) {
    process.stderr.write('You must be inside the workspace root or a parent directory of modules (like packages/).\n');
    throw errors.NOT_IN_WORKSPACE_MODULE({});
  }

  const availExtensions = project.getAvailableModules();

  const moduleQuestions: Question[] = [
    {
      name: 'moduleName',
      message: 'Enter the module name',
      required: true,
      type: 'text',
    },
    {
      name: 'extensions',
      message: 'Which extensions?',
      options: availExtensions,
      type: 'checkbox',
      allowCustomOptions: true,
      required: true,
    },
  ];

  const answers = await prompter.prompt(argv, moduleQuestions);
  const modName = sluggify(answers.moduleName);
  // Avoid overlapping readline listeners with create-gen-app's prompts.
  prompter.close();

  const extensions = answers.extensions
    .filter((opt: OptionValue) => opt.selected)
    .map((opt: OptionValue) => opt.name);

  const templateRepo = (argv.repo as string) ?? DEFAULT_TEMPLATE_REPO;
  const templatePath = argv.templatePath as string | undefined;

  const templateAnswers = {
    ...argv,
    ...answers,
    moduleName: modName,
    packageIdentifier: (argv as any).packageIdentifier || modName
  };

  await project.initModule({
    name: modName,
    description: answers.description || modName,
    author: answers.author || modName,
    extensions,
    templateRepo,
    templatePath,
    branch: argv.fromBranch as string | undefined,
    toolName: DEFAULT_TEMPLATE_TOOL_NAME,
    answers: templateAnswers,
    noTty: Boolean((argv as any).noTty || argv['no-tty'] || process.env.CI === 'true')
  });

  process.stdout.write(`Initialized module: ${modName}\n`);
  return { ...argv, ...answers };
}
