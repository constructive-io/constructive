/**
 * Custom operations generator for ORM client (Babel AST-based)
 *
 * Generates db.query.* and db.mutation.* namespaces for non-table operations
 * like login, register, currentUser, etc.
 */
import type { CleanOperation, CleanArgument } from '../../../types/schema';
import * as t from '@babel/types';
import { generateCode } from '../babel-ast';
import { ucFirst, getGeneratedFileHeader } from '../utils';
import {
  typeRefToTsType,
  isTypeRequired,
  getTypeBaseName,
} from '../type-resolver';
import { SCALAR_NAMES } from '../scalars';

export interface GeneratedCustomOpsFile {
  fileName: string;
  content: string;
}

/**
 * Collect all input type names used by operations
 * Includes Input, Filter, OrderBy, and Condition types
 */
function collectInputTypeNamesFromOps(operations: CleanOperation[]): string[] {
  const inputTypes = new Set<string>();

  for (const op of operations) {
    for (const arg of op.args) {
      const baseName = getTypeBaseName(arg.type);
      if (
        baseName &&
        (baseName.endsWith('Input') ||
          baseName.endsWith('Filter') ||
          baseName.endsWith('OrderBy') ||
          baseName.endsWith('Condition'))
      ) {
        inputTypes.add(baseName);
      }
    }
  }

  return Array.from(inputTypes);
}

// Types that don't need Select types
const NON_SELECT_TYPES = new Set<string>([
  ...SCALAR_NAMES,
  'Query',
  'Mutation',
]);

/**
 * Collect all payload/return type names from operations (for Select types)
 * Filters out scalar types
 */
function collectPayloadTypeNamesFromOps(
  operations: CleanOperation[]
): string[] {
  const payloadTypes = new Set<string>();

  for (const op of operations) {
    const baseName = getTypeBaseName(op.returnType);
    if (
      baseName &&
      !baseName.endsWith('Connection') &&
      baseName !== 'Query' &&
      baseName !== 'Mutation' &&
      !NON_SELECT_TYPES.has(baseName)
    ) {
      payloadTypes.add(baseName);
    }
  }

  return Array.from(payloadTypes);
}

/**
 * Get the Select type name for a return type
 * Returns null for scalar types, Connection types (no select needed)
 */
