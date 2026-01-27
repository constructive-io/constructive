// @ts-nocheck

import { parse, parseTypes } from '../src';
import { resolve } from 'path';
import { deparse } from 'pgsql-deparser';
import { InsertOne, InsertMany } from '../src/utils';
import { Parser } from '../src/parser';

const testCase = resolve(__dirname + '/../__fixtures__/test-case.csv');

const config = {
  schema: 'metaschema_public',
  singleStmts: true,
  table: 'field',
  headers: [
    'id',
    'database_id',
    'table_id',
    'name',
    'description',
    'smart_tags',
    'is_required',
    'default_value',
    'is_hidden',
    'type',
    'field_order',
    'regexp',
    'chk',
    'chk_exp',
    'min',
    'max',
    'created_at',
    'updated_at'
  ],
  fields: {
    id: 'uuid',
    database_id: 'uuid',
    table_id: 'uuid',
    name: 'text',
    description: 'text'
  }
};

it('noop', () => {
  expect(true).toBe(true);
});
describe('test case', () => {
it('test case', async () => {
  const records = await parse(testCase, { headers: config.headers });
  const types = parseTypes(config);
  const stmt = InsertMany({
    schema: config.schema,
    table: config.table,
    types,
    records
  });

  expect(deparse([stmt])).toMatchSnapshot();
});

it('test case parser', async () => {
  const parser = new Parser(config);

  const sql = await parser.parse([
    {
      id: '450e3b3b-b68d-4abc-990c-65cb8a1dcdb4',
      database_id: '450e3b3b-b68d-4abc-990c-65cb8a1dcdb4',
      table_id: '450e3b3b-b68d-4abc-990c-65cb8a1dcdb4',
      name: 'name here',
      description: 'description'
    }
  ]);

  expect(sql).toMatchSnapshot();
});

it('jsonb/json', async () => {
  const parser = new Parser({
    schema: 'metaschema_public',
    singleStmts: true,
    table: 'field',
    fields: {
      id: 'uuid',
      name: 'text',
      data: 'jsonb'
    }
  });

  const sql = await parser.parse([
    {
      id: '450e3b3b-b68d-4abc-990c-65cb8a1dcdb4',
      name: 'name here',
      data: {
        a: 1
      }
    }
  ]);

  expect(sql).toMatchSnapshot();
});

it('image/attachment', async () => {
  const parser = new Parser({
    schema: 'metaschema_public',
    singleStmts: true,
    table: 'field',
    fields: {
      id: 'uuid',
      name: 'text',
      image: 'image',
      upload: 'attachment'
    }
  });

  const sql = await parser.parse([
    {
      id: '450e3b3b-b68d-4abc-990c-65cb8a1dcdb4',
      name: 'name here',
      image: {
        url: 'http://path/to/image.jpg'
      },
      upload: {
        url: 'http://path/to/image.jpg'
      }
    }
  ]);

  expect(sql).toMatchSnapshot();
});

it('arrays', async () => {
  const parser = new Parser({
    schema: 'metaschema_public',
    singleStmts: true,
    table: 'field',
    fields: {
      id: 'uuid',
      schemas: 'text[]'
    }
  });

  const sql = await parser.parse([
    {
      id: '450e3b3b-b68d-4abc-990c-65cb8a1dcdb4',
      schemas: ['a', 'b']
    }
  ]);

  expect(sql).toMatchSnapshot();
  });

it('uuid[] arrays', async () => {
  const parser = new Parser({
    schema: 'metaschema_public',
    singleStmts: true,
    table: 'primary_key_constraint',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      table_id: 'uuid',
      name: 'text',
      field_ids: 'uuid[]'
    }
  });

  const sql = await parser.parse([
    {
      id: 'cdc96a32-572c-4f69-8bce-4c7bd4024a4e',
      database_id: '8e739194-ced7-479b-b46c-e6b06146ac11',
      table_id: '6616358d-8da8-45e4-834f-d735a0f02acc',
      name: 'object_pkey',
      field_ids: ['f853daae-f563-447d-ac09-901ddd68586e', 'a4257181-147d-4558-a51f-4b43246527a2']
    },
    {
      id: '03d7007c-5262-4250-9ce1-efcabc5bedea',
      database_id: '8e739194-ced7-479b-b46c-e6b06146ac11',
      table_id: '535d5894-679a-4a7b-aa5a-bd07cce8a505',
      name: 'ref_pkey',
      field_ids: ['8cc2da93-a8e0-4565-9d14-f814c3a1432d', '40a34889-eb4c-4833-8daf-b99441962971']
    }
  ]);

  expect(sql).toMatchSnapshot();
});

it('interval type', async () => {
  const parser = new Parser({
    schema: 'metaschema_modules_public',
    singleStmts: true,
    table: 'tokens_module',
    fields: {
      id: 'uuid',
      database_id: 'uuid',
      tokens_default_expiration: 'interval',
      tokens_table: 'text'
    }
  });

  const sql = await parser.parse([
    {
      id: '42aaba39-de20-4be0-95a1-4873d7d4b6d4',
      database_id: '8e739194-ced7-479b-b46c-e6b06146ac11',
      tokens_default_expiration: { hours: 24 },
      tokens_table: 'api_tokens'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      database_id: '8e739194-ced7-479b-b46c-e6b06146ac11',
      tokens_default_expiration: { days: 7, hours: 12, minutes: 30 },
      tokens_table: 'refresh_tokens'
    },
    {
      id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      database_id: '8e739194-ced7-479b-b46c-e6b06146ac11',
      tokens_default_expiration: { years: 1, months: 6 },
      tokens_table: 'long_lived_tokens'
    }
  ]);

  expect(sql).toMatchSnapshot();
});

it('interval type with string value', async () => {
  const parser = new Parser({
    schema: 'metaschema_modules_public',
    singleStmts: true,
    table: 'tokens_module',
    fields: {
      id: 'uuid',
      tokens_default_expiration: 'interval'
    }
  });

  const sql = await parser.parse([
    {
      id: '42aaba39-de20-4be0-95a1-4873d7d4b6d4',
      tokens_default_expiration: '1 day 02:30:00'
    }
  ]);

  expect(sql).toMatchSnapshot();
});
});
