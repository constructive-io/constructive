import * as fs from 'fs';
import * as path from 'path';

import { getGeneratedFileHeader } from '../utils';
import type { GeneratedFile } from './executor-generator';

/**
 * Find the cli-utils template file path.
 * Templates are at ../templates/ relative to this file in both src/ and dist/.
 */
function findTemplateFile(templateName: string): string {
  const templatePath = path.join(__dirname, '../templates', templateName);

  if (fs.existsSync(templatePath)) {
    return templatePath;
  }

  throw new Error(
    `Could not find template file: ${templateName}. ` +
      `Searched in: ${templatePath}`,
  );
}

/**
 * Read a template file and replace the header with generated file header.
 * Follows the same pattern as ORM client-generator.ts readTemplateFile().
 */
function readTemplateFile(templateName: string, description: string): string {
  const templatePath = findTemplateFile(templateName);
  let content = fs.readFileSync(templatePath, 'utf-8');

  // Replace the source file header comment with the generated file header
  // Match the header pattern used in template files
  const headerPattern =
    /\/\*\*[\s\S]*?\* NOTE: This file is read at codegen time and written to output\.[\s\S]*?\*\/\n*/;

  content = content.replace(
    headerPattern,
    getGeneratedFileHeader(description) + '\n',
  );

  return content;
}

/**
 * Generate a utils.ts file with runtime helpers for CLI commands.
 * Reads from the templates directory (cli-utils.ts) for proper type checking.
 *
 * Includes type coercion (string CLI args -> proper GraphQL types),
 * field filtering (strip extra minimist fields like _ and tty),
 * and mutation input parsing.
 */
export function generateUtilsFile(): GeneratedFile {
  return {
    fileName: 'utils.ts',
    content: readTemplateFile(
      'cli-utils.ts',
      'CLI utility functions for type coercion and input handling',
    ),
  };
}
