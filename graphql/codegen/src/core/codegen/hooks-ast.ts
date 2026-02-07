/**
 * Shared Babel AST helpers for React Query hook generators
 *
 * Provides reusable AST-building functions for the common patterns
 * used across queries.ts, mutations.ts, custom-queries.ts, and custom-mutations.ts.
 */
import * as t from '@babel/types';

import type { CleanArgument } from '../../types/schema';
import { commentBlock, generateCode } from './babel-ast';
import { scalarToTsType } from './type-resolver';
import { getGeneratedFileHeader } from './utils';

// ============================================================================
// Import helpers
// ============================================================================

export function createImportDeclaration(
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

export function createTypeReExport(
  names: string[],
  moduleSpecifier: string
): t.ExportNamedDeclaration {
  const specifiers = names.map((name) =>
    t.exportSpecifier(t.identifier(name), t.identifier(name))
  );
  const decl = t.exportNamedDeclaration(null, specifiers, t.stringLiteral(moduleSpecifier));
  decl.exportKind = 'type';
  return decl;
}

// ============================================================================
// Type reference helpers
// ============================================================================

export function typeRef(name: string, params?: t.TSType[]): t.TSTypeReference {
  return t.tsTypeReference(
    t.identifier(name),
    params ? t.tsTypeParameterInstantiation(params) : undefined
  );
}

export function sRef(): t.TSTypeReference {
  return typeRef('S');
}

export function typeofRef(name: string): t.TSTypeQuery {
  return t.tsTypeQuery(t.identifier(name));
}

export function stringLiteralType(value: string): t.TSLiteralType {
  return t.tsLiteralType(t.stringLiteral(value));
}

// ============================================================================
// Complex type builders
// ============================================================================

export function inferSelectResultType(
  entityTypeName: string,
  selectType: t.TSType
): t.TSTypeReference {
  return typeRef('InferSelectResult', [typeRef(entityTypeName), selectType]);
}

export function connectionResultType(
  entityTypeName: string,
  selectType: t.TSType
): t.TSTypeReference {
  return typeRef('ConnectionResult', [inferSelectResultType(entityTypeName, selectType)]);
}

export function typeLiteralWithProps(
  props: Array<{ name: string; type: t.TSType; optional?: boolean }>
): t.TSTypeLiteral {
  return t.tsTypeLiteral(
    props.map((p) => {
      const prop = t.tsPropertySignature(
        t.identifier(p.name),
        t.tsTypeAnnotation(p.type)
      );
      if (p.optional) {
        prop.optional = true;
      }
      return prop;
    })
  );
}

export function queryResultType(
  queryName: string,
  innerType: t.TSType
): t.TSTypeLiteral {
  return typeLiteralWithProps([{ name: queryName, type: innerType }]);
}

export function listQueryResultType(
  queryName: string,
  entityTypeName: string,
  selectType: t.TSType
): t.TSTypeLiteral {
  return queryResultType(queryName, connectionResultType(entityTypeName, selectType));
}

export function singleQueryResultType(
  queryName: string,
  entityTypeName: string,
  selectType: t.TSType,
  nullable: boolean = true
): t.TSTypeLiteral {
  const resultType = inferSelectResultType(entityTypeName, selectType);
  const innerType = nullable
    ? t.tsUnionType([resultType, t.tsNullKeyword()])
    : resultType;
  return queryResultType(queryName, innerType);
}

export function mutationResultType(
  mutationName: string,
  entityField: string,
  entityTypeName: string,
  selectType: t.TSType
): t.TSTypeLiteral {
  return queryResultType(
    mutationName,
    typeLiteralWithProps([{
      name: entityField,
      type: inferSelectResultType(entityTypeName, selectType)
    }])
  );
}

export function omitType(baseType: t.TSType, keys: string[]): t.TSTypeReference {
  const keyType = keys.length === 1
    ? stringLiteralType(keys[0])
    : t.tsUnionType(keys.map(stringLiteralType));
  return typeRef('Omit', [baseType, keyType]);
}

export function listSelectionConfigType(
  selectType: t.TSType,
  filterTypeName: string,
  orderByTypeName: string
): t.TSTypeReference {
  return typeRef('ListSelectionConfig', [
    selectType,
    typeRef(filterTypeName),
    typeRef(orderByTypeName)
  ]);
}

export function selectionConfigType(selectType: t.TSType): t.TSTypeReference {
  return typeRef('SelectionConfig', [selectType]);
}

export function strictSelectType(
  selectType: t.TSType,
  shapeTypeName: string
): t.TSTypeReference {
  return typeRef('StrictSelect', [selectType, typeRef(shapeTypeName)]);
}

export function withFieldsSelectionType(
  selectType: t.TSType,
  selectTypeName: string
): t.TSIntersectionType {
  return t.tsIntersectionType([
    typeLiteralWithProps([{ name: 'fields', type: selectType }]),
    strictSelectType(selectType, selectTypeName)
  ]);
}

export function withFieldsListSelectionType(
  selectType: t.TSType,
  selectTypeName: string,
  filterTypeName: string,
  orderByTypeName: string
): t.TSIntersectionType {
  return t.tsIntersectionType([
    typeLiteralWithProps([{ name: 'fields', type: selectType }]),
    omitType(
      listSelectionConfigType(selectType, filterTypeName, orderByTypeName),
      ['fields']
    ),
    strictSelectType(selectType, selectTypeName)
  ]);
}

export function useQueryOptionsType(
  queryDataType: t.TSType,
  dataType: t.TSType,
  extraProps?: t.TSType
): t.TSType {
  const base = omitType(
    typeRef('UseQueryOptions', [queryDataType, typeRef('Error'), dataType]),
    ['queryKey', 'queryFn']
  );
  if (extraProps) {
    return t.tsIntersectionType([base, extraProps]);
  }
  return base;
}

export function useQueryOptionsImplType(extraProps?: t.TSType): t.TSType {
  const base = omitType(
    typeRef('UseQueryOptions', [
      t.tsAnyKeyword(),
      typeRef('Error'),
      t.tsAnyKeyword(),
      t.tsAnyKeyword()
    ]),
    ['queryKey', 'queryFn']
  );
  if (extraProps) {
    return t.tsIntersectionType([base, extraProps]);
  }
  return base;
}

export function useMutationOptionsType(
  resultType: t.TSType,
  varType: t.TSType
): t.TSTypeReference {
  return omitType(
    typeRef('UseMutationOptions', [resultType, typeRef('Error'), varType]),
    ['mutationFn']
  );
}

export function useMutationResultType(
  resultType: t.TSType,
  varType: t.TSType
): t.TSTypeReference {
  return typeRef('UseMutationResult', [resultType, typeRef('Error'), varType]);
}

// ============================================================================
// Type parameter helpers
// ============================================================================

export function createSTypeParam(constraintName: string): t.TSTypeParameterDeclaration {
  const param = t.tsTypeParameter(typeRef(constraintName), null, 'S');
  return t.tsTypeParameterDeclaration([param]);
}

export function createSAndTDataTypeParams(
  constraintName: string,
  defaultDataType: t.TSType
): t.TSTypeParameterDeclaration {
  const sParam = t.tsTypeParameter(typeRef(constraintName), null, 'S');
  const tDataParam = t.tsTypeParameter(null, defaultDataType, 'TData');
  return t.tsTypeParameterDeclaration([sParam, tDataParam]);
}

export function createTDataTypeParam(defaultType: t.TSType): t.TSTypeParameterDeclaration {
  const param = t.tsTypeParameter(null, defaultType, 'TData');
  return t.tsTypeParameterDeclaration([param]);
}

// ============================================================================
// Function declaration helpers
// ============================================================================

export function createFunctionParam(
  name: string,
  typeAnnotation: t.TSType,
  optional: boolean = false
): t.Identifier {
  const param = t.identifier(name);
  param.typeAnnotation = t.tsTypeAnnotation(typeAnnotation);
  param.optional = optional;
  return param;
}

export function exportDeclareFunction(
  name: string,
  typeParameters: t.TSTypeParameterDeclaration | null,
  params: t.Identifier[],
  returnType: t.TSType
): t.ExportNamedDeclaration {
  const func = t.tsDeclareFunction(
    t.identifier(name),
    typeParameters,
    params,
    t.tsTypeAnnotation(returnType)
  );
  return t.exportNamedDeclaration(func);
}

export function exportFunction(
  name: string,
  typeParameters: t.TSTypeParameterDeclaration | null,
  params: t.Identifier[],
  body: t.Statement[],
  returnType?: t.TSType
): t.ExportNamedDeclaration {
  const func = t.functionDeclaration(
    t.identifier(name),
    params,
    t.blockStatement(body)
  );
  func.typeParameters = typeParameters;
  if (returnType) {
    func.returnType = t.tsTypeAnnotation(returnType);
  }
  return t.exportNamedDeclaration(func);
}

export function exportAsyncFunction(
  name: string,
  typeParameters: t.TSTypeParameterDeclaration | null,
  params: t.Identifier[],
  body: t.Statement[],
  returnType?: t.TSType
): t.ExportNamedDeclaration {
  const func = t.functionDeclaration(
    t.identifier(name),
    params,
    t.blockStatement(body)
  );
  func.async = true;
  func.typeParameters = typeParameters;
  if (returnType) {
    func.returnType = t.tsTypeAnnotation(returnType);
  }
  return t.exportNamedDeclaration(func);
}

export function exportAsyncDeclareFunction(
  name: string,
  typeParameters: t.TSTypeParameterDeclaration | null,
  params: t.Identifier[],
  returnType: t.TSType
): t.ExportNamedDeclaration {
  const func = t.tsDeclareFunction(
    t.identifier(name),
    typeParameters,
    params,
    t.tsTypeAnnotation(returnType)
  );
  func.async = true;
  return t.exportNamedDeclaration(func);
}

// ============================================================================
// Expression helpers
// ============================================================================

export function callExpr(
  callee: string | t.Expression,
  args: (t.Expression | t.SpreadElement)[]
): t.CallExpression {
  const calleeExpr = typeof callee === 'string' ? t.identifier(callee) : callee;
  return t.callExpression(calleeExpr, args);
}

export function memberExpr(obj: string, prop: string): t.MemberExpression {
  return t.memberExpression(t.identifier(obj), t.identifier(prop));
}

export function optionalMemberExpr(obj: string, prop: string): t.OptionalMemberExpression {
  return t.optionalMemberExpression(t.identifier(obj), t.identifier(prop), false, true);
}

export function arrowFn(
  params: t.Identifier[],
  body: t.Expression | t.BlockStatement
): t.ArrowFunctionExpression {
  return t.arrowFunctionExpression(params, body);
}

export function awaitExpr(expr: t.Expression): t.AwaitExpression {
  return t.awaitExpression(expr);
}

export function spreadObj(expr: t.Expression): t.SpreadElement {
  return t.spreadElement(expr);
}

export function objectProp(
  key: string,
  value: t.Expression,
  shorthand: boolean = false
): t.ObjectProperty {
  return t.objectProperty(t.identifier(key), value, false, shorthand);
}

export function shorthandProp(name: string): t.ObjectProperty {
  return t.objectProperty(t.identifier(name), t.identifier(name), false, true);
}

export function constDecl(name: string, init: t.Expression): t.VariableDeclaration {
  return t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier(name), init)
  ]);
}

