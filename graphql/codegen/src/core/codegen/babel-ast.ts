/**
 * Babel AST utilities for code generation
 *
 * Provides minimal helper functions for building TypeScript AST nodes.
 * Use raw t.* calls for most operations - only helpers that provide
 * real value beyond simple wrapping are included here.
 */
import generate from '@babel/generator';
import * as t from '@babel/types';

// Re-export for convenience
export { generate, t };

/**
 * Generate code from an array of statements
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
 * Create a line comment
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
 * Add a leading JSDoc comment to a node
 */
export function addJSDocComment<T extends t.Node>(node: T, lines: string[]): T {
  const commentText =
    lines.length === 1
      ? `* ${lines[0]} `
      : `*\n${lines.map((line) => ` * ${line}`).join('\n')}\n `;

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
 * Create an 'as const' assertion - common pattern worth abstracting
 */
export function asConst(expression: t.Expression): t.TSAsExpression {
  return t.tsAsExpression(expression, t.tsTypeReference(t.identifier('const')));
}

/**
 * Create an array expression with 'as const' - very common pattern
 */
export function constArray(
  elements: (t.Expression | t.SpreadElement)[],
): t.TSAsExpression {
  return asConst(t.arrayExpression(elements));
}

/**
 * Create a typed parameter - saves boilerplate for type annotations
 */
export function typedParam(
  name: string,
  typeAnnotation: t.TSType,
  optional: boolean = false,
): t.Identifier {
  const param = t.identifier(name);
  param.typeAnnotation = t.tsTypeAnnotation(typeAnnotation);
  param.optional = optional;
  return param;
}

/**
 * Create keyof typeof expression - complex nested type operators
 */
export function keyofTypeof(name: string): t.TSTypeOperator {
  const typeofOp = t.tsTypeOperator(t.tsTypeReference(t.identifier(name)));
  typeofOp.operator = 'typeof';

  const keyofOp = t.tsTypeOperator(typeofOp);
  keyofOp.operator = 'keyof';

  return keyofOp;
}

/**
 * Create a call expression with TypeScript type parameters
 *
 * This is used to generate typed function calls like:
 * execute<ResultType, VariablesType>(document, variables)
 */
export function createTypedCallExpression(
  callee: t.Expression,
  args: (t.Expression | t.SpreadElement)[],
  typeParams: t.TSType[],
): t.CallExpression {
  const call = t.callExpression(callee, args);
  if (typeParams.length > 0) {
    // @ts-ignore - Babel types support typeParameters on CallExpression for TS
    call.typeParameters = t.tsTypeParameterInstantiation(typeParams);
  }
  return call;
}
