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
): InflectionMeta {
  const inflection = build.inflection;
  return {
    tableType,
    allRows: safeInflection(
      () => inflection.allRows?.(resource),
      `${tableType.toLowerCase()}s`,
    ),
    connection: safeInflection(
      () => inflection.connectionType?.(tableType),
      `${tableType}Connection`,
    ),
    edge: safeInflection(
      () => inflection.edgeType?.(tableType),
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
      () => inflection.updatePayloadType?.(resource),
      `Update${tableType}Payload`,
    ),
    deletePayloadType: safeInflection(
      () => inflection.deletePayloadType?.(resource),
      `Delete${tableType}Payload`,
    ),
  };
}

export function buildQueryMeta(
  resource: PgTableResource,
  uniques: PgUnique[],
  tableType: string,
  build: MetaBuild,
): QueryMeta {
  const inflection = build.inflection;
  const hasPrimaryKey = uniques.some((unique) => unique.isPrimary);

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
