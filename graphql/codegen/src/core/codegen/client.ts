/**
 * Client generator - generates client.ts as ORM client wrapper
 *
 * Uses template-copy pattern: reads hooks-client.ts from templates/
 * and writes it to the output directory with a generated file header.
 */
import * as fs from 'fs';
import * as path from 'path';

import { getGeneratedFileHeader } from './utils';

function findTemplateFile(templateName: string): string {
  const templatePath = path.join(__dirname, 'templates', templateName);
  if (fs.existsSync(templatePath)) {
    return templatePath;
  }
  throw new Error(
    `Could not find template file: ${templateName}. Searched in: ${templatePath}`
  );
}

function readTemplateFile(templateName: string, description: string): string {
  const templatePath = findTemplateFile(templateName);
  let content = fs.readFileSync(templatePath, 'utf-8');
  const headerPattern =
    /\/\*\*[\s\S]*?\* NOTE: This file is read at codegen time and written to output\.[\s\S]*?\*\/\n*/;
  content = content.replace(
    headerPattern,
    getGeneratedFileHeader(description) + '\n'
  );
  return content;
}

/**
 * Generate client.ts content - ORM client wrapper with configure/getClient
 */
export function generateClientFile(): string {
  return readTemplateFile('hooks-client.ts', 'ORM client wrapper for React Query hooks');
}
