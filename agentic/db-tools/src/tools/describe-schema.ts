import { type HarnessTool, type HarnessToolResult, strictObject } from '@agentic-kit/harness';
import { z } from 'zod';

import type { ProjectContext } from '../context';
import { failedResult, failureFromError } from '../failure';
import { projectReady } from '../ready';
import { accessInputOf, asWritten, readTables, type SchemaField, type WrittenRule } from '../table-access';

const ParamZod = strictObject('the input', {});
type Params = z.infer<typeof ParamZod>;

type SchemaTable = {
  name: string;
  fields: SchemaField[];
  /** Every policy type of the table, each once. */
  policies: string[];
  /** Each rule that applies, in the shape a caller writes one. */
  policyRules: WrittenRule[];
};

const ruleText = (rule: WrittenRule): string => {
  const notes = [rule.privileges.join(', '), ...(rule.permissive ? [] : ['restrictive'])];
  return `${rule.$type} (${notes.filter(Boolean).join('; ')})`;
};

export type DescribeSchemaDetails = {
  tables: SchemaTable[];
};

function formatText(details: DescribeSchemaDetails): string {
  const lines: string[] = [];
  if (details.tables.length === 0) {
    lines.push('No application tables yet.');
  } else {
    lines.push(`Tables (${details.tables.length}):`);
    for (const table of details.tables) {
      lines.push(`  ${table.name}`);
      for (const field of table.fields) {
        const req = field.isRequired ? ' required' : '';
        const def = field.defaultValue != null ? ` default=${field.defaultValue}` : '';
        lines.push(`    - ${field.name}: ${field.type}${req}${def}`);
      }
      if (table.policyRules.length > 0) {
        lines.push(`    policies: ${table.policyRules.map(ruleText).join(', ')}`);
      }
    }
  }
  return lines.join('\n');
}

export const describeSchemaTool: HarnessTool<typeof ParamZod, DescribeSchemaDetails> = {
  name: 'describe_schema',
  label: 'Describe schema',
  description:
    'Inspect the current Constructive database schema for this project: application tables with their fields (name, type, required, default) and every access rule that applies to each table, in the shape a rule is written, without the parts the backend sets. Read-only.',
  promptSnippet:
    'describe_schema: list the project database tables and their fields. Read-only — call before modifying schema.',
  parameters: ParamZod,
  effect: 'read',
  async execute(_params: Params, ctx) {
    const ready = await projectReady(ctx.cwd);
    if (ready.kind === 'failed') return failedResult(ready.failure, { tables: [] });

    try {
      return await describeTables(ready.value);
    } catch (err) {
      return failedResult(failureFromError(err, 'Failed to read schema'), { tables: [] });
    }
  },
};

async function describeTables(context: ProjectContext): Promise<HarnessToolResult<DescribeSchemaDetails>> {
  const read = await readTables(context);
  if (read.kind === 'failed') return failedResult(read.failure, { tables: [] });
  const tables: SchemaTable[] = read.value.map((table) => {
    const policyRules = accessInputOf(table).policies.map(asWritten);
    return { name: table.name, fields: table.fields, policies: [...new Set(policyRules.map((rule) => rule.$type))], policyRules };
  });
  const details: DescribeSchemaDetails = { tables };
  return { content: [{ type: 'text', text: formatText(details) }], details };
}
