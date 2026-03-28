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

/**
 * Generate a node-fetch.ts file with NodeHttpAdapter for CLI.
 *
 * Provides a GraphQLAdapter implementation using node:http/node:https
 * instead of the Fetch API. This cleanly handles *.localhost subdomain
 * routing (DNS resolution + Host header) without any global patching.
 */
export function generateNodeFetchFile(): GeneratedFile {
  return {
    fileName: 'node-fetch.ts',
    content: readTemplateFile(
      'node-fetch.ts',
      'Node HTTP adapter for localhost subdomain routing',
    ),
  };
}

/**
 * Generate an index.ts entry point file for the CLI.
 *
 * Creates a runnable entry point that imports the command map,
 * handles --version and --tty flags, and starts the CLI.
 * This is off by default (cliEntryPoint: false) since many projects
 * provide their own entry point with custom configuration.
 */
export function generateEntryPointFile(): GeneratedFile {
  return {
    fileName: 'index.ts',
    content: readTemplateFile(
      'cli-entry.ts',
      'CLI entry point',
    ),
  };
}

/**
 * Generate an embedder.ts file with pluggable text-to-vector embedding.
 *
 * Provides a runtime embedder registry using @agentic-kit/ollama so that
 * CLI search and list commands can convert text queries into vector arrays
 * for pgvector similarity search when --auto-embed is passed.
 */
export function generateEmbedderFile(): GeneratedFile {
  return {
    fileName: 'embedder.ts',
    content: readTemplateFile(
      'embedder.ts',
      'CLI embedder — pluggable text-to-vector embedding for search commands',
    ),
  };
}
