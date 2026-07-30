import type { GraphQLQueryFnObj } from 'graphile-test';
import { getConnectionsObject, seed } from 'graphile-test';
import { join } from 'path';

import { ConstructivePreset } from '../src/presets/constructive-preset';

jest.setTimeout(60000);

const integrationSeed = join(__dirname, '../sql/integration-seed.sql');
const workspaceRoot = join(__dirname, '../../..');
const baseSeed = join(workspaceRoot, '__fixtures__/seed/base/setup.sql');
const blogSeed = join(
  workspaceRoot,
  'graphql/server-test/__fixtures__/seed/schema-snapshot/schema.sql'
);

type TypeRef = {
  kind: string;
  name: string | null;
  ofType: TypeRef | null;
};

type IntrospectionField = {
  name: string;
  type: TypeRef;
};

type IntrospectionType = {
  kind: string;
  name: string;
  fields: IntrospectionField[] | null;
};

type MetaField = {
  name: string;
  type: {
    pgType: string;
    gqlType: string;
  };
};

type MetaRelation = {
  fieldName: string | null;
  type: string | null;
  references?: { name: string };
  referencedBy?: { name: string };
  junctionTable?: { name: string };
  rightTable?: { name: string };
};

type MetaTable = {
  name: string;
  schemaName: string;
  query: {
    all: string | null;
    one: string | null;
    create: string | null;
    update: string | null;
    delete: string | null;
  };
  fields: MetaField[];
  relations: {
    belongsTo: MetaRelation[];
    has: MetaRelation[];
    hasOne: MetaRelation[];
    hasMany: MetaRelation[];
    manyToMany: MetaRelation[];
  };
};

type ContractProbe = {
  _meta: {
    tables: MetaTable[];
  };
  __schema: {
    queryType: { fields: { name: string }[] };
    mutationType: { fields: { name: string }[] } | null;
    types: IntrospectionType[];
  };
  metaTableType: { fields: { name: string }[] } | null;
  metaFieldType: { fields: { name: string }[] } | null;
};

const contractProbeQuery = `
  query MetaSchemaContractProbe {
    _meta {
      tables {
        name
        schemaName
        query { all one create update delete }
        fields { name type { pgType gqlType } }
        relations {
          belongsTo { fieldName type references { name } }
          has { fieldName type referencedBy { name } }
          hasOne { fieldName type referencedBy { name } }
          hasMany { fieldName type referencedBy { name } }
          manyToMany {
            fieldName
            type
            junctionTable { name }
            rightTable { name }
          }
        }
      }
    }
    __schema {
      queryType { fields { name } }
      mutationType { fields { name } }
      types {
        kind
        name
        fields {
          name
          type {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType { kind name }
              }
            }
          }
        }
      }
    }
    metaTableType: __type(name: "MetaTable") { fields { name } }
    metaFieldType: __type(name: "MetaField") { fields { name } }
  }
`;

function namedType(type: TypeRef): string | null {
  let current: TypeRef | null = type;
  while (current) {
    if (current.name) return current.name;
    current = current.ofType;
  }
  return null;
}

async function runContractProbe(query: GraphQLQueryFnObj): Promise<ContractProbe> {
  const result = await query<ContractProbe>({ query: contractProbeQuery });
  if (result.errors?.length) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }
  if (!result.data) {
    throw new Error('Meta contract probe returned no data');
  }
  return result.data;
}

