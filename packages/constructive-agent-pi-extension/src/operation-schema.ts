import { Type, type TSchema } from '@sinclair/typebox';

export type OperationVariableScalar =
  | 'id'
  | 'string'
  | 'int'
  | 'float'
  | 'boolean'
  | 'json';

export interface OperationVariableArrayType {
  arrayOf: OperationVariableType;
}

export type OperationVariableType =
  | OperationVariableScalar
  | OperationVariableArrayType;

export interface OperationVariableSpec {
  type: OperationVariableType;
  description?: string;
  nullable?: boolean;
}

export interface OperationParametersSchemaOptions {
  additionalProperties?: boolean;
}

const scalarToSchema = (
  scalar: OperationVariableScalar,
  description?: string,
): TSchema => {
  switch (scalar) {
    case 'id':
    case 'string':
      return Type.String(
        description ? { description } : undefined,
      );
    case 'int':
      return Type.Integer(
        description ? { description } : undefined,
      );
    case 'float':
      return Type.Number(
        description ? { description } : undefined,
      );
    case 'boolean':
      return Type.Boolean(
        description ? { description } : undefined,
      );
    case 'json':
      return Type.Any(
        description ? { description } : undefined,
      );
    default: {
      const exhaustiveCheck: never = scalar;
      throw new Error(`Unsupported scalar type: ${String(exhaustiveCheck)}`);
    }
  }
};

const specToSchema = (spec: OperationVariableSpec): TSchema => {
  const baseSchema =
    typeof spec.type === 'string'
      ? scalarToSchema(spec.type, spec.description)
      : Type.Array(
          specToSchema({
            type: spec.type.arrayOf,
            description: spec.description,
          }),
          spec.description ? { description: spec.description } : undefined,
        );

  if (spec.nullable) {
    return Type.Union([baseSchema, Type.Null()]);
  }

  return baseSchema;
};

export function createOperationParametersSchema(
  variables: Record<string, OperationVariableSpec>,
  options: OperationParametersSchemaOptions = {},
): TSchema {
  const properties: Record<string, TSchema> = {};

  for (const [name, spec] of Object.entries(variables)) {
    const baseSchema = specToSchema(spec);
    properties[name] = spec.nullable ? Type.Optional(baseSchema) : baseSchema;
  }

  return Type.Object(properties, {
    additionalProperties: options.additionalProperties ?? false,
  });
}
