import { toKebabCase } from 'inflekt';

import type { Operation, Table, TypeRegistry } from '../../../types/schema';
import {
  buildSkillFile,
  buildSkillReference,
  formatArgType,
  fieldPlaceholder,
  pkPlaceholder,
  argPlaceholder,
  getEditableFields,
  categorizeSpecialFields,
  buildSpecialFieldsMarkdown,
  getReadmeHeader,
  getReadmeFooter,
  gqlTypeToJsonSchemaType,
} from '../docs-utils';
import type { GeneratedDocFile } from '../docs-utils';
import {
  getScalarFields,
  getTableNames,
  getPrimaryKeyInfo,
  lcFirst,
  fieldTypeToTs,
} from '../utils';

export function generateOrmReadme(
  tables: Table[],
  customOperations: Operation[],
  registry?: TypeRegistry,
): GeneratedDocFile {
  const lines: string[] = [];

  lines.push(...getReadmeHeader('ORM Client'));
  lines.push('## Setup');
  lines.push('');
  lines.push('```typescript');
  lines.push("import { createClient } from './orm';");
  lines.push('');
  lines.push('const db = createClient({');
  lines.push("  endpoint: 'https://api.example.com/graphql',");
  lines.push("  headers: { Authorization: 'Bearer <token>' },");
  lines.push('});');
  lines.push('```');
  lines.push('');

  lines.push('## Models');
  lines.push('');
  lines.push('| Model | Operations |');
  lines.push('|-------|------------|');
  for (const table of tables) {
    const { singularName } = getTableNames(table);
    lines.push(
      `| \`${singularName}\` | findMany, findOne, create, update, delete |`,
    );
  }
  lines.push('');

  if (tables.length > 0) {
    lines.push('## Table Operations');
    lines.push('');
    for (const table of tables) {
      const { singularName } = getTableNames(table);
      const pk = getPrimaryKeyInfo(table)[0];
      const scalarFields = getScalarFields(table);
      const editableFields = getEditableFields(table);

      lines.push(`### \`db.${singularName}\``);
      lines.push('');
      lines.push(`CRUD operations for ${table.name} records.`);
      lines.push('');
      lines.push('**Fields:**');
      lines.push('');
      lines.push('| Field | Type | Editable |');
      lines.push('|-------|------|----------|');
      for (const f of scalarFields) {
        const editable = editableFields.some((ef) => ef.name === f.name);
        lines.push(
          `| \`${f.name}\` | ${f.type.gqlType} | ${editable ? 'Yes' : 'No'} |`,
        );
      }
      lines.push('');

      lines.push('**Operations:**');
      lines.push('');
      lines.push('```typescript');
      lines.push(`// List all ${singularName} records`);
      lines.push(
        `const items = await db.${singularName}.findMany({ select: { ${scalarFields.map((f) => `${f.name}: true`).join(', ')} } }).execute();`,
      );
      lines.push('');
      lines.push(`// Get one by ${pk.name}`);
      lines.push(
        `const item = await db.${singularName}.findOne({ ${pk.name}: ${pkPlaceholder(pk)}, select: { ${scalarFields.map((f) => `${f.name}: true`).join(', ')} } }).execute();`,
      );
      lines.push('');
      lines.push(`// Create`);
      lines.push(
        `const created = await db.${singularName}.create({ data: { ${editableFields.map((f) => `${f.name}: ${fieldPlaceholder(f)}`).join(', ')} }, select: { ${pk.name}: true } }).execute();`,
      );
      lines.push('');
      lines.push(`// Update`);
      lines.push(
        `const updated = await db.${singularName}.update({ where: { ${pk.name}: ${pkPlaceholder(pk)} }, data: { ${editableFields[0]?.name || 'field'}: ${editableFields[0] ? fieldPlaceholder(editableFields[0]) : "'<String>'"} }, select: { ${pk.name}: true } }).execute();`,
      );
      lines.push('');
      lines.push(`// Delete`);
      lines.push(
        `const deleted = await db.${singularName}.delete({ where: { ${pk.name}: ${pkPlaceholder(pk)} } }).execute();`,
      );
      lines.push('```');
      lines.push('');
      const ormSpecialGroups = categorizeSpecialFields(table);
      lines.push(...buildSpecialFieldsMarkdown(ormSpecialGroups));
    }
  }

  if (customOperations.length > 0) {
    lines.push('## Custom Operations');
    lines.push('');
    for (const op of customOperations) {
      const accessor = op.kind === 'query' ? 'query' : 'mutation';
      lines.push(`### \`db.${accessor}.${op.name}\``);
      lines.push('');
      lines.push(op.description || op.name);
      lines.push('');
      lines.push(`- **Type:** ${op.kind}`);
      if (op.args.length > 0) {
        lines.push('- **Arguments:**');
        lines.push('');
        lines.push('  | Argument | Type |');
        lines.push('  |----------|------|');
        for (const arg of op.args) {
          lines.push(`  | \`${arg.name}\` | ${formatArgType(arg)} |`);
        }
        lines.push('');
        lines.push('```typescript');
        lines.push(
          `const result = await db.${accessor}.${op.name}({ ${op.args.map((a) => `${a.name}: ${argPlaceholder(a, registry)}`).join(', ')} }).execute();`,
        );
        lines.push('```');
      } else {
        lines.push('- **Arguments:** none');
        lines.push('');
        lines.push('```typescript');
        lines.push(
          `const result = await db.${accessor}.${op.name}().execute();`,
        );
        lines.push('```');
      }
      lines.push('');
    }
  }

  lines.push(...getReadmeFooter());

  return {
    fileName: 'README.md',
    content: lines.join('\n'),
  };
}

