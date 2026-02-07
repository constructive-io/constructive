/**
 * Custom mutation hook generators for non-table operations (Babel AST-based)
 *
 * Generates hooks for operations discovered via schema introspection
 * that are NOT table CRUD operations (e.g., login, register, etc.)
 *
 * Delegates to ORM custom mutation operations:
 *   getClient().mutation.operationName(args, { select }).unwrap()
 *
 * Output structure:
 * mutations/
 *   useLoginMutation.ts
 *   useRegisterMutation.ts
 *   ...
 */
import * as t from '@babel/types';

import type {
  CleanOperation,
  TypeRegistry
} from '../../types/schema';
import {
  buildSelectionArgsCall,
  callExpr,
  constDecl,
  createFunctionParam,
  createImportDeclaration,
  createSTypeParam,
  createTypeReExport,
  customSelectResultTypeLiteral,
  destructureParamsWithSelection,
  exportDeclareFunction,
  exportFunction,
  generateHookFileCode,
  getClientCustomCallUnwrap,
  objectProp,
  omitType,
  returnUseMutation,
  selectionConfigType,
  spreadObj,
  sRef,
  typeRef,
  useMutationOptionsType,
  useMutationResultType,
  voidStatement
} from './hooks-ast';
import {
  getSelectTypeName
} from './select-helpers';
import {
  createTypeTracker,
  getOperationFileName,
  getOperationHookName,
  getTypeBaseName,
  typeRefToTsType
} from './type-resolver';
import { ucFirst } from './utils';

export interface GeneratedCustomMutationFile {
  fileName: string;
  content: string;
  operationName: string;
}

