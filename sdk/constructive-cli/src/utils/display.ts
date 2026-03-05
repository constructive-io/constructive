/**
 * Display utilities for CLI output formatting.
 *
 * Uses yanse for terminal colors and provides common display patterns
 * for CLI commands: tables, key-value pairs, success/error messages.
 */

import { bold, green, red, yellow, cyan, dim } from 'yanse';

/**
 * Print a success message to stdout.
 */
export function printSuccess(message: string): void {
  console.log(green(bold('Success: ')) + message);
}

/**
 * Print an error message to stderr.
 */
export function printError(message: string): void {
  console.error(red(bold('Error: ')) + message);
}

/**
 * Print a warning message to stderr.
 */
export function printWarning(message: string): void {
  console.error(yellow(bold('Warning: ')) + message);
}

/**
 * Print an informational message to stdout.
 */
export function printInfo(message: string): void {
  console.log(cyan(bold('Info: ')) + message);
}

/**
 * Print a key-value pair with aligned formatting.
 */
export function printKeyValue(key: string, value: string, indent: number = 0): void {
  const prefix = ' '.repeat(indent);
  console.log(`${prefix}${bold(key)}: ${value}`);
}

/**
 * Print a list of key-value pairs as a formatted block.
 */
export function printDetails(
  entries: Array<{ key: string; value: string }>,
  indent: number = 2
): void {
  const maxKeyLen = Math.max(...entries.map((e) => e.key.length));
  for (const entry of entries) {
    const paddedKey = entry.key.padEnd(maxKeyLen);
    printKeyValue(paddedKey, entry.value, indent);
  }
}

/**
 * Print a simple table from rows of data.
 * First row is treated as headers.
 */
export function printTable(
  headers: string[],
  rows: string[][],
  indent: number = 0
): void {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || '').length))
  );

  const prefix = ' '.repeat(indent);

  // Header
  const headerLine = headers
    .map((h, i) => bold(h.padEnd(colWidths[i])))
    .join('  ');
  console.log(`${prefix}${headerLine}`);

  // Separator
  const separator = colWidths.map((w) => dim('-'.repeat(w))).join('  ');
  console.log(`${prefix}${separator}`);

  // Rows
  for (const row of rows) {
    const line = row
      .map((cell, i) => (cell || '').padEnd(colWidths[i]))
      .join('  ');
    console.log(`${prefix}${line}`);
  }
}
