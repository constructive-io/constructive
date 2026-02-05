/**
 * Model class generator for ORM client (Babel AST-based)
 *
 * Generates per-table model classes with findMany, findFirst, create, update, delete methods.
 */
import * as t from '@babel/types';

import type { CleanTable } from '../../../types/schema';
import { asConst, generateCode } from '../babel-ast';
import {
  getDefaultSelectFieldName,
  getFilterTypeName,
  getGeneratedFileHeader,
  getOrderByTypeName,
  getPrimaryKeyInfo,
  getTableNames,
  hasValidPrimaryKey,
  lcFirst
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
        t.objectProperty(t.identifier('variables'), t.identifier('variables'), false, true)
      ]),
      t.callExpression(t.identifier(builderFn), args)
    )
  ]);

  const returnStmt = t.returnStatement(
    t.newExpression(t.identifier('QueryBuilder'), [
      t.objectExpression([
        t.objectProperty(t.identifier('client'), t.memberExpression(t.thisExpression(), t.identifier('client'))),
        t.objectProperty(t.identifier('operation'), t.stringLiteral(operation)),
        t.objectProperty(t.identifier('operationName'), t.stringLiteral(typeName)),
        t.objectProperty(t.identifier('fieldName'), t.stringLiteral(fieldName)),
        t.objectProperty(t.identifier('document'), t.identifier('document'), false, true),
        t.objectProperty(t.identifier('variables'), t.identifier('variables'), false, true)
      ])
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

function createConstTypeParam(
  constraintTypeName: string,
  defaultType?: t.TSType
): t.TSTypeParameterDeclaration {
  const param = t.tsTypeParameter(
    t.tsTypeReference(t.identifier(constraintTypeName)),
    defaultType ?? null,
    'S'
  );
  (param as any).const = true;
  return t.tsTypeParameterDeclaration([param]);
}

function tsTypeFromPrimitive(typeName: string): t.TSType {
  if (typeName === 'string') return t.tsStringKeyword();
  if (typeName === 'number') return t.tsNumberKeyword();
  if (typeName === 'boolean') return t.tsBooleanKeyword();
  return t.tsTypeReference(t.identifier(typeName));
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

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];
  const pkFieldTsType = tsTypeFromPrimitive(pkField.tsType);
  const defaultSelectIdent = t.identifier('defaultSelect');
  const defaultSelectFieldName = getDefaultSelectFieldName(table);

  const pluralQueryName = table.query?.all ?? pluralName;
  const createMutationName = table.query?.create ?? `create${typeName}`;
  const updateMutationName = table.query?.update;
  const deleteMutationName = table.query?.delete;

  const statements: t.Statement[] = [];

  statements.push(createImportDeclaration('../client', ['OrmClient']));
  statements.push(createImportDeclaration('../query-builder', [
    'QueryBuilder', 'buildFindManyDocument', 'buildFindFirstDocument', 'buildFindOneDocument',
    'buildCreateDocument', 'buildUpdateByPkDocument', 'buildDeleteByPkDocument'
  ]));
  statements.push(createImportDeclaration('../select-types', [
    'ConnectionResult', 'FindManyArgs', 'FindFirstArgs', 'CreateArgs',
    'UpdateArgs', 'DeleteArgs', 'InferSelectResult', 'DeepExact'
  ], true));
  statements.push(createImportDeclaration('../input-types', [
    typeName, relationTypeName, selectTypeName, whereTypeName, orderByTypeName,
    createInputTypeName, updateInputTypeName, patchTypeName
  ], true));

  // Default select (ensures valid GraphQL selection + sound TS return types)
  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        defaultSelectIdent,
        asConst(
          t.objectExpression([
            t.objectProperty(t.identifier(defaultSelectFieldName), t.booleanLiteral(true))
          ])
        )
      )
    ])
  );

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
        t.tsTypeReference(t.identifier(selectTypeName))
      ])),
      t.tsTypeReference(t.identifier(whereTypeName)),
      t.tsTypeReference(t.identifier(orderByTypeName))
    ]))
  );
  const findManyReturnType = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('QueryBuilder'), t.tsTypeParameterInstantiation([
      t.tsTypeLiteral([
        t.tsPropertySignature(t.identifier(pluralQueryName), t.tsTypeAnnotation(
          t.tsTypeReference(t.identifier('ConnectionResult'), t.tsTypeParameterInstantiation([
            t.tsTypeReference(t.identifier('InferSelectResult'), t.tsTypeParameterInstantiation([
              t.tsTypeReference(t.identifier(relationTypeName)),
              t.tsTypeReference(t.identifier('S'))
            ]))
          ]))
        ))
      ])
    ]))
  );
  const findManySelectExpr = t.logicalExpression(
    '??',
    t.optionalMemberExpression(t.identifier('args'), t.identifier('select'), false, true),
    defaultSelectIdent
  );
  const findManyArgs = [
    t.stringLiteral(typeName),
    t.stringLiteral(pluralQueryName),
    findManySelectExpr,
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
      t.objectProperty(t.identifier('offset'), t.optionalMemberExpression(t.identifier('args'), t.identifier('offset'), false, true))
    ]),
    t.stringLiteral(whereTypeName),
    t.stringLiteral(orderByTypeName)
  ];
  classBody.push(createClassMethod('findMany', createConstTypeParam(selectTypeName, t.tsTypeQuery(defaultSelectIdent)), [findManyParam], findManyReturnType,
    buildMethodBody('buildFindManyDocument', findManyArgs, 'query', typeName, pluralQueryName)));

  // findFirst method
  const findFirstParam = t.identifier('args');
  findFirstParam.optional = true;
  findFirstParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('FindFirstArgs'), t.tsTypeParameterInstantiation([
      t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier('S')),
        t.tsTypeReference(t.identifier(selectTypeName))
      ])),
      t.tsTypeReference(t.identifier(whereTypeName))
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
                t.tsTypeReference(t.identifier('S'))
              ])))
            ))
          ])
        ))
      ])
    ]))
  );
  const findFirstSelectExpr = t.logicalExpression(
    '??',
    t.optionalMemberExpression(t.identifier('args'), t.identifier('select'), false, true),
    defaultSelectIdent
  );
  const findFirstArgs = [
    t.stringLiteral(typeName),
    t.stringLiteral(pluralQueryName),
    findFirstSelectExpr,
    t.objectExpression([
      t.objectProperty(t.identifier('where'), t.optionalMemberExpression(t.identifier('args'), t.identifier('where'), false, true))
    ]),
    t.stringLiteral(whereTypeName)
  ];
  classBody.push(createClassMethod('findFirst', createConstTypeParam(selectTypeName, t.tsTypeQuery(defaultSelectIdent)), [findFirstParam], findFirstReturnType,
    buildMethodBody('buildFindFirstDocument', findFirstArgs, 'query', typeName, pluralQueryName)));

  // findOne method (only if table has valid PK and singular query)
  const singleQueryName = table.query?.one;
  if (singleQueryName && hasValidPrimaryKey(table)) {
    const pkGqlType = pkField.gqlType.replace(/!/g, '') + '!';

    const findOneParam = t.identifier('args');
    findOneParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeLiteral([
        (() => {
          const prop = t.tsPropertySignature(
            t.identifier(pkField.name),
            t.tsTypeAnnotation(pkFieldTsType)
          );
          prop.optional = false;
          return prop;
        })(),
        (() => {
          const prop = t.tsPropertySignature(
            t.identifier('select'),
            t.tsTypeAnnotation(
              t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
                t.tsTypeReference(t.identifier('S')),
                t.tsTypeReference(t.identifier(selectTypeName))
              ]))
            )
          );
          prop.optional = true;
          return prop;
        })()
      ])
    );
    const findOneReturnType = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('QueryBuilder'), t.tsTypeParameterInstantiation([
        t.tsTypeLiteral([
          t.tsPropertySignature(t.identifier(singleQueryName), t.tsTypeAnnotation(
            t.tsUnionType([
              t.tsTypeReference(t.identifier('InferSelectResult'), t.tsTypeParameterInstantiation([
                t.tsTypeReference(t.identifier(relationTypeName)),
                t.tsTypeReference(t.identifier('S'))
              ])),
              t.tsNullKeyword()
            ])
          ))
        ])
      ]))
    );
    const findOneSelectExpr = t.logicalExpression(
      '??',
      t.memberExpression(t.identifier('args'), t.identifier('select')),
      defaultSelectIdent
    );
    const findOneArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(singleQueryName),
      t.memberExpression(t.identifier('args'), t.identifier(pkField.name)),
      findOneSelectExpr,
      t.stringLiteral(pkField.name),
      t.stringLiteral(pkGqlType)
    ];
    classBody.push(createClassMethod('findOne', createConstTypeParam(selectTypeName, t.tsTypeQuery(defaultSelectIdent)), [findOneParam], findOneReturnType,
      buildMethodBody('buildFindOneDocument', findOneArgs, 'query', typeName, singleQueryName)));
  }

  // create method
  const createParam = t.identifier('args');
  createParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CreateArgs'), t.tsTypeParameterInstantiation([
      t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier('S')),
        t.tsTypeReference(t.identifier(selectTypeName))
      ])),
      t.tsIndexedAccessType(t.tsTypeReference(t.identifier(createInputTypeName)), t.tsLiteralType(t.stringLiteral(singularName)))
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
                t.tsTypeReference(t.identifier('S'))
              ]))
            ))
          ])
        ))
      ])
    ]))
  );
  const createSelectExpr = t.logicalExpression(
    '??',
    t.memberExpression(t.identifier('args'), t.identifier('select')),
    defaultSelectIdent
  );
  const createArgs = [
    t.stringLiteral(typeName),
    t.stringLiteral(createMutationName),
    t.stringLiteral(entityLower),
    createSelectExpr,
    t.memberExpression(t.identifier('args'), t.identifier('data')),
    t.stringLiteral(createInputTypeName)
  ];
  classBody.push(createClassMethod('create', createConstTypeParam(selectTypeName, t.tsTypeQuery(defaultSelectIdent)), [createParam], createReturnType,
    buildMethodBody('buildCreateDocument', createArgs, 'mutation', typeName, createMutationName)));

  // update method (if available)
  if (updateMutationName) {
    const updateParam = t.identifier('args');
    updateParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('UpdateArgs'), t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
          t.tsTypeReference(t.identifier('S')),
          t.tsTypeReference(t.identifier(selectTypeName))
        ])),
        t.tsTypeLiteral([
          (() => {
            const prop = t.tsPropertySignature(t.identifier(pkField.name), t.tsTypeAnnotation(pkFieldTsType));
            prop.optional = false;
            return prop;
          })()
        ]),
        t.tsTypeReference(t.identifier(patchTypeName))
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
                  t.tsTypeReference(t.identifier('S'))
                ]))
              ))
            ])
          ))
        ])
      ]))
    );
    const updateSelectExpr = t.logicalExpression(
      '??',
      t.memberExpression(t.identifier('args'), t.identifier('select')),
      defaultSelectIdent
    );
    const updateArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(updateMutationName),
      t.stringLiteral(entityLower),
      updateSelectExpr,
      t.memberExpression(
        t.memberExpression(t.identifier('args'), t.identifier('where')),
        t.identifier(pkField.name)
      ),
      t.memberExpression(t.identifier('args'), t.identifier('data')),
      t.stringLiteral(updateInputTypeName),
      t.stringLiteral(pkField.name)
    ];
    classBody.push(createClassMethod('update', createConstTypeParam(selectTypeName, t.tsTypeQuery(defaultSelectIdent)), [updateParam], updateReturnType,
      buildMethodBody('buildUpdateByPkDocument', updateArgs, 'mutation', typeName, updateMutationName)));
  }

  // delete method (if available) - supports optional select for returning entity fields
  if (deleteMutationName) {
    const deleteParam = t.identifier('args');
    deleteParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('DeleteArgs'), t.tsTypeParameterInstantiation([
        t.tsTypeLiteral([
          (() => {
            const prop = t.tsPropertySignature(t.identifier(pkField.name), t.tsTypeAnnotation(pkFieldTsType));
            prop.optional = false;
            return prop;
          })()
        ]),
        t.tsTypeReference(t.identifier('DeepExact'), t.tsTypeParameterInstantiation([
          t.tsTypeReference(t.identifier('S')),
          t.tsTypeReference(t.identifier(selectTypeName))
        ]))
      ]))
    );
    const deleteReturnType = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('QueryBuilder'), t.tsTypeParameterInstantiation([
        t.tsTypeLiteral([
          t.tsPropertySignature(t.identifier(deleteMutationName), t.tsTypeAnnotation(
            t.tsTypeLiteral([
              t.tsPropertySignature(t.identifier(entityLower), t.tsTypeAnnotation(
                t.tsTypeReference(t.identifier('InferSelectResult'), t.tsTypeParameterInstantiation([
                  t.tsTypeReference(t.identifier(relationTypeName)),
                  t.tsTypeReference(t.identifier('S'))
                ]))
              ))
            ])
          ))
        ])
      ]))
    );
    const deleteSelectExpr = t.logicalExpression(
      '??',
      t.memberExpression(t.identifier('args'), t.identifier('select')),
      defaultSelectIdent
    );
    const deleteArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(deleteMutationName),
      t.stringLiteral(entityLower),
      t.memberExpression(
        t.memberExpression(t.identifier('args'), t.identifier('where')),
        t.identifier(pkField.name)
      ),
      t.stringLiteral(deleteInputTypeName),
      t.stringLiteral(pkField.name),
      deleteSelectExpr
    ];
    classBody.push(createClassMethod('delete', createConstTypeParam(selectTypeName, t.tsTypeQuery(defaultSelectIdent)), [deleteParam], deleteReturnType,
      buildMethodBody('buildDeleteByPkDocument', deleteArgs, 'mutation', typeName, deleteMutationName)));
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
