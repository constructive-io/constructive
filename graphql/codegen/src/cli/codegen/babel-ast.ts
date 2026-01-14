/**
 * Babel AST utilities for code generation
 *
 * Provides helper functions for building TypeScript AST nodes using @babel/types.
 * All code generation uses pure AST - no string concatenation for code bodies.
 */
import generate from '@babel/generator';
import * as t from '@babel/types';

// Re-export for convenience
export { t, generate };

/**
 * Generate code from an array of statements
 * Note: Prettier formatting is applied at file-write time
 */
export function generateCode(statements: t.Statement[]): string {
  const program = t.program(statements);
  // @ts-ignore - Babel types mismatch
  return generate(program).code;
}

/**
 * Create a block comment
 */
export const commentBlock = (value: string): t.CommentBlock => {
  return {
    type: 'CommentBlock',
    value,
    start: null,
    end: null,
    loc: null,
  };
};

/**
 * Create a line comment (// ...)
 */
export const commentLine = (value: string): t.CommentLine => {
  return {
    type: 'CommentLine',
    value,
    start: null,
    end: null,
    loc: null,
  };
};

/**
 * Create a file header comment block (this is the one place we use a string for comments)
 */
export function createFileHeaderComment(description: string): string {
  const timestamp = new Date().toISOString();
  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated: ${timestamp}
 *
 * ${description}
 */`;
}

/**
 * Create a section comment block
 */
export function createSectionComment(title: string): t.Statement {
  const comment = t.emptyStatement();
  t.addComment(comment, 'leading', ` ============================================================================\n// ${title}\n// ============================================================================`, false);
  return comment;
}

/**
 * Add a leading JSDoc comment to a node
 */
export function addJSDocComment<T extends t.Node>(node: T, lines: string[]): T {
  const commentText = lines.length === 1
    ? `* ${lines[0]} `
    : `*\n${lines.map(line => ` * ${line}`).join('\n')}\n `;
  
  if (!node.leadingComments) {
    node.leadingComments = [];
  }
  node.leadingComments.push(commentBlock(commentText));
  return node;
}

/**
 * Add a leading single-line comment to a node
 */
export function addLineComment<T extends t.Node>(node: T, text: string): T {
  if (!node.leadingComments) {
    node.leadingComments = [];
  }
  node.leadingComments.push(commentLine(` ${text}`));
  return node;
}

/**
 * Create an 'as const' assertion
 */
export function asConst(expression: t.Expression): t.TSAsExpression {
  return t.tsAsExpression(
    expression,
    t.tsTypeReference(t.identifier('const'))
  );
}

/**
 * Create an array expression with 'as const'
 */
export function constArray(elements: (t.Expression | t.SpreadElement)[]): t.TSAsExpression {
  return asConst(t.arrayExpression(elements));
}

/**
 * Create a spread element from an expression
 */
export function spread(expression: t.Expression): t.SpreadElement {
  return t.spreadElement(expression);
}

/**
 * Create a member expression (e.g., userKeys.all)
 */
export function member(object: string | t.Expression, property: string): t.MemberExpression {
  const obj = typeof object === 'string' ? t.identifier(object) : object;
  return t.memberExpression(obj, t.identifier(property));
}

/**
 * Create a call expression (e.g., userKeys.lists())
 */
export function call(
  callee: t.Expression,
  args: (t.Expression | t.SpreadElement)[] = []
): t.CallExpression {
  return t.callExpression(callee, args);
}

/**
 * Create a typed parameter for arrow functions
 */
export function typedParam(
  name: string,
  typeAnnotation: t.TSType,
  optional: boolean = false
): t.Identifier {
  const param = t.identifier(name);
  param.typeAnnotation = t.tsTypeAnnotation(typeAnnotation);
  param.optional = optional;
  return param;
}

/**
 * Create a string | number union type
 */
export function stringOrNumberType(): t.TSUnionType {
  return t.tsUnionType([t.tsStringKeyword(), t.tsNumberKeyword()]);
}

/**
 * Create an object type annotation
 */
export function objectType(): t.TSTypeReference {
  return t.tsTypeReference(t.identifier('object'));
}

/**
 * Create a type reference (e.g., UserScope)
 */
export function typeRef(name: string): t.TSTypeReference {
  return t.tsTypeReference(t.identifier(name));
}

/**
 * Create an arrow function expression
 */
export function arrow(
  params: t.Identifier[],
  body: t.Expression | t.BlockStatement
): t.ArrowFunctionExpression {
  return t.arrowFunctionExpression(params, body);
}

/**
 * Create an object property with shorthand or computed key
 */
export function objectProp(
  key: string,
  value: t.Expression,
  shorthand: boolean = false
): t.ObjectProperty {
  return t.objectProperty(t.identifier(key), value, false, shorthand);
}