export function asConstExpr(expr: t.Expression): t.TSAsExpression {
  return t.tsAsExpression(expr, t.tsTypeReference(t.identifier('const')));
}

export function asTypeExpr(expr: t.Expression, typeName: string): t.TSAsExpression {
  return t.tsAsExpression(expr, typeRef(typeName));
}

// ============================================================================
// Statement helpers
// ============================================================================

export function voidStatement(name: string): t.ExpressionStatement {
  return t.expressionStatement(t.unaryExpression('void', t.identifier(name)));
}

export function returnUseQuery(
  queryKeyExpr: t.Expression,
  queryFnExpr: t.Expression,
  extraProps?: Array<t.ObjectProperty | t.SpreadElement>,
  enabledExpr?: t.Expression
): t.ReturnStatement {
  const props: Array<t.ObjectProperty | t.SpreadElement> = [
    objectProp('queryKey', queryKeyExpr),
    objectProp('queryFn', queryFnExpr)
  ];
  if (enabledExpr) {
    props.push(objectProp('enabled', enabledExpr));
  }
  if (extraProps) {
    props.push(...extraProps);
  }
  return t.returnStatement(
    callExpr('useQuery', [t.objectExpression(props)])
  );
}

export function returnUseMutation(
  mutationFnExpr: t.Expression,
  extraProps: Array<t.ObjectProperty | t.SpreadElement>,
  mutationKeyExpr?: t.Expression
): t.ReturnStatement {
  const props: Array<t.ObjectProperty | t.SpreadElement> = [];
  if (mutationKeyExpr) {
    props.push(objectProp('mutationKey', mutationKeyExpr));
  }
  props.push(objectProp('mutationFn', mutationFnExpr));
  props.push(...extraProps);
  return t.returnStatement(
    callExpr('useMutation', [t.objectExpression(props)])
  );
}

