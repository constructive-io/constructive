import * as t from '@babel/types';

import type { CleanArgument, CleanTypeRef } from '../../../types/schema';

function unwrapNonNull(typeRef: CleanTypeRef): { inner: CleanTypeRef; required: boolean } {
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return { inner: typeRef.ofType, required: true };
  }
  return { inner: typeRef, required: false };
}

function resolveBaseType(typeRef: CleanTypeRef): CleanTypeRef {
  if ((typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') && typeRef.ofType) {
    return resolveBaseType(typeRef.ofType);
  }
  return typeRef;
}

export function buildQuestionObject(arg: CleanArgument): t.ObjectExpression {
  const { inner, required } = unwrapNonNull(arg.type);
  const base = resolveBaseType(arg.type);
  const props: t.ObjectProperty[] = [];

  if (base.kind === 'ENUM' && base.enumValues && base.enumValues.length > 0) {
    props.push(
      t.objectProperty(t.identifier('type'), t.stringLiteral('autocomplete')),
    );
    props.push(
      t.objectProperty(t.identifier('name'), t.stringLiteral(arg.name)),
    );
    props.push(
      t.objectProperty(
        t.identifier('message'),
        t.stringLiteral(arg.description || arg.name),
      ),
    );
    props.push(
      t.objectProperty(
        t.identifier('options'),
        t.arrayExpression(base.enumValues.map((v) => t.stringLiteral(v))),
      ),
    );
  } else if (base.kind === 'SCALAR' && base.name === 'Boolean') {
    props.push(
      t.objectProperty(t.identifier('type'), t.stringLiteral('confirm')),
    );
    props.push(
      t.objectProperty(t.identifier('name'), t.stringLiteral(arg.name)),
    );
    props.push(
      t.objectProperty(
        t.identifier('message'),
        t.stringLiteral(arg.description || arg.name),
      ),
    );
    props.push(
      t.objectProperty(t.identifier('default'), t.booleanLiteral(false)),
    );
  } else if (
    base.kind === 'SCALAR' &&
    (base.name === 'Int' || base.name === 'Float')
  ) {
    props.push(
      t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
    );
    props.push(
      t.objectProperty(t.identifier('name'), t.stringLiteral(arg.name)),
    );
    props.push(
      t.objectProperty(
        t.identifier('message'),
        t.stringLiteral(arg.description || `${arg.name} (number)`),
      ),
    );
  } else if (inner.kind === 'INPUT_OBJECT' && inner.inputFields) {
    return buildInputObjectQuestion(arg.name, inner, required);
  } else {
    props.push(
      t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
    );
    props.push(
      t.objectProperty(t.identifier('name'), t.stringLiteral(arg.name)),
    );
    props.push(
      t.objectProperty(
        t.identifier('message'),
        t.stringLiteral(arg.description || arg.name),
      ),
    );
  }

  if (required) {
    props.push(
      t.objectProperty(t.identifier('required'), t.booleanLiteral(true)),
    );
  }

  return t.objectExpression(props);
}

function buildInputObjectQuestion(
  _name: string,
  typeRef: CleanTypeRef,
  _required: boolean,
): t.ObjectExpression {
  if (typeRef.inputFields && typeRef.inputFields.length > 0) {
    const firstField = typeRef.inputFields[0];
    return buildQuestionObject(firstField);
  }
  return t.objectExpression([
    t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
    t.objectProperty(t.identifier('name'), t.stringLiteral(_name)),
    t.objectProperty(
      t.identifier('message'),
      t.stringLiteral(_name),
    ),
  ]);
}

export function buildQuestionsArray(args: CleanArgument[]): t.ArrayExpression {
  const questions: t.Expression[] = [];
  for (const arg of args) {
    const base = resolveBaseType(arg.type);
    const { inner } = unwrapNonNull(arg.type);

    if (inner.kind === 'INPUT_OBJECT' && inner.inputFields) {
      for (const field of inner.inputFields) {
        questions.push(buildQuestionObject(field));
      }
    } else if (base.kind === 'INPUT_OBJECT' && base.inputFields) {
      for (const field of base.inputFields) {
        questions.push(buildQuestionObject(field));
      }
    } else {
      questions.push(buildQuestionObject(arg));
    }
  }
  return t.arrayExpression(questions);
}