function getSelectTypeName(returnType: CleanArgument['type']): string | null {
  const baseName = getTypeBaseName(returnType);
  if (
    baseName &&
    !NON_SELECT_TYPES.has(baseName) &&
    baseName !== 'Query' &&
    baseName !== 'Mutation' &&
    !baseName.endsWith('Connection')
  ) {
    return `${baseName}Select`;
  }
  return null;
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

function createVariablesInterface(
  op: CleanOperation
): t.ExportNamedDeclaration | null {
  if (op.args.length === 0) return null;

  const varTypeName = `${ucFirst(op.name)}Variables`;
  const props = op.args.map((arg) => {
    const optional = !isTypeRequired(arg.type);
    const prop = t.tsPropertySignature(
      t.identifier(arg.name),
      t.tsTypeAnnotation(parseTypeAnnotation(typeRefToTsType(arg.type)))
    );
    prop.optional = optional;
    return prop;
  });

  const interfaceDecl = t.tsInterfaceDeclaration(
    t.identifier(varTypeName),
    null,
    null,
    t.tsInterfaceBody(props)
  );
  return t.exportNamedDeclaration(interfaceDecl);
}

function parseTypeAnnotation(typeStr: string): t.TSType {
  if (typeStr === 'string') return t.tsStringKeyword();
  if (typeStr === 'number') return t.tsNumberKeyword();
  if (typeStr === 'boolean') return t.tsBooleanKeyword();
  if (typeStr === 'null') return t.tsNullKeyword();
  if (typeStr === 'undefined') return t.tsUndefinedKeyword();
  if (typeStr === 'unknown') return t.tsUnknownKeyword();

  if (typeStr.includes(' | ')) {
    const parts = typeStr.split(' | ').map((p) => parseTypeAnnotation(p.trim()));
    return t.tsUnionType(parts);
  }

  if (typeStr.endsWith('[]')) {
    return t.tsArrayType(parseTypeAnnotation(typeStr.slice(0, -2)));
  }

  return t.tsTypeReference(t.identifier(typeStr));
}

function buildOperationMethod(
  op: CleanOperation,
  operationType: 'query' | 'mutation'
): t.ObjectProperty {
  const hasArgs = op.args.length > 0;
  const varTypeName = `${ucFirst(op.name)}Variables`;
  const varDefs = op.args.map((arg) => ({
    name: arg.name,
    type: formatGraphQLType(arg.type),
  }));

  const selectTypeName = getSelectTypeName(op.returnType);
  const payloadTypeName = getTypeBaseName(op.returnType);

  // Build the arrow function parameters
  const params: t.Identifier[] = [];

  if (hasArgs) {
    const argsParam = t.identifier('args');
    argsParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(varTypeName)));
    params.push(argsParam);
  }

  const optionsParam = t.identifier('options');
  optionsParam.optional = true;
  if (selectTypeName) {
    // Use DeepExact<S, SelectType> to enforce strict field validation
    // This catches invalid fields even when mixed with valid ones
    optionsParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeLiteral([
        (() => {
          const prop = t.tsPropertySignature(
            t.identifier('select'),
            t.tsTypeAnnotation(
              t.tsTypeReference(
                t.identifier('DeepExact'),
                t.tsTypeParameterInstantiation([
                  t.tsTypeReference(t.identifier('S')),
                  t.tsTypeReference(t.identifier(selectTypeName)),
                ])
              )
            )
          );
          prop.optional = true;
          return prop;
        })(),
      ])
    );
  } else {
    optionsParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeLiteral([
        (() => {
          const prop = t.tsPropertySignature(
            t.identifier('select'),
            t.tsTypeAnnotation(
              t.tsTypeReference(
                t.identifier('Record'),
                t.tsTypeParameterInstantiation([t.tsStringKeyword(), t.tsUnknownKeyword()])
              )
            )
          );
          prop.optional = true;
          return prop;
        })(),
      ])
    );
  }
  params.push(optionsParam);

  // Build the QueryBuilder call
  const queryBuilderArgs = t.objectExpression([
    t.objectProperty(t.identifier('client'), t.identifier('client'), false, true),
    t.objectProperty(t.identifier('operation'), t.stringLiteral(operationType)),
    t.objectProperty(t.identifier('operationName'), t.stringLiteral(ucFirst(op.name))),
    t.objectProperty(t.identifier('fieldName'), t.stringLiteral(op.name)),
    t.spreadElement(
      t.callExpression(t.identifier('buildCustomDocument'), [
        t.stringLiteral(operationType),
        t.stringLiteral(ucFirst(op.name)),
        t.stringLiteral(op.name),
        t.optionalMemberExpression(t.identifier('options'), t.identifier('select'), false, true),
        hasArgs ? t.identifier('args') : t.identifier('undefined'),
        t.arrayExpression(
          varDefs.map((v) =>
            t.objectExpression([
              t.objectProperty(t.identifier('name'), t.stringLiteral(v.name)),
              t.objectProperty(t.identifier('type'), t.stringLiteral(v.type)),
            ])
          )
        ),
      ])
    ),
  ]);

  const newExpr = t.newExpression(t.identifier('QueryBuilder'), [queryBuilderArgs]);

  // Add type parameter if we have a select type
  if (selectTypeName && payloadTypeName) {
    (newExpr as any).typeParameters = t.tsTypeParameterInstantiation([
      t.tsTypeLiteral([
        t.tsPropertySignature(
          t.identifier(op.name),
          t.tsTypeAnnotation(
            t.tsTypeReference(
              t.identifier('InferSelectResult'),
              t.tsTypeParameterInstantiation([
                t.tsTypeReference(t.identifier(payloadTypeName)),
                t.tsTypeReference(t.identifier('S')),
              ])
            )
          )
        ),
      ]),
    ]);
  }

  const arrowFunc = t.arrowFunctionExpression(params, newExpr);

  // Add type parameters to arrow function if we have a select type
  if (selectTypeName) {
    const typeParam = t.tsTypeParameter(
      t.tsTypeReference(t.identifier(selectTypeName)),
      null,
      'S'
    );
    (typeParam as any).const = true;
    arrowFunc.typeParameters = t.tsTypeParameterDeclaration([typeParam]);
  }

  return t.objectProperty(t.identifier(op.name), arrowFunc);
}

/**
 * Generate the query/index.ts file for custom query operations
 */
