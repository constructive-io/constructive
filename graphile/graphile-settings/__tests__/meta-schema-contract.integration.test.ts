import {
  buildClientSchema,
  getIntrospectionQuery,
  getNamedType,
  isInterfaceType,
  isObjectType,
  type GraphQLSchema,
  type IntrospectionQuery
} from 'graphql';
import type { GraphQLQueryUnwrappedFnObj } from 'graphile-test';
import { getConnectionsObjectUnwrapped, seed } from 'graphile-test';
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

type MetaField = {
  name: string;
  columnName: string;
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
  tableName: string;
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
  schema: GraphQLSchema;
};

const contractProbeQuery = `
  query MetaSchemaContractProbe {
    _meta {
      tables {
        name
        tableName
        schemaName
        query { all one create update delete }
        fields { name columnName type { pgType gqlType } }
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
  }
`;

async function runContractProbe(
  query: GraphQLQueryUnwrappedFnObj
): Promise<ContractProbe> {
  const [meta, introspection] = await Promise.all([
    query<Omit<ContractProbe, 'schema'>>({ query: contractProbeQuery }),
    query<IntrospectionQuery>({ query: getIntrospectionQuery() })
  ]);
  return { ...meta, schema: buildClientSchema(introspection) };
}

function collectContractViolations(probe: ContractProbe): string[] {
  const queryFields = new Set(
    Object.keys(probe.schema.getQueryType()?.getFields() ?? {})
  );
  const mutationFields = new Set(
    Object.keys(probe.schema.getMutationType()?.getFields() ?? {})
  );
  const violations: string[] = [];

  for (const table of probe._meta.tables) {
    const fieldContainerType = probe.schema.getType(table.name);
    if (
      !fieldContainerType ||
      (!isObjectType(fieldContainerType) && !isInterfaceType(fieldContainerType))
    ) {
      violations.push(`${table.name}: GraphQL output type is not executable`);
      continue;
    }

    const fields = fieldContainerType.getFields();

    for (const field of table.fields) {
      const executableField = fields[field.name];
      if (!executableField) {
        violations.push(`${table.name}.${field.name}: field is not executable`);
        continue;
      }
      const executableType = getNamedType(executableField.type).name;
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
        } else if (!fields[relation.fieldName]) {
          violations.push(
            `${table.name}.relations.${relationKind}: ${relation.fieldName} is not executable`
          );
        } else {
          const executableField = fields[relation.fieldName];
          const executableType = getNamedType(executableField.type).name;
          if (relation.type !== executableType) {
            violations.push(
              `${table.name}.relations.${relationKind}.${relation.fieldName}: _meta type ${relation.type} != GraphQL type ${executableType}`
            );
          }

          const relatedType = (() => {
            if (!executableType) return null;
            const executableObject = probe.schema.getType(executableType);
            if (
              !executableObject ||
              (!isObjectType(executableObject) &&
                !isInterfaceType(executableObject))
            ) {
              return executableType;
            }
            const nodesField = executableObject.getFields().nodes;
            return nodesField
              ? getNamedType(nodesField.type).name
              : executableType;
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
    let query: GraphQLQueryUnwrappedFnObj;
    let probe: ContractProbe;

    beforeAll(async () => {
      const connections = await getConnectionsObjectUnwrapped(
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
              CREATE TABLE integration_test.raw_accounts (
                id serial PRIMARY KEY,
                external_identifier text
              );
              COMMENT ON TABLE integration_test.raw_accounts IS
                E'@name CustomerAccount';
              COMMENT ON COLUMN integration_test.raw_accounts.external_identifier IS
                E'@name externalId';
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

    it('keeps PostgreSQL identities alongside final GraphQL casing', () => {
      const fileEvent = probe._meta.tables.find(
        ({ name }) => name === 'FileEvent'
      );
      const location = probe._meta.tables.find(
        ({ name }) => name === 'Location'
      );
      const customerAccount = probe._meta.tables.find(
        ({ name }) => name === 'CustomerAccount'
      );
      expect(fileEvent?.tableName).toBe('file_events');
      expect(
        location?.fields.find(({ name }) => name === 'isActive')?.columnName
      ).toBe('is_active');
      expect(customerAccount?.tableName).toBe('raw_accounts');
      expect(customerAccount?.query.all).toBe('customerAccounts');
      expect(
        customerAccount?.fields.find(({ name }) => name === 'externalId')
          ?.columnName
      ).toBe('external_identifier');
    });
  });

  describe('many-to-many blog schema', () => {
    let teardown: () => Promise<void>;
    let probe: ContractProbe;

    beforeAll(async () => {
      const connections = await getConnectionsObjectUnwrapped(
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
      expect(postTag?.query.one).toBeNull();
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
