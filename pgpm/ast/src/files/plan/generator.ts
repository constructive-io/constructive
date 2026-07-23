import fs from 'fs';

/**
 * Fixed epoch timestamp used for deterministic plan generation.
 * Can be overridden with the PGPM_FROZEN_TIME environment variable.
 */
const DEFAULT_FROZEN_TIME = '2017-08-11T08:11:51Z';

/**
 * Get a UTC timestamp string from a Date object.
 */
function getUTCTimestamp(d: Date): string {
  return (
    d.getUTCFullYear() +
    '-' + String(d.getUTCMonth() + 1).padStart(2, '0') +
    '-' + String(d.getUTCDate()).padStart(2, '0') +
    'T' + String(d.getUTCHours()).padStart(2, '0') +
    ':' + String(d.getUTCMinutes()).padStart(2, '0') +
    ':' + String(d.getUTCSeconds()).padStart(2, '0') +
    'Z'
  );
}

/**
 * Get a timestamp for the plan file.
 * Uses the PGPM_FROZEN_TIME env var if present, otherwise the fixed epoch.
 */
export function getNow(): string {
  const frozen = process.env.PGPM_FROZEN_TIME;
  if (frozen) {
    return getUTCTimestamp(new Date(frozen));
  }
  return DEFAULT_FROZEN_TIME;
}

export interface PlanEntry {
  change: string;
  dependencies: string[];
  comment?: string;
}

export interface GeneratePlanOptions {
  moduleName: string;
  uri?: string;
  entries: PlanEntry[];
}

/**
 * Sort dependencies by their order in the supplied plan, so prerequisites
 * (parent migrations) appear before their dependents in the bracket.
 * Internal dependencies are sorted by their plan index, and external
 * dependencies (not in the plan) preserve their original order.
 */
const sortDependencies = (deps: string[], order: Map<string, number>): string[] => {
  const originalOrder = new Map(deps.map((dep, index) => [dep, index]));
  return [...deps].sort((a, b) => {
    const aIndex = order.get(a);
    const bIndex = order.get(b);
    const aOriginal = originalOrder.get(a)!;
    const bOriginal = originalOrder.get(b)!;
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex || aOriginal - bOriginal;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return aOriginal - bOriginal;
  });
};

/**
 * Generate a plan file content from structured data
 */
export function generatePlan(options: GeneratePlanOptions): string {
  const { moduleName, uri, entries } = options;
  const now = getNow();

  const planfile: string[] = [
    `%syntax-version=1.0.0`,
    `%project=${moduleName}`,
    `%uri=${uri || moduleName}`
  ];

  // Build an order map from the entry list so brackets can be sorted by plan order
  const entryOrder = new Map(entries.map((entry, index) => [entry.change, index]));

  // Generate the plan entries
  entries.forEach(entry => {
    const deps = sortDependencies(entry.dependencies || [], entryOrder);
    if (deps.length > 0) {
      planfile.push(
        `${entry.change} [${deps.join(' ')}] ${now} constructive <constructive@5b0c196eeb62>${entry.comment ? ` # ${entry.comment}` : ''}`
      );
    } else {
      planfile.push(
        `${entry.change} ${now} constructive <constructive@5b0c196eeb62>${entry.comment ? ` # ${entry.comment}` : ''}`
      );
    }
  });

  return planfile.join('\n');
}

/**
 * Write a generated plan file to disk
 */
export function writePlan(planPath: string, plan: string): void {
  fs.writeFileSync(planPath, plan);
}