export function generateCustomQueryOpsFile(
  operations: CleanOperation[]
): GeneratedCustomOpsFile {
  const statements: t.Statement[] = [];

  // Collect all input type names and payload type names
  const inputTypeNames = collectInputTypeNamesFromOps(operations);
  const payloadTypeNames = collectPayloadTypeNamesFromOps(operations);
  const selectTypeNames = payloadTypeNames.map((p) => `${p}Select`);
  const allTypeImports = [...new Set([...inputTypeNames, ...payloadTypeNames, ...selectTypeNames])];

  // Add imports
  statements.push(createImportDeclaration('../client', ['OrmClient']));
  statements.push(createImportDeclaration('../query-builder', ['QueryBuilder', 'buildCustomDocument']));
  statements.push(createImportDeclaration('../select-types', ['InferSelectResult', 'DeepExact'], true));

  if (allTypeImports.length > 0) {
    statements.push(createImportDeclaration('../input-types', allTypeImports, true));
  }

  // Generate variable interfaces
  for (const op of operations) {
    const varInterface = createVariablesInterface(op);
    if (varInterface) statements.push(varInterface);
  }

  // Generate factory function
  const operationProperties = operations.map((op) => buildOperationMethod(op, 'query'));

  const returnObj = t.objectExpression(operationProperties);
  const returnStmt = t.returnStatement(returnObj);

  const clientParam = t.identifier('client');
  clientParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier('OrmClient')));

  const factoryFunc = t.functionDeclaration(
    t.identifier('createQueryOperations'),
    [clientParam],
    t.blockStatement([returnStmt])
  );
  statements.push(t.exportNamedDeclaration(factoryFunc));

  const header = getGeneratedFileHeader('Custom query operations');
  const code = generateCode(statements);

  return {
    fileName: 'query/index.ts',
    content: header + '\n' + code,
  };
}

/**
 * Generate the mutation/index.ts file for custom mutation operations
 */
export function generateCustomMutationOpsFile(
  operations: CleanOperation[]
): GeneratedCustomOpsFile {
  const statements: t.Statement[] = [];

  // Collect all input type names and payload type names
  const inputTypeNames = collectInputTypeNamesFromOps(operations);
  const payloadTypeNames = collectPayloadTypeNamesFromOps(operations);
  const selectTypeNames = payloadTypeNames.map((p) => `${p}Select`);
  const allTypeImports = [...new Set([...inputTypeNames, ...payloadTypeNames, ...selectTypeNames])];

  // Add imports
  statements.push(createImportDeclaration('../client', ['OrmClient']));
  statements.push(createImportDeclaration('../query-builder', ['QueryBuilder', 'buildCustomDocument']));
  statements.push(createImportDeclaration('../select-types', ['InferSelectResult', 'DeepExact'], true));

  if (allTypeImports.length > 0) {
    statements.push(createImportDeclaration('../input-types', allTypeImports, true));
  }

  // Generate variable interfaces
  for (const op of operations) {
    const varInterface = createVariablesInterface(op);
    if (varInterface) statements.push(varInterface);
  }

  // Generate factory function
  const operationProperties = operations.map((op) => buildOperationMethod(op, 'mutation'));

  const returnObj = t.objectExpression(operationProperties);
  const returnStmt = t.returnStatement(returnObj);

  const clientParam = t.identifier('client');
  clientParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier('OrmClient')));

  const factoryFunc = t.functionDeclaration(
    t.identifier('createMutationOperations'),
    [clientParam],
    t.blockStatement([returnStmt])
  );
  statements.push(t.exportNamedDeclaration(factoryFunc));

  const header = getGeneratedFileHeader('Custom mutation operations');
  const code = generateCode(statements);

  return {
    fileName: 'mutation/index.ts',
    content: header + '\n' + code,
  };
}

/**
 * Format a CleanTypeRef to GraphQL type string
 */
function formatGraphQLType(typeRef: CleanArgument['type']): string {
  let result = '';

  if (typeRef.kind === 'NON_NULL') {
    if (typeRef.ofType) {
      result = formatGraphQLType(typeRef.ofType as CleanArgument['type']) + '!';
    } else {
      result = (typeRef.name ?? 'String') + '!';
    }
  } else if (typeRef.kind === 'LIST') {
    if (typeRef.ofType) {
      result = `[${formatGraphQLType(typeRef.ofType as CleanArgument['type'])}]`;
    } else {
      result = '[String]';
    }
  } else {
    result = typeRef.name ?? 'String';
  }

  return result;
}
