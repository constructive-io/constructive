/**
 * Model class generator for ORM client
 *
 * Generates per-table model classes with findMany, findFirst, create, update, delete methods.
 *
 * Example output:
 * ```typescript
 * export class UserModel {
 *   constructor(private client: OrmClient) {}
 *
 *   findMany<S extends UserSelect>(args?: FindManyArgs<S, UserWhereInput, UserOrderBy>) {
 *     return new QueryBuilder<...>({ ... });
 *   }
 *   // ...
 * }
 * ```
 */
import type { CleanTable } from '../../../types/schema';
import {
  createProject,
  createSourceFile,
  getFormattedOutput,
  createFileHeader,
  createImport,
} from '../ts-ast';
import { getTableNames, getOrderByTypeName, getFilterTypeName, lcFirst } from '../utils';

export interface GeneratedModelFile {
  fileName: string;
  content: string;
  modelName: string;
  tableName: string;
}

/**
 * Generate a model class file for a table
 */
export function generateModelFile(
  table: CleanTable,
  _useSharedTypes: boolean
): GeneratedModelFile {
  const project = createProject();
  const { typeName, singularName, pluralName } = getTableNames(table);
  const modelName = `${typeName}Model`;
  // Avoid "index.ts" which clashes with barrel file
  const baseFileName = lcFirst(typeName);
  const fileName = baseFileName === 'index' ? `${baseFileName}Model.ts` : `${baseFileName}.ts`;
  const entityLower = singularName;

  // Type names for this entity - use inflection from table metadata
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const whereTypeName = getFilterTypeName(table);
  const orderByTypeName = getOrderByTypeName(table);
  const createInputTypeName = `Create${typeName}Input`;
  const updateInputTypeName = `Update${typeName}Input`;
  const deleteInputTypeName = `Delete${typeName}Input`;
  const patchTypeName = `${typeName}Patch`;
  const createDataType = `${createInputTypeName}['${singularName}']`;

  // Query names from PostGraphile
  const pluralQueryName = table.query?.all ?? pluralName;
  const createMutationName = table.query?.create ?? `create${typeName}`;
  const updateMutationName = table.query?.update;
  const deleteMutationName = table.query?.delete;

  const sourceFile = createSourceFile(project, fileName);

  // Add file header
  sourceFile.insertText(
    0,
    createFileHeader(`${typeName} model for ORM client`) + '\n\n'
  );

  // Add imports - import types from respective modules
  sourceFile.addImportDeclarations([
    createImport({
      moduleSpecifier: '../client',
      namedImports: ['OrmClient'],
    }),
    createImport({
      moduleSpecifier: '../query-builder',
      namedImports: [
        'QueryBuilder',
        'buildFindManyDocument',
        'buildFindFirstDocument',
        'buildCreateDocument',
        'buildUpdateDocument',
        'buildDeleteDocument',
      ],
    }),
    createImport({
      moduleSpecifier: '../select-types',
      typeOnlyNamedImports: [
        'ConnectionResult',
        'FindManyArgs',
        'FindFirstArgs',
        'CreateArgs',
        'UpdateArgs',
        'DeleteArgs',
        'InferSelectResult',
      ],
    }),
  ]);

  // Build complete set of input-types imports
  // Select types are now centralized in input-types.ts with relations included
  const inputTypeImports = new Set<string>([
    typeName,
    relationTypeName,
    selectTypeName,
    whereTypeName,
    orderByTypeName,
    createInputTypeName,
    updateInputTypeName,
    patchTypeName,
  ]);

  // Add single combined import from input-types
  sourceFile.addImportDeclaration(
    createImport({
      moduleSpecifier: '../input-types',
      typeOnlyNamedImports: Array.from(inputTypeImports),
    })
  );

  // Add Model class
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Model Class');
  sourceFile.addStatements('// ============================================================================\n');

  // Generate the model class
  const classDeclaration = sourceFile.addClass({
    name: modelName,
    isExported: true,
  });

  // Constructor
  classDeclaration.addConstructor({
    parameters: [
      {
        name: 'client',
        type: 'OrmClient',
        scope: 'private' as any,
      },
    ],
  });

  // findMany method - uses const generic for proper literal type inference
  classDeclaration.addMethod({
    name: 'findMany',
    typeParameters: [`const S extends ${selectTypeName}`],
    parameters: [
      {
        name: 'args',
        type: `FindManyArgs<S, ${whereTypeName}, ${orderByTypeName}>`,
        hasQuestionToken: true,
      },
    ],
    returnType: `QueryBuilder<{ ${pluralQueryName}: ConnectionResult<InferSelectResult<${relationTypeName}, S>> }>`,
    statements: `const { document, variables } = buildFindManyDocument(
      '${typeName}',
      '${pluralQueryName}',
      args?.select,
      {
        where: args?.where,
        orderBy: args?.orderBy as string[] | undefined,
        first: args?.first,
        last: args?.last,
        after: args?.after,
        before: args?.before,
        offset: args?.offset,
      },
      '${whereTypeName}'
    );
    return new QueryBuilder({
      client: this.client,
      operation: 'query',
      operationName: '${typeName}',
      fieldName: '${pluralQueryName}',
      document,
      variables,
    });`,
  });

  // findFirst method - uses const generic for proper literal type inference
  classDeclaration.addMethod({
    name: 'findFirst',
    typeParameters: [`const S extends ${selectTypeName}`],
    parameters: [
      {
        name: 'args',
        type: `FindFirstArgs<S, ${whereTypeName}>`,
        hasQuestionToken: true,
      },
    ],
    returnType: `QueryBuilder<{ ${pluralQueryName}: { nodes: InferSelectResult<${relationTypeName}, S>[] } }>`,
    statements: `const { document, variables } = buildFindFirstDocument(
      '${typeName}',
      '${pluralQueryName}',
      args?.select,
      { where: args?.where },
      '${whereTypeName}'
    );
    return new QueryBuilder({
      client: this.client,
      operation: 'query',
      operationName: '${typeName}',
      fieldName: '${pluralQueryName}',
      document,
      variables,
    });`,
  });

  // create method - uses const generic for proper literal type inference
  classDeclaration.addMethod({
    name: 'create',
    typeParameters: [`const S extends ${selectTypeName}`],
    parameters: [
      {
        name: 'args',
        type: `CreateArgs<S, ${createDataType}>`,
      },
    ],
    returnType: `QueryBuilder<{ ${createMutationName}: { ${entityLower}: InferSelectResult<${relationTypeName}, S> } }>`,
    statements: `const { document, variables } = buildCreateDocument(
      '${typeName}',
      '${createMutationName}',
      '${entityLower}',
      args.select,
      args.data,
      '${createInputTypeName}'
    );
    return new QueryBuilder({
      client: this.client,
      operation: 'mutation',
      operationName: '${typeName}',
      fieldName: '${createMutationName}',
      document,
      variables,
    });`,
  });

  // update method (if available) - uses const generic for proper literal type inference
  if (updateMutationName) {
    classDeclaration.addMethod({
      name: 'update',
      typeParameters: [`const S extends ${selectTypeName}`],
      parameters: [
        {
          name: 'args',
          type: `UpdateArgs<S, { id: string }, ${patchTypeName}>`,
        },
      ],
      returnType: `QueryBuilder<{ ${updateMutationName}: { ${entityLower}: InferSelectResult<${relationTypeName}, S> } }>`,
      statements: `const { document, variables } = buildUpdateDocument(
      '${typeName}',
      '${updateMutationName}',
      '${entityLower}',
      args.select,
      args.where,
      args.data,
      '${updateInputTypeName}'
    );
    return new QueryBuilder({
      client: this.client,
      operation: 'mutation',
      operationName: '${typeName}',
      fieldName: '${updateMutationName}',
      document,
      variables,
    });`,
    });
  }

  // delete method (if available)
  if (deleteMutationName) {
    classDeclaration.addMethod({
      name: 'delete',
      parameters: [
        {
          name: 'args',
          type: `DeleteArgs<{ id: string }>`,
        },
      ],
      returnType: `QueryBuilder<{ ${deleteMutationName}: { ${entityLower}: { id: string } } }>`,
      statements: `const { document, variables } = buildDeleteDocument(
      '${typeName}',
      '${deleteMutationName}',
      '${entityLower}',
      args.where,
      '${deleteInputTypeName}'
    );
    return new QueryBuilder({
      client: this.client,
      operation: 'mutation',
      operationName: '${typeName}',
      fieldName: '${deleteMutationName}',
      document,
      variables,
    });`,
    });
  }

  return {
    fileName,
    content: getFormattedOutput(sourceFile),
    modelName,
    tableName: table.name,
  };
}

// Select types with relations are now generated in input-types.ts

/**
 * Generate all model files for a list of tables
 */
export function generateAllModelFiles(
  tables: CleanTable[],
  useSharedTypes: boolean
): GeneratedModelFile[] {
  return tables.map((table) => generateModelFile(table, useSharedTypes));
}
