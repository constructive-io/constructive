/**
 * Babel AST utilities for code generation
 *
 * Provides minimal helper functions for building TypeScript AST nodes.
 * Use raw t.* calls for most operations - only helpers that provide
 * real value beyond simple wrapping are included here.
 */
import generate from '@babel/generator';
import * as t from '@babel/types';

import type { TypeRef } from '../../types/schema';
import { scalarToTsType } from './scalars';
import { getTypeBaseName, isTypeList } from './type-resolver';

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
  const sanitized = lines.map((line) => line.replace(/\*\//g, '*\\/'));
  const commentText =
    sanitized.length === 1
      ? `* ${sanitized[0]} `
      : `*\n${sanitized.map((line) => ` * ${line}`).join('\n')}\n `;

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
/**
 * Map a TypeScript primitive name (as emitted by `scalarToTsType`) to a Babel TSType node.
 * Recognised primitives: `string`, `number`, `boolean`, `unknown`. Anything else is
 * emitted as a type reference (covers `File`, `Date`, custom type names, etc.).
 */
export function tsTypeFromPrimitive(typeName: string): t.TSType {
  if (typeName === 'string') return t.tsStringKeyword();
  if (typeName === 'number') return t.tsNumberKeyword();
  if (typeName === 'boolean') return t.tsBooleanKeyword();
  if (typeName === 'unknown') return t.tsUnknownKeyword();
  return t.tsTypeReference(t.identifier(typeName));
}

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
 * Convert a GraphQL TypeRef into a Babel TS type node.
 * Handles scalar mapping, unknown fallback, and list-wrapping.
 */
export function typeRefToBabelType(typeRef: TypeRef): t.TSType {
  const baseName = getTypeBaseName(typeRef) ?? 'unknown';
  const tsType = tsTypeFromPrimitive(scalarToTsType(baseName, { unknownScalar: 'name' }));
  return isTypeList(typeRef) ? t.tsArrayType(tsType) : tsType;
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
