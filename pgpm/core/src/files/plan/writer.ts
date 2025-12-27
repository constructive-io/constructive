import fs from 'fs';
import path from 'path';

import { Change, PlanFile, PgpmRow, Tag, ExtendedPlanFile } from '../types';

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
  
  // Parse author string - it might contain email in format "Name <email>"
  const authorInput = (opts.author || 'constructive').trim();
  let authorName = authorInput;
  let authorEmail = '';
  
  // Check if author already contains email in <...> format
  const emailMatch = authorInput.match(/^(.+?)\s*<([^>]+)>\s*$/);
  if (emailMatch) {
    // Author already has email format: "Name <email>"
    authorName = emailMatch[1].trim();
    authorEmail = emailMatch[2].trim();
  } else {
    // No email in author, use default format
    authorName = authorInput;
    authorEmail = `${authorName}@5b0c196eeb62`;
  }

  const duplicates: Record<string, boolean> = {};

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
        return `${row.deploy} [${row.deps.join(' ')}] ${date()} ${authorName} <${authorEmail}> # add ${row.name}`;
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
  
  // Add changes and their associated tags
  for (const change of changes) {
    content += generateChangeLineContent(change);
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
export function generateChangeLineContent(change: Change): string {
  const { name, dependencies, timestamp, planner, email, comment } = change;
  
  let line = name;
  
  // Add dependencies if present
  if (dependencies && dependencies.length > 0) {
    line += ` [${dependencies.join(' ')}]`;
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

/**
 * @deprecated Use writePgpmPlan instead. This alias is kept for backwards compatibility.
 */
export const writeSqitchPlan = writePgpmPlan;
