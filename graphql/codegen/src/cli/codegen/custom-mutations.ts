/**
 * Custom mutation hook generators for non-table operations
 *
 * Generates hooks for operations discovered via schema introspection
 * that are NOT table CRUD operations (e.g., login, register, etc.)
 *
 * Output structure:
 * mutations/
 *   useLoginMutation.ts
 *   useRegisterMutation.ts
 *   ...
 */
import type {
  CleanOperation,
  CleanArgument,
  TypeRegistry,
} from '../../types/schema';
import * as t from '@babel/types';
import { generateCode, addJSDocComment, typedParam, createTypedCallExpression } from './babel-ast';
import { buildCustomMutationString } from './schema-gql-ast';
import {
  typeRefToTsType,
  isTypeRequired,
  getOperationHookName,
  getOperationFileName,
  getOperationVariablesTypeName,
  getOperationResultTypeName,
  getDocumentConstName,
  createTypeTracker,
  type TypeTracker,
} from './type-resolver';
import { getGeneratedFileHeader } from './utils';

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

interface VariablesProp {
  name: string;
  type: string;
  optional: boolean;
  docs?: string[];
}

function generateVariablesProperties(
  args: CleanArgument[],
  tracker?: TypeTracker
): VariablesProp[] {
  return args.map((arg) => ({
    name: arg.name,
    type: typeRefToTsType(arg.type, tracker),
    optional: !isTypeRequired(arg.type),
    docs: arg.description ? [arg.description] : undefined,
  }));
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
    maxDepth = 2,
    skipQueryField = true,
    tableTypeNames,
    useCentralizedKeys = true,
  } = options;

  const hookName = getOperationHookName(operation.name, 'mutation');
  const fileName = getOperationFileName(operation.name, 'mutation');
  const variablesTypeName = getOperationVariablesTypeName(operation.name, 'mutation');
  const resultTypeName = getOperationResultTypeName(operation.name, 'mutation');
  const documentConstName = getDocumentConstName(operation.name, 'mutation');

  const tracker = createTypeTracker({ tableTypeNames });

  const mutationDocument = buildCustomMutationString({
    operation,
    typeRegistry,
    maxDepth,
    skipQueryField,
  });

  const statements: t.Statement[] = [];

  const variablesProps =
    operation.args.length > 0
      ? generateVariablesProperties(operation.args, tracker)
      : [];

  const resultType = typeRefToTsType(operation.returnType, tracker);

  const schemaTypes = tracker.getImportableTypes();
  const tableTypes = tracker.getTableTypes();

  const reactQueryImport = t.importDeclaration(
    [t.importSpecifier(t.identifier('useMutation'), t.identifier('useMutation'))],
    t.stringLiteral('@tanstack/react-query')
  );
  statements.push(reactQueryImport);

  const reactQueryTypeImport = t.importDeclaration(
    [t.importSpecifier(t.identifier('UseMutationOptions'), t.identifier('UseMutationOptions'))],
    t.stringLiteral('@tanstack/react-query')
  );
  reactQueryTypeImport.importKind = 'type';
  statements.push(reactQueryTypeImport);

  const clientImport = t.importDeclaration(
    [t.importSpecifier(t.identifier('execute'), t.identifier('execute'))],
    t.stringLiteral('../client')
  );
  statements.push(clientImport);

  if (tableTypes.length > 0) {
    const typesImport = t.importDeclaration(
      tableTypes.map((tt) => t.importSpecifier(t.identifier(tt), t.identifier(tt))),
      t.stringLiteral('../types')
    );
    typesImport.importKind = 'type';
    statements.push(typesImport);
  }

  if (schemaTypes.length > 0) {
    const schemaTypesImport = t.importDeclaration(
      schemaTypes.map((st) => t.importSpecifier(t.identifier(st), t.identifier(st))),
      t.stringLiteral('../schema-types')
    );
    schemaTypesImport.importKind = 'type';
    statements.push(schemaTypesImport);
  }

  if (useCentralizedKeys) {
    const mutationKeyImport = t.importDeclaration(
      [t.importSpecifier(t.identifier('customMutationKeys'), t.identifier('customMutationKeys'))],
      t.stringLiteral('../mutation-keys')
    );
    statements.push(mutationKeyImport);
  }

  const mutationDocConst = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier(documentConstName),
      t.templateLiteral(
        [t.templateElement({ raw: '\n' + mutationDocument, cooked: '\n' + mutationDocument }, true)],
        []
      )
    ),
  ]);
  const mutationDocExport = t.exportNamedDeclaration(mutationDocConst);
  addJSDocComment(mutationDocExport, ['GraphQL mutation document']);
  statements.push(mutationDocExport);

  if (operation.args.length > 0) {
    const variablesInterfaceProps = variablesProps.map((vp) => {
      const prop = t.tsPropertySignature(
        t.identifier(vp.name),
        t.tsTypeAnnotation(t.tsTypeReference(t.identifier(vp.type)))
      );
      prop.optional = vp.optional;
      return prop;
    });
    const variablesInterface = t.tsInterfaceDeclaration(
      t.identifier(variablesTypeName),
      null,
      null,
      t.tsInterfaceBody(variablesInterfaceProps)
    );
    statements.push(t.exportNamedDeclaration(variablesInterface));
  }

  const resultInterfaceBody = t.tsInterfaceBody([
    t.tsPropertySignature(
      t.identifier(operation.name),
      t.tsTypeAnnotation(t.tsTypeReference(t.identifier(resultType)))
    ),
  ]);
  const resultInterface = t.tsInterfaceDeclaration(
    t.identifier(resultTypeName),
    null,
    null,
    resultInterfaceBody
  );
  statements.push(t.exportNamedDeclaration(resultInterface));

  const hasArgs = operation.args.length > 0;

  const hookBodyStatements: t.Statement[] = [];
  const mutationOptions: (t.ObjectProperty | t.SpreadElement)[] = [];

  if (useCentralizedKeys) {
    mutationOptions.push(
      t.objectProperty(
        t.identifier('mutationKey'),
        t.callExpression(
          t.memberExpression(t.identifier('customMutationKeys'), t.identifier(operation.name)),
          []
        )
      )
    );
  }

  if (hasArgs) {
    mutationOptions.push(
      t.objectProperty(
        t.identifier('mutationFn'),
        t.arrowFunctionExpression(
          [typedParam('variables', t.tsTypeReference(t.identifier(variablesTypeName)))],
          createTypedCallExpression(
            t.identifier('execute'),
            [t.identifier(documentConstName), t.identifier('variables')],
            [
              t.tsTypeReference(t.identifier(resultTypeName)),
              t.tsTypeReference(t.identifier(variablesTypeName)),
            ]
          )
        )
      )
    );
  } else {
    mutationOptions.push(
      t.objectProperty(
        t.identifier('mutationFn'),
        t.arrowFunctionExpression(
          [],
          createTypedCallExpression(
            t.identifier('execute'),
            [t.identifier(documentConstName)],
            [t.tsTypeReference(t.identifier(resultTypeName))]
          )
        )
      )
    );
  }

  mutationOptions.push(t.spreadElement(t.identifier('options')));

  hookBodyStatements.push(
    t.returnStatement(
      t.callExpression(t.identifier('useMutation'), [t.objectExpression(mutationOptions)])
    )
  );

  const optionsType = hasArgs
    ? `Omit<UseMutationOptions<${resultTypeName}, Error, ${variablesTypeName}>, 'mutationFn'>`
    : `Omit<UseMutationOptions<${resultTypeName}, Error, void>, 'mutationFn'>`;

  const optionsParam = t.identifier('options');
  optionsParam.optional = true;
  optionsParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(optionsType)));

  const hookFunc = t.functionDeclaration(
    t.identifier(hookName),
    [optionsParam],
    t.blockStatement(hookBodyStatements)
  );
  const hookExport = t.exportNamedDeclaration(hookFunc);
  statements.push(hookExport);

  const code = generateCode(statements);
  const content = getGeneratedFileHeader(`Custom mutation hook for ${operation.name}`) + '\n\n' + code;

  return {
    fileName,
    content,
    operationName: operation.name,
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
    useCentralizedKeys = true,
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
        useCentralizedKeys,
      })
    )
    .filter((result): result is GeneratedCustomMutationFile => result !== null);
}
