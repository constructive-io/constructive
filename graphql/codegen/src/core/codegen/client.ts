/**
 * Client generator - generates client.ts with configure() and execute()
 *
 * Reads from template files in the templates/ directory for proper type checking.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getGeneratedFileHeader } from './utils';

export interface GenerateClientFileOptions {
  /**
   * Generate browser-compatible code using native fetch
   * When true (default), uses native W3C fetch API
   * When false, uses undici fetch with dispatcher support for localhost DNS resolution
   * @default true
   */
  browserCompatible?: boolean;
}

/**
 * Find a template file path.
 * Templates are at ./templates/ relative to this file in both src/ and dist/.
 */
function findTemplateFile(templateName: string): string {
  const templatePath = path.join(__dirname, 'templates', templateName);

  if (fs.existsSync(templatePath)) {
    return templatePath;
  }

  throw new Error(
    `Could not find template file: ${templateName}. ` +
      `Searched in: ${templatePath}`
  );
}

/**
 * Read a template file and replace the header with generated file header
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
    getGeneratedFileHeader(description) + '\n'
  );

  return content;
}

/**
 * Generate client.ts content
 * @param options - Generation options
 */
export function generateClientFile(
  options: GenerateClientFileOptions = {}
): string {
  const { browserCompatible = true } = options;

  const templateName = browserCompatible
    ? 'client.browser.ts'
    : 'client.node.ts';

  return readTemplateFile(
    templateName,
    'GraphQL client configuration and execution'
  );
}
