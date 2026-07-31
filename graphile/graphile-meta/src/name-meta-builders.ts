import type { GraphQLSchema } from 'graphql';

import { findExecutableField } from './graphql-schema-utils';
import { fallbackTableType, safeInflection } from './inflection-utils';
import type {
  InflectionMeta,
  MetaBuild,
  PgCodec,
  PgTableResource,
  PgUnique,
  QueryMeta,
} from './types';

export function resolveTableType(build: MetaBuild, codec: PgCodec): string {
  return safeInflection(
    () => build.inflection.tableType(codec),
    fallbackTableType(codec.name),
  );
}

export function buildInflectionMeta(
  resource: PgTableResource,
  tableType: string,
  build: MetaBuild,
  query?: QueryMeta,
): InflectionMeta {
  const inflection = build.inflection;
  const codec = resource.codec;
  return {
    tableType,
    allRows:
      query?.all ??
      safeInflection(
        () => inflection.allRows?.(resource),
        `${tableType.toLowerCase()}s`,
      ),
    connection: safeInflection(
      () =>
        (codec && inflection.tableConnectionType?.(codec)) ??
        inflection.connectionType?.(tableType),
      `${tableType}Connection`,
    ),
    edge: safeInflection(
      () =>
        (codec && inflection.tableEdgeType?.(codec)) ??
        inflection.edgeType?.(tableType),
      `${tableType}Edge`,
    ),
    filterType: safeInflection(
      () => inflection.filterType?.(tableType),
      `${tableType}Filter`,
    ),
    orderByType: safeInflection(
      () => inflection.orderByType?.(tableType),
      `${tableType}OrderBy`,
    ),
    conditionType: safeInflection(
      () => inflection.conditionType?.(tableType),
      `${tableType}Condition`,
    ),
    patchType: safeInflection(
      () => inflection.patchType?.(tableType),
      `${tableType}Patch`,
    ),
    createInputType: safeInflection(
      () => inflection.createInputType?.(resource),
      `Create${tableType}Input`,
    ),
    createPayloadType: safeInflection(
      () => inflection.createPayloadType?.(resource),
      `Create${tableType}Payload`,
    ),
    updatePayloadType: safeInflection(
      () => inflection.updatePayloadType?.({ resource }),
      `Update${tableType}Payload`,
    ),
    deletePayloadType: safeInflection(
      () => inflection.deletePayloadType?.({ resource }),
      `Delete${tableType}Payload`,
    ),
  };
}

export function buildQueryMeta(
  resource: PgTableResource,
  uniques: PgUnique[],
  tableType: string,
  build: MetaBuild,
  schema?: GraphQLSchema,
): QueryMeta {
  const inflection = build.inflection;
  const hasPrimaryKey = uniques.some((unique) => unique.isPrimary);

  if (schema) {
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();
    const codec = resource.codec;
    const connectionType = codec
      ? safeInflection(
        () => inflection.tableConnectionType?.(codec),
        `${tableType}Connection`,
      )
      : null;
    const orderedUniques = [...uniques].sort(
      (left, right) => Number(!!right.isPrimary) - Number(!!left.isPrimary),
    );

    const all = findExecutableField(queryType, [
      {
        name: safeInflection(
          () => inflection.allRowsConnection?.(resource),
          null,
        ),
        typeName: connectionType,
      },
      {
        name: safeInflection(() => inflection.allRowsList?.(resource), null),
        typeName: tableType,
      },
    ]);
    const one = findExecutableField(
      queryType,
      orderedUniques.map((unique) => ({
        name: safeInflection(
          () => inflection.rowByUnique?.({ resource, unique }),
          null,
        ),
        typeName: tableType,
      })),
    );
    const createPayloadType = safeInflection(
      () => inflection.createPayloadType?.(resource),
      `Create${tableType}Payload`,
    );
    const create = findExecutableField(mutationType, [
      {
        name: safeInflection(() => inflection.createField?.(resource), null),
        typeName: createPayloadType,
      },
    ]);
    const updatePayloadType = safeInflection(
      () => inflection.updatePayloadType?.({ resource }),
      `Update${tableType}Payload`,
    );
    const update = findExecutableField(
      mutationType,
      orderedUniques.map((unique) => ({
        name: safeInflection(
          () => inflection.updateByKeysField?.({ resource, unique }),
          null,
        ),
        typeName: updatePayloadType,
      })),
    );
    const deletePayloadType = safeInflection(
      () => inflection.deletePayloadType?.({ resource }),
      `Delete${tableType}Payload`,
    );
    const deleteField = findExecutableField(
      mutationType,
      orderedUniques.map((unique) => ({
        name: safeInflection(
          () => inflection.deleteByKeysField?.({ resource, unique }),
          null,
        ),
        typeName: deletePayloadType,
      })),
    );

    return {
      all: all?.name ?? null,
      one: one?.name ?? null,
      create: create?.name ?? null,
      update: update?.name ?? null,
      delete: deleteField?.name ?? null,
    };
  }

  return {
    all: safeInflection(
      () => inflection.allRows?.(resource),
      `${tableType.toLowerCase()}s`,
    ),
    one: hasPrimaryKey
      ? safeInflection(
        () => inflection.tableFieldName?.(resource),
        tableType.toLowerCase(),
      )
      : null,
    create: safeInflection(
      () => inflection.createField?.(resource),
      `create${tableType}`,
    ),
    update: hasPrimaryKey
      ? safeInflection(
        () => inflection.updateByKeys?.(resource),
        `update${tableType}`,
      )
      : null,
    delete: hasPrimaryKey
      ? safeInflection(
        () => inflection.deleteByKeys?.(resource),
        `delete${tableType}`,
      )
      : null,
  };
}
