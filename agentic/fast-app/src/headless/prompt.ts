// The system prompt section a run with no UI adds with its tools: the
// app-building sections every host shares (../prompt.ts), then the database
// and schema tools paragraph, which names the tools this run has. The names
// come from what the extensions register, so the text can't name a tool the
// run lacks, such as provision_database, which a cloud run never gets.

import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { appBuildingSection, specToolsNote } from '../prompt';
import { DATABASE_EXTENSIONS, toolNamesOf } from './extensions';

/** "`a`, `b`, and `c`". */
function codeList(names: readonly string[]): string {
  const quoted = names.map((name) => `\`${name}\``);
  if (quoted.length <= 2) return quoted.join(' and ');
  return `${quoted.slice(0, -1).join(', ')}, and ${quoted[quoted.length - 1]}`;
}

/** The desktop's "Database and schema tools" section, with the tools a cloud run has. */
export function databaseToolsSection(names: readonly string[]): string {
  return `## Database and schema tools

These tools are this run's database and schema tools: ${codeList(names)}. They are the only supported path for database and schema work.${specToolsNote()} Load the \`custom-tools\` skill before you use them directly.`;
}

/** The section for the system prompt: app building, then the database tools of `extensions`. */
export async function headlessSystemPrompt(
  extensions: readonly ExtensionFactory[] = DATABASE_EXTENSIONS
): Promise<string> {
  const names = await toolNamesOf(extensions);
  return `${appBuildingSection(true)}${databaseToolsSection(names)}`;
}