export function generateOrmAgentsDocs(
  tables: Table[],
  customOperations: Operation[],
): GeneratedDocFile {
  const lines: string[] = [];
  const tableCount = tables.length;
  const customOpCount = customOperations.length;

  lines.push('# ORM Client');
  lines.push('');
  lines.push('<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->');
  lines.push('');

  lines.push('## Stack');
  lines.push('');
  lines.push('- Prisma-like ORM client for a GraphQL API (TypeScript)');
  lines.push(`- ${tableCount} model${tableCount !== 1 ? 's' : ''}${customOpCount > 0 ? `, ${customOpCount} custom operation${customOpCount !== 1 ? 's' : ''}` : ''}`);
  lines.push('- All methods return a QueryBuilder; call `.execute()` to run, or `.unwrap()` to throw on error');
  lines.push('');

  lines.push('## Quick Start');
  lines.push('');
  lines.push('```typescript');
  lines.push("import { createClient } from './orm';");
  lines.push('');
  lines.push('const db = createClient({');
  lines.push("  endpoint: 'https://api.example.com/graphql',");
  lines.push("  headers: { Authorization: 'Bearer <token>' },");
  lines.push('});');
  lines.push('```');
  lines.push('');

  lines.push('## Error Handling');
  lines.push('');
  lines.push('> **CRITICAL:** `.execute()` returns `{ ok, data, errors }` — it does **NOT** throw.');
  lines.push('> A bare `try/catch` around `.execute()` will silently swallow errors.');
  lines.push('');
  lines.push('```typescript');
  lines.push('// WRONG — errors are silently lost:');
  lines.push('try { const r = await db.model.findMany({...}).execute(); } catch (e) { /* never runs */ }');
  lines.push('');
  lines.push('// RIGHT — .execute().unwrap() throws GraphQLRequestError on failure:');
  lines.push('const data = await db.model.findMany({...}).execute().unwrap();');
  lines.push('');
  lines.push('// RIGHT — check .ok for control flow:');
  lines.push('const result = await db.model.findMany({...}).execute();');
  lines.push('if (!result.ok) { console.error(result.errors); return; }');
  lines.push('return result.data;');
  lines.push('```');
  lines.push('');
  lines.push('Available helpers (chain after `.execute()`):');
  lines.push('- `.execute().unwrap()` — throws on error, returns typed data');
  lines.push('- `.execute().unwrapOr(default)` — returns default value on error');
  lines.push('- `.execute().unwrapOrElse(fn)` — calls callback with errors on failure');
  lines.push('');

  lines.push('## Resources');
  lines.push('');
  lines.push(`- **Full API reference:** [README.md](./README.md) — model docs for all ${tableCount} tables`);
  lines.push('- **Schema types:** [types.ts](./types.ts)');
  lines.push('- **ORM client:** [orm.ts](./orm.ts)');
  lines.push('');

  lines.push('## Conventions');
  lines.push('');
  lines.push('- Access models via `db.<ModelName>` (e.g. `db.User`)');
  lines.push('- CRUD methods: `findMany`, `findOne`, `create`, `update`, `delete`');
  lines.push('- Chain `.execute().unwrap()` to run and throw on error, or `.execute()` alone for discriminated union result');
  lines.push('- Custom operations via `db.query.<name>` or `db.mutation.<name>`');
  lines.push('');

  lines.push('## Boundaries');
  lines.push('');
  lines.push('All files in this directory are generated. Do not edit manually.');
  lines.push('');

  return {
    fileName: 'AGENTS.md',
    content: lines.join('\n'),
  };
}