// ============================================================================
// Destructuring helpers
// ============================================================================

export function destructureWithRest(
  source: t.Expression,
  keys: string[],
  restName: string
): t.VariableDeclaration {
  const properties = keys.map((key) =>
    t.objectProperty(t.identifier(key), t.identifier(`_${key}`), false, false)
  );
  const pattern = t.objectPattern([
    ...properties,
    t.restElement(t.identifier(restName))
  ]);
  return constDecl(restName, t.identifier('__placeholder__'));
}

export function destructureParamsWithSelection(
  restName: string,
  extraKeys: string[] = []
): t.VariableDeclaration {
  const properties: (t.ObjectProperty | t.RestElement)[] = [];
  for (const key of extraKeys) {
    properties.push(
      t.objectProperty(t.identifier(key), t.identifier(key), false, true)
    );
  }
  properties.push(
    t.objectProperty(t.identifier('selection'), t.identifier('_selection'), false, false)
  );
  properties.push(t.restElement(t.identifier(restName)));

  const pattern = t.objectPattern(properties);
  return t.variableDeclaration('const', [
    t.variableDeclarator(
      pattern,
      t.logicalExpression('??', t.identifier('params'), t.objectExpression([]))
    )
  ]);
}

export function destructureParamsWithSelectionAndScope(
  restName: string
): t.VariableDeclaration {
  const pattern = t.objectPattern([
    t.objectProperty(t.identifier('scope'), t.identifier('scope'), false, true),
    t.objectProperty(t.identifier('selection'), t.identifier('_selection'), false, false),
    t.restElement(t.identifier(restName))
  ]);
  return t.variableDeclaration('const', [
    t.variableDeclarator(
      pattern,
      t.logicalExpression('??', t.identifier('params'), t.objectExpression([]))
    )
  ]);
}