/**
 * Create an object method (arrow function as property)
 */
export function objectMethod(
  key: string,
  params: t.Identifier[],
  body: t.Expression | t.BlockStatement,
  comment?: string
): t.ObjectProperty {
  const prop = t.objectProperty(
    t.identifier(key),
    arrow(params, body)
  );
  if (comment) {
    addJSDocComment(prop, [comment]);
  }
  return prop;
}

/**
 * Create an exported const declaration
 */
export function exportConst(
  name: string,
  init: t.Expression
): t.ExportNamedDeclaration {
  return t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier(name), init)
    ])
  );
}

/**
 * Create an exported type alias
 */
export function exportType(
  name: string,
  typeAnnotation: t.TSType
): t.ExportNamedDeclaration {
  return t.exportNamedDeclaration(
    t.tsTypeAliasDeclaration(
      t.identifier(name),
      null,
      typeAnnotation
    )
  );
}

/**
 * Create a type alias with object type literal
 */
export function exportObjectType(
  name: string,
  properties: { name: string; type: t.TSType; optional?: boolean }[]
): t.ExportNamedDeclaration {
  const members = properties.map(prop => {
    const signature = t.tsPropertySignature(
      t.identifier(prop.name),
      t.tsTypeAnnotation(prop.type)
    );
    signature.optional = prop.optional ?? false;
    return signature;
  });
  
  return exportType(name, t.tsTypeLiteral(members));
}

/**
 * Create an import declaration
 */
export function importDecl(
  specifiers: string[],
  source: string,
  isType: boolean = false
): t.ImportDeclaration {
  const decl = t.importDeclaration(
    specifiers.map(name => t.importSpecifier(t.identifier(name), t.identifier(name))),
    t.stringLiteral(source)
  );
  decl.importKind = isType ? 'type' : 'value';
  return decl;
}

/**
 * Create an if statement
 */
export function ifStmt(
  test: t.Expression,
  consequent: t.Statement | t.Statement[]
): t.IfStatement {
  const block = Array.isArray(consequent)
    ? t.blockStatement(consequent)
    : t.blockStatement([consequent]);
  return t.ifStatement(test, block);
}

/**
 * Create a return statement
 */
export function returnStmt(argument: t.Expression): t.ReturnStatement {
  return t.returnStatement(argument);
}

/**
 * Create an expression statement
 */
export function exprStmt(expression: t.Expression): t.ExpressionStatement {
  return t.expressionStatement(expression);
}

/**
 * Create an optional chain expression (e.g., scope?.fieldId)
 */
export function optionalMember(object: t.Expression, property: string): t.OptionalMemberExpression {
  return t.optionalMemberExpression(object, t.identifier(property), false, true);
}

/**
 * Create a ternary expression
 */
export function ternary(
  test: t.Expression,
  consequent: t.Expression,
  alternate: t.Expression
): t.ConditionalExpression {
  return t.conditionalExpression(test, consequent, alternate);
}

/**
 * Create an object expression with 'as const'
 */
export function constObject(properties: t.ObjectProperty[]): t.TSAsExpression {
  return asConst(t.objectExpression(properties));
}

/**
 * Create a simple object property with identifier key and value
 */
export function simpleProp(key: string, value: string): t.ObjectProperty {
  return t.objectProperty(t.identifier(key), t.identifier(value));
}

/**
 * Create an object with a single shorthand property { fieldId }
 */
export function shorthandObject(fieldName: string): t.ObjectExpression {
  return t.objectExpression([
    t.objectProperty(t.identifier(fieldName), t.identifier(fieldName), false, true)
  ]);
}

/**
 * Create a QueryClient type reference
 */
export function queryClientType(): t.TSTypeReference {
  return t.tsTypeReference(t.identifier('QueryClient'));
}

/**
 * Create a method call on queryClient (e.g., queryClient.invalidateQueries(...))
 */
export function queryClientCall(
  method: string,
  queryKeyExpr: t.Expression
): t.CallExpression {
  return call(
    member('queryClient', method),
    [t.objectExpression([
      t.objectProperty(t.identifier('queryKey'), queryKeyExpr)
    ])]
  );
}

/**
 * Create a block statement from statements
 */
export function block(statements: t.Statement[]): t.BlockStatement {
  return t.blockStatement(statements);
}

/**
 * Create keyof typeof expression
 */
export function keyofTypeof(name: string): t.TSTypeOperator {
  const typeofOp = t.tsTypeOperator(t.tsTypeReference(t.identifier(name)));
  typeofOp.operator = 'typeof';
  
  const keyofOp = t.tsTypeOperator(typeofOp);
  keyofOp.operator = 'keyof';
  
  return keyofOp;
}
