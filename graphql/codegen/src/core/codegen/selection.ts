/**
 * Selection helper generator for React Query hooks
 *
 * Uses template-copy pattern: reads hooks-selection.ts from templates/
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
 * Generate selection.ts content - shared selection types + runtime mappers
 */
export function generateSelectionFile(): string {
  return readTemplateFile('hooks-selection.ts', 'Selection helpers for React Query hooks');
}
