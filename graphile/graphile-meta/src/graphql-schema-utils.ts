import {
  getNamedType,
  type GraphQLInterfaceType,
  type GraphQLObjectType,
  type GraphQLSchema,
  isInterfaceType,
  isObjectType,
} from 'graphql';

export type GraphQLFieldContainer = GraphQLObjectType | GraphQLInterfaceType;

export interface FieldCandidate {
  name: string | null | undefined;
  typeName: string | null | undefined;
}

export interface ExecutableField {
  name: string;
  typeName: string;
}

export function getFieldContainerType(
  schema: GraphQLSchema | undefined,
  typeName: string
): GraphQLFieldContainer | null {
  if (!schema) return null;
  const type = schema.getType(typeName);
  return type && (isObjectType(type) || isInterfaceType(type)) ? type : null;
}

export function findExecutableField(
  parent: GraphQLFieldContainer | null | undefined,
  candidates: FieldCandidate[]
): ExecutableField | null {
  if (!parent) return null;
  const fields = parent.getFields();

  for (const candidate of candidates) {
    if (!candidate.name || !candidate.typeName) continue;
    const field = fields[candidate.name];
    if (!field) continue;

    const typeName = getNamedType(field.type).name;
    if (typeName === candidate.typeName) {
      return { name: candidate.name, typeName };
    }
  }

  return null;
}