function collectContractViolations(probe: ContractProbe): string[] {
  const queryFields = new Set(probe.__schema.queryType.fields.map(({ name }) => name));
  const mutationFields = new Set(
    probe.__schema.mutationType?.fields.map(({ name }) => name) ?? []
  );
  const fieldContainerTypes = new Map(
    probe.__schema.types
      .filter((type) => type.kind === 'OBJECT' || type.kind === 'INTERFACE')
      .map((type) => [type.name, type])
  );
  const violations: string[] = [];

  for (const table of probe._meta.tables) {
    const fieldContainerType = fieldContainerTypes.get(table.name);
    if (!fieldContainerType) {
      violations.push(`${table.name}: GraphQL output type is not executable`);
      continue;
    }

    const fields = new Map(
      (fieldContainerType.fields ?? []).map((field) => [field.name, field])
    );

    for (const field of table.fields) {
      const executableField = fields.get(field.name);
      if (!executableField) {
        violations.push(`${table.name}.${field.name}: field is not executable`);
        continue;
      }
      const executableType = namedType(executableField.type);
      if (field.type.gqlType !== executableType) {
        violations.push(
          `${table.name}.${field.name}: _meta scalar ${field.type.gqlType} != GraphQL scalar ${executableType}`
        );
      }
    }

    const operations = [
      ['query.all', table.query.all, queryFields],
      ['query.one', table.query.one, queryFields],
      ['query.create', table.query.create, mutationFields],
      ['query.update', table.query.update, mutationFields],
      ['query.delete', table.query.delete, mutationFields]
    ] as const;

    for (const [label, fieldName, rootFields] of operations) {
      if (fieldName && !rootFields.has(fieldName)) {
        violations.push(`${table.name}.${label}: ${fieldName} is not executable`);
      }
    }

    for (const [relationKind, relations] of Object.entries(table.relations)) {
      for (const relation of relations) {
        if (!relation.fieldName) {
          violations.push(`${table.name}.relations.${relationKind}: missing fieldName`);
        } else if (!fields.has(relation.fieldName)) {
          violations.push(
            `${table.name}.relations.${relationKind}: ${relation.fieldName} is not executable`
          );
        } else {
          const executableField = fields.get(relation.fieldName)!;
          const executableType = namedType(executableField.type);
          if (relation.type !== executableType) {
            violations.push(
              `${table.name}.relations.${relationKind}.${relation.fieldName}: _meta type ${relation.type} != GraphQL type ${executableType}`
            );
          }

          const relatedType = (() => {
            if (!executableType) return null;
            const executableObject = fieldContainerTypes.get(executableType);
            const nodesField = executableObject?.fields?.find(
              ({ name }) => name === 'nodes'
            );
            return nodesField ? namedType(nodesField.type) : executableType;
          })();
          const referencedType =
            relation.references?.name ??
            relation.referencedBy?.name ??
            relation.rightTable?.name;
          if (referencedType && referencedType !== relatedType) {
            violations.push(
              `${table.name}.relations.${relationKind}.${relation.fieldName}: _meta target ${referencedType} != GraphQL target ${relatedType}`
            );
          }
        }
      }
    }
  }

  return violations;
}