export function generateOrmSkills(
  tables: Table[],
  customOperations: Operation[],
  targetName: string,
  registry?: TypeRegistry,
): GeneratedDocFile[] {
  const files: GeneratedDocFile[] = [];
  const skillName = `orm-${targetName}`;
  const referenceNames: string[] = [];

  // Generate reference files for each table
  for (const table of tables) {
    const { singularName } = getTableNames(table);
    const pk = getPrimaryKeyInfo(table)[0];
    const editableFields = getEditableFields(table);

    const modelName = lcFirst(singularName);
    const refName = toKebabCase(singularName);
    referenceNames.push(refName);

    const ormSkillSpecialGroups = categorizeSpecialFields(table);
    const ormSkillBaseDesc = table.description || `ORM operations for ${table.name} records`;
    const ormSkillSpecialDesc = ormSkillSpecialGroups.length > 0
      ? ormSkillBaseDesc + '\n\n' +
        ormSkillSpecialGroups.map((g) => `**${g.label}:** ${g.fields.map((f) => `\`${f.name}\``).join(', ')}\n${g.description}`).join('\n\n')
      : ormSkillBaseDesc;

    files.push({
      fileName: `${skillName}/references/${refName}.md`,
      content: buildSkillReference({
        title: singularName,
        description: ormSkillSpecialDesc,
        language: 'typescript',
        usage: [
          `db.${modelName}.findMany({ select: { id: true } }).execute()`,
          `db.${modelName}.findOne({ ${pk.name}: ${pkPlaceholder(pk)}, select: { id: true } }).execute()`,
          `db.${modelName}.create({ data: { ${editableFields.map((f) => `${f.name}: ${fieldPlaceholder(f)}`).join(', ')} }, select: { id: true } }).execute()`,
          `db.${modelName}.update({ where: { ${pk.name}: ${pkPlaceholder(pk)} }, data: { ${editableFields[0]?.name || 'field'}: ${editableFields[0] ? fieldPlaceholder(editableFields[0]) : "'<String>'"} }, select: { id: true } }).execute()`,
          `db.${modelName}.delete({ where: { ${pk.name}: ${pkPlaceholder(pk)} } }).execute()`,
        ],
        examples: [
          {
            description: `List all ${singularName} records`,
            code: [
              `const items = await db.${modelName}.findMany({`,
              `  select: { ${pk.name}: true, ${editableFields[0]?.name || 'name'}: true }`,
              '}).execute();',
            ],
          },
          {
            description: `Create a ${singularName}`,
            code: [
              `const item = await db.${modelName}.create({`,
              `  data: { ${editableFields.map((f) => `${f.name}: ${fieldPlaceholder(f)}`).join(', ')} },`,
              `  select: { ${pk.name}: true }`,
              '}).execute();',
            ],
          },
        ],
      }),
    });
  }

  // Generate reference files for custom operations
  for (const op of customOperations) {
    const accessor = op.kind === 'query' ? 'query' : 'mutation';
    const callArgs =
      op.args.length > 0
        ? `{ ${op.args.map((a) => `${a.name}: ${argPlaceholder(a, registry)}`).join(', ')} }`
        : '';

    const refName = toKebabCase(op.name);
    referenceNames.push(refName);

    files.push({
      fileName: `${skillName}/references/${refName}.md`,
      content: buildSkillReference({
        title: op.name,
        description: op.description || `Execute the ${op.name} ${op.kind}`,
        language: 'typescript',
        usage: [`db.${accessor}.${op.name}(${callArgs}).execute()`],
        examples: [
          {
            description: `Run ${op.name}`,
            code: [`const result = await db.${accessor}.${op.name}(${callArgs}).execute();`],
          },
        ],
      }),
    });
  }

  // Generate the overview SKILL.md
  const tableNames = tables.map((t) => lcFirst(getTableNames(t).singularName));
  files.push({
    fileName: `${skillName}/SKILL.md`,
    content: buildSkillFile(
      {
        name: skillName,
        description: `ORM client for the ${targetName} API — provides typed CRUD operations for ${tables.length} tables and ${customOperations.length} custom operations`,
        language: 'typescript',
        usage: [
          `// Import the ORM client`,
          `import { db } from './orm';`,
          '',
          `// Available models: ${tableNames.slice(0, 8).join(', ')}${tableNames.length > 8 ? ', ...' : ''}`,
          `db.<model>.findMany({ select: { id: true } }).execute()`,
          `db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()`,
          `db.<model>.create({ data: { ... }, select: { id: true } }).execute()`,
          `db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()`,
          `db.<model>.delete({ where: { id: '<UUID>' } }).execute()`,
        ],
        examples: [
          {
            description: 'Query records',
            code: [
              `const items = await db.${tableNames[0] || 'model'}.findMany({`,
              '  select: { id: true }',
              '}).execute();',
            ],
          },
        ],
      },
      referenceNames,
    ),
  });

  return files;
}
