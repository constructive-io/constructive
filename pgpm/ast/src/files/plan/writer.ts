import fs from 'fs';
import path from 'path';

import { parseAuthor } from '../../utils/author';
import { Change, ExtendedPlanFile,PgpmRow, Tag } from '../types';

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

export interface PlanWriteOptions {
  outdir: string;
  name: string;
  replacer: (str: string) => string;
  author?: string;
}

/**
 * Write a PGPM plan file based on the provided rows
 */
export function writePgpmPlan(rows: PgpmRow[], opts: PlanWriteOptions): void {
  const dir = path.resolve(path.join(opts.outdir, opts.name));
  fs.mkdirSync(dir, { recursive: true });

  const date = (): string => '2017-08-11T08:11:51Z'; // stubbed timestamp
  
  const { fullName, email } = parseAuthor(opts.author || 'constructive');
  const authorName = fullName;
  const authorEmail = email || `${fullName}@5b0c196eeb62`;

  const duplicates: Record<string, boolean> = {};

  // Build an order map from the row list so brackets can be sorted by plan order
  const rowOrder = new Map(rows.map((row, index) => [row.deploy, index]));

  const plan = opts.replacer(`%syntax-version=1.0.0
%project=constructive-extension-name
%uri=constructive-extension-name

${rows
    .map((row) => {
      if (duplicates[row.deploy]) {
        console.log('DUPLICATE ' + row.deploy);
        return '';
      }
      duplicates[row.deploy] = true;

      if (row.deps?.length) {
        return `${row.deploy} [${sortDependencies(row.deps, rowOrder).join(' ')}] ${date()} ${authorName} <${authorEmail}> # add ${row.name}`;
      }
      return `${row.deploy} ${date()} ${authorName} <${authorEmail}> # add ${row.name}`;
    })
    .join('\n')}
`);

  fs.writeFileSync(path.join(dir, 'pgpm.plan'), plan);
}

/**
 * Write a plan file with the provided content
 */
export function writePlanFile(planPath: string, plan: ExtendedPlanFile): void {
  const content = generatePlanFileContent(plan);
  fs.writeFileSync(planPath, content);
}

/**
 * Generate content for a plan file
 */
export function generatePlanFileContent(plan: ExtendedPlanFile): string {
  const { package: packageName, uri, changes, tags } = plan;

  let content = `%syntax-version=1.0.0\n`;
  content += `%project=${packageName}\n`;

  if (uri) {
    content += `%uri=${uri}\n`;
  }

  content += `\n`;

  // Build an order map from the change list so brackets can be sorted by plan order
  const changeOrder = new Map(changes.map((change, index) => [change.name, index]));

  // Add changes and their associated tags
  for (const change of changes) {
    content += generateChangeLineContent(change, changeOrder);
    content += `\n`;

    const associatedTags = tags.filter(tag => tag.change === change.name);
    for (const tag of associatedTags) {
      content += generateTagLineContent(tag);
      content += `\n`;
    }
  }

  return content;
}

/**
 * Generate a line for a change in a plan file
 */
export function generateChangeLineContent(change: Change, changeOrder?: Map<string, number>): string {
  const { name, dependencies, timestamp, planner, email, comment } = change;

  let line = name;

  // Add dependencies if present, sorted by plan order
  if (dependencies && dependencies.length > 0) {
    line += ` [${sortDependencies(dependencies, changeOrder || new Map()).join(' ')}]`;
  }
  
  // Add timestamp if present
  if (timestamp) {
    line += ` ${timestamp}`;
    
    // Add planner if present
    if (planner) {
      line += ` ${planner}`;
      
      // Add email if present
      if (email) {
        line += ` <${email}>`;
      }
    }
  }
  
  // Add comment if present
  if (comment) {
    line += ` # ${comment}`;
  }
  
  return line;
}

/**
 * Generate a line for a tag in a plan file
 */
export function generateTagLineContent(tag: Tag): string {
  const { name, timestamp, planner, email, comment } = tag;
  
  let line = `@${name}`;
  
  // Add timestamp if present
  if (timestamp) {
    line += ` ${timestamp}`;
    
    // Add planner if present
    if (planner) {
      line += ` ${planner}`;
      
      // Add email if present
      if (email) {
        line += ` <${email}>`;
      }
    }
  }
  
  // Add comment if present
  if (comment) {
    line += ` # ${comment}`;
  }
  
  return line;
}
