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

export async function headlessSystemPrompt(
  extensions: readonly ExtensionFactory[] = DATABASE_EXTENSIONS
): Promise<string> {
  const names = await toolNamesOf(extensions);
  return `${appBuildingSection(true)}${databaseToolsSection(names)}`;
}
