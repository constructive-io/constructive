/**
 * Model class generator for ORM client (Babel AST-based)
 *
 * Generates per-table model classes with findMany, findFirst, create, update, delete methods.
 * Each method uses function overloads for IDE autocompletion of select objects.
 */
import * as t from '@babel/types';

import type { CleanTable } from '../../../types/schema';
import { asConst, generateCode } from '../babel-ast';
import {
  getFilterTypeName,
  getGeneratedFileHeader,
  getOrderByTypeName,
  getPrimaryKeyInfo,
  getSingleRowQueryName,
  getTableNames,
  hasValidPrimaryKey,
  lcFirst,
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
  typeOnly: boolean = false,
): t.ImportDeclaration {
  const specifiers = namedImports.map((name) =>
    t.importSpecifier(t.identifier(name), t.identifier(name)),
  );
  const decl = t.importDeclaration(
    specifiers,
    t.stringLiteral(moduleSpecifier),
  );
  decl.importKind = typeOnly ? 'type' : 'value';
  return decl;
}

function buildMethodBody(
  builderFn: string,
  args: t.Expression[],
  operation: string,
  typeName: string,
  fieldName: string,
  extraProps: t.ObjectProperty[] = [],
): t.Statement[] {
  const destructureDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.objectPattern([
        t.objectProperty(
          t.identifier('document'),
          t.identifier('document'),
          false,
          true,
        ),
        t.objectProperty(
          t.identifier('variables'),
          t.identifier('variables'),
          false,
          true,
        ),
      ]),
      t.callExpression(t.identifier(builderFn), args),
    ),
  ]);

  const returnStmt = t.returnStatement(
    t.newExpression(t.identifier('QueryBuilder'), [
      t.objectExpression([
        t.objectProperty(
          t.identifier('client'),
          t.memberExpression(t.thisExpression(), t.identifier('client')),
        ),
        t.objectProperty(t.identifier('operation'), t.stringLiteral(operation)),
        t.objectProperty(
          t.identifier('operationName'),
          t.stringLiteral(typeName),
        ),
        t.objectProperty(t.identifier('fieldName'), t.stringLiteral(fieldName)),
        t.objectProperty(
          t.identifier('document'),
          t.identifier('document'),
          false,
          true,
        ),
        t.objectProperty(
          t.identifier('variables'),
          t.identifier('variables'),
          false,
          true,
        ),
        ...extraProps,
      ]),
    ]),
  );

  return [destructureDecl, returnStmt];
}

function createClassMethod(
  name: string,
  typeParameters: t.TSTypeParameterDeclaration | null,
  params: (t.Identifier | t.TSParameterProperty)[],
  returnType: t.TSTypeAnnotation | null,
  body: t.Statement[],
): t.ClassMethod {
  const method = t.classMethod(
    'method',
    t.identifier(name),
    params,
    t.blockStatement(body),
  );
  method.typeParameters = typeParameters;
  method.returnType = returnType;
  return method;
}

function createTypeParam(
  constraintTypeName: string,
  defaultType?: t.TSType,
): t.TSTypeParameterDeclaration {
  const param = t.tsTypeParameter(
    t.tsTypeReference(t.identifier(constraintTypeName)),
    defaultType ?? null,
    'S',
  );
  return t.tsTypeParameterDeclaration([param]);
}

function tsTypeFromPrimitive(typeName: string): t.TSType {
  if (typeName === 'string') return t.tsStringKeyword();
  if (typeName === 'number') return t.tsNumberKeyword();
  if (typeName === 'boolean') return t.tsBooleanKeyword();
  return t.tsTypeReference(t.identifier(typeName));
}

/** Build a required `select: S` property for overload signatures */
function requiredSelectProp(): t.TSPropertySignature {
  const prop = t.tsPropertySignature(
    t.identifier('select'),
    t.tsTypeAnnotation(t.tsTypeReference(t.identifier('S'))),
  );
  prop.optional = false;
  return prop;
}

/** Build `StrictSelect<S, XxxSelect>` type reference for overload intersections */
function strictSelectGuard(selectTypeName: string): t.TSType {
  return t.tsTypeReference(
    t.identifier('StrictSelect'),
    t.tsTypeParameterInstantiation([
      t.tsTypeReference(t.identifier('S')),
      t.tsTypeReference(t.identifier(selectTypeName)),
    ]),
  );
}