export interface GenerateCustomMutationHookOptions {
  operation: CleanOperation;
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateCustomMutationHook(
  options: GenerateCustomMutationHookOptions
): GeneratedCustomMutationFile | null {
  const { operation, reactQueryEnabled = true } = options;

  if (!reactQueryEnabled) {
    return null;
  }

  try {
    return generateCustomMutationHookInternal(options);
  } catch (err) {
    console.error(`Error generating hook for mutation: ${operation.name}`);
    console.error(`  Args: ${operation.args.length}, Return type: ${operation.returnType.kind}/${operation.returnType.name}`);
    throw err;
  }
}

function generateCustomMutationHookInternal(
  options: GenerateCustomMutationHookOptions
): GeneratedCustomMutationFile {
  const {
    operation,
    typeRegistry,
    tableTypeNames,
    useCentralizedKeys = true
  } = options;

  const hookName = getOperationHookName(operation.name, 'mutation');
  const fileName = getOperationFileName(operation.name, 'mutation');
  const varTypeName = `${ucFirst(operation.name)}Variables`;

  const tracker = createTypeTracker({ tableTypeNames });

  const hasArgs = operation.args.length > 0;

  typeRefToTsType(operation.returnType, tracker);
  for (const arg of operation.args) {
    typeRefToTsType(arg.type, tracker);
  }

  const selectTypeName = getSelectTypeName(operation.returnType);
  const payloadTypeName = getTypeBaseName(operation.returnType);
  const hasSelect = !!selectTypeName && !!payloadTypeName;

  const statements: t.Statement[] = [];

  // Imports
  statements.push(createImportDeclaration('@tanstack/react-query', ['useMutation']));
  statements.push(createImportDeclaration('@tanstack/react-query', ['UseMutationOptions', 'UseMutationResult'], true));
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(createImportDeclaration('../selection', ['buildSelectionArgs']));
  statements.push(createImportDeclaration('../selection', ['SelectionConfig'], true));

  if (useCentralizedKeys) {
    statements.push(createImportDeclaration('../mutation-keys', ['customMutationKeys']));
  }

  if (hasArgs) {
    statements.push(createImportDeclaration('../../orm/mutation', [varTypeName], true));
  }

  const inputTypeImports: string[] = [];
  if (hasSelect) {
    inputTypeImports.push(selectTypeName!);
    inputTypeImports.push(payloadTypeName!);
  } else {
    for (const refType of tracker.referencedTypes) {
      if (!inputTypeImports.includes(refType)) {
        inputTypeImports.push(refType);
      }
    }
  }
  if (inputTypeImports.length > 0) {
    statements.push(createImportDeclaration('../../orm/input-types', inputTypeImports, true));
  }

  if (hasSelect) {
    statements.push(createImportDeclaration('../../orm/select-types', ['InferSelectResult', 'StrictSelect'], true));
  }

  // Re-exports
  if (hasArgs) {
    statements.push(createTypeReExport([varTypeName], '../../orm/mutation'));
  }
  if (hasSelect) {
    statements.push(createTypeReExport([selectTypeName!], '../../orm/input-types'));
  }

  // Hook
  if (hasSelect) {
    const mutationVarType: t.TSType = hasArgs ? typeRef(varTypeName) : t.tsVoidKeyword();

    const selectedResultType = (sel: t.TSType) =>
      customSelectResultTypeLiteral(operation.name, operation.returnType, payloadTypeName!, sel);

    // Overload 1: with selection.fields
    const o1ParamType = t.tsIntersectionType([
      t.tsTypeLiteral([
        t.tsPropertySignature(
          t.identifier('selection'),
          t.tsTypeAnnotation(
            t.tsParenthesizedType(
              t.tsIntersectionType([
                t.tsTypeLiteral([
                  t.tsPropertySignature(t.identifier('fields'), t.tsTypeAnnotation(sRef()))
                ]),
                typeRef('StrictSelect', [sRef(), typeRef(selectTypeName!)])
              ])
            )
          )
        )
      ]),
      useMutationOptionsType(selectedResultType(sRef()), mutationVarType)
    ]);
    statements.push(
      exportDeclareFunction(
        hookName,
        createSTypeParam(selectTypeName!),
        [createFunctionParam('params', o1ParamType)],
        useMutationResultType(selectedResultType(sRef()), mutationVarType)
      )
    );

    // Implementation
    const implSelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName!)))
    );
    const implParamType = t.tsIntersectionType([
      t.tsTypeLiteral([implSelProp]),
      omitType(
        typeRef('UseMutationOptions', [t.tsAnyKeyword(), typeRef('Error'), mutationVarType]),
        ['mutationFn']
      )
    ]);

    const body: t.Statement[] = [];
    body.push(buildSelectionArgsCall(selectTypeName!));
    body.push(destructureParamsWithSelection('mutationOptions'));
    body.push(voidStatement('_selection'));

    const mutationKeyExpr = useCentralizedKeys
      ? callExpr(
        t.memberExpression(t.identifier('customMutationKeys'), t.identifier(operation.name)),
        []
      )
      : undefined;

    const selectObj = t.objectExpression([objectProp('select', t.memberExpression(t.identifier('args'), t.identifier('select')))]);

    let mutationFnExpr: t.Expression;
    if (hasArgs) {
      const variablesParam = createFunctionParam('variables', typeRef(varTypeName));
      mutationFnExpr = t.arrowFunctionExpression(
        [variablesParam],
        getClientCustomCallUnwrap('mutation', operation.name, [t.identifier('variables')], selectObj)
      );
    } else {
      mutationFnExpr = t.arrowFunctionExpression(
        [],
        getClientCustomCallUnwrap('mutation', operation.name, [], selectObj)
      );
    }

    body.push(
      returnUseMutation(
        mutationFnExpr,
        [spreadObj(t.identifier('mutationOptions'))],
        mutationKeyExpr
      )
    );

    statements.push(exportFunction(hookName, null, [createFunctionParam('params', implParamType, true)], body));
  } else {
    // Without select: simple hook (scalar return type)
    const resultTypeStr = typeRefToTsType(operation.returnType, tracker);
    const resultTypeLiteral = t.tsTypeLiteral([
      t.tsPropertySignature(
        t.identifier(operation.name),
        t.tsTypeAnnotation(typeRef(resultTypeStr))
      )
    ]);
    const mutationVarType: t.TSType = hasArgs ? typeRef(varTypeName) : t.tsVoidKeyword();

    const optionsType = omitType(
      typeRef('UseMutationOptions', [resultTypeLiteral, typeRef('Error'), mutationVarType]),
      ['mutationFn']
    );

    const body: t.Statement[] = [];
    body.push(constDecl('mutationOptions', t.logicalExpression('??', t.identifier('params'), t.objectExpression([]))));

    const mutationKeyExpr = useCentralizedKeys
      ? callExpr(
        t.memberExpression(t.identifier('customMutationKeys'), t.identifier(operation.name)),
        []
      )
      : undefined;

    let mutationFnExpr: t.Expression;
    if (hasArgs) {
      const variablesParam = createFunctionParam('variables', typeRef(varTypeName));
      mutationFnExpr = t.arrowFunctionExpression(
        [variablesParam],
        getClientCustomCallUnwrap('mutation', operation.name, [t.identifier('variables')])
      );
    } else {
      mutationFnExpr = t.arrowFunctionExpression(
        [],
        getClientCustomCallUnwrap('mutation', operation.name, [])
      );
    }

    body.push(
      returnUseMutation(
        mutationFnExpr,
        [spreadObj(t.identifier('mutationOptions'))],
        mutationKeyExpr
      )
    );

    statements.push(exportFunction(hookName, null, [createFunctionParam('params', optionsType, true)], body));
  }

  const content = generateHookFileCode(`Custom mutation hook for ${operation.name}`, statements);

  return {
    fileName,
    content,
    operationName: operation.name
  };
}

export interface GenerateAllCustomMutationHooksOptions {
  operations: CleanOperation[];
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateAllCustomMutationHooks(
  options: GenerateAllCustomMutationHooksOptions
): GeneratedCustomMutationFile[] {
  const {
    operations,
    typeRegistry,
    maxDepth = 2,
    skipQueryField = true,
    reactQueryEnabled = true,
    tableTypeNames,
    useCentralizedKeys = true
  } = options;

  return operations
    .filter((op) => op.kind === 'mutation')
    .map((operation) =>
      generateCustomMutationHook({
        operation,
        typeRegistry,
        maxDepth,
        skipQueryField,
        reactQueryEnabled,
        tableTypeNames,
        useCentralizedKeys
      })
    )
    .filter((result): result is GeneratedCustomMutationFile => result !== null);
}
