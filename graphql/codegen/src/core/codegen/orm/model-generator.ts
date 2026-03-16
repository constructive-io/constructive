/**
 * Model class generator for ORM client (Babel AST-based)
 *
 * Generates per-table model classes with findMany, findFirst, create, update, delete methods.
 * Plus M:N junction methods (add/remove/set) when manyToMany relations exist.
 * Each method uses function overloads for IDE autocompletion of select objects.
 */
import * as t from '@babel/types';
import { singularize } from 'inflekt';

import type { CleanField, CleanManyToManyRelation, CleanTable } from '../../../types/schema';
import { asConst, generateCode } from '../babel-ast';
import {
  fieldTypeToTs,
  getCreateInputTypeName,
  getCreateMutationName,
  getDeleteInputTypeName,
  getFilterTypeName,
  getGeneratedFileHeader,
  getOrderByTypeName,
  getPrimaryKeyInfo,
  getScalarFields,
  getSingleRowQueryName,
  getTableNames,
  hasValidPrimaryKey,
  lcFirst,
  ucFirst,
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

// ============================================================================
// M:N Junction Method Support
// ============================================================================

interface JunctionInfo {
  junctionTypeName: string;
  junctionSingularName: string;
  junctionCreateMutation: string;
  junctionDeleteMutation: string;
  junctionCreateInputType: string;
  junctionDeleteInputType: string;
  leftFkField: { name: string; tsType: string };
  rightFkField: { name: string; tsType: string };
  hasExtraFields: boolean;
  addMethodName: string;
  removeMethodName: string;
}

/**
 * Resolve junction table metadata needed to generate add/remove/set methods.
 * Returns null if the junction table is missing, lacks mutations, or FK fields can't be resolved.
 */
function resolveJunctionInfo(
  table: CleanTable,
  relation: CleanManyToManyRelation,
  allTables: CleanTable[],
  needsDisambiguation: boolean,
): JunctionInfo | null {
  const junctionTable = allTables.find((t) => t.name === relation.junctionTable);
  if (!junctionTable) return null;

  const junctionNames = getTableNames(junctionTable);
  const junctionDeleteMutation = junctionTable.query?.delete;
  if (!junctionDeleteMutation) return null;

  const junctionCreateMutation = getCreateMutationName(junctionTable);

  const rightTable = allTables.find((t) => t.name === relation.rightTable);
  if (!rightTable) return null;

  const rightNames = getTableNames(rightTable);

  // Resolve FK fields — prefer _meta data, fall back to junction's belongsTo relations
  let leftFk: CleanField | undefined;
  let rightFk: CleanField | undefined;

  if (relation.junctionLeftKeys?.length && relation.junctionRightKeys?.length) {
    leftFk = relation.junctionLeftKeys[0];
    rightFk = relation.junctionRightKeys[0];
  } else {
    const leftBelongsTo = junctionTable.relations.belongsTo.find(
      (r) => r.referencesTable === table.name,
    );
    const rightBelongsTo = junctionTable.relations.belongsTo.find(
      (r) => r.referencesTable === relation.rightTable && r !== leftBelongsTo,
    );
    if (!leftBelongsTo?.keys?.[0] || !rightBelongsTo?.keys?.[0]) return null;
    leftFk = leftBelongsTo.keys[0];
    rightFk = rightBelongsTo.keys[0];
  }

  // Determine method names from relation fieldName or right table name
  const fieldName = relation.fieldName;
  const singularRight = fieldName
    ? ucFirst(singularize(fieldName))
    : rightNames.typeName;

  const suffix = needsDisambiguation ? `Via${junctionNames.typeName}` : '';

  // Check if junction has extra fields (non-FK scalar fields)
  const junctionScalarFields = getScalarFields(junctionTable);
  const fkFieldNames = new Set([leftFk.name, rightFk.name]);
  const hasExtraFields = junctionScalarFields.some(
    (f) => !fkFieldNames.has(f.name),
  );

  return {
    junctionTypeName: junctionNames.typeName,
    junctionSingularName: junctionNames.singularName,
    junctionCreateMutation,
    junctionDeleteMutation,
    junctionCreateInputType: getCreateInputTypeName(junctionTable),
    junctionDeleteInputType: getDeleteInputTypeName(junctionTable),
    leftFkField: {
      name: leftFk.name,
      tsType: fieldTypeToTs(leftFk.type),
    },
    rightFkField: {
      name: rightFk.name,
      tsType: fieldTypeToTs(rightFk.type),
    },
    hasExtraFields,
    addMethodName: `add${singularRight}${suffix}`,
    removeMethodName: `remove${singularRight}${suffix}`,
  };
}

/**
 * Determine which M:N relations need disambiguation (multiple to same right table).
 */
function getDisambiguationSet(relations: CleanManyToManyRelation[]): Set<number> {
  const rightTableCounts = new Map<string, number>();
  for (const rel of relations) {
    rightTableCounts.set(
      rel.rightTable,
      (rightTableCounts.get(rel.rightTable) ?? 0) + 1,
    );
  }
  const needsDisambiguation = new Set<number>();
  relations.forEach((rel, i) => {
    if ((rightTableCounts.get(rel.rightTable) ?? 0) > 1) {
      needsDisambiguation.add(i);
    }
  });
  return needsDisambiguation;
}

/**
 * Build `Partial<Omit<CreateXInput["entity"], "leftFk" | "rightFk">>` AST type.
 * Used for both the `data?` param on add and the items intersection on set.
 */
function buildExtraFieldsType(info: JunctionInfo): t.TSType {
  return t.tsTypeReference(
    t.identifier('Partial'),
    t.tsTypeParameterInstantiation([
      t.tsTypeReference(
        t.identifier('Omit'),
        t.tsTypeParameterInstantiation([
          t.tsIndexedAccessType(
            t.tsTypeReference(t.identifier(info.junctionCreateInputType)),
            t.tsLiteralType(t.stringLiteral(info.junctionSingularName)),
          ),
          t.tsUnionType([
            t.tsLiteralType(t.stringLiteral(info.leftFkField.name)),
            t.tsLiteralType(t.stringLiteral(info.rightFkField.name)),
          ]),
        ]),
      ),
    ]),
  );
}

export function generateModelFile(
  table: CleanTable,
  _useSharedTypes: boolean,
  options?: { condition?: boolean; allTables?: CleanTable[] },
): GeneratedModelFile {
  const conditionEnabled = options?.condition !== false;
  const { typeName, singularName, pluralName } = getTableNames(table);
  const modelName = `${typeName}Model`;
  const baseFileName = lcFirst(typeName);
  const fileName =
    baseFileName === 'index' ? `${baseFileName}Model.ts` : `${baseFileName}.ts`;
  const entityLower = singularName;

  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const whereTypeName = getFilterTypeName(table);
  const conditionTypeName = conditionEnabled ? `${typeName}Condition` : undefined;
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
  const hasManyToMany = (options?.allTables?.length ?? 0) > 0
    && table.relations.manyToMany.length > 0;
  const queryBuilderImports = [
    'QueryBuilder',
    'buildFindManyDocument',
    'buildFindFirstDocument',
    'buildFindOneDocument',
    'buildCreateDocument',
    'buildUpdateByPkDocument',
    'buildDeleteByPkDocument',
    ...(hasManyToMany
      ? ['buildDeleteByCompositePkDocument']
      : []),
  ];
  statements.push(
    createImportDeclaration('../query-builder', queryBuilderImports),
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
  const inputTypeImports = [
    typeName,
    relationTypeName,
    selectTypeName,
    whereTypeName,
    ...(conditionTypeName ? [conditionTypeName] : []),
    orderByTypeName,
    createInputTypeName,
    updateInputTypeName,
    patchTypeName,
  ];
  statements.push(
    createImportDeclaration(
      '../input-types',
      inputTypeImports,
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
    const findManyTypeArgs: Array<(sel: t.TSType) => t.TSType> = [
      (sel: t.TSType) => sel,
      () => t.tsTypeReference(t.identifier(whereTypeName)),
      conditionTypeName
        ? () => t.tsTypeReference(t.identifier(conditionTypeName))
        : () => t.tsNeverKeyword(),
      () => t.tsTypeReference(t.identifier(orderByTypeName)),
    ];
    const argsType = (sel: t.TSType) =>
      t.tsTypeReference(
        t.identifier('FindManyArgs'),
        t.tsTypeParameterInstantiation(
          findManyTypeArgs.map(fn => fn(sel)),
        ),
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
    const findManyObjProps = [
      t.objectProperty(
        t.identifier('where'),
        t.optionalMemberExpression(
          t.identifier('args'),
          t.identifier('where'),
          false,
          true,
        ),
      ),
      ...(conditionTypeName
        ? [
            t.objectProperty(
              t.identifier('condition'),
              t.optionalMemberExpression(
                t.identifier('args'),
                t.identifier('condition'),
                false,
                true,
              ),
            ),
          ]
        : []),
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
    ];
    const bodyArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(pluralQueryName),
      selectExpr,
      t.objectExpression(findManyObjProps),
      t.stringLiteral(whereTypeName),
      t.stringLiteral(orderByTypeName),
      t.identifier('connectionFieldsMap'),
      ...(conditionTypeName
        ? [t.stringLiteral(conditionTypeName)]
        : []),
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
    const findFirstTypeArgs: Array<(sel: t.TSType) => t.TSType> = [
      (sel: t.TSType) => sel,
      () => t.tsTypeReference(t.identifier(whereTypeName)),
      ...(conditionTypeName
        ? [() => t.tsTypeReference(t.identifier(conditionTypeName))]
        : []),
    ];
    const argsType = (sel: t.TSType) =>
      t.tsTypeReference(
        t.identifier('FindFirstArgs'),
        t.tsTypeParameterInstantiation(
          findFirstTypeArgs.map(fn => fn(sel)),
        ),
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
    const findFirstObjProps = [
      t.objectProperty(
        t.identifier('where'),
        t.optionalMemberExpression(
          t.identifier('args'),
          t.identifier('where'),
          false,
          true,
        ),
      ),
      ...(conditionTypeName
        ? [
            t.objectProperty(
              t.identifier('condition'),
              t.optionalMemberExpression(
                t.identifier('args'),
                t.identifier('condition'),
                false,
                true,
              ),
            ),
          ]
        : []),
    ];
    const bodyArgs = [
      t.stringLiteral(typeName),
      t.stringLiteral(pluralQueryName),
      selectExpr,
      t.objectExpression(findFirstObjProps),
      t.stringLiteral(whereTypeName),
      t.identifier('connectionFieldsMap'),
      ...(conditionTypeName
        ? [t.stringLiteral(conditionTypeName)]
        : []),
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
    const patchFieldName =
      table.query?.patchFieldName ?? lcFirst(typeName) + 'Patch';
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
      t.stringLiteral(patchFieldName),
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

  // ── M:N junction methods (add/remove/set) ─────────────────────────────
  const allTables = options?.allTables;
  if (allTables && table.relations.manyToMany.length > 0) {
    const disambiguationSet = getDisambiguationSet(table.relations.manyToMany);
    const junctionInfos: JunctionInfo[] = [];

    table.relations.manyToMany.forEach((rel, i) => {
      const info = resolveJunctionInfo(
        table, rel, allTables, disambiguationSet.has(i),
      );
      if (info) junctionInfos.push(info);
    });

    // Inject junction type imports
    if (junctionInfos.length > 0) {
      const junctionImportTypes = new Set<string>();
      for (const info of junctionInfos) {
        junctionImportTypes.add(info.junctionTypeName);
        junctionImportTypes.add(info.junctionCreateInputType);
      }
      statements.push(
        createImportDeclaration(
          '../input-types',
          [...junctionImportTypes],
          true,
        ),
      );
    }

    for (const info of junctionInfos) {
      const leftTsType = () => tsTypeFromPrimitive(info.leftFkField.tsType);
      const rightTsType = () => tsTypeFromPrimitive(info.rightFkField.tsType);

      // Junction entity return type: { createXxx: { xxx: XxxType } }
      const junctionRetType = (mutationName: string) =>
        t.tsTypeAnnotation(
          t.tsTypeReference(
            t.identifier('QueryBuilder'),
            t.tsTypeParameterInstantiation([
              t.tsTypeLiteral([
                t.tsPropertySignature(
                  t.identifier(mutationName),
                  t.tsTypeAnnotation(
                    t.tsTypeLiteral([
                      t.tsPropertySignature(
                        t.identifier(info.junctionSingularName),
                        t.tsTypeAnnotation(
                          t.tsTypeReference(t.identifier(info.junctionTypeName)),
                        ),
                      ),
                    ]),
                  ),
                ),
              ]),
            ]),
          ),
        );

      // Select literal for junction (FK fields)
      const junctionSelectExpr = t.objectExpression([
        t.objectProperty(t.identifier(info.leftFkField.name), t.booleanLiteral(true)),
        t.objectProperty(t.identifier(info.rightFkField.name), t.booleanLiteral(true)),
      ]);

      // ── add{Right} ────────────────────────────────────────────────
      {
        const params: (t.Identifier | t.TSParameterProperty)[] = [];

        // leftFk param
        const leftParam = t.identifier(info.leftFkField.name);
        leftParam.typeAnnotation = t.tsTypeAnnotation(leftTsType());
        params.push(leftParam);

        // rightFk param
        const rightParam = t.identifier(info.rightFkField.name);
        rightParam.typeAnnotation = t.tsTypeAnnotation(rightTsType());
        params.push(rightParam);

        // Optional data param (only if junction has extra fields)
        if (info.hasExtraFields) {
          const dataParam = t.identifier('data');
          dataParam.optional = true;
          dataParam.typeAnnotation = t.tsTypeAnnotation(buildExtraFieldsType(info));
          params.push(dataParam);
        }

        // Body: buildCreateDocument call
        const dataExpr = info.hasExtraFields
          ? t.objectExpression([
              t.objectProperty(
                t.identifier(info.leftFkField.name),
                t.identifier(info.leftFkField.name),
                false,
                true,
              ),
              t.objectProperty(
                t.identifier(info.rightFkField.name),
                t.identifier(info.rightFkField.name),
                false,
                true,
              ),
              t.spreadElement(t.identifier('data')),
            ])
          : t.objectExpression([
              t.objectProperty(
                t.identifier(info.leftFkField.name),
                t.identifier(info.leftFkField.name),
                false,
                true,
              ),
              t.objectProperty(
                t.identifier(info.rightFkField.name),
                t.identifier(info.rightFkField.name),
                false,
                true,
              ),
            ]);

        const bodyArgs = [
          t.stringLiteral(info.junctionTypeName),
          t.stringLiteral(info.junctionCreateMutation),
          t.stringLiteral(info.junctionSingularName),
          junctionSelectExpr,
          dataExpr,
          t.stringLiteral(info.junctionCreateInputType),
          t.identifier('connectionFieldsMap'),
        ];

        classBody.push(
          createClassMethod(
            info.addMethodName,
            null,
            params,
            junctionRetType(info.junctionCreateMutation),
            buildMethodBody(
              'buildCreateDocument',
              bodyArgs,
              'mutation',
              info.junctionTypeName,
              info.junctionCreateMutation,
            ),
          ),
        );
      }

      // ── remove{Right} ─────────────────────────────────────────────
      {
        const params: t.Identifier[] = [];

        const leftParam = t.identifier(info.leftFkField.name);
        leftParam.typeAnnotation = t.tsTypeAnnotation(leftTsType());
        params.push(leftParam);

        const rightParam = t.identifier(info.rightFkField.name);
        rightParam.typeAnnotation = t.tsTypeAnnotation(rightTsType());
        params.push(rightParam);

        const pkFieldsExpr = t.objectExpression([
          t.objectProperty(
            t.identifier(info.leftFkField.name),
            t.identifier(info.leftFkField.name),
            false,
            true,
          ),
          t.objectProperty(
            t.identifier(info.rightFkField.name),
            t.identifier(info.rightFkField.name),
            false,
            true,
          ),
        ]);

        const bodyArgs = [
          t.stringLiteral(info.junctionTypeName),
          t.stringLiteral(info.junctionDeleteMutation),
          t.stringLiteral(info.junctionSingularName),
          pkFieldsExpr,
          t.stringLiteral(info.junctionDeleteInputType),
          junctionSelectExpr,
          t.identifier('connectionFieldsMap'),
        ];

        classBody.push(
          createClassMethod(
            info.removeMethodName,
            null,
            params,
            junctionRetType(info.junctionDeleteMutation),
            buildMethodBody(
              'buildDeleteByCompositePkDocument',
              bodyArgs,
              'mutation',
              info.junctionTypeName,
              info.junctionDeleteMutation,
            ),
          ),
        );
      }

    }
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
  options?: { condition?: boolean },
): GeneratedModelFile[] {
  return tables.map((table) =>
    generateModelFile(table, useSharedTypes, { ...options, allTables: tables }),
  );
}