export function generateModelFile(
  table: CleanTable,
  _useSharedTypes: boolean,
): GeneratedModelFile {
  const { typeName, singularName, pluralName } = getTableNames(table);
  const modelName = `${typeName}Model`;
  const baseFileName = lcFirst(typeName);
  const fileName =
    baseFileName === 'index' ? `${baseFileName}Model.ts` : `${baseFileName}.ts`;
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
  const pluralQueryName = table.query?.all ?? pluralName;
  const singleQueryName = table.query?.one;
  const singleResultFieldName = getSingleRowQueryName(table);
  const createMutationName = table.query?.create ?? `create${typeName}`;
  const updateMutationName = table.query?.update;
  const deleteMutationName = table.query?.delete;

  const statements: t.Statement[] = [];

  statements.push(createImportDeclaration('../client', ['OrmClient']));
  statements.push(
    createImportDeclaration('../query-builder', [
      'QueryBuilder',
      'buildFindManyDocument',
      'buildFindFirstDocument',
      'buildFindOneDocument',
      'buildCreateDocument',
      'buildUpdateByPkDocument',
      'buildDeleteByPkDocument',
    ]),
  );
  statements.push(
    createImportDeclaration(
      '../select-types',
      [
        'ConnectionResult',
        'FindManyArgs',
        'FindFirstArgs',
        'CreateArgs',
        'UpdateArgs',
        'DeleteArgs',
        'InferSelectResult',
        'StrictSelect',
      ],
      true,
    ),
  );
  statements.push(
    createImportDeclaration(
      '../input-types',
      [
        typeName,
        relationTypeName,
        selectTypeName,
        whereTypeName,
        orderByTypeName,
        createInputTypeName,
        updateInputTypeName,
        patchTypeName,
      ],
      true,
    ),
  );
  statements.push(
    createImportDeclaration('../input-types', ['connectionFieldsMap']),
  );

  const classBody: t.ClassBody['body'] = [];

  // Constructor
  const constructorParam = t.identifier('client');
  constructorParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('OrmClient')),
  );
  const paramProp = t.tsParameterProperty(constructorParam);
  paramProp.accessibility = 'private';
  classBody.push(
    t.classMethod(
      'constructor',
      t.identifier('constructor'),
      [paramProp],
      t.blockStatement([]),
    ),
  );

  // Reusable type reference factories
  const sRef = () => t.tsTypeReference(t.identifier('S'));
  const pkTsType = () => tsTypeFromPrimitive(pkField.tsType);

  // ── findMany ───────────────────────────────────────────────────────────
  {
    const argsType = (sel: t.TSType) =>
      t.tsTypeReference(
        t.identifier('FindManyArgs'),
        t.tsTypeParameterInstantiation([
          sel,
          t.tsTypeReference(t.identifier(whereTypeName)),
          t.tsTypeReference(t.identifier(orderByTypeName)),
        ]),
      );
    const retType = (sel: t.TSType) =>
      t.tsTypeAnnotation(
        t.tsTypeReference(
          t.identifier('QueryBuilder'),
          t.tsTypeParameterInstantiation([
            t.tsTypeLiteral([
              t.tsPropertySignature(
                t.identifier(pluralQueryName),
                t.tsTypeAnnotation(
                  t.tsTypeReference(
                    t.identifier('ConnectionResult'),
                    t.tsTypeParameterInstantiation([
                      t.tsTypeReference(
                        t.identifier('InferSelectResult'),
                        t.tsTypeParameterInstantiation([
                          t.tsTypeReference(t.identifier(relationTypeName)),
                          sel,
                        ]),
                      ),
                    ]),
                  ),
                ),
              ),
            ]),
          ]),
        ),
      );

    const implParam = t.identifier('args');
    implParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsIntersectionType([
        argsType(sRef()),
        t.tsTypeLiteral([requiredSelectProp()]),
        strictSelectGuard(selectTypeName),
      ]),
    );
    const selectExpr = t.memberExpression(
      t.identifier('args'),
      t.identifier('select'),
    );
    const bodyArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(pluralQueryName),
      selectExpr,
      t.objectExpression([
        t.objectProperty(
          t.identifier('where'),
          t.optionalMemberExpression(
            t.identifier('args'),
            t.identifier('where'),
            false,
            true,
          ),
        ),
        t.objectProperty(
          t.identifier('orderBy'),
          t.tsAsExpression(
            t.optionalMemberExpression(
              t.identifier('args'),
              t.identifier('orderBy'),
              false,
              true,
            ),
            t.tsUnionType([
              t.tsArrayType(t.tsStringKeyword()),
              t.tsUndefinedKeyword(),
            ]),
          ),
        ),
        t.objectProperty(
          t.identifier('first'),
          t.optionalMemberExpression(
            t.identifier('args'),
            t.identifier('first'),
            false,
            true,
          ),
        ),
        t.objectProperty(
          t.identifier('last'),
          t.optionalMemberExpression(
            t.identifier('args'),
            t.identifier('last'),
            false,
            true,
          ),
        ),
        t.objectProperty(
          t.identifier('after'),
          t.optionalMemberExpression(
            t.identifier('args'),
            t.identifier('after'),
            false,
            true,
          ),
        ),
        t.objectProperty(
          t.identifier('before'),
          t.optionalMemberExpression(
            t.identifier('args'),
            t.identifier('before'),
            false,
            true,
          ),
        ),
        t.objectProperty(
          t.identifier('offset'),
          t.optionalMemberExpression(
            t.identifier('args'),
            t.identifier('offset'),
            false,
            true,
          ),
        ),
      ]),
      t.stringLiteral(whereTypeName),
      t.stringLiteral(orderByTypeName),
      t.identifier('connectionFieldsMap'),
    ];
    classBody.push(
      createClassMethod(
        'findMany',
        createTypeParam(selectTypeName),
        [implParam],
        retType(sRef()),
        buildMethodBody(
          'buildFindManyDocument',
          bodyArgs,
          'query',
          typeName,
          pluralQueryName,
        ),
      ),
    );
  }

  // ── findFirst ──────────────────────────────────────────────────────────
  {
    const argsType = (sel: t.TSType) =>
      t.tsTypeReference(
        t.identifier('FindFirstArgs'),
        t.tsTypeParameterInstantiation([
          sel,
          t.tsTypeReference(t.identifier(whereTypeName)),
        ]),
      );
    const retType = (sel: t.TSType) =>
      t.tsTypeAnnotation(
        t.tsTypeReference(
          t.identifier('QueryBuilder'),
          t.tsTypeParameterInstantiation([
            t.tsTypeLiteral([
              t.tsPropertySignature(
                t.identifier(pluralQueryName),
                t.tsTypeAnnotation(
                  t.tsTypeLiteral([
                    t.tsPropertySignature(
                      t.identifier('nodes'),
                      t.tsTypeAnnotation(
                        t.tsArrayType(
                          t.tsTypeReference(
                            t.identifier('InferSelectResult'),
                            t.tsTypeParameterInstantiation([
                              t.tsTypeReference(t.identifier(relationTypeName)),
                              sel,
                            ]),
                          ),
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
            ]),
          ]),
        ),
      );

    const implParam = t.identifier('args');
    implParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsIntersectionType([
        argsType(sRef()),
        t.tsTypeLiteral([requiredSelectProp()]),
        strictSelectGuard(selectTypeName),
      ]),
    );
    const selectExpr = t.memberExpression(
      t.identifier('args'),
      t.identifier('select'),
    );
    const bodyArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(pluralQueryName),
      selectExpr,
      t.objectExpression([
        t.objectProperty(
          t.identifier('where'),
          t.optionalMemberExpression(
            t.identifier('args'),
            t.identifier('where'),
            false,
            true,
          ),
        ),
      ]),
      t.stringLiteral(whereTypeName),
      t.identifier('connectionFieldsMap'),
    ];
    classBody.push(
      createClassMethod(
        'findFirst',
        createTypeParam(selectTypeName),
        [implParam],
        retType(sRef()),
        buildMethodBody(
          'buildFindFirstDocument',
          bodyArgs,
          'query',
          typeName,
          pluralQueryName,
        ),
      ),
    );
  }

  // ── findOne ────────────────────────────────────────────────────────────
  if (hasValidPrimaryKey(table)) {
    const retType = (sel: t.TSType) =>
      t.tsTypeAnnotation(
        t.tsTypeReference(
          t.identifier('QueryBuilder'),
          t.tsTypeParameterInstantiation([
            t.tsTypeLiteral([
              t.tsPropertySignature(
                t.identifier(singleResultFieldName),
                t.tsTypeAnnotation(
                  t.tsUnionType([
                    t.tsTypeReference(
                      t.identifier('InferSelectResult'),
                      t.tsTypeParameterInstantiation([
                        t.tsTypeReference(t.identifier(relationTypeName)),
                        sel,
                      ]),
                    ),
                    t.tsNullKeyword(),
                  ]),
                ),
              ),
            ]),
          ]),
        ),
      );

    const pkProp = () => {
      const prop = t.tsPropertySignature(
        t.identifier(pkField.name),
        t.tsTypeAnnotation(pkTsType()),
      );
      prop.optional = false;
      return prop;
    };

    const implParam = t.identifier('args');
    implParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsIntersectionType([
        t.tsTypeLiteral([pkProp(), requiredSelectProp()]),
        strictSelectGuard(selectTypeName),
      ]),
    );
    const selectExpr = t.memberExpression(
      t.identifier('args'),
      t.identifier('select'),
    );
    if (singleQueryName) {
      const pkGqlType = pkField.gqlType.replace(/!/g, '') + '!';
      const bodyArgs = [
        t.stringLiteral(typeName),
        t.stringLiteral(singleQueryName),
        t.memberExpression(t.identifier('args'), t.identifier(pkField.name)),
        selectExpr,
        t.stringLiteral(pkField.name),
        t.stringLiteral(pkGqlType),
        t.identifier('connectionFieldsMap'),
      ];
      classBody.push(
        createClassMethod(
          'findOne',
          createTypeParam(selectTypeName),
          [implParam],
          retType(sRef()),
          buildMethodBody(
            'buildFindOneDocument',
            bodyArgs,
            'query',
            typeName,
            singleResultFieldName,
          ),
        ),
      );
    } else {
      const idExpr = t.memberExpression(
        t.identifier('args'),
        t.identifier(pkField.name),
      );
      const findOneArgs = t.objectExpression([
        t.objectProperty(
          t.identifier('where'),
          t.objectExpression([
            t.objectProperty(
              t.identifier(pkField.name),
              t.objectExpression([
                t.objectProperty(t.identifier('equalTo'), idExpr),
              ]),
            ),
          ]),
        ),
        t.objectProperty(t.identifier('first'), t.numericLiteral(1)),
      ]);
      const bodyArgs = [
        t.stringLiteral(typeName),
        t.stringLiteral(pluralQueryName),
        selectExpr,
        findOneArgs,
        t.stringLiteral(whereTypeName),
        t.stringLiteral(orderByTypeName),
        t.identifier('connectionFieldsMap'),
      ];
      const firstNodeExpr = t.optionalMemberExpression(
        t.optionalMemberExpression(
          t.memberExpression(t.identifier('data'), t.identifier(pluralQueryName)),
          t.identifier('nodes'),
          false,
          true,
        ),
        t.numericLiteral(0),
        true,
        true,
      );
      const transformDataParam = t.identifier('data');
      const transformedNodesProp = t.tsPropertySignature(
        t.identifier('nodes'),
        t.tsTypeAnnotation(
          t.tsArrayType(
            t.tsTypeReference(
              t.identifier('InferSelectResult'),
              t.tsTypeParameterInstantiation([
                t.tsTypeReference(t.identifier(relationTypeName)),
                sRef(),
              ]),
            ),
          ),
        ),
      );
      transformedNodesProp.optional = true;
      const transformedCollectionProp = t.tsPropertySignature(
        t.identifier(pluralQueryName),
        t.tsTypeAnnotation(t.tsTypeLiteral([transformedNodesProp])),
      );
      transformedCollectionProp.optional = true;
      transformDataParam.typeAnnotation = t.tsTypeAnnotation(
        t.tsTypeLiteral([transformedCollectionProp]),
      );
      const transformFn = t.arrowFunctionExpression(
        [transformDataParam],
        t.objectExpression([
          t.objectProperty(
            t.stringLiteral(singleResultFieldName),
            t.logicalExpression('??', firstNodeExpr, t.nullLiteral()),
          ),
        ]),
      );
      classBody.push(
        createClassMethod(
          'findOne',
          createTypeParam(selectTypeName),
          [implParam],
          retType(sRef()),
          buildMethodBody(
            'buildFindManyDocument',
            bodyArgs,
            'query',
            typeName,
            singleResultFieldName,
            [t.objectProperty(t.identifier('transform'), transformFn)],
          ),
        ),
      );
    }
  }

  // ── create ─────────────────────────────────────────────────────────────
  {
    const dataType = () =>
      t.tsIndexedAccessType(
        t.tsTypeReference(t.identifier(createInputTypeName)),
        t.tsLiteralType(t.stringLiteral(singularName)),
      );
    const argsType = (sel: t.TSType) =>
      t.tsTypeReference(
        t.identifier('CreateArgs'),
        t.tsTypeParameterInstantiation([sel, dataType()]),
      );
    const retType = (sel: t.TSType) =>
      t.tsTypeAnnotation(
        t.tsTypeReference(
          t.identifier('QueryBuilder'),
          t.tsTypeParameterInstantiation([
            t.tsTypeLiteral([
              t.tsPropertySignature(
                t.identifier(createMutationName),
                t.tsTypeAnnotation(
                  t.tsTypeLiteral([
                    t.tsPropertySignature(
                      t.identifier(entityLower),
                      t.tsTypeAnnotation(
                        t.tsTypeReference(
                          t.identifier('InferSelectResult'),
                          t.tsTypeParameterInstantiation([
                            t.tsTypeReference(t.identifier(relationTypeName)),
                            sel,
                          ]),
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
            ]),
          ]),
        ),
      );

    const implParam = t.identifier('args');
    implParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsIntersectionType([
        argsType(sRef()),
        t.tsTypeLiteral([requiredSelectProp()]),
        strictSelectGuard(selectTypeName),
      ]),
    );
    const selectExpr = t.memberExpression(
      t.identifier('args'),
      t.identifier('select'),
    );
    const bodyArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(createMutationName),
      t.stringLiteral(entityLower),
      selectExpr,
      t.memberExpression(t.identifier('args'), t.identifier('data')),
      t.stringLiteral(createInputTypeName),
      t.identifier('connectionFieldsMap'),
    ];
    classBody.push(
      createClassMethod(
        'create',
        createTypeParam(selectTypeName),
        [implParam],
        retType(sRef()),
        buildMethodBody(
          'buildCreateDocument',
          bodyArgs,
          'mutation',
          typeName,
          createMutationName,
        ),
      ),
    );
  }

  // ── update ─────────────────────────────────────────────────────────────
  if (updateMutationName) {
    const whereLiteral = () =>
      t.tsTypeLiteral([
        (() => {
          const prop = t.tsPropertySignature(
            t.identifier(pkField.name),
            t.tsTypeAnnotation(pkTsType()),
          );
          prop.optional = false;
          return prop;
        })(),
      ]);
    const argsType = (sel: t.TSType) =>
      t.tsTypeReference(
        t.identifier('UpdateArgs'),
        t.tsTypeParameterInstantiation([
          sel,
          whereLiteral(),
          t.tsTypeReference(t.identifier(patchTypeName)),
        ]),
      );
    const retType = (sel: t.TSType) =>
      t.tsTypeAnnotation(
        t.tsTypeReference(
          t.identifier('QueryBuilder'),
          t.tsTypeParameterInstantiation([
            t.tsTypeLiteral([
              t.tsPropertySignature(
                t.identifier(updateMutationName),
                t.tsTypeAnnotation(
                  t.tsTypeLiteral([
                    t.tsPropertySignature(
                      t.identifier(entityLower),
                      t.tsTypeAnnotation(
                        t.tsTypeReference(
                          t.identifier('InferSelectResult'),
                          t.tsTypeParameterInstantiation([
                            t.tsTypeReference(t.identifier(relationTypeName)),
                            sel,
                          ]),
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
            ]),
          ]),
        ),
      );

    const implParam = t.identifier('args');
    implParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsIntersectionType([
        argsType(sRef()),
        t.tsTypeLiteral([requiredSelectProp()]),
        strictSelectGuard(selectTypeName),
      ]),
    );
    const selectExpr = t.memberExpression(
      t.identifier('args'),
      t.identifier('select'),
    );
    const bodyArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(updateMutationName),
      t.stringLiteral(entityLower),
      selectExpr,
      t.memberExpression(
        t.memberExpression(t.identifier('args'), t.identifier('where')),
        t.identifier(pkField.name),
      ),
      t.memberExpression(t.identifier('args'), t.identifier('data')),
      t.stringLiteral(updateInputTypeName),
      t.stringLiteral(pkField.name),
      t.identifier('connectionFieldsMap'),
    ];
    classBody.push(
      createClassMethod(
        'update',
        createTypeParam(selectTypeName),
        [implParam],
        retType(sRef()),
        buildMethodBody(
          'buildUpdateByPkDocument',
          bodyArgs,
          'mutation',
          typeName,
          updateMutationName,
        ),
      ),
    );
  }

  // ── delete ─────────────────────────────────────────────────────────────
  if (deleteMutationName) {
    const whereLiteral = () =>
      t.tsTypeLiteral([
        (() => {
          const prop = t.tsPropertySignature(
            t.identifier(pkField.name),
            t.tsTypeAnnotation(pkTsType()),
          );
          prop.optional = false;
          return prop;
        })(),
      ]);
    const argsType = (sel: t.TSType) =>
      t.tsTypeReference(
        t.identifier('DeleteArgs'),
        t.tsTypeParameterInstantiation([whereLiteral(), sel]),
      );
    const retType = (sel: t.TSType) =>
      t.tsTypeAnnotation(
        t.tsTypeReference(
          t.identifier('QueryBuilder'),
          t.tsTypeParameterInstantiation([
            t.tsTypeLiteral([
              t.tsPropertySignature(
                t.identifier(deleteMutationName),
                t.tsTypeAnnotation(
                  t.tsTypeLiteral([
                    t.tsPropertySignature(
                      t.identifier(entityLower),
                      t.tsTypeAnnotation(
                        t.tsTypeReference(
                          t.identifier('InferSelectResult'),
                          t.tsTypeParameterInstantiation([
                            t.tsTypeReference(t.identifier(relationTypeName)),
                            sel,
                          ]),
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
            ]),
          ]),
        ),
      );

    const implParam = t.identifier('args');
    implParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsIntersectionType([
        argsType(sRef()),
        t.tsTypeLiteral([requiredSelectProp()]),
        strictSelectGuard(selectTypeName),
      ]),
    );
    const selectExpr = t.memberExpression(
      t.identifier('args'),
      t.identifier('select'),
    );
    const bodyArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(deleteMutationName),
      t.stringLiteral(entityLower),
      t.memberExpression(
        t.memberExpression(t.identifier('args'), t.identifier('where')),
        t.identifier(pkField.name),
      ),
      t.stringLiteral(deleteInputTypeName),
      t.stringLiteral(pkField.name),
      selectExpr,
      t.identifier('connectionFieldsMap'),
    ];
    classBody.push(
      createClassMethod(
        'delete',
        createTypeParam(selectTypeName),
        [implParam],
        retType(sRef()),
        buildMethodBody(
          'buildDeleteByPkDocument',
          bodyArgs,
          'mutation',
          typeName,
          deleteMutationName,
        ),
      ),
    );
  }

  const classDecl = t.classDeclaration(
    t.identifier(modelName),
    null,
    t.classBody(classBody),
  );
  statements.push(t.exportNamedDeclaration(classDecl));

  const header = getGeneratedFileHeader(`${typeName} model for ORM client`);
  const code = generateCode(statements);

  return {
    fileName,
    content: header + '\n' + code,
    modelName,
    tableName: table.name,
  };
}

export function generateAllModelFiles(
  tables: CleanTable[],
  useSharedTypes: boolean,
): GeneratedModelFile[] {
  return tables.map((table) => generateModelFile(table, useSharedTypes));
}