// ============================================================================
// JSDoc comment helpers
// ============================================================================

export function addJSDocComment<T extends t.Node>(node: T, lines: string[]): T {
  const text = lines.length === 1
    ? `* ${lines[0]} `
    : `*\n${lines.map((line) => ` * ${line}`).join('\n')}\n `;
  if (!node.leadingComments) {
    node.leadingComments = [];
  }
  node.leadingComments.push(commentBlock(text));
  return node;
}

export function addLineComment<T extends t.Node>(node: T, text: string): T {
  if (!node.leadingComments) {
    node.leadingComments = [];
  }
  node.leadingComments.push({
    type: 'CommentLine',
    value: ` ${text}`,
    start: null,
    end: null,
    loc: null
  });
  return node;
}

// ============================================================================
// ORM client call builders
// ============================================================================

export function getClientCall(
  modelName: string,
  method: string,
  args: t.Expression
): t.CallExpression {
  return t.callExpression(
    t.memberExpression(
      t.memberExpression(
        callExpr('getClient', []),
        t.identifier(modelName)
      ),
      t.identifier(method)
    ),
    [args]
  );
}

export function getClientCallUnwrap(
  modelName: string,
  method: string,
  args: t.Expression
): t.CallExpression {
  return t.callExpression(
    t.memberExpression(
      getClientCall(modelName, method, args),
      t.identifier('unwrap')
    ),
    []
  );
}

export function getClientCustomCall(
  operationType: 'query' | 'mutation',
  operationName: string,
  args: t.Expression[],
  optionsArg?: t.Expression
): t.CallExpression {
  const callArgs = optionsArg ? [...args, optionsArg] : args;
  return t.callExpression(
    t.memberExpression(
      t.memberExpression(
        callExpr('getClient', []),
        t.identifier(operationType)
      ),
      t.identifier(operationName)
    ),
    callArgs
  );
}

export function getClientCustomCallUnwrap(
  operationType: 'query' | 'mutation',
  operationName: string,
  args: t.Expression[],
  optionsArg?: t.Expression
): t.CallExpression {
  return t.callExpression(
    t.memberExpression(
      getClientCustomCall(operationType, operationName, args, optionsArg),
      t.identifier('unwrap')
    ),
    []
  );
}

// ============================================================================
// Select/args expression builders
// ============================================================================

export function buildSelectExpr(
  argsIdent: string
): t.MemberExpression {
  return t.memberExpression(
    t.identifier(argsIdent),
    t.identifier('select')
  );
}

export function buildFindManyCallExpr(
  singularName: string,
  argsIdent: string
): t.CallExpression {
  const spreadArgs = t.parenthesizedExpression(
    t.logicalExpression('??', t.identifier(argsIdent), t.objectExpression([]))
  );
  return getClientCallUnwrap(
    singularName,
    'findMany',
    t.objectExpression([
      t.spreadElement(spreadArgs),
      objectProp('select', buildSelectExpr(argsIdent))
    ])
  );
}

