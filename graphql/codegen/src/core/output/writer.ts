/**
 * File writing utilities
 *
 * Pure functions for writing generated files to disk and formatting them.
 * These are core utilities that can be used programmatically or by the CLI.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

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

    try {
      fs.writeFileSync(filePath, file.content, 'utf-8');
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

  // Format all generated files with oxfmt
  if (formatFiles && errors.length === 0) {
    if (showProgress) {
      console.log('Formatting generated files...');
    }
    const formatResult = formatOutput(outputDir);
    if (!formatResult.success && showProgress) {
      console.warn(
        'Warning: Failed to format generated files:',
        formatResult.error
      );
    }
  }

  return {
    success: errors.length === 0,
    filesWritten: written,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Format generated files using oxfmt
 *
 * Runs oxfmt on the output directory after all files are written.
 * Uses the same formatting options as prettier: single quotes, trailing commas, 2-space tabs, semicolons.
 */
export function formatOutput(
  outputDir: string
): { success: boolean; error?: string } {
  const absoluteOutputDir = path.resolve(outputDir);

  try {
    execSync(
      `npx oxfmt --write "${absoluteOutputDir}"`,
      {
        stdio: 'pipe',
        encoding: 'utf-8',
      }
    );
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
