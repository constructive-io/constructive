/**
 * Model class generator for ORM client (Babel AST-based)
 *
 * Generates per-table model classes with findMany, findFirst, create, update, delete methods.
 */
import type { CleanTable } from '../../../types/schema';
import * as t from '@babel/types';
import { generateCode } from '../babel-ast';
import {
  getTableNames,
  getOrderByTypeName,
  getFilterTypeName,
  lcFirst,
  getGeneratedFileHeader,
} from '../utils';

export interface GeneratedModelFile {
  fileName: string;
  content: string;
  modelName: string;
  tableName: string;
}

function createImportDeclaration(
  moduleSpecifier: string,
  namedImports: string[],
  typeOnly: boolean = false
): t.ImportDeclaration {
  const specifiers = namedImports.map((name) =>
    t.importSpecifier(t.identifier(name), t.identifier(name))
  );
  const decl = t.importDeclaration(specifiers, t.stringLiteral(moduleSpecifier));
  decl.importKind = typeOnly ? 'type' : 'value';
  return decl;
}

function buildMethodBody(
  builderFn: string,
  args: t.Expression[],
  operation: string,
  typeName: string,
  fieldName: string
): t.Statement[] {
  const destructureDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.objectPattern([
        t.objectProperty(t.identifier('document'), t.identifier('document'), false, true),
        t.objectProperty(t.identifier('variables'), t.identifier('variables'), false, true),
      ]),
      t.callExpression(t.identifier(builderFn), args)
    ),
  ]);

  const returnStmt = t.returnStatement(
    t.newExpression(t.identifier('QueryBuilder'), [
      t.objectExpression([
        t.objectProperty(t.identifier('client'), t.memberExpression(t.thisExpression(), t.identifier('client'))),
        t.objectProperty(t.identifier('operation'), t.stringLiteral(operation)),
        t.objectProperty(t.identifier('operationName'), t.stringLiteral(typeName)),
        t.objectProperty(t.identifier('fieldName'), t.stringLiteral(fieldName)),
        t.objectProperty(t.identifier('document'), t.identifier('document'), false, true),
        t.objectProperty(t.identifier('variables'), t.identifier('variables'), false, true),
      ]),
    ])
  );

  return [destructureDecl, returnStmt];
}

function createClassMethod(
  name: string,
  typeParameters: t.TSTypeParameterDeclaration | null,
  params: (t.Identifier | t.TSParameterProperty)[],
  returnType: t.TSTypeAnnotation | null,
  body: t.Statement[]
): t.ClassMethod {
  const method = t.classMethod('method', t.identifier(name), params, t.blockStatement(body));
  method.typeParameters = typeParameters;
  method.returnType = returnType;
  return method;
}

function createConstTypeParam(constraintTypeName: string): t.TSTypeParameterDeclaration {
  const param = t.tsTypeParameter(
    t.tsTypeReference(t.identifier(constraintTypeName)),
    null,
    'S'
  );
  (param as any).const = true;
  return t.tsTypeParameterDeclaration([param]);
}

