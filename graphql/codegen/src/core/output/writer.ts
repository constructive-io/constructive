/**
 * File writing utilities
 *
 * Pure functions for writing generated files to disk and formatting them.
 * These are core utilities that can be used programmatically or by the CLI.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { GeneratedFile } from '../codegen';

export type { GeneratedFile };

/**
 * Result of writing files
 */
export interface WriteResult {
  success: boolean;
  filesWritten?: string[];
  errors?: string[];
}

/**
 * Options for writing files
 */
export interface WriteOptions {
  /** Show progress output (default: true) */
  showProgress?: boolean;
  /** Format files with oxfmt after writing (default: true) */
  formatFiles?: boolean;
}

type OxfmtFormatFn = (
  fileName: string,
  sourceText: string,
  options?: Record<string, unknown>
) => Promise<{ code: string; errors: unknown[] }>;

/**
 * Dynamically import oxfmt's format function
 * Returns null if oxfmt is not available
 */
async function getOxfmtFormat(): Promise<OxfmtFormatFn | null> {
  try {
    const oxfmt = await import('oxfmt');
    return oxfmt.format;
  } catch {
    return null;
  }
}

/**
 * Format a single file's content using oxfmt programmatically
 */
async function formatFileContent(
  fileName: string,
  content: string,
  formatFn: OxfmtFormatFn
): Promise<string> {
  try {
    const result = await formatFn(fileName, content, {
      singleQuote: true,
      trailingComma: 'es5',
      tabWidth: 2,
      semi: true,
    });
    return result.code;
  } catch {
    // If formatting fails, return original content
    return content;
  }
}

/**
 * Write generated files to disk
 *
 * @param files - Array of files to write
 * @param outputDir - Base output directory
 * @param subdirs - Subdirectories to create
 * @param options - Write options
 */
export async function writeGeneratedFiles(
  files: GeneratedFile[],
  outputDir: string,
  subdirs: string[],
  options: WriteOptions = {}
): Promise<WriteResult> {
  const { showProgress = true, formatFiles = true } = options;
  const errors: string[] = [];
  const written: string[] = [];
  const total = files.length;
  const isTTY = process.stdout.isTTY;

  // Ensure output directory exists
  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      errors: [`Failed to create output directory: ${message}`],
    };
  }

  // Create subdirectories
  for (const subdir of subdirs) {
    const subdirPath = path.join(outputDir, subdir);
    try {
      fs.mkdirSync(subdirPath, { recursive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to create directory ${subdirPath}: ${message}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Get oxfmt format function if formatting is enabled
  const formatFn = formatFiles ? await getOxfmtFormat() : null;
  if (formatFiles && !formatFn && showProgress) {
    console.warn('Warning: oxfmt not available, files will not be formatted');
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(outputDir, file.path);

    // Show progress
    if (showProgress) {
      const progress = Math.round(((i + 1) / total) * 100);
      if (isTTY) {
        process.stdout.write(
          `\rWriting files: ${i + 1}/${total} (${progress}%)`
        );
      } else if (i % 100 === 0 || i === total - 1) {
        // Non-TTY: periodic updates for CI/CD
        console.log(`Writing files: ${i + 1}/${total}`);
      }
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(filePath);
    try {
      fs.mkdirSync(parentDir, { recursive: true });
    } catch {
      // Ignore if already exists
    }

    // Format content if oxfmt is available and file is TypeScript
    let content = file.content;
    if (formatFn && file.path.endsWith('.ts')) {
      content = await formatFileContent(file.path, content, formatFn);
    }

    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      written.push(filePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to write ${filePath}: ${message}`);
    }
  }

  // Clear progress line
  if (showProgress && isTTY) {
    process.stdout.write('\r' + ' '.repeat(40) + '\r');
  }

  return {
    success: errors.length === 0,
    filesWritten: written,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Recursively find all .ts files in a directory
 */
function findTsFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore errors reading directories
  }

  return files;
}

/**
 * Format generated files using oxfmt programmatically
 *
 * @deprecated Use writeGeneratedFiles with formatFiles option instead.
 * This function is kept for backwards compatibility.
 */
export async function formatOutput(
  outputDir: string
): Promise<{ success: boolean; error?: string }> {
  const formatFn = await getOxfmtFormat();
  if (!formatFn) {
    return {
      success: false,
      error: 'oxfmt not available. Install it with: npm install oxfmt',
    };
  }

  const absoluteOutputDir = path.resolve(outputDir);

  try {
    // Find all .ts files in the output directory
    const tsFiles = findTsFiles(absoluteOutputDir);

    for (const filePath of tsFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const formatted = await formatFileContent(path.basename(filePath), content, formatFn);
      fs.writeFileSync(filePath, formatted, 'utf-8');
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