export function buildFindOneCallExpr(
  singularName: string,
  pkFieldName: string,
  argsIdent: string,
  paramsIdent: string = 'params'
): t.CallExpression {
  return getClientCallUnwrap(
    singularName,
    'findOne',
    t.objectExpression([
      objectProp(
        pkFieldName,
        t.memberExpression(t.identifier(paramsIdent), t.identifier(pkFieldName))
      ),
      t.spreadElement(
        t.parenthesizedExpression(
          t.logicalExpression('??', t.identifier(argsIdent), t.objectExpression([]))
        )
      ),
      objectProp('select', buildSelectExpr(argsIdent))
    ])
  );
}

// ============================================================================
// Code generation
// ============================================================================

export function generateHookFileCode(
  headerDescription: string,
  statements: t.Statement[]
): string {
  const header = getGeneratedFileHeader(headerDescription);
  const code = generateCode(statements);
  return header + '\n\n' + code + '\n';
}

// ============================================================================
// Scope type helper
// ============================================================================

export function scopeTypeLiteral(scopeTypeName: string): t.TSTypeLiteral {
  return typeLiteralWithProps([{
    name: 'scope',
    type: typeRef(scopeTypeName),
    optional: true
  }]);
}

// ============================================================================
// Type conversion helpers (GraphQL -> AST)
// ============================================================================

export function wrapInferSelectResultType(
  typeRefNode: CleanArgument['type'],
  payloadTypeName: string,
  selectType: t.TSType
): t.TSType {
  if (typeRefNode.kind === 'NON_NULL' && typeRefNode.ofType) {
    return wrapInferSelectResultType(
      typeRefNode.ofType as CleanArgument['type'],
      payloadTypeName,
      selectType
    );
  }
  if (typeRefNode.kind === 'LIST' && typeRefNode.ofType) {
    return t.tsArrayType(
      wrapInferSelectResultType(
        typeRefNode.ofType as CleanArgument['type'],
        payloadTypeName,
        selectType
      )
    );
  }
  return inferSelectResultType(payloadTypeName, selectType);
}

export function typeRefToTsTypeAST(
  typeRefNode: CleanArgument['type']
): t.TSType {
  if (typeRefNode.kind === 'NON_NULL' && typeRefNode.ofType) {
    return typeRefToTsTypeAST(typeRefNode.ofType as CleanArgument['type']);
  }
  if (typeRefNode.kind === 'LIST' && typeRefNode.ofType) {
    return t.tsArrayType(typeRefToTsTypeAST(typeRefNode.ofType as CleanArgument['type']));
  }
  if (typeRefNode.kind === 'SCALAR') {
    const tsType = scalarToTsType(typeRefNode.name ?? 'unknown');
    if (tsType === 'string') return t.tsStringKeyword();
    if (tsType === 'number') return t.tsNumberKeyword();
    if (tsType === 'boolean') return t.tsBooleanKeyword();
    return t.tsUnknownKeyword();
  }
  return typeRef(typeRefNode.name ?? 'unknown');
}

export function buildSelectionArgsCall(
  selectTypeName: string
): t.VariableDeclaration {
  const call = t.callExpression(t.identifier('buildSelectionArgs'), [
    t.optionalMemberExpression(
      t.identifier('params'),
      t.identifier('selection'),
      false,
      true
    )
  ]);
  // @ts-ignore - Babel types support typeParameters on CallExpression for TS
  call.typeParameters = t.tsTypeParameterInstantiation([typeRef(selectTypeName)]);
  return constDecl('args', call);
}

export function buildListSelectionArgsCall(
  selectTypeName: string,
  filterTypeName: string,
  orderByTypeName: string
): t.VariableDeclaration {
  const call = t.callExpression(t.identifier('buildListSelectionArgs'), [
    t.identifier('selection')
  ]);
  // @ts-ignore - Babel types support typeParameters on CallExpression for TS
  call.typeParameters = t.tsTypeParameterInstantiation([
    typeRef(selectTypeName),
    typeRef(filterTypeName),
    typeRef(orderByTypeName)
  ]);
  return constDecl('args', call);
}

export function customSelectResultTypeLiteral(
  opName: string,
  returnType: CleanArgument['type'],
  payloadTypeName: string,
  selectType: t.TSType
): t.TSTypeLiteral {
  return typeLiteralWithProps([{
    name: opName,
    type: wrapInferSelectResultType(returnType, payloadTypeName, selectType)
  }]);
}
