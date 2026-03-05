import type { DocsConfig } from '../../types/config';
import type { CleanField, CleanOperation, CleanTable } from '../../types/schema';
import { getScalarFields, getPrimaryKeyInfo } from './utils';

export interface GeneratedDocFile {
  fileName: string;
  content: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

export interface SkillDefinition {
  name: string;
  description: string;
  usage: string[];
  examples: { description: string; code: string[] }[];
  language?: string;
}

export interface SkillReferenceDefinition {
  title: string;
  description: string;
  usage: string[];
  examples: { description: string; code: string[] }[];
  language?: string;
}

const CONSTRUCTIVE_LOGO_URL =
  'https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg';

const CONSTRUCTIVE_REPO = 'https://github.com/constructive-io/constructive';

export function getReadmeHeader(title: string): string[] {
  return [
    `# ${title}`,
    '',
    '<p align="center" width="100%">',
    `  <img height="120" src="${CONSTRUCTIVE_LOGO_URL}" />`,
    '</p>',
    '',
    `<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->`,
    '',
  ];
}

export function getReadmeFooter(): string[] {
  return [
    '---',
    '',
    'Built by the [Constructive](https://constructive.io) team.',
    '',
    '## Disclaimer',
    '',
    'AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.',
    '',
    'No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.',
    '',
  ];
}

export function resolveDocsConfig(
  docs: DocsConfig | boolean | undefined,
): DocsConfig {
  if (docs === true) {
    return { readme: true, agents: true, mcp: true, skills: true };
  }
  if (docs === false) {
    return { readme: false, agents: false, mcp: false, skills: false };
  }
  if (!docs) {
    return { readme: true, agents: true, mcp: false, skills: false };
  }
  return {
    readme: docs.readme ?? true,
    agents: docs.agents ?? true,
    mcp: docs.mcp ?? false,
    skills: docs.skills ?? false,
  };
}

export function formatArgType(arg: CleanOperation['args'][number]): string {
  const t = arg.type;
  if (t.kind === 'NON_NULL' && t.ofType) {
    return `${formatTypeRef(t.ofType)} (required)`;
  }
  return formatTypeRef(t);
}

export function formatTypeRef(
  t: CleanOperation['args'][number]['type'],
): string {
  if (t.kind === 'LIST' && t.ofType) {
    return `[${formatTypeRef(t.ofType)}]`;
  }
  if (t.kind === 'NON_NULL' && t.ofType) {
    return `${formatTypeRef(t.ofType)}!`;
  }
  return t.name ?? 'unknown';
}

export function getEditableFields(table: CleanTable): CleanField[] {
  const pk = getPrimaryKeyInfo(table)[0];
  return getScalarFields(table).filter(
    (f) =>
      f.name !== pk.name &&
      f.name !== 'nodeId' &&
      f.name !== 'createdAt' &&
      f.name !== 'updatedAt',
  );
}

export function gqlTypeToJsonSchemaType(gqlType: string): string {
  switch (gqlType) {
    case 'Int':
      return 'integer';
    case 'Float':
      return 'number';
    case 'Boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

export function buildSkillFile(
  skill: SkillDefinition,
  referenceNames?: string[],
): string {
  const lang = skill.language ?? 'bash';
  const lines: string[] = [];

  // YAML frontmatter (Agent Skills format)
  lines.push('---');
  lines.push(`name: ${skill.name}`);
  lines.push(`description: ${skill.description}`);
  lines.push('---');
  lines.push('');

  lines.push(`# ${skill.name}`);
  lines.push('');
  lines.push('<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->');
  lines.push('');
  lines.push(skill.description);
  lines.push('');
  lines.push('## Usage');
  lines.push('');
  lines.push(`\`\`\`${lang}`);
  for (const u of skill.usage) {
    lines.push(u);
  }
  lines.push('```');
  lines.push('');
  lines.push('## Examples');
  lines.push('');
  for (const ex of skill.examples) {
    lines.push(`### ${ex.description}`);
    lines.push('');
    lines.push(`\`\`\`${lang}`);
    for (const cmd of ex.code) {
      lines.push(cmd);
    }
    lines.push('```');
    lines.push('');
  }

  if (referenceNames && referenceNames.length > 0) {
    lines.push('## References');
    lines.push('');
    lines.push('See the `references/` directory for detailed per-entity API documentation:');
    lines.push('');
    for (const name of referenceNames) {
      lines.push(`- [${name}](references/${name}.md)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function buildSkillReference(ref: SkillReferenceDefinition): string {
  const lang = ref.language ?? 'bash';
  const lines: string[] = [];

  lines.push(`# ${ref.title}`);
  lines.push('');
  lines.push('<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->');
  lines.push('');
  lines.push(ref.description);
  lines.push('');
  lines.push('## Usage');
  lines.push('');
  lines.push(`\`\`\`${lang}`);
  for (const u of ref.usage) {
    lines.push(u);
  }
  lines.push('```');
  lines.push('');
  lines.push('## Examples');
  lines.push('');
  for (const ex of ref.examples) {
    lines.push(`### ${ex.description}`);
    lines.push('');
    lines.push(`\`\`\`${lang}`);
    for (const cmd of ex.code) {
      lines.push(cmd);
    }
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}
