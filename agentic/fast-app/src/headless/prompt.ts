// The database tools paragraph names what the extensions register, so it
// can't name a tool the run lacks.

import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { appBuildingSection, specToolsNote } from '../prompt';
import { DATABASE_EXTENSIONS, toolNamesOf } from './extensions';

function codeList(names: readonly string[]): string {
  const quoted = names.map((name) => `\`${name}\``);
  if (quoted.length <= 2) return quoted.join(' and ');
  return `${quoted.slice(0, -1).join(', ')}, and ${quoted[quoted.length - 1]}`;
}

export function databaseToolsSection(names: readonly string[]): string {
  return `## Database and schema tools

These tools are this run's database and schema tools: ${codeList(names)}. They are the only supported path for database and schema work.${specToolsNote()} Load the \`custom-tools\` skill before you use them directly.`;
}

// Only the tools wait for the install the run starts with (template.ts); the
// agent's own pnpm commands don't.
const APP_PACKAGES = `## The app's packages

A cloud run starts in a fresh clone, so the app's packages install in the background as the run starts. \`plan_app\`, \`verify_app\` and \`run_codegen\` wait for that install. Your own \`pnpm\` commands in \`packages/app\` don't: when one fails because \`tsc\` or a package is missing, the install is still running, so wait a few seconds and run it again. Never run \`pnpm install\` yourself: a second install in the same folder breaks the first.

`;

export async function headlessSystemPrompt(
  extensions: readonly ExtensionFactory[] = DATABASE_EXTENSIONS
): Promise<string> {
  const names = await toolNamesOf(extensions);
  return `${appBuildingSection(true)}${APP_PACKAGES}${databaseToolsSection(names)}`;
}