export function generateModelFile(
  table: CleanTable,
  _useSharedTypes: boolean
): GeneratedModelFile {
  const { typeName, singularName, pluralName } = getTableNames(table);
  const modelName = `${typeName}Model`;
  const baseFileName = lcFirst(typeName);
  const fileName = baseFileName === 'index' ? `${baseFileName}Model.ts` : `${baseFileName}.ts`;
  const entityLower = singularName;

  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const whereTypeName = getFilterTypeName(table);
  const orderByTypeName = getOrderByTypeName(table);
  const createInputTypeName = `Create${typeName}Input`;
  const updateInputTypeName = `Update${typeName}Input`;
  const deleteInputTypeName = `Delete${typeName}Input`;
  const patchTypeName = `${typeName}Patch`;

  const pluralQueryName = table.query?.all ?? pluralName;
  const createMutationName = table.query?.create ?? `create${typeName}`;
  const updateMutationName = table.query?.update;
  const deleteMutationName = table.query?.delete;

  const statements: t.Statement[] = [];

  statements.push(createImportDeclaration('../client', ['OrmClient']));
  statements.push(createImportDeclaration('../query-builder', [
    'QueryBuilder', 'buildFindManyDocument', 'buildFindFirstDocument',
    'buildCreateDocument', 'buildUpdateDocument', 'buildDeleteDocument',
  ]));
  statements.push(createImportDeclaration('../select-types', [
    'ConnectionResult', 'FindManyArgs', 'FindFirstArgs', 'CreateArgs',
    'UpdateArgs', 'DeleteArgs', 'InferSelectResult', 'DeepExact',
  ], true));
  statements.push(createImportDeclaration('../input-types', [
    typeName, relationTypeName, selectTypeName, whereTypeName, orderByTypeName,
    createInputTypeName, updateInputTypeName, patchTypeName,
  ], true));

  const classBody: t.ClassBody['body'] = [];

  // Constructor
  const constructorParam = t.identifier('client');
  constructorParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier('OrmClient')));
  const paramProp = t.tsParameterProperty(constructorParam);
  paramProp.accessibility = 'private';
  classBody.push(t.classMethod('constructor', t.identifier('constructor'), [paramProp], t.blockStatement([])));

  // findMany method
  // Use DeepExact<S, SelectType> to enforce strict field validation
  const findManyParam = t.identifier('args');
  findManyParam.optional = true;
  findManyParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('FindManyArgs'), t.tsTypeParameterInstantiation([
      t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier('S')),
        t.tsTypeReference(t.identifier(selectTypeName)),
      ])),
      t.tsTypeReference(t.identifier(whereTypeName)),
      t.tsTypeReference(t.identifier(orderByTypeName)),
    ]))
  );
  const findManyReturnType = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('QueryBuilder'), t.tsTypeParameterInstantiation([
      t.tsTypeLiteral([
        t.tsPropertySignature(t.identifier(pluralQueryName), t.tsTypeAnnotation(
          t.tsTypeReference(t.identifier('ConnectionResult'), t.tsTypeParameterInstantiation([
            t.tsTypeReference(t.identifier('InferSelectResult'), t.tsTypeParameterInstantiation([
              t.tsTypeReference(t.identifier(relationTypeName)),
              t.tsTypeReference(t.identifier('S')),
            ])),
          ]))
        )),
      ]),
    ]))
  );
  const findManyArgs = [
    t.stringLiteral(typeName),
    t.stringLiteral(pluralQueryName),
    t.optionalMemberExpression(t.identifier('args'), t.identifier('select'), false, true),
    t.objectExpression([
      t.objectProperty(t.identifier('where'), t.optionalMemberExpression(t.identifier('args'), t.identifier('where'), false, true)),
      t.objectProperty(t.identifier('orderBy'), t.tsAsExpression(
        t.optionalMemberExpression(t.identifier('args'), t.identifier('orderBy'), false, true),
        t.tsUnionType([t.tsArrayType(t.tsStringKeyword()), t.tsUndefinedKeyword()])
      )),
      t.objectProperty(t.identifier('first'), t.optionalMemberExpression(t.identifier('args'), t.identifier('first'), false, true)),
      t.objectProperty(t.identifier('last'), t.optionalMemberExpression(t.identifier('args'), t.identifier('last'), false, true)),
      t.objectProperty(t.identifier('after'), t.optionalMemberExpression(t.identifier('args'), t.identifier('after'), false, true)),
      t.objectProperty(t.identifier('before'), t.optionalMemberExpression(t.identifier('args'), t.identifier('before'), false, true)),
      t.objectProperty(t.identifier('offset'), t.optionalMemberExpression(t.identifier('args'), t.identifier('offset'), false, true)),
    ]),
    t.stringLiteral(whereTypeName),
    t.stringLiteral(orderByTypeName),
  ];
  classBody.push(createClassMethod('findMany', createConstTypeParam(selectTypeName), [findManyParam], findManyReturnType,
    buildMethodBody('buildFindManyDocument', findManyArgs, 'query', typeName, pluralQueryName)));

  // findFirst method
  const findFirstParam = t.identifier('args');
  findFirstParam.optional = true;
  findFirstParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('FindFirstArgs'), t.tsTypeParameterInstantiation([
      t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier('S')),
        t.tsTypeReference(t.identifier(selectTypeName)),
      ])),
      t.tsTypeReference(t.identifier(whereTypeName)),
    ]))
  );
  const findFirstReturnType = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('QueryBuilder'), t.tsTypeParameterInstantiation([
      t.tsTypeLiteral([
        t.tsPropertySignature(t.identifier(pluralQueryName), t.tsTypeAnnotation(
          t.tsTypeLiteral([
            t.tsPropertySignature(t.identifier('nodes'), t.tsTypeAnnotation(
              t.tsArrayType(t.tsTypeReference(t.identifier('InferSelectResult'), t.tsTypeParameterInstantiation([
                t.tsTypeReference(t.identifier(relationTypeName)),
                t.tsTypeReference(t.identifier('S')),
              ])))
            )),
          ])
        )),
      ]),
    ]))
  );
  const findFirstArgs = [
    t.stringLiteral(typeName),
    t.stringLiteral(pluralQueryName),
    t.optionalMemberExpression(t.identifier('args'), t.identifier('select'), false, true),
    t.objectExpression([
      t.objectProperty(t.identifier('where'), t.optionalMemberExpression(t.identifier('args'), t.identifier('where'), false, true)),
    ]),
    t.stringLiteral(whereTypeName),
  ];
  classBody.push(createClassMethod('findFirst', createConstTypeParam(selectTypeName), [findFirstParam], findFirstReturnType,
    buildMethodBody('buildFindFirstDocument', findFirstArgs, 'query', typeName, pluralQueryName)));

  // create method
  const createParam = t.identifier('args');
  createParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CreateArgs'), t.tsTypeParameterInstantiation([
      t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier('S')),
        t.tsTypeReference(t.identifier(selectTypeName)),
      ])),
      t.tsIndexedAccessType(t.tsTypeReference(t.identifier(createInputTypeName)), t.tsLiteralType(t.stringLiteral(singularName))),
    ]))
  );
  const createReturnType = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('QueryBuilder'), t.tsTypeParameterInstantiation([
      t.tsTypeLiteral([
        t.tsPropertySignature(t.identifier(createMutationName), t.tsTypeAnnotation(
          t.tsTypeLiteral([
            t.tsPropertySignature(t.identifier(entityLower), t.tsTypeAnnotation(
              t.tsTypeReference(t.identifier('InferSelectResult'), t.tsTypeParameterInstantiation([
                t.tsTypeReference(t.identifier(relationTypeName)),
                t.tsTypeReference(t.identifier('S')),
              ]))
            )),
          ])
        )),
      ]),
    ]))
  );
  const createArgs = [
    t.stringLiteral(typeName),
    t.stringLiteral(createMutationName),
    t.stringLiteral(entityLower),
    t.memberExpression(t.identifier('args'), t.identifier('select')),
    t.memberExpression(t.identifier('args'), t.identifier('data')),
    t.stringLiteral(createInputTypeName),
  ];
  classBody.push(createClassMethod('create', createConstTypeParam(selectTypeName), [createParam], createReturnType,
    buildMethodBody('buildCreateDocument', createArgs, 'mutation', typeName, createMutationName)));

  // update method (if available)
  if (updateMutationName) {
    const updateParam = t.identifier('args');
    updateParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('UpdateArgs'), t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
          t.tsTypeReference(t.identifier('S')),
          t.tsTypeReference(t.identifier(selectTypeName)),
        ])),
        t.tsTypeLiteral([t.tsPropertySignature(t.identifier('id'), t.tsTypeAnnotation(t.tsStringKeyword()))]),
        t.tsTypeReference(t.identifier(patchTypeName)),
      ]))
    );
    const updateReturnType = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('QueryBuilder'), t.tsTypeParameterInstantiation([
        t.tsTypeLiteral([
          t.tsPropertySignature(t.identifier(updateMutationName), t.tsTypeAnnotation(
            t.tsTypeLiteral([
              t.tsPropertySignature(t.identifier(entityLower), t.tsTypeAnnotation(
                t.tsTypeReference(t.identifier('InferSelectResult'), t.tsTypeParameterInstantiation([
                  t.tsTypeReference(t.identifier(relationTypeName)),
                  t.tsTypeReference(t.identifier('S')),
                ]))
              )),
            ])
          )),
        ]),
      ]))
    );
    const updateArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(updateMutationName),
      t.stringLiteral(entityLower),
      t.memberExpression(t.identifier('args'), t.identifier('select')),
      t.memberExpression(t.identifier('args'), t.identifier('where')),
      t.memberExpression(t.identifier('args'), t.identifier('data')),
      t.stringLiteral(updateInputTypeName),
    ];
    classBody.push(createClassMethod('update', createConstTypeParam(selectTypeName), [updateParam], updateReturnType,
      buildMethodBody('buildUpdateDocument', updateArgs, 'mutation', typeName, updateMutationName)));
  }

  // delete method (if available)
  if (deleteMutationName) {
    const deleteParam = t.identifier('args');
    deleteParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('DeleteArgs'), t.tsTypeParameterInstantiation([
        t.tsTypeLiteral([t.tsPropertySignature(t.identifier('id'), t.tsTypeAnnotation(t.tsStringKeyword()))]),
      ]))
    );
    const deleteReturnType = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('QueryBuilder'), t.tsTypeParameterInstantiation([
        t.tsTypeLiteral([
          t.tsPropertySignature(t.identifier(deleteMutationName), t.tsTypeAnnotation(
            t.tsTypeLiteral([
              t.tsPropertySignature(t.identifier(entityLower), t.tsTypeAnnotation(
                t.tsTypeLiteral([t.tsPropertySignature(t.identifier('id'), t.tsTypeAnnotation(t.tsStringKeyword()))])
              )),
            ])
          )),
        ]),
      ]))
    );
    const deleteArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(deleteMutationName),
      t.stringLiteral(entityLower),
      t.memberExpression(t.identifier('args'), t.identifier('where')),
      t.stringLiteral(deleteInputTypeName),
    ];
    classBody.push(createClassMethod('delete', null, [deleteParam], deleteReturnType,
      buildMethodBody('buildDeleteDocument', deleteArgs, 'mutation', typeName, deleteMutationName)));
  }

  const classDecl = t.classDeclaration(t.identifier(modelName), null, t.classBody(classBody));
  statements.push(t.exportNamedDeclaration(classDecl));

  const header = getGeneratedFileHeader(`${typeName} model for ORM client`);
  const code = generateCode(statements);

  return { fileName, content: header + '\n' + code, modelName, tableName: table.name };
}

export function generateAllModelFiles(
  tables: CleanTable[],
  useSharedTypes: boolean
): GeneratedModelFile[] {
  return tables.map((table) => generateModelFile(table, useSharedTypes));
}
