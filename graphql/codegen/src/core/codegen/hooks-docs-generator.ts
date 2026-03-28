import { toKebabCase } from 'inflekt';

import type { Operation, Table, TypeRegistry } from '../../types/schema';
import {
  buildSkillFile,
  buildSkillReference,
  formatArgType,
  fieldPlaceholder,
  pkPlaceholder,
  argPlaceholder,
  getReadmeHeader,
  getReadmeFooter,
  gqlTypeToJsonSchemaType,
} from './docs-utils';
import type { GeneratedDocFile } from './docs-utils';
import {
  getTableNames,
  getScalarFields,
  getPrimaryKeyInfo,
  getListQueryHookName,
  getSingleQueryHookName,
  getCreateMutationHookName,
  getUpdateMutationHookName,
  getDeleteMutationHookName,
  hasValidPrimaryKey,
  ucFirst,
  lcFirst,
  fieldTypeToTs,
} from './utils';

function getCustomHookName(op: Operation): string {
  if (op.kind === 'query') {
    return `use${ucFirst(op.name)}Query`;
  }
  return `use${ucFirst(op.name)}Mutation`;
}

export function generateHooksReadme(
  tables: Table[],
  customOperations: Operation[],
  registry?: TypeRegistry,
): GeneratedDocFile {
  const lines: string[] = [];

  lines.push(...getReadmeHeader('React Query Hooks'));
  lines.push('## Setup');
  lines.push('');
  lines.push('```typescript');
  lines.push("import { QueryClient, QueryClientProvider } from '@tanstack/react-query';");
  lines.push("import { configure } from './hooks';");
  lines.push('');
  lines.push('configure({');
  lines.push("  endpoint: 'https://api.example.com/graphql',");
  lines.push("  headers: { Authorization: 'Bearer <token>' },");
  lines.push('});');
  lines.push('');
  lines.push('const queryClient = new QueryClient();');
  lines.push('');
  lines.push('function App() {');
  lines.push('  return (');
  lines.push('    <QueryClientProvider client={queryClient}>');
  lines.push('      <YourApp />');
  lines.push('    </QueryClientProvider>');
  lines.push('  );');
  lines.push('}');
  lines.push('```');
  lines.push('');

  lines.push('## Hooks');
  lines.push('');
  lines.push('| Hook | Type | Description |');
  lines.push('|------|------|-------------|');
  for (const table of tables) {
    const { singularName, pluralName } = getTableNames(table);
    lines.push(
      `| \`${getListQueryHookName(table)}\` | Query | ${table.description || `List all ${pluralName}`} |`,
    );
    if (hasValidPrimaryKey(table)) {
      lines.push(
        `| \`${getSingleQueryHookName(table)}\` | Query | ${table.description || `Get one ${singularName}`} |`,
      );
    }
    lines.push(
      `| \`${getCreateMutationHookName(table)}\` | Mutation | ${table.description || `Create a ${singularName}`} |`,
    );
    if (hasValidPrimaryKey(table)) {
      lines.push(
        `| \`${getUpdateMutationHookName(table)}\` | Mutation | ${table.description || `Update a ${singularName}`} |`,
      );
      lines.push(
        `| \`${getDeleteMutationHookName(table)}\` | Mutation | ${table.description || `Delete a ${singularName}`} |`,
      );
    }
  }
  for (const op of customOperations) {
    lines.push(
      `| \`${getCustomHookName(op)}\` | ${ucFirst(op.kind)} | ${op.description || op.name} |`,
    );
  }
  lines.push('');

  if (tables.length > 0) {
    lines.push('## Table Hooks');
    lines.push('');
    for (const table of tables) {
      const { singularName, pluralName } = getTableNames(table);
      const pk = getPrimaryKeyInfo(table)[0];
      const scalarFields = getScalarFields(table);

      lines.push(`### ${table.name}`);
      lines.push('');

      lines.push('```typescript');
      lines.push(`// List all ${pluralName}`);
      lines.push(
        `const { data, isLoading } = ${getListQueryHookName(table)}({`,
      );
      lines.push(
        `  selection: { fields: { ${scalarFields.map((f) => `${f.name}: true`).join(', ')} } },`,
      );
      lines.push('});');
      lines.push('');

      if (hasValidPrimaryKey(table)) {
        lines.push(`// Get one ${singularName}`);
        lines.push(
          `const { data: item } = ${getSingleQueryHookName(table)}({`,
        );
        lines.push(`  ${pk.name}: ${pkPlaceholder(pk)},`);
        lines.push(
          `  selection: { fields: { ${scalarFields.map((f) => `${f.name}: true`).join(', ')} } },`,
        );
        lines.push('});');
        lines.push('');
      }

      lines.push(`// Create a ${singularName}`);
      lines.push(
        `const { mutate: create } = ${getCreateMutationHookName(table)}({`,
      );
      lines.push(
        `  selection: { fields: { ${pk.name}: true } },`,
      );
      lines.push('});');
      lines.push(
        `create({ ${scalarFields.filter((f) => f.name !== pk.name && f.name !== 'nodeId' && f.name !== 'createdAt' && f.name !== 'updatedAt').map((f) => `${f.name}: ${fieldPlaceholder(f)}`).join(', ')} });`,
      );
      lines.push('```');
      lines.push('');
    }
  }

  if (customOperations.length > 0) {
    lines.push('## Custom Operation Hooks');
    lines.push('');
    for (const op of customOperations) {
      const hookName = getCustomHookName(op);
      lines.push(`### \`${hookName}\``);
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
      } else {
        lines.push('- **Arguments:** none');
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

export function generateHooksAgentsDocs(
  tables: Table[],
  customOperations: Operation[],
): GeneratedDocFile {
  const lines: string[] = [];
  const tableCount = tables.length;
  const customOpCount = customOperations.length;

  lines.push('# React Query Hooks');
  lines.push('');
  lines.push('<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->');
  lines.push('');

  lines.push('## Stack');
  lines.push('');
  lines.push('- React Query hooks wrapping ORM operations (TypeScript)');
  lines.push(`- ${tableCount} table${tableCount !== 1 ? 's' : ''}${customOpCount > 0 ? `, ${customOpCount} custom operation${customOpCount !== 1 ? 's' : ''}` : ''}`);
  lines.push('- Query hooks return `UseQueryResult`, mutation hooks return `UseMutationResult`');
  lines.push('');

  lines.push('## Quick Start');
  lines.push('');
  lines.push('```typescript');
  lines.push("import { configure } from './hooks';");
  lines.push("import { QueryClient, QueryClientProvider } from '@tanstack/react-query';");
  lines.push('');
  lines.push("configure({ endpoint: 'https://api.example.com/graphql' });");
  lines.push('const queryClient = new QueryClient();');
  lines.push('// Wrap app in <QueryClientProvider client={queryClient}>');
  lines.push('```');
  lines.push('');

  lines.push('## Resources');
  lines.push('');
  lines.push(`- **Full API reference:** [README.md](./README.md) — hook docs for all ${tableCount} tables`);
  lines.push('- **Schema types:** [types.ts](./types.ts)');
  lines.push('- **Hooks module:** [hooks.ts](./hooks.ts)');
  lines.push('');

  lines.push('## Conventions');
  lines.push('');
  lines.push('- Query hooks: `use<PluralName>Query`, `use<SingularName>Query`');
  lines.push('- Mutation hooks: `useCreate<Name>Mutation`, `useUpdate<Name>Mutation`, `useDelete<Name>Mutation`');
  lines.push('- All hooks accept a `selection` parameter to pick fields');
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

export function generateHooksSkills(
  tables: Table[],
  customOperations: Operation[],
  targetName: string,
  registry?: TypeRegistry,
): GeneratedDocFile[] {
  const files: GeneratedDocFile[] = [];
  const skillName = `hooks-${targetName}`;
  const referenceNames: string[] = [];

  // Generate reference files for each table
  for (const table of tables) {
    const { singularName, pluralName } = getTableNames(table);
    const pk = getPrimaryKeyInfo(table)[0];
    const scalarFields = getScalarFields(table);
    const selectFields = scalarFields
      .map((f) => `${f.name}: true`)
      .join(', ');

    const refName = toKebabCase(singularName);
    referenceNames.push(refName);

    files.push({
      fileName: `${skillName}/references/${refName}.md`,
      content: buildSkillReference({
        title: singularName,
        description: table.description || `React Query hooks for ${table.name} data operations`,
        language: 'typescript',
        usage: [
          `${getListQueryHookName(table)}({ selection: { fields: { ${selectFields} } } })`,
          ...(hasValidPrimaryKey(table)
            ? [
                `${getSingleQueryHookName(table)}({ ${pk.name}: ${pkPlaceholder(pk)}, selection: { fields: { ${selectFields} } } })`,
              ]
            : []),
          `${getCreateMutationHookName(table)}({ selection: { fields: { ${pk.name}: true } } })`,
          ...(hasValidPrimaryKey(table)
            ? [
                `${getUpdateMutationHookName(table)}({ selection: { fields: { ${pk.name}: true } } })`,
                `${getDeleteMutationHookName(table)}({})`,
              ]
            : []),
        ],
        examples: [
          {
            description: `List all ${pluralName}`,
            code: [
              `const { data, isLoading } = ${getListQueryHookName(table)}({`,
              `  selection: { fields: { ${selectFields} } },`,
              '});',
            ],
          },
          {
            description: `Create a ${singularName}`,
            code: [
              `const { mutate } = ${getCreateMutationHookName(table)}({`,
              `  selection: { fields: { ${pk.name}: true } },`,
              '});',
              `mutate({ ${scalarFields.filter((f) => f.name !== pk.name && f.name !== 'nodeId' && f.name !== 'createdAt' && f.name !== 'updatedAt').map((f) => `${f.name}: ${fieldPlaceholder(f)}`).join(', ')} });`,
            ],
          },
        ],
      }),
    });
  }

  // Generate reference files for custom operations
  for (const op of customOperations) {
    const hookName = getCustomHookName(op);
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
        description:
          op.description ||
          `React Query ${op.kind} hook for ${op.name}`,
        language: 'typescript',
        usage: [
          op.kind === 'mutation'
            ? `const { mutate } = ${hookName}(); mutate(${callArgs});`
            : `${hookName}(${callArgs})`,
        ],
        examples: [
          {
            description: `Use ${hookName}`,
            code:
              op.kind === 'mutation'
                ? [
                    `const { mutate, isLoading } = ${hookName}();`,
                    ...(callArgs
                      ? [`mutate(${callArgs});`]
                      : ['mutate();']),
                  ]
                : [
                    `const { data, isLoading } = ${hookName}(${callArgs});`,
                  ],
          },
        ],
      }),
    });
  }

  // Generate the overview SKILL.md
  const hookExamples = tables.slice(0, 3).map((t) => getListQueryHookName(t));
  files.push({
    fileName: `${skillName}/SKILL.md`,
    content: buildSkillFile(
      {
        name: skillName,
        description: `React Query hooks for the ${targetName} API — provides typed query and mutation hooks for ${tables.length} tables and ${customOperations.length} custom operations`,
        language: 'typescript',
        usage: [
          `// Import hooks`,
          `import { ${hookExamples[0] || 'useModelQuery'} } from './hooks';`,
          '',
          `// Query hooks: use<Model>Query, use<Model>sQuery`,
          `// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation`,
          '',
          `const { data, isLoading } = ${hookExamples[0] || 'useModelQuery'}({`,
          `  selection: { fields: { id: true } },`,
          `});`,
        ],
        examples: [
          {
            description: 'Query records',
            code: [
              `const { data, isLoading } = ${hookExamples[0] || 'useModelQuery'}({`,
              '  selection: { fields: { id: true } },',
              '});',
            ],
          },
        ],
      },
      referenceNames,
    ),
  });

  return files;
}
