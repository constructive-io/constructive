/**
 * Normalized intermediate representation of a database schema.
 *
 * `buildIr` reduces an introspectron result to the shape every emitter
 * consumes: tables with resolved column scalars, primary keys, and the enums
 * they reference. Domains are unwrapped to their base type; arrays carry
 * their element scalar.
 */
import { toCamelCase } from 'inflekt';
import {
  PgAttribute,
  PgClass,
  PgConstraint,
  PgIntrospectionResultByKind,
  PgType
} from 'introspectron';

/** The TypeScript-facing shape of a PostgreSQL scalar. */
export type IrScalar =
  | 'boolean'
  | 'integer'
  | 'bigint'
  | 'number'
  | 'string'
  | 'uuid'
  | 'timestamp'
  | 'json'
  | 'enum'
  | 'unknown';

export interface IrEnum {
  schema: string;
  /** The PostgreSQL enum type name, e.g. `run_status`. */
  name: string;
  values: string[];
}

export interface IrColumn {
  /** The column name as it appears in the database, e.g. `thread_id`. */
  name: string;
  /** The camelCase application-facing property name, e.g. `threadId`. */
  propertyName: string;
  ordinal: number;
  scalar: IrScalar;
  isArray: boolean;
  nullable: boolean;
  hasDefault: boolean;
  /** The declared PostgreSQL type name, e.g. `timestamptz`, `_text`. */
  pgType: string;
  /** For `scalar: 'enum'`, the enum type name within the same IR. */
  enumName?: string;
  comment?: string;
}

export type IrTableKind = 'table' | 'partitioned table' | 'view' | 'materialized view' | 'foreign table';

export interface IrTable {
  schema: string;
  name: string;
  kind: IrTableKind;
  columns: IrColumn[];
  primaryKey: string[];
  comment?: string;
}

export interface IrSchema {
  name: string;
  tables: IrTable[];
  enums: IrEnum[];
}

export interface Ir {
  schemas: IrSchema[];
}

const TABLE_KINDS: Record<string, IrTableKind> = {
  r: 'table',
  p: 'partitioned table',
  v: 'view',
  m: 'materialized view',
  f: 'foreign table'
};

const SCALAR_BY_TYPE_NAME: Record<string, IrScalar> = {
  bool: 'boolean',
  int2: 'integer',
  int4: 'integer',
  int8: 'bigint',
  float4: 'number',
  float8: 'number',
  numeric: 'number',
  money: 'number',
  text: 'string',
  varchar: 'string',
  bpchar: 'string',
  char: 'string',
  name: 'string',
  citext: 'string',
  inet: 'string',
  cidr: 'string',
  macaddr: 'string',
  macaddr8: 'string',
  interval: 'string',
  time: 'string',
  timetz: 'string',
  bit: 'string',
  varbit: 'string',
  xml: 'string',
  ltree: 'string',
  date: 'timestamp',
  timestamp: 'timestamp',
  timestamptz: 'timestamp',
  uuid: 'uuid',
  json: 'json',
  jsonb: 'json'
};

interface ResolvedType {
  scalar: IrScalar;
  isArray: boolean;
  enumType?: PgType;
}

const resolveType = (type: PgType, typeById: Map<string, PgType>): ResolvedType => {
  if (type.type === 'd' && type.domainBaseTypeId) {
    const base = typeById.get(type.domainBaseTypeId);
    if (base) return resolveType(base, typeById);
  }
  if (type.isPgArray && type.arrayItemTypeId) {
    const element = typeById.get(type.arrayItemTypeId);
    if (element) {
      const resolved = resolveType(element, typeById);
      // Arrays of arrays and arrays of unresolvable elements degrade to a
      // plain `unknown` scalar rather than pretend to a typed element.
      if (resolved.isArray || resolved.scalar === 'unknown') {
        return { scalar: 'unknown', isArray: false };
      }
      return { ...resolved, isArray: true };
    }
  }
  if (type.type === 'e' && Array.isArray(type.enumVariants) && type.enumVariants.length > 0) {
    return { scalar: 'enum', isArray: false, enumType: type };
  }
  const scalar = SCALAR_BY_TYPE_NAME[type.name];
  return { scalar: scalar ?? 'unknown', isArray: false };
};

export interface BuildIrOptions {
  /** The schemas to include, in the order their modules should be emitted. */
  schemas: string[];
}

export const buildIr = (
  introspection: PgIntrospectionResultByKind,
  { schemas }: BuildIrOptions
): Ir => {
  const typeById = new Map<string, PgType>(introspection.type.map(type => [type.id, type]));
  const namespaceNameById = new Map<string, string>(
    introspection.namespace.map(namespace => [namespace.id, namespace.name])
  );
  const attributesByClassId = new Map<string, PgAttribute[]>();
  for (const attribute of introspection.attribute) {
    const list = attributesByClassId.get(attribute.classId);
    if (list) list.push(attribute);
    else attributesByClassId.set(attribute.classId, [attribute]);
  }
  const primaryKeyByClassId = new Map<string, PgConstraint>();
  for (const constraint of introspection.constraint) {
    if (constraint.type === 'p') primaryKeyByClassId.set(constraint.classId, constraint);
  }

  const irSchemas: IrSchema[] = schemas.map(schemaName => {
    const enums: IrEnum[] = [];
    const enumNames = new Set<string>();

    const registerEnum = (enumType: PgType): string => {
      const owningSchema = namespaceNameById.get(enumType.namespaceId) ?? schemaName;
      if (!enumNames.has(enumType.name)) {
        enumNames.add(enumType.name);
        enums.push({
          schema: owningSchema,
          name: enumType.name,
          values: enumType.enumVariants ?? []
        });
      }
      return enumType.name;
    };

    const tables: IrTable[] = introspection.class
      .filter((cls: PgClass) => cls.namespaceName === schemaName && cls.classKind !== undefined && cls.classKind in TABLE_KINDS)
      .map((cls: PgClass): IrTable => {
        const attributes = (attributesByClassId.get(cls.id) ?? [])
          .filter(attribute => attribute.num > 0)
          .sort((a, b) => a.num - b.num);
        const primaryKeyConstraint = primaryKeyByClassId.get(cls.id);
        const primaryKeyNums = new Set(primaryKeyConstraint?.keyAttributeNums ?? []);

        const columns: IrColumn[] = attributes.map((attribute): IrColumn => {
          const type = typeById.get(attribute.typeId);
          const resolved: ResolvedType = type
            ? resolveType(type, typeById)
            : { scalar: 'unknown', isArray: false };
          const column: IrColumn = {
            name: attribute.name,
            propertyName: toCamelCase(attribute.name),
            ordinal: attribute.num,
            scalar: resolved.scalar,
            isArray: resolved.isArray,
            nullable: attribute.isNotNull !== true,
            hasDefault: attribute.hasDefault === true || (attribute.identity ?? '') !== '',
            pgType: type?.name ?? 'unknown'
          };
          if (resolved.enumType) column.enumName = registerEnum(resolved.enumType);
          if (attribute.description) column.comment = attribute.description;
          return column;
        });

        const table: IrTable = {
          schema: schemaName,
          name: cls.name,
          kind: TABLE_KINDS[cls.classKind as string],
          columns,
          primaryKey: attributes
            .filter(attribute => primaryKeyNums.has(attribute.num))
            .map(attribute => attribute.name)
        };
        if (cls.description) table.comment = cls.description;
        return table;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    enums.sort((a, b) => a.name.localeCompare(b.name));
    return { name: schemaName, tables, enums };
  });

  return { schemas: irSchemas };
};