describe('MetaSchemaPlugin final GraphQL contract', () => {
  describe('ConstructivePreset integration schema', () => {
    let teardown: () => Promise<void>;
    let query: GraphQLQueryFnObj;
    let probe: ContractProbe;

    beforeAll(async () => {
      const connections = await getConnectionsObject(
        {
          schemas: ['integration_test'],
          preset: { extends: [ConstructivePreset] },
          useRoot: true
        },
        [
          seed.sqlfile([integrationSeed]),
          seed.fn(async ({ pg }) => {
            await pg.query(`
              CREATE DOMAIN integration_test.url AS text
                CHECK (value ~ '^https?://');
              COMMENT ON DOMAIN integration_test.url IS
                E'@name constructiveInternalTypeUrl';
              CREATE TABLE integration_test.links (
                id serial PRIMARY KEY,
                target integration_test.url NOT NULL
              );
            `);
          })
        ]
      );

      teardown = connections.teardown;
      query = connections.query;
      probe = await runContractProbe(query);
    });

    afterAll(async () => {
      if (teardown) await teardown();
    });

    it('advertises only executable operations, fields, relations, and scalar names', () => {
      expect(collectContractViolations(probe)).toEqual([]);
    });

    it('covers irregular plurals and compound names', () => {
      const category = probe._meta.tables.find(({ name }) => name === 'Category');
      const fileEvent = probe._meta.tables.find(({ name }) => name === 'FileEvent');

      expect(category).toBeDefined();
      expect(category?.query.all).toBe('categories');
      expect(fileEvent).toBeDefined();
      expect(fileEvent?.query.all).toBe('fileEvents');
    });

    it('uses the final GraphQL scalar name for a smart-tagged domain', () => {
      const link = probe._meta.tables.find(({ name }) => name === 'Link');
      const target = link?.fields.find(({ name }) => name === 'target');

      expect(link).toBeDefined();
      expect(target).toBeDefined();
      expect(target?.type).toMatchObject({
        pgType: 'url',
        gqlType: 'ConstructiveInternalTypeUrl'
      });
    });

    it('exposes exact PostgreSQL table and column names additively', async () => {
      const metaTableFields =
        probe.metaTableType?.fields.map(({ name }) => name) ?? [];
      const metaFieldFields =
        probe.metaFieldType?.fields.map(({ name }) => name) ?? [];

      expect(metaTableFields).toContain('tableName');
      expect(metaFieldFields).toContain('columnName');

      const result = await query<{
        _meta: {
          tables: {
            name: string;
            tableName: string;
            fields: { name: string; columnName: string }[];
          }[];
        };
      }>({
        query: `
          query MetaDatabaseNames {
            _meta {
              tables {
                name
                tableName
                fields { name columnName }
              }
            }
          }
        `
      });

      expect(result.errors).toBeUndefined();
      const fileEvent = result.data?._meta.tables.find(
        ({ name }) => name === 'FileEvent'
      );
      const location = result.data?._meta.tables.find(
        ({ name }) => name === 'Location'
      );
      expect(fileEvent?.tableName).toBe('file_events');
      expect(
        location?.fields.find(({ name }) => name === 'isActive')?.columnName
      ).toBe('is_active');
    });
  });

  describe('many-to-many blog schema', () => {
    let teardown: () => Promise<void>;
    let probe: ContractProbe;

    beforeAll(async () => {
      const connections = await getConnectionsObject(
        {
          schemas: ['snapshot_public'],
          preset: { extends: [ConstructivePreset] },
          useRoot: true
        },
        [seed.sqlfile([baseSeed, blogSeed])]
      );

      teardown = connections.teardown;
      probe = await runContractProbe(connections.query);
    });

    afterAll(async () => {
      if (teardown) await teardown();
    });

    it('advertises only executable operations, fields, and relations', () => {
      expect(collectContractViolations(probe)).toEqual([]);
    });

    it('covers a compound collection name', () => {
      const postTag = probe._meta.tables.find(({ name }) => name === 'PostTag');

      expect(postTag).toBeDefined();
      expect(postTag?.query.all).toBe('postTags');
    });

    it('uses final field and type names for direct relations', () => {
      const post = probe._meta.tables.find(({ name }) => name === 'Post');
      const postTag = probe._meta.tables.find(({ name }) => name === 'PostTag');
      const postRelation = postTag?.relations.belongsTo.find(
        ({ fieldName }) => fieldName === 'post'
      );
      const postTagsRelation = post?.relations.hasMany.find(
        ({ fieldName }) => fieldName === 'postTags'
      );

      expect(postRelation).toMatchObject({
        fieldName: 'post',
        type: 'Post',
        references: { name: 'Post' }
      });
      expect(postTagsRelation).toMatchObject({
        fieldName: 'postTags',
        type: 'PostTagConnection',
        referencedBy: { name: 'PostTag' }
      });
    });

    it('covers behavior-generated many-to-many names and identities', () => {
      const post = probe._meta.tables.find(({ name }) => name === 'Post');
      const tag = probe._meta.tables.find(({ name }) => name === 'Tag');

      expect(post).toBeDefined();
      expect(tag).toBeDefined();
      expect(post?.relations.manyToMany).toContainEqual(
        expect.objectContaining({
          fieldName: 'tags',
          type: 'PostTagsManyToManyConnection',
          junctionTable: { name: 'PostTag' },
          rightTable: { name: 'Tag' }
        })
      );
      expect(tag?.relations.manyToMany).toContainEqual(
        expect.objectContaining({
          fieldName: 'posts',
          type: 'TagPostsManyToManyConnection',
          junctionTable: { name: 'PostTag' },
          rightTable: { name: 'Post' }
        })
      );
    });
  });
});
