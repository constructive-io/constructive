import fs from 'fs';
import path from 'path';

import { DEFAULT_TEMPLATE_REPO, DEFAULT_TEMPLATE_TOOL_NAME, scaffoldTemplate, sluggify } from '@pgpmjs/core';
import { Inquirerer, Question, registerDefaultResolver } from 'inquirerer';

const DEFAULT_MOTD = `
                 |              _   _
     ===         |.===.        '\\-//\`
    (o o)        {}o o{}        (o o)
ooO--(_)--Ooo-ooO--(_)--Ooo-ooO--(_)--Ooo-
`;

export default async function runWorkspaceSetup(
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer
) {
  const workspaceQuestions: Question[] = [
    {
      name: 'name',
      message: 'Enter workspace name',
      required: true,
      type: 'text'
    }
  ];

  const answers = await prompter.prompt(argv, workspaceQuestions);
  const { cwd = process.cwd() } = argv;
  const targetPath = path.join(cwd, sluggify(answers.name));
  // Prevent double-echoed keystrokes by closing our prompter before template prompts.
  prompter.close();

  const templateRepo = (argv.repo as string) ?? DEFAULT_TEMPLATE_REPO;
  // Don't set default template - let scaffoldTemplate use metadata-driven resolution
  // Support both --template (new) and --template-path (deprecated) for backward compatibility
  const template = (argv.template || argv.templatePath) as string | undefined;

  // Register workspace.dirname resolver so boilerplate templates can use it via defaultFrom/setFrom
  // This provides the intended workspace directory name before the folder is created
  const dirName = path.basename(targetPath);
  registerDefaultResolver('workspace.dirname', () => dirName);

  const dir = argv.dir as string | undefined;

  await scaffoldTemplate({
    fromPath: template ?? 'workspace',
    outputDir: targetPath,
    templateRepo,
    branch: argv.fromBranch as string | undefined,
    dir,
    answers: {
      ...argv,
      ...answers,
      workspaceName: answers.name
    },
    toolName: DEFAULT_TEMPLATE_TOOL_NAME,
    noTty: Boolean((argv as any).noTty || argv['no-tty'] || process.env.CI === 'true'),
    cwd,
    prompter
  });

  // Check for .motd file and print it, or use default ASCII art
  const motdPath = path.join(targetPath, '.motd');
  let motd = DEFAULT_MOTD;
  if (fs.existsSync(motdPath)) {
    try {
      motd = fs.readFileSync(motdPath, 'utf8');
      fs.unlinkSync(motdPath);
    } catch {
      // Ignore errors reading/deleting .motd
    }
  }
  process.stdout.write(motd);
  if (!motd.endsWith('\n')) {
    process.stdout.write('\n');
  }

  process.stdout.write(`\n✨ Enjoy!\n\ncd ./${dirName}\n`);

  return { ...argv, ...answers, cwd: targetPath };
}
