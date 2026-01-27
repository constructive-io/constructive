import fs from 'fs';
import path from 'path';

import { SliceResult, PackageOutput } from './types';

/**
 * Options for writing sliced packages to disk
 */
export interface WriteSliceOptions {
  /** Base output directory */
  outputDir: string;

  /** Whether to overwrite existing packages */
  overwrite?: boolean;

  /** Whether to copy SQL files from source */
  copySourceFiles?: boolean;

  /** Source directory containing deploy/revert/verify folders */
  sourceDir?: string;
}

/**
 * Write sliced packages to disk
 */
export function writeSliceResult(
  result: SliceResult,
  options: WriteSliceOptions
): void {
  const { outputDir, overwrite = false, copySourceFiles = false, sourceDir } = options;

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  // Write each package
  for (const pkg of result.packages) {
    writePackage(pkg, outputDir, overwrite, copySourceFiles, sourceDir);
  }

  // Write workspace manifest
  const manifestPath = path.join(outputDir, 'pgpm-workspace.json');
  const manifestContent = JSON.stringify(
    {
      packages: result.workspace.packages.map(p => `packages/${p}`),
      slicing: {
        deployOrder: result.workspace.deployOrder,
        dependencies: result.workspace.dependencies
      },
      stats: result.stats
    },
    null,
    2
  );
  fs.writeFileSync(manifestPath, manifestContent);
}

/**
 * Write a single package to disk
 */
function writePackage(
  pkg: PackageOutput,
  outputDir: string,
  overwrite: boolean,
  copySourceFiles: boolean,
  sourceDir?: string
): void {
  const pkgDir = path.join(outputDir, 'packages', pkg.name);

  // Check if package already exists
  if (fs.existsSync(pkgDir) && !overwrite) {
    throw new Error(`Package directory already exists: ${pkgDir}. Use --overwrite to replace.`);
  }

  // Create package directory structure
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.mkdirSync(path.join(pkgDir, 'deploy'), { recursive: true });
  fs.mkdirSync(path.join(pkgDir, 'revert'), { recursive: true });
  fs.mkdirSync(path.join(pkgDir, 'verify'), { recursive: true });

  // Write plan file
  fs.writeFileSync(path.join(pkgDir, 'pgpm.plan'), pkg.planContent);

  // Write control file
  fs.writeFileSync(path.join(pkgDir, `${pkg.name}.control`), pkg.controlContent);

  // Copy SQL files if requested
  if (copySourceFiles && sourceDir) {
    for (const change of pkg.changes) {
      copyChangeFiles(change.name, sourceDir, pkgDir);
    }
  }
}

/**
 * Copy deploy/revert/verify SQL files for a change
 */
function copyChangeFiles(
  changeName: string,
  sourceDir: string,
  targetDir: string
): void {
  const types = ['deploy', 'revert', 'verify'];

  for (const type of types) {
    const sourceFile = path.join(sourceDir, type, `${changeName}.sql`);
    const targetFile = path.join(targetDir, type, `${changeName}.sql`);

    if (fs.existsSync(sourceFile)) {
      // Create target directory if needed
      const targetSubDir = path.dirname(targetFile);
      fs.mkdirSync(targetSubDir, { recursive: true });

      // Copy file
      fs.copyFileSync(sourceFile, targetFile);
    }
  }
}

/**
 * Generate a dry-run report of what would be created
 */
export function generateDryRunReport(result: SliceResult): string {
  const lines: string[] = [];

  lines.push('=== PGPM Slice Dry Run Report ===\n');

  // Statistics
  lines.push('Statistics:');
  lines.push(`  Total changes: ${result.stats.totalChanges}`);
  lines.push(`  Packages to create: ${result.stats.packagesCreated}`);
  lines.push(`  Internal edges: ${result.stats.internalEdges}`);
  lines.push(`  Cross-package edges: ${result.stats.crossPackageEdges}`);
  lines.push(`  Cross-package ratio: ${(result.stats.crossPackageRatio * 100).toFixed(1)}%`);
  lines.push('');

  // Warnings
  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  [${warning.type}] ${warning.message}`);
      if (warning.suggestedAction) {
        lines.push(`    Suggestion: ${warning.suggestedAction}`);
      }
    }
    lines.push('');
  }

  // Deploy order
  lines.push('Deploy Order:');
  for (let i = 0; i < result.workspace.deployOrder.length; i++) {
    const pkg = result.workspace.deployOrder[i];
    const deps = result.workspace.dependencies[pkg] || [];
    const depStr = deps.length > 0 ? ` (depends on: ${deps.join(', ')})` : '';
    lines.push(`  ${i + 1}. ${pkg}${depStr}`);
  }
  lines.push('');

  // Package details
  lines.push('Packages:');
  for (const pkg of result.packages) {
    lines.push(`\n  ${pkg.name}/`);
    lines.push(`    Changes: ${pkg.changes.length}`);
    lines.push(`    Dependencies: ${pkg.packageDependencies.join(', ') || 'none'}`);
    lines.push('    Contents:');
    for (const change of pkg.changes.slice(0, 5)) {
      lines.push(`      - ${change.name}`);
    }
    if (pkg.changes.length > 5) {
      lines.push(`      ... and ${pkg.changes.length - 5} more`);
    }
  }

  return lines.join('\n');
}
