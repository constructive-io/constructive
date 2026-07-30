import type { GraphQLSchema } from 'graphql';

import { createAttributeInflector } from './inflection-utils';
import { buildFieldMeta } from './type-mappings';
import type {
  FieldMeta,
  MetaBuild,
  PgAttribute,
  PgCodec,
  PgTableResource,
} from './types';

export type AttributeInflector = (attrName: string, codec: PgCodec) => string;

export interface BuildContext {
  build: MetaBuild;
  inflectAttr: AttributeInflector;
  schema?: GraphQLSchema;
}

export type TableResourceWithCodec = PgTableResource & {
  codec: PgCodec & { attributes: Record<string, PgAttribute> };
};

export function createBuildContext(
  build: MetaBuild,
  schema?: GraphQLSchema,
): BuildContext {
  return {
    build,
    inflectAttr: createAttributeInflector(build.inflection),
    schema,
  };
}

export function buildFieldList(
  attrNames: string[],
  codec: PgCodec,
  attributes: Record<string, PgAttribute>,
  context: BuildContext,
): FieldMeta[] {
  return attrNames.map((attrName) =>
    buildFieldMeta(
      context.inflectAttr(attrName, codec),
      attributes[attrName],
      context.build,
      { columnName: attrName },
    ),
  );
}
